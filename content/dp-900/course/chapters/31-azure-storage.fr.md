Un compte de Stockage Azure offre trois services de données non relationnelles que l'examen compare : les conteneurs d'objets blob pour les données non structurées, les partages de fichiers et les tables clé/valeur. Vous devez savoir ce que chacun stocke, ses principales options, et lequel répond à un besoin donné.

<!-- section: blob-storage | objectives: 3.1.1 -->
## Le Stockage Blob Azure

Le Stockage Blob Azure stocke d'énormes quantités de **données non structurées** sous forme d'objets binaires volumineux, les **objets blob**, que les applications lisent et écrivent par une API.

- Les objets blob sont stockés dans des **conteneurs**, qui regroupent des objets blob associés dans un compte de stockage. L'accès se contrôle au niveau du conteneur ; Microsoft Entra ID avec le contrôle d'accès en fonction du rôle Azure (RBAC) est la méthode recommandée pour autoriser les utilisateurs.
- Un `/` dans les noms d'objets blob les présente comme des **dossiers virtuels**. Ces dossiers n'existent pas vraiment : par défaut, on ne peut pas définir d'autorisations ni lancer d'opérations en masse sur un dossier.

| Type d'objet blob | Structure | Taille maximale | Usage |
| --- | --- | --- | --- |
| **Objet blob de blocs** | Un ensemble de blocs de 4 000 Mio au plus chacun | Environ 190,7 Tio (50 000 blocs) | Objets binaires distincts et volumineux qui changent rarement : images, vidéos, documents, sauvegardes |
| **Objet blob de pages** | Des pages de taille fixe de 512 octets | 8 Tio | Opérations de lecture et d'écriture aléatoires ; Azure utilise les objets blob de pages pour les disques virtuels des machines virtuelles |
| **Objet blob d'ajout** | Un objet blob de blocs dans lequel les blocs ne s'ajoutent qu'à la fin | Un peu plus de 195 Gio | Données qui ne font que croître, comme les journaux |

> **Piège d'examen.** « Fichier journal auquel on ajoute sans cesse des lignes » désigne un objet blob d'ajout ; « disque de machine virtuelle » ou « accès aléatoire » désigne un objet blob de pages. Tout le reste, soit l'essentiel de ce que l'on stocke, est un objet blob de blocs.

<!-- section: blob-tiers-data-lake | objectives: 3.1.1 -->
## Niveaux d'accès, cycle de vie et lacs de données

Les niveaux d'accès équilibrent le coût du stockage avec le coût et la rapidité de l'accès :

| Niveau | Pour des données | Durée minimale de stockage | À retenir |
| --- | --- | --- | --- |
| **Chaud (Hot)** | Consultées fréquemment | Aucune | Le niveau par défaut ; coût de stockage le plus élevé, coût d'accès le plus bas |
| **Froid (Cool)** | Consultées peu fréquemment | 30 jours | Coût de stockage plus bas, coût d'accès plus élevé que le niveau chaud (Hot) |
| **Froid (Cold)** | Rarement consultées, mais qui doivent rester lisibles immédiatement | 90 jours | Coût de stockage plus bas, coût d'accès plus élevé que le niveau froid (Cool) |
| **Archive** | Conservées pour l'historique et presque jamais lues | 180 jours | Coût de stockage le plus bas ; l'objet blob est hors connexion |

- Les objets blob des niveaux chaud (Hot), froid (Cool) et froid (Cold) se lisent en quelques millisecondes. Un objet blob du niveau archive (Archive) doit d'abord être **réhydraté** en changeant son niveau en Hot, Cool ou Cold, ce qui peut prendre jusqu'à 15 heures.
- Supprimer un objet blob avant la durée minimale entraîne des frais de suppression anticipée.
- Une **stratégie de gestion du cycle de vie** déplace automatiquement les objets blob du niveau chaud (Hot) vers les niveaux froid (Cool), froid (Cold) et archive (Archive) selon le nombre de jours écoulés depuis leur dernière modification, et peut supprimer les objets blob obsolètes.
- Le **niveau intelligent** (smart tier), défini comme niveau d'accès par défaut d'un compte usage général v2 standard avec stockage redondant interzone (ZRS, GZRS ou RA-GZRS), déplace les objets blob de blocs entre les niveaux chaud (Hot), froid (Cool) et froid (Cold) selon leurs accès, sans stratégie à écrire ; il n'utilise pas le niveau archive (Archive).

**Azure Data Lake Storage Gen2** est le Stockage Blob avec l'**espace de noms hiérarchique** activé sur le compte de stockage. Les objets blob sont alors organisés dans de vrais répertoires, sur lesquels des listes de contrôle d'accès conformes à POSIX définissent les autorisations de chaque fichier et de chaque dossier. Les plateformes d'analytique comme Azure Databricks et Microsoft Fabric fonctionnent avec ce stockage. Un compte existant peut être mis à niveau, mais la mise à niveau est irréversible.

<!-- section: azure-files | objectives: 3.1.2 -->
## Azure Files

Azure Files fournit des **partages de fichiers réseau dans le cloud**, comme les partages d'un serveur de fichiers d'entreprise, sans matériel à acheter ni à entretenir. Un partage de fichiers se crée dans un compte de stockage et peut être monté par de nombreux utilisateurs et applications en même temps.

| Élément | Valeur |
| --- | --- |
| Protocoles | **SMB** (Server Message Block), utilisé par Windows, Linux et macOS ; **NFS** (Network File System), utilisé par les clients Linux |
| Contraintes de NFS | Non pris en charge sous Windows ; exige le niveau SSD ; l'accès se contrôle par un point de terminaison privé ou un point de terminaison de service d'un réseau virtuel |
| Niveaux de support | **HDD** : coût plus bas. **SSD** : débit plus élevé, à un tarif plus élevé |
| Taille maximale d'un fichier | 4 Tio |
| Accès simultanés | Jusqu'à 2 000 handles simultanés par fichier ou répertoire |

Moyens de charger et de conserver des données dans un partage :

- le **portail Azure**, pour charger directement des fichiers ;
- **AzCopy**, un utilitaire en ligne de commande qui copie des fichiers vers Azure Files ;
- **Azure File Sync**, un service qui synchronise des copies de fichiers partagés mises en cache localement avec les données d'Azure Files.

> **Piège d'examen.** Un « dossier partagé », un « lecteur mappé » ou le « remplacement d'un serveur de fichiers » désigne Azure Files, pas le Stockage Blob. On accède au Stockage Blob par une API ou une URL, on ne le monte pas comme un partage réseau en SMB.

<!-- section: table-storage | objectives: 3.1.3 -->
## Le Stockage Table Azure

Le Stockage Table Azure est un service **NoSQL** qui stocke des éléments **clé/valeur** dans des tables. Chaque élément est une ligne dont les colonnes contiennent ses champs de données.

- La clé d'une ligne a deux parties : la **clé de partition** (`PartitionKey`) identifie la partition qui contient la ligne, et la **clé de ligne** (`RowKey`) est unique dans cette partition.
- Une colonne d'**horodatage** enregistre la date de la dernière modification de la ligne. Toutes les autres colonnes peuvent varier d'une ligne à l'autre : les données sont **semi-structurées**.
- Les lignes de même clé de partition sont stockées ensemble, dans l'ordre de la clé de ligne. Les partitions sont indépendantes, et une recherche qui inclut la clé de partition lit moins de données.
- Une **requête de point** fournit les deux clés et retourne une seule ligne : c'est la recherche la plus rapide. Une **requête de plage** lit un bloc contigu de lignes dans une même partition.

| Aspect | Stockage Table Azure | Table relationnelle |
| --- | --- | --- |
| Schéma | Les colonnes peuvent différer d'une ligne à l'autre | Les mêmes colonnes pour toutes les lignes |
| Clé | Clé de partition plus clé de ligne | Clé primaire |
| Relations et objets | Pas de clé étrangère, pas de jointure, pas de procédure stockée, pas de vue | Clés étrangères, jointures, procédures stockées, vues |
| Conception | Dénormalisée : une ligne contient toutes les données d'une entité | Normalisée : les données sont réparties entre des tables liées |

**Azure Cosmos DB for Table** est un service plus récent qui utilise le même modèle clé/valeur, avec des performances et une disponibilité supérieures, une distribution mondiale et des index secondaires automatiques.

<!-- section: choosing-storage | objectives: 3.1.1, 3.1.2, 3.1.3 -->
## Choisir un service de stockage

| Besoin dans la question | Réponse |
| --- | --- |
| Stocker des images, des vidéos, des documents ou des sauvegardes à faible coût | Stockage Blob Azure, objets blob de blocs |
| Conserver des années, au coût le plus bas, des données rarement lues, en acceptant une récupération en plusieurs heures | Niveau archive (Archive) |
| Des dossiers avec des autorisations par répertoire, pour l'analytique à grande échelle | Azure Data Lake Storage Gen2 (espace de noms hiérarchique) |
| Remplacer un serveur de fichiers ; partage monté par plusieurs ordinateurs | Azure Files |
| Recherche rapide d'éléments semi-structurés par clé, dans un compte de stockage | Stockage Table Azure |

<!-- section: key-points -->
## Points clés

- Stockage Blob : données non structurées dans des conteneurs. Objets blob de blocs (usage général), de pages (disques virtuels, accès aléatoire), d'ajout (journaux).
- Niveaux : chaud (Hot, par défaut), froid (Cool, 30 jours), froid (Cold, 90 jours), archive (Archive, 180 jours, hors connexion, réhydratation nécessaire) ; les stratégies de cycle de vie déplacent ou suppriment les objets blob à mesure qu'ils vieillissent.
- Data Lake Storage Gen2 : le Stockage Blob plus l'espace de noms hiérarchique, avec des listes de contrôle d'accès POSIX.
- Azure Files : partages de fichiers en SMB ou NFS ; NFS exige le niveau SSD et n'est pas pris en charge sous Windows.
- Stockage Table : lignes clé/valeur NoSQL, clé de partition plus clé de ligne, pas de relations, pas de procédures stockées.
