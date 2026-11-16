Azure Files fournit des partages de fichiers managés ; le Stockage Blob stocke des objets dans des conteneurs. Ce chapitre couvre leur création, les niveaux d'accès et les fonctionnalités qui protègent les données contre la suppression et l'écrasement.

<!-- section: file-shares | objectives: 2.3.1 -->
## Partages de fichiers Azure

Un partage de fichiers Azure est un partage entièrement managé que des clients Windows, Linux et macOS montent, dans Azure ou en local.

| Protocole | Port | Disponible sur | Authentification |
| --- | --- | --- | --- |
| **SMB** (2.1, 3.0, 3.1.1) | TCP 445 | Partages standard (HDD) et premium (SSD) | Basée sur l'identité (Kerberos) ou clé du compte de stockage |
| **NFS** 4.1 | TCP 2049 | **Partages premium (SSD) uniquement**, dans un compte `FileStorage` | Basée sur le réseau : règles de réseau virtuel ou point de terminaison privé ; pas d'ACL Windows |

Un partage utilise **soit SMB, soit NFS**, au choix à la création ; les deux sortes peuvent coexister dans le même compte premium.

Niveaux des partages standard, modifiables à tout moment entre eux :

| Niveau | Coût de stockage | Coût des transactions | Usage |
| --- | --- | --- | --- |
| Optimisé pour les transactions | Le plus élevé des niveaux standard | Le plus bas | Charges à forte activité transactionnelle, **migrations** |
| Chaud (Hot) | Moyen | Moyen | Partages d'équipe généralistes |
| Froid (Cool) | Le plus bas | Le plus élevé | Archives qui restent en ligne |
| Premium | Taille provisionnée (SSD) | Inclus | Faible latence, IOPS élevées ; type de compte distinct |

On ne peut pas faire passer un partage de standard (HDD) à premium (SSD) ni l'inverse : créez un nouveau partage et copiez les données.

- Le **quota** est la taille maximale du partage (jusqu'à 100 Tio).
- Montage : le bouton **Connecter** du portail fournit un script prêt à l'emploi par système d'exploitation.

```powershell
net use Z: \\stor1.file.core.windows.net\share1 /user:Azure\stor1 <storage account key>
```

```bash
sudo mount -t cifs //stor1.file.core.windows.net/share1 /mnt/share1 \
  -o username=stor1,password=<storage account key>,serverino,nosharesock,actimeo=30
```

- Si le port 445 est bloqué, le montage par internet échoue. Depuis le réseau local, utilisez un VPN ou ExpressRoute avec un point de terminaison privé.
- **Azure File Sync** synchronise des serveurs de fichiers Windows avec un partage de fichiers Azure : un *service de synchronisation de stockage* contient des *groupes de synchronisation* ; chaque groupe a un seul **point de terminaison cloud** (le partage) et un ou plusieurs **points de terminaison de serveur** (des dossiers sur des serveurs inscrits, équipés de l'agent). La **hiérarchisation cloud** (cloud tiering) ne garde sur le serveur que les fichiers utilisés récemment.

```bash
az storage share-rm create -g RG1 --storage-account stor1 --name share1 \
  --quota 1024 --access-tier TransactionOptimized
```

<!-- section: blob-containers | objectives: 2.3.2 -->
## Conteneurs d'objets blob

Un conteneur regroupe des objets blob ; un compte contient autant de conteneurs que nécessaire. URL d'un objet blob : `https://<compte>.blob.core.windows.net/<conteneur>/<blob>`. Un nom de conteneur fait 3 à 63 caractères : lettres minuscules, chiffres et traits d'union. Les « dossiers » ne sont que des préfixes dans les noms d'objets blob (`2026/11/report.pdf`), sauf si le compte a un espace de noms hiérarchique.

L'**accès anonyme** dépend de deux réglages :

1. Le paramètre du compte *Autoriser l'accès anonyme aux objets blob* (désactivé par défaut). Quand il est désactivé, aucun conteneur ne peut être anonyme, quel que soit son niveau.
2. Le **niveau d'accès** du conteneur :

| Niveau | Les clients anonymes peuvent |
| --- | --- |
| Privé (aucun accès anonyme) | Rien. Valeur par défaut |
| Blob | Lire un objet blob dont ils connaissent l'URL. Impossible de lister le conteneur |
| Conteneur | Lire et **lister** les objets blob du conteneur |

```bash
az storage container create --account-name stor1 --name images --public-access blob
az storage container set-permission --account-name stor1 --name images --public-access off
```

Le changement du niveau d'accès anonyme d'un conteneur ne peut pas être autorisé avec Microsoft Entra ID (`--auth-mode login` est rejeté) : utilisez la clé du compte.

Le **stockage immuable** (WORM : écriture unique, lectures multiples) se configure sur un conteneur ou sur des versions d'objets blob :

| Stratégie | Comportement |
| --- | --- |
| Rétention limitée dans le temps | Les objets blob peuvent être créés et lus, mais ni modifiés ni supprimés, pendant la durée de rétention. *Déverrouillée* : modifiable et supprimable. **Verrouillée** : non supprimable ; la durée ne peut qu'être allongée |
| Conservation légale (legal hold) | Même protection, sans durée, jusqu'à la levée explicite de la conservation |

Un conteneur peut aussi porter une **étendue de chiffrement** par défaut et être protégé par la **suppression réversible de conteneur** (voir plus bas).

<!-- section: access-tiers | objectives: 2.3.3 -->
## Niveaux d'accès du stockage

Les niveaux d'objets blob échangent prix du stockage contre prix de l'accès :

| Niveau | Coût de stockage | Coût d'accès | Durée minimale | Disponibilité |
| --- | --- | --- | --- | --- |
| **Chaud (Hot)** | Le plus élevé | Le plus bas | Aucune | En ligne |
| **Froid (Cool)** | Plus bas | Plus élevé | 30 jours | En ligne |
| **Froid (Cold)** | Encore plus bas | Encore plus élevé | 90 jours | En ligne |
| **Archive** | Le plus bas | Le plus élevé | 180 jours | **Hors connexion** |

- Un objet blob déplacé ou supprimé avant la durée minimale entraîne des **frais de suppression anticipée** pour les jours restants (supprimé après 20 jours au niveau froid (Cold) : 70 jours facturés).
- Le **niveau d'accès par défaut** d'un compte peut être Hot, Cool ou Cold ; les objets blob sans niveau explicite en héritent. **Archive** se règle **objet blob par objet blob**, jamais comme niveau par défaut du compte.
- Les niveaux s'appliquent aux **objets blob de blocs** des comptes à usage général v2 standard (et des comptes de stockage Blob). Les comptes Premium n'ont pas de niveaux.
- L'archive exige une redondance LRS, GRS ou RA-GRS.

Un objet blob archivé ne peut être ni lu ni modifié ; seules ses métadonnées et ses propriétés sont visibles. Pour le lire, il faut le **réhydrater** :

| Méthode | Résultat |
| --- | --- |
| Changer son niveau (Set Blob Tier) vers Hot, Cool ou Cold | Le même objet blob revient en ligne |
| Le copier (Copy Blob) vers un nouvel objet blob d'un niveau en ligne | La source archivée reste inchangée : pas de frais de suppression anticipée pour elle |

Priorité de réhydratation : **Standard** (jusqu'à 15 heures) ou **Haute** (High : parfois moins d'une heure pour les objets de moins de 10 Go, plus chère).

```bash
az storage blob set-tier --account-name stor1 --container-name logs --name app.log \
  --tier Archive
az storage blob set-tier --account-name stor1 --container-name logs --name app.log \
  --tier Hot --rehydrate-priority High
```

<!-- section: files-snapshots-soft-delete | objectives: 2.3.4 -->
## Instantanés et suppression réversible pour Azure Files

| Fonctionnalité | Niveau | Protège contre | Détails |
| --- | --- | --- | --- |
| **Instantané de partage** | Tout le partage, en lecture seule, à un instant donné | La modification ou la suppression accidentelle de **fichiers** | Incrémentiel ; jusqu'à **200** par partage ; on restaure des fichiers isolés ou tout le partage |
| **Suppression réversible** | Partage | La suppression accidentelle du **partage** | Activée par compte de stockage pour tous ses partages ; rétention de **1 à 365 jours** ; *annuler la suppression* restaure le partage avec ses instantanés |

- Sous Windows, les instantanés d'un partage SMB monté apparaissent dans l'onglet **Versions précédentes** des fichiers et dossiers : les utilisateurs restaurent eux-mêmes leurs fichiers.
- Un partage qui a des instantanés ne peut être supprimé que si ses instantanés le sont aussi. Supprimer le partage supprime ses instantanés (ils reviennent si l'on annule la suppression du partage supprimé de façon réversible).
- La suppression réversible ne protège pas les fichiers individuels : utilisez les instantanés ou Sauvegarde Azure pour les partages de fichiers, qui planifie les instantanés et gère leur rétention.
- Un partage supprimé de façon réversible est facturé au tarif des instantanés jusqu'à sa suppression définitive, à la fin de la période de rétention.

```bash
az storage share snapshot --account-name stor1 --name share1
az storage account file-service-properties update -g RG1 -n stor1 \
  --enable-delete-retention true --delete-retention-days 14
az storage share-rm restore -g RG1 --storage-account stor1 -n share1 --deleted-version <version>
```

<!-- section: lifecycle-management | objectives: 2.3.5 -->
## Gestion du cycle de vie des objets blob

Une stratégie de gestion du cycle de vie est un ensemble de règles, définies sur le compte, que le Stockage Azure exécute une fois par jour pour déplacer des objets blob vers un niveau plus froid ou les supprimer. Aucun script, aucun coût pour la stratégie elle-même.

```json
{
  "rules": [
    {
      "name": "archive-then-delete",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": { "blobTypes": [ "blockBlob" ], "prefixMatch": [ "scans/2026" ] },
        "actions": {
          "baseBlob": {
            "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
            "delete":        { "daysAfterModificationGreaterThan": 3650 }
          },
          "snapshot": { "delete": { "daysAfterCreationGreaterThan": 90 } },
          "version":  { "delete": { "daysAfterCreationGreaterThan": 90 } }
        }
      }
    }
  ]
}
```

| Élément | Valeurs |
| --- | --- |
| Filtres | `blobTypes` (obligatoire), `prefixMatch` (commence par le **nom du conteneur**), `blobIndexMatch` (étiquettes d'index d'objets blob). Les filtres ne font qu'inclure ; ils ne peuvent pas exclure |
| Actions | `tierToCool`, `tierToCold`, `tierToArchive`, `delete`, et `enableAutoTierToHotFromCool` |
| Conditions sur les objets blob actuels | `daysAfterModificationGreaterThan`, `daysAfterCreationGreaterThan`, `daysAfterLastAccessTimeGreaterThan`, `daysAfterLastTierChangeGreaterThan` (pour `tierToArchive`) |
| Conditions sur les instantanés et les versions | `daysAfterCreationGreaterThan` |

Règles à retenir :

- Les conditions fondées sur le **dernier accès** exigent que le **suivi de l'heure d'accès** soit activé sur le compte.
- Si plusieurs actions correspondent au même objet blob, la moins chère s'applique : suppression, puis archive, puis froid (Cold), puis froid (Cool).
- Une stratégie nouvelle ou modifiée peut mettre jusqu'à 24 heures à prendre effet, et l'exécution elle-même peut prendre du temps.
- La gestion du cycle de vie ne réhydrate jamais un objet blob archivé.
- L'action de suppression d'une stratégie respecte la suppression réversible : les objets blob supprimés restent récupérables pendant la période de rétention.

<!-- section: versioning-data-protection | objectives: 2.3.6 -->
## Versioning des objets blob et protection des données

| Fonctionnalité | Ce qu'elle fait | Portée |
| --- | --- | --- |
| **Versioning des objets blob** | Chaque écrasement ou suppression conserve l'état précédent sous forme de **version** immuable, avec un ID de version | Compte |
| **Suppression réversible des objets blob** | Un objet blob, une version ou un instantané supprimé reste récupérable pendant 1 à 365 jours | Compte |
| **Suppression réversible de conteneur** | Un conteneur supprimé reste récupérable, avec son contenu, pendant 1 à 365 jours | Compte |
| **Instantané d'objet blob** | Copie en lecture seule prise manuellement à un instant donné | Objet blob |
| **Flux de modification** (change feed) | Journal ordonné de tous les changements apportés aux objets blob | Compte |
| **Restauration à un instant dans le passé** | Ramène les objets blob de blocs de conteneurs à un état antérieur | Compte |

Le versioning en pratique :

- La dernière écriture est la **version actuelle** ; les plus anciennes sont des **versions précédentes**. Supprimer un objet blob retire la version actuelle et garde les précédentes.
- Pour restaurer, **copiez une version précédente sur l'objet blob de base**, ou faites-en la version actuelle dans le portail.
- Les versions sont facturées pour les données qu'elles contiennent : associez le versioning à une règle de cycle de vie qui supprime les anciennes versions.
- Le versioning ne protège pas contre la suppression du conteneur ni du compte : ajoutez la suppression réversible de conteneur et un verrou `CanNotDelete`.
- Le versioning n'existe pas sur les comptes à espace de noms hiérarchique.

La restauration à un instant dans le passé exige **le versioning, la suppression réversible des objets blob et le flux de modification** ; sa rétention doit être inférieure d'au moins un jour à celle de la suppression réversible. Elle porte sur les objets blob de blocs des comptes à usage général v2 standard et ne restaure pas les conteneurs supprimés.

Socle recommandé par Microsoft pour un compte qui contient des objets blob importants : un verrou `CanNotDelete` sur le compte, la suppression réversible de conteneur, la suppression réversible des objets blob et le versioning.

```bash
az storage account blob-service-properties update -g RG1 -n stor1 \
  --enable-versioning true --enable-delete-retention true --delete-retention-days 14 \
  --enable-container-delete-retention true --container-delete-retention-days 14
```

<!-- section: key-points -->
## Points clés

- Un partage est SMB ou NFS ; NFS exige un partage premium. Niveaux standard : optimisé pour les transactions, chaud, froid.
- L'accès anonyme exige le paramètre du compte **et** un niveau de conteneur (Blob : lecture seule ; Conteneur : lecture et liste).
- Hot, Cool (30 jours), Cold (90 jours), Archive (180 jours, hors connexion, par objet blob, pas avec ZRS). Réhydratation : jusqu'à 15 heures, ou priorité haute.
- Azure Files : 200 instantanés par partage, visibles dans Versions précédentes ; la suppression réversible protège les partages, de 1 à 365 jours.
- Règles de cycle de vie : `prefixMatch` commence par le nom du conteneur ; les conditions de dernier accès exigent le suivi des accès ; effet sous 24 heures.
- Le versioning garde les versions précédentes ; la restauration à un instant dans le passé exige versioning, suppression réversible et flux de modification.
