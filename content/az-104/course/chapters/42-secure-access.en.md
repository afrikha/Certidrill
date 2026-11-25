This chapter covers the filtering of traffic with network security groups, administrator access with Azure Bastion, and the two ways to reach PaaS services privately: service endpoints and private endpoints.

<!-- section: nsg-asg | objectives: 4.2.1 -->
## Network security groups and application security groups

A **network security group** (NSG) is a list of rules that allow or deny traffic. It is associated with a **subnet**, a **network interface**, or both; the same NSG can be reused on several of them, in the same region.

A rule is defined by:

| Property | Values |
| --- | --- |
| Priority | **100 to 4096**; the lowest number is processed first |
| Direction | Inbound or outbound |
| Source and destination | Any, IP address or CIDR range, **service tag**, or **application security group** |
| Protocol and ports | TCP, UDP, ICMP or Any; a port, a range or `*` |
| Action | Allow or Deny |

Every NSG contains **default rules** that can't be deleted, only overridden by rules with a lower number:

| Direction | Priority | Name | Effect |
| --- | --- | --- | --- |
| Inbound | 65000 | AllowVNetInBound | Allow from `VirtualNetwork` to `VirtualNetwork` |
| Inbound | 65001 | AllowAzureLoadBalancerInBound | Allow load balancer health probes |
| Inbound | 65500 | DenyAllInBound | Deny everything else |
| Outbound | 65000 | AllowVnetOutBound | Allow to `VirtualNetwork` |
| Outbound | 65001 | AllowInternetOutBound | Allow to `Internet` |
| Outbound | 65500 | DenyAllOutBound | Deny everything else |

So, without any custom rule: inbound traffic from the internet is denied, traffic inside the virtual network and outbound traffic to the internet are allowed.

**Service tags** are groups of address prefixes maintained by Microsoft:

| Tag | Represents |
| --- | --- |
| `VirtualNetwork` | The address space of the virtual network, of **peered** networks and of **on-premises** networks connected by a gateway |
| `Internet` | Public addresses outside the virtual network, including Azure's public addresses |
| `AzureLoadBalancer` | The source of health probes (168.63.129.16) |
| `Storage`, `Sql`, `AzureKeyVault`... | The addresses of a service; can be limited to a region: `Storage.WestEurope` |

An **application security group** (ASG) groups network interfaces by role (web, database). Rules name the group instead of IP addresses; adding a server means adding its interface to the group. All the interfaces of an ASG must be in the **same virtual network**; an interface can belong to several ASGs.

```bash
az network asg create -g RG1 -n asg-web
az network nsg create -g RG1 -n nsg-app
az network nsg rule create -g RG1 --nsg-name nsg-app -n Allow-HTTPS-Web --priority 200 \
  --direction Inbound --access Allow --protocol Tcp --source-address-prefixes Internet \
  --destination-asgs asg-web --destination-port-ranges 443
az network vnet subnet update -g RG1 --vnet-name VNet1 -n app --network-security-group nsg-app
```

<!-- section: effective-rules | objectives: 4.2.2 -->
## Evaluating effective security rules

Four rules solve every "is this traffic allowed?" question:

1. Inside one NSG, rules are processed **by priority, lowest number first, and processing stops at the first match**. A more specific rule further down is never reached.
2. When an NSG is on the subnet and another on the interface, **both must allow** the traffic. **Inbound**: subnet NSG first, then interface NSG. **Outbound**: interface NSG first, then subnet NSG.
3. NSGs are **stateful**: the reply to an allowed flow is allowed automatically. You never need a rule for return traffic.
4. A rule change affects **new connections** only; established flows continue.

Method: take the flow (source, destination, port, protocol), walk down the first NSG until a rule matches, and if it allows, do the same in the second NSG. Don't forget the default rules at the end.

Worked example. Subnet NSG: `100 Allow TCP 443 from Internet`, `200 Deny TCP 3389 from Any`. Interface NSG: `100 Allow TCP 3389 from 10.0.9.0/24`, no rule for 443.

| Flow | Result | Why |
| --- | --- | --- |
| HTTPS from the internet | **Denied** | Allowed by the subnet NSG, but in the interface NSG nothing matches before DenyAllInBound |
| RDP from 10.0.9.4 (same virtual network) | **Denied** | Subnet NSG rule 200 matches first; the interface NSG is never evaluated |
| TCP 1433 from 10.0.9.4 | **Allowed** | No custom rule matches; AllowVNetInBound allows it in both NSGs |

Traps:

- A subnet NSG also filters traffic **between machines of the same subnet**.
- A custom deny rule covering `Any` source also blocks the **load balancer health probes** and Azure Bastion, because it is evaluated before the default allow rules.
- The public endpoint of an Azure service in another region belongs to `Internet`, not to the regional tag you allowed.

To see the result without calculating: **Effective security rules** on the network interface (running machine), `az network nic list-effective-nsg`, `Get-AzEffectiveNetworkSecurityGroup`, or **IP flow verify** for one precise flow.

<!-- section: bastion | objectives: 4.2.3 -->
## Azure Bastion

Azure Bastion gives RDP and SSH access to virtual machines **through the Azure portal over TLS (443)**, using their **private** IP addresses. The machines need no public IP address and no RDP or SSH port open to the internet.

Requirements of a dedicated deployment (Basic and above):

- A subnet named exactly **`AzureBastionSubnet`**, **/26 or larger**, in the virtual network.
- A **Standard, static public IP address** for the bastion host (except for a private-only Premium deployment).
- One Bastion serves the machines of its virtual network and of **directly peered** virtual networks, including peerings across subscriptions of the **same Microsoft Entra tenant** (not across two tenants). Peering isn't transitive: a network peered only with a peer of the bastion's network isn't reached.

| SKU | What it adds |
| --- | --- |
| **Developer** | Free, shared infrastructure, **no dedicated subnet or public IP**, one connection at a time, no peering support |
| **Basic** | Dedicated host (2 instances), portal connections, peered networks, Linux SSH keys from Key Vault |
| **Standard** | Host scaling (2 to 50 instances), **native client** (`az network bastion rdp` / `ssh` / `tunnel`), **file transfer**, **IP-based connection** (on-premises machines), **shareable links**, custom ports, RDP to Linux and SSH to Windows |
| **Premium** | **Session recording**, **private-only** deployment |

An SKU can be upgraded in place, not downgraded.

If an NSG is associated with `AzureBastionSubnet`, it must allow inbound 443 from `Internet` and `GatewayManager` and from `AzureLoadBalancer`, plus the Bastion internal ports and the required outbound rules. On the target subnets, allow 3389 and 22 **from the AzureBastionSubnet range**.

To connect, a user needs the Reader role on the virtual machine, on its network interface (the one with the private IP address) and on the Bastion resource, plus **Reader on the virtual network of the target machine when the bastion is in a peered virtual network**.

> **Exam trap.** A jump box with a public IP address, a public load balancer NAT rule or an NSG rule limited to an office IP all expose a port to the internet. When the requirement says "no public IP address on the virtual machines" and "from the Azure portal", the answer is Azure Bastion.

<!-- section: service-endpoints | objectives: 4.2.4 -->
## Service endpoints

A **service endpoint** is enabled on a **subnet** for a service (`Microsoft.Storage`, `Microsoft.Sql`, `Microsoft.KeyVault`, `Microsoft.Web`...). The traffic from that subnet to the service then stays on the Azure backbone and arrives **with the subnet's identity**, which lets the service's firewall accept only that subnet.

Two steps:

1. On the subnet: enable the service endpoint for the service.
2. On the resource (storage account, SQL server, key vault): add a **virtual network rule** for the subnet and set the default action to Deny.

What a service endpoint is and isn't:

- The service keeps its **public IP address** and its public DNS name; nothing changes in DNS.
- The source address seen by the service becomes the **private** address of the machine: existing IP rules based on the old public address stop matching.
- It works only from the subnet: **not from on-premises**, not from peered networks (enable it on their subnets too).
- **No additional cost.**
- For Azure SQL Database (`Microsoft.Sql`), every subnet referenced by a virtual network rule must be in the same region as the server. The subnet can be in **another subscription** only if both subscriptions are in the **same Microsoft Entra tenant** and both have the `Microsoft.Sql` resource provider registered.
- A **service endpoint policy** (Azure Storage) restricts the subnet to listed storage accounts only, to prevent data exfiltration to other accounts.

```bash
az network vnet subnet update -g RG1 --vnet-name VNet1 -n app \
  --service-endpoints Microsoft.Storage Microsoft.KeyVault
```

<!-- section: private-endpoints | objectives: 4.2.5 -->
## Private endpoints

A **private endpoint** is a network interface with a **private IP address from your subnet**, connected through Azure Private Link to one specific resource. The resource becomes reachable inside your network, and its public access can be disabled.

| | Service endpoint | Private endpoint |
| --- | --- | --- |
| Address of the service | Public | **Private**, in your subnet |
| Scope | The whole service; filtered by the resource's firewall | **One resource**, one sub-resource |
| From on-premises (VPN, ExpressRoute) and peered networks | No | **Yes** |
| DNS change | None | **Required** (private DNS zone) |
| Public access can be disabled | No | Yes |
| Cost | Free | Billed per hour and per GB |

Points tested:

- One private endpoint per **sub-resource**: `blob`, `file`, `dfs`, `web` for storage; `vault` for Key Vault; `sqlServer` for Azure SQL; `sites` for App Service.
- **DNS.** The public name becomes a CNAME to a `privatelink` name: `stor1.blob.core.windows.net` → `stor1.privatelink.blob.core.windows.net`. A **private DNS zone** `privatelink.blob.core.windows.net`, **linked to every virtual network that must resolve the name**, returns the private IP address. Clients keep the same URL and connection string. From on-premises, the local DNS server needs a **conditional forwarder** for these names that targets the IP address of the **inbound endpoint** of an Azure DNS Private Resolver (or a DNS forwarder virtual machine in Azure); the zone must also be linked to the virtual network where the resolver is deployed.
- Common zones: `privatelink.blob.core.windows.net`, `privatelink.file.core.windows.net`, `privatelink.vaultcore.azure.net`, `privatelink.database.windows.net`, `privatelink.azurewebsites.net`, `privatelink.azurecr.io`.
- **Approval.** *Automatic* when you have permissions on the resource; otherwise *manual*: the connection stays **Pending** until the resource owner approves it.
- NSGs and route tables apply to private endpoints only if **network policies** are enabled on the subnet.
- A private endpoint doesn't close the public endpoint by itself: also disable public network access (option **Disable** in the networking settings of a storage account).
- Your own service behind a Standard load balancer can be published with a **Private Link service**.

```bash
az network private-endpoint create -g RG1 -n pe-stor1-blob --vnet-name VNet1 --subnet data \
  --private-connection-resource-id <storage account ID> --group-id blob --connection-name stor1-blob
az network private-dns zone create -g RG1 -n privatelink.blob.core.windows.net
az network private-dns link vnet create -g RG1 -n link-vnet1 \
  --zone-name privatelink.blob.core.windows.net --virtual-network VNet1 --registration-enabled false
```

<!-- section: key-points -->
## Key points

- NSG rules: priority 100 to 4096, first match wins, stateful. Default: deny inbound from the internet, allow inside the virtual network and outbound.
- Inbound: subnet NSG then interface NSG; outbound: the reverse; both must allow.
- `VirtualNetwork` includes peered and on-premises ranges. ASG members must be in one virtual network.
- Bastion: `AzureBastionSubnet` /26, Standard public IP; native client, IP-based connection and shareable links need Standard; session recording needs Premium.
- Service endpoint: subnet identity, public address unchanged, free, not from on-premises.
- Private endpoint: private address, one sub-resource, private DNS zone `privatelink.*` linked to the virtual networks, works from on-premises.
