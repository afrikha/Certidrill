A name resolution question has three parts: who asks (a virtual machine, an on-premises client, an internet client), which name, and where the record lives. The answer is the missing piece on the path of the query: a link, a forwarder, an endpoint or a delegation.

<!-- section: vnet-name-resolution | objectives: 1.2.1 -->
## Designing name resolution inside a virtual network

| Option | What it gives | Limits |
| --- | --- | --- |
| Azure-provided DNS (default) | Without configuration, virtual machines of the same virtual network resolve each other by host name (suffix `internal.cloudapp.net`) and resolve public names. The service answers at 168.63.129.16 | Scoped to one virtual network, even when it is peered. No custom suffix, no custom records |
| Azure Private DNS zone | Your own domain name, with manual or automatically registered records, shared by every linked virtual network, whatever the region, with or without peering | Answers only linked virtual networks; on-premises clients need a forwarding path |
| Custom DNS servers | Full control: Active Directory domains, conditional forwarders | Virtual machines that you patch and keep highly available |
| Azure DNS Private Resolver | Managed conditional forwarding between Azure, on-premises and other networks | Needs its own delegated subnets; hosts no zone itself |

| Scenario | Solution |
| --- | --- |
| Virtual machines in different virtual networks | A private DNS zone linked to each virtual network; names are resolved by FQDN |
| A domain suffix of your own with automatic records for virtual machines | A private DNS zone with autoregistration |
| Azure virtual machines must resolve on-premises names | DNS Private Resolver: outbound endpoint and forwarding rule |
| On-premises clients must resolve records of a private DNS zone | A conditional forwarder on the on-premises DNS servers that points to an inbound endpoint of DNS Private Resolver |
| Domain-joined virtual machines | Custom DNS: the domain controllers, which forward everything else to 168.63.129.16 |

The order in which a query from a virtual machine is processed explains most answers:

1. If the virtual network (or the network interface) has **custom DNS servers**, the query goes to them and nothing else is consulted automatically.
2. Otherwise, the private DNS zones **linked to the virtual network** are consulted.
3. If no linked zone matches, the DNS forwarding ruleset linked to the virtual network is evaluated.
4. If no rule matches, Azure DNS resolves the name as a public name.

> **Exam trap.** Peering connects address spaces, not name resolution. After you peer two virtual networks, a virtual machine still can't resolve the host name of a machine in the other one: link a private DNS zone to both, or use a common DNS server.

<!-- section: vnet-dns-settings | objectives: 1.2.2 -->
## Configuring DNS settings for a virtual network

The **DNS servers** page of a virtual network offers two choices:

| Setting | Behavior |
| --- | --- |
| Default (Azure-provided) | Virtual machines receive 168.63.129.16 and the suffix `internal.cloudapp.net` through DHCP |
| Custom | Up to 20 addresses. They are used in the listed order, not in round robin: a client uses the first server it can reach. The Azure suffix is no longer supplied, so use FQDNs |

A **network interface** has the same page with **Inherit from virtual network** or **Custom**. Servers set on the network interface override those of the virtual network.

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

Points that questions test:

- DNS servers are delivered by DHCP. After a change, virtual machines keep the old servers until they are **restarted** or renew their lease (`ipconfig /renew`); an Application Gateway or an Azure Firewall in the virtual network must be restarted too.
- A custom DNS server in Azure must **forward to 168.63.129.16** what it doesn't host; this is how its clients keep resolving Azure host names and linked private DNS zones. 168.63.129.16 answers only from inside Azure: an on-premises DNS server must target a DNS server or an inbound endpoint in a virtual network instead.

<!-- section: public-zones | objectives: 1.2.3 -->
## Designing public DNS zones

Azure DNS hosts a public zone on authoritative name servers spread worldwide; the zone is a global resource and the location of its resource group doesn't matter. Azure DNS isn't a registrar: you buy the domain name elsewhere, then **delegate** it.

1. Create the zone (`contoso.com`). Azure assigns four name servers, for example `ns1-37.azure-dns.com`, `ns2-37.azure-dns.net`, `ns3-37.azure-dns.org` and `ns4-37.azure-dns.info`.
2. At the registrar, replace the NS records of the domain with **all four** name servers.

Until then, the zone answers only queries sent directly to its name servers. A **child zone** (`eu.contoso.com`) is a separate zone that another team can manage; the parent zone holds an NS record set named `eu` that lists the name servers of the child. The **Child zone** button of the parent zone creates both.

| Need | Design |
| --- | --- |
| The zone apex (`contoso.com`) must point to a Traffic Manager profile, an Azure Front Door endpoint or a CDN endpoint | An **alias record set** at the apex; a CNAME can't exist at the apex |
| A record must follow the address of an Azure public IP resource and never dangle | An alias A or AAAA record set that targets the Standard public IP address: it is updated when the address changes and becomes empty when the resource is deleted |
| Different answers for internal and internet clients | Split-horizon: a public zone and a private zone with the same name |
| Protection against forged answers | DNSSEC signing of the public zone, then a DS record in the parent zone through the registrar |
| A second DNS provider for the same zone | Add its name servers to the NS record set at the apex. Zone transfers (AXFR/IXFR) aren't supported; a zone file is imported with Azure CLI |

Alias record sets exist for the A, AAAA and CNAME types. A record set groups the records that share a name and a type, with one TTL; a public zone holds up to 10,000 record sets of up to 20 records.

<!-- section: private-zones | objectives: 1.2.4 -->
## Designing private DNS zones

A private DNS zone is a global resource: it belongs to no virtual network and no region, and it is resolved only from the virtual networks **linked** to it. A link has one of two roles:

| Link | Effect |
| --- | --- |
| Registration (autoregistration enabled) | The virtual machines of the virtual network get an A record in the zone, and the virtual network also resolves the zone |
| Resolution (autoregistration disabled) | The virtual network resolves every record of the zone, including those registered from other virtual networks |

| Limit | Value |
| --- | --- |
| Virtual network links per private zone | 1,000 |
| Links with autoregistration per private zone | 100 |
| Private zones that a virtual network can be linked to | 1,000 |
| Private zones for which a virtual network is a registration network | 1 |
| Record sets per private zone | 25,000 |

Autoregistration covers only virtual machines, only A records, and only the primary network interface. The record is created when the virtual machine starts and removed when it is deallocated or deleted. Other resources, such as internal load balancers, need manual records. Disabling autoregistration on a link immediately deletes the records it had registered.

Design rules:

- A zone name has at least two labels (`contoso.com`, not `contoso`); avoid `.local`. NS delegation doesn't exist in private zones: create `eu.corp.contoso.com` as its own zone and link it.
- In a hub-and-spoke topology, link the zone to every virtual network that must resolve it, or to the hub only and send the spokes' queries to the hub with DNS Private Resolver.
- With custom DNS servers, a linked zone is resolved only if the custom server forwards the zone to 168.63.129.16 **from a virtual network linked to the zone**.
- For Private Link zones, the link option **Enable fallback to internet** (`resolutionPolicy: NxDomainRedirect`) resolves the name publicly when the private zone answers that it doesn't exist.

<!-- section: configure-zones | objectives: 1.2.5 -->
## Configuring public and private DNS zones

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

| Rule | Detail |
| --- | --- |
| Record names | Relative to the zone; `@` is the apex and `*` a wildcard |
| `add-record` | Adds a record and creates the record set if needed; a CNAME record set holds one record, set with `set-record` |
| CNAME | Can't coexist with another record set of the same name, and can't be at the apex |
| NS and SOA at the apex | Created and deleted with the zone. You can add name servers to the apex NS record set, not remove those of Azure DNS |
| Private zones | Support A, AAAA, CNAME, MX, PTR, SOA, SRV and TXT records |

<!-- section: link-zone | objectives: 1.2.6 -->
## Linking a private DNS zone to a virtual network

The link is a child resource of the zone: create it from the zone, under **Virtual network links**, or with Azure CLI.

```bash
az network private-dns link vnet create --resource-group RG1 --zone-name corp.contoso.com \
  --name link-vnet1 --virtual-network VNet1 --registration-enabled true
```

- Only one link can exist between a given zone and a given virtual network; link names are unique within the zone.
- The virtual network can be in another region, subscription or tenant: pass its resource ID. You need write permission on the zone (Private DNS Zone Contributor) and on the virtual network.
- The link works once its **Link status** is `Completed`.
- Deleting a virtual network deletes its links and the records it had registered.

When a virtual machine can't resolve a record of a private zone, check three things: its virtual network is linked to the zone, neither the virtual network nor the network interface uses custom DNS servers, and the record exists (a link without autoregistration registers nothing; a deallocated virtual machine has no record).

<!-- section: private-resolver | objectives: 1.2.7 -->
## Azure DNS Private Resolver

DNS Private Resolver replaces DNS forwarder virtual machines. It is created in one virtual network of its region, and a virtual network holds at most one resolver.

| Component | Role | Rules |
| --- | --- | --- |
| Inbound endpoint | A private IP address (static or dynamic) that receives queries from on-premises or other networks and resolves them with Azure DNS, including the private zones linked to the resolver's virtual network | Its own subnet, /28 to /24, delegated to `Microsoft.Network/dnsResolvers`; up to 5 per resolver |
| Outbound endpoint | The exit through which forwarded queries leave toward other DNS servers | Its own delegated subnet; up to 5 per resolver |
| DNS forwarding ruleset | Up to 1,000 rules: a domain name ending with a dot, and up to 6 target servers (IP address and port) | Attached to at most 2 outbound endpoints of one resolver; linked to up to 500 virtual networks of the same region; one ruleset per virtual network |

```text
On-premises client -> on-premises DNS, conditional forwarder for corp.contoso.com
                   -> inbound endpoint 10.10.0.4 -> private zone linked to the hub VNet

Azure VM (default DNS) -> ruleset linked to its VNet, rule "onprem.contoso.com."
                       -> outbound endpoint -> on-premises DNS 192.168.1.10:53
```

Both directions need connectivity between the sites (VPN or ExpressRoute). Rules are matched by the **longest suffix**; the rule `.` is a wildcard, and its target must then resolve public names too. 168.63.129.16 can't be a target.

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

Two designs for a hub-and-spoke network whose private zones are linked to the hub only:

| Design | Spoke configuration | How a spoke resolves the private zone |
| --- | --- | --- |
| Distributed (ruleset links) | Default DNS; the ruleset is linked to each spoke | A rule for the zone forwards to the hub's inbound endpoint. Peering isn't required for the ruleset link to work |
| Centralized (custom DNS) | DNS servers of the spoke = IP address of the hub's inbound endpoint | Every query goes to the inbound endpoint; a ruleset linked to the hub then applies to all of them |

> **Exam trap.** Don't link a ruleset to the virtual network of the inbound endpoint when the ruleset contains a rule that targets this inbound endpoint: queries loop. In the distributed design, the hub is linked to the private zone and the spokes are linked to the ruleset.

<!-- section: key-points -->
## Key points

- Azure-provided DNS resolves host names inside one virtual network only; peering changes nothing.
- Custom DNS servers replace everything: private zones are resolved only if the server forwards to 168.63.129.16 from a linked virtual network. Network interface settings override the virtual network; restart or renew the lease after a change.
- Public zone: create, then delegate with the four Azure name servers. Apex pointing to an Azure resource = alias record set.
- Private zone: global, resolved from linked virtual networks only; one registration zone per virtual network; autoregistration = A records of virtual machines.
- From on-premises to Azure: conditional forwarder to an inbound endpoint. From Azure to on-premises: outbound endpoint, ruleset, rule, ruleset link.
- Ruleset: longest suffix wins, 1,000 rules, 500 links in the same region; resolver subnets are dedicated, delegated, /28 to /24.
