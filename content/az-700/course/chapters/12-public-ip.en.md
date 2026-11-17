A public IP address is a resource of its own: it has a SKU, a region and zones, and it is associated with one resource at a time. The exam asks which kind of address a design needs (a single address, a prefix, your own range) and what must match for an association to succeed.

<!-- section: public-ip-create | objectives: 1.1.9 -->
## Creating a public IP address

Basic SKU public IP addresses were retired on September 30, 2025. A design now chooses between two SKUs:

| Property | Standard | Standard v2 |
| --- | --- | --- |
| Allocation | Static only | Static only |
| Availability zones | Zone-redundant or zonal (a single zone) | Zone-redundant only |
| Inbound traffic | Closed until an NSG allows it | Closed until an NSG allows it |
| Routing preference Internet | Supported | Not supported |
| Global tier | Supported | Not supported |
| Associated with | Every resource type that accepts a public IP address | Only a StandardV2 NAT gateway |

Settings chosen at creation:

| Setting | Values and rules |
| --- | --- |
| IP version | IPv4 or IPv6. One resource per version: a dual-stack frontend uses two public IP address resources |
| SKU | Can't be changed after creation |
| Tier | **Regional** (default) or **Global**. A global-tier address is an anycast address used by a cross-region load balancer; it has no availability zones |
| Assignment | Static: the address is allocated when the resource is created and released only when the resource is deleted. You can't choose the address, except inside a prefix |
| Availability zone | Zone-redundant (the default in regions with zones) or one zone. Can't be changed after creation |
| Routing preference | **Microsoft network** (default): traffic travels on the Microsoft backbone as long as possible. **Internet**: traffic spends as little time as possible on the Microsoft network and uses transit ISP networks, at a lower data transfer cost. Can't be changed after creation |
| Idle timeout | 4 to 30 minutes for flows that originate inbound (default 4); fixed at 4 minutes for outbound flows |
| DNS name label | Creates `<label>.<region>.cloudapp.azure.com`; the label must be unique in the region |

The public IP address must be in the same **region and subscription** as the resource it will be associated with; the resource group can differ.

```bash
az network public-ip create --resource-group RG1 --name pip-web --location westeurope \
  --sku Standard --version IPv4 --zone 1 2 3 --dns-name contoso-web

# Anycast address for a cross-region load balancer
az network public-ip create --resource-group RG1 --name pip-global \
  --sku Standard --tier Global --version IPv4

# Lower-cost egress through the transit ISP
az network public-ip create --resource-group RG1 --name pip-batch \
  --sku Standard --version IPv4 --zone 1 2 3 --ip-tags 'RoutingPreference=Internet'
```

```powershell
New-AzPublicIpAddress -ResourceGroupName RG1 -Name pip-web -Location westeurope `
  -Sku Standard -AllocationMethod Static -IpAddressVersion IPv4 -Zone 1,2,3 `
  -DomainNameLabel contoso-web
```

Routing preference Internet has its own limits: IPv4 only, zone-redundant Standard addresses only, and only for virtual machines, scale sets, AKS, public load balancers with NIC-based backends, Application Gateway and Azure Firewall. It can't be used with a NAT gateway.

> **Exam trap.** A virtual machine that receives a Standard public IP address isn't reachable yet. The address is secure by default: an NSG on the subnet or on the network interface must allow the inbound flow.

<!-- section: public-ip-associate | objectives: 1.1.10 -->
## Associating public IP addresses with resources

| Resource | Where the address is attached | Rules |
| --- | --- | --- |
| Virtual machine | An IP configuration of a network interface | One public IP address per IP configuration; add IP configurations for more |
| Public load balancer | A frontend IP configuration | A single address, or a prefix for outbound rules only |
| NAT gateway | Outbound IP addresses | Addresses and prefixes in any combination, 16 addresses at most; a StandardV2 NAT gateway accepts only StandardV2 addresses and prefixes |
| Azure Firewall | An IP configuration | At least one address; up to 250 in a virtual network. A prefix can't be attached, but addresses created from a prefix can |
| Application Gateway | A frontend IP configuration | A static Standard address |
| VPN gateway | A gateway IP configuration | A static Standard address, and a second one in active-active mode; a prefix can't be attached |
| Azure Bastion | The public IP configuration of the host | Can't be changed after creation. Not used by the Developer SKU or a private-only deployment |
| Azure Route Server | A frontend IP configuration | A static Standard address |

Rules that apply to every association:

- Same region and same subscription for the address and the resource.
- An address is associated with one resource at a time. Dissociate it before you reuse it or delete it; a deleted address can't be recovered.
- A zonal address shares the fate of its zone. Give a zone-redundant resource a zone-redundant address.

```bash
# Associate an existing address with the IP configuration of a network interface
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic --name ipconfig1 \
  --public-ip-address pip-web

# Dissociate it
az network nic ip-config update --resource-group RG1 --nic-name vm1-nic --name ipconfig1 \
  --public-ip-address null
```

A public IP address on a network interface is also an explicit outbound method for that virtual machine. When the subnet has a NAT gateway, the NAT gateway takes precedence for outbound connections, over instance-level public IP addresses and over load balancer outbound rules. A NAT gateway never provides inbound connections initiated from the internet.

<!-- section: prefix-when | objectives: 1.1.7 -->
## When to use a public IP prefix

A **public IP prefix** is a contiguous range of Standard public IP addresses that Azure reserves for you in a region. You create static public IP addresses from it; when you delete one of them, the address goes back to your range instead of returning to Azure.

| Requirement | Answer |
| --- | --- |
| A partner must allow your outbound addresses, and more addresses will be added later | A prefix: one firewall rule covers present and future addresses |
| A NAT gateway runs out of SNAT ports | Attach a prefix: the whole range is used for outbound connections (16 addresses at most, so /28) |
| Outbound rules of a Standard load balancer need several addresses | A prefix as frontend, used for outbound only |
| Each instance of a virtual machine scale set needs its own public address | A prefix referenced by the scale set |
| Azure Firewall needs several known addresses | Individual addresses created from a prefix |
| One frontend, one address, no growth | A single public IP address is enough |
| Clients already trust addresses that your company owns | A custom IP prefix |

Limits to remember:

- You choose the size, not the addresses: Azure picks the range.
- The size can't be changed after creation. Plan for growth or create another prefix.
- Addresses from the prefix are static Standard addresses, in the same region and subscription as the prefix.
- The whole prefix counts against the public IP address quota of the subscription, even before any address is created from it.
- A prefix can't be deleted while one of its addresses is associated with a resource.

<!-- section: prefix-create | objectives: 1.1.6 -->
## Creating a public IP prefix

| Prefix size | Addresses |
| --- | --- |
| /28 (IPv4) or /124 (IPv6) | 16 |
| /29 (IPv4) or /125 (IPv6) | 8 |
| /30 (IPv4) or /126 (IPv6) | 4 |
| /31 (IPv4) or /127 (IPv6) | 2 |

/28 is the largest size for ranges owned by Microsoft, unless support raises the limit. Settings: name, region, IP version, SKU (Standard, or Standard v2 for a StandardV2 NAT gateway), prefix ownership (Microsoft or custom), size, and zones: in a region with availability zones, a prefix is zone-redundant or tied to one zone.

```bash
az network public-ip prefix create --resource-group RG1 --name ippre-nat --location westeurope \
  --length 28 --version IPv4 --sku Standard --zone 1 2 3

# A static address taken from the prefix
az network public-ip create --resource-group RG1 --name pip-nat-01 \
  --sku Standard --public-ip-prefix ippre-nat
```

```powershell
$prefix = New-AzPublicIpPrefix -ResourceGroupName RG1 -Name ippre-nat -Location westeurope `
  -PrefixLength 28 -Sku Standard -IpAddressVersion IPv4 -Zone 1,2,3
New-AzPublicIpAddress -ResourceGroupName RG1 -Name pip-nat-01 -Location westeurope `
  -Sku Standard -AllocationMethod Static -PublicIpPrefix $prefix
```

Azure doesn't hand out the addresses of a prefix in order. To obtain a specific address of the range, add `--ip-address` (Azure CLI) or `-IpAddress` (PowerShell) when you create the public IP address.

> **Exam tip.** You can neither choose the range of a prefix nor resize it. If a design needs contiguous addresses, create the prefix first, with its final size, then create the addresses from it.

<!-- section: custom-prefix | objectives: 1.1.8 -->
## Custom IP address prefixes (BYOIP)

A **custom IP prefix** is a range that your organization owns and lets Microsoft advertise. It keeps the reputation of your addresses and the allowlists that already contain them. It is never attached to a resource: you derive public IP prefixes from it, then public IP addresses.

Prerequisites, outside Azure:

- The range is registered in your name with a Regional Internet Registry (ARIN, RIPE NCC, APNIC, LACNIC or AFRINIC) and is no smaller than a /24.
- A **Route Origin Authorization (ROA)** created at the registry authorizes origin AS **8075** (Microsoft public cloud) for exactly the prefix you bring. Allow 24 hours for it to become visible to Microsoft.
- A self-signed certificate whose public part is published in the comments of the registry record. With its private key you sign the authorization message `subscriptionId|prefix|expirationDate`.

| Phase | What happens | State |
| --- | --- | --- |
| Validation | Microsoft checks the ROA and the signed message against the registry record | - |
| Provision | The custom IP prefix resource is created in a region (about 30 minutes). Public IP prefixes and addresses can be derived and attached, but they aren't advertised, so they aren't reachable | `Provisioning`, then `Provisioned` |
| Commission | The range is advertised from the Azure region, then by the Microsoft WAN to the internet (3 to 4 hours) | `Commissioning`, then `Commissioned` |

```bash
az network custom-ip prefix create --resource-group RG1 --name cip-contoso --location westeurope \
  --cidr 198.51.100.0/24 --zone 1 2 3 \
  --authorization-message "$byoipauth" --signed-message "$byoipauthsigned"

# Once the state is Provisioned: derive a public IP prefix
az network public-ip prefix create --resource-group RG1 --name ippre-byoip --location westeurope \
  --length 26 --custom-ip-prefix-name cip-contoso

# Start advertising the range
az network custom-ip prefix update --resource-group RG1 --name cip-contoso --state commission
```

Two onboarding models exist for IPv4, and a range can't be moved from one to the other without being fully deprovisioned:

| Model | Ranges | Use |
| --- | --- | --- |
| Unified | One range from /21 to /24, advertised by the region and by the Microsoft WAN | A range used in a single region |
| Global/regional | A global (parent) range from /21 to /24, advertised by the WAN; regional (child) ranges from /22 to /26, at least one size smaller, advertised by their regions | A range split across regions or teams. Only the parent is validated; children can be in other subscriptions of the same tenant |

Other rules:

- A derived public IP prefix can be as large as the custom prefix, and can live in another subscription.
- In a region with availability zones, the custom prefix is zone-redundant or zonal; it can't be created without zones.
- Addresses derived from a custom prefix support neither routing preference Internet nor the global tier, and aren't advertised over ExpressRoute Microsoft peering. Standard v2 prefixes can't be derived.
- To migrate a range that is live elsewhere, **regional commissioning** advertises it inside the Azure region only (state `CommissionedNoInternetAdvertise`) until you are ready to move the internet advertisement.
- Removal runs backwards: delete the derived public IP prefixes, decommission (back to `Provisioned`), deprovision, then delete. Decommission before you remove the ROA.

> **Exam trap.** A `Provisioned` range isn't in service. Addresses derived from it can already be attached to resources, but no traffic reaches them until the custom prefix is commissioned. Advertising the same range from your own network at the same time can cause BGP routing instability or traffic loss.

<!-- section: key-points -->
## Key points

- Only Standard SKUs remain: static, zone-aware, closed to inbound traffic until an NSG allows it. Standard v2 exists only for StandardV2 NAT gateways.
- Address and resource: same region, same subscription; SKU, zones, tier and routing preference are fixed at creation.
- Global tier = cross-region load balancer; routing preference Internet = cheaper egress, IPv4, not with NAT gateway.
- Prefix sizes /28 to /31 (16 to 2 addresses); size and range can't be changed; the prefix first, then the addresses.
- NAT gateway: 16 addresses at most, addresses and prefixes combined. Azure Firewall: up to 250 addresses, never a prefix directly.
- BYOIP: ROA for AS 8075, signed message, provision (not advertised), commission (advertised). Unified model for one region, global/regional for several.
