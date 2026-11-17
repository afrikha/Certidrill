Azure Private Link amène un service dans votre réseau virtuel : un **point de terminaison privé** est une interface réseau dotée d'une adresse IP privée qui se connecte à une ressource précise, et un **service Private Link** vous permet de publier votre propre application de la même façon. Les questions d'examen portent sur l'emplacement du point de terminaison, la personne qui approuve la connexion, l'application des NSG et des itinéraires, et surtout la façon dont le DNS doit résoudre le nom du service vers l'adresse privée, depuis Azure et depuis le réseau local.

<!-- section: plan-private-endpoints | objectives: 4.1.1 -->
## Planifier des points de terminaison privés

Un point de terminaison privé est une interface réseau en lecture seule créée dans le sous-réseau de votre choix. Il reçoit une adresse IP privée qui ne change jamais pendant sa durée de vie, et il correspond à **une sous-ressource** d'**une ressource** :

| Ressource de liaison privée | Sous-ressource cible (ID de groupe) | Zone DNS privée recommandée |
| --- | --- | --- |
| Compte de stockage (objets blob) | `blob` (`blob_secondary` pour les lectures RA-GRS) | `privatelink.blob.core.windows.net` |
| Compte de stockage (fichiers) | `file` | `privatelink.file.core.windows.net` |
| Compte de stockage (Data Lake Storage) | `dfs` | `privatelink.dfs.core.windows.net` |
| Azure SQL Database | `sqlServer` | `privatelink.database.windows.net` |
| Azure Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| App Service et Azure Functions | `sites` | `privatelink.azurewebsites.net` |
| Azure Cosmos DB (API NoSQL) | `Sql` | `privatelink.documents.azure.com` |
| Votre propre service Private Link | aucune | aucune (vous choisissez le nom) |

Règles de planification :

- **Un point de terminaison par sous-ressource.** Une application qui utilise les objets blob et les partages de fichiers d'un même compte de stockage a besoin de deux points de terminaison privés.
- **Région et abonnement** : le point de terminaison privé se trouve dans la même région et le même abonnement que son réseau virtuel ; la ressource cible peut être dans une autre région, un autre abonnement ou un autre locataire.
- **Accessibilité** : les clients du même réseau virtuel, des réseaux virtuels appairés dans la même région ou dans d'autres régions, et du réseau local via VPN ou ExpressRoute atteignent le point de terminaison. Les connexions sont unidirectionnelles : le service ne peut pas ouvrir de connexion vers votre réseau.
- **Sous-réseau** : un sous-réseau ordinaire convient ; aucune délégation n'est nécessaire et d'autres ressources peuvent le partager. Prévoyez l'espace d'adressage : chaque point de terminaison consomme au moins une adresse IP.
- **Limites** : 1 000 points de terminaison privés par réseau virtuel, 4 000 sur des réseaux virtuels appairés et 64 000 par abonnement.
- **Stockage** : seuls les comptes v2 universels prennent en charge les points de terminaison privés.
- **Accès public** : un point de terminaison privé ajoute un chemin privé mais ne ferme pas le point de terminaison public. Désactivez l'accès réseau public sur la ressource (ou restreignez son pare-feu) pour imposer l'accès privé.
- **Conception DNS** : pour un ensemble de réseaux qui partagent le DNS, préférez un seul point de terminaison privé par ressource, pour éviter les enregistrements en double.

> **Piège d'examen.** Un point de terminaison privé n'est pas une règle de pare-feu. Après sa création, les clients sur internet peuvent toujours utiliser le point de terminaison public tant que vous ne désactivez pas l'accès réseau public sur la ressource.

<!-- section: create-private-endpoints | objectives: 4.1.2 -->
## Créer des points de terminaison privés

Un point de terminaison privé a ces propriétés :

| Propriété | Signification |
| --- | --- |
| Sous-réseau | Où vont l'interface réseau et son adresse IP (dynamique par défaut, statique en option) |
| Ressource de liaison privée | ID de ressource ou, pour un service Private Link, son alias |
| Sous-ressource cible | L'ID de groupe du tableau ci-dessus |
| Méthode d'approbation de la connexion | **Automatique** si vous avez l'autorisation d'approbation sur la ressource, sinon **manuelle** avec un message de requête |
| État de la connexion | Approuvée (Approved), En attente (Pending), Rejetée (Rejected) ou Déconnectée (Disconnected), en lecture seule |

L'approbation automatique exige l'autorisation `Microsoft.<Provider>/<resource type>/privateEndpointConnectionsApproval/action` sur la ressource cible, que comprennent Owner et Contributor. Sans elle, la connexion est créée à l'état **En attente** et le propriétaire de la ressource l'approuve ou la rejette. Seule une connexion **Approuvée** transporte du trafic. Si le propriétaire supprime la connexion, le point de terminaison passe à l'état **Déconnectée** et ne peut plus qu'être supprimé.

```bash
# Private endpoint to the blob service of a storage account
id=$(az storage account show --name stcontosodata --resource-group RG-Data --query id --output tsv)

az network private-endpoint create \
  --resource-group RG-Network \
  --name pe-stcontosodata-blob \
  --vnet-name VNet-Hub \
  --subnet snet-endpoints \
  --private-connection-resource-id $id \
  --group-id blob \
  --connection-name stcontosodata-blob

# Resource owner side, for a manual request
az network private-endpoint-connection approve \
  --resource-group RG-Data \
  --resource-name stcontosodata \
  --type Microsoft.Storage/storageAccounts \
  --name <connection name> \
  --description "Approved for the hub"
```

Dans le portail, l'onglet **DNS** de l'assistant de point de terminaison privé propose **Intégrer à une zone DNS privée** (Integrate with private DNS zone) : il crée ou réutilise la zone recommandée, la lie au réseau virtuel et ajoute l'enregistrement A (voir la section DNS).

> **Conseil d'examen.** « Le compte de stockage appartient à une autre équipe et vous n'avez aucune autorisation dessus » signifie une demande de connexion **manuelle** : créez le point de terminaison, puis l'autre équipe l'approuve dans **Mise en réseau > Connexions de point de terminaison privé**.

<!-- section: access-private-endpoints | objectives: 4.1.3 -->
## Configurer l'accès aux points de terminaison privés

Le contrôle d'accès se fait à trois niveaux.

**1. La connexion.** Le propriétaire de la ressource approuve, rejette ou supprime chaque connexion de point de terminaison privé. Un service Private Link filtre aussi qui peut en demander une (voir la section suivante).

**2. Les stratégies réseau du sous-réseau.** Par défaut, les règles NSG et les itinéraires définis par l'utilisateur **ne s'appliquent pas** au trafic envoyé à un point de terminaison privé. Activez le paramètre de sous-réseau **Stratégie réseau pour les points de terminaison privés** pour les appliquer :

| Valeur | Effet sur les points de terminaison privés du sous-réseau |
| --- | --- |
| `Disabled` (par défaut) | Ni les NSG ni les tables de routage ne s'appliquent |
| `NetworkSecurityGroupEnabled` | Les règles NSG s'appliquent |
| `RouteTableEnabled` | Les itinéraires définis par l'utilisateur s'appliquent |
| `Enabled` | Les deux s'appliquent |

```bash
az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-Hub \
  --name snet-endpoints \
  --private-endpoint-network-policies Enabled
```

Le paramètre concerne tous les points de terminaison privés du sous-réseau ; les autres ressources du sous-réseau restent toujours soumises au NSG. Une fois les stratégies activées :

- Un NSG peut n'autoriser que certaines sources à atteindre le point de terminaison, et un **groupe de sécurité d'application** peut contenir des points de terminaison privés.
- Chaque point de terminaison privé ajoute un **itinéraire système /32** à son réseau virtuel et aux réseaux appairés. Pour faire passer ce trafic par un pare-feu, un itinéraire défini par l'utilisateur doit avoir un préfixe **égal ou plus précis que l'espace d'adressage du réseau virtuel**, par exemple 10.1.0.0/16 pour un réseau en /16. Un itinéraire 0.0.0.0/0 ne remplace pas le /32. Le pare-feu doit appliquer la SNAT pour que le trafic de retour suive le même chemin.
- Les itinéraires effectifs et les règles de sécurité effectives ne sont pas affichés pour l'interface réseau du point de terminaison, et les journaux de flux NSG n'enregistrent pas le trafic entrant vers celui-ci.

**3. Le service lui-même.** Désactivez l'accès réseau public, ou gardez son pare-feu restreint, pour qu'il ne reste que le chemin privé.

> **Piège d'examen.** Un NSG sur le sous-réseau du point de terminaison qui refuse une source n'a **aucun effet** tant que la stratégie réseau des points de terminaison privés du sous-réseau vaut `Disabled`. Activez d'abord `NetworkSecurityGroupEnabled` (ou `Enabled`).

<!-- section: private-link-service | objectives: 4.1.4 -->
## Créer un service Private Link

Un **service Private Link** publie votre propre application, exécutée derrière un équilibreur de charge interne **Standard**, auprès de consommateurs situés dans d'autres réseaux virtuels, abonnements ou locataires Microsoft Entra. Chaque consommateur crée un point de terminaison privé dans son propre réseau ; les espaces d'adressage peuvent se chevaucher, car le service applique une NAT.

Ordre des opérations pour le fournisseur :

1. Exécuter l'application derrière un équilibreur de charge Standard dont le pool principal est défini par des interfaces réseau (et non par des adresses IP).
2. Sur le sous-réseau qui portera les adresses IP NAT du service, régler `privateLinkServiceNetworkPolicies` sur `Disabled`. Le portail le fait pour vous ; Azure CLI, PowerShell et les modèles exigent cette étape explicite.
3. Créer le service Private Link sur une configuration IP frontale de l'équilibreur de charge, avec une à huit adresses IP NAT.
4. Communiquer l'**alias** (`<prefix>.<GUID>.<region>.azure.privatelinkservice`) ou l'ID de ressource aux consommateurs.
5. Approuver les demandes de connexion qui ne sont pas approuvées automatiquement.

```bash
az network vnet subnet update \
  --resource-group RG-App \
  --vnet-name VNet-App \
  --name snet-pls \
  --private-link-service-network-policies Disabled

az network private-link-service create \
  --resource-group RG-App \
  --name pls-orders \
  --vnet-name VNet-App \
  --subnet snet-pls \
  --lb-name lb-orders \
  --lb-frontend-ip-configs fe-orders \
  --location westeurope
```

Paramètres d'exposition et d'approbation :

| Paramètre | Options |
| --- | --- |
| Visibilité | **Contrôle d'accès en fonction du rôle uniquement** (appelants disposant des autorisations), **Restreint par abonnement** (abonnements listés, y compris d'autres locataires), **Toute personne disposant de votre alias** |
| Approbation automatique | Abonnements dont les demandes sont approuvées sans intervention ; doit être un sous-ensemble de la liste de visibilité |

Autres faits : le service se trouve dans la même région que son réseau virtuel et son équilibreur de charge, mais les consommateurs peuvent se connecter depuis n'importe quelle région ; il ne prend en charge que TCP et UDP en IPv4 ; un équilibreur de charge peut héberger jusqu'à huit services Private Link, chacun sur sa propre configuration IP frontale ; un service accepte jusqu'à 1 000 points de terminaison privés. L'application du fournisseur voit l'**adresse IP NAT** comme source de chaque connexion ; pour obtenir les informations du consommateur, activez **TCP Proxy v2** (l'application doit analyser l'en-tête du protocole PROXY, qui transporte aussi l'ID de lien du point de terminaison privé).

> **Piège d'examen.** Un service Private Link s'attache à une configuration frontale d'équilibreur de charge, jamais à une machine virtuelle ni à un équilibreur de charge public, et exige la référence SKU Standard. « Exposer une application interne à un partenaire dont l'espace d'adressage chevauche le nôtre » est le scénario du service Private Link ; un peering échouerait à cause du chevauchement.

<!-- section: private-endpoint-dns | objectives: 4.1.5 -->
## Intégrer des points de terminaison privés au DNS

Les clients continuent d'utiliser le nom habituel du service, comme `stcontosodata.blob.core.windows.net`. Quand un point de terminaison privé existe, le DNS public d'Azure répond par un CNAME vers `stcontosodata.privatelink.blob.core.windows.net`. Celui qui répond à l'étape suivante décide du résultat :

| Résolveur | Réponse pour le nom `privatelink` |
| --- | --- |
| Azure DNS (168.63.129.16) dans un réseau virtuel **lié** à la zone DNS privée `privatelink.blob.core.windows.net` | L'enregistrement A de la zone : l'adresse IP privée |
| Tout résolveur sans accès à cette zone (internet, réseau non lié) | L'adresse IP publique du service |

Composants de la conception recommandée :

1. Une **zone DNS privée** portant le nom recommandé (`privatelink.<zone du service>`), créée **une seule fois**, généralement dans le hub.
2. Un **lien de réseau virtuel** de cette zone vers chaque réseau virtuel dont les clients utilisent Azure DNS (hub et spokes), sans inscription automatique.
3. Un **groupe de zones DNS privées** sur chaque point de terminaison privé : il crée l'enregistrement A, le met à jour et le supprime avec le point de terminaison. Un groupe de zones par point de terminaison, avec jusqu'à cinq zones.

```bash
az network private-dns zone create \
  --resource-group RG-DNS \
  --name privatelink.blob.core.windows.net

az network private-dns link vnet create \
  --resource-group RG-DNS \
  --zone-name privatelink.blob.core.windows.net \
  --name link-vnet-hub \
  --virtual-network <VNet-Hub resource ID> \
  --registration-enabled false

az network private-endpoint dns-zone-group create \
  --resource-group RG-Network \
  --endpoint-name pe-stcontosodata-blob \
  --name default \
  --private-dns-zone <privatelink.blob.core.windows.net zone resource ID> \
  --zone-name blob
```

Règles de conception :

- Utilisez **une seule zone par nom**, partagée par tous les réseaux. Des zones distinctes portant le même nom dans différents spokes obligent à fusionner les enregistrements à la main.
- Ne mettez pas les enregistrements de services différents dans une même zone, et ne réutilisez pas une zone pour les points de terminaison privés de deux types de ressources différents.
- Un serveur DNS personnalisé dans Azure doit transférer ces noms vers **168.63.129.16** depuis un réseau virtuel lié à la zone.
- Dès qu'une zone `privatelink.blob.core.windows.net` est liée, tout compte de stockage qui a un point de terminaison privé ailleurs mais aucun enregistrement dans votre zone renvoie **NXDOMAIN** à vos clients. Ajoutez l'enregistrement, ou activez le **repli vers internet** sur le lien de réseau virtuel.
- Une entrée dans le fichier hosts n'est acceptable que pour des tests.

> **Piège d'examen.** Ne créez jamais une zone portant le nom public (`blob.core.windows.net`) : tous les autres comptes de stockage cesseraient d'être résolus. La zone porte toujours le nom `privatelink`.

<!-- section: on-premises-clients | objectives: 4.1.6 -->
## Intégrer Private Link avec des clients locaux

Les clients locaux atteignent un point de terminaison privé, qu'il cible une ressource PaaS Azure ou un service Private Link, via un VPN de site à site ou le peering privé ExpressRoute : l'adresse du point de terminaison appartient à l'espace d'adressage du réseau virtuel que la passerelle annonce déjà. Dans une topologie hub and spoke, placez le point de terminaison dans le hub ou dans un spoke qui utilise la passerelle du hub.

Le routage pose rarement problème ; le **DNS**, si. Les serveurs DNS locaux ne peuvent pas interroger 168.63.129.16, et les réponses d'Azure pour les zones privées liées ne sont visibles que depuis un réseau virtuel lié. La requête doit donc être transférée dans Azure :

| Conception | Configuration du DNS local | Côté Azure |
| --- | --- | --- |
| Azure DNS Private Resolver (recommandé) | Redirecteur conditionnel vers l'adresse IP du **point de terminaison entrant** du résolveur | Résolveur dans un réseau virtuel lié aux zones `privatelink` |
| Redirecteur DNS (machine virtuelle ou proxy DNS du Pare-feu Azure) | Redirecteur conditionnel vers l'adresse IP du redirecteur | Redirecteur dans un réseau virtuel lié, qui transfère vers 168.63.129.16 |

Le redirecteur conditionnel cible le nom de la zone **publique** : `blob.core.windows.net`, `database.windows.net`, `vaultcore.azure.net`. La chaîne de CNAME mène ensuite au nom `privatelink`, qu'Azure résout avec la zone privée.

Pour votre propre **service Private Link**, il n'existe pas de zone `privatelink` recommandée : publiez le nom qu'utilisent vos clients (par exemple `orders.fabrikam.internal`) sous forme d'enregistrement A pointant vers l'adresse IP du point de terminaison privé du consommateur, dans une zone DNS privée atteinte via le résolveur ou directement dans le DNS local.

Deux points de plus pour les clients hybrides :

- Le fournisseur voit l'adresse IP NAT du service Private Link, pas l'adresse du client local. Activez TCP Proxy v2 si l'application a besoin de la vraie source.
- Le chevauchement des espaces d'adressage local et fournisseur n'a pas d'importance : le consommateur n'a besoin que d'une adresse libre pour le point de terminaison privé dans son propre réseau virtuel.

> **Piège d'examen.** Un redirecteur conditionnel pour `privatelink.blob.core.windows.net` ne fonctionne que si les clients interrogent directement le nom `privatelink` ; les applications utilisent le nom public. Transférez la zone **publique** (`blob.core.windows.net`) vers le point de terminaison entrant.

<!-- section: key-points -->
## Points clés

- Un point de terminaison privé = une carte réseau, une adresse IP privée, une sous-ressource d'une ressource ; il ne désactive pas le point de terminaison public.
- L'approbation est automatique avec `privateEndpointConnectionsApproval/action`, sinon manuelle (En attente, puis Approuvée).
- Les NSG et les UDR ne s'appliquent aux points de terminaison privés que si les stratégies réseau des points de terminaison privés du sous-réseau sont activées ; un UDR doit être au moins aussi précis que l'espace d'adressage du réseau virtuel pour remplacer le /32.
- Service Private Link : configuration frontale d'un équilibreur de charge interne Standard, sous-réseau des IP NAT avec `privateLinkServiceNetworkPolicies` désactivé, alias, visibilité et approbation automatique.
- DNS : une zone `privatelink`, liée à chaque réseau client, enregistrements gérés par un groupe de zones.
- Réseau local : VPN ou ExpressRoute pour l'itinéraire, redirecteur conditionnel du nom de zone public vers un point de terminaison entrant de DNS Private Resolver pour le nom.
