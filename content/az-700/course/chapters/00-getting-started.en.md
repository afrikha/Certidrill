AZ-700 checks that you can design, implement and troubleshoot Azure networking: addressing and name resolution, routing, hybrid connectivity, application delivery, private access to platform services and network security. This course follows the official study guide objective by objective; each section names the objectives it prepares.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | Microsoft Certified: Azure Network Engineer Associate (intermediate level) |
| Duration | 100 minutes of exam time |
| Questions | Not published; about 40 to 60 in practice |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The five domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Design and implement core networking infrastructure | 25 to 30 % |
| Design, implement, and manage connectivity services | 20 to 25 % |
| Design and implement application delivery services | 15 to 20 % |
| Design and implement private access to Azure services | 10 to 15 % |
| Design and implement Azure network security services | 15 to 20 % |

The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop, ordered steps) give one point per correct element.

An exam is made of sections:

- **Case study.** A company description (existing environment, planned changes, technical requirements) followed by several questions. Once you leave the case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final. Several solutions can be right, or none.
- **Main section.** Independent questions that you can flag and review until you submit: one answer among four, "select two" or "select three", three Yes/No statements about a topology, drop-down lists that complete a configuration or a command, drag and drop, and steps to put in order.

> **Exam tip.** Microsoft Learn is available, but searching costs time. Use it for a precise value that escapes you (a subnet size, a SKU limit), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

Half of the questions ask which service, SKU or topology meets a set of requirements; the other half ask what to configure, and in which order. Stems are medium to long: the environment is given as tables (virtual networks and address spaces, subnets, peerings, route tables, NSG rules, gateways) or as an exhibit, followed by a precise need ("You need to ensure that VM1 can...").

Work in three steps:

1. Sketch the topology: virtual networks, address ranges, peerings and their options, gateways, where the route tables and NSGs are associated.
2. Follow the packet or the DNS query hop by hop. Most wrong answers fix a hop that isn't broken.
3. Find the constraint that separates the two plausible answers.

| Words in the stem | Think of |
| --- | --- |
| "minimize costs" | The lowest SKU or the simplest service that still meets every requirement |
| "minimize administrative effort" | The managed service rather than virtual machines you maintain (Azure DNS Private Resolver rather than DNS servers, Azure NAT Gateway rather than a NAT appliance) |
| "must not traverse the internet", "by using a private IP address" | Private endpoint; ExpressRoute private peering for on-premises |
| "from the on-premises network", "by name" | A DNS path: conditional forwarder, inbound endpoint, private DNS zone link |
| "the same outbound IP addresses", "allowlist of a partner" | NAT gateway with a public IP address or a public IP prefix |
| "HTTP", "URL path", "host header", "TLS termination", "cookie" | Layer 7: Application Gateway (regional) or Azure Front Door (global) |
| "TCP or UDP", "any port", "non-HTTP" | Layer 4: Azure Load Balancer |
| "filter outbound traffic by FQDN", "inspect" | Azure Firewall, with a route that sends the traffic to it |
| "all virtual networks, present and future" | Azure Virtual Network Manager, with a network group whose membership is dynamic |

Commands are read, rarely written: you complete an Azure CLI or Azure PowerShell command with a drop-down list. Know the nouns (`az network vnet subnet`, `az network private-dns link vnet`, `New-AzVirtualNetworkGatewayConnection`) more than every parameter.

<!-- section: core-rules -->
## Rules that decide many answers

These rules come back in every domain. Each one is detailed in its chapter.

1. **Address spaces of connected networks can't overlap.** This applies to peered virtual networks and to on-premises networks reached through a gateway.
2. **Azure reserves five addresses in every subnet**: the first four and the last one. A /29 subnet leaves 3 usable addresses.
3. **Virtual network peering isn't transitive.** If A is peered with B and B with C, A doesn't reach C without another peering, or a router in B plus routes.
4. **Route selection**: the route with the longest matching prefix wins. For the same prefix, a user-defined route wins over a BGP route, which wins over a system route.
5. **NSG rules** are processed by priority, lowest number first, and the first match ends the evaluation. Inbound traffic meets the subnet's NSG, then the network interface's NSG; outbound traffic meets them in the reverse order. Both must allow the flow.
6. **Custom DNS servers set on a virtual network replace the Azure-provided DNS.** The private DNS zones linked to that virtual network are then resolved only if the custom server forwards the queries to 168.63.129.16.
7. **Basic SKU public IP addresses and load balancers are retired.** A Standard public IP address is static and closed to inbound traffic until an NSG allows it.

> **Exam trap.** A service is rarely wrong in itself: it is wrong for the layer, the scope or the direction of the traffic. Before you answer, name the three: layer 4 or layer 7, regional or global, inbound or outbound.

<!-- section: confusing-pairs -->
## Services that are easy to confuse

| Don't confuse | With | Difference |
| --- | --- | --- |
| Service endpoint | Private endpoint | A service endpoint gives a subnet an optimized route to the public endpoint of a service and lets the service recognize the subnet; it can't be used from on-premises. A private endpoint is a network interface with a private IP address in your virtual network, reachable from peered and on-premises networks, and it needs DNS records |
| Private endpoint | Private Link service | The private endpoint is the consumer side. A Private Link service is the provider side: your own service, behind a Standard load balancer, offered to consumers |
| Azure Load Balancer | Application Gateway | Load Balancer distributes TCP and UDP flows (layer 4). Application Gateway is a regional HTTP and HTTPS proxy (layer 7): URL routing, TLS termination, web application firewall |
| Application Gateway | Azure Front Door | Application Gateway lives in a subnet of one region. Front Door is a global entry point at the Microsoft edge, in front of origins in several regions |
| Azure Front Door | Traffic Manager | Front Door proxies HTTP and HTTPS traffic. Traffic Manager only answers DNS queries: it works for any protocol, and the traffic never flows through it |
| NSG | Azure Firewall | An NSG filters by IP address, port and protocol on a subnet or a network interface. Azure Firewall is a central, managed firewall (FQDN filtering, threat intelligence) that traffic reaches through routes |
| NSG rule | Security admin rule | Security admin rules of Azure Virtual Network Manager are applied centrally to many virtual networks and are evaluated before NSG rules |
| Application security group | Service tag | An ASG groups your own network interfaces. A service tag is a set of IP prefixes of an Azure service, maintained by Microsoft |
| VPN Gateway | ExpressRoute | VPN Gateway builds encrypted tunnels over the internet. ExpressRoute is a private circuit through a connectivity provider, not encrypted by default |
| Site-to-site VPN | Point-to-site VPN | Site-to-site connects a whole network through an on-premises VPN device. Point-to-site connects individual client computers |
| Private DNS zone | Azure DNS Private Resolver | A private zone hosts records for the virtual networks linked to it. The resolver forwards queries between Azure and other networks through inbound and outbound endpoints |
| NAT gateway | Load balancer outbound rule | A NAT gateway provides outbound connectivity to whole subnets and takes precedence. An outbound rule provides it to the backend pool of a Standard public load balancer |
| Azure Route Server | User-defined route | Route Server exchanges routes with network virtual appliances over BGP; it doesn't forward data traffic. A user-defined route is static |
| Public IP prefix | Custom IP prefix | A public IP prefix is a contiguous range owned by Microsoft. A custom IP prefix is a range you own and bring to Azure |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: routing, private access and security all build on addressing and name resolution.
2. Reproduce the main topologies in a pay-as-you-go subscription: a hub and two spokes with peerings, a route table that points to a virtual appliance, a private DNS zone, a private endpoint. Gateways and firewalls are billed by the hour: delete the resource group at the end of each session.
3. For each topology, read the **effective routes** and the **effective security rules** of a network interface until you can predict them before you open the page.
4. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
5. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
