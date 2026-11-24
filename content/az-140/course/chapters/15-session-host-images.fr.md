Un hôte de session ne vaut que par l'image dont il part. Une image personnalisée (souvent appelée image de référence, ou golden image) porte les paramètres du système d'exploitation, les applications et les optimisations : tous les hôtes de session d'un pool sont identiques et les nouveaux hôtes sont prêts en quelques minutes. L'examen teste l'ordre des étapes manuelles, ce qu'automatisent Azure VM Image Builder et les modèles d'images personnalisées, comment stocker et versionner les images dans Azure Compute Gallery, et comment une image mise à jour atteint les hôtes de session.

<!-- section: manual-image | objectives: 1.5.1 -->
## Créer une image manuellement

La méthode manuelle utilise une machine virtuelle temporaire que vous personnalisez, généralisez et capturez.

1. **Choisissez l'image de base** dans la Place de marché Azure : Windows 11 ou Windows 10 Entreprise **multisession** (éventuellement avec Microsoft 365 Apps) ou Windows Server pour les pools d'hôtes regroupés, Windows 11 ou Windows 10 Entreprise pour les pools d'hôtes personnels. La génération 2 est préférable (obligatoire pour Trusted launch).
2. **Déployez la machine virtuelle de build** sans la joindre à un domaine et sans l'option **Se connecter avec Microsoft Entra ID**.
3. **Prenez un instantané du disque du système d'exploitation** juste après le déploiement, puis après chaque étape importante, pour pouvoir revenir en arrière.
4. **Personnalisez** : installez les applications, FSLogix, les modules linguistiques, les dernières mises à jour Windows, les optimisations ; nettoyez les fichiers temporaires et les profils utilisateur superflus.
5. **Avant de généraliser** : retirez la machine virtuelle du domaine si vous l'y avez jointe, désactivez l'antivirus et le chiffrement de disque (Sysprep exige des lecteurs déchiffrés), vérifiez que le filtre d'écriture unifié (UWF) n'est pas activé, et prenez un dernier instantané.
6. **Généralisez avec Sysprep**, qui supprime les informations propres à la machine, puis marquez la machine virtuelle comme généralisée dans Azure.
7. **Capturez** (Machine virtuelle > Capturer) vers une version d'image **Azure Compute Gallery** (recommandé) ou une image managée autonome.
8. **Supprimez la machine virtuelle de build** : une machine virtuelle généralisée ne peut pas redémarrer, et on ne capture jamais deux fois la même machine virtuelle. Pour la version suivante, repartez du dernier instantané.

```text
rd /s /q C:\Windows\Panther
cd %windir%\system32\sysprep
sysprep.exe /generalize /shutdown
```

```powershell
# After the VM has shut down: mark it as generalized, then capture it
Set-AzVm -ResourceGroupName rg-images -Name vm-golden -Generalized
```

> **Piège d'examen.** N'installez jamais l'agent Azure Virtual Desktop et n'inscrivez jamais la machine virtuelle de build dans un pool d'hôtes avant de la capturer. Le jeton d'inscription contenu dans l'image expire et les hôtes créés à partir d'elle ne parviennent pas à s'inscrire. L'agent est installé par le déploiement du pool d'hôtes, sur chaque nouvel hôte de session.

Autres règles que l'examen apprécie : ne capturez pas une machine virtuelle qui est déjà un hôte de session, et ne construisez pas l'image suivante en déployant une image personnalisée existante pour la recapturer sans source propre.

<!-- section: image-builder | objectives: 1.5.2 -->
## Créer une image avec Azure VM Image Builder

**Azure VM Image Builder** (Générateur d'images de machine virtuelle Azure) est un service managé qui exécute le build à votre place : il crée une machine virtuelle de build temporaire à partir d'une image source, exécute vos personnalisations, la généralise avec Sysprep, distribue le résultat et supprime les ressources temporaires. L'entrée est un **modèle d'image** (`Microsoft.VirtualMachineImages/imageTemplates`).

| Partie du modèle | Options |
| --- | --- |
| `source` | `PlatformImage` (Place de marché), `ManagedImage`, `SharedImageVersion` (Azure Compute Gallery) |
| `customize` | `PowerShell` (inline ou `scriptUri`, `runElevated`), `WindowsRestart`, `WindowsUpdate` (`searchCriteria`, `filters`), `File` (petits fichiers, moins de 20 Mo) |
| `distribute` | `SharedImage` (définition d'image de la galerie, `targetRegions`), `ManagedImage`, `VHD` |
| `buildTimeoutInMinutes` | 240 par défaut ; 960 au maximum |
| `vmProfile` | Taille de la machine virtuelle de build, taille du disque du système d'exploitation, réseau virtuel et sous-réseau existants en option |
| `identity` | **Identité managée affectée par l'utilisateur, obligatoire** |

```json
"customize": [
  { "type": "PowerShell", "name": "installApps", "scriptUri": "https://raw.githubusercontent.com/contoso/avd/main/apps.ps1", "runElevated": true },
  { "type": "WindowsRestart", "restartTimeout": "10m" },
  { "type": "WindowsUpdate", "searchCriteria": "IsInstalled=0", "filters": [ "exclude:$_.Title -like '*Preview*'", "include:$true" ] }
],
"distribute": [
  {
    "type": "SharedImage",
    "galleryImageId": "/subscriptions/<sub>/resourceGroups/rg-images/providers/Microsoft.Compute/galleries/galAvd/images/win11-multi",
    "runOutputName": "win11-multi-out",
    "targetRegions": [ { "name": "westeurope", "replicaCount": 3, "storageAccountType": "Standard_ZRS" } ]
  }
]
```

Créer le modèle ne construit pas l'image : vous lancez le build avec l'action `Run` (**Démarrer le build** dans le portail, ou les commandes ci-dessous). Image Builder crée un **groupe de ressources intermédiaire** (staging) nommé `IT_<resource group>_<template>_<GUID>` ; son compte de stockage conserve le `customization.log` (sortie Packer) pour diagnostiquer un build en échec. Si vous nommez vous-même le groupe de ressources intermédiaire, il doit être vide au démarrage du build.

```bash
az resource invoke-action --resource-group rg-images \
  --resource-type Microsoft.VirtualMachineImages/imageTemplates \
  -n tpl-win11-multi --action Run
```

Les **modèles d'images personnalisées** d'Azure Virtual Desktop (**Azure Virtual Desktop > Modèles d'images personnalisées**) sont le même service avec un assistant du portail adapté aux hôtes de session. Prérequis :

- Inscrivez les fournisseurs de ressources, dont `Microsoft.VirtualMachineImages`, `Microsoft.DesktopVirtualization`, `Microsoft.Compute`, `Microsoft.Network`, `Microsoft.Storage`, `Microsoft.KeyVault` et `Microsoft.ContainerInstance`.
- Créez une **identité managée affectée par l'utilisateur** et donnez-lui un **rôle personnalisé** avec les actions sur la galerie et les images (`Microsoft.Compute/galleries/images/versions/write`, `Microsoft.Compute/images/write` et les lectures et la suppression correspondantes), à l'étendue du groupe de ressources des images. Avec un réseau virtuel existant, l'identité doit aussi y avoir accès (ou à son groupe de ressources), et toute stratégie de service privé sur son sous-réseau doit être désactivée.
- Pour une distribution vers une galerie, créez d'abord la galerie et la **définition d'image**, avec la même génération que l'image source ; le service crée les versions d'image.

Les onglets de l'assistant sont Informations de base, Image source, Cibles de distribution, Propriétés de build (délai d'expiration du build, taille de la machine virtuelle de build, qui doit correspondre à la génération de la source) et Personnalisations. Les **scripts intégrés** couvrent les réglages habituels d'un hôte de session : installer des modules linguistiques et définir la langue par défaut, redirection du fuseau horaire, désactiver l'Assistant Stockage (Storage Sense), installer FSLogix et configurer Profile Container, FSLogix avec Kerberos, RDP Shortpath pour les réseaux managés, protection contre la capture d'écran, optimisations Teams, délais d'expiration de session, désactiver les mises à jour automatiques des applications MSIX, ajouter ou supprimer des Microsoft 365 Apps, et appliquer les mises à jour Windows. Vos propres scripts doivent être accessibles par URI (par exemple GitHub ou un compte de stockage que l'identité peut lire).

> **Conseil d'examen.** « Reproductible », « sans machine virtuelle de build manuelle », « les mêmes étapes chaque mois » et « installer des modules linguistiques ou des mises à jour Windows pendant le build » désignent Image Builder ou un modèle d'image personnalisée. La réponse à « que devez-vous créer en premier » est en général l'identité managée affectée par l'utilisateur et son rôle, puis la définition d'image de la galerie.

<!-- section: modify-update | objectives: 1.5.3, 1.5.5 -->
## Modifier une image et appliquer les mises à jour du système d'exploitation et des applications

Une image ne se corrige jamais sur place : vous produisez une **nouvelle version d'image** et redéployez les hôtes de session à partir d'elle.

| Méthode | Comment modifier ou mettre à jour |
| --- | --- |
| Manuelle | Créez une machine virtuelle à partir du dernier instantané (ou de la dernière version), appliquez les modifications et les mises à jour, Sysprep, capturez comme version d'image suivante, supprimez la machine virtuelle |
| Image Builder ou modèle d'image personnalisée | Modifiez les scripts, ou relancez simplement le build : une source `PlatformImage` en version `latest` récupère la build la plus récente de la Place de marché, et le personnalisateur `WindowsUpdate` ou le script intégré **Appliquer les mises à jour Windows** installe les mises à jour en attente |

Contenu à mettre dans l'image ou en dehors :

| Élément | Où |
| --- | --- |
| Mises à jour cumulatives du système d'exploitation, modules linguistiques, FSLogix, optimisations Teams | Dans l'image, rafraîchie chaque mois |
| Grosses applications métier stables utilisées par tous | Dans l'image |
| Applications qui changent souvent ou varient selon le groupe d'utilisateurs | App attach (hors de l'image), pour les mettre à jour sans nouvelle image |
| Microsoft 365 Apps | Dans l'image (des images de la Place de marché existent avec Microsoft 365 Apps préinstallées), ou ajoutées et supprimées avec le script intégré |
| Mises à jour automatiques des applications MSIX | Désactivées dans l'image pour que les applications ne changent pas sur les hôtes regroupés |
| Modifications manuelles par hôte après le déploiement | À éviter : elles sont perdues quand les hôtes sont recréés |

Pour déployer la mise à jour sur un pool d'hôtes :

- **Gestion standard** : déployez de nouveaux hôtes de session à partir de la nouvelle version, mettez les anciens hôtes en **mode drainage**, attendez la déconnexion des utilisateurs (ou envoyez un message puis déconnectez-les), puis retirez les anciens hôtes du pool et supprimez les machines virtuelles.
- **Configuration d'hôte de session** : mettez à jour la configuration avec la nouvelle image, puis planifiez une **mise à jour des hôtes de session** (session host update). Le service met à jour un premier hôte, puis des lots de la taille définie dans la stratégie de gestion (1 par défaut) ; il prévient les utilisateurs, attend le délai de déconnexion (0 à 60 minutes, 2 par défaut), les déconnecte, recrée les machines virtuelles à partir de la nouvelle image et les réinscrit dans le pool. Les noms d'hôte du système d'exploitation ne changent pas, mais les nouvelles machines virtuelles Azure sont nommées `<SessionHostName>-<DateTime>` et les machines virtuelles d'origine sont supprimées. Désactivez la mise à l'échelle automatique pendant la mise à jour.

> **Piège d'examen.** La mise à jour des hôtes de session n'existe que pour les pools d'hôtes créés avec une **configuration d'hôte de session** (regroupés uniquement). Sur un pool d'hôtes standard, la réponse est le mode drainage plus un redéploiement, ou votre propre pipeline.

<!-- section: image-storage | objectives: 1.5.7 -->
## Stocker les images dans Azure Compute Gallery

Deux emplacements stockent une image à partir de laquelle déployer des hôtes de session :

| Capacité | Image managée | Azure Compute Gallery |
| --- | --- | --- |
| Gestion des versions | Non (une image par ressource) | Oui : définitions et versions |
| Réplication vers d'autres régions | Non | Oui, par version, avec un nombre de réplicas par région |
| Stockage redondant interzone | Non | Réplicas `Standard_ZRS` là où c'est disponible |
| Partage | Azure RBAC sur l'image | Azure RBAC, galerie partagée directe, galerie communautaire |
| Trusted launch et machines virtuelles confidentielles | Non | Oui, avec une définition Gen2 et un type de sécurité qui les prend en charge |
| Recommandé en production | Non (hérité) | **Oui** |

Hiérarchie de la galerie :

```text
Gallery (galAvd)                       regional resource, can be shared with RBAC
└── Image definition (win11-multi)     publisher/offer/SKU, OS type, OS state,
    │                                  Hyper-V generation, security type
    ├── Image version 1.0.0            major.minor.patch, target regions, replicas
    └── Image version 1.1.0            the newest version is "latest"
```

Règles à connaître :

- Une **définition d'image** fixe le type de système d'exploitation, l'**état du système d'exploitation** (généralisé pour les images capturées après Sysprep ; spécialisé conserve les informations propres à la machine) et la **génération Hyper-V** (V1 ou V2). Les nouvelles définitions sont V2 et `TrustedLaunchSupported` par défaut.
- Les hôtes de session Trusted launch exigent une définition Gen2 dont le type de sécurité prend en charge Trusted launch (`TrustedLaunchSupported`, ou la valeur qui prend en charge à la fois Trusted launch et les machines virtuelles confidentielles).
- **Réplicas** : Microsoft recommande un réplica pour 20 machines virtuelles créées en même temps, et au moins trois pour les images de production ; jusqu'à 100 réplicas par version. Un réplica dans une région cible est nécessaire pour y déployer des hôtes de session.
- `excludeFromLatest` (global) ou `regionalExcludeFromLatest` empêche une version d'être choisie comme « latest ».
- Une galerie est une ressource régionale : pour la reprise d'activité, Microsoft recommande au moins deux galeries dans des régions distinctes. Si la région d'une galerie est en panne, ses réplicas dans d'autres régions restent utilisables pour déployer, mais vous ne pouvez plus créer ni modifier de ressources dans cette galerie.
- Protégez la galerie par un verrou de ressource ; `BlockDeletionBeforeEndOfLife` empêche de supprimer une version avant sa date de fin de vie.

```bash
az sig create -g rg-images --gallery-name galAvd
az sig image-definition create -g rg-images --gallery-name galAvd \
  --gallery-image-definition win11-multi --publisher Contoso --offer avd --sku win11-multi \
  --os-type Windows --os-state Generalized --hyper-v-generation V2
```

> **Piège d'examen.** Un scénario qui demande des hôtes de session dans plusieurs régions, de nombreux déploiements simultanés, des versions vers lesquelles revenir, ou Trusted launch exclut l'image managée : la réponse est Azure Compute Gallery.

<!-- section: lifecycle | objectives: 1.5.4 -->
## Planifier et implémenter la gestion du cycle de vie des images

Un plan de cycle de vie répond à quatre questions : à quelle fréquence une nouvelle version est construite, comment elle est testée, comment les hôtes y passent, et quand les anciennes versions sont supprimées.

| Étape | Pratique |
| --- | --- |
| Build | Chaque mois après le Patch Tuesday, ou quand les applications changent ; un déclencheur Image Builder peut lancer des builds automatiquement |
| Version | Une définition par système d'exploitation et par usage (par exemple `win11-multi-m365`), une nouvelle **version** à chaque build : `1.0.0`, `1.1.0`, `1.1.1` |
| Test | Déployez d'abord la nouvelle version dans un **pool d'hôtes de validation** ou sur des hôtes de test ; gardez-la exclue de « latest » jusqu'à son approbation |
| Publication | Retirez l'exclusion, répliquez dans chaque région avec assez de réplicas, redéployez ou mettez à jour les hôtes de session |
| Retour arrière | Redéployez les hôtes à partir de la version précédente, conservée dans la galerie |
| Retrait | Définissez une date de fin de vie, puis supprimez les versions qu'aucun hôte ni pool ne référence plus ; conservez les dernières versions validées |

Les instantanés de la machine virtuelle de build (méthode manuelle) et le modèle (Image Builder) font partie du cycle de vie : ils rendent le build suivant reproductible.

> **Conseil d'examen.** Si une question demande comment garantir que les nouveaux hôtes de session ne prennent jamais une image non testée, la réponse est **exclure de latest** (exclude from latest) sur la nouvelle version (ou référencer un numéro de version explicite), pas supprimer la version précédente.

<!-- section: session-host-custom-image | objectives: 1.5.6 -->
## Créer un hôte de session à partir d'une image personnalisée

Dans l'assistant du pool d'hôtes ou dans **Hôtes de session > + Ajouter**, dans le champ **Image**, sélectionnez **Voir toutes les images**, puis **Mes éléments** (images managées et images de galeries partagées). Avec une galerie, vous pouvez choisir une définition d'image (la dernière version non exclue) ou une version précise. Ensuite :

- La **taille de machine virtuelle** doit prendre en charge la génération de l'image (une image Gen2 exige une taille compatible Gen2).
- Le **type de sécurité** doit correspondre à la définition : Trusted launch ou Confidentiel exige une définition qui le prend en charge.
- L'image doit avoir un **réplica dans la région** des hôtes de session.
- L'image doit être **généralisée** : chaque hôte reçoit un nouveau nom d'ordinateur, rejoint le domaine ou Microsoft Entra ID, puis reçoit l'agent et s'inscrit avec le jeton.

Dans un modèle, l'hôte de session référence la galerie par ID ; l'ID de la définition sans `/versions/...` désigne la dernière version :

```bicep
imageReference: {
  id: resourceId('rg-images', 'Microsoft.Compute/galleries/images/versions', 'galAvd', 'win11-multi', '1.1.0')
}
```

Avec une configuration d'hôte de session, gardez la galerie dans le même abonnement : la mise à jour des hôtes de session ne prend pas en charge les images de galerie d'un autre abonnement, et la taille du disque du système d'exploitation suit celle de l'image.

<!-- section: key-points -->
## Points clés

- Image manuelle : machine virtuelle de build, instantanés, personnalisation, retrait du domaine, Sysprep `/generalize`, capture vers une galerie, suppression de la machine virtuelle ; jamais d'agent dans l'image.
- Image Builder : modèle d'image avec source, personnalisations, distribution, et une identité managée affectée par l'utilisateur obligatoire ; le build démarre avec l'action Run.
- Modèles d'images personnalisées = Image Builder dans le portail Azure Virtual Desktop, avec des scripts intégrés (modules linguistiques, FSLogix, Teams, mises à jour Windows).
- On met à jour une image en construisant une nouvelle version, puis en redéployant les hôtes ou en lançant une mise à jour des hôtes de session (configuration d'hôte de session uniquement).
- Azure Compute Gallery : définitions et versions, réplicas par région, ZRS, exclusion de latest, prise en charge de Trusted launch ; les images managées sont héritées.
- Les hôtes de session issus d'une image personnalisée exigent une génération et un type de sécurité correspondants, et un réplica dans leur région.
