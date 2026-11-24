Un point de terminaison de service de réseau virtuel étend l'identité d'un sous-réseau à un service PaaS Azure, sur le réseau principal Azure, pour que le service puisse accepter le trafic de ce sous-réseau et refuser tout le reste. Il ne coûte rien et se configure par un seul paramètre, mais le service garde son adresse IP publique. Les questions d'examen demandent quand un point de terminaison de service suffit et quand un point de terminaison privé est nécessaire, ce qui change quand on l'active, comment restreindre les comptes de stockage qu'un sous-réseau peut atteindre, et comment verrouiller la ressource sur le sous-réseau.

<!-- section: when-to-use | objectives: 4.2.1 -->
## Choisir quand utiliser un point de terminaison de service

Quand un point de terminaison de service est activé sur un sous-réseau pour un service comme `Microsoft.Storage` :

- Le trafic de ce sous-réseau vers le service **continue d'utiliser l'adresse IP publique du service**, et le DNS ne change pas.
- L'**adresse source** vue par le service devient l'**adresse IP privée** de la machine virtuelle au lieu d'une adresse IP publique, accompagnée de l'identité du réseau virtuel et du sous-réseau.
- Un **itinéraire système** de type de tronçon suivant `VirtualNetworkServiceEndpoint` est ajouté pour les préfixes d'adresse du service. Il l'emporte sur les itinéraires BGP et les itinéraires définis par l'utilisateur pour ces préfixes : le trafic du service part directement sur le réseau principal, même avec un **tunneling forcé** du trafic internet vers le réseau local ou vers un pare-feu.
- Rien n'est encore restreint : la ressource doit aussi recevoir une **règle de réseau virtuel** qui autorise le sous-réseau (voir la dernière section).

Principaux services qui prennent en charge les points de terminaison de service : Stockage Azure (`Microsoft.Storage`, et `Microsoft.Storage.Global` pour l'accès interrégion), Azure SQL Database et Azure Synapse Analytics (`Microsoft.Sql`), Azure Cosmos DB (`Microsoft.AzureCosmosDB`), Azure Key Vault (`Microsoft.KeyVault`), Service Bus, Event Hubs, App Service (`Microsoft.Web`) et Azure Container Registry.

| Besoin | Point de terminaison de service | Point de terminaison privé |
| --- | --- | --- |
| Adresse de destination | Adresse IP publique du service | Adresse IP privée dans votre sous-réseau |
| Accès depuis le réseau local par VPN ou peering privé ExpressRoute | Non | Oui |
| Accès depuis un réseau virtuel relié par peering | Seulement si les sous-réseaux de ce réseau activent leur propre point de terminaison et sont autorisés par la ressource | Oui |
| Étendue de l'accès | Tout le service ; filtrer les comptes de stockage avec une stratégie de point de terminaison de service | Une sous-ressource d'une ressource |
| Changements DNS | Aucun | Zone `privatelink` nécessaire |
| Coût | Gratuit | Facturé à l'heure et au Go |
| Région | Azure SQL : même région uniquement. Stockage : `Microsoft.Storage` pour les comptes de la région du réseau virtuel, `Microsoft.Storage.Global` pour toute région (un seul des deux par sous-réseau) | Ressource dans toute région |

Microsoft recommande les points de terminaison privés pour l'accès privé aux services PaaS. Choisissez un point de terminaison de service quand tous les clients sont dans des sous-réseaux Azure, que le besoin se limite à « autoriser le trafic du sous-réseau X et bloquer internet », et que le coût ou la simplicité comptent.

> **Piège d'examen.** Les points de terminaison de service ne fonctionnent pas pour le trafic venant du réseau local. Pour que des clients locaux atteignent une ressource sécurisée par des règles de réseau virtuel, autorisez leurs adresses NAT publiques dans le pare-feu IP de la ressource, ou utilisez un point de terminaison privé.

<!-- section: create-service-endpoints | objectives: 4.2.2 -->
## Créer des points de terminaison de service

Un point de terminaison de service est une propriété d'un **sous-réseau**, activée service par service :

- **Portail** : le paramètre **Points de terminaison de service** du sous-réseau, où vous sélectionnez un ou plusieurs services ; ou la page **Points de terminaison de service** du réseau virtuel.
- Chaque sous-réseau qui a besoin de l'accès doit activer lui-même le point de terminaison : l'activer sur un sous-réseau ne fait rien pour les autres sous-réseaux ni pour les réseaux virtuels reliés par peering.
- Un sous-réseau peut activer plusieurs services ; le nombre de points de terminaison de service d'un réseau virtuel n'est pas limité.
- Toute personne disposant d'un accès en écriture au réseau virtuel peut activer un point de terminaison de service.

```bash
# List the service endpoints available in a region
az network vnet list-endpoint-services --location westeurope --output table

# Enable endpoints for Storage and SQL on an existing subnet
az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-App \
  --name snet-app \
  --service-endpoints Microsoft.Storage Microsoft.Sql
```

Conséquences à prévoir :

- Quand le point de terminaison est activé ou désactivé, les **connexions TCP existantes** du sous-réseau vers le service sont **fermées** pendant le changement d'adresse source. Faites-le en dehors des heures de production.
- Toute règle de pare-feu IP du service qui autorisait les adresses IP **publiques** des machines virtuelles cesse de correspondre, puisque la source est désormais privée. Ajoutez la règle de réseau virtuel avant ou en même temps.
- Les points de terminaison de service ne transportent que du TCP : `ping` et `tracert` ne montrent pas le chemin du point de terminaison.

Pour vérifier que le point de terminaison est actif, regardez les **itinéraires effectifs** d'une interface réseau du sous-réseau : les préfixes du service y apparaissent avec le type de tronçon suivant `VirtualNetworkServiceEndpoint`. Les journaux du service montrent aussi l'adresse IP privée du client comme source.

> **Conseil d'examen.** Ordre recommandé : **1.** activer le point de terminaison de service sur le sous-réseau (côté réseau), **2.** ajouter la règle de réseau virtuel sur la ressource (côté service). Azure SQL et Azure Cosmos DB peuvent ajouter la règle d'abord, avec l'indicateur `IgnoreMissingVnetServiceEndpoint`, pour éviter une coupure de connectivité.

<!-- section: endpoint-policies | objectives: 4.2.3 -->
## Configurer des stratégies de point de terminaison de service

Un point de terminaison de service permet au sous-réseau d'atteindre **tous** les comptes de stockage du service, y compris des comptes qui appartiennent à quelqu'un d'autre. Une **stratégie de point de terminaison de service** ferme cette voie d'exfiltration de données : c'est une liste d'autorisation de comptes Stockage Azure que le sous-réseau peut atteindre par le point de terminaison de service. Tout ce qui n'y figure pas est refusé.

| Entrée de la liste d'autorisation | Exemple |
| --- | --- |
| Tous les comptes de stockage d'un abonnement | `/subscriptions/<subscription ID>` |
| Tous les comptes de stockage d'un groupe de ressources | `/subscriptions/<subscription ID>/resourceGroups/RG-Data` |
| Un compte de stockage (objets blob, tables, files d'attente, fichiers et Data Lake Storage) | `.../providers/Microsoft.Storage/storageAccounts/stcontosodata` |

Règles :

- Les stratégies s'appliquent au trafic **Stockage Azure**, sur les sous-réseaux où le point de terminaison de service `Microsoft.Storage` est activé.
- La stratégie est une ressource régionale : le réseau virtuel doit se trouver dans la **même région et le même abonnement** que la stratégie. Les comptes de stockage listés peuvent être dans n'importe quel abonnement ou locataire.
- Dès qu'une stratégie est appliquée au sous-réseau, l'étendue du point de terminaison de service devient **globale** : les comptes de stockage de toutes les régions sont filtrés, pas seulement ceux de la région du sous-réseau.
- Plusieurs stratégies sur un même sous-réseau se cumulent : un compte listé dans l'une d'elles est autorisé.
- L'accès en lecture au secondaire RA-GRS est autorisé automatiquement quand le compte principal est listé.
- Les comptes de stockage **classiques** et les comptes de stockage managés sont toujours refusés dès qu'une stratégie s'applique.
- Pas pour le trafic local, ni pour les sous-réseaux de services managés (Application Gateway, Pare-feu Azure, VPN Gateway, App Service Environment...), sauf Azure SQL Managed Instance.
- Limites : 100 stratégies par sous-réseau ou réseau virtuel, 500 par abonnement, 200 ressources par définition de stratégie.

```bash
az network service-endpoint policy create \
  --resource-group RG-Network \
  --name sep-allowed-storage \
  --location westeurope

az network service-endpoint policy-definition create \
  --resource-group RG-Network \
  --policy-name sep-allowed-storage \
  --name allow-stcontosodata \
  --service Microsoft.Storage \
  --service-resources $(az storage account show --name stcontosodata --resource-group RG-Data --query id --output tsv)

az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-App \
  --name snet-app \
  --service-endpoints Microsoft.Storage \
  --service-endpoint-policy sep-allowed-storage
```

| Besoin | Outil |
| --- | --- |
| N'autoriser en sortie que le Stockage Azure d'une région | Règle NSG avec l'étiquette de service `Storage.WestEurope` |
| N'autoriser que les comptes de stockage de l'entreprise depuis un sous-réseau | Stratégie de point de terminaison de service |
| N'autoriser qu'un sous-réseau à atteindre un compte de stockage | Règle de réseau virtuel sur le compte de stockage |

> **Piège d'examen.** Une stratégie de point de terminaison de service est une liste d'**autorisation**, pas une liste de refus. Si une application du sous-réseau utilise aussi un compte de stockage pour ses diagnostics ou une dépendance, ajoutez-le à la stratégie, sinon ce trafic est coupé.

<!-- section: endpoint-access | objectives: 4.2.4 -->
## Configurer l'accès aux points de terminaison de service

C'est le côté ressource qui décide qui entre. Pour un compte de stockage, ouvrez **Mise en réseau**, limitez l'accès réseau public aux **réseaux sélectionnés**, puis ajoutez les réseaux virtuels et sous-réseaux, et éventuellement des adresses ou plages IP. L'action par défaut du compte devient alors **Deny**, avec des exceptions pour les sous-réseaux et plages IP listés.

```bash
az storage account update \
  --resource-group RG-Data \
  --name stcontosodata \
  --default-action Deny

az storage account network-rule add \
  --resource-group RG-Data \
  --account-name stcontosodata \
  --vnet-name VNet-App \
  --subnet snet-app
```

Les autres services suivent le même modèle sous d'autres noms : Azure SQL a des **règles de réseau virtuel** sur le serveur logique, Key Vault et Cosmos DB ont des paramètres de pare-feu avec des réseaux sélectionnés.

Règles à retenir :

- Ajouter un sous-réseau à une ressource exige l'autorisation `Microsoft.Network/virtualNetworks/subnets/joinViaServiceEndpoint/action` sur ce sous-réseau (comprise dans Network Contributor et Contributor ; pour un compte de stockage, Learn cite aussi Storage Account Contributor). Un rôle dont l'étendue est seulement la ressource n'accorde rien sur le sous-réseau.
- Le réseau virtuel et la ressource peuvent être dans des abonnements différents du même locataire Microsoft Entra ; Stockage Azure et Azure Key Vault acceptent aussi des sous-réseaux d'un autre locataire.
- Chaque service limite le nombre de règles de réseau virtuel : 400 pour un compte de stockage (et 400 règles de réseau IP), 200 pour un coffre de clés, 128 pour Azure SQL, 64 pour Azure Cosmos DB.
- Une règle de réseau virtuel et une règle IP peuvent coexister. L'accès depuis le réseau local exige la règle IP avec les adresses NAT publiques, puisque les points de terminaison de service ne s'appliquent pas au trafic local.
- Les requêtes venant d'un réseau non autorisé reçoivent HTTP 403 (ou 404).
- Les NSG du sous-réseau filtrent toujours le trafic sortant : la règle par défaut **AllowInternetOutBound** laisse sortir le trafic vers le service. Pour refuser internet tout en autorisant le stockage, ajoutez une règle sortante d'autorisation vers l'étiquette de service `Storage` avec une priorité plus haute qu'une règle de refus vers `Internet`.
- Si le réseau virtuel ou le sous-réseau est supprimé, la règle correspondante de la ressource cesse de s'appliquer.

> **Piège d'examen.** Si la règle de réseau virtuel du compte de stockage est ajoutée mais que le point de terminaison de service du sous-réseau n'est pas activé, l'accès depuis le sous-réseau échoue toujours : le compte de stockage voit une adresse source publique. Les deux côtés sont nécessaires.

<!-- section: key-points -->
## Points clés

- Un point de terminaison de service change l'adresse source en adresse IP privée et ajoute un itinéraire `VirtualNetworkServiceEndpoint` qui l'emporte sur les UDR et BGP ; la destination reste publique.
- L'activer par sous-réseau, puis autoriser le sous-réseau sur la ressource ; les connexions existantes sont coupées pendant le changement.
- Pas d'accès depuis le réseau local, pas de changement DNS, pas de coût ; les points de terminaison privés restent la recommandation de Microsoft.
- Stratégies de point de terminaison de service : liste d'autorisation de comptes de stockage, Stockage Azure uniquement, même région et même abonnement que le réseau virtuel, étendue globale une fois appliquées.
- Côté ressource : action par défaut Deny, règle de réseau virtuel, règles IP pour les adresses NAT locales, autorisation `joinViaServiceEndpoint/action`.
