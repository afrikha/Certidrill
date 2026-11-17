Un VPN de site à site (S2S) relie un réseau local à un réseau virtuel par des tunnels IPsec/IKE sur Internet. Quatre objets Azure interviennent toujours : **GatewaySubnet**, la **passerelle de réseau virtuel**, la **passerelle de réseau local** (le côté local) et la **connexion** qui les relie. Les questions portent sur la référence SKU, la conception pour la disponibilité, la correspondance des paramètres de chiffrement et la raison pour laquelle un tunnel reste tombé.

<!-- section: s2s-design | objectives: 2.1.1 -->
## Concevoir une connexion VPN de site à site pour la haute disponibilité

Prérequis : un appareil VPN compatible doté d'une **adresse IPv4 publique**, et des plages locales qui **ne chevauchent pas** les réseaux virtuels que vous connectez (sinon, des règles NAT sur la passerelle, plus bas).

Chaque passerelle VPN a deux instances. Les options de disponibilité :

| Conception | Tunnels | Comportement |
| --- | --- | --- |
| Actif-passif (par défaut) | 1 par connexion | En cas de maintenance ou de panne, l'instance de secours prend le relais : environ 10 à 15 secondes d'interruption pour une maintenance planifiée, jusqu'à 1 à 3 minutes pour un incident imprévu |
| Plusieurs appareils locaux | 1 par appareil | Protège contre une panne côté local. Une passerelle de réseau local et une connexion par appareil, des IP publiques uniques, **BGP obligatoire** (IP de pair BGP uniques, mêmes préfixes annoncés), ECMP |
| Passerelle en mode actif/actif | 2 par connexion (une par instance, chacune avec sa propre IP publique) | Azure envoie le trafic sur les deux tunnels ; l'appareil doit établir un tunnel vers **chaque** instance, sinon la connexion tombe pendant la maintenance |
| Double redondance | 4 (maillage complet) | Passerelle actif/actif + deux appareils locaux : deux passerelles de réseau local, deux connexions, BGP. La conception la plus résiliente |

Résilience de zone : les références SKU AZ (VpnGw1AZ à VpnGw5AZ) répartissent les instances entre zones de disponibilité dans les régions qui en ont. Autres choix de conception :

| Exigence | Conception |
| --- | --- |
| Plus de 100 tunnels S2S, ou de nombreuses agences avec un transit universel automatisé | Azure Virtual WAN au lieu de VPN Gateway |
| VPN de site à site en secours d'ExpressRoute dans le même réseau virtuel | Coexistence ExpressRoute/VPN : les deux passerelles dans un GatewaySubnet plus grand |
| Les réseaux des agences chevauchent le réseau virtuel | Règles NAT sur la passerelle (VpnGw2/VpnGw2AZ et au-delà) : IngressSNAT traduit les plages locales, EgressSNAT traduit la plage du réseau virtuel ; les règles statiques sont 1:1 et bidirectionnelles, les règles dynamiques n'autorisent que les flux lancés depuis le côté interne |
| Plusieurs sites sur une passerelle | Une passerelle de réseau local et une connexion par site ; les espaces d'adressage ne doivent pas se chevaucher entre connexions |

> **Piège d'examen.** Le mode actif/actif seul ne protège pas contre la panne de l'unique appareil local. « Survivre à la perte d'un appareil VPN local » exige deux appareils, deux passerelles de réseau local et BGP.

<!-- section: gateway-sku | objectives: 2.1.2 -->
## Sélectionner une référence SKU de passerelle de réseau virtuel

Depuis le 1er novembre 2025, les nouvelles passerelles VPN utilisent les références SKU **AZ**. Les passerelles VpnGw1-5 non AZ sont en cours de migration (sans interruption au sein de la même famille) ; après le déploiement de ce changement, une passerelle non AZ existante n'accepte plus de modification de configuration tant qu'elle n'est pas migrée. Basic n'est pas mis hors service.

| Référence SKU (génération) | Tunnels S2S | P2S IKEv2/OpenVPN | Débit agrégé | BGP | Redondance interzone |
| --- | --- | --- | --- | --- | --- |
| Basic (Gen1) | 10 | IKEv2 uniquement (ni OpenVPN, ni RADIUS) | 100 Mbit/s | Non | Non |
| VpnGw1AZ (Gen1) | 30 | 250 | 650 Mbit/s | Oui | Oui |
| VpnGw2AZ (Gen1 ou Gen2) | 30 | 500 | 1 / 1,25 Gbit/s | Oui | Oui |
| VpnGw3AZ (Gen1 ou Gen2) | 30 | 1 000 | 1,25 / 2,5 Gbit/s | Oui | Oui |
| VpnGw4AZ (Gen2) | 100 | 5 000 | 5 Gbit/s | Oui | Oui |
| VpnGw5AZ (Gen2) | 100 | 10 000 | 10 Gbit/s | Oui | Oui |

**Basic** est réservé au développement et au test : ni BGP, ni mode actif/actif, ni stratégie IPsec/IKE personnalisée, ni transit par passerelle, ni IPv6, et création en PowerShell ou CLI uniquement. Toutes les autres références SKU prennent en charge le VPN basé sur des routes, jusqu'à 100 tunnels selon la référence, le P2S, BGP, le mode actif/actif, la stratégie IPsec/IKE personnalisée et la coexistence avec ExpressRoute.

Un tunnel unique est plus lent que l'agrégat : environ 650 Mbit/s sur VpnGw1AZ et jusqu'à 2,3 Gbit/s sur VpnGw4AZ/5AZ avec GCMAES256, l'algorithme le plus rapide.

Changer de référence SKU : mise à niveau ou rétrogradation au sein de la famille AZ (environ 45 minutes, IP publique inchangée) ; Gen1 vers Gen2 AZ par migration. **Basic ne peut pas être redimensionné** : supprimez et recréez la passerelle, ce qui change son adresse IP publique.

<!-- section: s2s-implementation | objectives: 2.1.3 -->
## Implémenter une connexion VPN de site à site

Ordre des opérations :

1. Créer le réseau virtuel et le **GatewaySubnet** (/27 ou plus grand).
2. Créer la **passerelle VPN** (45 minutes ou plus) avec ses adresses IP publiques Standard.
3. Créer la **passerelle de réseau local** : IP publique ou FQDN de l'appareil, préfixes locaux, paramètres BGP le cas échéant.
4. Configurer l'**appareil VPN local** avec les adresses IP publiques de la passerelle (une par instance en mode actif/actif), la clé partagée et des paramètres IPsec/IKE concordants.
5. Créer la **connexion** (type **Site à site (IPsec)**) de la passerelle vers la passerelle de réseau local.
6. Vérifier : l'état de la connexion passe à **Connecté**.

Paramètres de la connexion dans le portail : clé partagée, protocole IKE (IKEv2 ou IKEv1), **Utiliser l'adresse IP privée Azure** (Use Azure Private IP Address), **Activer BGP**, stratégie IPsec/IKE (Par défaut ou Personnalisée), **Utiliser le sélecteur de trafic basé sur une stratégie**, **Délai d'expiration de DPD en secondes** (45), **Mode de connexion** (Default, InitiatorOnly = Azure initie, ResponderOnly = le réseau local initie ; IKEv2 basé sur des routes uniquement) et règles NAT.

```bash
az network local-gateway create --resource-group RG1 --name Site1 \
  --gateway-ip-address 203.0.113.10 --local-address-prefixes 192.168.0.0/16
az network vpn-connection create --resource-group RG1 --name VNet1toSite1 \
  --vnet-gateway1 VNet1GW --local-gateway2 Site1 --shared-key "<shared-key>"
```

La clé partagée peut être changée plus tard sur la page **Authentification** de la connexion ; mettez l'appareil à jour avec la même valeur.

<!-- section: policy-vs-route-based | objectives: 2.1.4 -->
## VPN basé sur des stratégies ou basé sur des routes

| | Basé sur des stratégies | Basé sur des routes |
| --- | --- | --- |
| Sélecteurs de trafic | Combinaisons de préfixes locaux et distants (une SA par paire) | Any-to-any ; la table de routage choisit le tunnel |
| Référence SKU Azure et IKE | Basic uniquement, IKEv1 | Toutes les références ; IKEv1 et IKEv2 (Basic : IKEv2) |
| Tunnels | 1 connexion S2S | Jusqu'à la limite de la référence SKU |
| P2S, BGP, actif/actif, réseau virtuel à réseau virtuel, transit | Non | Oui |
| Création | PowerShell ou CLI uniquement (pas le portail) | Portail, PowerShell, CLI |

Choisissez **basé sur des routes** dans presque tous les cas. Une passerelle basée sur des stratégies ne se convertit pas : supprimez-la et créez-en une basée sur des routes.

Pour connecter une passerelle basée sur des routes à des **pare-feu locaux basés sur des stratégies** (un ou plusieurs), activez les **sélecteurs de trafic basés sur une stratégie** (`UsePolicyBasedTrafficSelectors`) sur chaque connexion :

- Les appareils doivent prendre en charge **IKEv2**.
- L'option fait partie de la stratégie IPsec/IKE personnalisée : spécifiez la stratégie complète.
- L'appareil doit définir des sélecteurs pour chaque combinaison de préfixes locaux et Azure, pas any-to-any.
- Ces sites ne joignent que le réseau virtuel : **aucun transit** vers d'autres sites ou réseaux par la passerelle.

<!-- section: local-network-gateway | objectives: 2.1.5 -->
## Créer et configurer une passerelle de réseau local

Une passerelle de réseau local décrit un appareil VPN local : créez-en **une par appareil**. Sa région n'a pas besoin d'être celle du réseau virtuel.

| Champ | Contenu |
| --- | --- |
| Point de terminaison | **Adresse IP** (IP publique statique de l'appareil) ou **FQDN** (appareil derrière une IP dynamique avec un DNS dynamique) |
| Espace d'adressage | Préfixes locaux routés vers cet appareil ; ils ne doivent pas chevaucher d'autres réseaux connectés. N'y mettez pas l'IP publique de l'appareil lui-même |
| Paramètres BGP (onglet Avancé) | **ASN** local et **adresse IP du pair BGP** |

- FQDN : une seule adresse IPv4 utilisée (la première renvoyée), pas d'IPv6, résolution mise en cache et actualisée toutes les 5 minutes pour les tunnels déconnectés ; des FQDN différents doivent se résoudre en IP différentes.
- Avec BGP, laissez l'espace d'adressage vide ou minimal : Azure ajoute lui-même la route d'hôte vers l'IP du pair BGP, et une IP de pair APIPA ne peut pas y être saisie. Les préfixes ajoutés deviennent des routes statiques en plus de BGP.
- La modification des préfixes ou de l'IP de l'appareil se fait sur la page **Configuration** et peut brièvement déconnecter le tunnel. Passer d'une adresse IP à un FQDN, ou l'inverse, est impossible : supprimez les connexions, créez une nouvelle passerelle de réseau local, recréez les connexions.

<!-- section: ipsec-ike-policy | objectives: 2.1.6 -->
## Créer et configurer une stratégie IPsec/IKE

Sans stratégie personnalisée, la passerelle propose son jeu **par défaut**. Une stratégie **personnalisée** sur une connexion fait que la passerelle n'envoie et n'accepte **que** cette combinaison : l'appareil doit correspondre exactement, sinon le tunnel ne s'établit pas.

- VpnGw1-5 et VpnGw1AZ-5AZ (et les anciennes Standard et HighPerformance) uniquement, pas Basic.
- Une stratégie par connexion, et tous les paramètres sont obligatoires : chiffrement IKE, intégrité IKE, groupe DH (phase 1, mode principal), chiffrement IPsec, intégrité IPsec, groupe PFS (phase 2, mode rapide), durées de vie des SA.

| Paramètre | Options ou valeurs |
| --- | --- |
| Chiffrement IKEv2 | GCMAES256, GCMAES128, AES256, AES192, AES128 |
| Intégrité IKEv2 | SHA384, SHA256, SHA1, MD5 |
| Groupe DH | DHGroup24, ECP384, ECP256, DHGroup14 (= DHGroup2048), DHGroup2, DHGroup1, None |
| Chiffrement IPsec | GCMAES256, GCMAES192, GCMAES128, AES256, AES192, AES128, DES3, DES, None |
| Intégrité IPsec | GCMAES256, GCMAES192, GCMAES128, SHA256, SHA1, MD5 |
| Groupe PFS | PFS24, ECP384, ECP256, PFS2048, PFS2, PFS1, None |
| Durée de vie des SA en mode rapide | Par défaut 27 000 secondes (minimum 300) et 102 400 000 Ko (minimum 1 024) |
| Durée de vie des SA en mode principal | Fixée à 28 800 secondes |
| Délai d'expiration DPD | 45 secondes par défaut, de 9 à 3 600 ; 30 à 45 recommandés |

Avec GCMAES pour le chiffrement IPsec, utilisez le **même** algorithme GCMAES et la même longueur de clé pour l'intégrité IPsec. Les sélecteurs de trafic basés sur une stratégie et le délai d'expiration DPD peuvent aussi se définir avec la stratégie par défaut.

```powershell
$policy = New-AzIpsecPolicy -IkeEncryption AES256 -IkeIntegrity SHA384 -DhGroup DHGroup24 `
  -IpsecEncryption GCMAES256 -IpsecIntegrity GCMAES256 -PfsGroup PFS24 `
  -SALifeTimeSeconds 14400 -SADataSizeKilobytes 102400000
$conn = Get-AzVirtualNetworkGatewayConnection -Name VNet1toSite1 -ResourceGroupName RG1
Set-AzVirtualNetworkGatewayConnection -VirtualNetworkGatewayConnection $conn -IpsecPolicies $policy
```

<!-- section: virtual-network-gateway | objectives: 2.1.7 -->
## Créer et configurer une passerelle de réseau virtuel

| Paramètre | Règle |
| --- | --- |
| Type de passerelle | **VPN** (un réseau virtuel peut avoir une passerelle VPN et une passerelle ExpressRoute) |
| Type de VPN | Basé sur des routes (basé sur des stratégies seulement avec Basic, pas dans le portail) |
| Référence SKU et génération | Une référence SKU AZ ; Génération2 à partir de VpnGw2AZ |
| GatewaySubnet | Nommé exactement **GatewaySubnet**, /27 ou plus grand (/29 possible pour Basic uniquement) ; rien d'autre dedans ; **pas de NSG** ; pas d'UDR avec 0.0.0.0/0 ni qui abandonne la plage du sous-réseau ; propagation des routes de passerelle activée |
| Adresses IP publiques | **Standard**, statiques ; deux pour le mode actif/actif, et une troisième si une passerelle actif/actif sert aussi le P2S |
| BGP | ASN 65515 par défaut (modifiable ; plages privées 64512-65514 et 65521-65534) ; IP de pair BGP prise dans le GatewaySubnet ; adresses **APIPA** personnalisées de 169.254.21.0 à 169.254.22.255 quand l'appareil s'appaire en APIPA |

```bash
az network public-ip create --resource-group RG1 --name VNet1GWpip1 --sku Standard \
  --allocation-method Static --zone 1 2 3
az network public-ip create --resource-group RG1 --name VNet1GWpip2 --sku Standard \
  --allocation-method Static --zone 1 2 3
az network vnet-gateway create --resource-group RG1 --name VNet1GW --vnet VNet1 \
  --gateway-type Vpn --vpn-type RouteBased --sku VpnGw2AZ --vpn-gateway-generation Generation2 \
  --public-ip-addresses VNet1GWpip1 VNet1GWpip2 --no-wait
```

BGP sur la passerelle : pas sur Basic ni sur une passerelle basée sur des stratégies ; jusqu'à 4 000 préfixes d'un pair (au-delà, la session tombe) ; l'ASN local doit différer de l'ASN Azure ; keepalive 60 s et hold 180 s, fixes ; pas de BFD. Une passerelle actif-passif peut passer en mode actif/actif ; avec des IP de pair BGP non APIPA, cela provoque une interruption et les pairs BGP locaux doivent être mis à jour.

<!-- section: gateway-troubleshooting | objectives: 2.1.8 -->
## Diagnostiquer et résoudre les problèmes de connectivité d'une passerelle

Vérifiez, dans cet ordre, avant toute réinitialisation :

| Vérification | Erreur type |
| --- | --- |
| Clé partagée des deux côtés | Différente (`Authentication` dans la résolution des problèmes de VPN) |
| Adresses des pairs | L'IP de la passerelle de réseau local n'est pas celle de l'appareil, ou l'appareil cible la mauvaise IP de passerelle (les deux instances en mode actif/actif) |
| Paramètres IPsec/IKE | Stratégie personnalisée ou PFS que l'appareil ne respecte pas (`IkePolicyMismatch`) |
| Préfixes | Les préfixes de la passerelle de réseau local ne correspondent pas aux sous-réseaux locaux ; avec un appareil basé sur des stratégies, les sélecteurs doivent correspondre exactement ; IP publique de l'appareil incluse dans l'espace d'adressage |
| GatewaySubnet | NSG ou UDR 0.0.0.0/0 qui lui est associé |
| Intégrité de la passerelle | `https://<gateway-public-ip>:8081/healthprobe` (8083 pour la seconde IP en actif/actif) répond quand la passerelle est saine ; Basic ne répond pas ; la passerelle ne répond pas au ping |

Outils :

- **Résolution des problèmes de VPN** (Network Watcher) sur la passerelle ou la connexion, avec un compte de stockage pour les journaux.
- **Journaux de ressources** par un paramètre de diagnostic : `TunnelDiagnosticLog` (connexion/déconnexion avec motif), `IKEDiagnosticLog`, `RouteDiagnosticLog` (routes statiques et événements BGP), `GatewayDiagnosticLog` (configuration, basculement, maintenance).
- **Métriques** : Tunnel Bandwidth, Gateway S2S Bandwidth, BGP Peer Status ; règles d'alerte sur ces métriques.
- **Capture de paquets** sur la passerelle ou une connexion, avec des filtres.
- **Réinitialisation** (**Réinitialiser** dans le portail, `Reset-AzVirtualNetworkGateway`, `az network vnet-gateway reset`) : redémarre une instance et réapplique la configuration ; l'IP publique ne change pas. En actif-passif, relancez-la pour redémarrer l'autre instance. En actif/actif, utilisez `-GatewayVip` ou `--gateway-vip` pour cibler chaque instance. Une connexion peut aussi être réinitialisée seule.

> **Piège d'examen.** Le tunnel est **Connecté** mais les clients locaux ne joignent pas un spoke appairé : les sélecteurs de l'appareil ou les préfixes BGP/statiques n'incluent pas les plages du spoke, ou le peering du spoke n'utilise pas la passerelle distante. Le tunnel lui-même va bien.

<!-- section: azure-extended-network | objectives: 2.1.9 -->
## Implémenter Azure Extended Network

Azure Extended Network (réseau étendu pour Azure) étend un **sous-réseau** local dans Azure pour que les machines migrées gardent leurs adresses IP. Ne l'utilisez que lorsque les adresses ne peuvent vraiment pas changer, idéalement comme étape provisoire.

| Élément | Détail |
| --- | --- |
| Mécanisme | Un tunnel VXLAN (UDP 4789 par défaut) entre deux appliances virtuelles, chacune connectée au sous-réseau étendu ; une paire par sous-réseau étendu |
| Appliance Azure | VM **Windows Server 2022 Azure Edition** avec virtualisation imbriquée, rôle Hyper-V, deux cartes réseau : une dans un sous-réseau routable, une dans le sous-réseau étendu |
| Appliance locale | VM Windows Server 2019 ou 2022 sur un hyperviseur avec virtualisation imbriquée, deux cartes disposées de la même façon |
| Réseau Azure | Un réseau virtuel avec le sous-réseau étendu (même CIDR qu'en local) et un sous-réseau routable, relié par **VPN de site à site ou ExpressRoute** |
| Gestion | Extension **Extended network** de Windows Admin Center, exécutée depuis une troisième machine, connectée à Azure |
| Capacité | Jusqu'à 250 adresses IP étendues, environ 700 Mbit/s agrégés |

Étapes : préparer les deux appliances (Hyper-V, deux commutateurs virtuels externes), déployer depuis l'extension, puis ajouter de chaque côté les adresses IPv4 à étendre. Un pare-feu entre les sites doit autoriser le routage asymétrique et UDP 4789 ; le service `extnwagent` doit tourner sur les deux appliances. Learn précise que l'extension n'est pas disponible actuellement dans le flux d'extensions de Windows Admin Center version 2410.

<!-- section: key-points -->
## Points clés

- Quatre objets : GatewaySubnet, passerelle VPN, passerelle de réseau local, connexion ; la connexion est **Connectée** quand clés, adresses et chiffrement concordent.
- Disponibilité : mode actif/actif (deux tunnels par connexion) + deux appareils locaux avec BGP = quatre tunnels.
- Les nouvelles passerelles utilisent les références SKU AZ ; Basic : ni BGP, ni actif/actif, ni stratégie personnalisée, ni transit, ni redimensionnement.
- Basé sur des routes presque toujours ; basé sur des stratégies = Basic, IKEv1, un tunnel ; les sélecteurs de trafic basés sur une stratégie relient une passerelle basée sur des routes à des appareils basés sur des stratégies (IKEv2, pas de transit).
- Stratégie IPsec/IKE personnalisée : tous les paramètres, une par connexion, correspondance exacte sur l'appareil ; GCMAES pour les deux ou pour aucun.
- Dépannage : clé partagée, IP des pairs, stratégie, préfixes, NSG/UDR du GatewaySubnet, puis résolution des problèmes de VPN, journaux, réinitialisation.
- Azure Extended Network : VXLAN entre deux appliances Windows Server, gérées avec Windows Admin Center, 250 adresses.
