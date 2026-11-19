Les questions sur les bases de données décrivent les données (relationnelles, clé-valeur, documents, graphe, ordonnées dans le temps), le modèle d'accès (lecture intensive, écriture intensive, recherches en quelques millisecondes, jointures complexes, analytique) et l'échelle, puis demandent le type de base de données, le moteur, la configuration de capacité ou le chemin de migration. La réponse d'AWS est une base de données spécialisée pour chaque modèle plutôt qu'une seule base pour tout.

<!-- section: database-types | objectives: 3.3.8 -->
## Types de bases de données et services AWS

| Type | Modèle de données | Service AWS | Usage typique |
| --- | --- | --- | --- |
| Relationnel (OLTP) | Tables, SQL, jointures, transactions ACID | Amazon RDS (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, Db2), Amazon Aurora (compatible MySQL et PostgreSQL) | ERP, commandes e-commerce, tout schéma avec des relations |
| Clé-valeur et éléments larges | Éléments accessibles par clé, attributs flexibles | Amazon DynamoDB | Paniers, sessions, profils utilisateur, jeux, IoT à toute échelle |
| Document | Documents JSON, API MongoDB | Amazon DocumentDB (compatible avec MongoDB) | Catalogues de contenu, profils avec données imbriquées |
| Colonnes larges | Tables Cassandra, CQL | Amazon Keyspaces (pour Apache Cassandra) | Migrer des charges Cassandra sans gérer de clusters |
| Graphe | Nœuds et relations ; Gremlin, openCypher, SPARQL | Amazon Neptune | Réseaux sociaux, réseaux de fraude, recommandations, graphes de connaissances |
| Cache en mémoire | Clé-valeur en RAM, lectures en microsecondes | Amazon ElastiCache (Valkey, Redis OSS, Memcached) | Cache devant une base de données, stockage de sessions, classements |
| En mémoire durable | API Valkey/Redis OSS avec un journal de transactions Multi-AZ | Amazon MemoryDB | Base principale qui exige des lectures en microsecondes et des écritures en quelques millisecondes |
| Entrepôt de données (OLAP) | En colonnes, analytique SQL sur de grands jeux de données | Amazon Redshift | Rapports et BI sur des téraoctets à des pétaoctets |

Les options **sans serveur** suppriment la gestion de la capacité : Aurora Serverless v2 (évolue en ACU, jusqu'à 0 avec la mise en pause automatique sur les versions prises en charge), DynamoDB à la demande (mode par défaut et recommandé), ElastiCache Serverless, Redshift Serverless, Amazon Keyspaces, Neptune Serverless.

> **Piège d'examen.** Redshift n'est pas une base transactionnelle. « Des milliers de petites transactions par seconde depuis l'application web », c'est RDS, Aurora ou DynamoDB ; « des requêtes analytiques complexes sur des années de ventes », c'est Redshift.

<!-- section: database-type-choice | objectives: 3.3.12 -->
## Choisir le type de base de données : Aurora, RDS ou DynamoDB

| Exigence de l'énoncé | Réponse |
| --- | --- |
| Application SQL existante, jointures, MySQL ou PostgreSQL, meilleures performances et disponibilité d'une base relationnelle gérée | Amazon Aurora |
| Moteur commercial (Oracle, SQL Server, Db2) ou version open source précise, base gérée standard | Amazon RDS |
| Besoin d'accéder au système d'exploitation ou à l'hôte pour un moteur commercial | Amazon RDS Custom (Oracle, SQL Server) |
| Latence de quelques millisecondes à toute échelle, accès par clé, sans schéma, sans serveur | Amazon DynamoDB |
| Lectures en microsecondes pour DynamoDB sans changer le modèle de données | DynamoDB Accelerator (DAX) |
| Charge relationnelle imprévisible, périodes d'inactivité, mise à l'échelle automatique | Aurora Serverless v2 |
| Écritures actif/actif multi-Régions sur des données clé-valeur | Tables globales DynamoDB |
| Relationnel, une Région principale, lectures interrégionales rapides et reprise après sinistre | Aurora Global Database |

Aurora par rapport à RDS : Aurora sépare le calcul d'un **volume de cluster** répliqué sur trois zones de disponibilité (six nœuds de stockage) qui grandit automatiquement, jusqu'à 15 réplicas Aurora partagent ce stockage avec un retard de réplication généralement inférieur à 100 ms, et le basculement se termine généralement en moins de 60 secondes. RDS stocke les données sur des volumes EBS attachés à l'instance.

Limites DynamoDB à retenir : éléments jusqu'à 400 Ko, tables de taille illimitée, 20 index secondaires globaux et 5 index secondaires locaux par table par défaut (LSI uniquement à la création de la table).

> **Conseil d'examen.** « Relationnel », « jointures », « SQL » ou « ACID entre tables » excluent DynamoDB, quelle que soit l'échelle. « Clé-valeur », « schéma flexible », « des millions de requêtes par seconde » ou « sans serveur, aucun serveur à gérer » mènent à DynamoDB.

<!-- section: access-patterns | objectives: 3.3.3 -->
## Modèles d'accès aux données : lecture intensive et écriture intensive

| Modèle | Réponse relationnelle | Réponse DynamoDB |
| --- | --- | --- |
| Lecture intensive, les mêmes lignes relues sans cesse | ElastiCache devant la base ; réplicas en lecture | DAX ; lectures à cohérence éventuelle (moitié du coût d'une lecture fortement cohérente) |
| Lecture intensive, les requêtes de rapport ralentissent l'application | Réplica en lecture ou réplica Aurora pour les rapports ; Redshift pour l'analytique | Export vers S3 et requêtes avec Athena |
| Écriture intensive, un nœud d'écriture unique saturé | Agrandir le nœud d'écriture (classe d'instance plus grande, plus d'IOPS) ; partitionner entre bases (sharding) ; envisager DynamoDB | Répartir les écritures avec une clé de partition à forte cardinalité ; mode à la demande ou provisionné avec mise à l'échelle automatique |
| Pics d'écriture que la base n'absorbe pas | Mettre les écritures en tampon dans une file SQS, les consommateurs écrivent à un rythme régulier | Mode à la demande, ou tampon SQS devant une capacité provisionnée |
| Nombreuses recherches sur différents attributs | Index | Index secondaires globaux |

- **Les réplicas en lecture ne mettent pas les écritures à l'échelle** : chaque réplica rejoue chaque écriture. Une base relationnelle limitée en écriture évolue verticalement, par partitionnement, ou en déplaçant les données chaudes vers DynamoDB.
- Dans DynamoDB, une partition prend en charge jusqu'à 3 000 RCU et 1 000 WCU. Une clé de partition à faible cardinalité (une date, un statut) crée une **partition chaude** et une limitation (throttling) ; ajoutez un suffixe aléatoire ou calculé à la clé (write sharding) ou choisissez une clé aux nombreuses valeurs distinctes.

> **Piège d'examen.** Ajouter des réplicas en lecture à une instance RDS saturée en CPU par des instructions INSERT et UPDATE n'aide pas. Le nœud d'écriture doit grandir, ou le chemin d'écriture doit changer.

<!-- section: capacity-planning | objectives: 3.3.4 -->
## Planification de la capacité des bases de données

**Unités de capacité DynamoDB**

| Unité | Définition |
| --- | --- |
| 1 RCU | 1 lecture fortement cohérente par seconde, ou 2 lectures à cohérence éventuelle par seconde, pour un élément jusqu'à 4 Ko |
| 1 WCU | 1 écriture par seconde pour un élément jusqu'à 1 Ko |
| Lecture / écriture transactionnelle | 2 RCU par lecture de 4 Ko / 2 WCU par écriture de 1 Ko |

Les tailles sont arrondies au supérieur : lire un élément de 6 Ko en lecture fortement cohérente coûte 2 RCU ; écrire un élément de 1,5 Ko coûte 2 WCU. Exemple : 100 lectures fortement cohérentes par seconde d'éléments de 9 Ko = 100 × 3 = 300 RCU ; en cohérence éventuelle = 150 RCU.

| Mode | Comportement | À choisir quand |
| --- | --- | --- |
| À la demande (on-demand) | Paiement par requête, absorbe instantanément jusqu'au double du pic précédent | Par défaut ; trafic nouveau, inconnu ou en pics ; tables longtemps inactives |
| Provisionné avec mise à l'échelle automatique | Paiement horaire des RCU/WCU provisionnées, la mise à l'échelle automatique suit une utilisation cible (70 % recommandé) | Trafic prévisible et régulier ; avec de la capacité réservée pour un coût plus faible |

Vous pouvez passer une table du mode provisionné au mode à la demande jusqu'à quatre fois sur 24 heures glissantes, et revenir au mode provisionné à tout moment.

**Capacité relationnelle**

- **Classes d'instance** : db.m (usage général), db.r et db.x (optimisées pour la mémoire, pour de grands jeux de travail et des caches), db.t (extensibles, dev/test et charges légères). Les classes Graviton (lettre `g`) offrent un meilleur rapport prix/performances.
- **Stockage RDS** : SSD à usage général (gp3, IOPS et débit de base inclus, davantage provisionné séparément) ou **SSD IOPS provisionnées** (io2 Block Express, io1) pour des bases de production intensives en E/S avec une faible latence constante. La **mise à l'échelle automatique du stockage** augmente le stockage alloué quand l'espace libre diminue.
- **Aurora** : le stockage est automatique (volume de cluster jusqu'à 128 Tio, ou 256 Tio sur les versions récentes du moteur) ; vous dimensionnez les instances. **Aurora I/O-Optimized** ne facture pas les E/S et c'est le meilleur choix quand les E/S représentent 25 % ou plus des dépenses Aurora ; **Aurora Standard** en dessous de 25 %.
- **Aurora Serverless v2** : capacité en ACU (chacune environ 2 Gio de mémoire avec le processeur et le réseau correspondants), de 0 (mise en pause automatique sur les versions prises en charge) jusqu'à 256 ACU (Aurora MySQL) ou 384 ACU (Aurora PostgreSQL), par pas de 0,5 ACU au minimum. Instances sans serveur et provisionnées peuvent coexister dans un même cluster.

> **Piège d'examen.** Une limitation sur une table DynamoDB dont la capacité provisionnée totale est loin d'être consommée signifie en général une partition chaude, pas un manque de capacité : corrigez la conception de la clé.

<!-- section: engine-choice | objectives: 3.3.11 -->
## Choisir un moteur de base de données

| Exigence | Moteur |
| --- | --- |
| Moteur open source très répandu pour les applications web, requêtes simples en lecture intensive, code MySQL existant | MySQL (RDS for MySQL ou Aurora MySQL) |
| Fork de MySQL déjà utilisé par l'application | MariaDB (RDS for MariaDB) |
| SQL avancé, requêtes complexes, types de données riches (JSONB, tableaux), extensions comme PostGIS pour les données géospatiales | PostgreSQL (RDS for PostgreSQL ou Aurora PostgreSQL) |
| Fonctionnalités propres à Oracle comme les packages PL/SQL, licences Oracle existantes | RDS for Oracle (Bring Your Own License ou License Included) |
| Microsoft SQL Server, T-SQL, applications avec authentification Windows | RDS for SQL Server ; ou Aurora PostgreSQL avec Babelfish pour exécuter de nombreuses requêtes T-SQL sur PostgreSQL |
| Charges IBM Db2 | RDS for Db2 |
| Sortir des licences commerciales | Migrer vers Aurora PostgreSQL ou Aurora MySQL (migration hétérogène) |

- Choisissez **Aurora** plutôt que RDS pour le même moteur open source quand l'énoncé demande un débit plus élevé, un basculement plus rapide, jusqu'à 15 réplicas à faible retard, Global Database ou une croissance automatique du stockage.
- Choisissez **RDS** quand comptent la version exacte du moteur, une extension non prise en charge ou le coût le plus bas pour une petite base.

> **Conseil d'examen.** Quand l'énoncé nomme une fonctionnalité de moteur (PostGIS, PL/SQL Oracle, T-SQL), c'est elle qui décide du moteur. Le reste de la question décide entre RDS et Aurora.

<!-- section: migrations | objectives: 3.3.6 -->
## Migrations homogènes et hétérogènes

| Migration | Exemple | Outils |
| --- | --- | --- |
| Homogène (même moteur) | MySQL sur site vers RDS for MySQL ou Aurora MySQL ; PostgreSQL vers Aurora PostgreSQL | Outils natifs (export et restauration, sauvegardes natives comme les fichiers SQL Server `.bak` depuis S3, Aurora à partir d'un instantané RDS ou d'un réplica en lecture), ou AWS DMS pour un chargement complet plus une réplication continue |
| Hétérogène (moteur différent) | Oracle ou SQL Server vers Aurora PostgreSQL ; SQL Server vers Aurora MySQL | Convertir le schéma et le code avec **DMS Schema Conversion** (géré, basé sur le moteur d'AWS SCT, avec une assistance par IA générative pour certains chemins) ou AWS SCT ; puis déplacer les données avec **AWS DMS** |
| Interruption minimale | Tous | Chargement complet AWS DMS + **capture des données modifiées (CDC)**, puis bascule quand la cible est synchronisée |
| Vers l'analytique | OLTP vers Redshift | AWS DMS vers Redshift (les schémas Oracle se convertissent avec DMS Schema Conversion) |

- DMS migre uniquement les **données** : tables, lignes, modifications continues. Les index secondaires, procédures stockées, déclencheurs et vues sont des objets de schéma : convertissez-les avec DMS Schema Conversion ou SCT.
- La source reste en ligne pendant une migration DMS ; une instance de réplication (ou DMS Serverless) exécute la tâche.

> **Piège d'examen.** « Migrer Oracle vers Aurora PostgreSQL » avec DMS seul est incomplet : l'étape de conversion du schéma vient d'abord. De MySQL vers Aurora MySQL, aucune conversion de schéma n'est nécessaire.

<!-- section: database-architectures | objectives: 3.3.10 -->
## Concevoir des architectures de base de données

| Exigence | Architecture |
| --- | --- |
| Haute disponibilité dans une Région, sans mise à l'échelle des lectures | Instance de base de données RDS Multi-AZ (instance de secours synchrone, non lisible) |
| Haute disponibilité plus instances de secours lisibles, latence d'écriture plus faible | Cluster de bases de données RDS Multi-AZ (un nœud d'écriture, deux lecteurs lisibles dans trois AZ ; MySQL et PostgreSQL) |
| Mise à l'échelle des lectures et basculement rapide sur un volume partagé | Cluster Aurora avec des réplicas dans plusieurs AZ, point de terminaison du lecteur, Aurora Auto Scaling |
| Lectures mondiales à latence locale et reprise régionale pour des données relationnelles | Aurora Global Database (jusqu'à 10 Régions secondaires, réplication généralement inférieure à une seconde) |
| Écritures multi-Régions, clé-valeur | Tables globales DynamoDB |
| Nombreuses connexions de courte durée (Lambda) | RDS Proxy devant RDS ou Aurora |
| Lectures chaudes | ElastiCache ou DAX en frontal |
| Microservices ayant chacun leurs données | Une base spécialisée par service (persistance polyglotte) |

Placez les bases de données dans des **sous-réseaux privés**, réparties sur plusieurs AZ avec un groupe de sous-réseaux de base de données, accessibles via des groupes de sécurité qui n'autorisent que le niveau applicatif. Concevez selon le modèle : cache pour les lectures répétées, réplicas pour l'échelle en lecture, file d'attente pour les pics d'écriture, entrepôt pour l'analytique.

> **Conseil d'examen.** Séparez la charge de rapports de la charge OLTP : un réplica Aurora avec un point de terminaison personnalisé pour les rapports, ou Redshift alimenté par DMS ou par une intégration zero-ETL, garde le nœud d'écriture transactionnel rapide.

<!-- section: key-points -->
## Points clés

- Une base spécialisée par modèle d'accès : relationnelle (RDS, Aurora), clé-valeur (DynamoDB), document (DocumentDB), graphe (Neptune), colonnes larges (Keyspaces), en mémoire (ElastiCache, MemoryDB), entrepôt (Redshift).
- Lecture intensive : caches et réplicas. Écriture intensive : nœud d'écriture plus grand, partitionnement, DynamoDB avec une bonne clé de partition, tampon SQS.
- RCU = lecture fortement cohérente de 4 Ko (2 à cohérence éventuelle) ; WCU = écriture de 1 Ko ; les transactions coûtent le double. À la demande par défaut ; provisionné avec mise à l'échelle automatique pour un trafic régulier.
- PostgreSQL pour le SQL avancé et PostGIS, MySQL pour les charges web répandues ; Aurora quand les performances, les réplicas et le basculement comptent.
- Homogène : outils natifs ou DMS. Hétérogène : DMS Schema Conversion ou SCT, puis DMS avec CDC.
