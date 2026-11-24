Une fois l'offre choisie, ses ressources doivent correspondre à la charge : taille de calcul et niveau, réplicas qui absorbent la lecture, stockage qui fournit les IOPS et, dans la base, tables partitionnées et données compressées. Chaque offre expose des leviers différents, et les questions d'examen reposent souvent sur le levier qui existe à tel endroit.

<!-- section: sql-database-scale | objectives: 1.2.1 -->
## Mettre à l'échelle Azure SQL Database

**Monter ou descendre en puissance** change l'objectif de service. Le processus du moteur est redémarré, si besoin sur une autre machine, par une opération **en ligne** : à la fin, les connexions ouvertes sont interrompues et les transactions non validées sont annulées, une courte coupure que la logique de nouvelle tentative absorbe.

```text
-- Run in the master database of the logical server
ALTER DATABASE [SalesDb] MODIFY (SERVICE_OBJECTIVE = 'GP_Gen5_8');
ALTER DATABASE [SalesDb] MODIFY (EDITION = 'BusinessCritical', SERVICE_OBJECTIVE = 'BC_Gen5_4');
```

```bash
az sql db update -g RG1 -s sql-contoso-prod -n SalesDb --service-objective GP_Gen5_8
```

```powershell
Set-AzSqlDatabase -ResourceGroupName RG1 -ServerName sql-contoso-prod `
  -DatabaseName SalesDb -RequestedServiceObjectiveName "GP_Gen5_8"
```

Dans le modèle DTU, l'utilisation vaut `MAX(avg_cpu_percent, avg_data_io_percent, avg_log_write_percent)` : la première ressource qui atteint 100 % fixe la limite. Basic, S0, S1 et S2 fournissent moins d'un vCore ; utilisez S3 ou plus pour les charges gourmandes en processeur et le columnstore.

Le **scale-out en lecture** envoie les connexions en lecture seule vers un réplica lisible, sans coût supplémentaire en Premium et Business Critical :

| Niveau | Scale-out en lecture |
| --- | --- |
| Basic, Standard, General Purpose | Indisponible |
| Premium, Business Critical | Activé par défaut sur les nouvelles bases, un réplica lisible inclus |
| Hyperscale | Disponible dès qu'au moins un réplica de haute disponibilité existe |

L'application s'y inscrit avec `ApplicationIntent=ReadOnly` dans sa chaîne de connexion (la valeur par défaut `ReadWrite` va vers le principal). Sur le réplica, `SELECT DATABASEPROPERTYEX(DB_NAME(), 'Updateability');` renvoie `READ_ONLY`. La latence du réplica est en général de quelques millisecondes à quelques secondes, sans borne supérieure fixe : une lecture qui doit voir immédiatement les données validées va vers le principal.

**Hyperscale** sépare le calcul du stockage : la mise à l'échelle du calcul et les sauvegardes ne dépendent pas de la taille des données.

| Type de réplica | Nombre | Usage |
| --- | --- | --- |
| Réplicas de haute disponibilité | 0 à 4 | Cibles de basculement, lisibles avec `ApplicationIntent=ReadOnly` |
| Réplicas nommés | Jusqu'à 30 | Scale-out en lecture avec leur propre nom et leur propre taille de calcul, isolés de la charge du principal |
| Géoréplicas | Dans d'autres régions | Copie lisible pour des lectures géodistribuées et la reprise d'activité |

La conversion d'une base vers Hyperscale se fait en ligne, avec un basculement final en général inférieur à une minute. Choisissez le **basculement manuel** pour en décider le moment : vous disposez alors de 24 heures après que la base est prête. La migration inverse n'est possible que vers **General Purpose**, dans les **45 jours**, et seulement pour une base convertie (une base créée en Hyperscale ne peut pas en sortir).

> **Piège d'examen.** Une base qui contient des objets OLTP en mémoire ne peut pas passer de Business Critical à General Purpose ou Standard tant que ces objets ne sont pas supprimés.

Le **serverless** se met à l'échelle automatiquement entre les vCores minimum et maximum configurés ; aucune action n'est nécessaire. Les **pools élastiques** se mettent à l'échelle en bloc : dimensionnez-les par `MAX(total databases × average use, concurrently peaking databases × peak use)` (nombre total de bases × utilisation moyenne, bases en pic simultané × utilisation de pointe), vérifiez ensuite le besoin de stockage et fixez éventuellement des limites minimum et maximum par base.

<!-- section: managed-instance-scale | objectives: 1.2.2 -->
## Mettre à l'échelle Azure SQL Managed Instance

| | General Purpose | Next-gen General Purpose | Business Critical |
| --- | --- | --- | --- |
| Stockage | Distant, 5 à 10 ms, jusqu'à 16 To | Elastic SAN, 3 à 5 ms, jusqu'à 32 To | SSD local, 1 à 2 ms, jusqu'à 4 To en série Standard ; série Premium jusqu'à 5,5 To, ou 16 To avec 64 vCores ou plus dans les grandes régions |
| Bases par instance | 100 | 500 | 100 |
| IOPS | 500 à 7 500 par fichier, selon la taille du fichier | 3 IOPS gratuites par Go de stockage, d'autres peuvent être achetées | 4 000 IOPS par vCore |
| OLTP en mémoire | Non | Non | Oui |
| Réplica lisible | Non | Non | Un, inclus (scale-out en lecture toujours actif) |
| Basculement à la fin d'une mise à l'échelle | Jusqu'à 2 minutes | Instance de retour après 2 minutes, certaines bases jusqu'à 10 minutes | Jusqu'à 20 secondes |

Le matériel fixe la mémoire par vCore : série Standard 5,1 Go, série Premium 7 Go, série Premium à mémoire optimisée 13,6 Go. Une charge gourmande en mémoire passe à la série Premium à mémoire optimisée plutôt qu'à davantage de vCores.

La mise à l'échelle des vCores, du stockage ou du niveau se fait dans le portail (**Calcul + stockage**), avec `az sql mi update` ou `Set-AzSqlInstance`. L'instance reste disponible pendant l'opération et n'est indisponible que pendant le basculement final. Les opérations Business Critical, et tout changement entre General Purpose et Business Critical, **amorcent** (seeding) les données vers de nouveaux réplicas : leur durée croît avec la taille des données. Next-gen General Purpose règle les IOPS indépendamment du stockage ; sur le matériel série Premium, Next-gen General Purpose et Business Critical peuvent aussi régler la mémoire indépendamment des vCores (mémoire flexible, facturée au Go) :

```bash
az sql mi update -g RG1 -n mi-contoso -e GeneralPurpose --gpv2 true --iops 6000
```

Leviers de performance propres à Managed Instance :

- Les **IOPS par fichier en General Purpose** dépendent de la taille du fichier : agrandir à l'avance un fichier de données ou de journal très sollicité relève ses limites d'IOPS et de débit.
- Le **débit d'écriture du journal** est plafonné par vCore, jusqu'à un maximum par instance : General Purpose 4,5 Mio/s par vCore, 120 Mio/s au plus ; Next-gen General Purpose 6 Mio/s par vCore, 220 Mio/s au plus (acheter des IOPS ne le relève pas) ; Business Critical 16 Mio/s par vCore, 160 Mio/s au plus en série Standard ou 192 Mio/s en série Premium. Une charge d'écriture qui atteint le plafond par vCore exige plus de vCores ou un autre niveau.
- `tempdb` accepte jusqu'à 128 fichiers ; en General Purpose, sa taille est limitée à 24 Go par vCore.
- Les **pools d'instances** hébergent plusieurs instances General Purpose sur des ressources partagées et préprovisionnées : les instances à 2 vCores n'existent que dans un pool, et une instance se crée en 10 minutes environ. Idéal pour migrer de nombreuses petites instances ; l'inconvénient est un possible voisin bruyant.

> **Piège d'examen.** Évitez de mettre à l'échelle une instance managée pendant une transaction longue (importation de données, reconstruction d'index) ou avec des connexions actives : le basculement final interrompt les connexions et les transactions ouvertes sont annulées.

<!-- section: vm-scale | objectives: 1.2.3 -->
## Mettre à l'échelle SQL Server sur les machines virtuelles Azure

Sur une machine virtuelle, vous dimensionnez vous-même le calcul et le stockage. La liste de contrôle de Microsoft :

| Domaine | Recommandation |
| --- | --- |
| Taille de machine virtuelle | Tailles à mémoire optimisée avec 4 vCores ou plus : série Ebdsv5 pour la plupart des charges de production, Mbdsv3 pour l'OLTP critique et les entrepôts de données |
| Disques | Premium SSD v2 avec Ebdsv5 ou Ebsv5 ; données, journal et `tempdb` sur des lecteurs séparés |
| Mise en cache de l'hôte | Lecture seule pour les disques de données, aucune pour les disques de journal |
| `tempdb` | Sur le disque temporaire local (`D:\`, éphémère), sauf pour une instance de cluster de basculement ; un fichier de données par cœur, jusqu'à huit |
| Formatage | Unité d'allocation de 64 Ko pour les lecteurs de données (le lecteur temporaire `D:\` garde 4 Ko) |
| Débit | Agréger plusieurs disques de données avec les espaces de stockage, jusqu'aux limites d'IOPS et de débit de la machine virtuelle |
| Paramètres SQL Server | Initialisation instantanée des fichiers, verrouillage des pages en mémoire, mémoire maximale du serveur laissant de la place au système, compression des sauvegardes, compression de page si elle est pertinente |
| Fonctionnalités Azure | Inscription auprès de l'extension SQL IaaS Agent ; mise en réseau accélérée activée |

La taille de la machine virtuelle plafonne aussi les IOPS et le débit des disques : ajouter des disques au-delà de ce plafond n'aide pas, une taille supérieure si. Redimensionner une machine virtuelle la redémarre, contrairement à la mise à l'échelle des offres PaaS.

> **Piège d'examen.** La mise en cache en lecture sur un disque de journal est une erreur : le journal est écrit séquentiellement. Les disques de données utilisent la mise en cache en lecture seule, les disques de journal aucune.

<!-- section: configure-partitioning | objectives: 1.2.4 -->
## Configurer le partitionnement de table

Créez la fonction, le schéma, puis la table (ou reconstruisez son index cluster) sur le schéma :

```text
-- Monthly partitions; RANGE RIGHT: each boundary starts a partition
CREATE PARTITION FUNCTION pfOrderDate (date)
    AS RANGE RIGHT FOR VALUES ('2026-01-01', '2026-02-01', '2026-03-01');

-- Azure SQL Database: every partition on PRIMARY
CREATE PARTITION SCHEME psOrderDate
    AS PARTITION pfOrderDate ALL TO ([PRIMARY]);

CREATE TABLE dbo.Orders (
    OrderId bigint NOT NULL,
    OrderDate date NOT NULL,
    Amount money NOT NULL,
    CONSTRAINT PK_Orders PRIMARY KEY CLUSTERED (OrderDate, OrderId)
) ON psOrderDate (OrderDate);
```

Trois limites créent quatre partitions : avant janvier, janvier, février, puis à partir de mars. La colonne de partitionnement doit faire partie de la clé de l'index cluster et de chaque index unique pour que ces index soient alignés.

Maintenance en fenêtre glissante :

```text
-- Add a partition for April
ALTER PARTITION SCHEME psOrderDate NEXT USED [PRIMARY];
ALTER PARTITION FUNCTION pfOrderDate () SPLIT RANGE ('2026-04-01');

-- Archive the oldest partition: metadata-only switch to an empty table
-- with the same structure, on the same filegroup
ALTER TABLE dbo.Orders SWITCH PARTITION 1 TO dbo.OrdersArchive;

-- Remove the now empty boundary
ALTER PARTITION FUNCTION pfOrderDate () MERGE RANGE ('2026-01-01');

-- Or empty one partition directly
TRUNCATE TABLE dbo.Orders WITH (PARTITIONS (1));
```

Fractionnez une partition **vide** au bout de la plage : fractionner ou fusionner des partitions qui contiennent des lignes déplace des données, ce qui est lent et fortement journalisé. Pour savoir où se trouvent les lignes :

```text
SELECT $PARTITION.pfOrderDate('2026-02-15') AS PartitionNumber;

SELECT partition_number, rows, data_compression_desc
FROM sys.partitions
WHERE object_id = OBJECT_ID('dbo.Orders') AND index_id IN (0, 1);
```

Définissez `LOCK_ESCALATION = AUTO` avec `ALTER TABLE` pour que les verrous s'escaladent vers la partition plutôt que vers toute la table.

<!-- section: data-compression | objectives: 1.2.5 -->
## Configurer la compression des données

| Type | S'applique à | Effet |
| --- | --- | --- |
| `ROW` | Tables et index rowstore | Stocke les valeurs de longueur fixe dans un format de longueur variable |
| `PAGE` | Tables et index rowstore | Compression de ligne plus compression de préfixe et de dictionnaire : gain supérieur, plus de processeur |
| `COLUMNSTORE` | Index columnstore | Toujours appliquée aux données columnstore |
| `COLUMNSTORE_ARCHIVE` | Index columnstore | Compression supplémentaire pour les données rarement lues ; requêtes plus lentes |
| `XML_COMPRESSION = ON` | Colonnes XML (SQL Server 2022 et Azure SQL) | Compresse les données XML |

La compression économise du stockage et des E/S (moins de pages lues) au prix du processeur. Elle est disponible dans Azure SQL Database, Managed Instance, la base de données SQL dans Fabric et SQL Server, et se définit par partition.

Estimez d'abord, puis appliquez :

```text
EXEC sp_estimate_data_compression_savings
    @schema_name = 'dbo', @object_name = 'Orders',
    @index_id = NULL, @partition_number = NULL,
    @data_compression = 'PAGE';

ALTER TABLE dbo.Orders REBUILD PARTITION = ALL
    WITH (DATA_COMPRESSION = PAGE ON PARTITIONS (1 TO 3),
          DATA_COMPRESSION = ROW ON PARTITIONS (4));

ALTER INDEX IX_Orders_Amount ON dbo.Orders
    REBUILD WITH (DATA_COMPRESSION = PAGE, ONLINE = ON);
```

Règles vérifiées à l'examen :

- Les index non cluster **n'héritent pas** de la compression de la table : compressez chaque index explicitement (la valeur par défaut est `NONE`).
- Les données hors ligne et les grandes valeurs (`varchar(max)`, une valeur XML de plus de 8 060 octets) ne sont pas compressées par la compression de ligne ou de page.
- Sur un tas, les nouvelles pages ajoutées par le DML n'utilisent pas la compression de page tant que le tas n'est pas reconstruit.
- Les tables avec des colonnes éparses ne peuvent pas être compressées.
- La compression ne change pas la taille maximale d'une ligne.
- La **compression des sauvegardes** est une autre fonctionnalité : elle compresse le fichier de sauvegarde, pas les fichiers de données.

> **Conseil d'examen.** Choisissez `PAGE` pour les grandes tables surtout lues où les E/S dominent, `ROW` pour les tables très sollicitées en écriture où le processeur compte, et `COLUMNSTORE_ARCHIVE` pour les partitions froides d'une table columnstore.

<!-- section: key-points -->
## Points clés

- La mise à l'échelle d'Azure SQL Database se fait en ligne avec une courte déconnexion à la fin : `ALTER DATABASE ... MODIFY (SERVICE_OBJECTIVE = ...)` depuis `master`.
- Scale-out en lecture : Premium, Business Critical (actif par défaut) et Hyperscale avec un réplica ; connexion avec `ApplicationIntent=ReadOnly`.
- Hyperscale : 0 à 4 réplicas de haute disponibilité, jusqu'à 30 réplicas nommés, migration inverse vers General Purpose dans les 45 jours pour les bases converties.
- Managed Instance : Business Critical pour la latence, l'OLTP en mémoire et un réplica lisible ; Next-gen General Purpose pour 32 To, 500 bases et des IOPS ajustables ; pools d'instances pour de nombreuses petites instances.
- Machines virtuelles : Ebdsv5, Premium SSD v2, cache en lecture seule pour les données, aucun pour le journal, `tempdb` sur `D:\`, unité d'allocation de 64 Ko.
- Partitionnement : fonction, schéma, index alignés, `SPLIT` sur des plages vides, `SWITCH` pour charger et archiver instantanément.
- Compression : estimez avec `sp_estimate_data_compression_savings`, définissez-la par partition et par index.
