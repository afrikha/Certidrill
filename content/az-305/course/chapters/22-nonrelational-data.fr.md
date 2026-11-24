Les données semi-structurées (documents JSON, entités clé-valeur, graphes) vont dans Azure Cosmos DB ou dans Stockage Table Azure ; les données non structurées (fichiers, images, journaux, disques) vont dans Stockage Azure. L'examen vous demande ensuite d'affiner le choix : cohérence, mode de capacité, niveau d'accès, redondance, protection contre la suppression.

<!-- section: semi-structured | objectives: 2.2.1 -->
## Stocker des données semi-structurées

**Azure Cosmos DB** est la recommandation par défaut pour les données NoSQL opérationnelles : lectures et écritures en moins de 10 ms au 99e centile, débit élastique et réplication vers un nombre quelconque de régions, ajoutées ou retirées à tout moment sans redéployer l'application. Choisissez l'API d'après le modèle de données et ce que l'application utilise déjà :

| Scénario | API |
| --- | --- |
| Nouvelle application, documents JSON, requêtes de type SQL | NoSQL |
| Application MongoDB existante à migrer sans la réécrire | MongoDB |
| Charge de travail Cassandra existante, CQL, données en colonnes larges | Apache Cassandra |
| Relations à parcourir (graphe social, recommandations) | Apache Gremlin |
| Application Stockage Table Azure existante qui a besoin de distribution mondiale, de faible latence ou d'indexation automatique | Table |

**Stockage Table Azure** reste la réponse pour un magasin clé-valeur simple et peu coûteux : vous ne payez que la capacité utilisée, sans débit à réserver, mais sans distribution mondiale clé en main, sans indexation automatique de toutes les propriétés et sans les garanties de latence de Cosmos DB.

**Clé de partition.** Une partition logique (une valeur de clé de partition) contient au plus 20 Go ; une partition physique fournit jusqu'à 10 000 unités de requête par seconde (RU/s) et 50 Go. Une bonne clé a une cardinalité élevée, répartit uniformément le stockage et les requêtes et sert de filtre dans la plupart des requêtes. Elle ne peut pas être modifiée sur place : il faut copier les données dans un nouveau conteneur.

**Cohérence.** Cinq niveaux, définis par défaut au niveau du compte (Session par défaut) et que l'on peut seulement assouplir par requête avec le remplacement classique (une stratégie de lecture en préversion des SDK Java et .NET, en mode direct, peut aussi renforcer une lecture) :

| Niveau | Garantie | Usage type |
| --- | --- | --- |
| Strong (forte) | Les lectures renvoient toujours la dernière écriture validée | Aucune tolérance aux lectures obsolètes ; RPO de 0 entre régions |
| Bounded staleness (obsolescence limitée) | Les lectures ont au plus K versions ou T secondes de retard | Cohérence quasi forte avec un retard borné |
| Session | Dans une session, un client relit ses propres écritures | La plupart des applications (par défaut) |
| Consistent prefix (préfixe cohérent) | Les lectures ne voient jamais les écritures dans le désordre | Fils d'actualité, mises à jour d'état |
| Eventual (éventuelle) | Aucune garantie d'ordre ; les réplicas convergent avec le temps | Compteurs, mentions « J'aime » ; latence et coût les plus bas |

Les niveaux Strong et Bounded staleness lisent sur deux réplicas : une lecture y coûte deux fois plus de RU qu'avec les trois niveaux plus faibles.

> **Piège d'examen.** Un compte à plusieurs régions d'écriture ne peut pas utiliser la cohérence Strong. « Écritures dans chaque région » et « toujours lire la dernière version validée » ne peuvent pas être satisfaits ensemble : avec des écritures multirégions, le niveau le plus fort est Bounded staleness.

**Mode de capacité.**

| Mode | Facturation | À recommander quand |
| --- | --- | --- |
| Débit approvisionné, standard (manuel) | RU/s approvisionnées, par heure | Trafic stable et prévisible |
| Débit approvisionné, mise à l'échelle automatique | RU/s les plus élevées atteintes dans chaque heure, entre 10 % et 100 % du maximum que vous fixez | Trafic variable ou imprévisible, nouvelles applications |
| Serverless | RU consommées | Trafic intermittent, développement et test, faible utilisation moyenne. Une seule région |

Un compte multirégion offre une disponibilité de 99,999 % en lecture et en écriture. Toute exigence de distribution mondiale implique le débit approvisionné, puisqu'un compte serverless s'exécute dans une seule région.

<!-- section: unstructured | objectives: 2.2.2 -->
## Stocker des données non structurées

| Exigence | Service |
| --- | --- |
| Objets accessibles en HTTPS de partout : images, vidéos, sauvegardes, journaux | Stockage Blob Azure |
| Analytique Big Data, répertoires, autorisations POSIX au niveau des fichiers | Azure Data Lake Storage (Stockage Blob avec l'espace de noms hiérarchique activé) |
| Système de fichiers partagé pour des applications migrées telles quelles (lift-and-shift), remplacement de serveurs de fichiers | Azure Files (SMB ou NFS) |
| Cache d'un partage de fichiers cloud sur des serveurs de fichiers Windows dans les succursales | Azure Files avec Azure File Sync |
| Charges de travail de fichiers exigeantes : SAP HANA, HPC, NFSv3, NFSv4.1 et SMB dans un seul service | Azure NetApp Files |
| Stockage par blocs persistant pour une machine virtuelle | Disques managés Azure |

Le **type de compte de stockage** détermine les services et la redondance disponibles :

| Type de compte | Services | Redondance | Usage |
| --- | --- | --- | --- |
| Standard usage général v2 | Objets blob (y compris Data Lake Storage), fichiers, files d'attente, tables | LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS | Choix par défaut ; le seul des trois à offrir les niveaux d'accès et la géoredondance |
| Objets blob de blocs Premium | Objets blob de blocs et d'ajout | LRS, ZRS | Taux de transactions élevés, petits objets, latence constamment faible |
| Partages de fichiers Premium | Azure Files uniquement | LRS, ZRS | Partages de fichiers d'entreprise ou hautes performances ; obligatoire pour les partages NFS |

**Azure Data Lake Storage** n'est pas un service distinct : c'est un ensemble de capacités du Stockage Blob, débloquées par l'espace de noms hiérarchique. Renommer ou supprimer un répertoire devient une seule opération atomique, l'accès est contrôlé par Azure RBAC et par des ACL POSIX sur les répertoires et les fichiers, et le tarif est celui du Stockage Blob.

**Azure Files.** Les partages SMB existent sur support SSD (Premium) et HDD (Standard) ; les partages NFS 4.1 ne sont en disponibilité générale que sur SSD (NFS sur HDD est en préversion, LRS uniquement), et les partages NFS ne prennent jamais en charge GRS ni GZRS. Pour les nouveaux déploiements NFS, Learn recommande le fournisseur de ressources `Microsoft.FileShares` : un partage de fichiers autonome, sans compte de stockage. Les partages SMB prennent en charge l'accès basé sur l'identité avec Active Directory Domain Services local, Microsoft Entra Domain Services ou Microsoft Entra Kerberos.

> **Piège d'examen.** « Les clients Linux montent le partage en NFS » impose un compte de partages de fichiers Premium (SSD), qui n'a pas de géoredondance : seulement LRS ou ZRS. Une copie dans une autre région doit alors être conçue séparément ; GRS n'est pas une option.

<!-- section: performance-cost | objectives: 2.2.3 -->
## Équilibrer les fonctionnalités, les performances et les coûts

Les **niveaux d'accès des objets blob** arbitrent entre prix du stockage et prix de l'accès, dans les comptes standard usage général v2.

| | Niveau chaud (Hot) | Niveau froid (Cool) | Niveau froid (Cold) | Niveau archive (Archive) |
| --- | --- | --- | --- | --- |
| Destiné aux | Données consultées ou modifiées fréquemment | Données peu consultées | Données rarement consultées qui doivent rester lisibles immédiatement | Données rarement consultées qui tolèrent des heures de délai |
| Rétention minimale avant des frais de suppression anticipée | Aucune | 30 jours | 90 jours | 180 jours |
| Délai d'obtention du premier octet | Millisecondes | Millisecondes | Millisecondes | Heures (hors connexion ; la réhydratation peut prendre jusqu'à 15 heures) |
| Disponibilité | 99,9 % | 99 % | 99 % | 99 % |
| Coût du stockage | Le plus élevé | Plus bas | Encore plus bas | Le plus bas |
| Coût d'accès et de transaction | Le plus bas | Plus élevé | Encore plus élevé | Le plus élevé |

Le niveau par défaut du compte peut être chaud (Hot), froid (Cool) ou froid (Cold), jamais archive (Archive). Le niveau archive (Archive) n'est pris en charge qu'avec LRS, GRS et RA-GRS, pas avec ZRS, GZRS ni RA-GZRS. Un objet blob archivé doit être réhydraté vers un niveau en ligne avant de pouvoir être lu.

> **Piège d'examen.** « Doit être disponible en quelques minutes » ou « lu immédiatement lors d'un audit » exclut le niveau archive (Archive), même si les données sont très rarement consultées : choisissez le niveau froid (Cold). « Conservé 7 ans, restauré en une journée au plus » désigne le niveau archive (Archive).

Les stratégies de **gestion du cycle de vie** déplacent les objets blob de blocs vers un niveau plus froid ou suppriment des objets blob, des versions et des instantanés, selon la date de création, la date de dernière modification ou la date de dernier accès (avec le suivi de l'heure d'accès activé), en filtrant par préfixe ou par étiquettes d'index de blob. Ces stratégies sont gratuites ; une règle peut ramener un objet blob du niveau froid (Cool) au niveau chaud (Hot) quand il est consulté, mais ne peut pas réhydrater un objet blob archivé. Quand les modèles d'accès sont inconnus, le **niveau intelligent (smart tier)** déplace automatiquement les données entre les niveaux chaud (Hot), froid (Cool) et froid (Cold).

**Choix de performances.**

| Besoin | Choix |
| --- | --- |
| Taux de transactions très élevé sur de petits objets, latence constamment faible | Compte d'objets blob de blocs Premium |
| Partage de fichiers à forte intensité d'E/S, latence de quelques millisecondes | Partage de fichiers SSD (Premium) |
| Partage de fichiers à usage général au coût le plus bas | Partage de fichiers HDD |
| Bases de données de premier plan, SAP HANA ; IOPS et débit ajustables sans redémarrer la machine virtuelle | Ultra Disk (jusqu'à 400 000 IOPS) |
| Charges de travail de production exigeant une faible latence et un réglage fin des performances | Premium SSD v2 (jusqu'à 80 000 IOPS) |
| Charges de travail de production, disque de système d'exploitation compris | Premium SSD (jusqu'à 20 000 IOPS) |
| Serveurs web, développement et test ; sauvegardes et données peu consultées | Standard SSD ; Standard HDD |

Les disques Ultra Disk et Premium SSD v2 ne peuvent pas servir de disque de système d'exploitation et ne prennent pas en charge ZRS ; seuls les disques Premium SSD et Standard SSD proposent ZRS.

Les nouveaux partages Azure Files devraient utiliser le modèle de facturation provisionné v2 (stockage, IOPS et débit provisionnés séparément, sur SSD ou HDD). Le modèle de paiement à l'utilisation, réservé au HDD, comporte trois niveaux d'accès : optimisé pour les transactions (prix de transaction le plus bas), chaud, et froid (prix de stockage le plus bas, prix de transaction le plus élevé). Pour des volumes prévisibles, la capacité réservée réduit le prix du stockage contre un engagement d'un an ou de trois ans.

<!-- section: protection-durability | objectives: 2.2.4 -->
## Protéger les données et garantir la durabilité

La **redondance** fixe la durabilité et ce à quoi les données survivent :

| Option | Copies | Durabilité sur un an | Survit à |
| --- | --- | --- | --- |
| LRS | Trois, dans un seul centre de données | 11 neuf | Panne de disque, de nœud ou de rack |
| ZRS | Synchrones, dans trois zones de disponibilité ou plus | 12 neuf | Perte d'un centre de données ou d'une zone |
| GRS / RA-GRS | LRS dans la région primaire et une copie LRS asynchrone dans la région secondaire | 16 neuf | Perte de la région (après basculement) |
| GZRS / RA-GZRS | ZRS dans la région primaire et une copie LRS asynchrone dans la région secondaire | 16 neuf | Perte d'une zone sans interruption, et perte de la région |

Avec GRS et GZRS, la copie secondaire ne peut pas être lue avant un basculement. RA-GRS et RA-GZRS exposent en permanence un point de terminaison secondaire en lecture seule (`account-secondary.blob.core.windows.net`) ; Azure Files ne le prend pas en charge. La géoréplication est asynchrone : les écritures les plus récentes peuvent être perdues lors d'un sinistre régional ; la propriété Heure de la dernière synchronisation (Last Sync Time) indique le retard de la région secondaire.

> **Conseil d'examen.** « Panne de zone, les données doivent rester dans la région » désigne ZRS ; « panne régionale » désigne GRS ; « panne régionale et l'application continue de lire pendant la panne » désigne RA-GRS ; « panne de zone sans interruption et protection régionale » désigne GZRS (RA-GZRS pour lire dans la région secondaire).

La redondance ne protège ni de la suppression, ni de l'écrasement, ni d'un rançongiciel : ils sont répliqués eux aussi. Ajoutez les fonctionnalités de protection des données :

| Risque | Fonctionnalité |
| --- | --- |
| Compte de stockage supprimé ou reconfiguré | Verrou Azure Resource Manager (CanNotDelete ou ReadOnly) |
| Conteneur supprimé | Suppression réversible de conteneur |
| Objet blob supprimé ou écrasé | Suppression réversible des objets blob, contrôle de version des objets blob |
| Corruption logique de nombreux objets blob de blocs | Restauration à un instant dans le passé (repose sur le contrôle de version, le flux de modification et la suppression réversible) |
| Enregistrements qui ne doivent être ni modifiés ni supprimés pendant une durée fixe (WORM) | Stockage immuable : stratégie de rétention limitée dans le temps |
| Données à préserver jusqu'à la fin d'une enquête | Stockage immuable : conservation légale |
| Copie des objets blob de blocs dans un autre compte ou une autre région | Réplication d'objets (asynchrone ; exige le contrôle de version sur les deux comptes et le flux de modification sur la source) |
| Suppression du compte, rançongiciel | Sauvegarde archivée (vaulted backup) de Sauvegarde Azure |

**Stockage immuable.** Une stratégie de rétention limitée dans le temps garde les objets blob lisibles mais ni modifiables ni supprimables pendant un intervalle de 1 jour à 146 000 jours. Tant qu'elle est déverrouillée, la stratégie peut être raccourcie ou supprimée ; une fois **verrouillée**, elle ne peut qu'être prolongée, et seule une stratégie verrouillée satisfait la règle SEC 17a-4(f). Une conservation légale n'a pas de date de fin et dure jusqu'à sa levée explicite.

> **Piège d'examen.** La suppression réversible et le contrôle de version aident à récupérer des données mais n'empêchent pas un administrateur de les retirer. Une exigence réglementaire du type « personne, administrateurs compris, ne peut supprimer les enregistrements pendant 7 ans » demande une stratégie de rétention limitée dans le temps verrouillée, pas la suppression réversible ni un verrou de ressource.

Les données sont toujours chiffrées au repos ; utilisez des clés gérées par le client dans Azure Key Vault quand l'organisation doit contrôler la clé.

**Azure Cosmos DB.** La sauvegarde périodique, mode par défaut, effectue une sauvegarde complète toutes les 4 heures et conserve les deux dernières ; restaurer suppose d'ouvrir une demande de support, et les données reviennent dans un nouveau compte. La sauvegarde continue (7, 30 ou 35 jours) offre la restauration à un instant dans le passé en libre-service ; un compte passé en mode continu ne peut pas revenir au mode périodique. Lors d'une panne régionale, le RPO d'un compte multirégion dépend du niveau de cohérence : 0 avec Strong, K et T avec Bounded staleness, moins de 15 minutes avec les niveaux plus faibles.

<!-- section: key-points -->
## Points clés

- L'API Cosmos DB suit l'application existante : NoSQL pour de nouveaux documents, MongoDB, Cassandra, Gremlin pour les graphes, Table pour faire évoluer Stockage Table.
- Session est la cohérence par défaut ; Strong donne un RPO de 0 mais est impossible avec plusieurs régions d'écriture ; le serverless est limité à une région.
- Stockage Blob pour les objets, Data Lake Storage pour l'analytique avec ACL, Azure Files pour les partages SMB et NFS (NFS exige Premium), NetApp Files pour les charges de travail de fichiers les plus exigeantes.
- Niveaux chaud (Hot), froid (Cool, 30 jours), froid (Cold, 90 jours), archive (Archive, 180 jours, hors connexion, des heures pour lire) ; la gestion du cycle de vie automatise les déplacements.
- LRS protège d'une panne matérielle, ZRS d'une zone, GRS d'une région ; RA- ajoute la lecture dans la région secondaire ; les comptes Premium et le niveau archive (Archive) ont des restrictions.
- La redondance n'est pas une sauvegarde : suppression réversible, contrôle de version et restauration à un instant dans le passé contre les erreurs, stratégies d'immuabilité verrouillées pour la conformité.
