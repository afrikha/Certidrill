A virtual network service endpoint extends the identity of a subnet to an Azure PaaS service over the Azure backbone, so that the service can accept traffic from that subnet and refuse everything else. It costs nothing and is configured with one setting, but the service keeps its public IP address. Exam questions ask when a service endpoint is enough and when a private endpoint is needed, what changes when you enable one, how to restrict which storage accounts a subnet can reach, and how to lock the resource to the subnet.

<!-- section: when-to-use | objectives: 4.2.1 -->
## Choosing when to use a service endpoint

When a service endpoint is enabled on a subnet for a service such as `Microsoft.Storage`:

- Traffic from that subnet to the service **keeps using the service's public IP address**, and DNS is unchanged.
- The **source address** seen by the service becomes the **private IP address** of the virtual machine instead of a public IP address, together with the identity of the virtual network and subnet.
- A **system route** with the next hop type `VirtualNetworkServiceEndpoint` is added for the service's address prefixes. It takes precedence over BGP routes and user-defined routes for those prefixes, so service traffic leaves directly over the backbone, even with **forced tunneling** of the internet traffic to on-premises or to a firewall.
- Nothing is restricted yet: the resource must also get a **virtual network rule** that allows the subnet (see the last section).

Main services that support service endpoints: Azure Storage (`Microsoft.Storage`, and `Microsoft.Storage.Global` for cross-region access), Azure SQL Database and Azure Synapse Analytics (`Microsoft.Sql`), Azure Cosmos DB (`Microsoft.AzureCosmosDB`), Azure Key Vault (`Microsoft.KeyVault`), Service Bus, Event Hubs, App Service (`Microsoft.Web`) and Azure Container Registry.

| Requirement | Service endpoint | Private endpoint |
| --- | --- | --- |
| Destination address | Public IP address of the service | Private IP address in your subnet |
| Access from on-premises over VPN or ExpressRoute private peering | No | Yes |
| Access from a peered virtual network | Only if that network's subnets enable their own endpoint and are allowed by the resource | Yes |
| Scope of access | The whole service; filter storage accounts with a service endpoint policy | One subresource of one resource |
| DNS changes | None | `privatelink` zone required |
| Cost | Free | Charged per hour and per GB |
| Region | Any region (Azure SQL: same region only) | Resource in any region |

Microsoft recommends private endpoints for private access to PaaS services. Choose a service endpoint when the clients are all in Azure subnets, the requirement is only to "allow traffic from subnet X and block the internet", and cost or simplicity matters.

> **Exam trap.** Service endpoints don't work for traffic from on-premises. To let on-premises clients reach a resource that is secured with virtual network rules, either allow their public NAT addresses in the resource's IP firewall, or use a private endpoint.

<!-- section: create-service-endpoints | objectives: 4.2.2 -->
## Creating service endpoints

A service endpoint is a property of a **subnet**, enabled per service:

- **Portal**: the subnet's **Service endpoints** setting, where you select one or more services; or the **Service endpoints** page of the virtual network.
- Each subnet that needs access must enable the endpoint itself: enabling it on one subnet does nothing for the other subnets or for peered virtual networks.
- A subnet can enable several services; there's no limit on the number of service endpoints in a virtual network.
- Anyone with write access to the virtual network can enable a service endpoint.

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

Consequences to plan for:

- When the endpoint is enabled or disabled, **existing TCP connections** from the subnet to the service are **closed** while the source address switches. Do it outside production hours.
- Any IP firewall rule on the service that allowed the virtual machines' **public** IP addresses stops matching, because the source is now private. Add the virtual network rule before or at the same time.
- Service endpoints carry TCP only: `ping` and `tracert` don't show the endpoint path.

To check that the endpoint is in effect, look at the **effective routes** of a network interface in the subnet: the service's prefixes appear with the next hop type `VirtualNetworkServiceEndpoint`. The service's logs also show the client's private IP address as the source.

> **Exam tip.** Recommended order: **1.** enable the service endpoint on the subnet (network side), **2.** add the virtual network rule on the resource (service side). Azure SQL and Azure Cosmos DB can add the rule first, with the `IgnoreMissingVnetServiceEndpoint` flag, to avoid a connectivity drop.

<!-- section: endpoint-policies | objectives: 4.2.3 -->
## Configuring service endpoint policies

A service endpoint lets the subnet reach **every** storage account of the service, including accounts that belong to someone else. A **service endpoint policy** closes that data exfiltration path: it's an allow list of Azure Storage accounts that the subnet can reach over the service endpoint. Everything not listed is denied.

| Allow-list entry | Example |
| --- | --- |
| All storage accounts of a subscription | `/subscriptions/<subscription ID>` |
| All storage accounts of a resource group | `/subscriptions/<subscription ID>/resourceGroups/RG-Data` |
| One storage account (blobs, tables, queues, files and Data Lake Storage) | `.../providers/Microsoft.Storage/storageAccounts/stcontosodata` |

Rules:

- Policies apply to **Azure Storage** traffic, on subnets where the `Microsoft.Storage` service endpoint is enabled.
- The policy is a regional resource: the virtual network must be in the **same region and subscription** as the policy. The listed storage accounts can be in any subscription or tenant.
- Once a policy is on the subnet, the service endpoint scope becomes **global**: storage accounts in every region are filtered, not only those of the subnet's region.
- Several policies on one subnet combine: an account listed in any of them is allowed.
- Read access to an RA-GRS secondary is allowed automatically when the primary account is listed.
- **Classic** storage accounts and managed storage accounts are always denied once a policy applies.
- Not for on-premises traffic, and not for subnets of managed services (Application Gateway, Azure Firewall, VPN Gateway, App Service Environment...) except Azure SQL Managed Instance.
- Limits: 100 policies per subnet or virtual network, 500 per subscription, 200 resources per policy definition.

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

| Requirement | Tool |
| --- | --- |
| Allow only Azure Storage in one region as outbound destination | NSG rule with the `Storage.WestEurope` service tag |
| Allow only the company's storage accounts from a subnet | Service endpoint policy |
| Allow only one subnet to reach a storage account | Virtual network rule on the storage account |

> **Exam trap.** A service endpoint policy is an **allow** list, not a deny list. If an application in the subnet also uses a storage account for diagnostics or a dependency, add it to the policy, or that traffic breaks.

<!-- section: endpoint-access | objectives: 4.2.4 -->
## Configuring access to service endpoints

The resource side decides who gets in. For a storage account, open **Networking**, limit public network access to **selected networks**, then add the virtual networks and subnets, and optionally IP addresses or ranges. This sets the account's default action to **Deny**, with exceptions for the listed subnets and IP ranges.

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

Other services use the same model under different names: Azure SQL has **virtual network rules** on the logical server, Key Vault and Cosmos DB have firewall settings with selected networks.

Rules to remember:

- Adding a subnet to a resource requires the permission `Microsoft.Network/virtualNetworks/subnets/joinViaServiceEndpoint/action` on that subnet (included in Network Contributor and Contributor).
- The virtual network and the resource can be in different subscriptions of the same Microsoft Entra tenant; Azure Storage and Azure Key Vault also accept subnets from another tenant.
- Each service limits the number of virtual network rules: 200 for a storage account or a key vault, 128 for Azure SQL, 64 for Azure Cosmos DB.
- A virtual network rule and an IP rule can coexist. On-premises access needs the IP rule with the public NAT addresses, since service endpoints don't apply to on-premises traffic.
- Requests from a network that isn't allowed get HTTP 403 (or 404).
- NSGs on the subnet still filter outbound traffic: the default **AllowInternetOutBound** rule lets service traffic leave. To deny the internet but allow storage, add an outbound allow rule to the `Storage` service tag with a higher priority than a deny rule to `Internet`.
- If the virtual network or subnet is deleted, the corresponding rule on the resource stops applying.

> **Exam trap.** If the storage account's virtual network rule is added but the subnet's service endpoint isn't enabled, access from the subnet still fails: the storage account sees a public source address. Both sides are needed.

<!-- section: key-points -->
## Key points

- A service endpoint changes the source address to the private IP and adds a `VirtualNetworkServiceEndpoint` route that beats UDRs and BGP; the destination stays public.
- Enable it per subnet, then allow the subnet on the resource; existing connections drop during the switch.
- No on-premises access, no DNS change, no cost; private endpoints remain Microsoft's recommendation.
- Service endpoint policies: allow list of storage accounts, Azure Storage only, same region and subscription as the virtual network, global scope once applied.
- Resource side: default action Deny, virtual network rule, IP rules for on-premises NAT addresses, `joinViaServiceEndpoint/action` permission.
