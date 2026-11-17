Les questions d'optimisation donnent un symptôme (rapports Power BI lents sur des tables Delta, copie qui dure des heures, flux qui prend du retard, requête d'entrepôt qui lit trop de données) et une contrainte (réduire le coût, l'effort de développement ou la latence), puis demandent quel paramètre, quelle commande ou quel changement de conception règle le problème. Connaissez la valeur par défaut de chaque moteur : l'examen demande souvent quoi changer quand elle ne convient plus.

<!-- section: lakehouse-tables | objectives: 3.3.1 -->
## Optimiser les tables lakehouse

Chaque écriture Delta ajoute des fichiers Parquet ; des écritures, mises à jour et suppressions fréquentes et petites laissent de nombreux petits fichiers, qui ralentissent les lectures et la synchronisation des métadonnées du point de terminaison d'analytique SQL. Le compactage (`OPTIMIZE`) les réécrit en moins de fichiers, de bonne taille.

```text
-- Spark SQL in a notebook
OPTIMIZE dbo.sales                                  -- bin compaction
OPTIMIZE dbo.sales ZORDER BY (customer_id)          -- co-locate values for data skipping
OPTIMIZE dbo.sales VORDER                           -- force V-Order on rewritten files
OPTIMIZE dbo.sales ZORDER BY (customer_id) VORDER   -- order: compaction, Z-Order, V-Order
VACUUM dbo.sales RETAIN 168 HOURS                   -- remove unreferenced files older than 7 days
```

| Fonctionnalité | Ce qu'elle fait | Valeur par défaut ou paramètre |
| --- | --- | --- |
| Compactage (`OPTIMIZE`) | Regroupe les petits fichiers en fichiers de la taille cible | Cible de 1 Go (`spark.databricks.delta.optimize.maxFileSize`) |
| Z-Order | Trie les données sur des colonnes souvent filtrées et sélectives, pour ignorer des fichiers entiers | Désactivé ; à chaque `OPTIMIZE` |
| V-Order | Tri, encodage et compression Parquet à l'écriture, idéal pour Power BI Direct Lake et les lectures SQL | **Désactivé** pour les nouveaux espaces de travail (`spark.sql.parquet.vorder.default=false`) |
| Compactage automatique | Lance un `OPTIMIZE` synchrone après une écriture quand une partition a trop de petits fichiers | Se définit avec `spark.databricks.delta.autoCompact.enabled` ou la propriété de table `delta.autoOptimize.autoCompact` |
| Optimisation rapide (fast optimize) | Ignore les lots peu susceptibles d'atteindre la taille cible | Se définit avec `spark.microsoft.delta.optimize.fast.enabled` |
| `VACUUM` | Supprime les fichiers qui ne sont plus référencés et plus anciens que la rétention | 7 jours ; une rétention plus courte échoue sauf si `spark.databricks.delta.retentionDurationCheck.enabled` vaut `false` |

V-Order se définit à trois niveaux : la session (`spark.sql.parquet.vorder.default`), la table (`TBLPROPERTIES("delta.parquet.vorder.enabled" = "true")`) et une écriture (`.option("parquet.vorder.enabled", "true")`). Les paramètres de session et d'écriture l'emportent sur la propriété de table. Modifier la propriété n'affecte que les écritures futures : les fichiers existants gardent leur disposition jusqu'à leur réécriture, par exemple par `OPTIMIZE ... VORDER`.

Les **profils de ressources** définissent ces options ensemble (`spark.fabric.resourceProfile`, dans un environnement ou avec `spark.conf.set` à l'exécution ; l'exécution l'emporte) :

| Profil | Usage | Principaux paramètres |
| --- | --- | --- |
| `writeHeavy` | Par défaut pour les nouveaux espaces de travail ; ingestion fréquente | V-Order désactivé |
| `readHeavyForPBI` | Requêtes Power BI sur des tables Delta | V-Order activé, écriture optimisée activée (lots de 1 Go) |
| `readHeavyForSpark` | Lectures Spark fréquentes | Écriture optimisée activée (lots de 128 Mo) |
| `custom` | Vos propres paramètres | Définis par l'utilisateur |

Sans code, l'explorateur du lakehouse propose **Maintenance** sur une table : **Optimize** (avec **Apply V-order**), **Vacuum** (seuil de rétention, 7 jours par défaut) et **Merge deletion vectors**, exécutés comme une tâche visible dans le hub de surveillance. Un pipeline peut lancer la même tâche avec l'activité Lakehouse Maintenance (préversion). La maintenance ne s'applique qu'aux tables Delta.

**Partitionnement.** Ne partitionnez que les grandes tables, sur une colonne à faible cardinalité (année, date) qui produit des partitions d'environ 1 Go ou plus ; une colonne à forte cardinalité crée une partition par valeur et beaucoup de petits fichiers.

> **Piège d'examen.** `VACUUM` n'accélère pas les requêtes : il récupère du stockage et limite le voyage dans le temps (time travel). Pour une lecture lente sur des fichiers fragmentés, la réponse est `OPTIMIZE` (avec V-Order pour Direct Lake, Z-Order pour les filtres sélectifs).

<!-- section: pipelines | objectives: 3.3.2 -->
## Optimiser un pipeline

**Paramètres de l'activité Copy.**

| Paramètre | Valeurs | Effet |
| --- | --- | --- |
| Intelligent throughput optimization | **Auto** (par défaut), Standard (64), Balanced (128), Maximum (256), ou de 4 à 256 | Puissance de calcul allouée à la copie ; la valeur utilisée apparaît dans `usedDataIntegrationUnits` |
| Degree of copy parallelism | Auto, ou un entier supérieur ou égal à 1 | Nombre maximal de threads qui lisent la source et écrivent la destination ; chaque thread est une session sur une base de données source |
| Partition option (sources SQL) | None (par défaut), **Physical partitions of table**, **Dynamic range** | Répartit la lecture en requêtes parallèles |
| Staging | Obligatoire pour une destination entrepôt | ITO et le parallélisme s'appliquent alors de la source à la zone de transit |

| Table source | Option de partition |
| --- | --- |
| Partitionnée, avec assez de partitions | Physical partitions of table (le parallélisme est plafonné par le nombre de partitions) |
| Table de tas (heap), indexée ou déséquilibrée | Dynamic range sur une colonne, avec des bornes supérieure et inférieure définies à l'avance, et un degré de parallélisme limité (par exemple 50) |
| DDL de la source inconnue | Valeurs par défaut, en acceptant une durée plus longue |

Sans bornes, Dynamic range interroge d'abord la source pour les trouver. Laissez **Isolation level** à None quand le parallélisme est Auto, pour ne pas surcharger la source. Baisser ITO allonge la copie mais réduit les unités de capacité consommées : c'est le levier quand l'exigence porte sur le coût.

**Flux de contrôle.** Une activité ForEach exécute ses éléments en parallèle sauf si **Sequential** est coché ; **Batch count** limite le nombre d'éléments exécutés en même temps. Copier une grande table par tranches de dates dans un ForEach parallèle est un moyen courant d'accélérer une source non partitionnée. Autres gains : supprimer les activités inutiles entre les étapes, exécuter en parallèle les branches indépendantes (sans dépendance entre elles), et filtrer à la source (requête ou filigrane incrémentiel) plutôt que tout copier.

> **Conseil d'examen.** « Réduire la charge sur la base de données source pendant la copie » signifie baisser **Degree of copy parallelism**, pas ITO. « Réduire les unités de capacité de la copie » signifie baisser ITO.

<!-- section: warehouse | objectives: 3.3.3 -->
## Optimiser un entrepôt de données

**Conception des tables.**

- Utilisez le plus petit type qui convient : `varchar(100)` plutôt que `varchar(8000)` ou `varchar(max)`, `varchar` plutôt que `char` pour les longueurs variables, des entiers plutôt que `decimal` si possible, et une précision explicite (`decimal(9,4)` : un `decimal` sans précision vaut `decimal(18,0)`).
- Déclarez les colonnes `NOT NULL` quand le modèle le permet.
- Gardez le même type de données des deux côtés des jointures et des filtres pour éviter les conversions.

**Chargement.** `COPY INTO` est la méthode recommandée pour charger des fichiers : visez des fichiers de 100 Mo à 1 Go, de nombreux fichiers, plusieurs `COPY INTO` en parallèle. Depuis des tables de lakehouse, utilisez CTAS ou `INSERT ... SELECT`. Évitez les insertions, mises à jour et suppressions au compte-gouttes (une ligne à la fois) : chacune crée un nouveau fichier Parquet. Regroupez-les en lots.

**La maintenance est automatique.** L'entrepôt compacte les petits fichiers et supprime les lignes effacées en arrière-plan, et maintient automatiquement les statistiques. Vous pouvez toujours exécuter `CREATE STATISTICS` ou `UPDATE STATISTICS` (histogrammes sur une colonne), par exemple après un gros chargement. **V-Order est activé par défaut** dans un entrepôt ; le désactiver est irréversible et ne convient qu'aux entrepôts de transit très orientés écriture.

**Clustering des données (préversion).** Stocke ensemble les lignes de valeurs proches pour que les requêtes ignorent des fichiers :

```text
CREATE TABLE dbo.Sales
(
    SaleID int, CustomerID int, SaleDate date, Amount decimal(10,2)
)
WITH (CLUSTER BY (CustomerID, SaleDate));
```

| Règle | Détail |
| --- | --- |
| Colonnes | De 1 à 4 ; cardinalité moyenne à forte, utilisées dans des filtres de plage (`WHERE` sur des dates, des ID) |
| Quand | Défini à la création (`CREATE TABLE` ou CTAS) ; impossible à ajouter, modifier ou supprimer ensuite (reconstruire par CTAS) |
| Pas pour | Les petites tables, les colonnes à faible cardinalité, les jointures d'égalité, `bit`, `varchar(max)`, les colonnes d'identité |
| Coût | Ingestion plus lente et davantage d'unités de capacité ; le DML doit porter sur au moins 1 million de lignes pour en profiter |

**Concurrence.** Les conflits écriture-écriture se produisent par table : planifiez les mises à jour d'une même table pour qu'elles ne se chevauchent pas.

> **Piège d'examen.** Dans un entrepôt, vous n'exécutez ni `OPTIMIZE` ni `VACUUM` : le compactage est automatique. Ces commandes concernent les tables Delta de lakehouse écrites par Spark.

<!-- section: eventstream-eventhouse | objectives: 3.3.4 -->
## Optimiser des flux d'événements et des eventhouses

**Eventstream.**

| Paramètre | Valeurs | Usage |
| --- | --- | --- |
| Event throughput | Low (moins de 10 Mo/s), Medium (de 10 à 100 Mo/s), High (plus de 100 Mo/s) | L'augmenter quand le backlog grossit ; les nœuds qui prennent en charge la pause doivent être désactivés pendant le changement |
| Rétention | 1 jour par défaut, jusqu'à 90 jours | Durée pendant laquelle les événements restent disponibles pour être rejoués |
| Mode de la destination eventhouse | Direct ingestion, ou Event processing before ingestion | Direct pour les événements bruts ; mode de traitement quand des opérateurs (filtre, agrégation) s'exécutent avant |

Une source Azure Event Hubs de moins de quatre partitions est limitée par ses partitions, quel que soit le niveau de débit. Filtrer et agréger dans l'eventstream réduit le volume ingéré en aval.

**Eventhouse (base de données KQL).**

| Levier | Effet | Commande |
| --- | --- | --- |
| Stratégie de mise en cache | Les données du cache chaud (SSD local) s'interrogent plus vite ; une période plus longue coûte plus cher | `.alter table Telemetry policy caching hot = 7d` |
| Stratégie de rétention | Les données plus anciennes que la période sont supprimées ; 3 650 jours par défaut | **Manage** > **Data policies**, ou `.alter table ... policy retention` |
| Stratégie de traitement par lots de l'ingestion | Par défaut : 5 minutes, 500 éléments ou 1 Go, selon la première limite atteinte ; réduire le temps (10 secondes minimum) pour la latence | `.alter table ... policy ingestionbatching` |
| Stratégie de mise à jour | Transforme les données une seule fois à l'ingestion (analyse JSON, conversion du temps Unix) au lieu de chaque requête | `.alter table ... policy update` |
| Vue matérialisée | Précalcule une agrégation, tenue à jour à l'arrivée des données | `.create materialized-view` |

La période de mise en cache doit être inférieure ou égale à la période de rétention. Un temps de traitement par lots trop court augmente le coût et peut même ajouter de la latence sur les tables chargées.

```kusto
// Keep only the latest reading per device, maintained at ingestion
.create async materialized-view with (backfill=true) LatestReading on table Telemetry
{
    Telemetry
    | summarize arg_max(Timestamp, *) by DeviceId
}
```

Une vue matérialisée se termine par un seul `summarize` (les agrégations prises en charge comprennent `count`, `dcount`, `sum`, `avg`, `min`, `max`, `arg_max`, `arg_min`, `take_any`) ; interrogez-la avec `materialized_view('LatestReading')`.

> **Conseil d'examen.** « Les requêtes sur les 7 derniers jours doivent être rapides, les données conservées un an au moindre coût » : cache chaud de 7 jours, rétention de 365 jours.

<!-- section: spark | objectives: 3.3.5 -->
## Optimiser les performances de Spark

**Calcul.**

| Option | Démarrage | Usage |
| --- | --- | --- |
| Pool de démarrage (starter pool) | 5 à 10 secondes ; nœuds Medium uniquement | Par défaut ; travail interactif rapide |
| Pool personnalisé | Environ 3 minutes (à la demande) | Autres tailles de nœuds, nombre de nœuds fixe ou mis à l'échelle automatiquement |
| Pool de démarrage plus bibliothèques | Ajouter 30 secondes à 5 minutes | Préférer un environnement dont les bibliothèques sont publiées une fois |
| Mode haute concurrence | Réutilise une session en cours | Plusieurs notebooks partagent une session Spark |

Tailles de nœuds : Small 4 vCores et 32 Go, Medium 8 et 64 Go, Large 16 et 128 Go, X-Large 32 et 256 Go, XX-Large 64 et 512 Go. La mise à l'échelle automatique fixe un minimum et un maximum de nœuds ; l'**allocation dynamique** ajoute et libère des exécuteurs selon les besoins du travail. Une capacité donne 2 VCores Spark par unité de capacité, avec une rafale de 3x : une F64 permet 384 VCores au total.

**Moteur d'exécution natif.** Un moteur vectorisé (Velox et Apache Gluten) exécute les opérateurs Spark pris en charge hors de la JVM, sans modification du code, sur les runtimes 1.3 et 2.0. Il accélère Parquet, Delta et CSV ; les opérations non prises en charge (JSON, XML, Structured Streaming) basculent automatiquement sur le moteur habituel. Activez-le dans l'environnement (**Spark compute** > **Acceleration** > **Enable native execution engine**) ou par session :

```json
%%configure
{
    "conf": {
        "spark.native.enabled": "true"
    }
}
```

Il aide les requêtes gourmandes en calcul (jointures, agrégations), pas les requêtes simples ou limitées par les E/S.

**Bonnes pratiques dans le code.**

- Laissez l'exécution adaptative des requêtes activée (`spark.sql.adaptive.enabled`), qui ajuste les partitions de shuffle et les stratégies de jointure à l'exécution.
- Diffusez (broadcast) une petite dimension dans une jointure pour éviter de redistribuer la grande table.
- Ne mettez un DataFrame en cache que s'il est réutilisé plusieurs fois, et libérez-le ensuite avec `unpersist()`.
- Lisez uniquement les colonnes nécessaires et filtrez tôt, pour que l'élimination de fichiers Delta fonctionne.
- Choisissez le profil de ressources adapté à la charge de travail (`writeHeavy` pour l'ingestion, `readHeavyForSpark` pour des lectures répétées).
- Installez les bibliothèques dans un environnement plutôt qu'avec `%pip` à chaque exécution.

> **Piège d'examen.** Un démarrage de session lent est un problème de calcul (pool personnalisé, bibliothèques, réseau privé), pas de code : un pool de démarrage sans bibliothèque supplémentaire démarre en quelques secondes.

<!-- section: query-performance | objectives: 3.3.6 -->
## Optimiser les performances des requêtes

**T-SQL sur les entrepôts et les points de terminaison d'analytique SQL.** Ne jugez pas une requête sur sa première exécution : une exécution à froid charge les données depuis OneLake et construit les statistiques. Une valeur de `data_scanned_remote_storage_mb` supérieure à zéro dans `queryinsights.exec_requests_history` signale une exécution à froid. Trouvez les requêtes coûteuses avec `long_running_queries` et `frequently_run_queries`, puis réduisez ce qu'elles lisent : sélectionnez seulement les colonnes nécessaires, filtrez sur des colonnes de clustering ou de Z-Order, agrégez avant de joindre, et gardez des types de jointure identiques.

Sur un point de terminaison d'analytique SQL, les performances dépendent de la disposition des fichiers du lakehouse : trop de petits fichiers ajoutent une surcharge, quelques fichiers énormes limitent le parallélisme. Exécutez `OPTIMIZE`, évitez le surpartitionnement, et gardez la taille de fichier cible adaptative par défaut en runtime 2.0. V-Order profite surtout à Direct Lake et n'est pas nécessaire pour le point de terminaison d'analytique SQL.

**KQL.**

| Faites | Plutôt que | Pourquoi |
| --- | --- | --- |
| Filtrer d'abord sur la colonne `datetime` | Filtrer d'abord sur des chaînes | L'index datetime élimine des partitions de données (shards) entières |
| `has` | `contains` | Index de jetons au lieu d'une recherche de sous-chaîne |
| `==`, `in` | `=~`, `in~` | Les comparaisons sensibles à la casse coûtent moins |
| Filtrer sur les colonnes de la table | `extend` une colonne calculée, puis filtrer | Les filtres sur les colonnes stockées utilisent l'index |
| La plus petite table à gauche de `join` | La grande table à gauche | Moins de lignes à apparier |
| `lookup` quand le côté droit est petit | `join` | Optimisé pour une petite dimension |
| `hint.shufflekey` | La stratégie par défaut sur deux côtés volumineux ou un `summarize` à forte cardinalité | Répartit le travail sur les nœuds |
| `materialize()` pour un `let` utilisé plusieurs fois | Le recalculer | Calculé une seule fois |
| Vue matérialisée ou stratégie de mise à jour | Répéter la même agrégation ou la même analyse JSON à chaque requête | Travail fait une fois à l'ingestion |

```kusto
Telemetry
| where Timestamp > ago(1h)
| where DeviceType has "pump"
| lookup kind=leftouter Devices on DeviceId
| summarize avg(Temperature) by Site, bin(Timestamp, 5m)
```

**Direct Lake.** Les rapports restent rapides tant que les tables Delta respectent les garde-fous de la SKU (fichiers Parquet, groupes de lignes et lignes par table) : compactez les tables et appliquez V-Order aux tables qui alimentent des modèles Direct Lake.

<!-- section: key-points -->
## Points clés

- Lakehouse : `OPTIMIZE` (compactage à 1 Go, `ZORDER BY`, `VORDER`), `VACUUM` 7 jours ; V-Order est désactivé par défaut dans les nouveaux espaces de travail (profil `writeHeavy`).
- Pipelines : ITO pour le calcul et le coût, degré de parallélisme de copie pour la charge de la source, Physical partitions ou Dynamic range pour les sources SQL, zone de transit pour les entrepôts.
- Entrepôt : petits types, `COPY INTO` avec des fichiers de 100 Mo à 1 Go, pas d'insertions au compte-gouttes ; compactage et statistiques automatiques ; `CLUSTER BY` (1 à 4 colonnes) seulement à la création.
- Eventstream : augmenter Event throughput en cas de backlog. Eventhouse : cache pour la vitesse, rétention pour le coût, traitement par lots pour la latence, stratégies de mise à jour et vues matérialisées pour ne faire le travail qu'une fois.
- Spark : les pools de démarrage démarrent en quelques secondes, moteur d'exécution natif pour les travaux gourmands en calcul, haute concurrence pour partager les sessions, environnements pour les bibliothèques.
- KQL : filtre datetime d'abord, `has` plutôt que `contains`, petite table à gauche, `lookup` pour les petites dimensions.
