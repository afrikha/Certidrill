Les pipelines en production doivent rester économiques, rapides et observables. Ce chapitre couvre la consommation de calcul, la réparation des exécutions Lakeflow Jobs, le diagnostic de Spark avec l'interface utilisateur Spark et le profil de requête, `OPTIMIZE` et `VACUUM`, ainsi que le streaming des journaux vers Log Analytics pour les alertes Azure Monitor. Les questions décrivent un symptôme (une facture, une tâche en échec, une étape lente, un stockage qui grossit) et demandent quel outil, quelle commande ou quel paramètre le résout.

<!-- section: cluster-consumption | objectives: 4.4.1 -->
## Surveiller et gérer la consommation de calcul

La consommation se mesure en **unités Databricks (DBU)**. Les risques sont les clusters inactifs laissés en marche et les clusters sous-dimensionnés qui manquent leurs échéances : adaptez les ressources à la charge de travail.

| Ce qu'il faut surveiller | Où |
| --- | --- |
| Processeur, mémoire, réseau, tâches actives, lecture et écriture de shuffle du calcul polyvalent et du calcul de jobs | **Compute** > la ressource > onglet **Metrics** (sélecteur de dates jusqu'aux 30 derniers jours ; par nœud ou agrégé) |
| Calcul serverless pour les notebooks et les jobs | **Query insights** (pas d'onglet Metrics) |
| Entrepôt SQL : requêtes en cours et en file d'attente, pic de requêtes, clusters en cours d'exécution | L'entrepôt > onglet **Monitoring** |
| DBU par SKU, job, cluster, étiquette ou identité, sur tout le compte | Table système `system.billing.usage` (prix dans `system.billing.list_prices`) |
| Historique des exécutions de jobs et de tâches | Tables `system.lakeflow` |

```text
SELECT usage_metadata.job_id AS job_id,
       SUM(usage_quantity)   AS total_dbus
FROM system.billing.usage
WHERE usage_metadata.job_id IS NOT NULL
  AND usage_date >= current_date() - INTERVAL 30 DAYS
GROUP BY ALL
ORDER BY total_dbus DESC;
```

Colonnes utiles : `sku_name`, `usage_metadata.cluster_id`, `custom_tags['project']`, `identity_metadata.run_as` (qui a exécuté la charge), `product_features.is_serverless`. Joignez `usage_metadata.cluster_id` à `system.compute.clusters` pour attribuer les DBU aux propriétaires. Une exécution serverless peut produire plusieurs enregistrements de facturation : agrégez avec `SUM()`.

Leviers pour réduire le coût :

| Levier | Effet et réserve |
| --- | --- |
| Arrêt automatique | Arrête un cluster inactif (30 à 60 minutes en général en développement) ; l'activité DStreams n'est pas surveillée |
| Mise à l'échelle automatique | Ajoute ou retire des workers entre un minimum et un maximum |
| Calcul de jobs plutôt que calcul polyvalent | Le cluster se termine avec l'exécution |
| Étiquettes | Propagées aux enregistrements de facturation pour la refacturation ; pas rétroactives |
| Budgets | E-mail quand les dépenses approchent un objectif ; créés par un **administrateur de compte** |
| Dimensionnement de l'entrepôt | Bloqué à son nombre maximal de clusters ou nombreuses requêtes en file d'attente : relevez le maximum |

> **Piège d'examen.** L'onglet Metrics n'existe pas pour le calcul serverless : utilisez Query insights pour les notebooks et les jobs serverless, et `system.billing.usage` avec `product_features.is_serverless = true` pour son coût.

<!-- section: lakeflow-jobs-troubleshooting | objectives: 4.4.2 -->
## Dépanner et réparer les Lakeflow Jobs

L'état d'une exécution est déterminé par ses **tâches feuilles** (tâches sans dépendance en aval) :

| État | Signification |
| --- | --- |
| Failed | Une ou plusieurs tâches feuilles n'ont pas réussi |
| Succeeded with failures | Certaines tâches ont échoué, mais toutes les tâches feuilles ont réussi |
| Skipped | L'exécution n'a pas démarré : nombre maximal d'exécutions simultanées du job ou de l'espace de travail dépassé |
| Timed Out | L'exécution a dépassé sa durée maximale configurée |
| Canceled | Un utilisateur ou un processus l'a arrêtée |

Pour enquêter : **Jobs & Pipelines** > le job > onglet **Runs**. La **vue matricielle** montre l'état de chaque tâche au fil des exécutions ; sélectionnez une cellule rouge pour les détails de l'exécution de la tâche (sortie, journaux). Une tâche qui échoue à chaque exécution désigne son code ou sa configuration ; des échecs aléatoires sur plusieurs tâches désignent le calcul.

| Action | Ce qu'elle fait | Quand |
| --- | --- | --- |
| **Repair run** | Réexécute seulement les **tâches non réussies** (en échec, ou ignorées parce qu'une tâche en amont a échoué) **et leurs dépendantes** ; les paramètres saisis remplacent les originaux pour la réparation | Job multitâche, cause corrigée |
| **Run now** | Nouvelle exécution de toutes les tâches (**Run now with different parameters** remplace les paramètres du job) | Job à une seule tâche (la réparation exige au moins deux tâches), ou réexécution complète |
| Arrêt, **Cancel runs**, **Cancel all queued runs** | Met fin aux exécutions actives ou en file d'attente | Ressources excessives ou données erronées |
| **Restart run** | Job **continu** en interruption exponentielle (exponential backoff) : annule l'exécution active, réinitialise la période de nouvelle tentative, démarre une nouvelle exécution | Cause corrigée, sans attendre la prochaine tentative |

Les détails de réparation utilisés à l'examen :

- Les tâches non réussies s'exécutent avec les paramètres **actuels** du job et des tâches : corrigez d'abord la tâche (**Edit task**), puis réparez.
- Une tâche réparée repart du début : si elle avait déjà écrit une partie de sa sortie, un ajout (append) peut dupliquer les données. Rendez les tâches idempotentes (écrasement ou `MERGE`).
- Les tâches qui partagent un cluster de job en reçoivent un nouveau pour la réparation (`my_job_cluster_v1`).
- C'est l'état d'exécution, et non l'état désactivé, qui décide de ce qui est réparé ; ajoutez une tâche désactivée à `rerun_tasks` dans la requête d'API pour la forcer.

Corrections selon la cause : chemin ou paramètre erroné, **Edit task** ; calcul insuffisant, plus de workers ou des workers plus grands ; exécutions Skipped, relevez **Maximum concurrent runs**. Prévenez avec des notifications d'échec (e-mail, Slack, webhook) et des requêtes sur `system.lakeflow.job_run_timeline` (395 jours d'historique).

> **Piège d'examen.** « Réexécuter la tâche en échec et ses tâches en aval, pas celles qui ont réussi » correspond à **Repair run**, pas à Run now. « Un job continu attend de plus en plus longtemps entre les tentatives » : **Restart run**.

<!-- section: spark-troubleshooting | objectives: 4.4.3 -->
## Dépanner les jobs et les notebooks Spark

Les échecs viennent du **code**, des **goulets d'étranglement de ressources** (mémoire, processeur, réseau) ou de l'**environnement** (instances non obtenues à cause du quota ou de la récupération d'instances spot). Commencez dans l'interface utilisateur Spark (**Compute** > le cluster > **Spark UI**) par la **chronologie des jobs** (jobs timeline) :

| Symptôme dans l'interface Spark | Cause probable | Correction |
| --- | --- | --- |
| Un job beaucoup plus long que les autres | La cible principale | Examiner son étape la plus longue |
| Écarts de plus d'une minute entre les jobs | Pilote (driver) surchargé (ou problème de cluster) | Pilote plus grand ; éviter de ramener les données sur le pilote |
| Une étape avec une seule tâche | Parallélisme insuffisant | Repartitionner les données |
| Déversement (spill) sur une étape | Mémoire insuffisante | Workers plus grands, plus de partitions |
| Processeur élevé sur tous les workers | Limité par le processeur | Photon, plus de workers |
| Lecture et écriture de shuffle importantes | Limité par le réseau | Filtrer tôt, diffuser (broadcast) les petites tables |
| Pilote en rouge, workers inactifs (bleu) dans la charge des serveurs | Goulet d'étranglement sur le pilote | Type d'instance plus grand pour le pilote |

Une erreur classique de mémoire insuffisante sur le pilote vient de `collect()` ou de `toPandas()` sur un grand DataFrame : gardez le traitement distribué et écrivez les résultats dans une table.

**Redémarrage du cluster.** Consultez d'abord l'onglet **Event log** (échecs d'acquisition d'instances, récupération d'instances spot, arrêts d'exécuteurs), puis redémarrez depuis la page **Compute** ou l'interface CLI. Un redémarrage **arrête les jobs en cours et réinitialise l'historique de l'interface Spark** ; l'état des notebooks et les données en cache sont perdus. Planifiez des redémarrages des clusters de streaming de longue durée pour qu'ils s'exécutent sur des images à jour.

```bash
databricks clusters list
databricks clusters restart 0123-456789-abcdefgh
```

> **Conseil d'examen.** Consultez l'**Event log** du calcul avant de le redémarrer : un redémarrage ne résout pas un problème de quota ou de capacité spot.

<!-- section: cache-skew-spill-shuffle | objectives: 4.4.4 -->
## Mise en cache, déséquilibrage, déversement et shuffle

Commencez par le **DAG** pour le flux global (les shuffles sont des nœuds **Exchange**), puis descendez dans l'**interface Spark** (étapes, métriques des tâches) ou, pour les requêtes d'un entrepôt SQL, dans le **profil de requête** (**Query History** > la requête > **See query profile** : temps, lignes et mémoire par opérateur).

| Problème | Comment le voir | Correction |
| --- | --- | --- |
| Mise en cache insuffisante | **Input** élevé sur des étapes qui relisent les mêmes données | Activer le cache disque (fichiers de données Parquet mis en cache sur les workers) avec des workers dotés de SSD ; `cache()` sur un DataFrame réutilisé |
| Mise en cache excessive | La mémoire nécessaire au traitement est occupée par des données en cache (onglet **Storage**) | Ne mettre en cache que les données réutilisées ; `unpersist()` une fois terminé |
| Déséquilibrage (skew) | **Summary Metrics** de l'étape : durée **Max** des tâches supérieure de plus de 50 % au **75th percentile** | L'exécution adaptative des requêtes (AQE, activée par défaut) gère les jointures déséquilibrées ; saler les clés dominantes ; diffuser le petit côté |
| Déversement (spill) | **Shuffle Spill (Memory)** / **Shuffle Spill (Disk)** non nuls en haut de la page de l'étape | Plus de partitions (`spark.sql.shuffle.partitions` = `auto`), workers avec plus de mémoire par cœur, moins de colonnes et filtres plus tôt |
| Shuffle excessif | **Shuffle Read** / **Shuffle Write** importants ; nœuds Exchange dans le profil | Filtrer avant les jointures, jointures de diffusion pour une petite table (AQE convertit sous 30 Mo par défaut), éviter les `repartition()` inutiles |

```text
spark.conf.get("spark.databricks.io.cache.enabled")   # disk cache on?
spark.conf.set("spark.sql.shuffle.partitions", "auto")
df_lookup.cache()            # Spark cache: explicit
df_lookup.unpersist()        # release it
```

Le déséquilibrage vient d'une clé dominante, de valeurs nulles envoyées dans une seule partition ou de dates inégales. Le déversement accompagne souvent le déséquilibrage : corrigez d'abord le déséquilibrage.

> **Piège d'examen.** Le **cache disque** est automatique et stocke les données des fichiers distants sur les disques locaux ; le **cache Spark** (`cache()`, `persist()`) est explicite, utilise la mémoire et doit être libéré avec `unpersist()`.

<!-- section: optimize-vacuum | objectives: 4.4.5 -->
## Optimiser les tables Delta avec OPTIMIZE et VACUUM

| | `OPTIMIZE` | `VACUUM` |
| --- | --- | --- |
| Objectif | Performances : compacte les petits fichiers ou regroupe les données | Coût de stockage : supprime les fichiers de données non référencés plus anciens que le seuil de rétention |
| Effet sur les lecteurs | Aucun ; mêmes résultats avant et après | Le voyage dans le temps vers les versions plus anciennes que la rétention est perdu |
| Automatisé par l'optimisation prédictive | Oui, sur les tables managées Unity Catalog | Oui, sur les tables managées Unity Catalog |
| Options | `WHERE` sur les colonnes de partition, `ZORDER BY` (tables sans liquid clustering), `FULL` (liquid clustering, Databricks Runtime 16.0+) | `RETAIN n HOURS`, `DRY RUN`, `LITE` (utilise le journal des transactions au lieu de lister les fichiers), `FULL` (par défaut) |
| Fréquence | Commencer par une exécution quotidienne, puis équilibrer coût et performances | Régulièrement, sur toutes les tables |

```text
OPTIMIZE sales.silver.orders WHERE order_date >= '2026-10-01';
OPTIMIZE sales.silver.events ZORDER BY (customer_id);
OPTIMIZE sales.gold.daily_revenue FULL;

VACUUM sales.silver.orders DRY RUN;
VACUUM sales.silver.orders;
VACUUM sales.silver.orders RETAIN 336 HOURS;
VACUUM sales.silver.orders LITE;
```

Règles à retenir :

- `OPTIMIZE` écrit de nouveaux fichiers mais ne supprime pas les anciens : seul `VACUUM` libère le stockage.
- Le seuil de rétention par défaut est de **7 jours**, le minimum recommandé ; une valeur plus courte est bloquée par une vérification de sécurité (`spark.databricks.delta.retentionDurationCheck.enabled`).
- `VACUUM` ne supprime pas les fichiers du journal des transactions (nettoyés après les points de contrôle, 30 jours par défaut) ; `LITE` exige un `VACUUM` réussi pendant cette période.
- Avec le **liquid clustering**, `OPTIMIZE` regroupe les données selon les clés de clustering ; Databricks recommande le liquid clustering plutôt que le partitionnement et `ZORDER`.
- L'**optimisation prédictive** exécute `OPTIMIZE`, `VACUUM` et `ANALYZE` sur les **tables managées Unity Catalog** uniquement, sur le calcul serverless pour les jobs ; elle est activée par défaut pour les comptes créés depuis le 11 novembre 2024. Contrôlez-la avec `ALTER CATALOG | SCHEMA | TABLE ... ENABLE | DISABLE | INHERIT PREDICTIVE OPTIMIZATION` ; historique dans `system.storage.predictive_optimization_operations_history`.

> **Piège d'examen.** « Réduire le coût de stockage des fichiers laissés par les mises à jour et les suppressions » correspond à `VACUUM`, pas à `OPTIMIZE`. « Les utilisateurs doivent encore interroger la table telle qu'elle était il y a 10 jours » signifie que la rétention doit dépasser 10 jours avant le `VACUUM`.

<!-- section: log-analytics | objectives: 4.4.6 -->
## Streaming des journaux vers Log Analytics

Un **paramètre de diagnostic** Azure envoie les journaux de diagnostic de l'espace de travail (événements d'audit) vers une destination :

| Destination | Usage |
| --- | --- |
| Espace de travail Log Analytics | Requêtes KQL, alertes Azure Monitor, corrélation avec d'autres services Azure |
| Compte de stockage | Archivage |
| Hub d'événements | Streaming vers un outil tiers |

Exigences et étapes :

- L'espace de travail doit être sur le plan **Premium**.
- Autorisation : Owner, Contributor ou un rôle personnalisé avec `Microsoft.Databricks/workspaces/assignWorkspaceAdmin/action` sur l'espace de travail.
- Portail : la ressource Azure Databricks > **Monitoring** > **Diagnostic settings** > **Turn on diagnostics**, saisissez un nom, choisissez la destination et les services (catégories de journaux), puis **Save**.
- Les journaux arrivent en général en **15 minutes**, sans délai garanti.

```powershell
New-AzDiagnosticSetting -ResourceId $databricks.ResourceId `
  -WorkspaceId $logAnalytics.ResourceId -Enabled $true `
  -Name "dbx-to-law" -Category jobs
```

| Table Log Analytics | Contenu |
| --- | --- |
| `DatabricksJobs` | Création, exécutions, échecs et modifications de planification des jobs |
| `DatabricksClusters` | Création, arrêt, redimensionnement et modifications de configuration des clusters |
| `DatabricksNotebook` | Exécution, création et modification des notebooks |
| `DatabricksSQL` | Opérations des entrepôts SQL et requêtes |
| `DatabricksTables` | Création, suppression, accès et modifications d'autorisations des tables |
| `DatabricksWorkspace` | Actions d'administration de l'espace de travail |
| `DatabricksSecrets` | Accès aux étendues de secrets et aux secrets |

Colonnes communes : `TimeGenerated`, `OperationName`, `Identity`, `SourceIPAddress`, `RequestParams`, `Response`.

```kusto
DatabricksJobs
| where TimeGenerated > ago(7d)
| where Response contains "error" or Response contains "failed"
| summarize FailureCount = count() by OperationName, bin(TimeGenerated, 1h)
| order by FailureCount desc
```

> **Conseil d'examen.** Pour interroger les événements d'audit depuis Azure Databricks, Databricks recommande la table système `system.access.audit`. Choisissez Log Analytics quand l'exigence est une supervision centralisée entre services Azure, KQL ou des alertes Azure Monitor.

<!-- section: azure-monitor-alerts | objectives: 4.4.7 -->
## Configurer des alertes avec Azure Monitor

Sur les journaux Databricks dans Log Analytics, vous créez une **règle d'alerte de recherche dans les journaux** : exécutez la requête dans Log Analytics, puis **New alert rule**, ou créez-la depuis **Azure Monitor** > **Alerts**.

| Paramètre | Signification |
| --- | --- |
| Étendue | L'espace de travail Log Analytics qui reçoit les journaux Databricks |
| Requête | Requête KQL qui renvoie les événements sur lesquels alerter |
| Mesure | **Table rows** ou une colonne numérique, un type d'agrégation (Total, Average...) et une granularité d'agrégation (fenêtre) |
| Fractionner par dimensions | Jusqu'à six colonnes (par exemple `Identity`), une alerte par valeur |
| Seuil | Valeur statique avec un opérateur, ou seuil dynamique |
| Fréquence d'évaluation | De 1 minute à 24 heures |
| Nombre de violations | Violations dans une période d'évaluation avant le déclenchement |
| Actions | Un **groupe d'actions** (e-mail, SMS, application mobile Azure, webhook, ITSM...), réutilisable entre règles |
| Détails | Gravité (Sev0 à Sev4), **Automatically resolve alerts** (avec état), **Mute actions** pendant une période |

```kusto
DatabricksJobs
| where TimeGenerated > ago(1h)
| where Response contains "error" or Response contains "failed"
| summarize FailureCount = count()
| where FailureCount > 5
```

Autorisations pour créer la règle : lecture sur la ressource cible, écriture sur le groupe de ressources qui contient la règle, lecture sur les groupes d'actions qu'elle utilise.

Quel mécanisme d'alerte :

| Exigence | Réponse |
| --- | --- |
| Envoyer un e-mail au propriétaire quand un job précis échoue | Notifications Lakeflow Jobs sur le job |
| Alerter sur plusieurs espaces de travail et services Azure, avec SMS, ITSM ou escalade | Alerte de recherche dans les journaux Azure Monitor + groupe d'actions |
| Alerter quand une valeur d'une table franchit un seuil | Alerte Databricks SQL sur une requête |

> **Piège d'examen.** Les alertes Azure Monitor sur les événements Databricks exigent d'abord les journaux dans Log Analytics : paramètre de diagnostic (plan Premium), puis règle d'alerte de recherche dans les journaux. Une règle d'alerte ne lit pas une destination compte de stockage ou hub d'événements.

<!-- section: key-points -->
## Points clés

- Consommation : onglet Metrics (calcul classique), Query insights (serverless), onglet Monitoring de l'entrepôt, `system.billing.usage` pour les DBU par job, étiquette ou identité.
- Repair run réexécute les tâches non réussies et leurs dépendantes avec les paramètres actuels ; Run now pour les jobs à une seule tâche ; Restart run réinitialise l'interruption exponentielle d'un job continu.
- Interface Spark : chronologie des jobs, étape la plus longue, Summary Metrics (déséquilibrage : Max contre 75th percentile), métriques de déversement et de shuffle ; profil de requête pour les entrepôts SQL ; consultez l'Event log avant de redémarrer.
- `OPTIMIZE` compacte ou regroupe, `VACUUM` supprime les fichiers non référencés de plus de 7 jours par défaut et limite le voyage dans le temps ; l'optimisation prédictive automatise les deux sur les tables managées Unity Catalog.
- Streaming des journaux : paramètre de diagnostic (plan Premium) vers Log Analytics, tables `Databricks*`, données en 15 minutes environ.
- Alertes : règle d'alerte de recherche dans les journaux (requête, mesure, seuil, fréquence) + groupe d'actions.
