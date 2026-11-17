Deux réseaux virtuels ne communiquent jamais par défaut. Le peering les relie par le réseau principal de Microsoft, le transit par passerelle leur fait partager une même passerelle VPN ou ExpressRoute, les routes définies par l'utilisateur font passer leur trafic par une appliance, et Azure Virtual Network Manager construit et impose tout cela à grande échelle. Les questions d'examen décrivent une topologie et demandent quel paramètre, de quel côté, il manque.

<!-- section: service-chaining | objectives: 1.3.1 -->
## Concevoir le chaînage de services et le transit par passerelle

Dans une conception hub-and-spoke, le hub héberge les composants partagés (un pare-feu ou une autre appliance virtuelle réseau, une passerelle VPN ou ExpressRoute, Azure Route Server) et chaque spoke est appairé au hub. Deux mécanismes rendent le hub utile :

| Mécanisme | Ce qu'il fait | Comment le configurer |
| --- | --- | --- |
| Chaînage de services | Envoie le trafic d'un spoke vers une appliance ou une passerelle du hub appairé | Une route définie par l'utilisateur dans le spoke dont le tronçon suivant est l'adresse IP privée de l'appliance (ou d'un équilibreur de charge interne placé devant elle), ou la passerelle de réseau virtuel |
| Transit par passerelle | Permet aux spokes d'utiliser la passerelle du hub pour joindre les réseaux locaux ou les autres réseaux virtuels qui y sont connectés | Les paramètres de peering des deux côtés : le hub autorise sa passerelle à transférer le trafic, le spoke utilise la passerelle distante |

Le peering n'est **pas transitif**. Si Spoke1 et Spoke2 sont tous deux appairés au Hub, Spoke1 ne peut pas joindre Spoke2 par le Hub. Les options :

| Exigence | Solution |
| --- | --- |
| Le trafic entre spokes doit être inspecté | Des UDR dans les deux spokes vers le pare-feu du hub, le **trafic transféré** autorisé sur les peerings, le transfert IP activé sur l'interface réseau de l'appliance |
| Trafic entre spokes avec la latence la plus faible, sans inspection | Appairer directement les spokes, ou utiliser la connectivité directe (maillage) de Virtual Network Manager |
| Les spokes doivent joindre le réseau local par une seule passerelle | Le transit par passerelle depuis le hub |
| Les spokes doivent apprendre les routes d'une appliance sans UDR par spoke | Azure Route Server dans le hub, les spokes utilisant la passerelle distante ou le Route Server |

Règles du transit par passerelle :

- La passerelle est dans le hub. Le spoke qui utilise la passerelle distante **ne peut pas avoir sa propre passerelle**, et un seul de ses peerings peut utiliser une passerelle distante.
- Le transit par passerelle fonctionne avec le peering local et mondial, et avec toutes les références SKU VPN Gateway **sauf Basic**.
- Les routes vers les réseaux locaux se propagent automatiquement aux sous-réseaux des spokes. Une table de routage dont la propagation des routes de passerelle est désactivée les bloque sur un sous-réseau donné.
- L'appareil VPN local doit aussi considérer les **préfixes des spokes** comme du trafic intéressant : ajoutez toutes les plages Azure (hub, spokes, pool point à site) à ses sélecteurs de trafic, ou annoncez-les par BGP.
- Une UDR peut prendre une passerelle VPN comme tronçon suivant, pas une passerelle ExpressRoute : on ne route pas entre réseaux virtuels par une passerelle ExpressRoute.

> **Piège d'examen.** Un spoke pour lequel **Permettre ... d'utiliser la passerelle distante ou le serveur de routes** est activé ne joint pas le réseau local si le peering du hub n'a pas **Autoriser la passerelle ou le serveur de routes ... à transférer le trafic**, et l'option ne peut même pas être activée tant que le hub n'a ni passerelle ni Route Server. Créez d'abord la passerelle, puis configurez les deux côtés.

Quand deux réseaux virtuels sont reliés à la fois par un peering et par une connexion VPN de réseau virtuel à réseau virtuel, le trafic entre eux passe par le peering.

<!-- section: vnet-peering | objectives: 1.3.2 -->
## Implémenter le peering de réseaux virtuels

| Type | Portée |
| --- | --- |
| Peering de réseaux virtuels | Deux réseaux virtuels de la même région |
| Peering de réseaux virtuels mondial | Des réseaux virtuels de régions différentes du même cloud (pas entre Azure public et Azure exploité par 21Vianet, par exemple) |

Exigences et comportement :

- Les espaces d'adressage **ne doivent pas se chevaucher**. Les abonnements et les locataires Microsoft Entra peuvent différer ; avec PowerShell ou Azure CLI, passez l'ID de ressource complet d'un réseau virtuel distant situé dans un autre abonnement ou un autre groupe de ressources.
- Un peering est une paire de liens, un par réseau virtuel. Le premier lien affiche **Démarré** (Initiated) ; le peering ne fonctionne que lorsque les deux liens affichent **Connecté**. Le portail crée les deux liens en une seule opération si vous avez accès aux deux réseaux.
- Supprimer un peering d'un réseau virtuel supprime aussi le lien du réseau virtuel distant.
- Autorisations : **Network Contributor**, ou un rôle personnalisé avec `Microsoft.Network/virtualNetworks/virtualNetworkPeerings/write`, `read` et `delete`.
- Aucune interruption à la création d'un peering. Dans une même région, la latence est celle d'un réseau unique, et la bande passante n'est limitée que par la taille de la machine virtuelle. Le trafic de peering est facturé en entrée et en sortie.
- La résolution de noms Azure par défaut ne traverse pas un peering : utilisez des zones DNS privées ou un DNS personnalisé.
- Après l'appairage d'un réseau joint par des clients point à site, téléchargez et réinstallez le package du client VPN pour que les clients reçoivent les nouvelles routes.

Chaque lien a quatre paramètres, formulés du point de vue du réseau local (`vnet-1`) :

| Paramètre du portail | Par défaut | Effet |
| --- | --- | --- |
| Autoriser « vnet-1 » à accéder au réseau virtuel appairé | Coché | Le trafic circule ; l'étiquette de service `VirtualNetwork` inclut alors le réseau appairé. Le décocher bloque le trafic sans supprimer le peering |
| Autoriser « vnet-1 » à recevoir le trafic transféré du réseau virtuel appairé | Décoché | Accepte le trafic qui n'est pas né dans le réseau appairé, par exemple celui que transfère son NVA. Ne crée aucune route |
| Autoriser la passerelle ou le serveur de routes dans « vnet-1 » à transférer le trafic vers le réseau virtuel appairé | Décoché | Transit par passerelle, côté hub. Exige une passerelle ou un Route Server dans `vnet-1` |
| Permettre à « vnet-1 » d'utiliser la passerelle distante ou le serveur de routes des réseaux virtuels appairés | Décoché | Transit par passerelle, côté spoke. Exige le paramètre de transfert de l'autre côté |

```bash
# Hub side: allow transit through the hub gateway
az network vnet peering create --resource-group RG1 --name hub-to-spoke1 \
  --vnet-name Hub --remote-vnet /subscriptions/SUB2/resourceGroups/RG2/providers/Microsoft.Network/virtualNetworks/Spoke1 \
  --allow-vnet-access --allow-forwarded-traffic --allow-gateway-transit

# Spoke side: use the hub gateway
az network vnet peering create --resource-group RG2 --name spoke1-to-hub \
  --vnet-name Spoke1 --remote-vnet /subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/virtualNetworks/Hub \
  --allow-vnet-access --allow-forwarded-traffic --use-remote-gateways
```

```powershell
$hub = Get-AzVirtualNetwork -Name Hub -ResourceGroupName RG1
$spoke = Get-AzVirtualNetwork -Name Spoke1 -ResourceGroupName RG2
Add-AzVirtualNetworkPeering -Name hub-to-spoke1 -VirtualNetwork $hub -RemoteVirtualNetworkId $spoke.Id -AllowGatewayTransit
Add-AzVirtualNetworkPeering -Name spoke1-to-hub -VirtualNetwork $spoke -RemoteVirtualNetworkId $hub.Id -UseRemoteGateways
```

Autres opérations que décrivent les questions :

- **Redimensionner un espace d'adressage appairé** : ajoutez, supprimez ou modifiez une plage d'un réseau virtuel appairé sans interruption, puis **synchronisez** chaque lien de peering (portail ou PowerShell). Lancez la synchronisation après chaque redimensionnement.
- **Peering de sous-réseaux** : appaire des sous-réseaux choisis au lieu de tout l'espace d'adressage (`--peer-complete-vnet false` avec `--local-subnet-names` et `--remote-subnet-names`). Il exige l'inscription de l'abonnement et se configure avec Azure CLI, PowerShell, des modèles ARM, l'API ou Terraform, pas avec le portail.
- **Dépannage** : les itinéraires effectifs d'une interface réseau affichent une route de type de tronçon suivant **Peering de réseaux virtuels** (Virtual network peering) par plage d'adresses du réseau appairé. Pas de route alors que le peering est **Connecté** : attendez et réessayez, puis vérifiez les groupes de sécurité réseau avec Network Watcher.

> **Piège d'examen.** « VNet1 est appairé à VNet2, VNet2 à VNet3 ; VM1 dans VNet1 ne joint pas VM3 dans VNet3. » La solution est un peering direct VNet1-VNet3, ou un NVA dans VNet2 avec des UDR et le **trafic transféré** autorisé. Activer le transit par passerelle ne route pas entre spokes.

<!-- section: virtual-network-manager | objectives: 1.3.3 -->
## Gérer la connectivité avec Azure Virtual Network Manager

Azure Virtual Network Manager (le gestionnaire de réseau) applique des configurations de connectivité, d'administration de la sécurité et de routage à des groupes de réseaux virtuels, entre abonnements, régions et même locataires. Quatre étapes, toujours dans cet ordre :

1. **Créer le gestionnaire de réseau** avec son **étendue** (groupes d'administration et/ou abonnements) et ses **fonctionnalités** (les types de configuration qu'il peut déployer : Connectivity, SecurityAdmin, Routing). Avec une étendue de groupe d'administration, le fournisseur de ressources Microsoft.Network doit être inscrit au niveau du groupe d'administration ; le portail le fait pour vous, les scripts non.
2. **Créer des groupes réseau** et définir leurs membres.
3. **Créer des configurations** qui ciblent les groupes réseau.
4. **Déployer** les configurations dans des régions. Rien ne change avant cette étape.

Deux gestionnaires de réseau ne peuvent pas avoir des étendues qui se chevauchent avec les mêmes fonctionnalités. Avec des fonctionnalités différentes, c'est possible ; en cas de conflit, la configuration du gestionnaire dont l'étendue est la plus haute l'emporte.

| Appartenance au groupe réseau | Comment | Convient à |
| --- | --- | --- |
| Statique | Vous ajoutez les réseaux virtuels un par un | Quelques réseaux nommés ; corriger un groupe. Seule option pour les réseaux d'un autre locataire |
| Dynamique | Une définition Azure Policy de mode `Microsoft.Network.Data` avec l'effet `addToNetworkGroup` ajoute chaque réseau virtuel qui remplit une condition (étiquette, nom) | Beaucoup de réseaux, ou des réseaux créés plus tard. Exige aussi des autorisations sur la stratégie |

Un réseau virtuel peut appartenir à plusieurs groupes réseau. Les changements d'appartenance s'appliquent sans redéploiement : un nouveau membre d'un groupe qui a déjà une configuration déployée la reçoit automatiquement (en quelques minutes, ou dans les 24 heures pour des stratégies dont l'étendue dépasse 1 000 abonnements).

**Configurations de connectivité** :

| Topologie / option | Résultat |
| --- | --- |
| Maillage (mesh) | Chaque réseau virtuel du groupe se connecte à tous les autres par un **groupe connecté** (type de tronçon suivant `ConnectedGroup` ; aucun peering n'apparaît sous **Peerings**). Régional par défaut ; le **maillage global** relie les régions |
| Hub-and-spoke | Le gestionnaire crée des peerings entre le hub et chaque spoke. Le hub peut aussi être un hub Virtual WAN (connexions de réseau virtuel) |
| Connectivité directe (par groupe de spokes) | Ajoute un groupe connecté entre les spokes de ce groupe seulement ; les spokes de groupes différents ne communiquent toujours pas |
| Utiliser le hub en tant que passerelle | Transit par passerelle pour les spokes ; activé par défaut dans le portail. Sans passerelle dans le hub, le peering du spoke vers le hub échoue |
| Suppression des peerings existants | Supprime les peerings qui ne correspondent pas à la configuration, même manuels |
| Imposer le peering (`peeringEnforcement: Enforced`) | Les peerings de la topologie ne peuvent être ni modifiés ni supprimés en dehors du gestionnaire |
| `ConnectedGroupAddressOverlap: Disallowed` | Refuse un membre dont l'espace d'adressage chevauche ; par défaut les chevauchements sont admis et le trafic vers la plage en double est abandonné |

| Limite | Valeur |
| --- | --- |
| Spokes appairés à un hub par une configuration hub-and-spoke | 1 000 |
| Réseaux virtuels par groupe connecté | 250 par défaut ; jusqu'à 3 000 avec la fonctionnalité haute capacité |
| Points de terminaison privés par groupe connecté | 2 000 par défaut ; jusqu'à 20 000 avec l'option haute capacité |
| Groupes connectés auxquels un réseau virtuel peut appartenir | 2 (limite ajustable) |

Le **déploiement** suit un modèle d'état cible. Vous validez, par région, la liste complète des configurations qui doivent y être actives : valider Config1 et Config3 dans une région qui avait Config1 et Config2 retire Config2 ; valider **None** retire tout. Après avoir modifié une configuration de connectivité, redéployez toutes les configurations de connectivité qui doivent rester dans la région. Un gestionnaire ne peut déployer qu'une configuration d'administration de la sécurité et qu'une configuration de routage par région ; plusieurs configurations de connectivité peuvent coexister et s'additionnent.

```bash
az network manager create --name nm-contoso --resource-group RG1 --location westeurope \
  --scope-accesses "Connectivity" "SecurityAdmin" \
  --network-manager-scopes subscriptions="/subscriptions/SUB1"
az network manager group create --name ng-prod --network-manager-name nm-contoso --resource-group RG1
az network manager connect-config create --configuration-name cc-mesh-prod \
  --network-manager-name nm-contoso --resource-group RG1 --connectivity-topology "Mesh" \
  --applies-to-groups '[{"networkGroupId": "/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/networkManagers/nm-contoso/networkGroups/ng-prod", "groupConnectivity": "None"}]'
az network manager post-commit --network-manager-name nm-contoso --resource-group RG1 \
  --commit-type "Connectivity" --target-locations "westeurope" \
  --configuration-ids "/subscriptions/SUB1/resourceGroups/RG1/providers/Microsoft.Network/networkManagers/nm-contoso/connectivityConfigurations/cc-mesh-prod"
```

Pour vérifier le résultat sur un réseau virtuel, ouvrez **Network Manager** dans ses paramètres ou exécutez `az network manager list-effective-connectivity-config`. L'état du déploiement (NotStarted, Deploying, Deployed, Failed) est global ; les erreurs par réseau figurent dans les détails du déploiement.

> **Conseil d'examen.** « Des milliers de spokes, de nouveaux abonnements chaque mois, les spokes d'un même environnement doivent communiquer directement, tous doivent utiliser la passerelle ExpressRoute du hub » : un gestionnaire de réseau dont l'étendue est le groupe d'administration, un groupe réseau dynamique par étiquette, une configuration hub-and-spoke avec **connectivité directe** et **Utiliser le hub en tant que passerelle**, puis un déploiement dans chaque région.

<!-- section: key-points -->
## Points clés

- Le peering n'est pas transitif ; le trafic entre spokes passe par un peering direct, un groupe connecté, ou un NVA avec des UDR et le **trafic transféré** autorisé.
- Transit par passerelle : le hub autorise sa passerelle à transférer le trafic, le spoke utilise la passerelle distante ; le spoke n'a pas de passerelle à lui ; pas avec la référence SKU VPN Basic.
- Le peering exige des espaces d'adressage disjoints et deux liens qui affichent tous deux **Connecté** ; il fonctionne entre régions, abonnements et locataires.
- Après le redimensionnement d'un espace d'adressage appairé, synchronisez les liens de peering.
- Gestionnaire de réseau : étendue et fonctionnalités, groupes réseau (statiques ou Azure Policy), configurations, puis déploiement par région ; rien ne s'applique avant le déploiement.
- Le maillage et la connectivité directe créent des groupes connectés (tronçon suivant `ConnectedGroup`), pas des peerings ; le hub-and-spoke crée des peerings.
