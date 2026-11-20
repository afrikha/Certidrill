Les questions d'analytique commencent une fois les données arrivées dans AWS : les stocker dans un lac de données, les cataloguer, les sécuriser, les transformer dans un format efficace, puis les interroger et les visualiser. La réponse est en général l'option gérée et sans serveur qui satisfait l'exigence avec le moins de charge opérationnelle, sauf si le scénario exige un framework précis, de très grands clusters ou un contrôle fin.

<!-- section: analytics-services | objectives: 3.5.1 -->
## Services d'analytique et de visualisation

| Service | Ce qu'il fait | Le choisir quand |
| --- | --- | --- |
| Amazon Athena | SQL interactif sans serveur directement sur les données de S3, à partir des tables du catalogue de données AWS Glue ; exécute aussi Apache Spark ; vous payez les requêtes exécutées | SQL ad hoc sur S3 sans infrastructure, analyse de journaux, interrogation d'un lac de données |
| AWS Lake Formation | Gouvernance centralisée d'un lac de données : autorisations fines sur les bases de données, tables, colonnes, lignes et cellules du catalogue, appliquées dans Athena, Redshift Spectrum, EMR, Glue et Quick | Plusieurs équipes ou comptes partagent un lac de données avec un accès par colonne, par ligne ou par balise |
| Amazon Quick | Service doté d'IA dont la fonctionnalité Quick Sight (anciennement Amazon QuickSight) fournit des tableaux de bord BI, l'analytique intégrée et le moteur en mémoire SPICE | Les utilisateurs métier ont besoin de tableaux de bord interactifs sur Athena, Redshift ou d'autres sources |
| Amazon Redshift | Entrepôt de données (provisionné ou Serverless) ; Redshift Spectrum interroge les données de S3 | SQL complexe avec de nombreuses jointures sur de grands volumes structurés, consolidés depuis de nombreuses sources et conservés longtemps |
| Amazon EMR | Frameworks big data gérés (Spark, Hadoop, Hive, Presto, HBase, Flink) | Code personnalisé sur de très grands jeux de données, tâches Hadoop ou Spark existantes |
| AWS Glue | Intégration de données sans serveur : catalogue de données, robots d'analyse (crawlers), tâches ETL Spark | Cataloguer et transformer des données sans gérer de clusters |
| Amazon OpenSearch Service | Recherche et analytique de journaux avec OpenSearch Dashboards | Recherche en texte intégral, exploration de journaux et de parcours de navigation |
| AWS Data Exchange | Abonnement à des jeux de données tiers | Flux de données externes vers le lac |

> **Piège d'examen.** Athena sert aux requêtes interactives et ad hoc ; Redshift sert à un entrepôt avec des requêtes lourdes, répétées et riches en jointures. « Interroger de temps en temps des fichiers CSV de S3 en SQL, avec le moins de charge opérationnelle » : Athena, pas Redshift ni un cluster EMR.

<!-- section: glue-transformation | objectives: 3.5.4 -->
## Transformation des données avec AWS Glue

| Composant | Rôle |
| --- | --- |
| Catalogue de données (Data Catalog) | Magasin central de métadonnées (bases de données, tables, schémas, partitions) utilisé par Athena, EMR, Redshift Spectrum et les tâches Glue |
| Robots d'analyse (crawlers) | Parcourent S3, des sources JDBC et autres, déduisent les schémas et créent ou mettent à jour les tables et partitions du catalogue ; à la demande ou planifiés |
| Tâches ETL | Tâches Apache Spark sans serveur (script écrit ou généré par l'éditeur visuel d'AWS Glue Studio) ; ETL par lots ou en streaming |
| Signets de tâche (job bookmarks) | Mémorisent les données déjà traitées pour qu'une tâche récurrente ne lise que les nouveaux fichiers |
| Déclencheurs et flux de travail | Lancent robots et tâches selon une planification, à la demande ou sur un événement, et les enchaînent |
| AWS Glue DataBrew | Préparation visuelle des données, sans code, pour les analystes |
| FindMatches | Transformation par apprentissage automatique qui trouve les enregistrements en double |

Choisir un moteur de transformation :

| Exigence | Réponse |
| --- | --- |
| ETL sans serveur sur des données S3, Spark sans clusters | Tâche AWS Glue |
| Les analystes nettoient les données visuellement, sans code | AWS Glue DataBrew |
| Petite transformation par fichier à l'arrivée d'un objet | Lambda sur un événement S3 (des minutes, pas des heures, par appel) |
| Code Spark ou Hadoop existant avec des versions ou des réglages précis | Amazon EMR |
| Remodelage en SQL seulement de tables déjà cataloguées | `CREATE TABLE AS SELECT` dans Athena |
| Transformation continue d'un flux | ETL en streaming de Glue ou Managed Service for Apache Flink |

> **Conseil d'examen.** « Ne traiter que les fichiers ajoutés depuis la dernière exécution » : tâche Glue avec signets de tâche activés ; « tenir le catalogue à jour quand de nouvelles partitions arrivent » : robot d'analyse planifié, ou projection de partitions dans Athena.

<!-- section: data-lake-security | objectives: 3.5.8 -->
## Créer et sécuriser des lacs de données

Un lac de données sur AWS, c'est S3 (stockage), le catalogue de données Glue (métadonnées) et Lake Formation (gouvernance) :

1. Créez des compartiments S3 ou des préfixes par zone : brute (telle qu'ingérée), traitée (nettoyée, en Parquet), organisée (prête pour le métier).
2. Enregistrez les emplacements S3 dans Lake Formation et désignez les administrateurs du lac de données.
3. Cataloguez les données avec des robots d'analyse ou des tâches Glue.
4. Accordez les autorisations avec Lake Formation plutôt qu'avec des politiques IAM par compartiment.
5. Interrogez avec Athena, Redshift Spectrum, EMR ou Quick ; chaque moteur applique les mêmes autorisations.

Autorisations Lake Formation :

| Fonctionnalité | Usage |
| --- | --- |
| Octroi et révocation | Autorisations sur les bases de données, tables et colonnes, comme dans une base relationnelle |
| Filtres de données | Sécurité au niveau des lignes et des cellules, par exemple masquer les colonnes de données personnelles et les lignes des autres pays |
| LF-Tags | Contrôle d'accès par balises : baliser bases, tables ou colonnes (`confidentiality=high`) et accorder sur les balises ; s'adapte à des milliers de ressources |
| Partage entre comptes | Partager des ressources du catalogue avec d'autres comptes, unités d'organisation ou principaux |
| Mode d'accès hybride | Adopter progressivement les autorisations Lake Formation pendant que l'accès existant basé sur IAM continue de fonctionner |

Sécurité du stockage du lac : S3 Block Public Access, chiffrement par défaut SSE-KMS (les politiques de clé contrôlent qui peut déchiffrer), politiques de compartiment qui exigent TLS et des points de terminaison de VPC, gestion des versions, événements de données CloudTrail pour l'audit et Amazon Macie pour découvrir les données sensibles des compartiments.

> **Piège d'examen.** Les politiques IAM et les politiques de compartiment agissent au niveau des objets et des préfixes : elles ne peuvent pas masquer une colonne d'une table. « Les analystes peuvent interroger la table mais ne doivent pas voir la colonne `ssn` » : autorisation de colonne ou filtre de données Lake Formation.

<!-- section: visualization | objectives: 3.5.11 -->
## Stratégies de visualisation

| Exigence | Réponse |
| --- | --- |
| Tableaux de bord métier interactifs partagés avec de nombreux utilisateurs, intégrés dans une application | Quick Sight dans Amazon Quick |
| Tableaux de bord rapides sans interroger la source à chaque fois | Importer les données dans SPICE (moteur en mémoire), actualisé selon une planification ; réutilisé sans frais de requête supplémentaires à la source |
| Données toujours à jour depuis la source | Requête directe vers Athena, Redshift ou une base de données |
| Exploration de journaux, de recherches et de parcours de navigation | OpenSearch Dashboards sur Amazon OpenSearch Service |
| Métriques opérationnelles de Prometheus, CloudWatch et d'autres sources | Amazon Managed Grafana |
| Métriques de ressources et d'applications pour les opérateurs | Tableaux de bord CloudWatch |

La capacité SPICE est allouée par Région et partagée par les utilisateurs du compte dans cette Région. Une chaîne d'analytique sans serveur courante est S3 (Parquet) → catalogue de données Glue → Athena → Quick Sight.

> **Conseil d'examen.** Quand la source facture à la requête (analyses d'Athena) et que de nombreux utilisateurs ouvrent le même tableau de bord, SPICE réduit à la fois la latence et le coût : la source n'est interrogée qu'à la création ou à l'actualisation du jeu de données.

<!-- section: processing-compute | objectives: 3.5.12 -->
## Options de calcul pour le traitement des données

| Option | Caractéristiques | Convient à |
| --- | --- | --- |
| Amazon EMR on EC2 | Cluster de nœuds primaire, principaux (core) et de tâches (task) ; vous choisissez les types d'instances et les versions des frameworks | Charges Spark, Hive, HBase, Presto volumineuses, de longue durée ou très optimisées |
| Amazon EMR on EKS | Tâches EMR sur un cluster Amazon EKS existant | Équipes qui exploitent déjà Kubernetes et veulent une infrastructure partagée |
| Amazon EMR Serverless | Applications Spark et Hive sans cluster à configurer ; ressources allouées par tâche puis libérées ; capacité pré-initialisée facultative pour un démarrage rapide | Tâches intermittentes, aucune exploitation de cluster |
| AWS Glue | ETL Spark sans serveur intégré au catalogue de données | Pipelines ETL pilotés par le catalogue |
| Athena | SQL et Spark sans serveur | Transformation et analyse en SQL |
| Amazon Redshift | Entrepôt SQL massivement parallèle | Transformations dans l'entrepôt (ELT) |
| AWS Lambda | Fonctions pilotées par les événements, jusqu'à 30 minutes sur la page actuelle des quotas Lambda (des pages plus anciennes et la FAQ indiquent encore 15 minutes ; 90 minutes pour certains appels de Lambda Managed Instances) | Petits fichiers, traitement par événement |
| AWS Batch | Planification de lots gérée sur EC2 ou Fargate, y compris Spot | Tâches par lots conteneurisées qui ne sont pas du Spark |

Détails d'EMR on EC2 :

- Les **nœuds principaux (core)** exécutent des tâches et stockent les données HDFS ; les **nœuds de tâches (task)** ne font qu'exécuter, ce sont donc eux qui peuvent utiliser des **Spot Instances** sans risque. EMR garde pour cette raison les maîtres d'application YARN sur les nœuds principaux.
- **HDFS est éphémère** : il disparaît avec le cluster. Gardez les entrées et sorties dans S3 (EMRFS ou le connecteur S3A) et utilisez HDFS pour les données intermédiaires.
- Les **clusters transitoires** démarrent, exécutent leurs étapes et s'arrêtent, vous ne payez donc que pendant le traitement ; les clusters de longue durée conviennent à un usage interactif ou continu. La mise à l'échelle gérée d'EMR ajuste le cluster à la charge.

> **Piège d'examen.** Exécuter les nœuds principaux en Spot expose à une perte de données HDFS quand les instances sont récupérées. « Traitement EMR au coût le plus bas et tolérant aux pannes » : nœuds primaire et principaux à la demande (ou réservés), nœuds de tâches en Spot, données dans S3.

<!-- section: format-conversion | objectives: 3.5.14 -->
## Changer le format des données

Les formats texte orientés lignes (CSV, JSON) sont simples à produire mais coûteux à interroger : chaque requête lit toutes les colonnes. Les formats en colonnes (Apache Parquet, Apache ORC) stockent les données par colonne, se compressent bien et permettent aux moteurs de ne lire que les colonnes et groupes de lignes nécessaires : Athena analyse moins d'octets et coûte moins cher.

| Méthode | Quand |
| --- | --- |
| Tâche ETL AWS Glue (Spark) qui lit la table CSV du catalogue et écrit du Parquet partitionné par date | Conversions récurrentes et volumineuses, avec signets de tâche pour les nouveaux fichiers |
| `CREATE TABLE AS SELECT` (CTAS) ou `INSERT INTO` dans Athena | Conversion en SQL seulement, sans tâche à gérer |
| Conversion du format des enregistrements de Data Firehose | JSON en streaming converti en Parquet ou ORC avant d'arriver dans S3 (le CSV exige d'abord une transformation Lambda en JSON) |
| Tâche Spark sur EMR | Conversions très volumineuses ou personnalisées dans un environnement EMR existant |

```text
CREATE TABLE curated.sales_parquet
WITH (
  format = 'PARQUET',
  write_compression = 'SNAPPY',
  external_location = 's3://example-lake-curated/sales/',
  partitioned_by = ARRAY['sale_date']
) AS
SELECT order_id, store_id, amount, sale_date
FROM raw.sales_csv;
```

Associez le format au **partitionnement** (préfixes comme `sale_date=2026-11-19/`, utilisés dans les clauses `WHERE`), à la **compression** (Snappy, ZSTD, GZIP) et à des fichiers suffisamment gros (évitez des millions de petits fichiers). La projection de partitions permet à Athena de calculer les partitions à partir des propriétés de la table au lieu de les charger dans le catalogue.

> **Conseil d'examen.** « Réduire le coût des requêtes Athena et améliorer les performances » sans changer les résultats : convertir en Parquet compressé et partitionner selon la colonne utilisée dans les filtres.

<!-- section: key-points -->
## Points clés

- Athena : SQL sans serveur sur S3, paiement à la requête. Redshift : entrepôt pour les jointures lourdes. EMR : frameworks et code personnalisé. Glue : ETL sans serveur et catalogue de données.
- Lake Formation ajoute des autorisations par base, table, colonne, ligne et cellule, les LF-Tags et le partage entre comptes au-dessus de S3 et du catalogue.
- Quick Sight (Amazon Quick) pour les tableaux de bord BI ; SPICE pour des données rapides et réutilisables ; OpenSearch Dashboards pour les journaux ; Managed Grafana pour les métriques opérationnelles.
- EMR : Spot sur les nœuds de tâches, données dans S3, clusters transitoires ; EMR Serverless pour ne gérer aucun cluster.
- CSV vers Parquet avec Glue, CTAS dans Athena ou Firehose (entrée JSON) ; partitionnez et compressez.
