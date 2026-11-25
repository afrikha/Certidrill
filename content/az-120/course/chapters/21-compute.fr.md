La couche de calcul d'un paysage SAP sur Azure se décide d'abord par la certification, ensuite par le dimensionnement : une machine virtuelle que SAP ne liste pas pour la charge de travail n'est pas prise en charge, quelle que soit sa puissance. Ce chapitre traite du choix de la machine virtuelle, de l'extension Azure pour SAP qu'exige chaque machine virtuelle SAP, des images de système d'exploitation, des images personnalisées et des trois options d'automatisation que l'examen compare : modèles Bicep ou ARM, SAP Deployment Automation Framework et le Centre Azure pour les solutions SAP (Azure Center for SAP solutions).

<!-- section: certified-vms | objectives: 2.1.1 -->
## Choisir une machine virtuelle certifiée SAP

Deux sources SAP déterminent ce qui est pris en charge :

| Charge de travail | Où sont listés les types de machines virtuelles certifiés |
| --- | --- |
| Serveurs d'applications SAP NetWeaver et S/4HANA, services centraux et toutes les bases de données sauf HANA (SQL Server, Oracle, Db2, SAP ASE, MaxDB) | Note SAP 1928533, avec la valeur SAPS de chaque type de machine virtuelle |
| SAP HANA en production | Annuaire du matériel SAP HANA (SAP HANA hardware directory), section « Certified IaaS platforms » |
| SAP HANA hors production | Types de machines virtuelles listés dans la note SAP 1928533 |

Le SAPS (SAP Application Performance Standard) est l'unité de mesure de la capacité processeur. Les types de machines virtuelles certifiés ne surprovisionnent ni le processeur ni la mémoire. Dimensionnez dans cet ordre :

1. **La machine virtuelle de base de données d'abord**, car la couche base de données ne se met pas à l'échelle horizontalement dans la plupart des systèmes SAP. Pour HANA, la mémoire décide : la machine virtuelle doit contenir la base en mémoire, et les tailles de production doivent figurer dans l'annuaire HANA (scale-up ou scale-out, OLTP ou OLAP).
2. **Le niveau application en SAPS** : ajoutez des serveurs d'applications plutôt que d'agrandir une seule machine virtuelle, avec au moins deux serveurs pour la redondance.
3. **Vérifiez les autres limites** de la taille envisagée : IOPS et débit de stockage, nombre de disques de données, bande passante réseau, types de stockage pris en charge, disponibilité dans la région et les zones.

| Exigence | Réponse type |
| --- | --- |
| Serveurs d'applications, ASCS/SCS, Web Dispatcher | Tailles à usage général (famille D) ou à mémoire optimisée (famille E) listées dans la note SAP 1928533 |
| HANA jusqu'à quelques centaines de Gio de mémoire | Tailles de la famille E certifiées HANA |
| Grand système HANA (plusieurs téraoctets de mémoire) | Famille M : M, Msv2/Mdsv2, Msv3/Mdsv3, Mbsv3/Mbdsv3 (débit de stockage plus élevé), Mv3 à mémoire élevée et très élevée |
| SSD Premium v1 pour `/hana/log` | Une taille de la famille M, car l'Accélérateur d'écriture (Write Accelerator) n'existe que là |
| Paire HANA System Replication avec basculement automatique | La même taille de machine virtuelle sur le primaire et le secondaire |

Autres faits utilisés par l'examen :

- Les tailles de la famille M ne sont déployées que dans une partie des régions, et certaines tailles ne sont disponibles que dans deux des trois zones de disponibilité d'une région : vérifiez-le avant de concevoir une architecture zonale.
- Utilisez des machines virtuelles de **génération 2** pour tous les déploiements SAP ; une machine virtuelle déployée ne peut pas être convertie de la génération 1 vers la génération 2.
- Les familles de machines virtuelles ne tournent pas toujours sur le même matériel hôte : une machine virtuelle Edsv5 et une machine virtuelle de la famille M placées dans un même groupe à haute disponibilité peuvent échouer à l'allocation.

> **Piège d'examen.** Une taille listée dans la note SAP 1928533 n'est pas automatiquement prise en charge pour HANA en production. HANA en production exige une entrée dans l'annuaire du matériel SAP HANA ; la note 1928533 ne couvre HANA que hors production.

> **Piège d'examen.** Une machine virtuelle de la famille E peut exécuter HANA certifié, mais pas avec du SSD Premium v1 pour `/hana/log` : sans Accélérateur d'écriture, l'indicateur de latence du journal n'est pas atteint. Utilisez SSD Premium v2, Disque Ultra ou Azure NetApp Files pour le journal.

<!-- section: vm-extension | objectives: 2.1.2 -->
## Extension de machine virtuelle Azure pour les solutions SAP

SAP ne prend en charge un système sur Azure que si l'**extension Azure pour SAP** (appelée « Enhanced Monitoring » dans d'anciennes notes SAP) est installée sur chaque machine virtuelle qui exécute un composant SAP. Elle fournit les données de l'infrastructure Azure (taille de la machine virtuelle, disques, réseau) à SAP Host Agent, que lit le support SAP. Le support de l'extension passe par les canaux de support SAP.

| | Version standard | Nouvelle version |
| --- | --- | --- |
| Statut | Version par défaut actuelle | Recommandée dans des cas précis ; prévue pour devenir la version par défaut |
| Source des données | Configuration locale et Azure Diagnostics | Azure Resource Manager, via `management.azure.com` |
| Identité | Aucune | Identité managée de la machine virtuelle avec **Reader** sur le groupe de ressources ou sur les cartes réseau, le disque du système d'exploitation et les disques de données |
| Reconfiguration | Réexécuter `Set-AzVMAEMExtension` après un changement de taille, de disques de données ou de cartes réseau | |
| Obligatoire quand | | Installation avec des modèles ARM, Terraform ou d'autres outils qu'Azure CLI ou PowerShell ; SLES 15 ou ultérieur ; RHEL 8.1 ou ultérieur ; Oracle Linux 8.1 ou ultérieur ; Disque Ultra ou disques managés Standard ; demande du support Microsoft ou SAP |

```powershell
# Standard version
Set-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01
# New version (uninstall the standard version first)
Set-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01 -InstallNewExtension
Test-AzVMAEMExtension -ResourceGroupName RG-SAP-PRD -VMName sapprdapp01
```

```bash
# The aem extension of Azure CLI installs itself on first use
az vm aem set --resource-group RG-SAP-PRD --name sapprdapp01 --install-new-extension
az vm aem verify --resource-group RG-SAP-PRD --name sapprdapp01
```

Règles à retenir :

- Installer les deux versions sur une même machine virtuelle n'est pas pris en charge : désinstallez la version présente avant de changer.
- La nouvelle version exige SAP Host Agent 7.21 PL 47 ou ultérieur et un accès sortant à `management.azure.com` (direct ou via un proxy : `-ProxyURI` ou `--proxy-uri`). Redémarrez SAP Host Agent après l'installation.
- Avec `--set-access-to-individual-resources`, l'identité de la machine virtuelle reçoit Reader sur les disques et les cartes réseau au lieu du groupe de ressources entier.
- Installer la nouvelle version avec PowerShell exige Owner sur le groupe de ressources ou sur les ressources concernées.
- Contrôle d'intégrité : `Test-AzVMAEMExtension` ou `az vm aem verify` doit renvoyer OK pour chaque test. Sur la machine virtuelle, la nouvelle version publie ses données à `http://127.0.0.1:11812/azure4sap/metrics`, où « Provider Health Description » doit valoir OK.

> **Piège d'examen.** L'extension sert au support SAP, pas à votre supervision : pour superviser des charges de travail SAP, la réponse est Azure Monitor pour solutions SAP.

<!-- section: marketplace-images | objectives: 2.1.3 -->
## Déployer le système d'exploitation à partir d'une image de la Place de marché Azure

La Place de marché Azure propose des images Linux propres à SAP, qui incluent les paquets de réglage et les dépôts SAP :

| Image | Contenu |
| --- | --- |
| SUSE Linux Enterprise Server for SAP Applications | SLES avec les extensions SAP et haute disponibilité (Pacemaker, SAPHanaSR, saptune) |
| `RHEL-SAP-APPS` (RHEL for SAP Applications) | RHEL avec les dépôts des applications SAP |
| `RHEL-SAP-HA` (RHEL for SAP with High Availability and Update Services) | Ajoute les dépôts High Availability (Pacemaker) et les dépôts de mises à jour E4S |
| Windows Server Datacenter | Pour SAP sur Windows avec SQL Server, Oracle ou Db2 |

Modèles de facturation :

- **Paiement à l'utilisation (PAYG)** : l'abonnement du système d'exploitation est facturé avec la machine virtuelle. Les images SAP PAYG ajoutent le supplément SAP, et `RHEL-SAP-HA` ajoute le supplément haute disponibilité.
- **Apport de votre propre abonnement (BYOS)** : vous utilisez un abonnement SUSE ou Red Hat existant. Les images RHEL BYOS utilisent des plans privés et ne sont pas disponibles dans les abonnements CSP. Azure Hybrid Benefit permet de faire passer une machine virtuelle RHEL de la facturation PAYG à BYOS et inversement.

```bash
az vm image list --publisher RedHat --offer RHEL-SAP-HA --all --output table
```

L'agent de machine virtuelle Azure est installé par défaut avec une image de la Place de marché. Après le déploiement : configurez le proxy si besoin, joignez le domaine (Windows), configurez l'extension Azure pour SAP, puis installez les logiciels SAP. Vérifiez que la version du système d'exploitation est prise en charge dans la note SAP 1928533 ou, pour HANA, dans l'entrée de la taille de machine virtuelle de l'annuaire du matériel HANA.

> **Conseil d'examen.** Un cluster Pacemaker sur RHEL a besoin des dépôts High Availability : choisissez `RHEL-SAP-HA`, pas `RHEL-SAP-APPS`.

<!-- section: custom-images | objectives: 2.1.4 -->
## Créer et déployer une image personnalisée

Stockez les images personnalisées (système d'exploitation durci, agents, paramètres) dans **Azure Compute Gallery** :

| Objet de la galerie | Rôle |
| --- | --- |
| Galerie | Référentiel partagé via Azure RBAC (ou par partage direct et communautaire) |
| Définition d'image | Éditeur, offre et SKU (combinaison unique), type de système d'exploitation, état du système d'exploitation (généralisé ou spécialisé), génération Hyper-V |
| Version d'image | `Major.Minor.Patch`, répliquée vers des régions cibles avec un nombre de réplicas par région ; `latest` sélectionne la version la plus élevée |

Une image **généralisée** est débarrassée des données propres à la machine et peut créer de nombreuses machines virtuelles ; une image **spécialisée** conserve le nom de l'ordinateur et les comptes. Pour généraliser :

```bash
# Linux, inside the VM (+user also removes the last provisioned account)
sudo waagent -deprovision+user
# Then, from a workstation
az vm deallocate --resource-group RG-IMG --name sapimg01
az vm generalize --resource-group RG-IMG --name sapimg01
```

```powershell
# Windows: run %windir%\system32\sysprep\sysprep.exe /generalize /shutdown, then
Set-AzVm -ResourceGroupName RG-IMG -Name sapimg01 -Generalized
```

Une fois marquée comme généralisée, une machine virtuelle ne peut plus redémarrer : prenez d'abord un instantané du disque du système d'exploitation si la source doit continuer à fonctionner. Désactivez le chiffrement des disques avant d'exécuter Sysprep. Les versions d'image d'une galerie ne peuvent pas être répliquées vers un autre abonnement ; accordez plutôt l'accès avec RBAC.

| Scénario | Approche |
| --- | --- |
| Système d'exploitation standard de SUSE, Red Hat ou Microsoft | Image de la Place de marché |
| Système d'exploitation durci de l'entreprise pour de nombreuses machines virtuelles SAP | Version d'image généralisée dans Azure Compute Gallery |
| Déplacer un système SAP local existant en conservant le nom d'hôte et le SID | Charger les VHD non généralisés comme disques managés et créer la machine virtuelle à partir du disque du système d'exploitation |

Pour une image Linux personnalisée, l'agent Linux de machine virtuelle doit déjà être installé dans l'image. Quand vous créez une machine virtuelle à partir d'un disque chargé non généralisé, l'agent de machine virtuelle n'est pas installé automatiquement : installez-le vous-même (`sudo zypper install WALinuxAgent` sur SLES), puis configurez l'extension Azure pour SAP. Le Centre Azure pour les solutions SAP accepte aussi des images personnalisées d'Azure Compute Gallery.

> **Piège d'examen.** La généralisation détruit l'identité de la machine virtuelle source. Si l'exigence est de conserver le nom d'hôte et le SID SAP d'un serveur migré, ne généralisez pas : déployez à partir du disque chargé.

<!-- section: iac-bicep-arm | objectives: 2.1.5 -->
## Automatiser le déploiement avec des modèles Bicep et ARM

Bicep se compile en JSON ARM (`az bicep build`) ; les deux sont déclaratifs. Un fragment pour une machine virtuelle HANA zonale :

```bicep
resource hanaVm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: 'hdbprd01'
  location: location
  zones: [ '1' ]
  properties: {
    hardwareProfile: { vmSize: 'Standard_M64ms' }
    storageProfile: {
      imageReference: { id: galleryImageVersionId }
      osDisk: { createOption: 'FromImage', caching: 'ReadWrite', managedDisk: { storageAccountType: 'Premium_LRS' } }
      dataDisks: [
        { lun: 0, createOption: 'Empty', diskSizeGB: 512, caching: 'ReadOnly', managedDisk: { storageAccountType: 'Premium_LRS' } }
        { lun: 1, createOption: 'Empty', diskSizeGB: 256, caching: 'None', writeAcceleratorEnabled: true, managedDisk: { storageAccountType: 'Premium_LRS' } }
      ]
    }
    networkProfile: { networkInterfaces: [ { id: hanaNic.id } ] }
  }
}
```

```bash
az deployment group what-if --resource-group RG-SAP-PRD --template-file main.bicep --parameters @prd.parameters.json
az deployment group create --resource-group RG-SAP-PRD --template-file main.bicep --parameters @prd.parameters.json
```

| Propriété | Usage pour SAP |
| --- | --- |
| `zones` | Déploiement zonal ; incompatible avec `availabilitySet` |
| `availabilitySet` / `proximityPlacementGroup` | Placement au moment de la création |
| `imageReference` | Image de la Place de marché (éditeur, offre, SKU, version) ou `id` d'une version d'image de galerie |
| `caching`, `writeAcceleratorEnabled` | Paramètres par disque (voir le chapitre sur le stockage) |
| `storageAccountType` | `Premium_LRS`, `PremiumV2_LRS`, `UltraSSD_LRS` |
| `additionalCapabilities.ultraSSDEnabled` | Doit valoir `true` pour attacher des Disques Ultra ; l'activer sur une machine virtuelle existante exige de la libérer, et les Disques Ultra ne prennent pas en charge les groupes à haute disponibilité |
| `enableAcceleratedNetworking` de la carte réseau | Se définit sur l'interface réseau, pas sur la machine virtuelle |

> **Conseil d'examen.** Les modèles Bicep et ARM ne déploient que l'infrastructure. L'installation des logiciels SAP exige une autre couche : Ansible dans SAP Deployment Automation Framework, ou l'étape d'installation du Centre Azure pour les solutions SAP.

<!-- section: sdaf | objectives: 2.1.6 -->
## SAP Deployment Automation Framework

SAP Deployment Automation Framework (SDAF) est un outil d'orchestration **open source** (dépôt GitHub `Azure/sap-automation`) qui utilise **Terraform** pour déployer l'infrastructure et **Ansible** pour configurer le système d'exploitation et installer SAP (HANA et NetWeaver avec AnyDB) sur tout système d'exploitation pris en charge par SAP, dans toute région.

| Composant | Contenu | Emplacement type |
| --- | --- | --- |
| Plan de contrôle : deployer | Machine(s) virtuelle(s) qui exécutent Terraform et servent de contrôleur Ansible | Abonnement hub |
| Plan de contrôle : bibliothèque SAP (SAP library) | Stockage des fichiers d'état Terraform et des médias SAP téléchargés ; Key Vault pour les identifiants de déploiement | Abonnement hub |
| Zone de charge de travail (workload zone) | Réseau virtuel, sous-réseaux, NSG, Key Vault pour les identifiants des systèmes, stockage pour les diagnostics de démarrage et le témoin cloud, en option Azure NetApp Files, Azure Files NFS et Azure Monitor pour solutions SAP | Abonnement spoke, un par environnement (DEV, QA, PRD) |
| Système | Un SID SAP dans son propre groupe de ressources : machines virtuelles de base de données et équilibreur de charge Standard, machines virtuelles des services centraux et équilibreur de charge, serveurs d'applications, Web Dispatchers | Zone de charge de travail |

Ordre de déploiement : plan de contrôle (`deploy_controlplane.sh`), zone de charge de travail (`install_workloadzone.sh`), système SAP (`installer.sh --type sap_system`), puis les playbooks Ansible. Chaque étape lit un fichier de paramètres `.tfvars`.

```bash
${SAP_AUTOMATION_REPO_PATH}/deploy/scripts/installer.sh \
    --parameterfile DEV-WEEU-SAP01-X01.tfvars \
    --type sap_system --auto-approve
```

- Identifiants : une identité managée (recommandé) ou un principal de service, généralement avec Contributor sur l'abonnement cible, et un identifiant dédié par zone de charge de travail.
- Acquisition des logiciels : un playbook Ansible lit un manifeste d'application SAP (nomenclature YAML) et télécharge les médias avec un compte utilisateur SAP dans la bibliothèque SAP.
- Architectures : autonome (une machine virtuelle), distribuée, et distribuée hautement disponible (Pacemaker pour la base de données et les services centraux).
- Il s'exécute depuis le deployer ou via des pipelines Azure DevOps.

<!-- section: acss | objectives: 2.1.7 -->
## Centre Azure pour les solutions SAP

Le Centre Azure pour les solutions SAP (Azure Center for SAP solutions, ACSS) est un service Azure managé qui fait de SAP une charge de travail de premier niveau. Chaque système qu'il déploie ou inscrit est représenté par une **instance virtuelle pour solutions SAP (Virtual Instance for SAP solutions, VIS)** nommée d'après le SID, avec des ressources enfants pour l'instance des services centraux, l'instance de base de données et les instances de serveur d'applications.

Le déploiement d'un nouveau système est une expérience guidée dans le portail, en deux étapes : l'infrastructure d'abord, puis l'installation des logiciels SAP.

| Prérequis | Détail |
| --- | --- |
| Fournisseur de ressources | `Microsoft.Workloads` inscrit sur l'abonnement |
| Utilisateur | Contributor sur les abonnements et groupes de ressources utilisés |
| Identité managée affectée par l'utilisateur | Contributor sur l'abonnement (ou sur les groupes de ressources de calcul, réseau et stockage) ; Storage Blob Data Reader et Reader and Data Access sur le compte de stockage qui contient les médias SAP |
| Réseau | Réseau virtuel existant dans la région cible, sous-réseaux d'application et de base de données qui communiquent, connectivité sortante (Internet, ou les points de terminaison SUSE/Red Hat et les étiquettes de service Storage, AzureKeyVault, AzureActiveDirectory et AzureResourceManager) |
| Quota | Quota de processeurs virtuels suffisant pour les tailles de machines virtuelles recommandées |

Choix de déploiement :

- **Type de déploiement** : serveur unique (hors production uniquement), distribué, ou distribué avec haute disponibilité (recommandé en production ; zones de disponibilité pour l'option de SLA à 99,99 %, groupes à haute disponibilité pour 99,95 %).
- **Produit** : S/4HANA sur HANA scale-up, versions 1909, 2020, 2021 et 2022 (ISS 00).
- **Image du système d'exploitation** : RHEL 8.4 ou 8.6 for SAP Applications, ou SLES for SAP Applications 15 SP3 ou SP4 (12 SP5 pour S/4HANA 1909 uniquement), de la Place de marché ; ou une image personnalisée d'Azure Compute Gallery, dans le même abonnement que le déploiement, avec le type de sécurité **Standard** et un système d'exploitation de base pris en charge, l'identité managée affectée par l'utilisateur ayant **Reader** sur la galerie.
- **Dimensionnement** : saisissez les SAPS du niveau application et la mémoire de la base de données, et ACSS recommande des tailles de machines virtuelles ; dans un déploiement à haute disponibilité, le nombre de machines virtuelles ASCS et de base de données est fixé à deux.
- **Répertoire de transport** : en créer un, utiliser un existant, ou aucun.

Une fois la VIS créée (déployée, ou inscrite pour un système SAP NetWeaver ou ABAP existant sur Windows, SLES ou RHEL avec HANA, Db2, SQL Server, Oracle, MaxDB ou SAP ASE), ACSS affiche l'état et l'intégrité, démarre et arrête le système SAP, fournit des contrôles de qualité et des insights, affiche les métriques de l'infrastructure et analyse les coûts.

L'inscription ne prend pas en charge HANA Large Instances, HANA scale-out, MCOS ou MCOD, les systèmes Java ou double pile, les systèmes répartis sur des réseaux virtuels reliés par peering, ni IPv6. Pour l'inscription, l'identité managée affectée par l'utilisateur a besoin du rôle **Azure Center for SAP solutions service role** sur le groupe de ressources des machines virtuelles, des disques et des équilibreurs de charge, et de **Reader** sur le groupe de ressources du réseau virtuel.

| Exigence | Outil |
| --- | --- |
| Déploiement guidé et natif Azure de S/4HANA, avec gestion après le déploiement | Centre Azure pour les solutions SAP |
| Pipeline open source personnalisable pour de nombreux paysages, y compris AnyDB et des compétences Terraform/Ansible existantes | SAP Deployment Automation Framework |
| Infrastructure seule, dans le pipeline de modèles existant de l'entreprise | Modèles Bicep ou ARM |

> **Piège d'examen.** ACSS utilise une identité managée **affectée par l'utilisateur** pour le déploiement. Une identité affectée par le système, ou des rôles donnés seulement à l'utilisateur connecté, ne satisfont pas le prérequis.

<!-- section: key-points -->
## Points clés

- NetWeaver et AnyDB : note SAP 1928533 (SAPS). HANA en production : annuaire du matériel SAP HANA.
- Dimensionnez d'abord la machine virtuelle de base de données ; étendez le niveau application en SAPS ; vérifiez disques, débit, réseau et disponibilité dans les zones.
- L'Accélérateur d'écriture n'existe que sur la famille M ; le journal HANA sur la famille E exige SSD Premium v2, Disque Ultra ou Azure NetApp Files.
- L'extension Azure pour SAP est obligatoire pour le support SAP ; la nouvelle version utilise une identité managée avec Reader et accède à `management.azure.com`.
- `RHEL-SAP-HA` pour les clusters Pacemaker ; PAYG ou BYOS ; les images de la Place de marché incluent l'agent de machine virtuelle.
- Généralisez (`waagent -deprovision+user`, Sysprep) pour des images de galerie réutilisables ; déployez à partir du disque chargé pour conserver un nom d'hôte et un SID.
- SDAF = open source, Terraform + Ansible, plan de contrôle puis zone de charge de travail puis système ; ACSS = ressource VIS, identité affectée par l'utilisateur, déploiement guidé de S/4HANA et exploitation.
