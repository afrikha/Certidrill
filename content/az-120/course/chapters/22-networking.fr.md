La conception réseau de SAP sur Azure est dominée par une contrainte : le chemin entre les serveurs d'applications et la base de données doit être court, direct et prévisible. Les questions d'examen la combinent avec les briques Azure habituelles (sous-réseaux, NSG, routage, points de terminaison privés, DNS, ExpressRoute) et demandent quelle conception est prise en charge, ou quelle fonctionnalité réduit la latence sans casser autre chose.

<!-- section: vnet-subnets | objectives: 2.2.1 -->
## Réseaux virtuels et sous-réseaux

La topologie courante est **hub and spoke** : le hub contient la passerelle ExpressRoute ou VPN, le pare-feu, Azure Bastion et les services partagés ; chaque environnement SAP (ou le paysage de production) est un spoke relié par peering au hub.

| Exigence | Conception |
| --- | --- |
| Séparer la couche application de la couche base de données | Des **sous-réseaux différents du même réseau virtuel**, ou des ASG dédiés dans un même sous-réseau |
| Couche application et base de données dans des réseaux virtuels différents | Non pris en charge, même avec un peering (qu'une telle configuration exigerait) ; le peering ajoute aussi un coût de transfert sur des téraoctets de trafic application-base de données |
| Volumes Azure NetApp Files | Un sous-réseau **délégué** à Azure NetApp Files ; une plage `/25` est recommandée pour SAP |
| Passerelle ExpressRoute ou VPN | `GatewaySubnet`, `/27` ou plus grand |
| Noms réservés | `GatewaySubnet`, `AzureFirewallSubnet`, `AzureFirewallManagementSubnet`, `AzureBastionSubnet` |
| Déploiement zonal | Un réseau virtuel et ses sous-réseaux couvrent toutes les zones de la région ; aucun réseau par zone n'est nécessaire |

Règles d'adressage :

- Attribuez les adresses IP **par Azure** (allocation statique sur la carte réseau pour la base de données et les nœuds de cluster), jamais de façon statique dans le système d'exploitation invité. Des services comme Sauvegarde Azure s'attendent à ce que la carte réseau principale au moins utilise DHCP du point de vue de l'invité.
- Les noms d'hôtes virtuels SAP peuvent utiliser des **configurations IP secondaires**, qui doivent provenir du sous-réseau de la carte réseau et être configurées de façon statique dans le système d'exploitation.
- Le réseau virtuel d'une carte réseau ne peut plus changer une fois la machine virtuelle déployée : dimensionnez les sous-réseaux avec de la marge (ACSS, par exemple, recommande `/26` plutôt que `/29`).
- Des cartes réseau supplémentaires n'ajoutent pas de bande passante. N'utilisez plusieurs cartes réseau que quand une machine virtuelle doit atteindre plusieurs sous-réseaux, par exemple pour séparer le trafic entre nœuds HANA scale-out du trafic client.

<!-- section: accelerated-networking | objectives: 2.2.2 -->
## Accelerated Networking

Accelerated Networking (SR-IOV) contourne le commutateur virtuel de l'hôte : latence plus faible, plus de paquets par seconde, moins de gigue et moins d'utilisation du processeur. Microsoft l'attend sur **chaque carte réseau de chaque machine virtuelle exécutant une charge de travail SAP** quand la taille le permet.

- Pris en charge sur la plupart des tailles à usage général et optimisées pour le calcul avec 2 processeurs virtuels ou plus (4 ou plus sur les tailles avec hyperthreading).
- Il ne peut pas être activé sur une machine virtuelle en cours d'exécution : **arrêtez (libérez)** la machine virtuelle, mettez à jour la carte réseau, puis redémarrez-la.
- Le gain s'applique entre machines virtuelles qui l'utilisent toutes deux dans le même réseau virtuel ; il a peu d'effet entre réseaux virtuels ou vers l'environnement local.
- Les images personnalisées ont besoin de pilotes compatibles SR-IOV (Mellanox ou MANA).

```bash
az vm deallocate --resource-group RG-SAP-PRD --name sapprdapp01
az network nic update --resource-group RG-SAP-PRD --name sapprdapp01-nic --accelerated-networking true
az vm start --resource-group RG-SAP-PRD --name sapprdapp01
```

> **Piège d'examen.** Ne mesurez pas la latence SAP avec `ping` : ICMP n'emprunte pas le chemin d'Accelerated Networking. L'outil de SAP est `niping`.

<!-- section: proximity-placement-groups | objectives: 2.2.3 -->
## Groupes de placement de proximité

Un groupe de placement de proximité (PPG) est une construction logique liée à une région et à un groupe de ressources. La première machine virtuelle déployée dedans (la machine virtuelle **d'ancrage**, ou d'étendue) fixe le centre de données ; chaque machine virtuelle suivante est placée près d'elle. L'option **intent** liste les tailles de machines virtuelles prévues, afin que le PPG soit créé dans un centre de données qui les propose toutes (la capacité n'est pas vérifiée, l'allocation peut donc encore échouer).

N'utilisez un PPG qu'en cas de besoin :

- La latence application-base de données est trop élevée et pénalise la charge de travail, ou vous devez combiner des **groupes à haute disponibilité avec des zones de disponibilité**.
- Un PPG par **système SAP**, jamais pour un paysage entier ; limitez le nombre de types de machines virtuelles qu'il contient.
- Contraintes : une taille peut ne pas exister dans le centre de données ancré, un redimensionnement vers une autre famille peut échouer, et la mise hors service de matériel peut déplacer des machines virtuelles.

Recommandation actuelle pour les systèmes zonaux : déployez sur les zones avec un **groupe de machines virtuelles identiques flexible avec `FD=1`** ; un déploiement zonal suffit en général à satisfaire le besoin de latence. Quand des groupes à haute disponibilité doivent être utilisés dans des zones, créez un PPG par zone, ancré par la **machine virtuelle ASCS/SCS** (les machines virtuelles de base de données ne font plus partie des PPG) :

```powershell
# 1. Anchor VM in zone 1
New-AzVm -ResourceGroupName "rg-sap-prd" -Name "ascs-z1" -Location "westeurope" -Zone "1" `
  -ProximityPlacementGroup "ppg-prd-z1" -Size "Standard_E8s_v4"
# 2. Availability set that references the PPG by its ID
New-AzAvailabilitySet -ResourceGroupName "rg-sap-prd" -Name "avset-app-z1" -Location "westeurope" `
  -ProximityPlacementGroupId $ppg.Id -Sku "aligned" -PlatformUpdateDomainCount 3 -PlatformFaultDomainCount 2
# 3. Application servers in the availability set and the PPG
New-AzVm -ResourceGroupName "rg-sap-prd" -Name "app-z1-01" -Location "westeurope" `
  -AvailabilitySetName "avset-app-z1" -ProximityPlacementGroup "ppg-prd-z1" -Size "Standard_E16s_v4"
```

Le **groupe de volumes d'application pour SAP HANA** d'Azure NetApp Files utilise par défaut (et de préférence) le placement de volume en zone de disponibilité, qui n'exige pas de PPG ; un PPG ancré aux machines virtuelles HANA, idéalement avec un groupe à haute disponibilité épinglé, est l'alternative, par exemple dans les régions sans zones.

> **Piège d'examen.** Un PPG n'apporte pas de haute disponibilité : il réduit seulement la distance, et les disques des machines virtuelles d'application peuvent même se retrouver dans une autre zone que les machines virtuelles. La disponibilité vient des zones ou des groupes à haute disponibilité.

<!-- section: latency-design | objectives: 2.2.4 -->
## Concevoir pour les exigences de latence SAP

La latence entre zones varie selon la région et ne peut pas être généralisée ; Azure ne garantit aucune distance entre zones. Avant une conception zonale :

1. Déployez la taille de la machine virtuelle de base de données dans les trois zones avec Accelerated Networking, et mesurez avec `niping` (notes SAP 500235 et 1100926).
2. Choisissez les **deux zones à la latence la plus faible** qui proposent toutes deux les tailles requises.
3. Comparez la latence intrazone à la latence interzone pour le chemin application-base de données. Les classes de la note SAP 1100926 sont indicatives : plus de 0,7 ms ne signifie pas que le système ne fonctionnera pas.
4. Recommencez par abonnement : le mappage des zones logiques vers les zones physiques diffère d'un abonnement à l'autre.

| Situation | Conception |
| --- | --- |
| Latence interzone acceptable | **Actif/actif** : serveurs d'applications dans les deux zones ; les groupes de connexion, de serveurs RFC et de traitement par lots gardent le travail sensible à la latence dans la zone de la base de données active |
| Latence interzone trop élevée pour le niveau application | **Actif/passif** : serveurs d'applications dans la zone de la base de données ; restauration automatique rapide après un basculement zonal |
| Latence la plus faible possible dans une zone | PPG pour ce système SAP |
| Réplication synchrone de la base de données entre zones | Viable : les plus grands systèmes NetWeaver et S/4HANA tournent avec une latence interzone inférieure à 1,5 ms |

Aucune appliance virtuelle réseau (NVA) ne doit se trouver entre la couche application et la base de données : les NVA peuvent doubler la latence et ne sont pas prises en charge sur ce chemin.

<!-- section: flow-control | objectives: 2.2.5 -->
## Contrôle de flux réseau

Utilisez des itinéraires définis par l'utilisateur (UDR) pour envoyer le trafic nord-sud et Internet vers un pare-feu du hub, en gardant ces chemins **directs** :

- serveurs d'applications vers base de données (et trafic entre nœuds HANA en scale-out) ;
- trafic du cluster Pacemaker, y compris le chemin vers les serveurs cibles iSCSI de SBD.

Une connectivité sortante est souvent nécessaire (agent de clôture Azure, dépôts du système d'exploitation, Sauvegarde Azure, Azure Site Recovery) :

- Les machines virtuelles du pool principal d'un **équilibreur de charge Standard interne**, sans adresse IP publique, n'ont pas d'accès Internet sortant.
- Pour les réseaux virtuels créés après le 31 mars 2026, les sous-réseaux sont privés par défaut : l'accès sortant par défaut est désactivé pour toutes les machines virtuelles.
- Recommandé : une **passerelle NAT Azure** sur les sous-réseaux SAP, avec des NSG qui limitent les destinations. Elle est prioritaire sur les règles de trafic sortant de l'équilibreur de charge et sur les adresses IP publiques d'instance. Alternatives : un équilibreur de charge Standard public avec règles de trafic sortant, Pare-feu Azure, ou un proxy.
- Avec un proxy ou un pare-feu qui filtre les URL, l'agent de clôture Azure a besoin de `https://management.azure.com` et `https://login.microsoftonline.com`.

> **Piège d'examen.** Faire passer le trafic application-base de données par Pare-feu Azure ou une NVA tierce « pour l'inspection » rend la conception non prise en charge. Filtrez plutôt ce chemin avec des NSG et des ASG.

<!-- section: network-security | objectives: 2.2.6 -->
## Sécurité réseau

- **NSG au niveau du sous-réseau** (NSG au niveau de la carte réseau seulement par exception), avec des **ASG** qui regroupent les machines virtuelles d'application, de base de données et des services centraux pour garder des règles lisibles ; une carte réseau peut appartenir à plusieurs ASG.
- **Aucune adresse IP publique** sur les machines virtuelles SAP ; les administrateurs y accèdent par **Azure Bastion** ou une machine de rebond (jump box) dans le hub.
- **SAProuter** sur sa propre machine virtuelle avec une adresse IP statique, ouverte seulement sur TCP 3299 vers SAP.
- **Pare-feu Azure** ou un pare-feu partenaire dans le hub pour le trafic Internet et local.

Ports à autoriser entre les niveaux (`NN` = numéro d'instance) :

| Port | Usage |
| --- | --- |
| `32NN` | Répartiteur SAP (dispatcher, SAP GUI) |
| `33NN` | Passerelle SAP (gateway, RFC) |
| `36NN` | Serveur de messages |
| `3NN13`, `3NN15` | Ports SQL HANA de la base système et de la base locataire |
| `1128`, `1129` | SAP Host Agent |
| `1433` | SQL Server |
| `3299` | SAProuter |

> **Conseil d'examen.** Les NSG et les ASG sont pris en charge sur le chemin application-base de données, tant que leurs règles autorisent une communication directe ; les NVA ne le sont pas.

<!-- section: storage-endpoints | objectives: 2.2.7 -->
## Points de terminaison de service et points de terminaison privés pour le Stockage Azure

| | Point de terminaison de service | Point de terminaison privé |
| --- | --- | --- |
| Fonctionnement | `Microsoft.Storage` activé sur le sous-réseau, et une règle réseau sur le compte de stockage | Une carte réseau avec une adresse IP privée de votre sous-réseau, mappée au compte de stockage (sous-ressource `file` ou `blob`) |
| Adresse de destination | Le point de terminaison public du compte de stockage | Adresse IP privée dans votre réseau virtuel |
| Accessible depuis l'environnement local et les réseaux reliés par peering | Non (seulement les sous-réseaux activés) | Oui |
| DNS | Aucun changement | Zone DNS privée `privatelink.file.core.windows.net` ou `privatelink.blob.core.windows.net` |
| Coût | Gratuit | Facturé par point de terminaison et par Go traité |

Pour SAP :

- Les **partages de fichiers Azure NFS** n'ont pas d'authentification des utilisateurs : les clients doivent se connecter par un **point de terminaison privé** ou par un **point de terminaison de service** avec des règles de réseau virtuel ; les règles IP ne sont pas prises en charge. Microsoft recommande des **points de terminaison privés** pour tout partage Azure Files NFS ou SMB utilisé par SAP, et la désactivation de l'accès réseau public.
- Avec Azure Files ZRS, un client NFS est redirigé vers une zone saine en cas de défaillance d'une zone, sans remontage.
- **Azure NetApp Files** n'utilise ni point de terminaison de service ni point de terminaison privé : les volumes reçoivent des adresses IP dans le sous-réseau délégué, accessibles depuis le même réseau virtuel ou des réseaux reliés par peering. Avec les fonctionnalités réseau Standard, seule option pour les volumes nouveaux ou modifiés depuis juillet 2026, le peering mondial fonctionne aussi (avec des frais de peering) ; les fonctionnalités réseau de base (Basic) sont limitées à la région.
- Les sauvegardes et les médias SAP dans le Stockage Blob utilisent un point de terminaison privé blob.

<!-- section: name-resolution | objectives: 2.2.8 -->
## Résolution de noms avec Azure DNS

SAP s'appuie sur la résolution des noms d'hôtes entre tous les composants, y compris les noms d'hôtes virtuels.

| Besoin | Solution |
| --- | --- |
| Résolution de noms des machines virtuelles dans Azure | Zone DNS privée Azure liée aux réseaux virtuels, avec inscription automatique des enregistrements des machines virtuelles |
| Noms d'hôtes virtuels SAP (ASCS, ERS, cluster HANA ou SQL) | Enregistrements A qui pointent vers l'**adresse IP frontale de l'équilibreur de charge interne** |
| Points de terminaison privés | Zone DNS privée `privatelink.<service>` liée aux réseaux virtuels ; avec le nom de zone recommandé, l'enregistrement est créé automatiquement |
| Clients locaux qui résolvent les zones privées Azure | Redirecteurs conditionnels vers un **point de terminaison entrant d'Azure DNS Private Resolver** (ou vers des serveurs DNS dans Azure qui redirigent vers `168.63.129.16`) |
| Machines virtuelles Azure qui résolvent les zones locales | **Point de terminaison sortant** de Private Resolver avec un ensemble de règles de transfert, ou serveurs DNS personnalisés définis sur le réseau virtuel |
| Systèmes Windows dans un domaine AD DS | DNS intégré à AD accessible depuis les sous-réseaux SAP |

Règles :

- Les redirecteurs conditionnels locaux ciblent la zone **publique** (`file.core.windows.net`), pas `privatelink.file.core.windows.net`.
- Utilisez une zone DNS privée par type de service de point de terminaison privé ; ne mélangez pas les enregistrements de plusieurs services dans une zone.
- Quand une ressource se résout en un nom `privatelink` pour lequel votre zone Private Link liée n'a pas d'enregistrement (par exemple un compte dont le point de terminaison privé est dans le réseau d'un autre locataire), la requête renvoie NXDOMAIN. Activez le repli vers Internet (`NxDomainRedirect`) sur la liaison de réseau virtuel pour la relancer sur le point de terminaison public ; il n'existe que pour les zones Private Link.

<!-- section: expressroute | objectives: 2.2.9 -->
## ExpressRoute pour la connectivité hybride

Microsoft recommande le **peering privé ExpressRoute** pour SAP en production ; le VPN convient aux petits sites ou sert de chemin de secours pour ExpressRoute.

| SKU de passerelle | Débit | FastPath |
| --- | --- | --- |
| Standard / ErGw1AZ | 1 Gbit/s | Non |
| HighPerformance / ErGw2AZ | 2 Gbit/s | Non |
| UltraPerformance / ErGw3AZ | 10 Gbit/s | Oui |
| ErGwScale | 1 Gbit/s par unité d'échelle | Oui, à partir de 10 unités d'échelle |

Les SKU `AZ` sont redondants interzone : utilisez-les avec les systèmes SAP zonaux.

**FastPath** envoie le trafic de l'environnement local directement aux machines virtuelles, en contournant la passerelle sur le chemin des données, pour une latence plus faible et un débit plus élevé. Limites à connaître :

- Le trafic vers les **équilibreurs de charge internes des réseaux virtuels spoke** (frontaux des clusters SAP), vers Pare-feu Azure ou DNS Private Resolver dans les spokes, et vers les services PaaS des spokes passe toujours par la passerelle ; les équilibreurs de charge internes, Pare-feu Azure et DNS Private Resolver du hub fonctionnent avec FastPath.
- Le peering de spokes via FastPath et les UDR via FastPath exigent **ExpressRoute Direct**, avec tous les réseaux virtuels dans la même région.
- Les volumes Azure NetApp Files ont besoin des **fonctionnalités réseau Standard**.

Résilience :

- Exploitez les deux connexions d'un circuit en **actif-actif**, sur des équipements client différents, et activez **BFD** pour détecter les défaillances en moins d'une seconde.
- L'emplacement de peering d'un circuit est une zone géographique unique : pour la reprise d'activité, ajoutez un **second circuit dans un autre emplacement de peering**, ou un VPN site à site de secours.
- `GatewaySubnet` est en `/27` ou plus grand (`/26` pour 16 circuits), sans NSG et sans UDR pour `0.0.0.0/0`.

> **Piège d'examen.** FastPath n'accélère pas les connexions de l'environnement local vers un frontal d'équilibreur de charge SAP situé dans un spoke : ce trafic traverse toujours la passerelle.

<!-- section: key-points -->
## Points clés

- Application et base de données dans des sous-réseaux différents d'un même réseau virtuel ; aucune NVA entre elles.
- Accelerated Networking sur chaque machine virtuelle SAP ; à activer sur une machine virtuelle libérée ; mesure avec `niping`.
- PPG seulement par système SAP et en cas de besoin ; les systèmes zonaux utilisent des groupes de machines virtuelles identiques flexibles avec `FD=1` ; avec zones et groupes à haute disponibilité, un PPG par zone ancré par la machine virtuelle ASCS.
- Choisissez les deux zones à la latence la plus faible ; l'actif/actif est préféré.
- Un équilibreur de charge Standard interne ne donne aucun accès sortant : ajoutez une passerelle NAT.
- Points de terminaison privés pour Azure Files ; Azure NetApp Files utilise un sous-réseau délégué.
- Les noms d'hôtes virtuels se résolvent vers les adresses IP frontales des équilibreurs de charge ; Private Resolver pour le DNS hybride.
- ExpressRoute avec des passerelles redondantes interzone ; FastPath exige ErGw3AZ, UltraPerformance ou ErGwScale (10 unités ou plus) et ne s'applique pas au trafic vers les équilibreurs de charge des spokes.
