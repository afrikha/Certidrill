Une fois le circuit conçu, il faut le construire : peerings, passerelle, connexion, routage, chiffrement et détection de panne. L'examen teste l'ordre de ces opérations, les valeurs exactes attendues à chaque étape et les outils qui indiquent quel côté du circuit est en panne.

<!-- section: private-peering | objectives: 2.3.6 -->
## Configurer le peering privé Azure

Ordre des opérations pour un circuit passant par un fournisseur :

1. Créer le circuit (fournisseur, emplacement de peering, bande passante, référence SKU). Azure renvoie la **clé de service**.
2. Transmettre la clé de service au fournisseur, qui approvisionne son côté.
3. Attendre que l'**état du circuit** soit `Enabled` et l'**état du fournisseur** `Provisioned`.
4. Configurer les peerings.
5. Créer la passerelle et lier le réseau virtuel.

La facturation commence à l'émission de la clé de service, pas quand le fournisseur a terminé. Les peerings ne se configurent que sur un circuit approvisionné. Si le fournisseur vend un service de **couche 3 managé** (IPVPN), il configure les peerings pour vous ; avec un service de couche 2, c'est vous qui le faites.

Paramètres du peering privé :

| Paramètre | Règle |
| --- | --- |
| Sous-réseaux principal et secondaire | Deux sous-réseaux /30 (ou un /29 scindé en deux) ; en IPv6, deux /126. Adresses privées ou publiques, hors de tout espace d'adressage utilisé par des réseaux virtuels |
| Adresses d'interface | Dans chaque /30, votre routeur prend la **première** adresse utilisable et Microsoft la **seconde** |
| ID de VLAN | Non utilisé par un autre peering du circuit |
| ASN homologue | Votre numéro d'AS, sur 2 ou 4 octets ; ASN privés autorisés, sauf 65515 |
| Clé partagée | Hachage MD5 facultatif, identique des deux côtés |

Microsoft utilise l'AS **12076** sur les deux peerings et réserve 65515 à 65520 à un usage interne.

```powershell
$ckt = Get-AzExpressRouteCircuit -Name "ER-Circuit1" -ResourceGroupName "RG1"
Add-AzExpressRouteCircuitPeeringConfig -Name "AzurePrivatePeering" -ExpressRouteCircuit $ckt `
  -PeeringType AzurePrivatePeering -PeerASN 65010 `
  -PrimaryPeerAddressPrefix "192.168.100.128/30" `
  -SecondaryPeerAddressPrefix "192.168.100.132/30" -VlanId 200
Set-AzExpressRouteCircuit -ExpressRouteCircuit $ckt
```

Dans cet exemple, vos routeurs utilisent 192.168.100.129 et 192.168.100.133, et les MSEE utilisent .130 et .134. Rien n'est enregistré tant que `Set-AzExpressRouteCircuit` n'a pas été exécuté.

> **Piège d'examen.** Les deux sessions BGP, principale et secondaire, doivent être configurées. Microsoft ne prend pas en charge HSRP ni VRRP sur les liaisons : la redondance vient de la paire de sessions BGP.

<!-- section: microsoft-peering | objectives: 2.3.7 -->
## Configurer le peering Microsoft

Le peering Microsoft échange des routes **publiques**. En plus des deux sous-réseaux, de l'ID de VLAN et de l'ASN homologue, il exige :

| Paramètre | Règle |
| --- | --- |
| Sous-réseaux principal et secondaire | Deux sous-réseaux /30 **publics** qui appartiennent à vous ou à votre fournisseur, inscrits dans un registre de routage |
| Préfixes publics publiés | Les préfixes publics que vous annoncerez ; uniquement des préfixes inscrits à votre nom dans un RIR ou un IRR |
| Nom du registre de routage | ARIN, RIPENCC, APNIC, AFRINIC, LACNIC, RADB ou ALTDB |

Microsoft vérifie la propriété des préfixes et de l'ASN dans le registre. Si la vérification automatique échoue, `AdvertisedPublicPrefixesState` affiche `Validation needed` : ouvrez une demande de support et fournissez une preuve de propriété. D'ici là, le peering n'échange aucune route. Un ASN privé est autorisé sur le peering Microsoft mais exige une validation manuelle, et les ASN de documentation 64496 à 64511 ne sont pas autorisés dans le chemin d'AS.

Les adresses privées (RFC 1918) et les routes par défaut ne sont pas acceptées sur le peering Microsoft. Les hôtes locaux atteignent donc les services Microsoft par une traduction d'adresses (**NAT**) vers des adresses publiques.

**Filtre de routage.** Pour les circuits configurés à partir du 1er août 2017, Microsoft ne publie **aucun préfixe** tant qu'un filtre de routage n'est pas attaché au peering Microsoft. Un filtre de routage est une liste d'autorisation de valeurs de communauté BGP, une par service ou par région Azure :

1. Créer la ressource filtre de routage, au même emplacement que le circuit.
2. Ajouter son unique règle, de type **Allow**, qui liste les communautés de service voulues (par exemple Stockage Azure dans West Europe, ou Exchange Online).
3. Attacher le filtre au peering Microsoft du circuit.

Attacher un filtre qui contient des communautés Microsoft 365 échoue si l'abonnement n'est pas autorisé à utiliser Microsoft 365 sur ExpressRoute.

```powershell
Add-AzExpressRouteCircuitPeeringConfig -Name "MicrosoftPeering" -ExpressRouteCircuit $ckt `
  -PeeringType MicrosoftPeering -PeerASN 100 `
  -PrimaryPeerAddressPrefix "203.0.113.0/30" -SecondaryPeerAddressPrefix "203.0.113.4/30" `
  -VlanId 300 -MicrosoftConfigAdvertisedPublicPrefixes "203.0.113.128/25" `
  -MicrosoftConfigRoutingRegistryName "RIPENCC"
Set-AzExpressRouteCircuit -ExpressRouteCircuit $ckt
```

> **Piège d'examen.** « Le peering Microsoft est actif mais aucune route n'est reçue de Microsoft » : il manque un filtre de routage. « Le peering reste en `Validation needed` » : la propriété des préfixes n'a pas été prouvée.

<!-- section: expressroute-gateway | objectives: 2.3.8 -->
## Créer et configurer une passerelle ExpressRoute

Le peering privé atteint un réseau virtuel par une passerelle de réseau virtuel de type **ExpressRoute**, déployée dans `GatewaySubnet`. Un réseau virtuel peut contenir une passerelle ExpressRoute et une passerelle VPN, dans le même `GatewaySubnet`.

| SKU | Débit | Connexions de circuit maximales | FastPath |
| --- | --- | --- | --- |
| `Standard` / `ErGw1Az` | 1 Gbit/s | 4 | Non |
| `HighPerformance` / `ErGw2Az` | 2 Gbit/s | 8 | Non |
| `UltraPerformance` / `ErGw3Az` | 10 Gbit/s | 16 | Oui |
| `ErGwScale` | 1 Gbit/s par unité d'échelle, 1 à 40 unités | 4 (1 unité), 8 (2 unités), 16 (10 unités) | Oui, à partir de 10 unités d'échelle |

Règles :

- `GatewaySubnet` doit être en **/27 ou plus grand** ; /26 ou plus grand pour connecter 16 circuits. N'y déployez rien d'autre.
- Pas de groupe de sécurité réseau sur `GatewaySubnet`. Pas d'itinéraire défini par l'utilisateur avec 0.0.0.0/0 dessus, et la propagation des routes BGP doit rester activée.
- Les références SKU `Az` sont redondantes interzones. Les nouvelles passerelles reçoivent une adresse IP publique attribuée automatiquement et gérée par Microsoft : vous ne créez plus de ressource d'adresse IP publique.
- Quelle que soit la référence SKU, au plus 4 circuits du **même** emplacement de peering peuvent être liés à un réseau virtuel.

```powershell
$vnet = Get-AzVirtualNetwork -Name "VNet1" -ResourceGroupName "RG1"
$subnet = Get-AzVirtualNetworkSubnetConfig -Name "GatewaySubnet" -VirtualNetwork $vnet
$ipconf = New-AzVirtualNetworkGatewayIpConfig -Name "gwipconf" -SubnetId $subnet.Id
New-AzVirtualNetworkGateway -Name "ERGW1" -ResourceGroupName "RG1" -Location "westeurope" `
  -IpConfigurations $ipconf -GatewayType ExpressRoute -GatewaySku ErGw1AZ
```

> **Piège d'examen.** Le trafic entre réseaux virtuels liés au même circuit, ou entre un réseau virtuel et Virtual WAN par ExpressRoute, est désactivé par défaut sur la passerelle et doit être autorisé explicitement. Le chemin recommandé entre réseaux virtuels reste le peering de réseaux virtuels.

<!-- section: connect-vnet | objectives: 2.3.9 -->
## Connecter un réseau virtuel à un circuit

Prérequis : circuit approvisionné, peering privé configuré, passerelle ExpressRoute déployée. Le lien est une ressource **connexion** entre la passerelle et le circuit.

```powershell
$ckt = Get-AzExpressRouteCircuit -Name "ER-Circuit1" -ResourceGroupName "RG1"
$gw = Get-AzVirtualNetworkGateway -Name "ERGW1" -ResourceGroupName "RG1"
New-AzVirtualNetworkGatewayConnection -Name "ERConn1" -ResourceGroupName "RG1" `
  -Location "westeurope" -VirtualNetworkGateway1 $gw -PeerId $ckt.Id `
  -ConnectionType ExpressRoute
```

**Circuit dans un autre abonnement.** Le propriétaire du circuit crée une **autorisation** sur le circuit et envoie deux valeurs au propriétaire du réseau virtuel (l'utilisateur du circuit) : l'ID de ressource du circuit et la clé d'autorisation. L'utilisateur du circuit crée la connexion avec `-PeerId` et `-AuthorizationKey`.

| Fait | Détail |
| --- | --- |
| Une autorisation | Une connexion, donc un réseau virtuel |
| Qui paie le circuit | Le propriétaire du circuit ; tous les réseaux virtuels liés partagent la bande passante |
| Révoquer une autorisation | Le propriétaire du circuit la supprime ; les connexions qui l'utilisaient sont supprimées |

Paramètres de connexion et limites :

- **Poids de routage** (0 à 32000, 0 par défaut) : quand un réseau virtuel est lié à plusieurs circuits, la connexion de poids le plus élevé est préférée pour le trafic qui sort d'Azure.
- **FastPath** : `-ExpressRouteGatewayBypass` sur la connexion, avec une référence SKU de passerelle éligible.
- Un circuit Standard lie jusqu'à 10 réseaux virtuels, tous dans la même zone géopolitique que le circuit ; Premium lève la limite géographique et augmente le nombre. Un réseau virtuel peut être lié à 16 circuits au plus. À la création de la connexion, les réseaux virtuels local et reliés par peering doivent publier 200 espaces d'adressage au plus ; jusqu'à 1 000 peuvent être ajoutés ensuite.
- Les réseaux virtuels spoke n'ont pas chacun besoin d'une passerelle : reliez-les au hub par peering avec **Autoriser le transit par passerelle** côté hub et **Utiliser des passerelles distantes** côté spoke.

> **Piège d'examen.** La clé d'autorisation seule ne suffit pas : l'utilisateur du circuit a aussi besoin de l'ID de ressource du circuit (l'ID d'homologue). Et la connexion est créée dans l'abonnement de la passerelle, pas dans celui du circuit.

<!-- section: route-advertisement | objectives: 2.3.10 -->
## Recommander une configuration de publication de routes

| Limite | Valeur | En cas de dépassement |
| --- | --- | --- |
| Préfixes que vous publiez sur le peering privé | 4 000 IPv4 (10 000 avec Premium), 100 IPv6 | La session BGP est interrompue jusqu'à ce que le nombre repasse sous la limite |
| Préfixes que vous publiez sur le peering Microsoft | 200 par session | La session BGP est interrompue |
| Préfixes que la passerelle publie d'Azure vers le réseau local | 1 000 IPv4 | Résumer les espaces d'adressage des réseaux virtuels |

Recommandations selon le besoin :

| Besoin | Recommandation |
| --- | --- |
| Trop de routes locales pour un circuit Standard | Résumer les préfixes locaux, ou passer à Premium |
| Forcer le trafic Internet des réseaux virtuels à passer par le réseau local | Publier une route par défaut (0.0.0.0/0) sur le **peering privé** ; elle n'est jamais acceptée sur le peering Microsoft |
| Ne recevoir que les préfixes d'une région ou d'un service Azure sur le peering Microsoft | Filtre de routage avec les communautés BGP correspondantes |
| Faire préférer au réseau local un circuit pour une région Azure donnée | Repérer la communauté BGP régionale (par exemple `12076:51004` pour East US sur le peering Microsoft) et augmenter la préférence locale |
| Faire préférer à Microsoft un circuit pour vous joindre | Préfixage du chemin d'AS avec un numéro d'AS **public**, ou préfixes plus spécifiques sur le circuit préféré |
| Faire préférer à un réseau virtuel l'un de ses circuits | Poids de routage de la connexion |

À retenir :

- Publier une route par défaut envoie tout le trafic sortant des réseaux virtuels liés vers le réseau local, y compris le trafic vers les points de terminaison publics Azure et l'activation de Windows (KMS). Ajoutez des itinéraires définis par l'utilisateur pour les destinations qui doivent sortir directement.
- Microsoft marque chaque route qu'il publie avec des communautés BGP, mais **ignore** les communautés que vous posez sur vos routes. Microsoft retire aussi les numéros d'AS privés du chemin d'AS sur le peering Microsoft : préfixer un ASN privé n'y a donc aucun effet.

> **Piège d'examen.** Le poids de connexion est évalué avant la longueur du chemin d'AS. Un circuit au chemin d'AS plus long l'emporte quand même si sa connexion a le poids le plus élevé.

<!-- section: encryption | objectives: 2.3.11 -->
## Configurer le chiffrement sur ExpressRoute

Le trafic ExpressRoute est privé mais n'est pas chiffré par défaut. Deux mécanismes existent et peuvent se combiner :

| | MACsec | IPsec |
| --- | --- | --- |
| Couche et portée | Couche 2, les liaisons physiques entre vos routeurs de périphérie et les MSEE | Couche 3, de bout en bout entre le réseau local et le réseau virtuel |
| Disponible sur | **ExpressRoute Direct uniquement** | Tout circuit |
| Clés | Clé prépartagée que vous stockez dans **Azure Key Vault** ; vous décidez quand la renouveler | Gérées par la passerelle VPN et votre périphérique VPN |
| Par défaut | Désactivé sur les ports | Non configuré |
| Ressources Azure | Les ports ExpressRoute Direct et un coffre de clés | Une passerelle VPN dans le même réseau virtuel, ou une passerelle VPN Virtual WAN |

MACsec chiffre tout ce qui passe sur le port, BGP compris ; si les clés ne correspondent pas, la connectivité est perdue, sans repli en clair. Mise en place : un coffre de clés avec la suppression réversible activée et pas derrière un point de terminaison privé, le CKN et le CAK stockés comme secrets, une identité managée affectée par l'utilisateur qui les lit, puis MACsec sur les deux ports ou sur un seul ; activez SCI sur les ports quand le routeur local est un appareil Cisco.

Le **VPN de site à site sur le peering privé** chiffre de bout en bout sans utiliser d'adresses publiques :

1. Déployer une passerelle VPN (adresse IP publique Standard) à côté de la passerelle ExpressRoute.
2. Sur la passerelle VPN, régler **Adresses IP privées de la passerelle** sur **Activé** et noter l'adresse privée.
3. Sur la connexion, régler **Utiliser l'adresse IP privée Azure** sur **Activé**.
4. Faire pointer le périphérique VPN local vers l'adresse privée de la passerelle, joignable par le peering privé.

Pour qu'Azure envoie le trafic dans le tunnel, le réseau local doit publier sur le VPN des préfixes **plus spécifiques** que sur ExpressRoute ; avec des préfixes identiques, Azure emprunte directement le chemin ExpressRoute, non chiffré.

> **Piège d'examen.** « Chiffrer le trafic d'un circuit acheté à un fournisseur de services » ne peut pas être MACsec : la réponse est un VPN IPsec sur le circuit.

<!-- section: bfd | objectives: 2.3.12 -->
## Implémenter la détection de transfert bidirectionnel

Par défaut, une liaison en panne est détectée par les minuteurs BGP : keepalive de 60 secondes et temps de maintien de 180 secondes sur les MSEE, soit jusqu'à trois minutes. La **détection de transfert bidirectionnel (BFD)** détecte la panne en moins d'une seconde et fait basculer BGP aussitôt sur l'autre liaison.

- Côté Microsoft, BFD est **activé par défaut** sur les interfaces MSEE des nouveaux peerings privés et Microsoft, et ne peut pas être retiré.
- De votre côté, il est facultatif et demande deux étapes sur **les deux** routeurs de périphérie : activer BFD sur l'interface, puis le lier à la session BGP du voisin.
- L'intervalle des MSEE est de 300 ms (750 ms dans certains scénarios) ; l'homologue le plus lent fixe la cadence : vous pouvez donc configurer un intervalle plus long, pas plus court. Learn recommande de désactiver le mode écho BFD sur les connexions ExpressRoute.
- Pour un ancien peering créé avant l'activation par défaut de BFD (peering privé IPv4 avant août 2018, peering Microsoft IPv4 avant janvier 2020, peering IPv6 avant novembre 2025), **réinitialisez le peering** pour l'activer.

```text
interface TenGigabitEthernet2/0/0.150
   bfd interval 300 min_rx 300 multiplier 3
router bgp 65020
   address-family ipv4 vrf 15
      neighbor 192.168.15.18 remote-as 12076
      neighbor 192.168.15.18 fall-over bfd
```

> **Conseil d'examen.** « Le basculement entre les liaisons principale et secondaire prend jusqu'à trois minutes ; réduisez-le » a pour réponse « activer BFD sur les routeurs de périphérie du client », pas une modification dans Azure.

<!-- section: troubleshooting | objectives: 2.3.13 -->
## Diagnostiquer les problèmes de connexion ExpressRoute

Procédez du circuit vers le réseau virtuel :

| Étape | Vérification | Outil | En cas d'échec |
| --- | --- | --- | --- |
| 1 | État du circuit `Enabled` et état du fournisseur `Provisioned` | `Get-AzExpressRouteCircuit` | `Not enabled` : support Microsoft. `Not provisioned` : le fournisseur |
| 2 | Peering présent, `ProvisioningState` à `Succeeded`, sous-réseaux, ID de VLAN, ASN et clé MD5 conformes aux routeurs | `Get-AzExpressRouteCircuitPeeringConfig` | Corriger le peering, ou solliciter le fournisseur de couche 3 |
| 3 | Couche 2 : le MSEE voit l'adresse MAC de votre routeur | `Get-AzExpressRouteCircuitARPTable` | Entrée incomplète ou entrée Microsoft seule : problème de VLAN ou de couche 2 avec le fournisseur |
| 4 | Couche 3 : les préfixes locaux attendus sont reçus | `Get-AzExpressRouteCircuitRouteTable` | Session `Idle` ou `Active` : ASN, adresses, clé. Préfixe absent : publication ou filtre côté local |
| 5 | Les compteurs de trafic augmentent sur les deux liaisons | `Get-AzExpressRouteCircuitStats` | Zéro sur un chemin : cette liaison n'est pas utilisée |
| 6 | Paquets vus dans les deux sens sur chaque MSEE | **Tester la connectivité du peering privé**, sous Diagnostiquer et résoudre les problèmes | Reçus mais pas renvoyés : routage Azure ou itinéraires définis par l'utilisateur. Envoyés mais pas reçus : réseau local ou fournisseur |

Les commandes de table ARP et de table de routage prennent chacune `-DevicePath Primary` ou `Secondary` : exécutez les deux, car un circuit qui ne fonctionne que sur une liaison n'a plus de redondance.

Causes fréquentes :

- Session BGP interrompue à répétition : la limite de préfixes (4 000 ou 10 000) est dépassée.
- Circuit sain mais réseau virtuel injoignable : pas de connexion, passerelle non approvisionnée, ou peering de spoke sans **Utiliser des passerelles distantes**.
- Services Microsoft injoignables : pas de filtre de routage, ou préfixes en `Validation needed`.
- Gros paquets rejetés par la passerelle : la taille maximale des paquets TCP et UDP est de 1 400 octets et la passerelle ne prend pas en charge les fragments ; si la fragmentation est nécessaire, FastPath contourne la passerelle.

<!-- section: key-points -->
## Points clés

- Ordre : créer le circuit, transmettre la clé de service, attendre `Provisioned`, configurer les peerings, créer la passerelle, créer la connexion.
- Chaque peering : deux sous-réseaux /30, votre routeur sur la première adresse et Microsoft sur la seconde, un ID de VLAN, votre ASN ; Microsoft est l'AS 12076.
- Peering Microsoft : adresses publiques, validation de propriété, et aucune route reçue sans filtre de routage.
- Passerelle ExpressRoute : `GatewaySubnet` en /27 ou plus grand, sans NSG ; FastPath demande `UltraPerformance`, `ErGw3Az` ou `ErGwScale` avec 10 unités.
- Autre abonnement : clé d'autorisation plus ID de ressource du circuit ; une autorisation par connexion.
- Route par défaut uniquement sur le peering privé ; les limites de préfixes interrompent la session BGP ; le poids de connexion l'emporte sur la longueur du chemin d'AS.
- MACsec : ExpressRoute Direct uniquement, clé dans Key Vault. Sinon VPN IPsec sur le peering privé avec les adresses IP privées de la passerelle.
- BFD est activé par défaut sur les MSEE ; activez-le sur vos routeurs pour une détection en moins d'une seconde.
- Dépannage : état du circuit, configuration du peering, table ARP, table de routage, statistiques, test de connectivité.
