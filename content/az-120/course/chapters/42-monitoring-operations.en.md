Running SAP on Azure means watching three things at once: the Azure infrastructure (VMs, disks, network, load balancers), the SAP and database layers, and the operational tasks (backups, start and stop, system copies). AZ-120 questions ask which tool collects which data, what must be installed or configured first, and which Azure service performs an operational task.

<!-- section: vm-monitoring | objectives: 4.2.1 -->
## Monitoring Azure virtual machines

| Need | Tool |
| --- | --- |
| Host metrics (CPU, disk, network) with no agent | Azure Monitor platform metrics, Metrics Explorer, metric alerts |
| Guest OS performance counters and logs | Azure Monitor Agent with a data collection rule (DCR), sent to a Log Analytics workspace |
| Curated VM performance views | VM Insights (uses the Azure Monitor Agent) |
| Azure-side health events | Resource Health, Service Health, activity log alerts |
| Infrastructure data for SAP support | Azure VM extension for SAP solutions |
| SAP, HANA and cluster telemetry | Azure Monitor for SAP solutions (see below) |

The **Azure VM extension for SAP solutions** is required for SAP to support your environment: the SAP Host Agent reads Azure infrastructure metrics from it (SAP Note 2178632 lists them; SAP Note 2191498 gives the Host Agent version for Linux). Support for the extension goes through SAP support channels.

| | Standard version | New version |
| --- | --- | --- |
| When | Default | Install via Terraform, ARM or other non-CLI/PowerShell means; SLES 15+, RHEL 8.1+, Oracle Linux 8.1+; Ultra Disk or Standard managed disks; on request of Microsoft or SAP Support |
| Requirements | Azure VM Agent; installed with Azure CLI or PowerShell | Managed identity with **Reader** on the VM's resource group or its NICs and disks; outbound access to `management.azure.com`; SAP Host Agent 7.21 PL 47 or later |

Uninstall the extension before switching versions, and restart the SAP Host Agent after installation.

```powershell
Set-AzVMAEMExtension -ResourceGroupName rg-sap-prd -VMName vm-hana01 -InstallNewExtension
Test-AzVMAEMExtension -ResourceGroupName rg-sap-prd -VMName vm-hana01
```

Every health check result must be **OK**. Inside the VM, `http://127.0.0.1:11812/azure4sap/metrics` shows the **Provider Health Description**.

> **Exam trap.** Azure Monitor for SAP solutions doesn't replace the Azure VM extension for SAP solutions. The extension is the SAP support prerequisite; Azure Monitor for SAP solutions is optional telemetry.

<!-- section: ha-monitoring | objectives: 4.2.2 -->
## Monitoring high availability

| Component | What to watch | How |
| --- | --- | --- |
| Standard Load Balancer of ASCS or HANA cluster | Health probe status per backend, data path availability | Load balancer metrics and metric alerts |
| Load balancer configuration | HA ports, floating IP, keep-alive settings | Quality Insights **Configuration Checks** of the VIS |
| Pacemaker cluster | Node, resource and SBD status, location constraints, quorum votes, ring status | Azure Monitor for SAP solutions, HA Pacemaker cluster provider |
| HANA System Replication | Replication status | Azure Monitor for SAP solutions, SAP HANA provider |
| VMs of the cluster | Availability, unplanned maintenance | Resource Health, VM availability metric |

The Pacemaker provider needs an agent on **every** cluster node and one provider per node:

| | SUSE | Red Hat |
| --- | --- | --- |
| Agent | `prometheus-ha_cluster_exporter` (SLES for SAP 12 SP3 and later) | Performance Co-Pilot with `pcp-pmda-hacluster` (RHEL 8.2, 8.4 and later) |
| Endpoint | `http://<IP>:9664/metrics` | `http://<IP>:44322/metrics?names=ha_cluster` |

```bash
sudo zypper install prometheus-ha_cluster_exporter
sudo systemctl start prometheus-ha_cluster_exporter
sudo systemctl enable prometheus-ha_cluster_exporter
```

> **Exam tip.** A load balancer probe that turns unhealthy on one node shows which node owns the virtual IP. The Pacemaker provider explains why: resource or fencing status.

<!-- section: storage-monitoring | objectives: 4.2.3 -->
## Monitoring storage

Azure Monitor disk metrics separate the two possible bottlenecks:

| Metric | 100% means |
| --- | --- |
| Data Disk IOPS Consumed Percentage, Data Disk Bandwidth Consumed Percentage | The disk's own limit caps I/O |
| VM Cached / Uncached IOPS Consumed Percentage, VM Cached / Uncached Bandwidth Consumed Percentage | The VM's storage limit caps I/O, even if disks are below their limits |
| Data Disk Latency, Data Disk Queue Depth | Response time and queuing (latency only for SCSI disks, not NVMe) |
| Data Disk Used Burst IO / BPS Credits Percentage | Consumption of Premium SSD burst credits |

The consumed-percentage metrics exist only on VM series that support premium storage. For HANA, alert on `/hana/log` latency and on capacity of `/hana/data` and `/hana/shared`.

Other sources:

- Azure NetApp Files volumes and capacity pools have their own metrics (consumed size, latency, throughput) in Azure Monitor.
- Azure Monitor for SAP solutions adds OS block device latency and file system usage (Linux provider) and HANA disk use, database growth and backups (HANA provider).

> **Exam trap.** A VM-level consumed percentage at 100% isn't fixed by adding disks: the VM limit is reached. Resize the VM.

<!-- section: network-monitoring | objectives: 4.2.4 -->
## Monitoring networking

| Network Watcher tool | Use for SAP |
| --- | --- |
| Connection monitor | Continuous latency and reachability between application servers, database and on-premises |
| Connection troubleshoot | Point-in-time test from a VM to a host and port, for example the HANA SQL port |
| IP flow verify | Is a packet allowed or denied at a VM NIC, and by which rule |
| NSG diagnostics | Same check at VM, scale set or Application Gateway level |
| Next hop | Routing problems, for example traffic sent through an NVA between tiers |
| Effective security rules | Rules applied to a NIC |
| Packet capture, VPN troubleshoot, Topology | Remote capture on a VM, gateway diagnosis, visual layout |

Flow logs: **NSG flow logs retire on September 30, 2027** and no longer accept new creations; use **virtual network flow logs**, analyzed with **traffic analytics**. Azure Monitor also gives metrics for ExpressRoute circuits, VPN gateways and load balancers.

For SAP latency itself, measure with `niping` with accelerated networking enabled; `ping` doesn't use the accelerated path.

> **Exam tip.** "Users report a timeout to the message server after an NSG change" points to IP flow verify or NSG diagnostics. "Track latency between tiers over time" points to Connection monitor.

<!-- section: ams-config | objectives: 4.2.5 -->
## Configuring Azure Monitor for SAP solutions

Azure Monitor for SAP solutions collects SAP, database, cluster and OS telemetry and sends it as custom logs to Azure Monitor Logs. It doesn't collect Azure Monitor metrics, resource logs or activity logs. There's no license fee; you pay for the managed components and Log Analytics.

Architecture: the resource plus a **managed resource group** containing an **Azure Functions** resource (monitoring code), a **Key Vault** (credentials, provider information), a **storage account** and a **Log Analytics workspace** (new, or an existing one in the same subscription). Visualization uses workbooks (refresh every 30 minutes at most) and KQL. One resource can monitor several SIDs in a virtual network.

Creation prerequisites:

- A subnet of **IPv4 /25 or larger**, delegated to **Microsoft.Web/serverFarms**, in a VNet connected to the SAP VNet.
- Workload region equal to the VNet region.
- Managed resource group name chosen at creation; it can't be changed later.

| Provider | Prerequisites |
| --- | --- |
| SAP NetWeaver | Unprotect SAP Control web methods with `service/protectedwebmethods`, restart `sapstartsrv` on each instance, open ports 5XX13 and 5XX14. For SOAP+RFC (ABAP only): role `Z_AMS_NETWEAVER_MONITORING`, RFC user, SICF services `wsdl`, `wsdl11`, `RFC` |
| SAP HANA | HANA 2.0 SP6 or later; connect to SYSTEMDB; user with MONITORING or BACKUP CATALOG READ; password inline or in Key Vault |
| OS (Linux) | Prometheus node exporter on each host, port 9100, private IP in the same VNet, NSG inbound from VirtualNetwork |
| HA Pacemaker cluster | Cluster exporter or PCP on each node (previous section) |
| Microsoft SQL Server, IBM Db2 | Database user and network access |

```text
service/protectedwebmethods = SDEFAULT -GetQueueStatistic -ABAPGetWPTable -EnqGetStatistic -GetProcessList -GetEnvironment -ABAPGetSystemWPTable
```

> **Exam trap.** Empty NetWeaver workbooks mean the SAP Control web methods are still protected or `sapstartsrv` wasn't restarted; a full SAP restart isn't required.

<!-- section: backup-management | objectives: 4.2.6 -->
## Managing backups with Azure Backup

**Resiliency** (which extends the former Azure Business Continuity Center) is the single place to manage backup and replication across vaults, subscriptions and regions: protection gaps, jobs, alerts, metrics, reports and protection policies. Day-to-day tasks:

| Task | How |
| --- | --- |
| Check status | Backup item health: Healthy, Unhealthy, NotReachable, IRPending |
| Alerts | Azure Monitor based alerts for job failures, routed with action groups |
| Reports | Backup reports, from vault diagnostic settings sent to a Log Analytics workspace |
| On-demand backup | Full, differential, incremental or log for HANA; one scheduled plus three on-demand fulls per day recommended, nine attempts maximum |
| Change a policy | Edit it in the vault; it applies to all protected items; daylight saving time isn't adjusted automatically |
| Stop protection | Retain the backup data or delete it |
| Protect against deletion | Soft delete (14 extra days), immutable vault, multi-user authorization |
| Find unprotected VMs | Resiliency protection view, Quality Insights backup check, Azure Policy audit |

Roles: **Backup Reader** views, **Backup Operator** runs backups and restores, **Backup Contributor** also manages policies and stops protection.

HANA-specific operation: after restoring SYSTEMDB of an MDC system, re-run the pre-registration script before restoring tenant databases.

> **Exam trap.** Backup Operator can run and restore backups but can't change policies or stop protection with data deletion: that needs Backup Contributor.

<!-- section: acss-start-stop | objectives: 4.2.7 -->
## Starting and stopping SAP systems with Azure Center for SAP solutions

From the VIS you start or stop the whole application tier (ASCS and application servers), a single instance, or the HANA database. Deployment types: single server, distributed, distributed with HA.

| Behavior | Detail |
| --- | --- |
| VMs | Not stopped by default: use `--deallocate-vm` on stop and `--start-vm` on start |
| Order | An HA system stops gracefully in the right order, without failover of central services |
| HANA | The whole instance stops; a single tenant can't be stopped. HA HANA needs a cluster |
| Soft stop | `--soft-stop-timeout-seconds` drains RFC and HTTP calls; 0 means hard stop |
| Timeout | Operations longer than 300 seconds end; monitoring keeps updating the status |
| Same VM | Several application instances on one VM stop one at a time |

Prerequisites: **Azure Center for SAP solutions administrator** role on the VIS; `sapstartsrv` running on all VMs; for start, VMs running (or `--start-vm`); for HA, `sap_vendor_cluster_connector` installed on the ASCS instance; for HANA, cluster maintenance mode **Disabled** to stop and **Enabled** to start.

```bash
az workloads sap-virtual-instance stop --resource-group rg-sap-dev --name DEV --deallocate-vm true
az workloads sap-virtual-instance start --resource-group rg-sap-dev --name DEV --start-vm true
```

<!-- section: acss-vis | objectives: 4.2.8 -->
## Managing Virtual Instances for SAP solutions

A **Virtual Instance for SAP solutions (VIS)** represents an SAP system: the SID as parent, with child resources for central services, application server instances and the database. Child resources have no cost; they map to VMs outside the VIS.

Registering an existing system:

- Register the **Microsoft.Workloads** resource provider; the user needs **Azure Center for SAP solutions administrator** and **Managed Identity Operator**.
- A **user-assigned managed identity** with **Azure Center for SAP solutions service role** on the compute resource group and **Reader** on the VNet resource group.
- VMs running, `sapstartsrv` and SAP Host Agent running, outbound access to Azure Storage, Azure Resource Manager and Microsoft Entra ID; with restricted storage access, the **Microsoft.Storage** service endpoint on all SAP subnets.
- You provide the ASCS VM, SID, SAP product, environment and identity. A managed resource group with a storage account is created.

| Supported | Not supported |
| --- | --- |
| NetWeaver ABAP; Windows, SUSE, RHEL; HANA, Db2, SQL Server, Oracle, MaxDB, SAP ASE; several application instances on one VM | Java and dual stack; HANA scale-out, MCOS, MCOD; HANA Large Instances; systems across peered VNets; IPv6; several SIDs on the same VMs |

Operations: overview with status and health, instance properties, **Monitoring** tab (CPU, database data disk IOPS), Quality Insights, cost analysis of VMs, disks and load balancers. Deleting a VIS removes the VIS, its child resources and its managed resource group, but **not** the VMs, disks and NICs; it can't be undone, and the system can be registered again.

> **Exam trap.** Don't delete the managed resource group of a VIS: the service capabilities stop working until the system is registered again.

<!-- section: lama | objectives: 4.2.9 -->
## Implementing the SAP LaMa connector for Azure

The SAP Landscape Management connector for Azure (SAP LaMa 3.0 SP05 and later, **Enterprise Edition only**, SAP Note 2343511) calls Azure Resource Manager to deallocate and start VMs, copy and relocate managed disks and delete managed disks. LaMa uses them to relocate, copy, clone and refresh SAP systems.

Setup in LaMa: **Infrastructure** > **Cloud Managers** > **Add** > **Microsoft Azure Cloud Adapter**, then:

| Field | Value |
| --- | --- |
| User Name / Password | Service principal application ID and secret, or empty for a system-assigned managed identity |
| Use Managed Identity | Recommended when LaMa runs on an Azure VM |
| Subscription ID, Microsoft Entra tenant ID | Target subscription and tenant |
| Monitoring Interval (Seconds) | At least 300 |
| Change Storage Type to save costs | Moves disks of stopped or unprepared systems to Standard storage |

Grant the identity **Contributor** on every resource group that contains SAP systems LaMa manages. Prepare hosts for adaptive design: SAP Adaptive Extensions and SAP Host Agent 7.21, virtual host names added with `sapacext`, Automatic Mountpoint Creation enabled, a separate subnet with static IP addresses, `CLOUD_NETCONFIG_MANAGE` disabled on SUSE. Azure NetApp Files volumes simplify ASCS storage. LaMa can't relocate SQL Server itself.

> **Exam trap.** The connector isn't available in the LaMa Standard Edition, and a Reader role isn't enough: LaMa changes VMs and disks, so it needs Contributor.

<!-- section: key-points -->
## Key points

- The Azure VM extension for SAP solutions is the SAP support prerequisite; Azure Monitor for SAP solutions is telemetry.
- Azure Monitor for SAP solutions: /25 subnet delegated to Microsoft.Web/serverFarms, providers per layer, agents on every node.
- Disk versus VM consumed-percentage metrics locate storage bottlenecks.
- Network Watcher diagnoses; NSG flow logs retire on September 30, 2027 in favor of VNet flow logs.
- Azure Center for SAP solutions starts and stops SAP; VMs are deallocated only with `--deallocate-vm`.
- Deleting a VIS keeps the VMs; LaMa needs Enterprise Edition and Contributor.
