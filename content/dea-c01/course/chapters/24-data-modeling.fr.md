Les questions de modélisation décrivent les requêtes qu'une équipe va exécuter et demandent la structure qui les rend rapides et peu coûteuses : clés de distribution et de tri Redshift, clés et index DynamoDB, partitions et formats d'un lac de données. Puis quelque chose change (une nouvelle colonne, un nouveau moteur source, dix fois plus de données) et vous choisissez la conception qui absorbe ce changement. Le chapitre couvre aussi la conversion de schémas, le lignage des données et les plongements (embeddings) vectoriels.

<!-- section: redshift-schema | objectives: 2.4.1 -->
## Concevoir des schémas Amazon Redshift

Redshift répartit les lignes entre les tranches (slices) de ses nœuds de calcul : une requête est rapide quand elle lit peu de blocs et déplace peu de données entre les nœuds. Un **schéma en étoile** (grande table de faits, petites dimensions) est le modèle habituel.

| Paramètre de table | Options | Le choisir quand |
| --- | --- | --- |
| Style de distribution | `AUTO` (par défaut : Redshift choisit et ajuste le style à mesure que la table grossit) | Aucun schéma de jointure clair |
| | `KEY` sur une colonne | Deux grandes tables jointes sur cette colonne : les lignes correspondantes partagent une tranche, la jointure est colocalisée |
| | `ALL` | Petites dimensions qui changent peu : une copie complète sur chaque nœud |
| | `EVEN` | Tables non jointes, ou aucune colonne ne se répartit uniformément |
| Clé de tri | Composée (colonnes par priorité) | Filtres et parcours de plages sur la première colonne, en général une date |
| | Entrelacée (interleaved) | Poids égal à plusieurs colonnes de filtre ; coûteuse à maintenir, rarement la réponse |
| | `AUTO` | L'optimisation automatique des tables choisit d'après la charge de travail |
| Compression des colonnes | `ENCODE AUTO` (par défaut), `AZ64`, `ZSTD`, `LZO` | Garder AUTO sauf si un encodage précis est demandé |

```sql
CREATE TABLE sales_fact (
  sale_id      BIGINT,
  customer_id  INTEGER,
  product_id   INTEGER,
  sale_date    DATE,
  amount       DECIMAL(12,2)
)
DISTSTYLE KEY
DISTKEY (customer_id)
COMPOUND SORTKEY (sale_date, product_id);

CREATE TABLE product_dim (
  product_id   INTEGER,
  category     VARCHAR(64),
  brand        VARCHAR(64)
)
DISTSTYLE ALL;
```

Une clé de distribution exige une **cardinalité élevée et une répartition uniforme** : une clé dominée par quelques valeurs (pays, statut) provoque une **asymétrie des données (data skew)**, une tranche portant la plupart des lignes. Le JSON semi-structuré peut aller dans une colonne `SUPER`, interrogée avec PartiQL, au lieu d'être aplati à l'avance.

> **Piège d'examen.** Les clés de tri permettent à Redshift d'ignorer des blocs grâce aux zone maps (min et max par bloc) ; les clés de distribution décident de la tranche qui stocke une ligne. « Les requêtes filtrent sur les 7 derniers jours » : clé de tri sur la date ; « la jointure de deux grandes tables est lente à cause de la redistribution » : `DISTKEY` identique sur la colonne de jointure.

<!-- section: dynamodb-schema | objectives: 2.4.1 -->
## Concevoir des tables DynamoDB

DynamoDB se modélise à partir des **modèles d'accès**, pas des entités : listez d'abord chaque requête, puis choisissez des clés qui répondent à chacune par `GetItem` ou `Query`, jamais par `Scan`.

| Élément | Règles |
| --- | --- |
| Clé de partition | Hachée pour placer l'élément ; cardinalité élevée (ID client, ID d'appareil) pour répartir les requêtes entre les partitions |
| Clé de tri | Ordonne les éléments d'une même clé de partition, permet des conditions de plage (`begins_with`, `between`) ; des valeurs composites comme `ORDER#2026-11-21#0042` servent plusieurs modèles d'accès |
| Index secondaire global (GSI) | Autres clés de partition et de tri, ajoutable à tout moment, cohérence à terme, capacité propre |
| Index secondaire local (LSI) | Même clé de partition, autre clé de tri, uniquement à la création de la table, lectures fortement cohérentes possibles, 10 Go par collection d'éléments |
| Taille d'un élément | 400 Ko maximum : les charges utiles volumineuses vont dans S3, l'élément garde la clé de l'objet |

Modèles à connaître : la **conception à table unique** (plusieurs types d'entités avec des clés génériques `PK` et `SK`, pour qu'une seule `Query` renvoie un client et ses commandes), le **partitionnement des écritures (write sharding)** (une clé très sollicitée, comme la date du jour, reçoit un suffixe, `2026-11-21#7`, pour répartir les écritures), le **GSI clairsemé (sparse)** (seuls les éléments qui ont l'attribut sont indexés : « commandes ouvertes »), le **TTL** pour une expiration gratuite et **DynamoDB Streams** pour transmettre les modifications en aval.

> **Conseil d'examen.** « Interroger une table existante par un attribut qui n'est pas une clé » : GSI ; un LSI ne peut pas être ajouté après la création de la table.

<!-- section: lake-schema | objectives: 2.4.1 -->
## Concevoir des schémas de lac de données avec Lake Formation

Dans un lac de données, le schéma vit dans le **catalogue de données AWS Glue (Data Catalog)**, gouverné par Lake Formation : les bases de données regroupent des tables, et chaque table pointe vers un emplacement S3 avec ses colonnes, son format, son SerDe et ses **colonnes de partition**. Lake Formation accorde l'accès aux bases de données, tables et colonnes.

- Des **zones** sous forme de bases de données et de préfixes distincts : brute (telle que reçue), nettoyée (typée, dédupliquée, en Parquet), organisée (tables métier), chacune avec ses propres autorisations.
- Des **colonnes de partition** qui correspondent aux filtres courants (date, Région), pas des identifiants à forte cardinalité.
- Des **tables Apache Iceberg** pour les mises à jour, suppressions, transactions ACID, le voyage dans le temps (time travel) et l'évolution de schéma ; Athena, Glue, EMR et Redshift les utilisent, et Amazon S3 Tables stocke des tables Iceberg avec une maintenance automatique.
- Des noms de colonnes en minuscules, des types cohérents, et des LF-Tags sur les colonnes sensibles.

> **Piège d'examen.** Les Governed Tables de Lake Formation ont été arrêtées. Des insertions, mises à jour et suppressions transactionnelles sur les tables du lac demandent des tables Apache Iceberg (ou S3 Tables).

<!-- section: schema-evolution | objectives: 2.4.2 -->
## Prendre en charge les changements des caractéristiques des données

Athena applique le schéma de la table à la lecture (schema on read) et ne réécrit jamais les fichiers : les changements qu'une table tolère dépendent de la façon dont le format associe les colonnes.

| Changement | CSV, TSV | JSON, Avro | Parquet (lecture par nom, par défaut) | ORC (lecture par index, par défaut) |
| --- | --- | --- | --- | --- |
| Ajouter une colonne à la fin | Oui | Oui | Oui | Oui |
| Ajouter une colonne au milieu | Non | Oui | Oui | Non |
| Supprimer ou réordonner des colonnes | Non | Oui | Oui | Non |
| Renommer une colonne | Oui | Non | Non | Oui |

Les **tables Iceberg** permettent d'ajouter, supprimer, renommer et réordonner des colonnes, ainsi que des promotions comme int vers bigint ou float vers double, par des modifications **de métadonnées uniquement** : aucun fichier de données n'est réécrit.

```sql
ALTER TABLE lake.orders ADD COLUMNS (coupon_code string);
ALTER TABLE lake.orders CHANGE COLUMN qty quantity int;
ALTER TABLE lake.orders DROP COLUMN legacy_flag;
```

Les **robots d'analyse (crawlers) Glue** appliquent une politique de modification de schéma : mettre à jour la table du catalogue (par défaut), ajouter seulement les nouvelles colonnes, ou ignorer et journaliser (`UpdateBehavior=LOG`) ; les partitions peuvent hériter du schéma de la table pour qu'un fichier atypique ne crée pas une partition divergente.

```bash
aws glue update-crawler \
  --name orders-raw-crawler \
  --schema-change-policy UpdateBehavior=LOG,DeleteBehavior=LOG \
  --configuration '{"Version":1.0,"CrawlerOutput":{"Partitions":{"AddOrUpdateBehavior":"InheritFromTable"}}}'
```

Les **schémas de streaming** sont versionnés dans l'**AWS Glue Schema Registry** (Avro, JSON Schema, Protobuf), intégré à MSK, Kinesis Data Streams, Managed Service for Apache Flink et Lambda. Son mode de compatibilité décide des nouvelles versions acceptées : `BACKWARD` (recommandé : les consommateurs qui utilisent la nouvelle version lisent les données écrites avec la précédente), `FORWARD`, `FULL`, les variantes `_ALL` qui vérifient toutes les versions antérieures, `NONE`, `DISABLED`.

Les changements de **volume et de vélocité** sont absorbés par les modes à la demande (Kinesis Data Streams, DynamoDB), la mise à l'échelle automatique (mise à l'échelle gérée d'EMR, Glue Auto Scaling, Redshift Serverless) et un repartitionnement quand une clé devient asymétrique.

> **Conseil d'examen.** « Les producteurs vont ajouter des champs et les consommateurs existants doivent continuer à fonctionner » : Schema Registry en compatibilité `BACKWARD`, ou un format lu par nom. « Empêcher le robot d'analyse de modifier une table organisée » : `UpdateBehavior=LOG`.

<!-- section: schema-conversion | objectives: 2.4.3 -->
## Convertir des schémas entre moteurs

Une migration hétérogène convertit d'abord le schéma et les objets de code (tables, vues, procédures), puis déplace les données avec AWS DMS.

| Outil | Ce que c'est | Le choisir quand |
| --- | --- | --- |
| **DMS Schema Conversion** | Fonctionnalité gérée et web d'AWS DMS, fondée sur le moteur de SCT : un **profil d'instance** (réseau, chiffrement), des **fournisseurs de données** (connexions source et cible), un **projet de migration** avec les informations d'identification de Secrets Manager ; rapport d'évaluation, conversion, application à la cible ou export du SQL vers S3 ; conversion par IA générative sur certains chemins | Chemins pris en charge : Oracle, SQL Server, Db2, SAP ASE vers Aurora ou RDS PostgreSQL ; Oracle ou SQL Server vers MySQL ; Oracle vers Redshift ; rien à installer |
| **AWS SCT** | Application installée, organisée en projets ; convertit des schémas OLTP et des entrepôts de données (Teradata, Netezza, Greenplum, Vertica, Snowflake, BigQuery, Azure Synapse...) vers Redshift ; gère des **agents d'extraction de données** | Migrations d'entrepôts vers Redshift, chemins absents de DMS Schema Conversion |
| **AWS DMS** | Chargement complet et capture des données modifiées (CDC) | Déplacer les données une fois le schéma créé |

Ordre : rapport d'évaluation (ce qui se convertit automatiquement, ce qui demande un travail manuel), conversion, corrections, application à la cible, chargement complet DMS puis CDC, bascule. Un **pack d'extension** émule les fonctionnalités de la source absentes de la cible.

> **Piège d'examen.** AWS DMS migre les données, pas les procédures stockées. « Convertir les packages PL/SQL avant la migration » demande DMS Schema Conversion ou SCT.

<!-- section: data-lineage | objectives: 2.4.4 -->
## Établir le lignage des données

Le lignage (data lineage) enregistre d'où vient un jeu de données, quelles tâches l'ont transformé et qui le consomme.

| Outil | Ce qu'il suit | Comment |
| --- | --- | --- |
| **Amazon SageMaker Catalog** (SageMaker Unified Studio) | Ressources du catalogue, leurs sources, transformations et abonnés | Événements compatibles **OpenLineage** : automatiques pour les tâches Visual ETL (Glue 5.0 ou ultérieur, DataFrames uniquement) ; paramètres Spark pour les blocs-notes Glue et EMR ; option « Import data lineage » sur les connexions Glue (Lakehouse) et Redshift (lignage Redshift lu chaque jour dans les tables système) ; API pour les autres outils OpenLineage |
| **SageMaker ML Lineage Tracking** | Étapes d'un flux de travail ML, de la préparation des données au déploiement | Composants d'essai (tâches de traitement, d'entraînement, de transformation), artefacts (jeu de données S3, image ECR), actions (déploiement), contextes (point de terminaison), associations (`ContributedTo`, `Produced`, `DerivedFrom`...) ; beaucoup sont créés automatiquement |

> **Conseil d'examen.** « Montrer quelles tables sources et tâches ETL ont produit cette table organisée » : lignage de SageMaker Catalog ; « retrouver le jeu de données qui a servi à entraîner cette version du modèle » : ML Lineage Tracking.

<!-- section: data-optimization | objectives: 2.4.5 -->
## Indexation, partitionnement et compression

| Technique | Où | Bonne pratique |
| --- | --- | --- |
| Partitionnement | Tables sur S3 (Athena, Glue, Redshift Spectrum) | Colonnes des filtres courants (date, Région) ; éviter les nombreuses partitions minuscules |
| Projection de partitions | Athena | Partitions nombreuses ou prévisibles : calculées à partir des propriétés de la table, sans robot d'analyse ni `MSCK REPAIR TABLE` |
| Index de partitions | Catalogue de données Glue | Nombreuses partitions filtrées par égalité ou par plage ; clés de partition `STRING` pour la transmission des filtres (pushdown) |
| Compartimentage (bucketing) | Athena, Spark | Colonne à forte cardinalité recherchée par valeurs uniques (ID utilisateur) |
| Formats en colonnes | Parquet, ORC | Ne lire que les colonnes utiles ; ignorer des groupes de lignes grâce aux statistiques min/max, plus efficace quand les données sont triées sur la colonne filtrée |
| Compression | Snappy, ZSTD, GZIP | Athena facture les octets analysés avant décompression ; les fichiers texte compressés ne sont pas fractionnables, les fichiers en colonnes le sont |
| Taille des fichiers | Lacs de données S3 | Moins de fichiers, plus gros ; compacter les petits fichiers (Glue, EMR, compactage Iceberg) |

```sql
CREATE EXTERNAL TABLE logs.clicks (user_id string, page string, ts timestamp)
PARTITIONED BY (dt string)
STORED AS PARQUET
LOCATION 's3://example-lake/clicks/'
TBLPROPERTIES (
  'projection.enabled' = 'true',
  'projection.dt.type' = 'date',
  'projection.dt.format' = 'yyyy-MM-dd',
  'projection.dt.range' = '2024-01-01,NOW',
  'storage.location.template' = 's3://example-lake/clicks/dt=${dt}/'
);
```

S3 prend en charge au moins 3 500 requêtes d'écriture et 5 500 requêtes de lecture par seconde et par préfixe.

> **Piège d'examen.** Partitionner par une colonne à forte cardinalité comme `user_id` crée des millions de partitions minuscules et ralentit les requêtes. Partitionnez par date ; compartimentez ou triez par la colonne à forte cardinalité.

<!-- section: vectorization | objectives: 2.4.6 -->
## Vectorisation et bases de connaissances Amazon Bedrock

La **vectorisation** transforme un contenu en **plongements (embeddings)** : des tableaux de nombres de longueur fixe produits par un modèle d'embedding, proches les uns des autres quand les sens sont proches. Un magasin de vecteurs les indexe ; une question convertie avec le même modèle retrouve les fragments les plus proches (distance cosinus ou euclidienne). C'est l'étape de récupération de la génération augmentée par récupération (RAG).

Une **base de connaissances Amazon Bedrock (knowledge base)** exécute le pipeline : une **source de données** (par exemple S3) contient les documents ; une **synchronisation** (tâche d'ingestion) les analyse, les découpe en **fragments (chunks)**, appelle le modèle d'embedding et écrit vecteurs et métadonnées dans le magasin de vecteurs (resynchroniser quand les documents changent) ; les applications appellent `Retrieve` (fragments) ou `RetrieveAndGenerate` (fragments transmis à un modèle de fondation).

| Stratégie de découpage | Comportement |
| --- | --- |
| Par défaut | Environ 300 jetons par fragment, limites de phrases respectées |
| Taille fixe | Nombre maximal de jetons et pourcentage de chevauchement choisis |
| Hiérarchique | Petits fragments enfants pour la correspondance, fragments parents plus grands renvoyés |
| Sémantique | Découpe là où le sens change ; utilise un modèle de fondation, coûte plus cher |
| Sans découpage | Un fragment par fichier (contenu déjà découpé) |

Magasins de vecteurs : OpenSearch Serverless, clusters gérés OpenSearch Service, **Amazon S3 Vectors**, Aurora PostgreSQL (pgvector), Neptune Analytics (GraphRAG), Pinecone, Redis Enterprise Cloud, MongoDB Atlas. La dimension de l'index doit correspondre au modèle d'embedding.

| Index | Fonctionnement | Compromis |
| --- | --- | --- |
| **HNSW** | Graphe de voisins à plusieurs couches, parcouru du grossier au fin | Rappel élevé, faible latence, plus de mémoire, pas d'entraînement ; le choix par défaut habituel |
| **IVF** | Vecteurs regroupés autour de centroïdes ; une requête ne parcourt que les groupes les plus proches | Moins de mémoire, entraînement nécessaire sur un échantillon, rappel dépendant du nombre de groupes explorés |

```sql
CREATE INDEX ON kb.chunks USING hnsw (embedding vector_cosine_ops);
```

> **Piège d'examen.** Un nouveau modèle d'embedding impose de recalculer les vecteurs de tous les documents : les vecteurs de deux modèles ne sont pas comparables et les dimensions peuvent différer. Prévoyez un nouvel index et une synchronisation complète.

<!-- section: key-points -->
## Points clés

- Redshift : `KEY` sur la colonne de jointure des grandes tables, `ALL` pour les petites dimensions, `AUTO` par défaut ; clé de tri sur la colonne filtrée ; éviter les clés asymétriques.
- DynamoDB : concevoir à partir des modèles d'accès ; GSI à tout moment, LSI seulement à la création ; répartir les clés très sollicitées ; éléments de 400 Ko.
- Les schémas du lac vivent dans le catalogue de données Glue sous Lake Formation ; Iceberg pour les transactions (les Governed Tables sont arrêtées).
- La tolérance aux changements dépend du format ; les changements Iceberg ne touchent que les métadonnées ; `UpdateBehavior=LOG` fige le schéma d'un robot d'analyse ; Schema Registry `BACKWARD` pour les flux.
- DMS Schema Conversion ou SCT convertit schémas et code ; DMS déplace les données.
- Lignage : SageMaker Catalog pour les données, ML Lineage Tracking pour les modèles.
- Partitionner selon les filtres courants, projeter les partitions, Parquet compressé, pas de petits fichiers.
- Bases de connaissances Bedrock : découper, convertir en vecteurs, stocker, récupérer ; HNSW pour le rappel, IVF pour la mémoire.
