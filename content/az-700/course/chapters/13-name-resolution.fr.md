Une question de résolution de noms comporte trois éléments : qui pose la question (une machine virtuelle, un client local, un client internet), quel nom, et où se trouve l'enregistrement. La réponse est la pièce qui manque sur le chemin de la requête : un lien, un redirecteur, un point de terminaison ou une délégation.

<!-- section: vnet-name-resolution | objectives: 1.2.1 -->
## Concevoir la résolution de noms dans un réseau virtuel

| Option | Ce qu'elle apporte | Limites |
| --- | --- | --- |
| DNS fourni par Azure (par défaut) | Sans configuration, les machines virtuelles d'un même réseau virtuel se résolvent par leur nom d'hôte (suffixe `internal.cloudapp.net`) et résolvent les noms publics. Le service répond à l'adresse 168.63.129.16 | Limité à un seul réseau virtuel, même appairé. Ni suffixe personnalisé ni enregistrements personnalisés |
| Zone DNS privée Azure | Votre propre nom de domaine, avec des enregistrements manuels ou inscrits automatiquement, partagé par tous les réseaux virtuels liés, quelle que soit la région, avec ou sans peering | Ne répond qu'aux réseaux virtuels liés ; les clients locaux ont besoin d'un chemin de transfert |
| Serveurs DNS personnalisés | Maîtrise complète : domaines Active Directory, redirecteurs conditionnels | Des machines virtuelles à corriger et à maintenir hautement disponibles |
| Azure DNS Private Resolver | Transfert conditionnel managé entre Azure, le réseau local et d'autres réseaux | Exige ses propres sous-réseaux délégués ; n'héberge lui-même aucune zone |

| Scénario | Solution |
| --- | --- |
| Machines virtuelles dans des réseaux virtuels différents | Une zone DNS privée liée à chaque réseau virtuel ; les noms se résolvent par leur nom de domaine complet (FQDN) |
| Un suffixe de domaine à vous, avec des enregistrements automatiques pour les machines virtuelles | Une zone DNS privée avec inscription automatique |
| Les machines virtuelles Azure doivent résoudre des noms locaux | DNS Private Resolver : point de terminaison sortant et règle de transfert |
| Les clients locaux doivent résoudre les enregistrements d'une zone DNS privée | Un redirecteur conditionnel sur les serveurs DNS locaux, qui pointe vers un point de terminaison entrant de DNS Private Resolver |
| Machines virtuelles jointes à un domaine | DNS personnalisé : les contrôleurs de domaine, qui transfèrent tout le reste à 168.63.129.16 |

L'ordre de traitement d'une requête émise par une machine virtuelle explique la plupart des réponses :

1. Si le réseau virtuel (ou l'interface réseau) a des **serveurs DNS personnalisés**, la requête leur est envoyée et rien d'autre n'est consulté automatiquement.
2. Sinon, les zones DNS privées **liées au réseau virtuel** sont consultées.
3. Si aucune zone liée ne correspond, l'ensemble de règles de transfert DNS lié au réseau virtuel est évalué.
4. Si aucune règle ne correspond, Azure DNS résout le nom comme un nom public.

> **Piège d'examen.** Le peering connecte des espaces d'adressage, pas la résolution de noms. Après l'appairage de deux réseaux virtuels, une machine virtuelle ne résout toujours pas le nom d'hôte d'une machine de l'autre réseau : liez une zone DNS privée aux deux, ou utilisez un serveur DNS commun.

<!-- section: vnet-dns-settings | objectives: 1.2.2 -->
## Configurer les paramètres DNS d'un réseau virtuel

La page **Serveurs DNS** d'un réseau virtuel propose deux choix :

| Paramètre | Comportement |
| --- | --- |
| Par défaut (fourni par Azure) | Les machines virtuelles reçoivent 168.63.129.16 et le suffixe `internal.cloudapp.net` par DHCP |
| Personnalisé | Jusqu'à 20 adresses. Elles sont utilisées dans l'ordre de la liste, pas à tour de rôle : un client utilise le premier serveur qu'il peut joindre. Le suffixe Azure n'est plus fourni : utilisez des FQDN |

Une **interface réseau** a la même page, avec **Hériter du réseau virtuel** ou **Personnalisé**. Les serveurs définis sur l'interface réseau remplacent ceux du réseau virtuel.

```bash
az network vnet update --resource-group RG1 --name VNet1 --dns-servers 10.10.4.4 10.10.4.5

# One network interface with its own servers, then back to inheritance
az network nic update --resource-group RG1 --name vm1-nic --dns-servers 10.20.4.4
az network nic update --resource-group RG1 --name vm1-nic --dns-servers null
```

```powershell
$vnet = Get-AzVirtualNetwork -ResourceGroupName RG1 -Name VNet1
$vnet.DhcpOptions.DnsServers.Add("10.10.4.4")
Set-AzVirtualNetwork -VirtualNetwork $vnet
```

Les points que testent les questions :

- Les serveurs DNS sont distribués par DHCP. Après un changement, les machines virtuelles conservent les anciens serveurs jusqu'à leur **redémarrage** ou au renouvellement de leur bail (`ipconfig /renew`) ; une passerelle Application Gateway ou un Pare-feu Azure du réseau virtuel doit aussi être redémarré.
- Un serveur DNS personnalisé dans Azure doit **transférer à 168.63.129.16** ce qu'il n'héberge pas ; c'est ainsi que ses clients continuent à résoudre les noms d'hôtes Azure et les zones DNS privées liées. 168.63.129.16 ne répond que depuis l'intérieur d'Azure : un serveur DNS local doit donc cibler un serveur DNS ou un point de terminaison entrant situé dans un réseau virtuel.

<!-- section: public-zones | objectives: 1.2.3 -->
## Concevoir des zones DNS publiques

Azure DNS héberge une zone publique sur des serveurs de noms faisant autorité répartis dans le monde ; la zone est une ressource globale et l'emplacement de son groupe de ressources n'a pas d'importance. Azure DNS n'est pas un bureau d'enregistrement : vous achetez le nom de domaine ailleurs, puis vous le **déléguez**.

1. Créez la zone (`contoso.com`). Azure lui attribue quatre serveurs de noms, par exemple `ns1-37.azure-dns.com`, `ns2-37.azure-dns.net`, `ns3-37.azure-dns.org` et `ns4-37.azure-dns.info`.
2. Chez le bureau d'enregistrement, remplacez les enregistrements NS du domaine par **les quatre** serveurs de noms.

D'ici là, la zone ne répond qu'aux requêtes envoyées directement à ses serveurs de noms. Une **zone enfant** (`eu.contoso.com`) est une zone distincte, qu'une autre équipe peut gérer ; la zone parente contient un jeu d'enregistrements NS nommé `eu` qui liste les serveurs de noms de l'enfant. Le bouton **Zone enfant** (Child zone) de la zone parente crée les deux.

| Besoin | Conception |
| --- | --- |
| L'apex de la zone (`contoso.com`) doit pointer vers un profil Traffic Manager, un point de terminaison Azure Front Door ou un point de terminaison CDN | Un **jeu d'enregistrements d'alias** à l'apex ; un CNAME ne peut pas exister à l'apex |
| Un enregistrement doit suivre l'adresse d'une ressource d'adresse IP publique Azure et ne jamais rester orphelin | Un jeu d'enregistrements d'alias A ou AAAA qui cible l'adresse IP publique Standard : il est mis à jour quand l'adresse change et devient vide quand la ressource est supprimée |
| Des réponses différentes pour les clients internes et les clients internet | Split-horizon : une zone publique et une zone privée de même nom |
| Protection contre les réponses falsifiées | Signature DNSSEC de la zone publique, puis un enregistrement DS dans la zone parente par l'intermédiaire du bureau d'enregistrement |
| Un second fournisseur DNS pour la même zone | Ajoutez ses serveurs de noms au jeu d'enregistrements NS de l'apex. Les transferts de zone (AXFR/IXFR) ne sont pas pris en charge ; un fichier de zone s'importe avec Azure CLI |

Les jeux d'enregistrements d'alias existent pour les types A, AAAA et CNAME. Un jeu d'enregistrements regroupe les enregistrements de même nom et de même type, avec une seule durée de vie (TTL) ; une zone publique contient jusqu'à 10 000 jeux d'enregistrements de 20 enregistrements au plus.

<!-- section: private-zones | objectives: 1.2.4 -->
## Concevoir des zones DNS privées

Une zone DNS privée est une ressource globale : elle n'appartient à aucun réseau virtuel ni à aucune région, et elle n'est résolue que depuis les réseaux virtuels qui lui sont **liés**. Un lien joue l'un de ces deux rôles :

| Lien | Effet |
| --- | --- |
| Inscription (inscription automatique activée) | Les machines virtuelles du réseau virtuel obtiennent un enregistrement A dans la zone, et le réseau virtuel résout aussi la zone |
| Résolution (inscription automatique désactivée) | Le réseau virtuel résout tous les enregistrements de la zone, y compris ceux inscrits depuis d'autres réseaux virtuels |

| Limite | Valeur |
| --- | --- |
| Liens de réseau virtuel par zone privée | 1 000 |
| Liens avec inscription automatique par zone privée | 100 |
| Zones privées auxquelles un réseau virtuel peut être lié | 1 000 |
| Zones privées pour lesquelles un réseau virtuel est un réseau d'inscription | 1 |
| Jeux d'enregistrements par zone privée | 25 000 |

L'inscription automatique ne concerne que les machines virtuelles, que les enregistrements A, et que l'interface réseau principale. L'enregistrement est créé au démarrage de la machine virtuelle et supprimé quand elle est libérée ou supprimée. Les autres ressources, comme les équilibreurs de charge internes, demandent des enregistrements manuels. Désactiver l'inscription automatique sur un lien supprime immédiatement les enregistrements qu'il avait inscrits.

Règles de conception :

- Un nom de zone comporte au moins deux étiquettes (`contoso.com`, pas `contoso`) ; évitez `.local`. La délégation NS n'existe pas dans les zones privées : créez `eu.corp.contoso.com` comme une zone à part entière et liez-la.
- Dans une topologie hub-and-spoke, liez la zone à chaque réseau virtuel qui doit la résoudre, ou au hub seulement en envoyant les requêtes des spokes vers le hub avec DNS Private Resolver.
- Avec des serveurs DNS personnalisés, une zone liée n'est résolue que si le serveur personnalisé transfère la zone à 168.63.129.16 **depuis un réseau virtuel lié à la zone**.
- Pour les zones Private Link, l'option de lien **Activer le repli vers internet** (Enable fallback to internet, `resolutionPolicy: NxDomainRedirect`) résout le nom publiquement quand la zone privée répond qu'il n'existe pas.

<!-- section: configure-zones | objectives: 1.2.5 -->
## Configurer des zones DNS publiques et privées

```bash
# Public zone: an A record, an apex record and a CNAME
az network dns zone create --resource-group RG1 --name contoso.com
az network dns record-set a add-record --resource-group RG1 --zone-name contoso.com \
  --record-set-name www --ipv4-address 203.0.113.10
az network dns record-set a add-record --resource-group RG1 --zone-name contoso.com \
  --record-set-name "@" --ipv4-address 203.0.113.10
az network dns record-set cname set-record --resource-group RG1 --zone-name contoso.com \
  --record-set-name shop --cname www.contoso.com

# Name servers to give to the registrar
az network dns record-set ns show --resource-group RG1 --zone-name contoso.com --name "@"

# Private zone and a manual record
az network private-dns zone create --resource-group RG1 --name corp.contoso.com
az network private-dns record-set a add-record --resource-group RG1 --zone-name corp.contoso.com \
  --record-set-name db1 --ipv4-address 10.10.2.4
```

| Règle | Détail |
| --- | --- |
| Noms d'enregistrements | Relatifs à la zone ; `@` est l'apex et `*` un caractère générique |
| `add-record` | Ajoute un enregistrement et crée le jeu d'enregistrements au besoin ; un jeu d'enregistrements CNAME contient un seul enregistrement, défini avec `set-record` |
| CNAME | Ne peut pas coexister avec un autre jeu d'enregistrements de même nom, ni se trouver à l'apex |
| NS et SOA à l'apex | Créés et supprimés avec la zone. Vous pouvez ajouter des serveurs de noms au jeu d'enregistrements NS de l'apex, pas retirer ceux d'Azure DNS |
| Zones privées | Prennent en charge les enregistrements A, AAAA, CNAME, MX, PTR, SOA, SRV et TXT |

<!-- section: link-zone | objectives: 1.2.6 -->
## Lier une zone DNS privée à un réseau virtuel

Le lien est une ressource enfant de la zone : créez-le depuis la zone, sous **Liens de réseau virtuel**, ou avec Azure CLI.

```bash
az network private-dns link vnet create --resource-group RG1 --zone-name corp.contoso.com \
  --name link-vnet1 --virtual-network VNet1 --registration-enabled true
```

- Un seul lien peut exister entre une zone donnée et un réseau virtuel donné ; les noms de liens sont uniques dans la zone.
- Le réseau virtuel peut être dans une autre région, un autre abonnement ou un autre locataire : passez son ID de ressource. Il faut une autorisation d'écriture sur la zone (Private DNS Zone Contributor) et sur le réseau virtuel.
- Le lien fonctionne une fois que son **État du lien** (Link status) vaut `Completed`.
- Supprimer un réseau virtuel supprime ses liens et les enregistrements qu'il avait inscrits.

Quand une machine virtuelle ne résout pas un enregistrement d'une zone privée, vérifiez trois choses : son réseau virtuel est lié à la zone, ni le réseau virtuel ni l'interface réseau n'utilisent de serveurs DNS personnalisés, et l'enregistrement existe (un lien sans inscription automatique n'inscrit rien ; une machine virtuelle libérée n'a pas d'enregistrement).

<!-- section: private-resolver | objectives: 1.2.7 -->
## Azure DNS Private Resolver

DNS Private Resolver remplace les machines virtuelles de redirection DNS. Il est créé dans un réseau virtuel de sa région, et un réseau virtuel contient au plus un résolveur.

| Composant | Rôle | Règles |
| --- | --- | --- |
| Point de terminaison entrant | Une adresse IP privée (statique ou dynamique) qui reçoit les requêtes venant du réseau local ou d'autres réseaux et les résout avec Azure DNS, y compris les zones privées liées au réseau virtuel du résolveur | Son propre sous-réseau, de /28 à /24, délégué à `Microsoft.Network/dnsResolvers` ; jusqu'à 5 par résolveur |
| Point de terminaison sortant | La sortie par laquelle les requêtes transférées partent vers d'autres serveurs DNS | Son propre sous-réseau délégué ; jusqu'à 5 par résolveur |
| Ensemble de règles de transfert DNS | Jusqu'à 1 000 règles : un nom de domaine terminé par un point, et jusqu'à 6 serveurs cibles (adresse IP et port) | Rattaché à 2 points de terminaison sortants au plus, d'un même résolveur ; lié à 500 réseaux virtuels au plus, de la même région ; un seul ensemble de règles par réseau virtuel |

```text
On-premises client -> on-premises DNS, conditional forwarder for corp.contoso.com
                   -> inbound endpoint 10.10.0.4 -> private zone linked to the hub VNet

Azure VM (default DNS) -> ruleset linked to its VNet, rule "onprem.contoso.com."
                       -> outbound endpoint -> on-premises DNS 192.168.1.10:53
```

Les deux sens exigent une connectivité entre les sites (VPN ou ExpressRoute). Les règles sont sélectionnées par le **suffixe le plus long** ; la règle `.` est un caractère générique, et sa cible doit alors résoudre aussi les noms publics. 168.63.129.16 ne peut pas être une cible.

```powershell
New-AzDnsResolver -Name dnspr-hub -ResourceGroupName RG1 -Location westeurope `
  -VirtualNetworkId $hub.Id
$ipconfig = New-AzDnsResolverIPConfigurationObject -PrivateIPAllocationMethod Dynamic `
  -SubnetId $inboundSubnetId
New-AzDnsResolverInboundEndpoint -DnsResolverName dnspr-hub -Name in1 `
  -ResourceGroupName RG1 -Location westeurope -IpConfiguration $ipconfig
$out = New-AzDnsResolverOutboundEndpoint -DnsResolverName dnspr-hub -Name out1 `
  -ResourceGroupName RG1 -Location westeurope -SubnetId $outboundSubnetId

New-AzDnsForwardingRuleset -Name rs-hub -ResourceGroupName RG1 -Location westeurope `
  -DnsResolverOutboundEndpoint $out
$target = New-AzDnsResolverTargetDnsServerObject -IPAddress 192.168.1.10 -Port 53
New-AzDnsForwardingRulesetForwardingRule -ResourceGroupName RG1 `
  -DnsForwardingRulesetName rs-hub -Name onprem -DomainName "onprem.contoso.com." `
  -ForwardingRuleState Enabled -TargetDnsServer $target
New-AzDnsForwardingRulesetVirtualNetworkLink -ResourceGroupName RG1 `
  -DnsForwardingRulesetName rs-hub -VirtualNetworkLinkName link-spoke1 -VirtualNetworkId $spoke1.Id
```

Deux conceptions pour un réseau hub-and-spoke dont les zones privées ne sont liées qu'au hub :

| Conception | Configuration du spoke | Comment un spoke résout la zone privée |
| --- | --- | --- |
| Distribuée (liens d'ensemble de règles) | DNS par défaut ; l'ensemble de règles est lié à chaque spoke | Une règle pour la zone transfère vers le point de terminaison entrant du hub. Le peering n'est pas nécessaire pour que le lien d'ensemble de règles fonctionne |
| Centralisée (DNS personnalisé) | Serveurs DNS du spoke = adresse IP du point de terminaison entrant du hub | Chaque requête va au point de terminaison entrant ; un ensemble de règles lié au hub s'applique alors à toutes |

> **Piège d'examen.** Ne liez pas un ensemble de règles au réseau virtuel du point de terminaison entrant quand cet ensemble contient une règle qui cible ce point de terminaison entrant : les requêtes bouclent. Dans la conception distribuée, le hub est lié à la zone privée et les spokes sont liés à l'ensemble de règles.

<!-- section: key-points -->
## Points clés

- Le DNS fourni par Azure ne résout les noms d'hôtes qu'à l'intérieur d'un seul réseau virtuel ; le peering n'y change rien.
- Des serveurs DNS personnalisés remplacent tout : les zones privées ne sont résolues que si le serveur transfère à 168.63.129.16 depuis un réseau virtuel lié. Les paramètres de l'interface réseau priment sur ceux du réseau virtuel ; redémarrez ou renouvelez le bail après un changement.
- Zone publique : créez-la, puis déléguez avec les quatre serveurs de noms Azure. Apex pointant vers une ressource Azure = jeu d'enregistrements d'alias.
- Zone privée : globale, résolue uniquement depuis les réseaux virtuels liés ; une seule zone d'inscription par réseau virtuel ; inscription automatique = enregistrements A des machines virtuelles.
- Du réseau local vers Azure : redirecteur conditionnel vers un point de terminaison entrant. D'Azure vers le réseau local : point de terminaison sortant, ensemble de règles, règle, lien d'ensemble de règles.
- Ensemble de règles : le suffixe le plus long l'emporte, 1 000 règles, 500 liens dans la même région ; les sous-réseaux du résolveur sont dédiés, délégués, de /28 à /24.
