La base de données la moins chère est celle dont le modèle de données, le moteur et le modèle de capacité correspondent à la charge de travail : vous ne payez ni capacité inactive, ni licences et fonctionnalités inutilisées. Les questions d'examen donnent un modèle d'accès, une forme de données, un profil de trafic ou une contrainte de licence, et demandent le type de base, le service, le moteur, le mode de capacité ou l'engagement qui y répond de la façon la plus rentable.

<!-- section: database-types | objectives: 4.3.9, 4.3.13 -->
## Types de bases de données et services AWS

| Modèle de données | Service | À choisir pour |
| --- | --- | --- |
| Relationnel (SQL, jointures, transactions) | Amazon RDS (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2), Amazon Aurora (compatible MySQL et PostgreSQL) | Données structurées avec relations, requêtes ad hoc, applications SQL existantes |
| Clé-valeur et document, sans serveur | Amazon DynamoDB | Modèles d'accès connus par clé, toute échelle, latence de quelques millisecondes, trafic variable |
| Document (compatible MongoDB) | Amazon DocumentDB | Documents JSON et pilotes MongoDB |
| Colonnes larges (compatible Apache Cassandra), sans serveur | Amazon Keyspaces | Charges Cassandra sans gestion de clusters |
| Graphe | Amazon Neptune | Données très connectées : réseaux sociaux, réseaux de fraude, recommandations, graphes de connaissances |
| En mémoire | Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Cache, sessions, classements, lectures en moins d'une milliseconde |
| Séries chronologiques | Amazon Timestream for InfluxDB | Métriques, données IoT et télémétrie indexées par le temps |
| Entrepôt de données en colonnes | Amazon Redshift (RA3 provisionné ou Redshift Serverless) | SQL analytique sur de gros historiques, agrégations, BI |
| Recherche | Amazon OpenSearch Service | Recherche en texte intégral, analyse de journaux |

**Les formats en colonnes font économiser deux fois.** Un stockage en colonnes (Redshift) ou un format de fichier en colonnes (Apache Parquet ou ORC dans S3, interrogé avec Athena ou Redshift Spectrum) ne lit que les colonnes dont la requête a besoin et se compresse bien. Athena facture les données analysées : convertir du CSV en Parquet partitionné réduit directement la facture. Une charge de requêtes analytiques sur une base OLTP orientée lignes (RDS) est une erreur classique de coût et de performances.

**Séries chronologiques.** Timestream for LiveAnalytics n'accepte plus de nouveaux clients (depuis le 20 juin 2025) ; AWS recommande Timestream for InfluxDB pour les nouvelles charges de séries chronologiques. Une table relationnelle avec une colonne d'horodatage convient aux petits volumes, mais devient coûteuse à interroger et à conserver à l'échelle de l'IoT.

> **Piège d'examen.** « Conçu à des fins spécifiques » (purpose-built) est la réponse par défaut quand la forme des données est explicite : les parcours de graphe relèvent de Neptune, pas de RDS avec des requêtes récursives ; l'analytique à l'échelle du pétaoctet relève de Redshift, pas d'une instance RDS plus grande ; les recherches par clé à très grande échelle relèvent de DynamoDB, pas d'Aurora avec de nombreux réplicas.

<!-- section: dynamodb-vs-rds | objectives: 4.3.12, 4.3.9 -->
## DynamoDB, RDS, Aurora et les options sans serveur

| Exigence | Choix le plus rentable |
| --- | --- |
| Recherches simples par clé, trafic imprévisible ou en pics, aucun serveur à gérer | DynamoDB en mode à la demande |
| Trafic clé-valeur stable et prévisible | DynamoDB en mode provisionné avec auto scaling, plus capacité réservée |
| Grande table rarement lue (anciennes commandes, journaux) où le stockage domine le coût | Classe de table DynamoDB Standard-IA |
| Jointures, SQL complexe, intégrité référentielle, application SQL existante | RDS ou Aurora |
| Base relationnelle inactive la majeure partie de la journée ou utilisée par intermittence (dev, test, outils internes) | Aurora Serverless v2 avec un minimum de 0 ACU (pause automatique) |
| Relationnel, intensif en E/S, E/S à 25 % ou plus des dépenses Aurora | Stockage de cluster Aurora I/O-Optimized |
| Relationnel, E/S modérées | Aurora Standard (paiement par million de requêtes d'E/S) |
| Petite charge relationnelle stable, au plus bas coût | RDS Single-AZ sur une petite instance (Multi-AZ seulement si la disponibilité l'exige) |
| Analytique occasionnelle avec des périodes d'inactivité | Redshift Serverless (facturé à la seconde d'utilisation des RPU, 60 secondes minimum) |

Options sans serveur et leurs unités de capacité :

| Service | Unité de capacité | Remarques |
| --- | --- | --- |
| DynamoDB à la demande | Unités de requête de lecture et d'écriture | Mode par défaut et recommandé pour la plupart des charges ; paiement à la requête |
| Aurora Serverless v2 | ACU (environ 2 Gio de mémoire plus CPU et réseau) | De 0 à 256 ACU (Aurora MySQL) ou jusqu'à 384 (Aurora PostgreSQL) selon la version ; mise à l'échelle par pas de 0,5 ACU ; peut se combiner à des instances provisionnées dans un même cluster |
| Redshift Serverless | RPU (16 Go de mémoire) | Capacité de base de 4 à 512 RPU (128 par défaut) ; la capacité maximale et la limite de RPU-heures plafonnent la dépense |
| Keyspaces | À la demande (par défaut) ou provisionné | Cassandra sans serveur |

Autres leviers de coût :

- **La durée de vie (TTL) DynamoDB** supprime les éléments expirés sans consommer de capacité d'écriture.
- **Aurora** ne facture que l'espace de stockage utilisé (le volume du cluster grandit automatiquement, jusqu'à 256 Tio selon la version) et réplique six copies sur trois zones de disponibilité sans frais supplémentaires pour cette réplication.
- Vous pouvez passer d'Aurora Standard à I/O-Optimized une fois tous les 30 jours, et revenir à tout moment.

> **Piège d'examen.** Aurora Serverless v2 n'est pas moins cher pour une base occupée 24 h/24 : une charge stable coûte moins cher sur des instances provisionnées avec des Reserved Instances ou des Database Savings Plans. Le sans serveur l'emporte quand la charge varie ou que la base est souvent inactive.

<!-- section: capacity-planning | objectives: 4.3.5 -->
## Planification de la capacité des bases de données

**Unités DynamoDB :**

| Opération | Une unité couvre |
| --- | --- |
| Lecture fortement cohérente | 1 lecture par seconde d'un élément jusqu'à 4 Ko (1 RCU) |
| Lecture à cohérence éventuelle | 2 lectures par seconde d'éléments jusqu'à 4 Ko (1 RCU) |
| Lecture transactionnelle | Exige 2 RCU par élément jusqu'à 4 Ko |
| Écriture standard | 1 écriture par seconde d'un élément jusqu'à 1 Ko (1 WCU) |
| Écriture transactionnelle | Exige 2 WCU par élément jusqu'à 1 Ko |

Les tailles d'éléments sont arrondies au supérieur : à 4 Ko pour les lectures, à 1 Ko pour les écritures.

```text
Reads: 200 items/s of 6 KB, strongly consistent
  6 KB rounds up to 8 KB = 2 RCU per read  -> 200 x 2 = 400 RCU
  eventually consistent                   -> 400 / 2 = 200 RCU
Writes: 100 items/s of 2.5 KB
  2.5 KB rounds up to 3 KB = 3 WCU per write -> 100 x 3 = 300 WCU
  transactional writes                       -> 300 x 2 = 600 WCU
```

Choisir le mode de capacité :

| Trafic | Mode |
| --- | --- |
| Nouvelle table, trafic inconnu ou en pics, paiement à l'usage | À la demande |
| Trafic stable et prévisible avec une croissance progressive | Provisionné avec auto scaling (utilisation cible de 70 % recommandée) |
| Base stable conservée un an ou plus | Provisionné plus capacité réservée (classe de table Standard uniquement, 1 ou 3 ans, paiement partiel d'avance, par blocs de 100 unités, une seule Région) |

- La capacité provisionnée est facturée à l'heure pour ce qui est provisionné, utilisé ou non.
- Une table peut passer du mode provisionné au mode à la demande jusqu'à quatre fois sur 24 heures glissantes, et du mode à la demande au mode provisionné à tout moment.
- Les résultats d'une Query sont additionnés puis arrondis à 4 Ko ; un Scan consomme de la capacité pour chaque élément évalué, pas seulement pour ceux renvoyés : préférez Query avec une bonne conception de clés.

**Capacité relationnelle** : dimensionnez la classe d'instance (la mémoire pour le jeu de travail, les vCPU pour la concurrence), utilisez la mise à l'échelle automatique du stockage plutôt que de surallouer le stockage, et ajoutez des réplicas en lecture ou un cache avant d'agrandir l'instance d'écriture. Aurora Serverless v2 remplace le choix de la taille d'instance par une plage minimale et maximale d'ACU.

> **Piège d'examen.** Le mode à la demande n'est pas toujours le moins cher pour DynamoDB : pour une table au trafic élevé et constant jour et nuit, la capacité provisionnée avec capacité réservée coûte moins cher. Le mode à la demande l'emporte pour un trafic en pics, imprévisible ou faible.

<!-- section: engines | objectives: 4.3.7, 4.3.11 -->
## Choisir un moteur de base de données

| Besoin | Moteur |
| --- | --- |
| Application web simple, surtout en lecture, large compatibilité d'outils et d'hébergement | MySQL (ou MariaDB, un fork de MySQL) |
| Requêtes complexes, types de données avancés (JSONB, tableaux), extensions comme PostGIS, respect strict des standards SQL | PostgreSQL |
| Performances et disponibilité supérieures aux moteurs communautaires avec la même compatibilité | Aurora MySQL ou Aurora PostgreSQL |
| Application qui dépend de fonctionnalités Oracle ou SQL Server et ne peut pas être modifiée | RDS for Oracle ou RDS for SQL Server |
| Application SQL Server qui passe à un moteur open source avec moins de modifications de code | Aurora PostgreSQL avec Babelfish (comprend le T-SQL et le protocole réseau de SQL Server) |

Pour les moteurs commerciaux, la licence pèse sur le coût :

- **Licence incluse** (License Included) : la licence est dans le prix horaire (RDS for SQL Server ; RDS for Oracle Standard Edition 2).
- **Licence existante** (Bring Your Own License, BYOL) : réutilisation de licences existantes (RDS for Oracle ; EC2 Dedicated Hosts pour les licences par socket ou par cœur).
- Passer d'un moteur commercial à MySQL, PostgreSQL ou Aurora supprime les frais de licence, souvent la plus grosse économie dans une question de migration.

Migrations par type :

| Type | Exemple | Outils |
| --- | --- | --- |
| Homogène | MySQL sur site → RDS for MySQL ou Aurora MySQL ; PostgreSQL → Aurora PostgreSQL | Outils natifs (sauvegarde et restauration, réplication native) ou AWS DMS ; pas de conversion de schéma |
| Hétérogène | Oracle ou SQL Server → Aurora PostgreSQL ; SQL Server → Aurora MySQL | Convertir d'abord le schéma et le code avec **DMS Schema Conversion** (service géré, fondé sur le moteur d'AWS SCT) ou AWS SCT, puis déplacer les données avec **AWS DMS** |

DMS Schema Conversion convertit uniquement les schémas, vues, procédures et fonctions, pas les données ; son rapport d'évaluation montre ce qui demande un travail manuel.

> **Piège d'examen.** Une migration hétérogène exige toujours deux étapes : la conversion du schéma (DMS Schema Conversion ou SCT), puis la migration des données (DMS). DMS seul déplace les données mais ne convertit ni les procédures stockées ni le code propre au moteur.

<!-- section: db-cost-tools | objectives: 4.3.1, 4.3.2 -->
## Fonctionnalités et outils de gestion des coûts pour les bases de données

**Engagements**

| Option | Couvre | Points clés |
| --- | --- | --- |
| Instances de base de données réservées RDS et Aurora | Une classe d'instance dans une Région et un moteur | 1 ou 3 ans ; No Upfront (1 an uniquement), Partial Upfront ou All Upfront ; flexibilité de taille pour MySQL, MariaDB, PostgreSQL, Db2 et Oracle BYOL, pas pour SQL Server ni Oracle License Included ; s'applique en Single-AZ et en Multi-AZ |
| Database Savings Plans | Aurora, RDS, DynamoDB, ElastiCache, DocumentDB, Neptune, Keyspaces, Timestream, DMS, OpenSearch Service | Jusqu'à 35 % ; 1 an, No Upfront ; tout moteur, famille, taille, zone, Région, usage sans serveur compris ; non cumulables avec des RI ou la capacité réservée DynamoDB sur le même usage |
| Capacité réservée DynamoDB | RCU et WCU provisionnées, classe de table Standard | 1 an (3 ans dans certaines Régions), ni annulable ni transférable |
| Nœuds réservés ElastiCache et Redshift, Reserved Instances OpenSearch Service | Nœuds ou instances d'un type | 1 ou 3 ans |

Choisissez les Database Savings Plans quand les moteurs, tailles ou Régions vont changer ou que l'usage sans serveur doit être couvert ; choisissez des instances de base de données réservées pour une classe d'instance stable, où une durée de 3 ans donne une remise plus forte.

**Fonctionnalités et outils**

- Les **balises de répartition des coûts** sur les instances, clusters et tables (activées dans Billing) répartissent la dépense des bases par application, environnement ou centre de coûts ; la facturation consolidée partage les réservations dans l'organisation.
- **Cost Explorer** : regroupez par service et type d'utilisation pour voir, par exemple, les frais d'E/S Aurora (pour justifier I/O-Optimized), le stockage des sauvegardes ou le transfert de données ; recommandations d'achat et couverture des RI et Savings Plans.
- **AWS Budgets** : alerte sur la dépense des bases de données, ou quand l'utilisation ou la couverture des RI ou Savings Plans passe sous une cible.
- **AWS Cost and Usage Report** : lignes par ressource pour attribuer le coût de chaque instance de base de données.
- **AWS Compute Optimizer** : recommandations de dimensionnement pour les instances RDS et Aurora et pour DynamoDB, entre autres.
- Bases hors production : arrêtez les instances RDS inutilisées (jusqu'à 7 jours d'affilée), ou utilisez Aurora Serverless v2 avec la pause automatique.

> **Conseil d'examen.** « Réduire le coût d'une instance RDS de production toujours active qui tournera trois ans sans changement » correspond à une instance de base de données réservée sur 3 ans ; « s'engager sur une dépense de bases de données pendant une migration de RDS vers Aurora et DynamoDB » correspond à un Database Savings Plan.

<!-- section: key-points -->
## Points clés

- Adaptez le modèle de données : relationnel (RDS, Aurora), clé-valeur (DynamoDB), document (DocumentDB), colonnes larges (Keyspaces), graphe (Neptune), en mémoire (ElastiCache), séries chronologiques (Timestream for InfluxDB), analytique en colonnes (Redshift, Parquet avec Athena).
- DynamoDB pour l'accès par clé à toute échelle ; RDS ou Aurora pour le SQL et les jointures ; le sans serveur (DynamoDB à la demande, Aurora Serverless v2, Redshift Serverless) pour les charges variables ou inactives.
- RCU = une lecture fortement cohérente de 4 Ko par seconde (moitié pour la cohérence éventuelle, double pour une transaction) ; WCU = une écriture de 1 Ko par seconde (double pour une transaction) ; tailles arrondies au supérieur.
- Mode à la demande pour un trafic inconnu ou en pics, mode provisionné avec auto scaling et capacité réservée pour un trafic stable ; classe de table Standard-IA quand le stockage domine.
- Aurora I/O-Optimized quand les E/S représentent 25 % ou plus des dépenses Aurora.
- MySQL pour les charges web simples, PostgreSQL pour les fonctionnalités avancées ; les moteurs open source suppriment les coûts de licence ; migration hétérogène = conversion du schéma puis DMS.
- Engagements : instances de base de données réservées, Database Savings Plans (1 an, jusqu'à 35 %), capacité réservée DynamoDB ; balises, Cost Explorer, Budgets et le Cost and Usage Report suivent la dépense.
