Obtenir des données dans Fabric commence par une connexion à la source, puis par un choix : référencer les données là où elles sont (raccourci), les répliquer en continu (mise en miroir) ou les copier et les transformer (travail de copie, pipeline, flux de données, notebook, flux d'événements). L'élément de destination compte aussi : lakehouse, entrepôt ou eventhouse. Les questions d'examen combinent une source, des compétences et une contrainte (« sans copier les données », « en quasi-temps réel », « T-SQL uniquement », « réduire l'effort de développement ») et attendent une méthode et un magasin.

<!-- section: data-connections | objectives: 2.1.1 -->
## Créer une connexion de données

Une **connexion** stocke l'adresse d'une source et les informations d'identification utilisées pour l'atteindre. Les éléments qui déplacent ou lisent des données (pipelines, travaux de copie, Dataflow Gen2, raccourcis vers un stockage externe) se lient à une connexion au lieu d'embarquer des informations d'identification.

Créez-en une dans **Paramètres > Gérer les connexions et les passerelles > Connexions > Nouveau**, ou directement depuis l'expérience Obtenir des données de l'élément :

| Paramètre | Valeurs et remarques |
| --- | --- |
| Type de passerelle | **Cloud** pour une source accessible depuis internet ; une passerelle de données locale ou de réseau virtuel pour une source privée |
| Type de connexion | Le connecteur : SQL Server, Azure Data Lake Storage Gen2, Amazon S3, etc. |
| Méthode d'authentification | Dépend du connecteur : pour SQL Server, **Basic**, **OAuth2** ou **Service Principal**. Les jetons OAuth2 peuvent expirer pendant les longues requêtes ; les comptes Entra d'un autre locataire ne sont pas pris en charge |
| Niveau de confidentialité | Facultatif ; utilisé par Power Query pour combiner des sources. Sans effet en DirectQuery |
| Utilisation par une passerelle | **This connection can be used with on-premise data gateways and VNet data gateways** (case à cocher). Pour les connexions cloud créées par Dataflow Gen2, elle n'est pas appliquée actuellement : toute connexion cloud partageable passe par une passerelle s'il y en a une |

Chaque connexion a sa **propre liste d'accès**, distincte des rôles d'espace de travail :

| Rôle sur la connexion | Peut |
| --- | --- |
| User | Utiliser la connexion dans ses éléments |
| User with resharing | L'utiliser et la partager avec d'autres |
| Owner | La gérer, ainsi que ses informations d'identification et ses utilisateurs |

- Quiconque peut utiliser une connexion atteint la source **avec les informations d'identification stockées** : ne la partagez qu'avec des utilisateurs de confiance, et stockez-y un compte de service ou un principal de service aux droits restreints.
- Un raccourci vers ADLS Gen2 ou Amazon S3 utilise une connexion cloud ; créer le raccourci **lie** cette connexion, ce qui demande une autorisation sur elle.
- Les utilisateurs ne voient que les connexions auxquelles ils ont accès.

> **Piège d'examen.** Donner à quelqu'un le rôle Contributor sur l'espace de travail ne lui permet pas d'utiliser votre connexion dans un nouveau pipeline. Ajoutez-le comme **User** de la connexion.

<!-- section: discover-data | objectives: 2.1.2 -->
## Découvrir des données avec le catalogue OneLake et le hub Real-Time

Le **catalogue OneLake** (icône OneLake du volet de navigation Fabric) est l'endroit où trouver les éléments existants avant d'en créer de nouveaux. Il est aussi intégré à Microsoft Teams, Excel et Copilot Studio.

| Onglet | Usage |
| --- | --- |
| Explore (Explorer) | Lister et filtrer les éléments ; ouvrir les détails d'un élément (métadonnées, traçabilité, autorisations) à côté de la liste |
| Govern (Gouverner) | Informations de gouvernance et actions recommandées pour les données dont vous êtes propriétaire (étiquettes, approbation, domaines) |
| Secure (Sécuriser) | Une vue unique des rôles d'espace de travail et des rôles de sécurité OneLake sur les éléments ; revoir, créer ou modifier des rôles |

- Explore liste les éléments **auxquels vous avez accès ou dont vous pouvez demander l'accès**, plus les modèles sémantiques marqués **détectables**, même sans accès.
- Filtres : **All items**, **My items**, **Endorsed items** (certifiés d'abord, puis promus), **Favorites** ; sélecteurs de **domaine**, de catégorie de **type d'élément**, de **balises** (si elles sont activées) et d'**espaces de travail**.
- Les colonnes indiquent le type, le propriétaire, la dernière actualisation, l'espace de travail, l'approbation et l'étiquette de confidentialité.
- Développer un élément pour voir ses schémas et tables demande **Read** sur l'élément.

Le **hub Real-Time** est le catalogue, à l'échelle du locataire, des **données de streaming et des événements**, disponible sans configuration. Il montre ce à quoi vous avez accès :

| Section | Liste |
| --- | --- |
| Tous les flux de données et toutes les tables | Les sorties des flux d'événements en cours d'exécution et les tables des bases de données KQL |
| Sources Microsoft | Les ressources de streaming comme Azure Event Hubs et Azure IoT Hub |
| Événements Fabric et événements Azure | Événements des éléments d'espace de travail, événements OneLake, événements de travaux, événements de capacité ; événements de compte de stockage Azure (Blob) |

Depuis le hub, vous **connectez** une source (Event Hubs, Service Bus, IoT Hub, Kafka et Confluent Cloud, Amazon Kinesis, Google Pub/Sub, capture des changements de données d'Azure SQL Database, PostgreSQL, MySQL, Cosmos DB et SQL Server), puis vous la **traitez** dans un flux d'événements, l'**analysez** dans une base de données KQL, ou **agissez** avec une alerte (Activator), par exemple pour exécuter un pipeline quand un fichier arrive dans OneLake.

> **Conseil d'examen.** « Trouver un lakehouse certifié qui contient les données clients » relève du catalogue OneLake. « Trouver le flux de télémétrie IoT qui circule déjà dans le locataire » ou « déclencher une action quand un fichier est créé » relève du hub Real-Time.

<!-- section: ingest-or-access | objectives: 2.1.3 -->
## Ingérer des données ou y accéder

| Besoin | Méthode |
| --- | --- |
| Utiliser des données d'ADLS Gen2, S3, Google Cloud Storage, Dataverse ou d'un autre élément Fabric **sans les copier** | Raccourci OneLake |
| Garder une base opérationnelle (Azure SQL, SQL Server, Cosmos DB, Snowflake, PostgreSQL...) répliquée en quasi-temps réel, sans ETL à construire | Mise en miroir |
| Copier des données avec des chargements incrémentiels ou CDC depuis un assistant, sans pipeline à concevoir | Travail de copie (Copy job), qui peut aussi s'exécuter comme activité de travail de copie dans un pipeline |
| Déplacer de gros volumes selon une planification, avec orchestration et flux de contrôle | Pipeline avec une activité de copie |
| Nettoyer, remodeler et fusionner des données avec Power Query, en low code | Dataflow Gen2 |
| Transformation complexe en code, à grande échelle (PySpark, Spark SQL) | Notebook |
| Ingérer des événements en continu (Event Hubs, Kafka, flux CDC) | Flux d'événements (eventstream) |
| Charger des fichiers d'un compte de stockage dans une table d'entrepôt en T-SQL | `COPY INTO` dans l'entrepôt |

Les **raccourcis** se comportent comme des liens symboliques : les données restent dans la cible.

- Dans le dossier **Tables** d'un lakehouse, un raccourci doit être au **premier niveau** et pointer vers des données **Delta** pour apparaître comme une table. Dans **Files**, n'importe quel niveau et n'importe quel format.
- Cibles : d'autres éléments Fabric (lakehouse, entrepôt, base de données KQL, base de données en miroir, base de données SQL, modèle sémantique) et des stockages externes (ADLS Gen2, Stockage Blob Azure, Amazon S3 et compatibles S3, Google Cloud Storage, Dataverse, OneDrive et SharePoint, Iceberg, local par une passerelle).
- Les raccourcis internes utilisent l'**identité de l'appelant** (passthrough) : l'utilisateur doit avoir accès en lecture à la cible. Exception : par Direct Lake sur SQL, ou en T-SQL en mode identité déléguée, c'est l'identité du propriétaire de l'élément appelant qui atteint la cible ; utilisez Direct Lake sur OneLake ou T-SQL en mode identité de l'utilisateur pour vérifier l'accès propre de l'utilisateur. Les raccourcis externes utilisent les informations d'identification de la **connexion**.
- **Supprimer un raccourci** laisse la cible intacte ; supprimer un fichier **à l'intérieur** d'un raccourci le supprime dans la cible.
- La mise en cache des raccourcis S3, compatibles S3, Google Cloud Storage et par passerelle réduit les sorties de données : 1 à 28 jours, les fichiers de plus de 1 Go ne sont pas mis en cache.
- Un entrepôt peut être la **cible** d'un raccourci, mais les raccourcis se créent dans les lakehouses et les bases de données KQL. Un eventhouse peut aussi contenir un **raccourci de base de données**, qui partage tout ou partie des sous-éléments d'une autre base de données du même locataire et de la même région.

La **mise en miroir** crée un élément base de données en miroir doté d'un point de terminaison d'analytique SQL, et réplique la source dans des tables Delta de OneLake :

| Type | Ce qui est répliqué | Exemples |
| --- | --- | --- |
| Mise en miroir de base de données | Données et schéma, modifications publiées jusqu'à toutes les 15 secondes | Azure SQL Database, SQL Server, Azure SQL Managed Instance, Azure Cosmos DB, Snowflake, Oracle, Google BigQuery, PostgreSQL |
| Mise en miroir des métadonnées | Seulement le catalogue ; les données sont lues par des raccourcis | Unity Catalog d'Azure Databricks |
| Mise en miroir ouverte | Modifications écrites par votre propre application via les API de mise en miroir ouverte | N'importe quelle source |

Le calcul de réplication est gratuit, et chaque capacité inclut **1 To de stockage de mise en miroir par unité de capacité** (64 To pour une F64). Les requêtes sur les données en miroir sont facturées normalement, et la réplication s'arrête quand la capacité est suspendue.

> **Piège d'examen.** « Sans copier les données » exclut la mise en miroir et tous les pipelines : seul un raccourci (ou la mise en miroir des métadonnées pour un catalogue Databricks) laisse les données à la source. « En quasi-temps réel depuis une base Azure SQL, sans code » désigne la mise en miroir, pas une copie planifiée.

<!-- section: choose-data-store | objectives: 2.1.4 -->
## Choisir un magasin de données

| Critère | Lakehouse | Entrepôt | Eventhouse | Base de données SQL |
| --- | --- | --- | --- | --- |
| Données | Fichiers structurés, semi-structurés, non structurés et tables Delta | Structurées, schéma en étoile | Événements de streaming, JSON, journaux, séries chronologiques | Relationnelles, normalisées, opérationnelles |
| Écriture avec | Spark (PySpark, Spark SQL, Scala, R), flux de données, pipelines | **T-SQL** (DML, `COPY INTO`, CTAS), pipelines, flux de données | Flux d'événements, ingestion KQL | T-SQL, applications |
| Lecture avec | Spark ; T-SQL en **lecture seule** par le point de terminaison d'analytique SQL | T-SQL | **KQL**, T-SQL | T-SQL |
| Transactions | Transactions Delta par table | Transactions T-SQL multitables complètes | Ingestion optimisée pour l'ajout | ACID complet, clés étrangères |
| Profil type | Ingénieur données, scientifique des données | Développeur SQL, développeur BI | Analyste de données en temps réel | Développeur d'applications |
| Delta dans OneLake | Oui | Oui | Sur activation (disponibilité OneLake) | Oui, répliqué automatiquement |

Les règles de décision :

- Une équipe qui connaît T-SQL et a besoin d'`INSERT`, `UPDATE`, `DELETE` et de transactions multitables : **entrepôt**.
- Des utilisateurs PySpark et SQL mélangés, des fichiers de tout format, de la science des données : **lakehouse** ; les utilisateurs SQL le lisent quand même par le point de terminaison d'analytique SQL.
- Des milliards de lignes de télémétrie, des analyses de séries chronologiques et géospatiales, des requêtes rapides sur des données fraîches : **eventhouse**.
- Une application opérationnelle à forte concurrence : **base de données SQL**, avec son point de terminaison d'analytique SQL pour le reporting.
- Tous stockent des tables Delta dans OneLake (sauf l'eventhouse tant que la disponibilité OneLake n'est pas activée), donc un magasin peut en lire un autre par des raccourcis ou par des **noms en trois parties** en T-SQL :

```text
SELECT c.CustomerName, SUM(o.Amount) AS Total
FROM SalesWarehouse.dbo.DimCustomer AS c
JOIN SalesLakehouse.dbo.Orders AS o ON o.CustomerKey = c.CustomerKey
GROUP BY c.CustomerName;
```

> **Piège d'examen.** Le point de terminaison d'analytique SQL d'un lakehouse est en lecture seule. Un besoin de mettre à jour des lignes en T-SQL exclut le lakehouse, sauf si la mise à jour s'exécute dans Spark.

<!-- section: onelake-integration | objectives: 2.1.5 -->
## L'intégration de OneLake pour Eventhouse et les modèles sémantiques

La **disponibilité OneLake d'Eventhouse** écrit les tables d'une base de données KQL sous forme de fichiers **Delta Parquet** dans OneLake, une copie logique **sans coût de stockage supplémentaire**. Les lakehouses (par un raccourci), les entrepôts, les notebooks et les modèles sémantiques Direct Lake lisent alors les mêmes données.

- Activez-la par **base de données** (nouvelles tables ; cochez **Apply to existing tables** pour le remplissage de l'historique) ou par **table** : volet de détails, section **OneLake**, **Availability > Enabled**.
- Les écritures sont regroupées en gros fichiers Parquet : par défaut jusqu'à **3 heures** de délai (`TargetLatencyInMinutes`, de 5 minutes à 3 heures). Des délais plus courts créent de petits fichiers, et la copie OneLake est en lecture seule et ne peut pas être optimisée.
- La **stratégie de rétention** de la base supprime aussi les données de OneLake. Désactiver la disponibilité supprime de façon réversible la copie OneLake ; la réactiver la restaure.
- Tant qu'elle est activée, vous ne pouvez ni renommer une table, ni changer le type d'une colonne, ni appliquer la sécurité au niveau des lignes à la table, ni supprimer, tronquer ou purger des données.

```kusto
.alter-merge table Telemetry policy mirroring dataformat=parquet with (IsEnabled=true, TargetLatencyInMinutes=60);
.show table Telemetry mirroring operations
```

L'**intégration de OneLake pour les modèles sémantiques** exporte les **tables en mode Import** d'un modèle sémantique vers des tables Delta de OneLake à chaque actualisation, pour que Spark, T-SQL ou d'autres outils lisent exactement les données des rapports.

- Elle exige un espace de travail sur une capacité **Fabric F ou Premium P** (ni Pro, ni PPU, ni Embedded) et les paramètres de locataire **Users can create Fabric items** et **Semantic models can export data to OneLake** (tous deux activés par défaut).
- Activez-la dans les paramètres du modèle sémantique : **Intégration OneLake > Activé > Appliquer**. Les tables apparaissent après la **prochaine actualisation** et reflètent la dernière actualisation réussie.
- Non exportés : les mesures, les tables DirectQuery, les tables hybrides, les tables de groupes de calcul et les tables d'agrégation gérées par le système.
- Les données arrivent dans le dossier de l'espace de travail qui se termine par **.SemanticModel** ; consommez-les par un **raccourci OneLake** depuis un lakehouse (Nouveau raccourci > Microsoft OneLake > choisir le modèle et ses tables).
- Si le modèle a des rôles RLS ou OLS, seuls les utilisateurs disposant de l'accès en **écriture** peuvent lire les tables exportées.
- Avec XMLA en lecture-écriture, une commande TMSL `export` la déclenche à la demande :

```json
{
  "export": {
    "layout": "delta",
    "type": "full",
    "objects": [ { "database": "Sales Model" } ]
  }
}
```

> **Piège d'examen.** L'intégration de OneLake exporte uniquement les tables Import. Un modèle Direct Lake ou DirectQuery lit déjà des données qui sont dans OneLake ou à la source : il n'y a rien à exporter.

<!-- section: key-points -->
## Points clés

- Les connexions contiennent les informations d'identification et ont leurs propres rôles User, User with resharing et Owner.
- Le catalogue OneLake trouve les éléments (Explore, Govern, Secure) ; le hub Real-Time trouve les flux et les événements et connecte les sources de streaming.
- Raccourci = pas de copie ; mise en miroir = réplique continue d'une base opérationnelle ; travail de copie = assistant avec copie incrémentielle ; pipeline = copie en masse orchestrée ; Dataflow Gen2 = Power Query ; notebook = code Spark ; flux d'événements = événements.
- Entrepôt pour les écritures T-SQL et les transactions, lakehouse pour Spark et les fichiers, eventhouse pour le streaming et KQL, base de données SQL pour les applications opérationnelles.
- Disponibilité OneLake d'Eventhouse : par base ou par table, jusqu'à 3 heures de latence par défaut, bloque les renommages et les purges.
- Intégration de OneLake des modèles sémantiques : tables Import uniquement, après actualisation, capacité F ou P, lecture par des raccourcis.
