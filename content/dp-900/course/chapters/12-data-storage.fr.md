Les organisations conservent leurs données dans deux grandes catégories de magasins de données : les magasins de fichiers et les bases de données. L'examen vous demande de reconnaître un format de fichier à sa description, de distinguer les types de bases de données et de nommer le service Azure adapté à un cas d'usage courant.

<!-- section: file-formats | objectives: 1.2.1 -->
## Les formats courants des fichiers de données

Le format d'un fichier dépend du type de données (structurées, semi-structurées, non structurées), des applications qui doivent le lire et l'écrire, et du besoin : lisibilité par des personnes, ou efficacité du stockage et du traitement.

| Format | Nature | À retenir |
| --- | --- | --- |
| **Texte délimité** | Texte, lisible par des personnes | Champs séparés par un délimiteur et lignes terminées par un saut de ligne ; la première ligne peut contenir les noms de champ. Les valeurs séparées par des virgules (CSV) sont les plus courantes ; il existe aussi les valeurs séparées par des tabulations (TSV) et les fichiers à largeur fixe. Un bon choix pour des données structurées que beaucoup d'applications et de personnes doivent lire |
| **JSON** | Texte, hiérarchique | Objets entre accolades, collections entre crochets, attributs écrits en paires nom-valeur. Convient aux données structurées et semi-structurées |
| **XML** | Texte, hiérarchique | Des balises entre chevrons définissent des éléments et des attributs. Populaire dans les années 1990 et 2000, plus verbeux que JSON, qui l'a largement remplacé |
| **BLOB** | Binaire | Objet binaire de grande taille : données binaires brutes qu'une application doit interpréter. Images, vidéo, audio et documents propres à une application |
| **Avro** | Binaire, orienté ligne | Chaque fichier a un en-tête en JSON qui décrit la structure ; les enregistrements sont stockés en binaire. Efficace pour compresser les données et réduire le stockage et la bande passante réseau |
| **Parquet** | Binaire, en colonnes | Les données sont organisées en groupes de lignes dans lesquels les valeurs de chaque colonne sont stockées ensemble, avec des métadonnées qui permettent de ne lire que les colonnes utiles. Compression efficace, prise en charge des données imbriquées ; très utilisé dans les lacs de données et les lakehouses |
| **Delta Lake** | Parquet plus un journal | Format de stockage open source qui ajoute un journal des transactions aux fichiers Parquet : transactions ACID, gestion des versions des données et mises à jour fiables sur les fichiers d'un lac de données |

Les deux mêmes clients en texte délimité, puis en XML :

```text
CustomerID,FirstName,City
1,Ana,Lisbon
2,Kenji,Osaka
```

```text
<Customers>
  <Customer id="1" firstName="Ana" city="Lisbon"/>
  <Customer id="2" firstName="Kenji" city="Osaka"/>
</Customers>
```

Avro, Parquet et Delta Lake sont des **formats de fichiers optimisés** : ils ne se lisent pas dans un éditeur de texte, mais ils se compressent bien et se traitent vite.

> **Piège d'examen.** Parquet est **en colonnes**, Avro est **orienté ligne**. « Ne lire que quelques colonnes d'un très gros fichier » désigne Parquet ; « un en-tête JSON suivi d'enregistrements binaires » désigne Avro.

<!-- section: data-stores | objectives: 1.2.2 -->
## Magasins de fichiers et bases de données

Un **magasin de fichiers** conserve des fichiers sur un disque local, sur un partage réseau ou dans le cloud. Une **base de données** est un système dédié qui gère des enregistrements de données plutôt que des fichiers, et que les applications interrogent.

Les **bases de données relationnelles** stockent des données structurées dans des **tables** qui représentent des entités. Chaque ligne a une **clé primaire** qui l'identifie ; les autres tables référencent cette clé, de sorte que les informations d'un client sont stockées une seule fois au lieu d'être répétées dans chaque commande (la base de données est **normalisée**). Les tables se gèrent et s'interrogent en **SQL**, un langage fondé sur une norme ANSI et donc similaire d'un système de base de données à l'autre.

Les **bases de données non relationnelles** n'appliquent pas de schéma relationnel aux données. On les appelle souvent bases de données **NoSQL**. Quatre types sont courants :

| Type | Comment les données sont stockées | Exemple d'usage |
| --- | --- | --- |
| **Clé-valeur** | Chaque enregistrement est une clé unique et une valeur associée, de n'importe quel format | Données de session, préférences d'utilisateur |
| **Documents** | Une base de données clé-valeur dont la valeur est un document JSON que le système sait analyser et interroger | Catalogue de produits dont les attributs varient |
| **Familles de colonnes** | Des lignes et des colonnes, mais les colonnes sont réparties en groupes (familles de colonnes) de colonnes logiquement liées | Tables larges où chaque ligne utilise des groupes de colonnes différents |
| **Graphes** | Les entités sont des nœuds, reliés par des liens qui définissent les relations entre eux | Réseau social, organigramme, recommandations |

> **Piège d'examen.** NoSQL ne veut pas dire que SQL est interdit : certaines bases de données non relationnelles prennent en charge une variante du langage SQL. Le nom indique seulement que les données ne sont pas organisées selon un schéma relationnel.

| Besoin | Type de magasin |
| --- | --- |
| Données structurées, relations entre tables, requêtes SQL | Base de données relationnelle |
| Éléments JSON dont les champs diffèrent | Base de données de documents |
| Retrouver rapidement une valeur à partir de sa clé | Base de données clé-valeur |
| Suivre des relations du type « qui est le responsable de qui » | Base de données de graphes |
| Images, vidéos, sauvegardes, fichiers de données brutes | Magasin de fichiers |

<!-- section: azure-data-stores | objectives: 1.2.3 -->
## Les magasins de données Azure pour les cas d'usage courants

| Cas d'usage | Service Azure |
| --- | --- |
| Données transactionnelles des applications métier, sur le moteur de base de données SQL Server | **Azure SQL** (Azure SQL Database, Azure SQL Managed Instance, SQL Server sur Machines Virtuelles Azure) |
| Base de données relationnelle pour une application construite sur un moteur open source | **Azure Database pour MySQL**, **Azure Database pour PostgreSQL** |
| Base de données non relationnelle à l'échelle mondiale : documents JSON, paires clé-valeur, familles de colonnes, graphes | **Azure Cosmos DB** |
| Stockage scalable et économique de fichiers binaires et d'autres données non structurées | **Stockage Blob Azure** (conteneurs d'objets blob d'un compte de stockage) |
| Partages de fichiers réseau comme ceux d'un réseau d'entreprise | **Azure Files** |
| Stockage clé-valeur pour des applications qui lisent et écrivent rapidement des valeurs | **Stockage Table Azure** |
| Lac de données : fichiers organisés en dossiers pour l'analytique à grande échelle | **Azure Data Lake Storage** (Stockage Blob avec un espace de noms hiérarchique) |
| Une plateforme d'analytique fournie sous forme de logiciel en tant que service (SaaS), avec un lac de données partagé (OneLake) | **Microsoft Fabric** |

Les conteneurs d'objets blob, les partages de fichiers et les tables sont trois services du même compte de **Stockage Azure**.

> **Piège d'examen.** Sur Azure, un lac de données n'est pas un produit de stockage à part : c'est un compte de Stockage Azure dans lequel l'**espace de noms hiérarchique** est activé, de sorte que les objets blob sont organisés dans de vrais dossiers.

<!-- section: key-points -->
## Points clés

- Le texte délimité, JSON et XML sont du texte lisible ; Avro, Parquet et Delta Lake sont des formats optimisés.
- Avro : orienté ligne, en-tête JSON, données binaires. Parquet : en colonnes. Delta Lake : Parquet plus un journal des transactions.
- BLOB : objet binaire de grande taille, pour les images, la vidéo, l'audio et les documents.
- Relationnel : tables, clés, SQL. Non relationnel : clé-valeur, documents, familles de colonnes, graphes.
- Azure SQL et les services open source sont relationnels ; Azure Cosmos DB est non relationnel à l'échelle mondiale.
- Stockage Azure : conteneurs d'objets blob pour les données non structurées, partages de fichiers, tables clé-valeur, et lacs de données avec l'espace de noms hiérarchique.
