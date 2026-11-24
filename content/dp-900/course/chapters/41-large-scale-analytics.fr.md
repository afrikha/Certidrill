L'analytique à grande échelle transforme les données de nombreux systèmes opérationnels en rapports et en modèles. L'examen vous demande de situer une étape dans l'architecture (ingérer, stocker, modéliser, visualiser), de distinguer un entrepôt de données d'un lac de données et d'un lakehouse, et de reconnaître ce que fournissent Microsoft Fabric et Azure Databricks.

<!-- section: analytics-architecture | objectives: 4.1.1 -->
## Les éléments d'une solution d'analytique à grande échelle

| Élément | Ce qui s'y passe |
| --- | --- |
| **Ingestion et traitement des données** | Les données de magasins transactionnels, de fichiers et de flux en temps réel sont chargées dans un lac de données ou un entrepôt de données, puis nettoyées, filtrées et restructurées pour l'analyse |
| **Magasin de données analytique** | Les données préparées sont conservées dans un entrepôt de données, un lac de données ou un lakehouse |
| **Modèle de données analytique** | Un modèle sémantique définit des tables, des relations, des hiérarchies et des mesures au-dessus du magasin ; les mesures sont écrites en DAX et calculées au moment de la requête. Dans Microsoft Fabric, le mode **Direct Lake** charge les tables Delta de OneLake sans importer de copie des données dans le modèle |
| **Visualisation des données** | Les analystes créent des rapports et des tableaux de bord qui montrent des tendances, des comparaisons et des indicateurs de performance clés (KPI) |

Des assistants en langage naturel comme Copilot dans Microsoft Fabric ou Genie dans Azure Databricks permettent d'interroger les données sans écrire de requêtes.

<!-- section: ingestion-processing | objectives: 4.1.1 -->
## Ingestion et traitement des données

Deux ordres sont possibles pour préparer les données :

| Processus | Ordre | Où s'exécute la transformation |
| --- | --- | --- |
| **ETL** : extraction, transformation, chargement | Les données sont transformées **avant** d'être chargées dans le magasin analytique | Dans le pipeline |
| **ELT** : extraction, chargement, transformation | Les données sont copiées telles quelles dans le magasin, **puis** transformées | Dans le magasin analytique |

- Le traitement est confié à des moteurs **distribués** comme Apache Spark, qui répartissent le travail entre les nœuds d'un cluster pour traiter de gros volumes en parallèle.
- L'ingestion couvre à la fois le traitement **par lots** de données statiques et le traitement **en temps réel** de données de streaming.
- Un **pipeline** orchestre le travail : il enchaîne des **activités** (copier des données, exécuter un notebook, appeler une procédure stockée) qui s'exécutent en séquence ou en parallèle.

| Outil | Rôle |
| --- | --- |
| **Pipelines** de Fabric Data Factory | Orchestrer des déplacements et des transformations de données en plusieurs étapes |
| **Dataflows Gen2** de Fabric Data Factory | Transformations visuelles, avec peu de code, grâce à Power Query |
| **Raccourcis OneLake** | Référencer des données qui restent dans un stockage externe, sans les copier |
| **Mise en miroir** dans Fabric | Répliquer en continu une base de données opérationnelle (Azure SQL Database, Azure Cosmos DB et d'autres) dans OneLake, sans pipeline à créer |
| **Eventstream** dans Fabric | Ingérer des flux en temps réel |
| **Notebooks** (Fabric ou Azure Databricks) | Ingestion et transformation par le code, avec Spark |
| **Pipelines Lakeflow** dans Azure Databricks | Pipelines déclaratifs qui chargent des tables Delta Lake de manière incrémentielle, par lots ou en streaming |
| **Azure Data Factory** | Service Azure autonome pour des pipelines en dehors de Fabric, par exemple avec des sources locales dans un environnement hybride ; les connexions s'appellent des services liés |

> **Piège d'examen.** ETL et ELT contiennent les trois mêmes étapes. Seul l'ordre diffère : avec ELT, les données brutes arrivent d'abord dans le magasin, un schéma courant avec un lac de données.

<!-- section: analytical-stores | objectives: 4.1.2 -->
## Magasins de données analytiques

| | Entrepôt de données | Lac de données | Data lakehouse |
| --- | --- | --- | --- |
| **Nature** | Base de données relationnelle dont le schéma est optimisé pour l'analytique | Magasin de fichiers sur un système de fichiers distribué | Fichiers d'un lac de données, exposés sous forme de tables |
| **Données** | Structurées | Structurées, semi-structurées et non structurées | Tous les types, avec des tables pour la partie structurée |
| **Schéma** | Défini avant le chargement et imposé | Appliqué à la lecture des données : **schéma sur lecture (schema-on-read)** | Imposé sur les tables par un format comme Delta Lake |
| **Interrogation** | SQL | Moteurs comme Apache Spark | SQL et Spark |
| **À choisir quand** | Les données entrent dans un schéma structuré de tables et les analystes utilisent SQL | Vous conservez des données brutes variées sans imposer de schéma à l'écriture | Vous voulez la souplesse du lac et les tables SQL d'un entrepôt sur une seule copie des données |

Dans un entrepôt de données, les tables suivent généralement un **schéma en étoile** :

- Une **table de faits** contient les valeurs numériques à agréger, une ligne par événement (une ligne de commande avec la quantité et le chiffre d'affaires).
- Les **tables de dimension** contiennent les entités selon lesquelles vous agrégez (client, produit, magasin, temps).
- Un **schéma en flocon de neige** ajoute des tables liées aux dimensions pour représenter des hiérarchies (le produit, puis la catégorie de produits).

**Delta Lake** est le format open source de lakehouse utilisé par Microsoft Fabric et Azure Databricks. Il ajoute des capacités relationnelles aux fichiers Parquet : des tables avec application du schéma et cohérence transactionnelle, pour des données par lots et en streaming.

> **Conseil d'examen.** « Relationnel, structuré, SQL » désigne un entrepôt de données. « Fichiers, tout format, schéma appliqué à la lecture » désigne un lac de données. « Les deux à la fois » ou « tables Delta » désigne un lakehouse.

<!-- section: analytics-services | objectives: 4.1.3 -->
## Microsoft Fabric et Azure Databricks

Les deux plateformes couvrent toute l'architecture, avec des approches différentes.

**Microsoft Fabric** est une plateforme d'analytique unifiée, fournie en tant que logiciel en tant que service (SaaS). Toutes ses charges de travail partagent **OneLake**, un lac de données unique pour tout le locataire : les données ne sont pas copiées d'un service à l'autre.

| Composant de Fabric | Rôle |
| --- | --- |
| **Lakehouse** | Tables Delta Lake et fichiers dans OneLake, traités avec des notebooks Spark et interrogés par un point de terminaison d'analytique SQL |
| **Warehouse** | Entrepôt de données relationnel entièrement managé, interrogé en T-SQL |
| **Data Factory** | Pipelines et Dataflows Gen2 pour l'ingestion et la transformation |
| **Real-Time Intelligence** | Analytique sur les données de streaming, les journaux et la télémétrie |
| **Power BI** | Modèles sémantiques, rapports et tableaux de bord |

**Azure Databricks** est une plateforme d'analytique cloud bâtie sur **Apache Spark**, pour l'ingénierie des données, la science des données et l'analytique SQL à grande échelle. Elle s'exécute comme un service managé dans votre abonnement Azure et utilise Delta Lake comme format natif.

| Composant d'Azure Databricks | Rôle |
| --- | --- |
| **Notebooks** | Code collaboratif en Python, SQL, Scala et R pour les pipelines, l'exploration et le machine learning |
| **Databricks SQL** | Entrepôts SQL qui exécutent des requêtes analytiques sur des tables Delta pour les rapports et les outils décisionnels |
| **Unity Catalog** | Gouvernance des données et des ressources d'IA : contrôle d'accès, traçabilité, découverte |

| Exigence | Réponse |
| --- | --- |
| Une seule plateforme SaaS de l'ingestion aux rapports Power BI, avec un lac de données partagé | Microsoft Fabric |
| Une plateforme Spark orientée code, des compétences Databricks existantes, la portabilité entre clouds | Azure Databricks |
| Un entrepôt relationnel interrogé en T-SQL, avec une application stricte du schéma et de nombreux utilisateurs simultanés | Warehouse dans Microsoft Fabric |
| Des données mixtes ou semi-structurées, des notebooks Spark, des flux de travail de machine learning | Lakehouse dans Microsoft Fabric |

Les deux plateformes peuvent être combinées : un processus ELT copie les données dans le lac de données, un notebook Azure Databricks traite le grand volume, puis les résultats sont chargés dans les tables d'un Warehouse Fabric.

<!-- section: key-points -->
## Points clés

- Architecture : ingestion et traitement, magasin de données analytique, modèle de données analytique, visualisation.
- ETL transforme avant de charger ; ELT charge, puis transforme dans le magasin.
- Les pipelines enchaînent des activités ; Spark traite de gros volumes en parallèle sur un cluster.
- Entrepôt de données : relationnel, structuré, SQL, schéma en étoile de tables de faits et de dimension.
- Lac de données : fichiers de tout type, schéma sur lecture. Lakehouse : fichiers du lac exposés sous forme de tables, avec Delta Lake.
- Microsoft Fabric : plateforme SaaS unifiée sur OneLake (Lakehouse, Warehouse, Data Factory, Real-Time Intelligence, Power BI).
- Azure Databricks : plateforme Apache Spark avec notebooks, Databricks SQL et Unity Catalog.
