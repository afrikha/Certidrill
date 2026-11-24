SAP network design on Azure is dominated by one constraint: the path between the application servers and the database must be short, direct and predictable. Exam questions combine it with the usual Azure building blocks (subnets, NSGs, routing, private endpoints, DNS, ExpressRoute) and ask which design is supported, or which feature lowers latency without breaking something else.

<!-- section: vnet-subnets | objectives: 2.2.1 -->
## Virtual networks and subnets

The common topology is **hub and spoke**: the hub holds the ExpressRoute or VPN gateway, the firewall, Azure Bastion and shared services; each SAP environment (or the production landscape) is a spoke peered to the hub.

| Requirement | Design |
| --- | --- |
| Separate the application layer from the database layer | Different **subnets of the same virtual network**, or dedicated ASGs in one subnet |
| Application layer and database in different virtual networks | Not supported, even with peering (which such a setup would require); peering also adds transfer cost on terabytes of app-to-DB traffic |
| Azure NetApp Files volumes | A subnet **delegated** to Azure NetApp Files; a `/25` range is recommended for SAP |
| ExpressRoute or VPN gateway | `GatewaySubnet`, `/27` or larger |
| Reserved names | `GatewaySubnet`, `AzureFirewallSubnet`, `AzureFirewallManagementSubnet`, `AzureBastionSubnet` |
| Zonal deployment | One virtual network and its subnets span all zones of the region; no per-zone network needed |

Addressing rules:

- Assign IP addresses **through Azure** (static allocation on the NIC for database and cluster nodes), never statically inside the guest OS. Services such as Azure Backup expect at least the primary NIC to use DHCP from the guest's point of view.
- SAP virtual host names can use **secondary IP configurations**, which must come from the subnet of the NIC and be configured statically in the OS.
- The virtual network of a NIC can't change after the VM is deployed: size subnets with room for growth (ACSS, for example, recommends `/26` rather than `/29`).
- Extra NICs don't add bandwidth. Use several NICs only when a VM must reach several subnets, for example to separate HANA scale-out internode traffic from client traffic.

<!-- section: accelerated-networking | objectives: 2.2.2 -->
## Accelerated Networking

Accelerated Networking (SR-IOV) bypasses the host virtual switch: lower latency, higher packets per second, less jitter and less CPU use. Microsoft expects it on **every NIC of every VM running an SAP workload** where the size allows it.

- Supported on most general purpose and compute-optimized sizes with 2 or more vCPUs (4 or more on sizes with hyperthreading).
- It can't be enabled on a running VM: **stop (deallocate)** the VM, update the NIC, start it again.
- The benefit applies between VMs that both use it in the same virtual network; it has little effect across virtual networks or to on-premises.
- Custom images need drivers that support SR-IOV (Mellanox or MANA).

```bash
az vm deallocate --resource-group RG-SAP-PRD --name sapprdapp01
az network nic update --resource-group RG-SAP-PRD --name sapprdapp01-nic --accelerated-networking true
az vm start --resource-group RG-SAP-PRD --name sapprdapp01
```

> **Exam trap.** Don't measure SAP latency with `ping`: ICMP doesn't take the Accelerated Networking path. SAP's tool is `niping`.

<!-- section: proximity-placement-groups | objectives: 2.2.3 -->
## Proximity placement groups

A proximity placement group (PPG) is a logical construct bound to one region and one resource group. The first VM deployed in it (the **anchor** or scope VM) fixes the datacenter; every later VM is placed close to it. The **intent** option lists the VM sizes you plan to use, so that the PPG is created in a datacenter that offers all of them (capacity isn't checked, so allocation can still fail).

Use a PPG only when needed:

- The application-to-database latency is too high and affects the workload, or you must combine **availability sets with availability zones**.
- One PPG per **SAP system**, never for a whole landscape; keep the number of VM types in it small.
- Constraints: a VM size may not exist in the anchored datacenter, a resize to another family can fail, and hardware decommissioning can move VMs.

Current guidance for zonal systems: deploy across zones with a **flexible virtual machine scale set with `FD=1`**; a zonal deployment alone usually meets the latency need. When availability sets must be used inside zones, create one PPG per zone, anchored by the **ASCS/SCS VM** (the database VMs are no longer in the PPGs):

```powershell
# 1. Anchor VM in zone 1
New-AzVm -ResourceGroupName "rg-sap-prd" -Name "ascs-z1" -Location "westeurope" -Zone "1" `
  -ProximityPlacementGroup "ppg-prd-z1" -Size "Standard_E8s_v4"
# 2. Availability set that references the PPG by its ID
New-AzAvailabilitySet -ResourceGroupName "rg-sap-prd" -Name "avset-app-z1" -Location "westeurope" `
  -ProximityPlacementGroupId $ppg.Id -Sku "aligned" -PlatformUpdateDomainCount 3 -PlatformFaultDomainCount 2
# 3. Application servers in the availability set and the PPG
New-AzVm -ResourceGroupName "rg-sap-prd" -Name "app-z1-01" -Location "westeurope" `
  -AvailabilitySetName "avset-app-z1" -ProximityPlacementGroup "ppg-prd-z1" -Size "Standard_E16s_v4"
```

The Azure NetApp Files **application volume group for SAP HANA** uses availability zone volume placement by default (recommended), which needs no PPG; a PPG anchored to the HANA VMs, ideally with a pinned availability set, is the alternative, for example in regions without zones.

> **Exam trap.** A PPG doesn't give high availability: it only reduces distance, and the disks of application VMs can even end up in another zone than the VMs. Availability comes from zones or availability sets.

<!-- section: latency-design | objectives: 2.2.4 -->
## Designing for SAP latency requirements

Latency between zones varies by region and can't be generalized; Azure gives no guaranteed distance between zones. Before a zonal design:

1. Deploy the database VM size in the three zones with Accelerated Networking, and measure with `niping` (SAP Notes 500235 and 1100926).
2. Choose the **two zones with the lowest latency** that both offer the required VM sizes.
3. Compare in-zone latency with cross-zone latency for the application-to-database path. SAP Note 1100926 classes are rough guidance: more than 0.7 ms doesn't mean the system won't work.
4. Repeat per subscription: the logical-to-physical zone mapping differs between subscriptions.

| Situation | Design |
| --- | --- |
| Cross-zone latency acceptable | **Active/active**: application servers in both zones; logon, RFC and batch server groups keep latency-sensitive work in the zone of the active database |
| Cross-zone latency too high for the application tier | **Active/passive**: application servers in the database's zone; fail back quickly after a zonal failover |
| Lowest possible latency within one zone | PPG for that SAP system |
| Synchronous database replication across zones | Workable: the largest NetWeaver and S/4HANA systems run with cross-zone latency below 1.5 ms |

No network virtual appliance (NVA) may sit between the application layer and the database: NVAs can double latency and aren't supported in that path.

<!-- section: flow-control | objectives: 2.2.5 -->
## Network flow control

Use user-defined routes (UDRs) to send north-south and internet traffic to a hub firewall, while keeping these paths **direct**:

- application servers to database (and HANA internode traffic in scale-out);
- Pacemaker cluster traffic, including the path to SBD iSCSI target servers.

Outbound connectivity is often needed (Azure fence agent, OS repositories, Azure Backup, Azure Site Recovery):

- VMs in the backend pool of an **internal Standard load balancer**, without public IPs, have no outbound internet access.
- For virtual networks created after March 31, 2026, subnets are private by default: default outbound access is disabled for every VM.
- Recommended: an **Azure NAT gateway** on the SAP subnets, with NSGs restricting the destinations. It takes precedence over load balancer outbound rules and instance public IPs. Alternatives: a public Standard load balancer with outbound rules, Azure Firewall, or a proxy.
- With a URL-filtering proxy or firewall, the Azure fence agent needs `https://management.azure.com` and `https://login.microsoftonline.com`.

> **Exam trap.** Routing application-to-database traffic through Azure Firewall or a third-party NVA "for inspection" makes the design unsupported. Filter that path with NSGs and ASGs instead.

<!-- section: network-security | objectives: 2.2.6 -->
## Network security

- **NSGs at subnet level** (NIC-level NSGs only by exception), with **ASGs** grouping application, database and central services VMs so rules stay readable; a NIC can belong to several ASGs.
- **No public IP** on SAP VMs; administrators reach them through **Azure Bastion** or a jump box in the hub.
- **SAProuter** on its own VM with a static IP, open only on TCP 3299 to SAP.
- **Azure Firewall** or a partner firewall in the hub for internet and on-premises traffic.

Ports to allow between tiers (`NN` = instance number):

| Port | Use |
| --- | --- |
| `32NN` | SAP dispatcher (SAP GUI) |
| `33NN` | SAP gateway (RFC) |
| `36NN` | Message server |
| `3NN13`, `3NN15` | HANA SQL ports of the system and tenant database |
| `1128`, `1129` | SAP Host Agent |
| `1433` | SQL Server |
| `3299` | SAProuter |

> **Exam tip.** NSGs and ASGs are supported in the application-to-database path, as long as their rules allow direct communication; NVAs aren't.

<!-- section: storage-endpoints | objectives: 2.2.7 -->
## Service endpoints and private endpoints for Azure Storage

| | Service endpoint | Private endpoint |
| --- | --- | --- |
| How | `Microsoft.Storage` enabled on the subnet, and a network rule on the storage account | A NIC with a private IP from your subnet, mapped to the storage account (subresource `file` or `blob`) |
| Destination address | The storage account's public endpoint | Private IP in your virtual network |
| Reachable from on-premises and peered networks | No (only the enabled subnets) | Yes |
| DNS | No change | Private DNS zone `privatelink.file.core.windows.net` or `privatelink.blob.core.windows.net` |
| Cost | Free | Charged per endpoint and per GB processed |

For SAP:

- **NFS Azure file shares** have no user authentication: clients must connect through a **private endpoint** or a **service endpoint** with virtual network rules; IP rules aren't supported. Microsoft recommends **private endpoints** for every NFS or SMB Azure Files share used by SAP, and disabling public network access.
- With Azure Files ZRS, an NFS client is redirected to a healthy zone if a zone fails, without remounting.
- **Azure NetApp Files** doesn't use service or private endpoints: volumes get IP addresses in the delegated subnet, reachable from the same or peered virtual networks. With Standard network features, the only option for new or modified volumes since July 2026, global peering works too (with peering charges); Basic network features are limited to the region.
- Backups and SAP media in Blob Storage use a blob private endpoint.

<!-- section: name-resolution | objectives: 2.2.8 -->
## Name resolution with Azure DNS

SAP relies on host name resolution between all components, including virtual host names.

| Need | Solution |
| --- | --- |
| Name resolution of VMs inside Azure | Azure private DNS zone linked to the virtual networks, with autoregistration of VM records |
| SAP virtual host names (ASCS, ERS, HANA or SQL cluster) | A records pointing to the **frontend IP of the internal load balancer** |
| Private endpoints | Private DNS zone `privatelink.<service>` linked to the virtual networks; with the recommended zone name, the record is created automatically |
| On-premises clients resolving Azure private zones | Conditional forwarders to an **Azure DNS Private Resolver inbound endpoint** (or to DNS servers in Azure that forward to `168.63.129.16`) |
| Azure VMs resolving on-premises zones | Private Resolver **outbound endpoint** with a forwarding ruleset, or custom DNS servers set on the virtual network |
| Windows systems in an AD DS domain | AD-integrated DNS reachable from the SAP subnets |

Rules:

- On-premises conditional forwarders target the **public** zone (`file.core.windows.net`), not `privatelink.file.core.windows.net`.
- Use one private DNS zone per private endpoint service type; don't mix records of several services in one zone.
- When a resource resolves to a `privatelink` name that your linked Private Link zone has no record for (for example an account whose private endpoint is in another tenant's network), the query returns NXDOMAIN. Enable fallback to internet (`NxDomainRedirect`) on the virtual network link to retry it on the public endpoint; it exists only for Private Link zones.

<!-- section: expressroute | objectives: 2.2.9 -->
## ExpressRoute for hybrid connectivity

Microsoft recommends **ExpressRoute private peering** for production SAP; VPN suits small sites or acts as a backup path for ExpressRoute.

| Gateway SKU | Throughput | FastPath |
| --- | --- | --- |
| Standard / ErGw1AZ | 1 Gbps | No |
| HighPerformance / ErGw2AZ | 2 Gbps | No |
| UltraPerformance / ErGw3AZ | 10 Gbps | Yes |
| ErGwScale | 1 Gbps per scale unit | Yes, from 10 scale units |

The `AZ` SKUs are zone-redundant: use them with zonal SAP systems.

**FastPath** sends traffic from on-premises directly to the VMs, bypassing the gateway on the data path, for lower latency and higher throughput. Limits to know:

- Traffic to **internal load balancers in spoke virtual networks** (SAP cluster frontends), to Azure Firewall or DNS Private Resolver in spokes, and to PaaS services in spokes still goes through the gateway; internal load balancers, Azure Firewall and DNS Private Resolver in the hub work with FastPath.
- Peered spokes over FastPath and UDRs over FastPath require **ExpressRoute Direct**, with all virtual networks in the same region.
- Azure NetApp Files volumes need **Standard network features**.

Resiliency:

- Run both connections of a circuit **active-active**, on different customer devices, and enable **BFD** to detect failures in less than a second.
- A circuit's peering location is a single geography: for disaster recovery, add a **second circuit at another peering location**, or a site-to-site VPN as backup.
- `GatewaySubnet` is `/27` or larger (`/26` for 16 circuits), with no NSG and no UDR for `0.0.0.0/0`.

> **Exam trap.** FastPath doesn't speed up connections from on-premises to an SAP load balancer frontend in a spoke: that traffic still crosses the gateway.

<!-- section: key-points -->
## Key points

- Application and database in different subnets of one virtual network; no NVA between them.
- Accelerated Networking on every SAP VM; enable it on a deallocated VM; measure with `niping`.
- PPG only per SAP system and when needed; zonal systems use flexible scale sets with `FD=1`; with zones plus availability sets, one PPG per zone anchored by the ASCS VM.
- Choose the two lowest-latency zones; active/active preferred.
- Internal Standard load balancer gives no outbound access: add a NAT gateway.
- Private endpoints for Azure Files; Azure NetApp Files uses a delegated subnet.
- Virtual host names resolve to load balancer frontend IPs; Private Resolver for hybrid DNS.
- ExpressRoute with zone-redundant gateways; FastPath needs ErGw3AZ, UltraPerformance or ErGwScale (10+ units) and doesn't apply to traffic to load balancers in spokes.
