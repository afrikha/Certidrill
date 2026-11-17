Exploiter SAP sur Azure, c'est surveiller trois choses à la fois : l'infrastructure Azure (machines virtuelles, disques, réseau, équilibreurs de charge), les couches SAP et base de données, et les tâches d'exploitation (sauvegardes, démarrage et arrêt, copies de systèmes). Les questions d'AZ-120 demandent quel outil collecte quelles données, ce qu'il faut installer ou configurer d'abord, et quel service Azure réalise une tâche d'exploitation.

<!-- section: vm-monitoring | objectives: 4.2.1 -->
## Superviser les machines virtuelles Azure

| Besoin | Outil |
| --- | --- |
| Métriques de l'hôte (processeur, disque, réseau) sans agent | Métriques de plateforme Azure Monitor, Metrics Explorer, alertes de métrique |
| Compteurs de performances et journaux du système d'exploitation invité | Azure Monitor Agent avec une règle de collecte de données (DCR), envoyés dans un espace de travail Log Analytics |
| Vues de performances prêtes à l'emploi | VM Insights (utilise Azure Monitor Agent) |
| Événements d'intégrité côté Azure | Resource Health, Service Health, alertes du journal d'activité |
| Données d'infrastructure pour le support SAP | Azure VM extension for SAP solutions |
| Télémétrie SAP, HANA et cluster | Azure Monitor pour solutions SAP (voir plus bas) |

L'**Azure VM extension for SAP solutions** est requise pour que SAP prenne en charge votre environnement : le SAP Host Agent y lit les métriques de l'infrastructure Azure (la note SAP 2178632 les liste ; la note SAP 2191498 donne la version du Host Agent pour Linux). Le support de l'extension passe par les canaux de support SAP.

| | Version standard | Nouvelle version |
| --- | --- | --- |
| Quand | Par défaut | Installation via Terraform, ARM ou un autre moyen que CLI/PowerShell ; SLES 15+, RHEL 8.1+, Oracle Linux 8.1+ ; disque Ultra ou disques managés Standard ; à la demande du support Microsoft ou SAP |
| Prérequis | Agent de machine virtuelle Azure ; installation avec Azure CLI ou PowerShell | Identité managée avec **Reader** sur le groupe de ressources de la machine virtuelle ou sur ses cartes réseau et disques ; accès sortant à `management.azure.com` ; SAP Host Agent 7.21 PL 47 ou ultérieur |

Désinstallez l'extension avant de changer de version, et redémarrez le SAP Host Agent après l'installation.

```powershell
Set-AzVMAEMExtension -ResourceGroupName rg-sap-prd -VMName vm-hana01 -InstallNewExtension
Test-AzVMAEMExtension -ResourceGroupName rg-sap-prd -VMName vm-hana01
```

Chaque résultat de contrôle d'intégrité doit être **OK**. Dans la machine virtuelle, `http://127.0.0.1:11812/azure4sap/metrics` affiche la **Provider Health Description**.

> **Piège d'examen.** Azure Monitor pour solutions SAP ne remplace pas l'Azure VM extension for SAP solutions. L'extension est le prérequis du support SAP ; Azure Monitor pour solutions SAP est une télémétrie facultative.

<!-- section: ha-monitoring | objectives: 4.2.2 -->
## Surveiller la haute disponibilité

| Composant | À surveiller | Comment |
| --- | --- | --- |
| Équilibreur de charge Standard du cluster ASCS ou HANA | État de la sonde d'intégrité par membre du pool principal, disponibilité du chemin de données | Métriques de l'équilibreur de charge et alertes de métrique |
| Configuration de l'équilibreur de charge | Ports HA, adresse IP flottante, paramètres keep-alive | **Configuration Checks** de Quality Insights de la VIS |
| Cluster Pacemaker | État des nœuds, des ressources et de SBD, contraintes d'emplacement, votes de quorum, état des anneaux | Azure Monitor pour solutions SAP, fournisseur HA Pacemaker cluster |
| Réplication système HANA | État de la réplication | Azure Monitor pour solutions SAP, fournisseur SAP HANA |
| Machines virtuelles du cluster | Disponibilité, maintenance non planifiée | Resource Health, métrique de disponibilité de la machine virtuelle |

Le fournisseur Pacemaker exige un agent sur **chaque** nœud du cluster et un fournisseur par nœud :

| | SUSE | Red Hat |
| --- | --- | --- |
| Agent | `prometheus-ha_cluster_exporter` (SLES for SAP 12 SP3 et ultérieur) | Performance Co-Pilot avec `pcp-pmda-hacluster` (RHEL 8.2, 8.4 et ultérieur) |
| Point de terminaison | `http://<IP>:9664/metrics` | `http://<IP>:44322/metrics?names=ha_cluster` |

```bash
sudo zypper install prometheus-ha_cluster_exporter
sudo systemctl start prometheus-ha_cluster_exporter
sudo systemctl enable prometheus-ha_cluster_exporter
```

> **Conseil d'examen.** Une sonde d'équilibreur de charge qui devient non saine sur un nœud indique quel nœud détient l'adresse IP virtuelle. Le fournisseur Pacemaker explique pourquoi : état des ressources ou de la clôture.

<!-- section: storage-monitoring | objectives: 4.2.3 -->
## Surveiller le stockage

Les métriques de disque d'Azure Monitor distinguent les deux goulets d'étranglement possibles :

| Métrique | 100 % signifie |
| --- | --- |
| Data Disk IOPS Consumed Percentage, Data Disk Bandwidth Consumed Percentage | La limite propre du disque plafonne les E/S |
| VM Cached / Uncached IOPS Consumed Percentage, VM Cached / Uncached Bandwidth Consumed Percentage | La limite de stockage de la machine virtuelle plafonne les E/S, même si les disques sont sous leurs limites |
| Data Disk Latency, Data Disk Queue Depth | Temps de réponse et file d'attente (latence uniquement pour les disques SCSI, pas NVMe) |
| Data Disk Used Burst IO / BPS Credits Percentage | Consommation des crédits de bursting des SSD Premium |

Les métriques de pourcentage consommé n'existent que sur les séries de machines virtuelles qui prennent en charge le stockage Premium. Pour HANA, alertez sur la latence de `/hana/log` et sur la capacité de `/hana/data` et `/hana/shared`.

Autres sources :

- Les volumes et pools de capacité Azure NetApp Files ont leurs propres métriques (taille consommée, latence, débit) dans Azure Monitor.
- Azure Monitor pour solutions SAP ajoute la latence des périphériques blocs et l'utilisation des systèmes de fichiers (fournisseur Linux), ainsi que l'utilisation disque, la croissance de la base et les sauvegardes HANA (fournisseur HANA).

> **Piège d'examen.** Un pourcentage consommé à 100 % au niveau de la machine virtuelle ne se corrige pas en ajoutant des disques : la limite de la machine virtuelle est atteinte. Redimensionnez la machine virtuelle.

<!-- section: network-monitoring | objectives: 4.2.4 -->
## Superviser le réseau

| Outil Network Watcher | Usage pour SAP |
| --- | --- |
| Moniteur de connexion | Latence et accessibilité continues entre serveurs d'applications, base de données et site local |
| Résolution des problèmes de connexion | Test ponctuel d'une machine virtuelle vers un hôte et un port, par exemple le port SQL HANA |
| Vérification des flux IP | Un paquet est-il autorisé ou refusé sur une carte réseau, et par quelle règle |
| Diagnostics NSG | Même vérification au niveau d'une machine virtuelle, d'un groupe identique ou d'Application Gateway |
| Tronçon suivant | Problèmes de routage, par exemple un trafic envoyé vers une NVA entre niveaux |
| Règles de sécurité effectives | Règles appliquées à une carte réseau |
| Capture de paquets, résolution des problèmes VPN, Topologie | Capture à distance sur une machine virtuelle, diagnostic des passerelles, vue du réseau |

Journaux de flux : **les journaux de flux NSG sont mis hors service le 30 septembre 2027** et n'acceptent plus de nouvelles créations ; utilisez les **journaux de flux de réseau virtuel**, analysés avec **traffic analytics**. Azure Monitor fournit aussi des métriques pour les circuits ExpressRoute, les passerelles VPN et les équilibreurs de charge.

Pour la latence SAP elle-même, mesurez avec `niping`, la mise en réseau accélérée activée ; `ping` n'utilise pas le chemin accéléré.

> **Conseil d'examen.** « Les utilisateurs signalent un délai d'expiration vers le serveur de messages après une modification de NSG » désigne la vérification des flux IP ou les diagnostics NSG. « Suivre la latence entre niveaux dans le temps » désigne le Moniteur de connexion.

<!-- section: ams-config | objectives: 4.2.5 -->
## Configurer Azure Monitor pour solutions SAP

Azure Monitor pour solutions SAP collecte la télémétrie SAP, base de données, cluster et système d'exploitation et l'envoie sous forme de journaux personnalisés dans les Journaux Azure Monitor. Il ne collecte ni les métriques Azure Monitor, ni les journaux de ressources, ni le journal d'activité. Il n'y a pas de frais de licence ; vous payez les composants managés et Log Analytics.

Architecture : la ressource plus un **groupe de ressources managé** contenant une ressource **Azure Functions** (code de supervision), un **Key Vault** (identifiants, informations des fournisseurs), un **compte de stockage** et un **espace de travail Log Analytics** (nouveau, ou existant dans le même abonnement). La visualisation passe par des classeurs (actualisation toutes les 30 minutes au plus) et KQL. Une ressource peut superviser plusieurs SID d'un réseau virtuel.

Prérequis de création :

- Un sous-réseau **IPv4 /25 ou plus grand**, délégué à **Microsoft.Web/serverFarms**, dans un réseau virtuel connecté au réseau virtuel SAP.
- Région de charge de travail égale à la région du réseau virtuel.
- Nom du groupe de ressources managé choisi à la création ; il ne peut plus être modifié.

| Fournisseur | Prérequis |
| --- | --- |
| SAP NetWeaver | Déprotéger les méthodes web SAP Control avec `service/protectedwebmethods`, redémarrer `sapstartsrv` sur chaque instance, ouvrir les ports 5XX13 et 5XX14. Pour SOAP+RFC (ABAP uniquement) : rôle `Z_AMS_NETWEAVER_MONITORING`, utilisateur RFC, services SICF `wsdl`, `wsdl11`, `RFC` |
| SAP HANA | HANA 2.0 SP6 ou ultérieur ; connexion à SYSTEMDB ; utilisateur avec MONITORING ou BACKUP CATALOG READ ; mot de passe saisi ou dans Key Vault |
| Système d'exploitation (Linux) | Prometheus node exporter sur chaque hôte, port 9100, adresse IP privée dans le même réseau virtuel, NSG entrant depuis VirtualNetwork |
| HA Pacemaker cluster | Cluster exporter ou PCP sur chaque nœud (section précédente) |
| Microsoft SQL Server, IBM Db2 | Utilisateur de base de données et accès réseau |

```text
service/protectedwebmethods = SDEFAULT -GetQueueStatistic -ABAPGetWPTable -EnqGetStatistic -GetProcessList -GetEnvironment -ABAPGetSystemWPTable
```

> **Piège d'examen.** Des classeurs NetWeaver vides signifient que les méthodes web SAP Control sont encore protégées ou que `sapstartsrv` n'a pas été redémarré ; un redémarrage complet de SAP n'est pas nécessaire.

<!-- section: backup-management | objectives: 4.2.6 -->
## Gérer les sauvegardes avec Sauvegarde Azure

**Resiliency** (qui étend l'ancien Azure Business Continuity Center) est l'endroit unique pour gérer la sauvegarde et la réplication entre coffres, abonnements et régions : lacunes de protection, travaux, alertes, métriques, rapports et stratégies de protection. Tâches courantes :

| Tâche | Comment |
| --- | --- |
| Vérifier l'état | Intégrité de l'élément de sauvegarde : Healthy, Unhealthy, NotReachable, IRPending |
| Alertes | Alertes basées sur Azure Monitor pour les échecs de travaux, acheminées par des groupes d'actions |
| Rapports | Rapports de sauvegarde, à partir des paramètres de diagnostic du coffre envoyés dans un espace de travail Log Analytics |
| Sauvegarde à la demande | Complète, différentielle, incrémentielle ou journal pour HANA ; une complète planifiée plus trois à la demande par jour recommandées, neuf tentatives au maximum |
| Modifier une stratégie | La modifier dans le coffre ; elle s'applique à tous les éléments protégés ; l'heure d'été n'est pas ajustée automatiquement |
| Arrêter la protection | Conserver les données de sauvegarde ou les supprimer |
| Se protéger contre la suppression | Suppression réversible (14 jours supplémentaires), coffre immuable, autorisation multi-utilisateur |
| Trouver les machines virtuelles non protégées | Vue de protection de Resiliency, contrôle de sauvegarde de Quality Insights, audit Azure Policy |

Rôles : **Backup Reader** consulte, **Backup Operator** exécute sauvegardes et restaurations, **Backup Contributor** gère aussi les stratégies et arrête la protection.

Opération propre à HANA : après la restauration de SYSTEMDB d'un système MDC, réexécutez le script de préinscription avant de restaurer les bases de locataires.

> **Piège d'examen.** Backup Operator peut exécuter et restaurer des sauvegardes, mais ne peut ni modifier les stratégies ni arrêter la protection avec suppression des données : il faut Backup Contributor.

<!-- section: acss-start-stop | objectives: 4.2.7 -->
## Démarrer et arrêter des systèmes SAP avec le Centre Azure pour les solutions SAP

Depuis la VIS, vous démarrez ou arrêtez tout le niveau application (ASCS et serveurs d'applications), une instance unique ou la base de données HANA. Types de déploiement : serveur unique, distribué, distribué avec haute disponibilité.

| Comportement | Détail |
| --- | --- |
| Machines virtuelles | Non arrêtées par défaut : utilisez `--deallocate-vm` à l'arrêt et `--start-vm` au démarrage |
| Ordre | Un système à haute disponibilité s'arrête proprement dans le bon ordre, sans basculement des services centraux |
| HANA | Toute l'instance s'arrête ; un locataire seul ne peut pas être arrêté. HANA en haute disponibilité exige un cluster |
| Arrêt progressif | `--soft-stop-timeout-seconds` laisse se terminer les appels RFC et HTTP ; 0 signifie arrêt immédiat |
| Délai | Les opérations de plus de 300 secondes s'interrompent ; la supervision continue de mettre à jour l'état |
| Même machine virtuelle | Plusieurs instances d'application sur une machine virtuelle s'arrêtent une à la fois |

Prérequis : rôle **Azure Center for SAP solutions administrator** sur la VIS ; `sapstartsrv` en cours d'exécution sur toutes les machines virtuelles ; pour le démarrage, machines virtuelles en cours d'exécution (ou `--start-vm`) ; pour la haute disponibilité, `sap_vendor_cluster_connector` installé sur l'instance ASCS ; pour HANA, mode maintenance du cluster **Disabled** pour arrêter et **Enabled** pour démarrer.

```bash
az workloads sap-virtual-instance stop --resource-group rg-sap-dev --name DEV --deallocate-vm true
az workloads sap-virtual-instance start --resource-group rg-sap-dev --name DEV --start-vm true
```

<!-- section: acss-vis | objectives: 4.2.8 -->
## Gérer les instances virtuelles pour solutions SAP

Une **Virtual Instance for SAP solutions (VIS)** représente un système SAP : le SID comme parent, avec des ressources enfants pour les services centraux, les instances de serveur d'applications et la base de données. Les ressources enfants n'ont pas de coût ; elles correspondent à des machines virtuelles hors de la VIS.

Inscrire un système existant :

- Inscrivez le fournisseur de ressources **Microsoft.Workloads** ; l'utilisateur a besoin de **Azure Center for SAP solutions administrator** et de **Managed Identity Operator**.
- Une **identité managée affectée par l'utilisateur** avec **Azure Center for SAP solutions service role** sur le groupe de ressources de calcul et **Reader** sur le groupe de ressources du réseau virtuel.
- Machines virtuelles en cours d'exécution, `sapstartsrv` et SAP Host Agent actifs, accès sortant à Stockage Azure, Azure Resource Manager et Microsoft Entra ID ; avec un accès restreint au stockage, le point de terminaison de service **Microsoft.Storage** sur tous les sous-réseaux SAP.
- Vous fournissez la machine virtuelle ASCS, le SID, le produit SAP, l'environnement et l'identité. Un groupe de ressources managé avec un compte de stockage est créé.

| Pris en charge | Non pris en charge |
| --- | --- |
| NetWeaver ABAP ; Windows, SUSE, RHEL ; HANA, Db2, SQL Server, Oracle, MaxDB, SAP ASE ; plusieurs instances d'application sur une machine virtuelle | Pile Java et double pile ; HANA scale-out, MCOS, MCOD ; HANA Large Instances ; systèmes répartis sur des réseaux virtuels appairés ; IPv6 ; plusieurs SID sur les mêmes machines virtuelles |

Opérations : vue d'ensemble avec état et intégrité, propriétés des instances, onglet **Supervision** (processeur, IOPS du disque de données de la base), Quality Insights, analyse des coûts des machines virtuelles, disques et équilibreurs de charge. Supprimer une VIS supprime la VIS, ses ressources enfants et son groupe de ressources managé, mais **pas** les machines virtuelles, les disques et les cartes réseau ; c'est irréversible, et le système peut être réinscrit.

> **Piège d'examen.** Ne supprimez pas le groupe de ressources managé d'une VIS : les fonctionnalités du service cessent de fonctionner jusqu'à la réinscription du système.

<!-- section: lama | objectives: 4.2.9 -->
## Implémenter le connecteur SAP LaMa pour Azure

Le connecteur SAP Landscape Management pour Azure (SAP LaMa 3.0 SP05 et ultérieur, **Enterprise Edition uniquement**, note SAP 2343511) appelle Azure Resource Manager pour libérer et démarrer des machines virtuelles, copier et déplacer des disques managés et supprimer des disques managés. LaMa s'en sert pour déplacer, copier, cloner et actualiser des systèmes SAP.

Configuration dans LaMa : **Infrastructure** > **Cloud Managers** > **Add** > **Microsoft Azure Cloud Adapter**, puis :

| Champ | Valeur |
| --- | --- |
| User Name / Password | ID d'application et secret du principal de service, ou vide pour une identité managée affectée par le système |
| Use Managed Identity | Recommandé quand LaMa s'exécute sur une machine virtuelle Azure |
| Subscription ID, Microsoft Entra tenant ID | Abonnement et locataire cibles |
| Monitoring Interval (Seconds) | Au moins 300 |
| Change Storage Type to save costs | Passe les disques des systèmes arrêtés ou non préparés en stockage Standard |

Attribuez à l'identité **Contributor** sur chaque groupe de ressources contenant des systèmes SAP gérés par LaMa. Préparez les hôtes pour la conception adaptative : SAP Adaptive Extensions et SAP Host Agent 7.21, noms d'hôtes virtuels ajoutés avec `sapacext`, Automatic Mountpoint Creation activé, un sous-réseau distinct avec des adresses IP statiques, `CLOUD_NETCONFIG_MANAGE` désactivé sur SUSE. Les volumes Azure NetApp Files simplifient le stockage de l'ASCS. LaMa ne peut pas déplacer SQL Server lui-même.

> **Piège d'examen.** Le connecteur n'est pas disponible dans l'édition Standard de LaMa, et un rôle Reader ne suffit pas : LaMa modifie des machines virtuelles et des disques, il lui faut Contributor.

<!-- section: key-points -->
## Points clés

- L'Azure VM extension for SAP solutions est le prérequis du support SAP ; Azure Monitor pour solutions SAP est de la télémétrie.
- Azure Monitor pour solutions SAP : sous-réseau /25 délégué à Microsoft.Web/serverFarms, fournisseurs par couche, agents sur chaque nœud.
- Les métriques de pourcentage consommé du disque et de la machine virtuelle localisent les goulets d'étranglement du stockage.
- Network Watcher diagnostique ; les journaux de flux NSG sont mis hors service le 30 septembre 2027 au profit des journaux de flux de réseau virtuel.
- Le Centre Azure pour les solutions SAP démarre et arrête SAP ; les machines virtuelles ne sont libérées qu'avec `--deallocate-vm`.
- Supprimer une VIS conserve les machines virtuelles ; LaMa exige l'Enterprise Edition et Contributor.
