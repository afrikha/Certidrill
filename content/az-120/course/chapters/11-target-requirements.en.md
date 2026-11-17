Before anything is deployed, an SAP migration to Azure is a list of decisions: target size, supported combination, compute, storage and network, subscriptions and quotas, licenses, cost, support contract, and the migration path and tools. Questions give a source landscape and a constraint (SAPS, memory, downtime, OS, database, budget) and ask which option fits.

<!-- section: sizing | objectives: 1.1.1 -->
## Estimating the target size

SAP sizing is expressed in **SAPS** (SAP Application Performance Standard), the unit of the SAP Standard Application Benchmarks. Certified Azure VMs have a published SAPS value and don't over-provision CPU or memory.

| Situation | Sizing source |
| --- | --- |
| New system (greenfield) | An **SAP Quick Sizer** project based on business document volumes; its output is then mapped to Azure compute, storage and network |
| Existing system (brownfield) | The current workload: SAP EarlyWatch Alert and DBMS workload reports, CPU, IOPS and throughput measurements, SAPS of the current hardware from SAP benchmarks |
| Neither is reliable | A proof of concept on Azure |
| Guided S/4HANA deployment | Azure Center for SAP solutions proposes VM sizes from the SAPS and memory you enter |

1. Start with memory and CPU, and split the SAPS into a **database** part and an **application** part.
2. Size the **database VM first**: the database layer doesn't scale out, the application layer adds application servers.
3. For SAP HANA, memory is the leading dimension.
4. Measure source DBMS IOPS and throughput to size storage, not only capacity.
5. Map the result to a VM: SAPS per VM size come from **SAP Note 1928533**; HANA VM sizes from the **SAP HANA hardware directory** (Certified IaaS Platforms).

> **Exam trap.** VM SAPS are published by SAP in SAP Note 1928533, not in Azure documentation. A size missing from that note isn't supported for SAP, whatever its vCPU and memory.

<!-- section: supported-scenarios | objectives: 1.1.2 -->
## Supported scenarios

Microsoft supports only the SAP architectures it documents, with SAP Note 1928533 (products, VM types, minimum OS and DBMS releases); the **SAP Product Availability Matrix (PAM)** confirms the OS and DBMS of an SAP release. Azure is x86-64 only: AIX, HP-UX, Solaris, IBM i or mainframe workloads move to Windows Server, SUSE, Red Hat or Oracle Linux.

| Scenario | Status |
| --- | --- |
| 2-tier (DBMS and application on one VM) | Supported; no HA failover cluster in this layout; cap DBMS and SAP memory |
| 3-tier (application and DBMS on separate VMs) | Supported for SQL Server, Oracle, Db2, SAP HANA, MaxDB and SAP ASE on Windows, SUSE, Red Hat and Oracle Linux |
| Several DBMS instances on one VM (including HANA MCOS) | Supported with memory caps and separate disks; never in HA clusters |
| HANA scale-out | Only on VMs marked for clustering in the HANA hardware directory; with a standby node, only NFS on Azure NetApp Files |
| Disaster recovery | Another Azure region; DBMS-native **asynchronous** replication for the database, Azure Site Recovery possible for the application layer only |
| Oracle | Guest OS Windows or Oracle Linux only; Oracle RAC not supported |
| HANA Large Instances | Sunset: no new customers; use HANA-certified VMs |
| Azure VMware Solution | Generally not supported by SAP for SAP workloads |

Explicitly **not supported**:

- Application and DBMS tiers in different regions, split between on-premises and Azure, or across two cloud providers.
- A network virtual appliance in the path between the application servers and the DBMS.
- SMB shares for DBMS files; NFS for DBMS files except NFS 4.1 on Azure NetApp Files for SAP HANA, Oracle on Oracle Linux and Db2 on SUSE or Red Hat.
- Azure Site Recovery for DBMS VMs.
- Pacemaker on Oracle Linux; other HA frameworks than Pacemaker and Windows Server Failover Clustering need their vendor's support.
- Microsoft Entra ID as the domain of SAP NetWeaver or S/4HANA on Windows: use Active Directory Domain Services (Microsoft Entra accounts remain usable for single sign-on).

> **Exam trap.** "Azure Site Recovery for the whole SAP system" is wrong once the database VM is included: Site Recovery protects application servers; the database uses its own asynchronous replication.

<!-- section: compute-storage-network | objectives: 1.1.3 -->
## Compute, storage and network requirements

**Compute.** Production SAP HANA runs only on VMs of the HANA hardware directory; non-production HANA can use the VM types of SAP Note 1928533. M-series and Mv2-series need more recent minimum OS releases. The temporary disk holds only expendable data; you can't resize directly between families with and without a temporary disk, nor convert generation 1 to generation 2.

**Storage.** The summary of Microsoft's storage matrix:

| Use | Recommended | Not supported |
| --- | --- | --- |
| OS disk | Premium SSD (Standard SSD for non-production only) | Standard HDD |
| /hana/data, /hana/log | Premium SSD, Premium SSD v2, Ultra Disk, Azure NetApp Files | Standard HDD, Standard SSD, Azure Files |
| /sapmnt, global transport directory | Azure Files SSD (NFS or SMB), Azure NetApp Files, managed disks | Azure Files HDD |
| Non-HANA DBMS data and log | Premium SSD, Premium SSD v2, Ultra Disk | Standard HDD in any case, Standard SSD for production |

- Premium SSD for `/hana/log` on M-series and Mv2-series requires **Write Accelerator**; Premium SSD v2 and Ultra Disk meet the HANA latency targets without it and don't support it.
- Premium SSD v2 and Ultra Disk can't be used with VMs in availability sets.
- Database files use **LRS** managed disks only; zone or geo redundancy of disks isn't a resilience method for a DBMS.

**Network.**

- Application and database VMs in the **same virtual network**, in different subnets. Separating them into peered virtual networks isn't supported.
- No network virtual appliance between application and database: it can double the latency.
- **Accelerated Networking** on every NIC of every SAP VM where technically possible.
- Standard SKU load balancers; the Basic load balancer must not be used.
- Latency between application and database is classified with SAP Note 1100926. In most regions a zonal deployment meets it; a **proximity placement group** is used only when measured latency is too high, for a single SAP system.

<!-- section: subscriptions-quotas | objectives: 1.1.4 -->
## Subscription models and quota limits

Standard vCPU quotas apply **per subscription and per region** at two levels: total regional vCPUs and VM-family vCPUs (for example M-series). Raising a family quota raises the regional limit by the same amount, in that region only. Spot quotas are separate.

| Need | Action |
| --- | --- |
| Deploy M-series VMs in a new subscription | Request a family quota increase in the region (portal **Quotas** > Compute > New Quota Request, or a support request if not fulfilled automatically) |
| Guarantee that the capacity exists, for example for DR | **On-demand capacity reservation** for a VM size in a region or zone, billed at the pay-as-you-go rate whether used or not |
| Lower the price of capacity that runs continuously | Reservations or savings plans: discounts only, no capacity guarantee |

```bash
# Current vCPU usage and limits per family in a region
az vm list-usage --location westeurope --output table
```

Quota is permission to deploy; capacity is hardware. Capacity reservations don't support availability sets, proximity placement groups or Ultra Disk, nor M-series v1, Msv3 High Memory and Mdsv3 High Memory or Very High Memory sizes, and Free Trial or Azure for Students subscriptions aren't eligible.

Other limits: 980 resource groups per subscription, and per-VM limits on data disks and disk and network throughput. Separate subscriptions (production, non-production, hub) give separate quota pools and policy and access boundaries.

> **Exam trap.** A reservation or savings plan neither raises a quota nor guarantees capacity: a quota request raises the limit, a capacity reservation guarantees the hardware.

<!-- section: licensing | objectives: 1.1.5 -->
## Software licensing

| Software | How it is licensed on Azure |
| --- | --- |
| SAP applications and SAP HANA | Licenses procured from SAP by the customer (SAP Note 1380654); Azure doesn't sell them |
| SUSE / Red Hat | Marketplace **pay-as-you-go** images (SUSE Linux Enterprise Server for SAP Applications, RHEL for SAP) include the subscription in the VM price; **BYOS** uses your own subscription |
| Windows Server, SQL Server | License included in the VM price, or **Azure Hybrid Benefit** with eligible licenses |
| Oracle Database | Bring your own Oracle license; Windows or Oracle Linux guest only |
| Third-party HA software (SIOS) | Licensed and supported by the vendor |

**Azure Hybrid Benefit for Linux** switches a RHEL or SLES VM between pay-as-you-go and BYOS without redeployment: `RHEL_BYOS` or `SLES_BYOS` for BYOS, `NONE` to return to the image's billing (pay-as-you-go SAP offers show as `SLES_SAP`, `RHEL_SAPAPPS`, `RHEL_SAPHA`). Red Hat requires enrollment in **Red Hat Cloud Access** first.

```bash
az vm update --resource-group rg-sap-prd --name vm-hana01 --license-type SLES_BYOS
```

For Linux, SAP's support requirements for the distribution also apply.

<!-- section: cost-implications | objectives: 1.1.6 -->
## Cost implications

| Cost driver | What decides it |
| --- | --- |
| VM compute | Size and hours; pay-as-you-go, reservation or savings plan (1 or 3 years); deallocated VMs stop compute billing |
| Managed disks | Provisioned size; Premium SSD v2 and Ultra Disk also bill provisioned IOPS and throughput |
| Azure NetApp Files | Provisioned capacity pool size and service level, not the data actually stored |
| Network | Peering charges, outbound data transfer, ExpressRoute |
| HA and DR | A second VM per clustered layer; a DR database VM; capacity reservations |

| Requirement | Choice |
| --- | --- |
| Stable production VMs, same size and region for years | Reservations: the greatest savings when fully used |
| Sizes, families or regions expected to change | Savings plan: an hourly commitment applied across regions and compute services |
| Non-production used only in office hours | Stop and deallocate on a schedule (Azure Center for SAP solutions can start and stop registered systems) |

> **Exam trap.** A stopped VM that isn't deallocated is still billed for compute, and shrinking Azure NetApp Files volumes without resizing the capacity pool saves nothing.

<!-- section: support-plan | objectives: 1.1.7 -->
## Azure support plan

SAP Note 2015553 (SAP on Azure: support prerequisites) defines the Microsoft support contract required to run SAP on Azure VMs:

- **Professional Direct** is the minimum, for support on Azure itself.
- **Microsoft Unified** (successor of Premier Support) is recommended for SAP on Windows Server and/or SQL Server, since it also covers those products.

| Plan | Scope | Fastest initial response |
| --- | --- | --- |
| Basic | Included for all customers; no technical support | None |
| Developer | Trial and non-production | 8 business hours |
| Standard | Production workloads | 1 hour (severity A) |
| Professional Direct | Business-critical use of Azure | 1 hour (severity A) |
| Unified Enterprise | Mission-critical dependence on Azure and other Microsoft products | 15 minutes for Azure (severity 1) |

Also required for support: the **Azure VM extension for SAP solutions** on every SAP VM, and SAProuter connectivity. SAP incidents use components `BC-OP-NT-AZR` (Windows) or `BC-OP-LNX-AZR` (Linux).

> **Exam trap.** Standard support covers production, but it doesn't meet SAP Note 2015553: the lowest acceptable plan for SAP on Azure is Professional Direct.

<!-- section: migration-approaches | objectives: 1.1.8 -->
## Lift and shift, lift-shift-migrate, lift-shift-migrate to HANA

| Approach | What changes | Typical method | Choose it when |
| --- | --- | --- | --- |
| Lift and shift | Nothing but the platform: same OS family, same DBMS | Homogeneous system copy: backup and restore, or DBMS replication (Data Guard, Always On, HANA System Replication) | OS and DBMS are already supported on Azure; lowest risk |
| Lift-shift-migrate | OS and/or DBMS change (for example AIX with Db2 to Windows with SQL Server) | Heterogeneous system copy with SWPM (R3load export and import) | The source platform isn't available on Azure (non-x86, unsupported DBMS) |
| Lift-shift-migrate to HANA | The database becomes SAP HANA, often with an SAP upgrade | SUM with the Database Migration Option (DMO), or DMO with System Move | The move to Azure is combined with the move to HANA or the path to S/4HANA |

A **two-step** migration does a lift and shift, tests, then runs DMO to HANA on Azure: two downtimes and two test cycles. A **one-step** migration (DMO with System Move) migrates, upgrades and moves in one downtime.

> **Exam tip.** "Keep the current database and OS" means lift and shift; "the current platform isn't supported in Azure" means lift-shift-migrate; "migrate to SAP HANA" points to DMO.

<!-- section: migration-tools | objectives: 1.1.9 -->
## Migration strategy and tools

**Order.** Move sandbox and low-risk systems first, production ERP last; tightly coupled systems (ERP and GTS, for example) together; new systems start in Azure.

| Tool or method | Use it for |
| --- | --- |
| SWPM homogeneous system copy | Same OS family and DBMS: backup and restore, DBMS replication or log shipping |
| SWPM heterogeneous copy (R3load, Migration Monitor, table splitting) | OS/DB migration to any target DBMS, with fine control of downtime |
| SUM DMO | SAP upgrade plus migration to SAP HANA in one step, with built-in checks |
| DMO with System Move | DMO from on-premises to Azure: export on premises, transfer, import on Azure; parallel transfer mode (`dmotocloud.sh`) shortens downtime compared with sequential mode |
| Downtime-optimized DMO | Large tables moved during uptime with SLT; SAP-delivered service; not combinable with DMO with System Move |
| AzCopy | Copy export dumps to Azure, often faster over the internet than ExpressRoute for very large databases |
| Azure Site Recovery | Application layer DR; never the database VMs |

Very large databases (over 20 TB) need dedicated export and import servers and measured table splitting; plan about 2 TB per hour for a heterogeneous migration.

> **Exam trap.** DMO targets SAP HANA only. A stem that changes the OS and moves to SQL Server, Oracle or Db2 needs a classical heterogeneous system copy with SWPM, not DMO.

<!-- section: key-points -->
## Key points

- Size the database VM first; SAPS per VM come from SAP Note 1928533, production HANA sizes from the HANA hardware directory.
- One region and one virtual network for application and database, no NVA between them; Write Accelerator only for Premium SSD log volumes on M-series.
- Quota allows a deployment, a capacity reservation guarantees hardware, a reservation or savings plan only lowers the price.
- The minimum support plan for SAP on Azure is Professional Direct (SAP Note 2015553).
- Same platform: lift and shift with a homogeneous copy; new OS or DBMS: SWPM heterogeneous copy; to HANA: DMO, with System Move for one-step migration to Azure.
