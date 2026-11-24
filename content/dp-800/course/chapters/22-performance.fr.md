Les questions de performances décrivent une charge de travail (objectif de latence, taille de la base, reporting intensif en lecture, usage intermittent), un symptôme (une requête devenue plus lente, des sessions qui attendent, l'erreur 1205) ou une exigence d'intégrité des données (pas de stock survendu, un rapport cohérent), et demandent quelle configuration, quel niveau d'isolation, quel outil ou quelle correction s'applique. Connaissez les valeurs par défaut d'Azure SQL Database : elles décident de nombreuses réponses.

<!-- section: database-configurations | objectives: 2.2.1 -->
## Recommander des configurations de base de données

Azure SQL Database propose deux modèles d'achat : **vCore** (choix des cœurs, de la mémoire et du stockage ; recommandé pour les nouveaux déploiements et les migrations depuis SQL Server, avec capacité réservée et Azure Hybrid Benefit) et **DTU** (niveaux groupés Basic, Standard et Premium).

| Niveau vCore | Stockage | Taille max | Réplicas | À choisir pour |
| --- | --- | --- | --- | --- |
| Usage général (General Purpose) | Distant (latence de 5 à 10 ms) | 4 To | Aucun réplica lisible | Charges de travail soucieuses du budget |
| Critique pour l'entreprise (Business Critical) | SSD local (latence de 1 à 2 ms) | 4 To | Inclut un réplica en lecture seule gratuit | Faible latence, E/S élevées, basculement le plus rapide |
| Hyperscale | Découplé, cache SSD local (latence de 1 à 2 ms pour la partie de la base fréquemment consultée) | 128 To | 0 à 4 réplicas de haute disponibilité, plus des réplicas nommés | Bases volumineuses ou à croissance rapide, montée en charge en lecture |

Niveaux de calcul : **provisionné** (vCores fixes, charges prévisibles) ou **serverless** (mise à l'échelle automatique, facturation à la seconde ; General Purpose et Hyperscale ; mise en pause automatique en General Purpose, en préversion en Hyperscale) pour les charges intermittentes.

Paramètres au niveau de la base et leurs valeurs par défaut dans Azure SQL Database :

| Paramètre | Valeur par défaut | Recommandation |
| --- | --- | --- |
| `MAXDOP` (configuration délimitée à la base de données) | 8 pour les nouvelles bases | Garder 8 ou moins pour l'OLTP ; jamais 0 en production ; remplacer pour une requête avec `OPTION (MAXDOP n)` |
| Niveau de compatibilité | 170 pour les nouvelles bases ; jamais relevé automatiquement | Le relever après des tests avec une base de référence du Magasin des requêtes ; 150 apporte le mode batch sur rowstore et l'inlining des UDF scalaires, 160 l'optimisation des plans sensibles aux paramètres |
| Réglage automatique | `FORCE_LAST_GOOD_PLAN` activé ; `CREATE_INDEX` et `DROP_INDEX` désactivés | Activer la création d'index si vous acceptez des index automatiques validés |
| `OPTIMIZE_FOR_AD_HOC_WORKLOADS` | Désactivé | Activé quand de nombreuses requêtes à usage unique encombrent le cache des plans |
| Récupération de base de données accélérée (ADR) | Toujours activée, impossible à désactiver | Garder des transactions courtes pour limiter le magasin de versions persistant |
| `READ_COMMITTED_SNAPSHOT` | Activé | Garder : les lecteurs ne bloquent pas les écrivains |
| Magasin des requêtes | Activé (`READ_WRITE`) | Garder ; augmenter `MAX_STORAGE_SIZE_MB` s'il passe en `READ_ONLY` |

```text
ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 4;
ALTER DATABASE SCOPED CONFIGURATION FOR SECONDARY SET MAXDOP = 8;
ALTER DATABASE SCOPED CONFIGURATION SET OPTIMIZE_FOR_AD_HOC_WORKLOADS = ON;
ALTER DATABASE CURRENT SET COMPATIBILITY_LEVEL = 170;
ALTER DATABASE CURRENT SET AUTOMATIC_TUNING (FORCE_LAST_GOOD_PLAN = ON, CREATE_INDEX = ON, DROP_INDEX = OFF);
```

Le réglage automatique valide chaque modification (de 30 minutes à 72 heures) et l'annule si les performances se dégradent ; il ne supprime jamais les index uniques.

> **Conseil d'examen.** « Latence de stockage constamment inférieure à 2 ms » pour toutes les données = Business Critical (Hyperscale ne donne 1 à 2 ms que pour la partie fréquemment consultée). « La base dépassera 4 To » = Hyperscale. « Utilisée quelques heures par jour, coût minimal » = serverless General Purpose avec mise en pause automatique. « Décharger le reporting sans surcoût » = le réplica en lecture seule de Business Critical (`ApplicationIntent=ReadOnly`).

<!-- section: isolation-concurrency | objectives: 2.2.2 -->
## Niveaux d'isolation des transactions et contrôles d'accès concurrentiel

| Niveau d'isolation | Lectures sales | Lectures non renouvelables | Fantômes | Les lecteurs bloquent les écrivains |
| --- | --- | --- | --- | --- |
| READ UNCOMMITTED (`NOLOCK`) | Oui | Oui | Oui | Non |
| READ COMMITTED (verrouillage) | Non | Oui | Oui | Oui |
| READ COMMITTED SNAPSHOT (RCSI) | Non | Oui | Oui | Non |
| REPEATABLE READ | Non | Non | Oui | Oui |
| SNAPSHOT | Non | Non | Non | Non (conflits de mise à jour possibles) |
| SERIALIZABLE | Non | Non | Non | Oui (verrous de plage) |

- **RCSI** (par défaut dans Azure SQL Database) : chaque **instruction** lit la dernière version validée à son début, à partir des versions de lignes conservées par ADR dans la base.
- **SNAPSHOT** : chaque **transaction** lit une version cohérente à son début. Il faut `ALLOW_SNAPSHOT_ISOLATION ON` (valeur par défaut dans Azure SQL Database ; `OFF` par défaut dans SQL Server et Azure SQL Managed Instance, où `ALTER DATABASE ... SET ALLOW_SNAPSHOT_ISOLATION ON` est nécessaire) et `SET TRANSACTION ISOLATION LEVEL SNAPSHOT`. Si deux transactions mettent à jour la même ligne, la seconde échoue avec l'erreur de conflit de mise à jour **3960** au lieu d'écraser.
- **SERIALIZABLE** : empêche les fantômes avec des verrous de plage ; concurrence la plus faible, davantage d'interblocages.

Le **verrouillage optimisé**, toujours activé dans Azure SQL Database, tient un seul verrou sur l'ID de transaction au lieu de verrous de ligne et de clé (**verrouillage TID**) et, avec RCSI, évalue le prédicat sur la dernière version validée avant de verrouiller uniquement les lignes qualifiées (**verrouillage après qualification**). Résultat : moins de verrous, quasiment pas d'escalade de verrous, moins de blocages.

Modèles de concurrence pour la mise à jour perdue classique (deux commandes lisent le même stock de 1 et le décrémentent toutes les deux) :

```text
-- Atomic: read and change in one statement, check the result
UPDATE dbo.Product SET Stock = Stock - 1
WHERE ProductID = 42 AND Stock >= 1;
IF @@ROWCOUNT = 0 THROW 50001, 'Out of stock', 1;

-- Pessimistic: lock the row when reading it
BEGIN TRANSACTION;
SELECT @Stock = Stock FROM dbo.Product WITH (UPDLOCK, HOLDLOCK) WHERE ProductID = 42;
-- ...business checks...
UPDATE dbo.Product SET Stock = @Stock - 1 WHERE ProductID = 42;
COMMIT;

-- Optimistic: rowversion column, update only if nobody changed the row
UPDATE dbo.Product SET Price = @NewPrice
WHERE ProductID = 42 AND RowVer = @RowVerReadEarlier;
IF @@ROWCOUNT = 0 THROW 50002, 'Row changed by another user', 1;
```

Choisissez RCSI avec le verrouillage optimisé pour la plupart des charges, SNAPSHOT pour les rapports en plusieurs requêtes qui ont besoin d'un seul instant de référence, SERIALIZABLE seulement quand les fantômes causent de vraies erreurs (double réservation). Gardez des transactions courtes et n'attendez jamais une saisie utilisateur à l'intérieur.

> **Piège d'examen.** RCSI n'empêche pas les mises à jour perdues : il change ce que voient les lecteurs, pas la façon dont les écrivains entrent en conflit. « Deux sessions ne doivent pas vendre toutes les deux le dernier article » exige un `UPDATE ... WHERE` atomique, `UPDLOCK` ou une concurrence optimiste, pas un changement de niveau d'isolation des lecteurs. Et `NOLOCK` n'est jamais la réponse quand les résultats doivent être exacts.

<!-- section: plans-dmvs | objectives: 2.2.3 -->
## Plans d'exécution et vues de gestion dynamique

Le **plan estimé** montre ce que l'optimiseur prévoit sans exécuter la requête ; le **plan réel** (Include Actual Execution Plan, ou `SET STATISTICS XML ON`) ajoute le nombre réel de lignes : un grand écart entre lignes estimées et réelles signale des statistiques obsolètes ou une sensibilité aux paramètres. `SET STATISTICS IO, TIME ON` affiche les lectures logiques et le processeur par instruction.

| Signe dans le plan | Cause habituelle | Correction |
| --- | --- | --- |
| **Analyse** (scan) d'index ou de table pour un prédicat sélectif | Pas d'index utilisable, ou prédicat non SARGable (fonction sur la colonne) | Indexer la colonne ; réécrire `WHERE YEAR(OrderDate) = 2026` en plage de dates |
| **Key Lookup** pour beaucoup de lignes | L'index non cluster ne couvre pas la requête | Ajouter les colonnes manquantes avec `INCLUDE` |
| Avertissement : conversion implicite | Le type du paramètre diffère de celui de la colonne (`nvarchar` contre `varchar`) | Aligner les types de données |
| **Débordement** (spill) d'un tri ou d'un hachage dans tempdb | Allocation de mémoire trop petite (mauvaises estimations) | Mettre à jour les statistiques ; rétroaction d'allocation de mémoire |
| 1 ligne estimée, 100 000 réelles | Statistiques obsolètes, variable de table, détection de paramètres | `UPDATE STATISTICS`, table temporaire, indicateur du Magasin des requêtes |

| DMV ou fonction | Répond à |
| --- | --- |
| `sys.dm_exec_requests` | Ce qui s'exécute maintenant, attentes, `blocking_session_id` |
| `sys.dm_exec_sessions`, `sys.dm_exec_connections` | Qui est connecté, transactions ouvertes |
| `sys.dm_exec_query_stats` + `sys.dm_exec_sql_text` + `sys.dm_exec_query_plan` | Requêtes en cache les plus coûteuses et leurs plans |
| `sys.dm_db_resource_stats` | Processeur, E/S de données, journal et mémoire d'Azure SQL Database toutes les 15 secondes, sur la dernière heure |
| `sys.dm_db_wait_stats` (Azure SQL Database), `sys.dm_os_wait_stats` | Où le temps est passé à attendre |
| `sys.dm_tran_locks` | Verrous détenus et demandés |
| `sys.dm_db_missing_index_details` | Index que l'optimiseur aurait voulus |
| `sys.dm_db_index_usage_stats` | Index jamais lus mais maintenus |

```text
SELECT TOP 10 qs.total_worker_time / qs.execution_count AS avg_cpu_us,
       qs.execution_count, st.text, qp.query_plan
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
CROSS APPLY sys.dm_exec_query_plan(qs.plan_handle) AS qp
ORDER BY avg_cpu_us DESC;
```

Les DMV sur le cache des plans perdent l'historique au redémarrage ou à l'éviction d'un plan ; le Magasin des requêtes le conserve.

<!-- section: query-store-qpi | objectives: 2.2.3 -->
## Magasin des requêtes et Query Performance Insight

Le **Magasin des requêtes** (Query Store) conserve dans la base le texte des requêtes, les plans, les statistiques d'exécution et d'attente, pour comparer avant et après un changement. Il est activé par défaut dans Azure SQL Database ; les paramètres recommandés sont le mode de capture **Auto** et le nettoyage basé sur la taille **Auto**.

| Rapport SSMS | Sert à trouver |
| --- | --- |
| Regressed Queries | Les requêtes passées à un plan plus lent |
| Top Resource Consuming Queries | Les plus gros consommateurs pour une métrique et une période |
| Queries With High Variation | Des performances instables, souvent dues à la sensibilité aux paramètres |
| Queries With Forced Plans | Les plans actuellement forcés |
| Query Wait Statistics | Les catégories d'attente et les requêtes qui en sont à l'origine |

```text
EXEC sp_query_store_force_plan @query_id = 42, @plan_id = 17;
EXEC sp_query_store_unforce_plan @query_id = 42, @plan_id = 17;
EXEC sp_query_store_set_hints @query_id = 42, @query_hints = N'OPTION (RECOMPILE)';
EXEC sp_query_store_clear_hints @query_id = 42;

SELECT actual_state_desc, desired_state_desc, readonly_reason,
       current_storage_size_mb, max_storage_size_mb
FROM sys.database_query_store_options;
```

Les **indicateurs du Magasin des requêtes** (Query Store hints) modifient le comportement d'une requête sans modifier le code de l'application, et l'emportent sur les indicateurs codés en dur et les repères de plan. Si `actual_state_desc` vaut `READ_ONLY` alors que `desired_state_desc` vaut `READ_WRITE`, le Magasin des requêtes est plein : augmentez `MAX_STORAGE_SIZE_MB` ou purgez les données.

**Query Performance Insight** est une page d'Azure SQL Database dans le portail Azure (base > Intelligent Performance > Query Performance Insight) qui affiche les données du Magasin des requêtes : par défaut les cinq premières requêtes par processeur, avec un onglet Custom pour la durée ou le nombre d'exécutions, une période de 24 heures, d'une semaine ou d'un mois, et 5, 10 ou 20 requêtes. Elle affiche les recommandations de Database Advisor sous forme d'annotations. Elle exige le Magasin des requêtes et n'affiche rien de nouveau quand celui-ci est en lecture seule.

> **Piège d'examen.** « Une requête a régressé après un changement de plan et le code ne peut pas être modifié » = forcer le dernier bon plan dans le Magasin des requêtes (ou laisser le réglage automatique le faire), ou un indicateur du Magasin des requêtes. Réécrire la requête ou ajouter `OPTION` dans le code n'est pas permis par la contrainte. Query Performance Insight n'existe que dans le portail et que pour Azure SQL Database.

<!-- section: blocking-deadlocks | objectives: 2.2.4 -->
## Blocages et interblocages

Un **blocage** est l'attente d'un verrou détenu par une autre session ; il prend fin quand cette session valide ou annule. Avec RCSI, les lecteurs n'attendent plus les écrivains, mais les écrivains bloquent toujours les écrivains. Trouvez le **bloqueur principal** (head blocker) : la session qui en bloque d'autres alors que son propre `blocking_session_id` vaut 0.

```text
SELECT r.session_id, r.blocking_session_id, r.wait_type, r.wait_time,
       r.wait_resource, t.text AS query_text
FROM sys.dm_exec_requests AS r
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE r.blocking_session_id <> 0
ORDER BY r.wait_time DESC;
```

| Cause du blocage | Résolution |
| --- | --- |
| Transaction longue ou requête de longue durée | Raccourcir la transaction, ajouter des index pour verrouiller moins de lignes |
| Session en veille avec une transaction ouverte (laissée ouverte par une erreur) | `SET XACT_ABORT ON` pour que les erreurs annulent ; corriger le code ; `KILL` sur la session si elle est orpheline |
| L'application n'a pas lu toutes les lignes du résultat | Lire jusqu'au bout (RCSI atténue) |
| Restauration (rollback) longue | ADR rend l'annulation quasi instantanée |

Un **interblocage** (deadlock) est un cycle : chaque transaction attend un verrou détenu par l'autre. Le moniteur d'interblocage (toutes les 5 secondes, jusqu'à 100 ms quand les interblocages sont fréquents) choisit la transaction la moins coûteuse comme **victime**, l'annule et renvoie l'erreur **1205**. SQL Server et Managed Instance enregistrent les graphes d'interblocage dans la session `system_health` ; dans Azure SQL Database, créez une session d'événements étendus délimitée à la base :

```text
CREATE EVENT SESSION [deadlocks] ON DATABASE
ADD EVENT sqlserver.database_xml_deadlock_report
ADD TARGET package0.ring_buffer
WITH (STARTUP_STATE = ON, MAX_MEMORY = 4 MB);
ALTER EVENT SESSION [deadlocks] ON DATABASE STATE = START;
```

Le graphe d'interblocage liste la **victime**, chaque **processus** (requête, niveau d'isolation, mode de verrou) et chaque **ressource** avec son propriétaire et son demandeur. Prévention : accéder aux tables dans le même ordre dans toutes les procédures, garder des transactions courtes, utiliser RCSI (avec le verrouillage optimisé) et indexer pour verrouiller moins de lignes. Les applications doivent **réessayer** après une erreur 1205, avec un court délai aléatoire :

```text
BEGIN TRY
    BEGIN TRANSACTION;
    -- data modifications
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    IF ERROR_NUMBER() = 1205
        PRINT 'Deadlock victim: retry after a random delay of 1 to 3 seconds';
    ELSE
        THROW;
END CATCH;
```

> **Piège d'examen.** Blocages et interblocages ne se corrigent pas de la même façon. Un blocage attend que le détenteur termine : trouvez et corrigez le bloqueur principal. Un interblocage ne se résout jamais en attendant : le moteur tue une victime, donc la correction est un ordre d'accès cohérent, des transactions plus courtes et une logique de nouvelle tentative, pas un délai d'expiration de verrou plus long.

<!-- section: key-points -->
## Points clés

- Business Critical pour la faible latence et un réplica lisible gratuit, Hyperscale au-delà de 4 To, serverless pour un usage intermittent.
- Valeurs par défaut d'Azure SQL Database : MAXDOP 8, niveau de compatibilité 170, RCSI, `ALLOW_SNAPSHOT_ISOLATION`, ADR, verrouillage optimisé et Magasin des requêtes activés, `FORCE_LAST_GOOD_PLAN` activé.
- RCSI = cohérence au niveau de l'instruction, SNAPSHOT = au niveau de la transaction (erreur 3960 en cas de conflit de mise à jour), SERIALIZABLE = pas de fantômes. Les mises à jour perdues exigent des mises à jour atomiques, `UPDLOCK` ou des vérifications de rowversion.
- Les plans réels révèlent les erreurs d'estimation ; Key Lookup = ajouter `INCLUDE` ; conversion implicite = corriger les types de données.
- Magasin des requêtes : requêtes régressées, forçage de plan, indicateurs sans modifier le code ; Query Performance Insight = vue du Magasin des requêtes dans le portail pour Azure SQL Database.
- Le bloqueur principal a `blocking_session_id = 0` ; la victime d'un interblocage reçoit l'erreur 1205 ; Azure SQL Database exige une session XE pour les graphes d'interblocage.
