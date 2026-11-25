Le Stockage Azure propose plusieurs services de données dans un même compte de stockage. L'examen vous demande d'associer un type de données à un service, un mode d'usage à un niveau, un besoin de résilience à une option de redondance, et un besoin de transfert à un outil.

<!-- section: storage-accounts | objectives: 2.3.4 -->
## Comptes de stockage et types de stockage

Un **compte de stockage** est le conteneur de vos données du Stockage Azure. Son nom est unique au monde, de 3 à 24 caractères, lettres minuscules et chiffres uniquement, car il forme l'adresse des données.

| Type de compte | Services pris en charge | Options de redondance | Usage |
| --- | --- | --- | --- |
| **Usage général v2 Standard** | Stockage Blob (y compris Data Lake Storage), Stockage File d'attente, Stockage Table, Azure Files | LRS, GRS, RA-GRS, ZRS, GZRS, RA-GZRS | Le choix standard pour la plupart des scénarios |
| **Objets blob de blocs Premium** | Objets blob de blocs et d'ajout | LRS, ZRS | Taux de transactions élevés, petits objets, faible latence |
| **Partages de fichiers Premium** | Azure Files | LRS, ZRS | Partages de fichiers d'entreprise ou à hautes performances |
| **Objets blob de pages Premium** | Objets blob de pages | LRS, ZRS | Objets blob de pages uniquement |

Les comptes Premium utilisent des disques SSD ; ils n'offrent pas de géoredondance.

Chaque service a son propre point de terminaison :

| Service | Point de terminaison |
| --- | --- |
| Stockage Blob | `https://<account>.blob.core.windows.net` |
| Data Lake Storage | `https://<account>.dfs.core.windows.net` |
| Azure Files | `https://<account>.file.core.windows.net` |
| Stockage File d'attente | `https://<account>.queue.core.windows.net` |
| Stockage Table | `https://<account>.table.core.windows.net` |

<!-- section: storage-services | objectives: 2.3.1 -->
## Comparer les services de stockage Azure

| Service | Stocke | Usage type |
| --- | --- | --- |
| **Objets blob Azure** | D'énormes quantités de données **non structurées** : objets texte ou binaires, dans des conteneurs | Images et documents servis à un navigateur, diffusion vidéo et audio, sauvegardes, archives, données à analyser |
| **Azure Files** | Des **partages de fichiers** entièrement managés, accessibles en SMB ou NFS | Remplacer ou étendre des serveurs de fichiers ; partages montés en même temps depuis Azure et depuis le réseau local, sous Windows, Linux et macOS |
| **Files d'attente Azure** | Des **messages** entre composants d'application, de 64 Ko au plus chacun, par millions | Découpler des composants et constituer une file de travaux à traiter de façon asynchrone |
| **Disques Azure** | Des volumes de niveau bloc gérés par Azure | Les disques des machines virtuelles |
| **Tables Azure** | Des données **structurées non relationnelles** (NoSQL), sous forme de clés et d'attributs | Des jeux de données souples comme des carnets d'adresses ou des métadonnées d'appareils |

Tous sont durables, hautement disponibles, sécurisés (chiffrés), scalables, gérés par Microsoft et accessibles en HTTP ou HTTPS depuis n'importe où.

<!-- section: storage-tiers | objectives: 2.3.2 -->
## Niveaux de stockage

Les niveaux d'accès des objets blob permettent de payer moins cher les données rarement lues :

| Niveau | Pour des données | Durée minimale | Coût de stockage | Coût d'accès |
| --- | --- | --- | --- | --- |
| **Chaud (Hot)** | Consultées fréquemment | Aucune | Le plus élevé | Le plus bas |
| **Froid (Cool)** | Consultées peu fréquemment | 30 jours | Plus bas | Plus élevé |
| **Froid (Cold)** | Rarement consultées | 90 jours | Encore plus bas | Encore plus élevé |
| **Archive** | Rarement consultées, avec des exigences de latence souples | 180 jours | Le plus bas | Le plus élevé |

- Les niveaux chaud (Hot), froid (Cool) et froid (Cold) sont des niveaux **en ligne** : les données sont disponibles immédiatement.
- Le niveau archive (Archive) est **hors connexion** : les données doivent être **réhydratées** vers un niveau en ligne avant d'être lues, ce qui prend des heures.
- Un niveau par défaut, chaud (Hot), froid (Cool) ou froid (Cold), se règle sur le compte ; le niveau archive (Archive) se règle **objet blob par objet blob**, jamais au niveau du compte.

<!-- section: redundancy | objectives: 2.3.3 -->
## Options de redondance

Le Stockage Azure conserve toujours plusieurs copies de vos données. L'option décide où elles se trouvent :

| Option | Copies | Protège contre |
| --- | --- | --- |
| **LRS**, localement redondant | Trois copies dans **un centre de données** de la région primaire | La panne d'un disque ou d'un rack de serveurs |
| **ZRS**, redondant interzone | Trois copies dans **trois zones de disponibilité** de la région primaire | La panne d'un centre de données |
| **GRS**, géoredondant | LRS dans la région primaire, plus trois copies dans la **région jumelée** | La panne d'une région |
| **GZRS**, géoredondant interzone | ZRS dans la région primaire, plus trois copies dans la région jumelée | La panne d'une zone et d'une région ; la protection la plus élevée |
| **RA-GRS**, **RA-GZRS** | Comme GRS ou GZRS, avec un **accès en lecture** à la copie secondaire à tout moment | Idem, et la lecture reste possible pendant une panne régionale |

LRS est l'option la moins chère et la moins durable. Avec GRS et GZRS, les données de la région secondaire ne sont lisibles qu'après un basculement, sauf si l'accès en lecture (RA-) est activé. La copie vers la région secondaire est asynchrone.

<!-- section: moving-files | objectives: 2.3.5 -->
## Déplacer des fichiers

| Outil | Type | Usage |
| --- | --- | --- |
| **AzCopy** | Utilitaire en ligne de commande | Copier des objets blob ou des fichiers vers, depuis et entre comptes de stockage ; peut synchroniser dans **un seul sens** (de la source vers la destination). Scriptable |
| **Explorateur Stockage Azure** | Application graphique pour Windows, macOS et Linux | Parcourir et gérer objets blob et fichiers, charger et télécharger ; utilise AzCopy en arrière-plan |
| **Azure File Sync** | Service avec un agent sur Windows Server | Centraliser les partages de fichiers dans Azure Files tout en gardant un serveur de fichiers Windows local comme cache rapide ; reste **synchronisé dans les deux sens**, et la **hiérarchisation cloud** ne garde en local que les fichiers souvent utilisés |

Azure File Sync est la réponse quand les utilisateurs doivent continuer d'accéder à un serveur de fichiers local avec les protocoles habituels alors que les données vivent dans Azure, ou quand plusieurs sites ont besoin des mêmes fichiers.

<!-- section: migration-options | objectives: 2.3.6 -->
## Options de migration

**Azure Migrate** est le hub de migration d'un environnement local vers Azure. Il fournit un portail unique pour **découvrir, évaluer et migrer** serveurs, bases de données, applications web et bureaux virtuels, avec des outils intégrés :

| Outil | Rôle |
| --- | --- |
| Découverte et évaluation | Trouver les serveurs locaux (VMware, Hyper-V, physiques) et vérifier qu'ils sont prêts pour Azure |
| Migration et modernisation | Migrer les machines vers Azure |
| Azure Database Migration Service | Migrer les bases de données |
| Assistant de migration App Service | Évaluer et migrer des applications web vers Azure App Service |
| Azure Data Box | Déplacer de grandes quantités de données hors connexion |

**Azure Data Box** est un appareil physique que Microsoft vous expédie. Vous y copiez les données et vous le renvoyez ; Microsoft les charge dans votre compte de stockage, puis efface l'appareil. Les appareils de nouvelle génération contiennent jusqu'à 120 ou 525 téraoctets de données utiles ; l'ancien appareil de 80 téraoctets est retiré région par région.

| Choisissez Data Box quand | Exemples |
| --- | --- |
| Le volume de données est important et le réseau limité ou trop lent | Migration ponctuelle d'une médiathèque ; transfert initial en masse suivi d'incréments par le réseau ; envois périodiques depuis un site distant |
| Vous devez **sortir** des données d'Azure vers votre centre de données | Reprise d'activité, exigences réglementaires, retour en local |

<!-- section: key-points -->
## Points clés

- Objets blob : objets non structurés. Files : partages de fichiers managés. Files d'attente : messages. Disques : volumes de machines virtuelles. Tables : données NoSQL clé-attribut.
- Usage général v2 Standard est le type de compte par défaut ; les comptes Premium sont seulement LRS ou ZRS.
- Niveaux chaud (Hot), froid (Cool, 30 jours), froid (Cold, 90 jours), archive (Archive, 180 jours, hors connexion, par objet blob).
- LRS : un centre de données. ZRS : trois zones. GRS : région jumelée. GZRS : zones plus région. RA- : secondaire lisible.
- AzCopy : ligne de commande. Explorateur Stockage : graphique. File Sync : serveur Windows local synchronisé avec Azure Files.
- Azure Migrate : découvrir, évaluer, migrer. Data Box : expédier les données sur un appareil quand le réseau ne suffit pas.
