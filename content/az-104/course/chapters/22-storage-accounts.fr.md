Un compte de stockage est le conteneur des services du Stockage Azure : objets blob, partages de fichiers, files d'attente et tables. Son type, sa redondance et son chiffrement se choisissent à la création ; certains de ces choix sont définitifs, et c'est précisément ce que l'examen teste.

<!-- section: account-types | objectives: 2.2.1 -->
## Créer et configurer des comptes de stockage

| Type de compte (`kind`) | Performances | Services | Redondance | Usage type |
| --- | --- | --- | --- | --- |
| Usage général v2 Standard (`StorageV2`) | Standard (HDD) | Objets blob, fichiers, files d'attente, tables | LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS | Le choix par défaut |
| Objets blob de blocs Premium (`BlockBlobStorage`) | Premium (SSD) | Objets blob de blocs et d'ajout | LRS, ZRS | Taux de transactions élevés, petits objets, faible latence |
| Partages de fichiers Premium (`FileStorage`) | Premium (SSD) | Azure Files uniquement | LRS, ZRS | Partages de fichiers d'entreprise ; **obligatoire pour les partages NFS** |
| Objets blob de pages Premium | Premium (SSD) | Objets blob de pages | LRS, ZRS | Objets blob de pages (disques non managés) |

Règles :

- Le nom est **unique au monde**, de 3 à 24 caractères, **lettres minuscules et chiffres uniquement** (pas de trait d'union). Il forme les points de terminaison : `https://<nom>.blob.core.windows.net`, `.file.`, `.queue.`, `.table.`, `.dfs.`, `.web.`.
- Le **type de compte ne peut pas être changé** après la création : pour passer de standard à premium, créez un nouveau compte et copiez les données.
- La redondance, le niveau d'accès par défaut (Hot, Cool ou Cold) et la plupart des paramètres de sécurité se modifient plus tard.
- L'**espace de noms hiérarchique** (Azure Data Lake Storage) se choisit à la création ; un compte existant peut être mis à niveau, mais pas rétrogradé.
- Types d'objets blob : objets blob de **blocs** (fichiers, jusqu'à environ 190 Tio), d'**ajout** (journaux), de **pages** (accès aléatoire, disques).

Paramètres de sécurité du compte : *Transfert sécurisé requis* (HTTPS seulement, activé par défaut), version TLS minimale, *Autoriser l'accès anonyme aux objets blob* (désactivé par défaut), *Autoriser l'accès à la clé du compte de stockage*.

```bash
az storage account create -g RG1 -n stcontoso001 -l westeurope \
  --kind StorageV2 --sku Standard_ZRS --access-tier Hot --min-tls-version TLS1_2
az storage account create -g RG1 -n stcontosofast -l westeurope \
  --kind BlockBlobStorage --sku Premium_LRS
```

```powershell
New-AzStorageAccount -ResourceGroupName RG1 -Name stcontoso001 -Location westeurope `
  -Kind StorageV2 -SkuName Standard_GRS
```

<!-- section: redundancy | objectives: 2.2.2 -->
## Redondance du stockage

Le Stockage Azure conserve toujours au moins trois copies. L'option de redondance décide où :

| Option | Copies | Survit à la panne d'un centre de données | Survit à la panne d'une zone | Survit à la panne d'une région | Lecture du secondaire sans basculement |
| --- | --- | --- | --- | --- | --- |
| **LRS** | 3, synchrones, un centre de données | Non | Non | Non | Non |
| **ZRS** | Synchrones, réparties sur trois zones de disponibilité ou plus | Oui | Oui | Non | Non |
| **GRS** | LRS dans la région primaire + 3 copies asynchrones (LRS) dans la région jumelée | Oui | Oui | Oui | Non |
| **RA-GRS** | GRS | Oui | Oui | Oui | **Oui** |
| **GZRS** | ZRS dans la région primaire + 3 copies asynchrones (LRS) dans la région jumelée | Oui | Oui | Oui | Non |
| **RA-GZRS** | GZRS | Oui | Oui | Oui | **Oui** |

Comment choisir d'après la formulation d'une question :

| Exigence | Réponse |
| --- | --- |
| Coût le plus bas, aucune exigence de résilience | LRS |
| « Rester disponible si un centre de données ou une zone tombe » dans la région ; les données doivent rester dans la région | ZRS |
| « Protéger contre une panne régionale » | GRS (ou GZRS si la résilience aux zones est aussi exigée) |
| « Les applications doivent pouvoir **lire** pendant une panne régionale », « sans basculement » | RA-GRS ou RA-GZRS |

Détails à connaître :

- Avec RA-GRS et RA-GZRS, le point de terminaison secondaire est `https://<nom>-secondary.blob.core.windows.net`. L'application doit être écrite pour l'utiliser. La réplication étant asynchrone, le secondaire peut avoir un léger retard : la propriété **Heure de la dernière synchronisation** (Last Sync Time) indique jusqu'à quand les écritures y sont garanties.
- La région secondaire est la **région jumelée** ; vous ne la choisissez pas.
- **Basculement.** Un *basculement non planifié géré par le client* fait du secondaire le nouveau primaire pendant que le primaire est indisponible ; le compte devient **LRS** dans la nouvelle région, les données écrites après l'heure de la dernière synchronisation sont perdues, et la géoredondance doit être reconfigurée. Un *basculement planifié* échange les deux régions quand elles sont toutes deux disponibles, sans perte de données. Un basculement géré par Microsoft n'a lieu que pour une région entière, dans des cas extrêmes.
- **Changer la redondance.** Ajouter ou retirer la géoréplication (LRS vers GRS, GRS vers RA-GRS) est un simple changement de paramètre (`az storage account update --sku Standard_GRS`). Ajouter ou retirer la redondance de **zone** (LRS vers ZRS) demande une **conversion** que vous lancez (`az storage account migration start`), sans interruption de service.
- Le **niveau archive** n'est pris en charge qu'avec LRS, GRS et RA-GRS : pas avec ZRS, GZRS ni RA-GZRS.
- Les comptes Premium ne prennent en charge que LRS et ZRS.

<!-- section: object-replication | objectives: 2.2.3 -->
## Réplication d'objets

La réplication d'objets copie de façon asynchrone des **objets blob de blocs** d'un conteneur d'un compte source vers un conteneur d'un compte de destination, dans la même région ou une autre, voire dans un autre abonnement ou un autre locataire. Elle sert à rapprocher les données des lecteurs ou à garder une copie dans une région de votre choix.

Prérequis et règles :

| Règle | Valeur |
| --- | --- |
| Types de comptes | Usage général v2 ou objets blob de blocs Premium, des deux côtés |
| **Contrôle de version des objets blob** | Activé sur la **source et la destination** |
| **Flux de modification** (change feed) | Activé sur la **source** |
| Stratégie | Une stratégie de réplication par couple source-destination, composée de règles (conteneur source, conteneur de destination, filtre de préfixe facultatif) |
| Destinations | Un compte source peut répliquer vers deux comptes de destination au plus |
| Conteneur de destination | Passe en lecture seule pour les écritures : écrire renvoie 409 (Conflict) ; les lectures et les suppressions restent possibles |
| Objets blob existants | Par défaut, seuls les objets blob créés après la règle sont copiés ; vous pouvez choisir de tout copier ou de partir d'une date donnée |
| Niveaux | Les objets blob source et destination peuvent être dans des niveaux en ligne différents ; les objets blob archivés ne sont pas réplicables |
| Entre locataires | Bloquée par défaut sur les comptes récents (`AllowCrossTenantReplication` = false) |

En ligne de commande, la stratégie est d'abord créée sur la destination ; son ID généré sert ensuite à créer la même stratégie sur la source. Le portail fait les deux étapes pour vous.

> **Piège d'examen.** La réplication d'objets n'est pas la redondance du compte. GRS copie tout le compte vers la région jumelée, sans choix de la cible ; la réplication d'objets copie des conteneurs choisis vers un compte que vous choisissez.

<!-- section: encryption | objectives: 2.2.4 -->
## Chiffrement du compte de stockage

Toutes les données écrites dans le Stockage Azure sont chiffrées au repos en AES 256 bits (**Storage Service Encryption**). Ce chiffrement est toujours actif, gratuit et impossible à désactiver. Ce que vous choisissez, c'est la clé :

| Option de clé | Qui gère la clé | Remarques |
| --- | --- | --- |
| **Clés gérées par Microsoft** | Microsoft | Valeur par défaut |
| **Clés gérées par le client** (CMK) | Vous, dans Azure Key Vault ou un HSM managé | S'applique au compte ou à une étendue de chiffrement |
| Clés fournies par le client | Le client envoie la clé avec chaque requête au Stockage Blob | Objets blob uniquement |

Exigences des clés gérées par le client :

- Le coffre de clés doit avoir la **suppression réversible et la protection contre le vidage** (purge protection) activées.
- La clé est de type RSA (ou RSA-HSM) de 2048, 3072 ou 4096 bits.
- Le compte de stockage accède au coffre avec une **identité managée** qui doit avoir les autorisations `get`, `wrapKey` et `unwrapKey` (rôle *Key Vault Crypto Service Encryption User*). Quand la CMK est configurée **à la création du compte**, l'identité doit être **affectée par l'utilisateur** ; sur un compte existant, une identité affectée par le système convient aussi.
- Si aucune version de clé n'est précisée, le compte adopte automatiquement les nouvelles versions de la clé.
- Par défaut, les files d'attente et les tables ne sont pas couvertes par une clé gérée par le client. Elles ne le sont que si le compte a été **créé** avec des clés à l'échelle du compte pour ces services ; ce choix est définitif.
- Désactiver ou supprimer la clé rend les données inaccessibles.

Deux autres fonctionnalités :

- Le **chiffrement d'infrastructure** ajoute une seconde couche de chiffrement avec une autre clé gérée par Microsoft. Pour tout le compte, il ne s'active **qu'à la création**.
- Une **étendue de chiffrement** applique sa propre clé (gérée par Microsoft ou par le client) à un conteneur ou à des objets blob individuels. Un conteneur peut avoir une étendue par défaut et interdire d'y déroger. Une étendue se désactive mais ne se supprime pas.

Le chiffrement **en transit** est distinct : *Transfert sécurisé requis* impose HTTPS et le chiffrement SMB.

<!-- section: storage-tools | objectives: 2.2.5 -->
## Explorateur Stockage Azure et AzCopy

L'**Explorateur Stockage Azure** (Azure Storage Explorer) est une application graphique pour Windows, macOS et Linux (le portail propose un *navigateur de stockage* comparable). Vous y chargez, téléchargez et gérez objets blob, fichiers, files d'attente et tables, changez les niveaux et générez des SAS.

- Se connecter avec un compte Microsoft Entra liste les abonnements et les comptes, ce qui demande un accès en lecture au plan de contrôle (Reader). Les opérations sur les données utilisent ensuite vos rôles de données ou, si vous détenez `listKeys`, la clé du compte.
- Sans accès au plan de contrôle, **attachez** directement une ressource : par son URL avec Microsoft Entra ID, par une URL SAS, ou par nom de compte et clé.

**AzCopy** est l'outil en ligne de commande pour les transferts vers, depuis et entre comptes de stockage.

```bash
azcopy login                      # Microsoft Entra ID; or append a SAS token to each URL
azcopy make  "https://stor1.blob.core.windows.net/backups"
azcopy copy  "C:\data" "https://stor1.blob.core.windows.net/backups" --recursive
azcopy copy  "https://stor1.blob.core.windows.net/c1?<SAS>" \
             "https://stor2.blob.core.windows.net/c1?<SAS>" --recursive
azcopy sync  "C:\data" "https://stor1.blob.core.windows.net/backups" --delete-destination=true
```

| Commande | Comportement |
| --- | --- |
| `azcopy copy` | Copie tout de la source vers la destination. Entre deux comptes, la copie se fait de serveur à serveur, sans passer par votre ordinateur |
| `azcopy sync` | Compare les noms et les dates de dernière modification et ne transfère que ce qui est nouveau ou modifié. Ne supprime les fichiers en trop à la destination qu'avec `--delete-destination=true` |
| `azcopy make` / `list` / `remove` | Créer un conteneur ou un partage, lister, supprimer |

Autorisation :

- Avec Microsoft Entra ID, l'identité a besoin d'un **rôle de données** : Storage Blob Data Reader pour télécharger, Storage Blob Data Contributor pour charger. Owner ou Contributor seuls ne suffisent pas.
- Avec une SAS, chaque URL qui demande une autorisation porte son propre jeton.
- AzCopy n'accepte pas directement la clé du compte.
- Options utiles : `--recursive`, `--include-pattern`, `--exclude-pattern`, `--dry-run`, `--block-blob-tier`.

Pour les très gros transferts hors ligne, Azure propose les appareils Data Box et le service Import/Export (envoi de disques).

<!-- section: key-points -->
## Points clés

- Nom : 3 à 24 lettres minuscules et chiffres. Le type de compte est définitif ; la redondance ne l'est pas.
- Comptes Premium : LRS ou ZRS seulement. Partages NFS : compte de partages de fichiers Premium.
- LRS (un centre de données), ZRS (trois zones ou plus), GRS (plus la région jumelée), RA- (secondaire lisible, point de terminaison `-secondary`), GZRS (zones plus région).
- Un basculement non planifié laisse le compte en LRS. L'archive n'existe pas avec ZRS, GZRS, RA-GZRS.
- Réplication d'objets : objets blob de blocs, contrôle de version sur les deux comptes, flux de modification sur la source, destination en lecture seule.
- Le chiffrement au repos est toujours actif. Clés gérées par le client : coffre avec suppression réversible et protection contre le vidage, identité managée. Chiffrement d'infrastructure : à la création seulement.
- `azcopy sync` transfère les différences ; `azcopy copy` copie tout. Les rôles de données sont obligatoires avec Microsoft Entra ID.
