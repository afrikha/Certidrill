Gouverner les objets Unity Catalog, c'est rendre les données trouvables (commentaires, balises), les protéger au niveau des lignes et des colonnes (filtres de lignes, masques de colonne, stratégies ABAC), ne pas les conserver plus longtemps que nécessaire (rétention) et prouver qui a fait quoi (lignée, journaux d'audit), y compris quand les données quittent le compte par le partage Delta. Les questions d'examen donnent une exigence comme « toute nouvelle table balisée PII doit être masquée automatiquement » ou « un partenaire sans Databricks doit lire une seule partition » et demandent quelle fonctionnalité, quelle instruction ou quel privilège convient.

<!-- section: descriptions-discovery | objectives: 2.2.1 -->
## Descriptions de tables et de colonnes pour la découverte

Les commentaires sont les descriptions affichées par l'Explorateur de catalogues (Catalog Explorer), la recherche et AI/BI Genie. Trois façons de les écrire :

| Moment | Instruction |
| --- | --- |
| À la création | Option `COMMENT` de `CREATE TABLE`, et `COMMENT` après la définition d'une colonne |
| Objet existant (catalogue, schéma, table, volume...) | `COMMENT ON <object> IS '...'`, ou option `COMMENT` de `ALTER <object>` |
| Colonne existante | `ALTER TABLE ... ALTER COLUMN ... COMMENT '...'`, ou `COMMENT ON COLUMN table.column IS '...'` (Databricks SQL, Databricks Runtime 16.1 et versions ultérieures) |

```text
CREATE TABLE sales.bronze.orders (
  order_id BIGINT COMMENT 'Unique order identifier',
  order_ts TIMESTAMP COMMENT 'Order time, UTC'
) COMMENT 'Raw orders from the ERP, one row per order';

COMMENT ON TABLE sales.bronze.orders IS 'Raw ERP orders, loaded hourly';
ALTER TABLE sales.bronze.orders ALTER COLUMN order_ts COMMENT 'Order time, UTC';
```

Dans l'Explorateur de catalogues, **AI generate** propose des commentaires pour une table et ses colonnes (l'espace de travail doit autoriser les fonctionnalités d'assistance IA). Les suggestions ne sont jamais enregistrées automatiquement : vous acceptez (**Accept**) ou modifiez (**Edit**) chacune. Les commentaires générés par IA n'existent que pour les tables et les colonnes.

Privilèges pour définir un commentaire :

| Objet | Exigence |
| --- | --- |
| Table ou colonne | Propriétaire, ou `MODIFY` et `SELECT` sur la table, plus `USE CATALOG` et `USE SCHEMA` |
| Vue ou vue matérialisée | Propriétaire uniquement (`MANAGE` ne suffit pas) |
| Catalogue, schéma, volume, partage, connexion... | Propriétaire ou `MANAGE` |

Toute personne disposant de `BROWSE` peut lire les commentaires. Le Markdown de base s'affiche dans l'Explorateur de catalogues (pas dans la sortie de `DESCRIBE`). Enregistrer un commentaire exécute une instruction `ALTER`, consignée dans l'historique de la table.

> **Piège d'examen.** `COMMENT ON COLUMN` n'existe que sur Databricks SQL et Databricks Runtime 16.1 et versions ultérieures. Sur un runtime plus ancien, commentez une colonne d'une table existante avec `ALTER TABLE ... ALTER COLUMN ... COMMENT`, qui fonctionne partout.

Les balises complètent les commentaires pour la découverte et la gouvernance : des paires clé-valeur sur les catalogues, schémas, tables, colonnes et volumes, interrogeables dans `INFORMATION_SCHEMA.TABLE_TAGS`, `COLUMN_TAGS`, `SCHEMA_TAGS`, `CATALOG_TAGS` et `VOLUME_TAGS`.

<!-- section: abac | objectives: 2.2.2 -->
## Contrôle d'accès en fonction des attributs avec balises et stratégies

L'ABAC évalue les **balises gouvernées** des objets pour décider quelles données une **stratégie** protège. Une seule stratégie attachée haut dans la hiérarchie protège toutes les tables, actuelles et futures, qui portent la balise. Outre les stratégies de filtre de lignes et de masque de colonne, l'ABAC propose des stratégies GRANT (privilèges accordés dynamiquement d'après les balises) et des stratégies DENY (bêta) ; les stratégies sur les vues sont en bêta.

Les **balises gouvernées** sont définies au niveau du compte avec une liste de valeurs autorisées (jusqu'à 500 valeurs par balise, 1 000 balises gouvernées par compte). Seuls les principaux disposant de l'autorisation **ASSIGN** sur une balise gouvernée peuvent l'appliquer. Des balises système comme `class.*` (posées par la classification des données) et `system.certification_status` sont prédéfinies. Pour baliser un objet, il faut aussi `APPLY TAG` sur l'objet (ou en être propriétaire) plus `USE SCHEMA` et `USE CATALOG`. Limites : 50 balises par objet, 1 000 balises de colonne par table, une colonne par instruction `ALTER TABLE`.

```text
ALTER TABLE hr.core.employees ALTER COLUMN ssn SET TAGS ('pii' = 'ssn');
ALTER TABLE hr.core.employees SET TAGS ('sensitivity' = 'high');
SET TAG ON CATALOG hr `cost_center` = `finance`;
```

Une **stratégie** nomme une UDF, les principaux auxquels elle s'applique et des conditions sur les balises :

```text
CREATE FUNCTION hr.gov.ssn_last4(ssn STRING, nr INT) RETURNS STRING
  RETURN right(ssn, nr);

CREATE POLICY mask_ssn
ON SCHEMA hr.core
COLUMN MASK hr.gov.ssn_last4
TO `analysts` EXCEPT `hr_admins`
FOR TABLES
MATCH COLUMNS has_tag_value('pii', 'ssn') AS ssn
ON COLUMN ssn
USING COLUMNS (4);

CREATE POLICY hide_eu
ON CATALOG hr
ROW FILTER hr.gov.non_eu
TO `analysts`
FOR TABLES
WHEN has_tag_value('sensitivity', 'high')
MATCH COLUMNS has_tag('geo_region') AS region
USING COLUMNS (region);
```

| Clause | Rôle |
| --- | --- |
| `ON METASTORE / CATALOG / SCHEMA / TABLE` | Point d'attachement ; s'applique à toutes les tables descendantes (niveau metastore en bêta, administrateur du metastore uniquement) |
| `TO` / `EXCEPT` | Principaux soumis à la stratégie / exemptés (20 principaux au maximum) |
| `WHEN` | Condition sur les balises de la table ; absente, toutes les tables de l'étendue sont visées |
| `MATCH COLUMNS` | Conditions sur les colonnes, avec alias (6 au maximum pour un filtre de lignes, 3 pour un masque) |
| `ON COLUMN` | La colonne trouvée à laquelle s'applique le masque |
| `USING COLUMNS` | Arguments passés à l'UDF : alias ou littéraux |

Prérequis : `MANAGE` sur l'élément sécurisable (ou en être propriétaire) et `EXECUTE` sur l'UDF ; calcul serverless, calcul standard sous Databricks Runtime 16.4 ou ultérieur, ou calcul dédié sous 16.4 ou ultérieur avec le filtrage du contrôle d'accès affiné activé. Les runtimes plus anciens ne peuvent pas lire les tables sécurisées par ABAC ; pour qu'une telle charge de travail continue de s'exécuter pendant une migration, placez son principal dans `EXCEPT`. Quotas : 50 stratégies par table, 100 par schéma, 100 par catalogue. Les modifications de balises mettent quelques minutes à s'appliquer.

Un seul filtre de lignes distinct peut s'appliquer pour un utilisateur et une table, et un seul masque distinct par colonne. Si deux stratégies aboutissent à des UDF différentes, la requête échoue avec une erreur, même si les résultats seraient identiques.

> **Piège d'examen.** Une vue matérialisée ou une table de streaming est actualisée sous l'identité du propriétaire du pipeline ou de son identité d'exécution (run-as). Si cette identité est soumise à une stratégie, des données filtrées ou masquées sont stockées définitivement. Placez cette identité dans `EXCEPT`.

<!-- section: row-filters-masks | objectives: 2.2.3 -->
## Filtres de lignes et masques de colonne

Un **filtre de lignes** au niveau de la table est une UDF SQL qui renvoie `BOOLEAN` ; un **masque de colonne** est une UDF qui renvoie le type de la colonne. Les deux s'exécutent à chaque requête, quels que soient le calcul ou l'outil.

```text
CREATE FUNCTION sales.gov.us_only(region STRING) RETURNS BOOLEAN
  RETURN is_account_group_member('admins') OR region = 'US';

ALTER TABLE sales.silver.orders SET ROW FILTER sales.gov.us_only ON (region);
ALTER TABLE sales.silver.orders DROP ROW FILTER;

CREATE FUNCTION sales.gov.email_mask(email STRING) RETURNS STRING
  RETURN CASE WHEN is_account_group_member('support') THEN email ELSE '***' END;

ALTER TABLE sales.silver.customers ALTER COLUMN email SET MASK sales.gov.email_mask;
ALTER TABLE sales.silver.customers ALTER COLUMN email DROP MASK;

CREATE TABLE sales.silver.leads (region STRING, id INT)
  WITH ROW FILTER sales.gov.us_only ON (region);
```

Un masque peut recevoir d'autres colonnes en entrée avec `USING COLUMNS (...)`. Les fonctions d'identité (`is_account_group_member()`, `current_user()`, `session_user()`) s'exécutent sous l'identité de l'appelant ; le reste de la fonction s'exécute avec les droits de son définisseur.

Privilèges : `EXECUTE` sur la fonction, `USE SCHEMA`, `USE CATALOG` ; sur une table existante, être propriétaire ou avoir `MANAGE` plus `SELECT` ; `CREATE TABLE` quand le filtre est posé à la création.

Limitations à connaître :

- Pas sur les vues (utilisez plutôt une vue dynamique ; les stratégies ABAC sur les vues sont en bêta). Un seul masque par colonne.
- Databricks Runtime antérieur à 12.2 LTS échoue de façon sécurisée et ne renvoie aucune donnée. Le mode d'accès dédié exige 15.4 LTS ou ultérieur avec le serverless activé dans l'espace de travail (le filtrage s'exécute sur le serverless) ; seules les lectures sont prises en charge jusqu'à 16.2, les écritures exigent 16.3 ou ultérieur avec des modèles pris en charge comme `MERGE INTO`.
- Pas de voyage dans le temps (time travel) ni de clone profond ou superficiel sur les tables dotées de filtres ou de masques au niveau de la table.
- Les tables dotées de filtres ou de masques au niveau de la table ne peuvent pas être ajoutées à un partage (les schémas qui en contiennent sont filtrés d'un partage de schéma).

| Exigence | Choix |
| --- | --- |
| Même règle sur de nombreuses tables, nouvelles tables balisées couvertes automatiquement | Stratégie ABAC |
| Les propriétaires de tables ne doivent pas pouvoir supprimer la règle | Stratégie ABAC |
| Exempter un principal ETL pour qu'il puisse cloner ou partager | Stratégie ABAC avec `EXCEPT` |
| Logique ponctuelle pour une seule table, gérée par son propriétaire | Filtre de lignes ou masque au niveau de la table |
| Partager un sous-ensemble organisé et transformé | Vue dynamique |

> **Conseil d'examen.** Auditez les règles au niveau de la table dans `INFORMATION_SCHEMA.ROW_FILTERS` et `INFORMATION_SCHEMA.COLUMN_MASKS` ; auditez l'ABAC avec `SHOW POLICIES`, `DESCRIBE POLICY` et `SHOW EFFECTIVE POLICIES`.

<!-- section: retention | objectives: 2.2.4 -->
## Stratégies de rétention des données

Les tables Delta (et Iceberg managées) conservent les anciens fichiers de données et l'historique pour le voyage dans le temps. Deux propriétés de table fixent les fenêtres :

| Propriété | Valeur par défaut | Contrôle |
| --- | --- | --- |
| `delta.deletedFileRetentionDuration` | `interval 7 days` | L'âge que doivent atteindre les fichiers non référencés avant que `VACUUM` les supprime, donc jusqu'où remonte le voyage dans le temps |
| `delta.logRetentionDuration` | `interval 30 days` | La durée de conservation du journal des transactions (historique de la table) |

À partir de Databricks Runtime 18.0 (à partir de 12.2 pour les tables managées Unity Catalog), `logRetentionDuration` doit être supérieure ou égale à `deletedFileRetentionDuration`, et le voyage dans le temps vers une version plus ancienne que `deletedFileRetentionDuration` est bloqué.

```text
ALTER TABLE finance.gold.ledger SET TBLPROPERTIES (
  'delta.logRetentionDuration' = 'interval 90 days',
  'delta.deletedFileRetentionDuration' = 'interval 90 days'
);

VACUUM finance.gold.ledger DRY RUN;
VACUUM finance.gold.ledger;
```

`VACUUM` supprime définitivement les fichiers plus anciens que le seuil : le voyage dans le temps vers les versions antérieures est perdu. Databricks recommande fortement au moins 7 jours ; descendre en dessous impose de désactiver `spark.databricks.delta.retentionDurationCheck.enabled`. Sur les tables managées Unity Catalog, l'**optimisation prédictive** exécute `VACUUM` automatiquement.

Pour faire expirer des **lignes** selon leur âge, utilisez la **durée de vie automatique** (auto time-to-live) sur les tables managées (Databricks Runtime 17.3 et ultérieur, optimisation prédictive activée, `MODIFY` sur la table) :

```text
ALTER TABLE web.bronze.clicks DELETE ROWS 30 DAYS AFTER event_ts;
ALTER TABLE web.bronze.clicks DROP ROW DELETION;
```

L'optimisation prédictive exécute alors `DELETE`, `PURGE` (si les vecteurs de suppression sont activés) et `VACUUM` en arrière-plan ; le moment exact n'est pas garanti : la suppression définitive peut intervenir jusqu'à 6 jours plus `deletedFileRetentionDuration` après l'expiration ; pour supprimer les lignes sous 30 jours avec la rétention par défaut de 7 jours, indiquez donc 17 jours. La durée de vie automatique n'est pas prise en charge sur les vues matérialisées, et les lecteurs en streaming d'une telle table doivent définir `skipChangeCommits`.

Pour une demande de « droit à l'oubli » sur une table avec vecteurs de suppression : `DELETE` des lignes, `REORG TABLE ... APPLY (PURGE)` pour réécrire les fichiers, puis `VACUUM` après la période de rétention.

> **Piège d'examen.** `DELETE` seul n'efface pas les données du stockage : les anciens fichiers restent lisibles par voyage dans le temps jusqu'à ce que `VACUUM` les supprime.

<!-- section: lineage | objectives: 2.2.5 -->
## Propriétaire, historique, dépendances et lignée dans l'Explorateur de catalogues

L'Explorateur de catalogues (**Catalog** dans la barre latérale) affiche pour une table :

| Élément | Où | Équivalent SQL |
| --- | --- | --- |
| Propriétaire | Vue d'ensemble, modification du propriétaire | `ALTER TABLE ... SET OWNER TO <principal>` |
| Historique des opérations | Onglet **History** | `DESCRIBE HISTORY <table>` |
| Requêtes et utilisateurs fréquents (30 derniers jours) | Informations sur la table (insights) | |
| Tables, notebooks, jobs, pipelines et tableaux de bord en amont et en aval | Onglet **Lineage**, **See Lineage Graph** | `system.access.table_lineage`, `system.access.column_lineage` |

Faites d'un groupe le propriétaire, pour que la propriété survive aux départs. Le propriétaire a tous les privilèges sur l'objet et peut les accorder.

Unity Catalog capture la lignée **automatiquement**, jusqu'au niveau des colonnes, pour les requêtes exécutées par DataFrames ou Databricks SQL sur des tables Unity Catalog, agrégée sur tous les espaces de travail du metastore. Rien n'est à activer. Dans le graphe, un niveau s'affiche par défaut ; développez les nœuds avec l'icône plus, cliquez sur une arête pour voir les notebooks, jobs et requêtes qui la produisent, cliquez sur une colonne pour voir la lignée de colonne.

Pour voir la lignée, il faut au moins `BROWSE` sur le catalogue parent ; les voisins auxquels vous n'avez pas accès apparaissent comme des nœuds masqués. La lignée de l'Explorateur de catalogues est conservée indéfiniment (capturée depuis le 1er septembre 2024) ; les tables système de lignée conservent 395 jours.

La lignée n'est ni capturée ni conservée pour les objets renommés, les RDD, les vues temporaires globales ou les références par chemin (lignée de colonne). Les UDF ne donnent qu'une lignée au niveau de la table. Les jobs qui utilisent la requête `runs submit` de l'API Jobs ou le type de tâche `spark submit` n'apparaissent pas dans les vues de lignée : la lignée des tables et des colonnes est capturée, mais pas le lien vers l'exécution du job.

> **Piège d'examen.** Renommer une table, un schéma, un catalogue ou une colonne (`ALTER TABLE ... RENAME TO`) ne reporte pas sa lignée : fixez les noms avant la production, car la lignée n'est pas conservée lors d'un renommage.

<!-- section: audit-logging | objectives: 2.2.6 -->
## Journalisation d'audit

Deux façons d'obtenir les événements d'audit (les deux exigent le plan **Premium**) :

| Option | Contenu | Mise en place |
| --- | --- | --- |
| Table système `system.access.audit` (préversion publique ; recommandée) | Tous les services, y compris les événements au niveau du compte (`workspace_id` = 0) ; conservés 395 jours ; régionale | Accorder `USE CATALOG` sur `system`, `USE SCHEMA` et `SELECT` sur `system.access` |
| Paramètres de diagnostic Azure | Services de l'espace de travail uniquement, pas d'événements au niveau du compte | Portail Azure : espace de travail, **Paramètres de diagnostic**, **Activer les diagnostics** ; destination Log Analytics, compte de stockage ou Event Hub |

Configurer les paramètres de diagnostic exige Owner, Contributor ou un rôle personnalisé avec `Microsoft.Databricks/workspaces/assignWorkspaceAdmin/action`. Les journaux apparaissent en général sous 15 minutes (sans garantie). Si le portail indique que l'abonnement n'est pas inscrit pour utiliser `microsoft.insights`, inscrivez ce fournisseur de ressources.

```text
SELECT event_time, user_identity.email, action_name, request_params
FROM system.access.audit
WHERE service_name = 'unityCatalog' AND event_date >= current_date() - 7
ORDER BY event_time DESC;
```

Pour certains événements, les clés de `request_params` qui contiennent des définitions SQL sont omises, sauf pour un administrateur de compte ou un membre du groupe `databricks_pii_access`. Quand un espace de travail est supprimé, ses événements d'audit de plus de 14 jours sont retirés de la table.

Les **journaux d'audit détaillés** (verbose audit logs) ajoutent le texte de chaque commande de notebook et de chaque requête Databricks SQL (`runCommand`, `commandSubmit`, `commandFinish`). Ils sont désactivés par défaut ; un administrateur de l'espace de travail active **Verbose Audit Logs** dans l'onglet **Advanced** des paramètres d'administration de l'espace de travail.

> **Piège d'examen.** Une exigence de journaliser « le texte SQL exécuté par chaque utilisateur » demande les journaux d'audit détaillés ; les journaux d'audit standard enregistrent l'action, pas le texte de la commande.

<!-- section: delta-sharing | objectives: 2.2.7 -->
## Une stratégie sécurisée pour le partage Delta

Le partage Delta (Delta Sharing, documenté sur Microsoft Learn sous le nom **OpenSharing**) partage des données en lecture seule sans les copier. Objets : un **partage** (share, collection de ressources), un **destinataire** (recipient, qui reçoit), un **fournisseur** (provider, qui partage). Tous trois sont des éléments sécurisables Unity Catalog.

| Destinataire | Protocole | Authentification | Partageable |
| --- | --- | --- | --- |
| Espace de travail Databricks avec Unity Catalog, dans n'importe quel cloud ou compte | Databricks-to-Databricks | Identifiant de partage du metastore destinataire, sans jeton | Tables, vues, vues matérialisées, tables de streaming, vues de métriques, volumes, notebooks, modèles |
| Tout outil hors Databricks (Spark, pandas, Power BI) | Databricks-to-Open | Jeton du porteur (lien d'activation) ou fédération OIDC | Données tabulaires uniquement |

Dans le même metastore, ne partagez pas : accordez des privilèges dans Unity Catalog.

```text
CREATE SHARE fabrikam_sales COMMENT 'Monthly sales for Fabrikam';

ALTER SHARE fabrikam_sales ADD TABLE sales.gold.orders
  PARTITION (country = 'FR') AS fabrikam.orders WITHOUT HISTORY;

CREATE RECIPIENT fabrikam USING ID 'azure:westeurope:<metastore-uuid>';
CREATE RECIPIENT tailspin;  -- open sharing: TOKEN authentication

GRANT SELECT ON SHARE fabrikam_sales TO RECIPIENT fabrikam;
REVOKE SELECT ON SHARE fabrikam_sales FROM RECIPIENT fabrikam;
```

Leviers de sécurité :

- **Le minimum de données** : partagez une partition (`PARTITION (...)`), une vue ou une vue dynamique filtrée par `CURRENT_RECIPIENT('country')` sur les propriétés du destinataire, plutôt que la table entière. `AS` masque le vrai nom de la table.
- **Historique** : `WITH HISTORY` (par défaut à partir de Databricks Runtime 16.2) permet au destinataire le voyage dans le temps et les lectures en streaming ; `WITHOUT HISTORY` le limite à la version courante. Interroger le flux de données modifiées (CDF) exige que le CDF soit activé sur la table avant de la partager avec historique. Le partage d'un schéma entier inclut toujours l'historique, quel que soit le runtime, et n'autorise ni alias de table ni partitions.
- **Jetons** (partage ouvert) : le lien d'activation permet au destinataire de télécharger le fichier d'informations d'identification **une seule fois**. Les jetons durent au plus un an ; la durée de vie par défaut du metastore s'applique aux nouveaux jetons, et les destinataires existants ne reçoivent une nouvelle durée de vie qu'à la rotation de leur jeton (`databricks recipients rotate-token`, `0` seconde fait expirer l'ancien jeton immédiatement). Préférez la fédération OIDC (jetons de courte durée) quand le fournisseur d'identité du destinataire la prend en charge. Limitez un destinataire à jeton à des adresses IP connues avec une liste d'accès IP : elle contrôle l'API REST de partage, l'URL d'activation et le téléchargement du fichier d'informations d'identification ; sans SecureConnect côté fournisseur, les URL de stockage restent accessibles depuis n'importe quelle adresse IP cliente.
- **Tables gouvernées** : une table soumise à des stratégies ABAC ne peut être partagée que si le propriétaire du partage figure dans le `EXCEPT` de la stratégie ; les destinataires voient alors les données partagées sans filtre. Les tables dotées de filtres de lignes ou de masques au niveau de la table ne peuvent pas être partagées du tout.
- **Privilèges** : `CREATE SHARE` et `CREATE RECIPIENT` sur le metastore ; propriétaire du partage avec `SELECT` sur chaque table (à conserver, sinon les destinataires perdent l'accès) ; accorder un partage à un destinataire exige d'être administrateur du metastore, ou propriétaire du partage (ou `USE SHARE` + `SET SHARE PERMISSION`) et propriétaire du destinataire (ou `USE RECIPIENT`). Faites d'un groupe le propriétaire du partage.

> **Conseil d'examen.** Microsoft Learn indique que tous les jetons de destinataires Databricks-to-Open émis avant le 8 décembre 2025 avec une expiration postérieure au 8 décembre 2026, ou sans expiration, expirent automatiquement le 8 décembre 2026 : faites-en la rotation avant.

<!-- section: key-points -->
## Points clés

- Descriptions de colonnes sur une table existante : `ALTER TABLE ... ALTER COLUMN ... COMMENT`, ou `COMMENT ON COLUMN` sous Databricks Runtime 16.1+ ; les commentaires générés par IA doivent être acceptés.
- ABAC = balises gouvernées + `CREATE POLICY` au niveau du catalogue ou du schéma ; exige `MANAGE` et `EXECUTE`, le serverless ou Databricks Runtime 16.4+ ; les propriétaires ne peuvent pas la contourner.
- Filtres et masques au niveau de la table : `SET ROW FILTER ... ON (...)`, `ALTER COLUMN ... SET MASK` ; pas sur les vues, ni voyage dans le temps ni clone.
- Rétention : 7 jours pour les fichiers, 30 jours pour le journal ; `VACUUM` met fin au voyage dans le temps ; la durée de vie automatique supprime les lignes selon leur âge.
- La lignée est automatique, au niveau des colonnes, exige `BROWSE` ; les renommages la cassent.
- Audit : `system.access.audit` d'abord, paramètres de diagnostic pour Azure Monitor ; journaux d'audit détaillés pour le texte des commandes.
- Partage Delta : Databricks-to-Databricks sans jeton ; le partage ouvert utilise des liens d'activation à usage unique, la rotation, les listes d'accès IP ; partagez des partitions ou des vues, pas des tables entières.
