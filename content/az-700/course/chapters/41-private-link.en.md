Azure Private Link brings a service into your virtual network: a **private endpoint** is a network interface with a private IP address that connects to one specific resource, and a **Private Link service** lets you publish your own application the same way. Exam questions test where the endpoint goes, who approves the connection, how NSGs and routes apply to it, and above all how DNS must resolve the service name to the private address, from Azure and from on-premises.

<!-- section: plan-private-endpoints | objectives: 4.1.1 -->
## Planning private endpoints

A private endpoint is a read-only network interface created in a subnet you choose. It receives a private IP address that never changes during its lifetime, and it maps to **one subresource** of **one resource**:

| Private-link resource | Target subresource (group ID) | Recommended private DNS zone |
| --- | --- | --- |
| Storage account (blobs) | `blob` (`blob_secondary` for RA-GRS reads) | `privatelink.blob.core.windows.net` |
| Storage account (files) | `file` | `privatelink.file.core.windows.net` |
| Storage account (Data Lake Storage) | `dfs` | `privatelink.dfs.core.windows.net` |
| Azure SQL Database | `sqlServer` | `privatelink.database.windows.net` |
| Azure Key Vault | `vault` | `privatelink.vaultcore.azure.net` |
| App Service and Azure Functions | `sites` | `privatelink.azurewebsites.net` |
| Azure Cosmos DB (NoSQL API) | `Sql` | `privatelink.documents.azure.com` |
| Your own Private Link service | none | none (you choose the name) |

Planning rules:

- **One endpoint per subresource.** An application that uses blobs and file shares in the same storage account needs two private endpoints.
- **Region and subscription**: the private endpoint is in the same region and subscription as its virtual network; the target resource can be in another region, subscription or tenant.
- **Reachability**: clients in the same virtual network, in regionally or globally peered virtual networks, and on-premises over VPN or ExpressRoute reach the endpoint. Connections are one-way: the service can't initiate connections to your network.
- **Subnet**: an ordinary subnet works; no delegation is needed, and other resources can share it. Plan the address space: each endpoint uses at least one IP address.
- **Limits**: 1,000 private endpoints per virtual network, 4,000 across peered virtual networks and 64,000 per subscription.
- **Storage**: only general-purpose v2 accounts support private endpoints.
- **Public access**: a private endpoint adds a private path but doesn't close the public endpoint. Disable public network access on the resource (or restrict its firewall) to force private access.
- **DNS design**: for a set of networks that share DNS, prefer one private endpoint per resource, to avoid duplicate records.

> **Exam trap.** A private endpoint isn't a firewall rule. After you create it, clients on the internet can still use the public endpoint until you disable public network access on the resource.

<!-- section: create-private-endpoints | objectives: 4.1.2 -->
## Creating private endpoints

A private endpoint has these properties:

| Property | Meaning |
| --- | --- |
| Subnet | Where the network interface and its IP address go (dynamic by default, static optional) |
| Private-link resource | Resource ID or, for a Private Link service, its alias |
| Target subresource | The group ID from the table above |
| Connection approval method | **Automatic** if you have the approval permission on the resource, otherwise **manual** with a request message |
| Connection status | Approved, Pending, Rejected or Disconnected (read-only) |

Automatic approval requires the permission `Microsoft.<Provider>/<resource type>/privateEndpointConnectionsApproval/action` on the target resource, which Owner and Contributor include. Without it, the connection is created in the **Pending** state and the resource owner approves or rejects it. Only an **Approved** connection carries traffic. If the owner deletes the connection, the endpoint becomes **Disconnected** and can only be deleted.

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

With the portal, the **DNS** tab of the private endpoint wizard offers **Integrate with private DNS zone**: it creates or reuses the recommended zone, links it to the virtual network and adds the A record (see the DNS section).

> **Exam tip.** "The storage account belongs to another team, and you don't have permissions on it" means a **manual** connection request: create the endpoint, then the other team approves it in **Networking > Private endpoint connections**.

<!-- section: access-private-endpoints | objectives: 4.1.3 -->
## Configuring access to private endpoints

Access control happens at three levels.

**1. The connection.** The resource owner approves, rejects or removes each private endpoint connection. A Private Link service also filters who can request one (see the next section).

**2. Network policies on the subnet.** By default, NSG rules and user-defined routes **don't apply** to traffic sent to a private endpoint. Enable the subnet setting **Network policy for private endpoints** to apply them:

| Value | Effect on private endpoints of the subnet |
| --- | --- |
| `Disabled` (default) | Neither NSGs nor route tables apply |
| `NetworkSecurityGroupEnabled` | NSG rules apply |
| `RouteTableEnabled` | User-defined routes apply |
| `Enabled` | Both apply |

```bash
az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-Hub \
  --name snet-endpoints \
  --private-endpoint-network-policies Enabled
```

The setting affects every private endpoint of the subnet; other resources of the subnet are always subject to the NSG. With policies enabled:

- An NSG can allow only some sources to reach the endpoint, and an **application security group** can contain private endpoints.
- Each private endpoint adds a **/32 system route** to its virtual network and peered networks. To send that traffic through a firewall, a user-defined route needs a prefix **equal to or more specific than the virtual network address space**, for example 10.1.0.0/16 for a /16 network. A 0.0.0.0/0 route doesn't override the /32. The firewall should apply SNAT so that return traffic follows the same path.
- Effective routes and effective security rules aren't displayed for the endpoint's network interface, and NSG flow logs don't record inbound traffic to it.

**3. The service itself.** Disable public network access, or keep its firewall restricted, so that only the private path remains.

> **Exam trap.** An NSG on the endpoint subnet that denies a source has **no effect** while the subnet's private endpoint network policy is `Disabled`. Enable `NetworkSecurityGroupEnabled` (or `Enabled`) first.

<!-- section: private-link-service | objectives: 4.1.4 -->
## Creating a Private Link service

A **Private Link service** publishes your own application, running behind a **Standard** internal load balancer, to consumers in other virtual networks, subscriptions or Microsoft Entra tenants. Each consumer creates a private endpoint in its own network; the address spaces may overlap because the service applies NAT.

Order of operations for the provider:

1. Run the application behind a Standard load balancer whose backend pool is defined by network interfaces (not by IP addresses).
2. On the subnet that will hold the service's NAT IP addresses, set `privateLinkServiceNetworkPolicies` to `Disabled`. The portal does it for you; CLI, PowerShell and templates need this explicit step.
3. Create the Private Link service on a frontend IP configuration of the load balancer, with one to eight NAT IP addresses.
4. Share the **alias** (`<prefix>.<GUID>.<region>.azure.privatelinkservice`) or the resource ID with consumers.
5. Approve the connection requests that aren't auto-approved.

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

Exposure and approval settings:

| Setting | Options |
| --- | --- |
| Visibility | **Role-based access control only** (callers with permissions), **Restricted by subscription** (listed subscriptions, other tenants included), **Anyone with your alias** |
| Auto-approval | Subscriptions whose requests are approved without action; must be a subset of the visibility list |

Other facts: the service is in the same region as its virtual network and load balancer, but consumers can connect from any region; it supports IPv4 TCP and UDP only; a load balancer can host up to eight Private Link services, each on its own frontend IP configuration; a service accepts up to 1,000 private endpoints. The provider's application sees the **NAT IP address** as the source of every connection; to get the consumer's information, enable **TCP Proxy v2** (the application must parse the PROXY protocol header, which also carries the private endpoint's link ID).

> **Exam trap.** A Private Link service is attached to a load balancer frontend, never to a virtual machine or a public load balancer, and requires the Standard SKU. "Expose an internal application to a partner whose address space overlaps ours" is the Private Link service scenario; peering would fail on the overlap.

<!-- section: private-endpoint-dns | objectives: 4.1.5 -->
## Integrating private endpoints with DNS

Clients keep using the service's usual name, such as `stcontosodata.blob.core.windows.net`. When a private endpoint exists, Azure public DNS answers with a CNAME to `stcontosodata.privatelink.blob.core.windows.net`. Who answers the next step decides the result:

| Resolver | Answer for the `privatelink` name |
| --- | --- |
| Azure DNS (168.63.129.16) in a virtual network **linked** to the private DNS zone `privatelink.blob.core.windows.net` | The A record of the zone: the private IP address |
| Any resolver without access to that zone (internet, unlinked network) | The public IP address of the service |

Components of the recommended design:

1. A **private DNS zone** with the recommended name (`privatelink.<service zone>`), created **once**, usually in the hub.
2. A **virtual network link** from that zone to every virtual network whose clients use Azure DNS (hub and spokes), autoregistration off.
3. A **private DNS zone group** on each private endpoint: it creates the A record, updates it and deletes it with the endpoint. One zone group per endpoint, with up to five zones.

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

Design rules:

- Use **one zone per name** shared by all networks. Separate zones with the same name in different spokes need manual record merging.
- Don't put records of different services in one zone, and don't reuse a zone for private endpoints of two different resource types.
- A custom DNS server in Azure must forward these names to **168.63.129.16** from a virtual network linked to the zone.
- Once a `privatelink.blob.core.windows.net` zone is linked, any storage account that has a private endpoint elsewhere but no record in your zone resolves to **NXDOMAIN** for your clients. Add the record, or enable **fallback to internet** on the virtual network link.
- A hosts file entry is acceptable only for testing.

> **Exam trap.** Never create a zone named after the public name (`blob.core.windows.net`): every other storage account would stop resolving. The zone is always the `privatelink` name.

<!-- section: on-premises-clients | objectives: 4.1.6 -->
## Integrating Private Link with on-premises clients

On-premises clients reach a private endpoint, whether it targets an Azure PaaS resource or a Private Link service, over a site-to-site VPN or ExpressRoute private peering: the endpoint's address belongs to the virtual network address space that the gateway already advertises. In a hub and spoke design, place the endpoint in the hub or in a spoke that uses the hub gateway.

Routing is rarely the problem; **DNS** is. On-premises DNS servers can't query 168.63.129.16, and Azure's answers for linked private zones are visible only from inside a linked virtual network. The query must therefore be forwarded into Azure:

| Design | On-premises DNS configuration | Azure side |
| --- | --- | --- |
| Azure DNS Private Resolver (recommended) | Conditional forwarder to the IP address of the resolver's **inbound endpoint** | Resolver in a virtual network linked to the `privatelink` zones |
| DNS forwarder (VM or Azure Firewall DNS proxy) | Conditional forwarder to the forwarder's IP address | Forwarder in a linked virtual network, forwarding to 168.63.129.16 |

The conditional forwarder targets the **public** zone name: `blob.core.windows.net`, `database.windows.net`, `vaultcore.azure.net`. The CNAME chain then leads to the `privatelink` name, which Azure resolves with the private zone.

For a **Private Link service** of your own, there's no recommended `privatelink` zone: publish the name your clients use (for example `orders.fabrikam.internal`) as an A record pointing to the consumer's private endpoint IP, in a private DNS zone reached through the resolver or directly in the on-premises DNS.

Two more points for hybrid clients:

- The provider sees the Private Link service NAT IP address, not the on-premises client address. Enable TCP Proxy v2 if the application needs the real source.
- Overlapping on-premises and provider address spaces don't matter: the consumer only needs a free address for the private endpoint in its own virtual network.

> **Exam trap.** A conditional forwarder for `privatelink.blob.core.windows.net` works only if clients query the `privatelink` name directly; applications use the public name. Forward the **public** zone (`blob.core.windows.net`) to the inbound endpoint.

<!-- section: key-points -->
## Key points

- A private endpoint = one NIC, one private IP, one subresource of one resource; it doesn't disable the public endpoint.
- Approval is automatic with `privateEndpointConnectionsApproval/action`, otherwise manual (Pending, then Approved).
- NSGs and UDRs apply to private endpoints only with the subnet's private endpoint network policies enabled; a UDR must be at least as specific as the virtual network address space to override the /32.
- Private Link service: Standard internal load balancer frontend, NAT IP subnet with `privateLinkServiceNetworkPolicies` disabled, alias, visibility and auto-approval.
- DNS: one `privatelink` zone, linked to every client network, records managed by a zone group.
- On-premises: VPN or ExpressRoute for the route, conditional forwarder of the public zone name to a DNS Private Resolver inbound endpoint for the name.
