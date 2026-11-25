A network security group (NSG) is a stateful layer 3 and 4 filter made of allow and deny rules, attached to subnets and network interfaces. Application security groups (ASGs) let those rules target groups of virtual machines by role instead of by IP address. Exam questions give you a table of NSG rules and associations, then ask whether a flow is allowed, which rule decides, or which rule, priority or association to add.

<!-- section: create-nsg | objectives: 5.1.1 -->
## Creating a network security group

An NSG is a regional resource. Besides your own rules, it contains six **default rules** that you can't delete but can override, because they have the lowest priorities:

| Direction | Name | Priority | Source | Destination | Access |
| --- | --- | --- | --- | --- | --- |
| Inbound | AllowVNetInBound | 65000 | VirtualNetwork | VirtualNetwork | Allow |
| Inbound | AllowAzureLoadBalancerInBound | 65001 | AzureLoadBalancer | Any | Allow |
| Inbound | DenyAllInbound | 65500 | Any | Any | Deny |
| Outbound | AllowVnetOutBound | 65000 | VirtualNetwork | VirtualNetwork | Allow |
| Outbound | AllowInternetOutBound | 65001 | Any | Internet | Allow |
| Outbound | DenyAllOutBound | 65500 | Any | Any | Deny |

Consequences: without custom rules, everything inside the virtual network (including peered networks and connected on-premises ranges, which belong to the **VirtualNetwork** tag) can talk, Azure Load Balancer health probes get in, all other inbound traffic is denied, and outbound internet traffic is allowed.

An NSG is **stateful**: a flow record is kept for each connection, so the return traffic of an allowed flow is allowed without a rule in the other direction. Rules apply only to **new** connections: deleting the rule that allowed an SSH session doesn't cut the open session.

```bash
az network nsg create \
  --resource-group RG-Network \
  --name nsg-web \
  --location westeurope
```

```powershell
New-AzNetworkSecurityGroup -Name nsg-web -ResourceGroupName RG-Network -Location westeurope
```

> **Exam trap.** The virtual IP address of the host, **168.63.129.16**, and 169.254.169.254 (DHCP, DNS, instance metadata, health monitoring) aren't filtered by your NSG rules unless you target them with the dedicated service tags (`AzurePlatformDNS`, `AzurePlatformIMDS`, `AzurePlatformLKM`). A "deny all" rule doesn't break DNS resolution through Azure DNS. Azure Load Balancer health probes, which also come from 168.63.129.16, are the exception: NSGs must allow them (`AzureLoadBalancer` tag, default rule 65001), so a custom inbound deny-all rule marks the backend instances as down.

<!-- section: nsg-rules | objectives: 5.1.5 -->
## Creating inbound and outbound security rules

Each rule has these properties:

| Property | Values |
| --- | --- |
| Priority | 100 to 4096; the lowest number is evaluated first; processing stops at the first match. Two rules can't have the same priority and direction |
| Source / destination | Any, an IP address, a CIDR range, several addresses and ranges (augmented rule), a service tag or an application security group |
| Source / destination port | Any, a port, a range (`10000-10005`) or a list (`80,443,8080`) |
| Protocol | Any, TCP, UDP, ICMP (ESP and AH aren't available in the portal) |
| Direction | Inbound or outbound |
| Action | Allow or Deny |

Things the exam checks:

- **Augmented rules** combine several IP addresses, ranges and ports in one rule, but a rule can't list several service tags.
- For **inbound** traffic from the internet, the NSG sees the destination **after** NAT: write rules with the virtual machine's **private** IP address, not its public IP address. For outbound traffic, rules are evaluated before translation to the public address.
- Behind a load balancer, the source is the original client and the destination is the virtual machine, not the load balancer frontend.
- **Service tags** replace lists of Microsoft addresses that Microsoft maintains for you:

| Service tag | Represents |
| --- | --- |
| `VirtualNetwork` | The virtual network address space, peered networks, on-premises ranges connected through a gateway, and 168.63.129.16 |
| `Internet` | Addresses outside the virtual network reachable on the internet, Azure public addresses included |
| `AzureLoadBalancer` | Health probes of the Azure infrastructure (168.63.129.16), not client traffic |
| `Storage`, `Sql`, `AzureCloud` | Public addresses of a service; regional variants such as `Storage.WestEurope` exist |
| `AzureFrontDoor.Backend` | Addresses Azure Front Door uses to reach origins |
| `GatewayManager` | Management traffic of VPN Gateway and Application Gateway |

```bash
# Allow HTTPS from the internet to the web subnet's servers
az network nsg rule create \
  --resource-group RG-Network \
  --nsg-name nsg-web \
  --name Allow-HTTPS-Internet \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --source-port-ranges "*" \
  --destination-address-prefixes 10.1.1.0/24 \
  --destination-port-ranges 443

# Block outbound internet access except Azure Storage
az network nsg rule create --resource-group RG-Network --nsg-name nsg-web \
  --name Allow-Storage-Out --priority 200 --direction Outbound --access Allow \
  --protocol "*" --destination-address-prefixes Storage --destination-port-ranges "*"
az network nsg rule create --resource-group RG-Network --nsg-name nsg-web \
  --name Deny-Internet-Out --priority 300 --direction Outbound --access Deny \
  --protocol "*" --destination-address-prefixes Internet --destination-port-ranges "*"
```

Worked example. NSG1 on Subnet1 (10.1.1.0/24) contains: 100 Allow TCP 3389 from 203.0.113.0/24; 200 Deny TCP 3389 from Any; 300 Allow TCP 443 from Internet.

| Flow to VM1 (10.1.1.4) | Result | Deciding rule |
| --- | --- | --- |
| RDP from 203.0.113.10 | Allowed | 100 |
| RDP from VM2 in a peered virtual network | Denied | 200 (evaluated before AllowVNetInBound at 65000) |
| HTTPS from a client on the internet | Allowed | 300 |
| HTTP (80) from a client on the internet | Denied | DenyAllInbound |
| SQL (1433) from VM3 in the same virtual network | Allowed | AllowVNetInBound |

> **Exam trap.** To block traffic between subnets of the same virtual network, a deny rule is required: **AllowVNetInBound** allows it by default. Its priority, 65000, means that any custom rule from 100 to 4096 wins over it.

<!-- section: associate-nsg | objectives: 5.1.2 -->
## Associating an NSG with a subnet or a network interface

An NSG can be associated with **subnets** and with **network interfaces**. A subnet or a network interface has at most one NSG, but one NSG can be reused by many subnets and interfaces. An NSG associated with a subnet must exist in the same subscription and region as the virtual network.

When both levels have an NSG, traffic must be allowed by **both**:

| Direction | Evaluation order |
| --- | --- |
| Inbound | NSG of the subnet, then NSG of the network interface |
| Outbound | NSG of the network interface, then NSG of the subnet |

If the first NSG denies the traffic, the second one never sees it. Traffic between two virtual machines of the **same subnet** is filtered the same way: a subnet NSG that denies everything isolates them from each other.

| Situation | Result for inbound internet traffic on TCP 80 |
| --- | --- |
| Subnet NSG allows 80, NIC NSG has only default rules | Denied by DenyAllInbound of the NIC NSG |
| Subnet NSG allows 80, NIC has no NSG | Allowed |
| Subnet has no NSG, NIC NSG allows 80 | Allowed |
| No NSG at all, VM with a Standard public IP address | Denied: Standard public IP addresses are secure by default |

```bash
# Associate with a subnet
az network vnet subnet update \
  --resource-group RG-Network \
  --vnet-name VNet-App \
  --name snet-web \
  --network-security-group nsg-web

# Associate with a network interface
az network nic update \
  --resource-group RG-App \
  --name vm-web1-nic \
  --network-security-group nsg-web
```

To dissociate, select **None** on the interface's or subnet's NSG setting, or pass `--network-security-group null` to `az network vnet subnet update`. Before associating an NSG with a subnet that hosts a platform service (Application Gateway, Azure Bastion, SQL Managed Instance, App Service Environment), check that service's required ports.

To check the result, use **Effective security rules** on a network interface: it merges the rules of the subnet's and the interface's NSGs. Network Watcher **IP flow verify** tests one flow and names the deciding rule.

> **Exam tip.** Microsoft recommends associating an NSG with the subnet **or** the network interface, not both, to avoid conflicts. Subnet-level NSGs scale better; interface-level NSGs fit exceptions for a single virtual machine.

<!-- section: application-security-groups | objectives: 5.1.3, 5.1.4 -->
## Creating and associating application security groups

An **application security group** is a named group of network interface IP configurations, such as `asg-web`, `asg-app` and `asg-db`. NSG rules use it as a source or destination, so a new web server is protected as soon as its network interface joins `asg-web`, without changing any rule or IP address.

Create the ASG, then add each network interface's IP configuration to it:

```bash
az network asg create \
  --resource-group RG-App \
  --name asg-web \
  --location westeurope

az network nic ip-config update \
  --resource-group RG-App \
  --nic-name vm-web1-nic \
  --name ipconfig1 \
  --application-security-groups asg-web

az network nsg rule create \
  --resource-group RG-Network \
  --nsg-name nsg-app \
  --name Allow-HTTPS-to-Web \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-asgs asg-web \
  --destination-port-ranges 443
```

In the portal, a network interface is added to an ASG from the virtual machine's **Networking** page (**Application security groups** tab); this works only for an interface attached to a virtual machine. CLI and PowerShell can also assign ASGs when creating the interface.

Constraints:

- All network interfaces of an ASG must be in the **same virtual network** as the first interface added to it.
- An ASG must be in the same region as the network interfaces it contains.
- When a rule uses ASGs as both source and destination, both ASGs must contain interfaces of the same virtual network.
- A network interface IP configuration can belong to up to 20 ASGs.
- A rule that references an ASG applies only to the members of that ASG, even if the NSG is associated with the whole subnet.
- Private endpoints can also be ASG members; the rules then apply only if the private endpoint network policy of their subnet is enabled.

Example of a three-tier policy in one NSG associated with both subnets:

| Priority | Source | Destination | Port | Access |
| --- | --- | --- | --- | --- |
| 100 | Internet | asg-web | TCP 443 | Allow |
| 110 | asg-app | asg-db | TCP 1433 | Allow |
| 120 | Any | asg-db | 1433, any protocol | Deny |

Rule 120 is needed because **AllowVNetInBound** would otherwise let any virtual machine of the virtual network reach the database servers.

> **Exam trap.** ASGs don't span virtual networks. If the web servers are in VNet1 and the database servers in a peered VNet2, a rule from `asg-web` to `asg-db` isn't possible: use IP ranges or service tags for the cross-network rule.

<!-- section: key-points -->
## Key points

- Six default rules (65000, 65001, 65500 in each direction): VNet traffic allowed, load balancer probes allowed, internet outbound allowed, everything else denied.
- Priority 100 to 4096, lowest number first, first match wins; NSGs are stateful and affect only new connections.
- Inbound: subnet NSG, then NIC NSG; outbound: NIC NSG, then subnet NSG; both must allow.
- Inbound rules use private IP addresses (after NAT); service tags replace Microsoft address lists.
- ASGs group NIC IP configurations of one virtual network; rules referencing them follow the members automatically.
