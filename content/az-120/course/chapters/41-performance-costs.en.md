An SAP landscape on Azure is never finished: utilization changes, new VM series appear and commitments expire. AZ-120 questions on this objective group describe a symptom (high latency between tiers, a capped disk, an oversized VM, a large HANA database, a high bill) and ask for the tool or the change that fixes it with the least cost or effort.

<!-- section: advisor | objectives: 4.1.1 -->
## Azure Advisor recommendations for SAP

Azure Advisor gives recommendations in five categories: **Cost**, **Security**, **Reliability**, **Operational excellence** and **Performance**. Generic ones apply to SAP VMs like any other (right-size or shut down underutilized VMs, buy reservations or savings plans based on usage history).

SAP-specific recommendations come from **Azure Center for SAP solutions**. When an SAP system is deployed with it or registered in it as a Virtual Instance for SAP solutions (VIS), quality checks run **more than 100 validation checks** on the VIS resources, **every hour**. Each deviation from SAP on Azure best practices becomes an Advisor recommendation for the ASCS, application or database instance, with the action to take.

| Check category | Examples |
| --- | --- |
| Azure infrastructure | Accelerated networking, public IP on SAP NICs, VMs without Azure Backup |
| OS parameters | General OS settings, OS settings for Azure NetApp Files file systems |
| High availability load balancer | HA ports, floating IP, keep-alive with a timeout of 30 minutes maximum |
| HANA database file systems | File system layout of the HANA volumes |
| Pacemaker configuration | HANA and ASCS clusters on SUSE and Red Hat |

The VIS **Quality Insights** workbook (under **Monitoring**) shows three tabs: **Advisor Recommendations**, **Virtual Machine**, **Configuration Checks**. Recommendations refresh hourly, so after a fix you wait for the next run; you can create Advisor alerts on them. Advisor hides recommendations for deleted resources for seven days, so a deleted and re-registered VIS can take up to seven days to show them again.

> **Exam trap.** Advisor doesn't run SAP-specific checks on a plain VM. The prerequisite is a VIS: deploy the system with Azure Center for SAP solutions or register the existing one.

<!-- section: network-performance | objectives: 4.1.2 -->
## Analyzing and optimizing network performance

The round trip between application servers and the DBMS drives SAP response times. The rules:

| Rule | Detail |
| --- | --- |
| No network virtual appliance between application and DBMS | An NVA can double latency, restrict throughput and make Pacemaker clusters fail. NSG and ASG rules are allowed |
| Same virtual network | Splitting application and DBMS layers into peered VNets isn't supported, and peering traffic is billed. Use subnets of one VNet, or ASGs |
| Accelerated networking | On all NICs of all SAP VMs where technically possible |
| More NICs | Doesn't add bandwidth: all NICs of a VM share its network quota |
| NSGs | Don't reduce performance; apply them at subnet level |
| Proximity placement group | Only when default placement doesn't meet the latency need; one SAP system per group |

Measure with SAP **`niping`** (SAP Notes 500235 and 1100926), not `ping`, which doesn't follow the accelerated networking code path. To choose zones, deploy the database VM SKU in all three zones, keep the two zones with the lowest latency, then measure from application VMs. Zone mapping differs per subscription, so measurements are valid only for the subscription used.

Treat the 0.7 ms classification of SAP Note 1100926 as rough guidance, not a support boundary.

> **Exam trap.** Adding a second NIC or a firewall between tiers never improves SAP latency. The fixes are accelerated networking, removing the NVA from the path and, if still needed, a proximity placement group.

<!-- section: reservations-savings | objectives: 4.1.3 -->
## Savings plans or reservations for SAP VMs

| | Azure reservation (Reserved VM Instances) | Azure savings plan for compute |
| --- | --- | --- |
| Commitment | A VM size or instance family in one region | An hourly spend on eligible compute, for example 5 USD per hour |
| Flexibility | That service and region only (instance size flexibility within the family) | Any region and eligible compute service, up to the hourly commitment |
| Term | 1 or 3 years | 1 or 3 years |
| Discount | Deepest when fully used | Lower than reservations |
| Best for | Stable workloads with no change of instance type, family or region | Dynamic or evolving workloads, several families, region moves |
| Cancel or refund | Allowed within 50,000 USD of canceled commitment per rolling 12 months | Not possible |

Mechanics to know:

- When both apply, **reservations are applied first**, then the savings plan. Each savings plan hour is use-it-or-lose-it, applied first to the usage with the largest discount.
- Payment is up front or monthly, same total cost.
- Neither covers software: compute savings plans don't cover software, networking or storage. Windows or SQL Server licenses can be covered with Azure Hybrid Benefit. SUSE and Red Hat software plans can't be exchanged or refunded.
- Reservation exchanges are allowed during a grace period "until further notice". Reservations purchased after February 1, 2027 won't be exchangeable when the service is covered by savings plans. No early termination fee is charged today.
- An underutilized reservation can be traded in for a savings plan.

Recommended sequence: right-size first, exchange or trade in underutilized reservations, then buy reservations for the stable baseline and a savings plan for the variable part.

> **Exam tip.** Production HANA and ASCS VMs that run 24/7 on a fixed size in one region fit a 3-year reservation. Application servers that will move to a new VM series during the term fit a savings plan. For an idle DR region, prefer capacity reservation over a 1-year or 3-year commitment.

<!-- section: resize-vms | objectives: 4.1.4 -->
## Resizing Azure virtual machines

Decide with metrics before resizing:

| Signal | Meaning | Action |
| --- | --- | --- |
| VM Uncached IOPS or Bandwidth Consumed Percentage at 100% | The VM storage limit caps I/O | Larger VM size (or a series with higher limits) |
| Data Disk IOPS or Bandwidth Consumed Percentage at 100% | The disk limit caps I/O | Bigger disk, striping, or Premium SSD v2 settings; not a bigger VM |
| Sustained low CPU and memory | Oversized VM | Smaller certified size (Advisor right-size recommendation) |

Rules for SAP:

- The target size must be supported for SAP (SAP Note 1928533), and for HANA it must be in the SAP HANA hardware directory.
- Resizing restarts the VM. If the new size isn't available on the current hardware cluster, all VMs of the availability set must be shut down and resized.
- You can't resize directly between a series with a temporary disk and one without; Generation 1 VMs can't move to Generation 2-only families such as Mv2.
- Some VM families can't share a proximity placement group, which can block a resize.

```bash
az vm list-vm-resize-options --resource-group rg-sap-prd --name vm-hana01 --output table
az vm resize --resource-group rg-sap-prd --name vm-hana01 --size Standard_M64ds_v2
```

> **Exam trap.** A disk at 100% IOPS consumed while the VM uncached metric is low isn't solved by a bigger VM. Fix the disk.

<!-- section: storage-costs | objectives: 4.1.5 -->
## Optimizing storage costs

| Storage | Cost model and use |
| --- | --- |
| Standard HDD | Only for SAP backups; no active development, QA or production VMs |
| Standard SSD | Minimum for low-demand non-production; 500 IOPS per disk, no IOPS SLA |
| Premium SSD | Billed by size category (513 to 1,024 GiB cost the same); performance tied to size; bursting for disks of 512 GiB or less, up to 30 minutes |
| Premium SSD v2 | Billed per provisioned GiB, includes 3,000 IOPS and 125 MBps; extra IOPS and throughput billed separately and tuned independently; HANA certified without Write Accelerator; best price/performance for SAP |
| Ultra Disk | Capacity, IOPS and throughput billed separately; changed without VM restart; for strongly fluctuating I/O |
| Azure NetApp Files | Capacity pools from 1 TiB in 1 TiB steps; manual QoS decouples throughput from volume size; volumes resized and throughput changed without interruption |

Optimization levers:

- Stripe several smaller Premium SSDs instead of one large disk bought only for throughput: two P15 reach 250 MiB/s for 512 GiB, while a single disk needs a P40 (2 TiB).
- Managed disks can't be reduced in size; changes of size, tier and throughput have cool-down times. Size carefully.
- With ANF manual QoS, give the log volume throughput without paying for unused capacity.
- Disk snapshots used by Azure Backup are incremental and stored on Standard HDD.
- The SAP LaMa connector option **Change Storage Type to save costs** switches the disks of stopped systems to Standard storage.

> **Exam trap.** Write Accelerator is for M-series log volumes on Premium SSD. It isn't supported on Premium SSD v2 or Ultra Disk, and those don't need it.

<!-- section: archiving | objectives: 4.1.6 -->
## Optimizing data performance with archiving

HANA cost is driven by memory. Moving data out of memory reduces VM size, disk size and backup time.

| Data temperature | Location | Options |
| --- | --- | --- |
| Hot | In memory | Standard HANA |
| Warm | HANA storage tier | Native Storage Extension (NSE); extension node; dynamic tiering for native HANA |
| Cold | Low-cost storage | SAP IQ (NLS for BW, data aging); SAP Data Intelligence with Azure Data Lake Storage; data archiving to an ILM store |

| Option | Key facts |
| --- | --- |
| NSE | HANA 2.0 SPS 04 or later, any HANA-certified VM, buffer cache 10% of HANA memory by default, reversible, doesn't reduce disk size |
| Extension node | BW on HANA, BW/4HANA, native HANA; requires scale-out; no extra license; no shared OS, network or disk with standard nodes |
| SAP ILM store on Azure Blob | Archive files and attachments from S/4HANA in Blob Storage |

Configure the ILM store's storage account as Learn describes: register an application in Microsoft Entra ID with a client secret, assign it **Storage Blob Data Contributor** on the account (and nobody else), enable secure transfer, disable blob public access and storage account key access, minimum TLS 1.2.

Archiving is irreversible business data removal from the database; NSE only displaces data. Start with data characterization, then pick the option by SAP product: S/4HANA uses NSE (warm) and SAP IQ (cold); BW adds extension nodes and NLS.

> **Exam tip.** "Reduce the memory footprint of S/4HANA without deleting data" points to NSE. "Reduce database size and keep archive files for compliance" points to data archiving into an ILM store on Azure Blob.

<!-- section: app-db-optimization | objectives: 4.1.7 -->
## Optimizing SAP application servers and databases

Application tier:

- Scale out with more, smaller application server VMs rather than one large VM; distribute users with logon groups (transaction SMLG).
- Stop non-production systems outside working hours with Azure Center for SAP solutions and deallocate the VMs, so compute isn't billed.
- Use a soft stop so that load-balanced RFC and HTTP calls drain before the instance stops.

```bash
az workloads sap-virtual-instance stop --resource-group rg-sap-qas --name QAS \
  --soft-stop-timeout-seconds 300 --deallocate-vm true
az workloads sap-virtual-instance start --resource-group rg-sap-qas --name QAS --start-vm true
```

Database tier:

| Lever | Effect |
| --- | --- |
| Right-sized certified VM | Match memory to the HANA sizing after archiving or NSE |
| Premium SSD v2 or ANF manual QoS | Pay for the IOPS and throughput the database needs, not for capacity |
| Write Accelerator on M-series log disks | Meets HANA log latency on Premium SSD |
| Cost-optimized DR | A smaller DR VM hosting QA, without data preload, resized at failover |
| Azure Hybrid Benefit | Reuses Windows Server and SQL Server licenses |
| Commitments | Reservations for stable database VMs, savings plan for changing application tiers |

> **Exam trap.** Stopping SAP from Azure Center for SAP solutions doesn't stop billing unless the VMs are deallocated. Without `--deallocate-vm`, only the SAP application stops.

<!-- section: key-points -->
## Key points

- SAP-specific Advisor recommendations require a VIS; checks run hourly.
- Direct path between application and DBMS: no NVA, same VNet, accelerated networking; measure with `niping`.
- Reservations for stable sizes and regions, savings plans for change; reservations apply first; savings plans can't be refunded.
- Read VM and disk consumed-percentage metrics before resizing; target sizes must be SAP-certified.
- Premium SSD v2 for price/performance; disks can't shrink; Write Accelerator only for M-series on Premium SSD.
- NSE displaces warm data; archiving to an ILM store removes cold data.
