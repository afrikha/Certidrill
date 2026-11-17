La haute disponibilité de SAP sur Azure combine des fonctionnalités de l'infrastructure Azure (groupes à haute disponibilité ou zones, équilibreur de charge Standard, stockage partagé) avec le clustering applicatif (Pacemaker sur Linux, clustering de basculement Windows Server sur Windows) et la réplication des bases de données. L'examen demande quelle combinaison satisfait un SLA, comment configurer l'équilibreur de charge et la clôture (fencing), et quel stockage se réplique entre zones.

<!-- section: sla-design | objectives: 3.1.1 -->
## Concevoir en fonction des considérations liées au SLA

| Déploiement | SLA des machines virtuelles Azure (connectivité à au moins une instance) |
| --- | --- |
| Machine virtuelle unique avec du stockage premium pour tous ses disques | 99,9 % |
| Deux machines virtuelles ou plus dans le même groupe à haute disponibilité | 99,95 % |
| Deux machines virtuelles ou plus réparties sur des zones de disponibilité | 99,99 % |

Le SLA d'un système est le **produit** des SLA des composants dont il dépend : 99,95 % x 99,9 % x 99,9 % = 99,75 %. Les interruptions se comptent sur 30 jours (43 200 minutes) : 0,05 % équivaut à 21,6 minutes par mois.

Points de défaillance uniques (SPOF) d'un système SAP, et leur protection :

| Composant | Protection |
| --- | --- |
| ASCS/SCS (serveur de messages, serveur d'enqueue) | Cluster avec ERS : Pacemaker ou WSFC |
| Base de données | Réplication du SGBD avec un cluster : HANA System Replication, SQL Server Always On, Oracle Data Guard, Db2 HADR, SAP ASE HADR |
| `sapmnt` et autres systèmes de fichiers partagés | NFS ou SMB hautement disponible : Azure Files (ZRS), Azure NetApp Files, ou un disque partagé pour WSFC |
| Serveurs d'applications | Au moins deux instances sur des machines virtuelles différentes ; les groupes de connexion répartissent les utilisateurs |

Sans cluster, le **redémarrage de machine virtuelle Azure** (réparation de service, service healing) redémarre une machine virtuelle défaillante sur un autre hôte, mais aucun SLA ne porte sur la durée de ce redémarrage : acceptable pour les serveurs d'applications ou hors production, pas pour l'ASCS/SCS ni la base de données d'un système critique.

> **Piège d'examen.** Le SLA de 99,99 % des machines virtuelles zonales ne rend pas à lui seul un système SAP hautement disponible : chaque SPOF doit aussi être mis en cluster **entre zones**. Des machines virtuelles zonales avec une seule machine virtuelle ASCS/SCS ou de base de données restent un point de défaillance unique.

<!-- section: sets-and-zones | objectives: 3.1.2 -->
## Groupes à haute disponibilité et zones de disponibilité

| | Groupe à haute disponibilité | Zones de disponibilité |
| --- | --- | --- |
| Protège contre | Défaillance d'hôte, de rack, d'alimentation ou de commutateur dans un centre de données (domaines d'erreur) et maintenance planifiée (domaines de mise à jour, un seul redémarré à la fois) | Perte d'un centre de données entier (alimentation, refroidissement et réseau indépendants) |
| Disques | Les disques managés sont alignés sur le domaine d'erreur de la machine virtuelle | Les disques managés sont créés dans la zone de la machine virtuelle ; les disques managés sont obligatoires |
| Latence | La plus faible (un seul centre de données) | Variable entre zones : à mesurer |
| Restrictions de stockage | SSD Premium v2 et Disque Ultra non pris en charge | Disque Ultra et SSD Premium v2 pris en charge |
| Affectation | Seulement à la création de la machine virtuelle (ou lors d'un redéploiement) | Seulement à la création de la machine virtuelle |

Règles de conception :

- Groupes à haute disponibilité et zones sont **mutuellement exclusifs** pour une machine virtuelle ; les combiner dans un même système exige des groupes de placement de proximité.
- Utilisez **un groupe à haute disponibilité par rôle** (ASCS/ERS, base de données, serveurs d'applications), pour que les deux nœuds d'un cluster ne partagent jamais un domaine d'erreur.
- Pour les nouveaux déploiements zonaux, Microsoft recommande un **groupe de machines virtuelles identiques flexible avec `FD=1`**, seule configuration de groupe identique prise en charge pour SAP : machines virtuelles réparties sur les zones, et au mieux sur les domaines d'erreur dans chaque zone.
- Choisissez les deux zones à la latence la plus faible où toutes les tailles nécessaires sont disponibles ; certaines tailles n'existent que dans deux zones.
- Avec la clôture SBD dans un cluster zonal, le périphérique SBD (cible iSCSI ou disque partagé ZRS) utilise la troisième zone.

<!-- section: load-balancing | objectives: 3.1.3 -->
## Équilibrage de charge pour la haute disponibilité

Azure ne prend pas en charge l'ARP gratuit (gratuitous ARP) pour les adresses IP flottantes ; l'adresse IP virtuelle d'un cluster est donc publiée par un **équilibreur de charge Standard interne**. Le SKU De base n'est pas pris en charge pour SAP et il est mis hors service.

| Paramètre | Valeur |
| --- | --- |
| Adresse IP frontale | Une par nom d'hôte virtuel : ASCS, ERS, HANA primaire, éventuellement HANA secondaire accessible en lecture, écouteur SQL |
| Pool principal | Les nœuds du cluster |
| Règle | **Ports HA** (tous les ports, protocole All) |
| IP flottante | **Activée** |
| Délai d'inactivité | **30 minutes** |
| Sonde d'intégrité | TCP, intervalle de 5 secondes, `probeThreshold` 2 ; port `620<nr>` pour l'ASCS, `621<nr>` pour l'ERS, `625<nr>` pour HANA, `626<nr>` pour le secondaire HANA accessible en lecture |

```bicep
resource ilb 'Microsoft.Network/loadBalancers@2023-11-01' = {
  name: 'lb-nw1-ascs'
  location: location
  sku: { name: 'Standard' }
  properties: {
    frontendIPConfigurations: [ { name: 'fe-ascs', properties: { subnet: { id: subnetId }, privateIPAllocationMethod: 'Static', privateIPAddress: '10.0.0.7' } } ]
    backendAddressPools: [ { name: 'be-ascs' } ]
    probes: [ { name: 'hp-ascs', properties: { protocol: 'Tcp', port: 62000, intervalInSeconds: 5, probeThreshold: 2 } } ]
    loadBalancingRules: [ { name: 'lbr-ascs', properties: {
      frontendIPConfiguration: { id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', 'lb-nw1-ascs', 'fe-ascs') }
      backendAddressPool: { id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', 'lb-nw1-ascs', 'be-ascs') }
      probe: { id: resourceId('Microsoft.Network/loadBalancers/probes', 'lb-nw1-ascs', 'hp-ascs') }
      protocol: 'All', frontendPort: 0, backendPort: 0, enableFloatingIP: true, idleTimeoutInMinutes: 30 } } ]
  }
}
```

- Le « Seuil de défaillance » du portail (`numberOfProbes`) n'est pas respecté : définissez `probeThreshold` avec Azure CLI, PowerShell ou un modèle.
- Définissez `net.ipv4.tcp_timestamps = 0` sur les machines virtuelles Linux derrière l'équilibreur de charge, sinon les sondes échouent (saptune 3.1.1 ou ultérieur conserve la valeur).
- Dans Pacemaker, l'agent de ressource `azure-lb` répond à la sonde sur le nœud qui détient l'adresse IP virtuelle.
- L'équilibreur de charge interne ne donne aucun accès Internet sortant : utilisez une passerelle NAT si l'agent de clôture ou l'application des correctifs en ont besoin.

> **Piège d'examen.** Sans IP flottante, ou avec une règle d'équilibrage par port au lieu des ports HA, l'adresse IP du cluster ne suit pas correctement le basculement. Ports HA, IP flottante et délai d'inactivité de 30 minutes sont les trois paramètres à reconnaître.

<!-- section: hana-scs-clustering | objectives: 3.1.4 -->
## Clustering de HANA et de SAP Central Services

**HANA scale-up** utilise HANA System Replication (HSR) entre deux machines virtuelles de même taille, avec Pacemaker pour la reprise automatique (RPO de 0 avec la réplication synchrone, RTO faible). Sur SLES :

- Agents de ressources : **SAPHanaSR-angi** (HANA 2.0 SPS05 ou ultérieur, SLES for SAP 15 SP4 ou ultérieur) ou le classique **SAPHanaSR** ; les deux paquets sont mutuellement exclusifs.
- Un clone de **SAPHanaTopology** et un clone promouvable de **SAPHanaController** (SAPHana dans le paquet classique), plus un groupe IP (IPaddr2 et `azure-lb`) colocalisé avec l'instance promue.
- `PREFER_SITE_TAKEOVER="true"` ; `AUTOMATED_REGISTER="false"` pendant les tests de basculement, puis `true` pour que l'ancien primaire s'inscrive automatiquement comme secondaire.
- Hooks HANA : **susHanaSR** (SAPHanaSR pour le paquet classique) remonte l'état de la réplication au cluster ; **susChkSrv** agit immédiatement (par exemple `action_on_lost = fence`) quand l'index server plante.
- Avec `/hana/shared` sur NFS, la ressource **SAPHanaFilesystem** le surveille (`ON_FAIL_ACTION="fence"`).
- Un secondaire accessible en lecture utilise `--operationMode=logreplay_readaccess` et une seconde adresse IP frontale.

**ASCS/ERS** sur Linux utilise l'agent de ressource `SAPInstance` (`IS_ERS=true` pour l'ERS) et l'interface HA de SAP (`sap-suse-cluster-connector` sur SLES ; vérification avec `sapcontrol -nr 00 -function HACheckConfig`).

| | ENSA1 | ENSA2 |
| --- | --- | --- |
| Versions | NetWeaver plus ancien | Par défaut à partir d'ABAP Platform 1809 (disponible à partir de NetWeaver 7.52) |
| En cas de défaillance de l'ASCS | L'ASCS doit démarrer sur le nœud qui exécute l'ERS pour reprendre la table de verrous répliquée | L'ASCS peut redémarrer sur n'importe quel nœud ; l'ERS réplique les verrous par le réseau |
| Verrous au redémarrage de l'enqueue | Perdus | Conservés |
| Taille du cluster | Deux nœuds | Deux nœuds, ou trois nœuds (ENSA2 uniquement) |

Pour les nouveaux déploiements SLES 15, Microsoft recommande la configuration **simple mount** (systèmes de fichiers montés par le système d'exploitation, pas par le cluster). Sur Linux, un cluster peut héberger au plus cinq SID SAP (multi-SID).

**Windows** met l'ASCS/SCS en cluster avec WSFC, en utilisant soit un **partage de fichiers** (SMB sur Azure Files ou Azure NetApp Files, ou Scale-Out File Server), soit un **disque partagé** (disque partagé Azure sur SSD Premium, `Premium_LRS` avec des groupes à haute disponibilité, `Premium_ZRS` avec des zones, `maxShares` 2 ; ou SIOS DataKeeper). Utilisez Windows Server 2019 Datacenter ou ultérieur : WSFC y est compatible Azure et utilise un nom réseau distribué pour le nom du cluster.

```bash
sudo crm configure primitive rsc_sap_NW1_ERS02 SAPInstance \
  op monitor interval=11 timeout=60 on-fail=restart \
  params InstanceName=NW1_ERS02_nw1-aers START_PROFILE="/sapmnt/NW1/profile/NW1_ERS02_nw1-aers" \
  AUTOMATIC_RECOVER=false IS_ERS=true meta priority=1000
```

<!-- section: sql-clustering | objectives: 3.1.5 -->
## Clustering de SQL Server

Pour SAP sur SQL Server (Windows uniquement ; SAP ne prend pas en charge SQL Server sur Linux), la réponse de haute disponibilité est **les groupes de disponibilité Always On** sur un cluster WSFC.

| Option | Prise en charge par SAP |
| --- | --- |
| Groupe de disponibilité Always On, validation synchrone dans la région | Prise en charge, le choix standard |
| Instance de cluster de basculement (FCI) avec espaces de stockage direct ou disques partagés Azure | **Non prise en charge pour SAP** |
| Copie des journaux de transaction (log shipping) | Utilisée pour la reprise d'activité entre régions, rarement pour la haute disponibilité |
| Paramètres de connexion de la mise en miroir de bases de données (`dbs/mss/server`) | Seulement pour diagnostiquer des problèmes d'écouteur, deux réplicas uniquement |

Connectivité des clients au réplica principal :

| Écouteur | Exigence |
| --- | --- |
| Nom de réseau virtuel (VNN) dans un seul sous-réseau | Équilibreur de charge interne avec un port de sonde et l'IP flottante (Direct Server Return) ; adresses IP statiques sur les cartes réseau de la base de données |
| Nom de réseau distribué (DNN) | Aucun équilibreur de charge ; SQL Server 2019 CU8, SQL Server 2017 CU25 ou SQL Server 2016 SP3 ou ultérieur ; basculement plus rapide |
| Nœuds dans des sous-réseaux différents (multi-sous-réseau) | Ni équilibreur de charge ni DNN nécessaires |

Également : utilisez un **témoin cloud** pour le quorum, préférez la version de SQL Server la plus récente (SQL Server 2022), et placez tempdb sur le lecteur temporaire D: ou sur un disque séparé.

> **Piège d'examen.** « Utiliser un disque partagé Azure avec une instance de cluster de basculement SQL Server » est une conception Azure valide, mais pas une conception SAP prise en charge. Pour SAP, choisissez les groupes de disponibilité.

<!-- section: pacemaker-stonith | objectives: 3.1.6 -->
## Configurer Pacemaker et STONITH

Pacemaker est pris en charge sur SLES 12 et ultérieur et RHEL 7 et ultérieur. Un cluster sans clôture fonctionnelle (STONITH, « shoot the other node in the head ») n'est pas pris en charge : la clôture garantit qu'un nœud défaillant est arrêté avant le déplacement des ressources, ce qui évite le split brain.

| Paramètre | Valeur |
| --- | --- |
| `stonith-enabled` | `true` |
| `stonith-timeout` | 900 avec l'agent de clôture Azure ; 210 avec SBD |
| `token` de Corosync | 30000 ms |
| Course à la clôture dans un cluster à deux nœuds | `pcmk_delay_max=15` sur le périphérique de clôture ; les clusters HANA définissent aussi `priority-fencing-delay=30` pour que le primaire l'emporte |
| Événements planifiés Azure | Agent de ressource `azure-events-az` : définit `#health-azure` à -1000000 sur un nœud qui a une maintenance en attente, pour que les ressources s'en éloignent |
| Démarrage de Pacemaker après le boot | Minuteur systemd (`OnBootSec=216`) pour que le basculement se termine avant qu'un nœud redémarré rejoigne le cluster |
| Valeurs par défaut des ressources (HANA) | `resource-stickiness=1000`, `migration-threshold=5000` |

```bash
# SLES (crmsh)
sudo crm configure property stonith-enabled=true
sudo crm configure property stonith-timeout=900
sudo crm corosync set totem.token 30000
# RHEL (pcs): token set at cluster creation
sudo pcs cluster setup nw1-cluster sap-cl1 sap-cl2 totem token=30000
sudo pcs property set stonith-enabled=true
sudo pcs property set stonith-timeout=900
```

Avant une maintenance, placez le cluster en `maintenance-mode=true`. Aucune NVA ne doit se trouver sur le chemin de communication du cluster ni sur le chemin vers les cibles SBD.

<!-- section: fence-agent-sbd | objectives: 3.1.7 -->
## Agent de clôture Azure ou SBD

| | Agent de clôture Azure (Azure fence agent) | SBD avec des serveurs cibles iSCSI | SBD avec un disque partagé Azure |
| --- | --- | --- | --- |
| Mécanisme | `fence_azure_arm` met la machine virtuelle hors tension via Azure Resource Manager | Messages « poison pill » sur des périphériques de blocs partagés, plus un watchdog (`softdog`) | Identique, sur un disque managé attaché à tous les nœuds |
| Exigences | Identité managée **affectée par le système** sur chaque machine virtuelle (l'affectation par l'utilisateur n'est pas prise en charge), rôle personnalisé, accès sortant à `management.azure.com` et `login.microsoftonline.com` | **Trois** machines virtuelles cibles iSCSI (une seule cible est un SPOF ; avec deux, en perdre une bloque la clôture) dans la même région, aucune NVA sur le chemin | SSD Premium : `Premium_LRS` avec des groupes à haute disponibilité, `Premium_ZRS` avec des zones ; `maxShares` au moins égal au nombre de nœuds ; P1 ou P2 suffit |
| Dépend de | La disponibilité du plan de contrôle Azure | Des machines virtuelles supplémentaires à exploiter | La disponibilité du disque ; aucune machine virtuelle supplémentaire |

Rôle personnalisé de l'agent de clôture, attribué à l'identité managée de chaque machine virtuelle du cluster :

```json
{
  "Name": "Linux Fence Agent",
  "Description": "Allowed to power-off and start virtual machines",
  "AssignableScopes": [ "/subscriptions/<subscription id>" ],
  "Actions": [
    "Microsoft.Compute/*/read",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/start/action"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": []
}
```

```bash
sudo crm configure primitive rsc_st_azure stonith:fence_azure_arm params msi=true \
   resourceGroup="RG-SAP-PRD" subscriptionId="<subscription id>" \
   pcmk_host_map="sap-cl1:sapprdascs1;sap-cl2:sapprdascs2" \
   power_timeout=240 pcmk_reboot_timeout=900 pcmk_monitor_timeout=120 \
   pcmk_monitor_retries=4 pcmk_action_limit=3 pcmk_delay_max=15 \
   meta failure-timeout=120s op monitor interval=3600 timeout=120
```

`pcmk_host_map` associe les noms des nœuds du cluster aux noms des machines virtuelles Azure. Sur RHEL, les mêmes paramètres se passent à `pcs stonith create rsc_st_azure fence_azure_arm`. Un `fence_kdump` facultatif peut être ajouté comme premier niveau de clôture pour collecter un vidage sur incident, jamais comme seul niveau.

> **Piège d'examen.** Le rôle de l'agent de clôture a besoin de `powerOff` et `start`, pas de `deallocate` ni de `restart`, et l'identité doit être affectée par le système. Une identité affectée par l'utilisateur ou un rôle sans ces actions fait échouer la clôture.

<!-- section: storage-replication | objectives: 3.1.8 -->
## Réplication au niveau du stockage

Le stockage de blocs Azure conserve trois copies synchrones dans une zone, mais les disques de base de données n'ont aucune option redondante interzone :

| Stockage | Réplication entre zones | Usage SAP |
| --- | --- | --- |
| SSD Premium v1 (`Premium_ZRS`) | Synchrone, mais non testée avec les bases de données SAP | Non pris en charge pour les fichiers de base de données ; pris en charge pour les disques partagés Azure (ASCS/SCS sur WSFC, SBD) |
| SSD Premium v2, Disque Ultra | Aucune | Répliquer avec le SGBD (HSR, Always On) |
| Azure Files SSD (ZRS) | Synchrone sur trois zones, transparente pour les clients | Entièrement pris en charge pour `sapmnt`, le transport et la haute disponibilité des services centraux |
| Réplication entre zones d'Azure NetApp Files | **Asynchrone** vers un volume d'une autre zone | Résilience de zone pour les volumes qu'aucune réplication applicative ne protège ; destination en lecture seule jusqu'à la rupture de l'appairage de réplication (basculement manuel) ; aucun coût en plus des pools de capacité |
| Réplication entre régions d'Azure NetApp Files | Asynchrone vers une région appairée | Reprise d'activité ; facturée par Gio répliqué |
| SIOS DataKeeper | Miroir synchrone entre deux disques managés | Option tierce de disque partagé pour l'ASCS/SCS Windows |

Règles de conception :

- La haute disponibilité des bases de données entre zones repose sur la **réplication de la base de données** (HSR, Always On, Data Guard) : SSD Premium v2, Disque Ultra et Azure NetApp Files n'offrent aucune réplication synchrone entre zones.
- La réplication d'Azure NetApp Files est asynchrone : prévoyez un RPO supérieur à zéro et un basculement manuel. Les grands volumes ne prennent en charge la réplication entre zones qu'avec une planification horaire ou quotidienne.
- La latence d'écriture en ZRS est plus élevée qu'en LRS : mesurez les performances des disques partagés Premium_ZRS dans la région.

<!-- section: restart | objectives: 3.1.9 -->
## Redémarrer les systèmes SAP, les instances et les bases de données HANA

**Redémarrage de machine virtuelle Azure.** Quand un hôte tombe en panne, la réparation de service Azure redémarre la machine virtuelle sur un hôte sain. Azure ne redémarre pas une machine virtuelle Linux bloquée dans une panique du noyau (kernel panic) : définissez `kernel.panic` (20 à 30 secondes recommandées) pour que l'invité redémarre de lui-même.

**Démarrage automatique après le boot de la machine virtuelle**, pour les systèmes sans cluster :

```text
# Instance start profile (ABAP or Java instance, ASCS/SCS)
Autostart = 1
```

- SAP ne recommande plus `Autostart` (KBA SAP 1909114) : il ne permet pas d'ordonner le démarrage de plusieurs instances ou machines virtuelles. Désactivez-le avant l'exécution de Software Update Manager (SUM), qui redémarre des services.
- **N'utilisez jamais `Autostart` sur des instances en cluster** (ASCS/SCS, ERS, instance centrale en cluster) : c'est le cluster qui les démarre.
- HANA redémarre après un redémarrage de la machine virtuelle grâce au watchdog de ses services quand il n'est pas en cluster. Dans un cluster HSR, Pacemaker démarre HANA et décide quel site est primaire.
- Si systemd gère l'infrastructure de démarrage SAP (note SAP 3115048), désactivez les unités de service d'instance (`SAP<SID>_<nr>`) des instances en cluster pour qu'elles ne démarrent pas en dehors du cluster.

```bash
# Stop an instance and its service (as <sid>adm)
sapcontrol -nr 00 -function Stop
sapcontrol -nr 00 -function StopService
# Clustered instances: let the cluster restart them
sudo crm resource restart rsc_sap_NW1_ASCS00
```

Le Centre Azure pour les solutions SAP peut aussi démarrer et arrêter un système inscrit et ses machines virtuelles (voir le chapitre sur la supervision et la maintenance).

<!-- section: key-points -->
## Points clés

- Machine virtuelle unique avec stockage premium 99,9 %, groupe à haute disponibilité 99,95 %, zones 99,99 % ; multipliez les SLA des composants.
- Protégez chaque SPOF : ASCS/SCS (cluster avec ERS), base de données (réplication du SGBD et cluster), `sapmnt` (Azure Files ZRS ou Azure NetApp Files).
- Équilibreur de charge Standard interne : ports HA, IP flottante, délai d'inactivité de 30 minutes, sonde TCP `620<nr>`/`621<nr>`/`625<nr>`, `probeThreshold` 2, horodatages TCP désactivés.
- HANA : HSR + Pacemaker (SAPHanaSR-angi, susHanaSR, susChkSrv) ; ASCS/ERS : ENSA2 par défaut ; Windows : WSFC avec partage SMB ou disque partagé Azure.
- SQL Server pour SAP : groupes de disponibilité Always On (VNN avec équilibreur de charge, DNN ou multi-sous-réseau) ; pas de FCI.
- STONITH est obligatoire : agent de clôture Azure (identité affectée par le système, rôle powerOff/start) ou SBD (trois cibles iSCSI ou un disque partagé).
- Les bases de données se répliquent avec le SGBD ; Azure Files ZRS est synchrone ; la réplication d'Azure NetApp Files est asynchrone.
- `Autostart = 1` uniquement pour les instances hors cluster ; le cluster démarre les ressources en cluster.
