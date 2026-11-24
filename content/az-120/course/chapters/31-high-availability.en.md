High availability for SAP on Azure combines Azure infrastructure features (availability sets or zones, Standard load balancer, shared storage) with application clustering (Pacemaker on Linux, Windows Server Failover Clustering on Windows) and database replication. The exam asks which combination meets an SLA, how the load balancer and fencing must be configured, and which storage replicates across zones.

<!-- section: sla-design | objectives: 3.1.1 -->
## Designing for SLA considerations

| Deployment | Azure VM SLA (connectivity to at least one instance) |
| --- | --- |
| Single VM with premium storage for all its disks | 99.9% |
| Two or more VMs in the same availability set | 99.95% |
| Two or more VMs across availability zones | 99.99% |

The SLA of a system is the **product** of the SLAs of the components it depends on: 99.95% x 99.9% x 99.9% = 99.75%. Downtime is counted on 30 days (43,200 minutes): 0.05% equals 21.6 minutes per month.

Single points of failure (SPOFs) of an SAP system, and their protection:

| Component | Protection |
| --- | --- |
| ASCS/SCS (message server, enqueue server) | Cluster with ERS: Pacemaker or WSFC |
| Database | DBMS replication with a cluster: HANA System Replication, SQL Server Always On, Oracle Data Guard, Db2 HADR, SAP ASE HADR |
| `sapmnt` and other shared file systems | Highly available NFS or SMB: Azure Files (ZRS), Azure NetApp Files, or a shared disk for WSFC |
| Application servers | At least two instances on different VMs; logon groups spread the users |

Without a cluster, **Azure VM restart** (service healing) restarts a failed VM on another host, but there's no SLA on how long the restart takes: acceptable for application servers or non-production, not for the ASCS/SCS or the database of a critical system.

> **Exam trap.** The 99.99% VM SLA of zones doesn't make an SAP system highly available by itself: every SPOF must also be clustered **across zones**. Zonal VMs with a single ASCS/SCS or database VM remain a single point of failure.

<!-- section: sets-and-zones | objectives: 3.1.2 -->
## Availability sets and availability zones

| | Availability set | Availability zones |
| --- | --- | --- |
| Protects against | Host, rack, power or switch failure in one datacenter (fault domains) and planned maintenance (update domains, one rebooted at a time) | Loss of a whole datacenter (independent power, cooling, network) |
| Disks | Managed disks are aligned with the VM's fault domain | Managed disks are created in the VM's zone; managed disks are mandatory |
| Latency | Lowest (one datacenter) | Varies between zones: measure it |
| Storage restrictions | Ultra Disk not supported; Premium SSD v2 only in a few regions without availability zones, after feature registration | Ultra Disk and Premium SSD v2 supported |
| Assignment | Only when the VM is created (or redeployed) | Only when the VM is created |

Design rules:

- Sets and zones are **mutually exclusive** for one VM; combining them in one system requires proximity placement groups.
- Use **one availability set per role** (ASCS/ERS, database, application servers), so the two nodes of a cluster never share a fault domain.
- For new zonal deployments, Microsoft recommends a **flexible virtual machine scale set with `FD=1`**, the only scale set configuration supported for SAP: VMs spread across zones, and best effort across fault domains inside each zone.
- Choose the two zones with the lowest latency and where every required VM size is available; some sizes exist in only two zones.
- With SBD fencing in a zonal cluster, the SBD device (iSCSI target or ZRS shared disk) uses the third zone.

<!-- section: load-balancing | objectives: 3.1.3 -->
## Load balancing for high availability

Azure doesn't support gratuitous ARP for floating IPs, so a cluster's virtual IP is published through an **internal Standard load balancer**. The Basic SKU isn't supported for SAP and is retired.

| Setting | Value |
| --- | --- |
| Frontend IP | One per virtual host name: ASCS, ERS, HANA primary, optional HANA read-enabled secondary, SQL listener |
| Backend pool | The cluster nodes |
| Rule | **HA ports** (all ports, protocol All) |
| Floating IP | **Enabled** |
| Idle timeout | **30 minutes** |
| Health probe | TCP, interval 5 seconds, `probeThreshold` 2; port `620<nr>` for ASCS, `621<nr>` for ERS, `625<nr>` for HANA, `626<nr>` for the HANA read-enabled secondary |

```bicep
resource ilb 'Microsoft.Network/loadBalancers@2023-11-01' = {
  name: 'lb-nw1-ascs'
  location: location
  sku: { name: 'Standard' }
  properties: {
    frontendIPConfigurations: [ { name: 'fe-ascs', properties: { subnet: { id: subnetId }, privateIPAllocationMethod: 'Static', privateIPAddress: '10.0.0.7' } } ]
    backendAddressPools: [ { name: 'be-ascs' } ]
    probes: [ { name: 'hp-ascs', properties: { protocol: 'Tcp', port: 62000, intervalInSeconds: 5, probeThreshold: 2 } } ]
    loadBalancingRules: [ { name: 'lbr-ascs', properties: {
      frontendIPConfiguration: { id: resourceId('Microsoft.Network/loadBalancers/frontendIPConfigurations', 'lb-nw1-ascs', 'fe-ascs') }
      backendAddressPool: { id: resourceId('Microsoft.Network/loadBalancers/backendAddressPools', 'lb-nw1-ascs', 'be-ascs') }
      probe: { id: resourceId('Microsoft.Network/loadBalancers/probes', 'lb-nw1-ascs', 'hp-ascs') }
      protocol: 'All', frontendPort: 0, backendPort: 0, enableFloatingIP: true, idleTimeoutInMinutes: 30 } } ]
  }
}
```

- The portal's "Unhealthy threshold" (`numberOfProbes`) isn't respected: set `probeThreshold` with Azure CLI, PowerShell or a template.
- Set `net.ipv4.tcp_timestamps = 0` on Linux VMs behind the load balancer, or the probes fail (saptune 3.1.1 or later keeps the value).
- In Pacemaker, the `azure-lb` resource agent answers the probe on the node that owns the virtual IP.
- The internal load balancer gives no outbound internet access: use a NAT gateway if the fence agent or patching needs it.

> **Exam trap.** Without floating IP, or with a load-balancing rule per port instead of HA ports, the cluster IP doesn't follow the failover correctly. HA ports, floating IP and a 30-minute idle timeout are the three settings to recognize.

<!-- section: hana-scs-clustering | objectives: 3.1.4 -->
## Clustering HANA and SAP Central Services

**HANA scale-up** uses HANA System Replication (HSR) between two VMs of the same size, with Pacemaker for automatic takeover (RPO 0 with synchronous replication, low RTO). On SLES:

- Resource agents: **SAPHanaSR-angi** (HANA 2.0 SPS05 or later, SLES for SAP 15 SP4 or later) or the classic **SAPHanaSR**; the two packages are mutually exclusive.
- A clone of **SAPHanaTopology** and a promotable clone of **SAPHanaController** (SAPHana in the classic package), plus an IP group (IPaddr2 and `azure-lb`) colocated with the promoted instance.
- `PREFER_SITE_TAKEOVER="true"`; `AUTOMATED_REGISTER="false"` during failover tests, then `true` so the former primary registers as secondary automatically.
- HANA hooks: **susHanaSR** (SAPHanaSR for the classic package) reports replication status to the cluster; **susChkSrv** acts at once (for example, `action_on_lost = fence`) when the index server crashes.
- With `/hana/shared` on NFS, the **SAPHanaFilesystem** resource monitors it (`ON_FAIL_ACTION="fence"`).
- A read-enabled secondary uses `--operationMode=logreplay_readaccess` and a second frontend IP.

**ASCS/ERS** on Linux uses the `SAPInstance` resource agent (`IS_ERS=true` for ERS) and the SAP HA interface (`sap-suse-cluster-connector` on SLES; check with `sapcontrol -nr 00 -function HACheckConfig`).

| | ENSA1 | ENSA2 |
| --- | --- | --- |
| Releases | Older NetWeaver | Default from ABAP Platform 1809 (available from NetWeaver 7.52) |
| On ASCS failure | ASCS must start on the node running ERS to take over the replicated lock table | ASCS can restart on any node; ERS replicates the locks over the network |
| Locks on enqueue restart | Lost | Kept |
| Cluster size | Two nodes | Two nodes, or three nodes (ENSA2 only) |

For new SLES 15 deployments, Microsoft recommends the **simple mount** configuration (file systems mounted by the OS, not by the cluster). On Linux, one cluster can host at most five SAP SIDs (multi-SID), and ENSA1 and ENSA2 systems can't be mixed in one cluster.

**Windows** clusters ASCS/SCS with WSFC, using either a **file share** (SMB on Azure Files or Azure NetApp Files, or Scale-Out File Server) or a **shared disk** (Azure shared disk on Premium SSD, `Premium_LRS` with availability sets, `Premium_ZRS` with zones, `maxShares` 2; or SIOS DataKeeper). Use Windows Server 2019 Datacenter or later: WSFC is Azure-aware and uses a distributed network name for the cluster name.

```bash
sudo crm configure primitive rsc_sap_NW1_ERS02 SAPInstance \
  op monitor interval=11 timeout=60 on-fail=restart \
  params InstanceName=NW1_ERS02_nw1-aers START_PROFILE="/sapmnt/NW1/profile/NW1_ERS02_nw1-aers" \
  AUTOMATIC_RECOVER=false IS_ERS=true meta priority=1000
```

<!-- section: sql-clustering | objectives: 3.1.5 -->
## Clustering SQL Server

For SAP on SQL Server (Windows only; SAP doesn't support SQL Server on Linux), the high availability answer is **Always On availability groups** on a WSFC cluster.

| Option | SAP support |
| --- | --- |
| Always On availability group, synchronous commit within the region | Supported, the standard choice |
| Failover cluster instance (FCI) with Storage Spaces Direct or Azure shared disks | **Not supported for SAP** |
| Log shipping | Used for disaster recovery between regions, rarely for HA |
| Database mirroring connection parameters (`dbs/mss/server`) | Only to investigate listener problems, two replicas only |

Client connectivity to the primary replica:

| Listener | Requirement |
| --- | --- |
| Virtual network name (VNN) in a single subnet | Internal load balancer with a probe port and floating IP (Direct Server Return); static IPs on the database NICs |
| Distributed network name (DNN) | No load balancer; SQL Server 2019 CU8, SQL Server 2017 CU25 or SQL Server 2016 SP3 or later; faster failover |
| Nodes in different subnets (multi-subnet) | No load balancer or DNN needed |

Also: use a **cloud witness** for quorum, prefer the latest SQL Server release (SQL Server 2022), and place tempdb on the temporary D: drive or a separate disk.

> **Exam trap.** "Use an Azure shared disk with a SQL Server failover cluster instance" is a valid Azure design but not a supported SAP design. For SAP, choose availability groups.

<!-- section: pacemaker-stonith | objectives: 3.1.6 -->
## Configuring Pacemaker and STONITH

Pacemaker is supported on SLES 12 and later and RHEL 7 and later. A cluster without working fencing (STONITH, "shoot the other node in the head") isn't supported: fencing guarantees a failed node is stopped before resources move, which prevents split brain.

| Setting | Value |
| --- | --- |
| `stonith-enabled` | `true` |
| `stonith-timeout` | 900 with the Azure fence agent; 210 with SBD |
| Corosync `token` | 30000 ms |
| Fencing race in a two-node cluster | `pcmk_delay_max=15` on the fencing device; HANA clusters also set `priority-fencing-delay=30` so the primary wins |
| Azure scheduled events | `azure-events-az` resource agent: sets `#health-azure` to -1000000 on a node with pending maintenance, so resources move away |
| Pacemaker start after boot | Systemd timer (`OnBootSec=216`) so the failover completes before a rebooted node rejoins |
| Resource defaults (HANA) | `resource-stickiness=1000`, `migration-threshold=5000` |

```bash
# SLES (crmsh)
sudo crm configure property stonith-enabled=true
sudo crm configure property stonith-timeout=900
sudo crm corosync set totem.token 30000
# RHEL (pcs): token set at cluster creation
sudo pcs cluster setup nw1-cluster sap-cl1 sap-cl2 totem token=30000
sudo pcs property set stonith-enabled=true
sudo pcs property set stonith-timeout=900
```

Before maintenance, put the cluster in `maintenance-mode=true`. No NVA may sit in the cluster communication path or in the path to SBD targets.

<!-- section: fence-agent-sbd | objectives: 3.1.7 -->
## Azure fence agent or SBD

| | Azure fence agent | SBD with iSCSI target servers | SBD with an Azure shared disk |
| --- | --- | --- | --- |
| Mechanism | `fence_azure_arm` powers off the VM through Azure Resource Manager | Poison-pill messages on shared block devices, plus a watchdog (`softdog`) | Same, on a managed disk attached to all nodes |
| Requirements | **System-assigned** managed identity on each VM (user-assigned isn't supported), custom role, outbound access to `management.azure.com` and `login.microsoftonline.com` | **Three** iSCSI target VMs (one target is a SPOF; with two, losing one blocks fencing) in the same region, no NVA in the path | Premium SSD: `Premium_LRS` with availability sets, `Premium_ZRS` with zones; `maxShares` at least the number of nodes; P1 or P2 is enough |
| Depends on | Azure control plane availability | Extra VMs to operate | Disk availability; no extra VMs |

Custom role for the fence agent, assigned to the managed identity of every cluster VM:

```json
{
  "Name": "Linux Fence Agent",
  "Description": "Allowed to power-off and start virtual machines",
  "AssignableScopes": [ "/subscriptions/<subscription id>" ],
  "Actions": [
    "Microsoft.Compute/*/read",
    "Microsoft.Compute/virtualMachines/powerOff/action",
    "Microsoft.Compute/virtualMachines/start/action"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": []
}
```

```bash
sudo crm configure primitive rsc_st_azure stonith:fence_azure_arm params msi=true \
   resourceGroup="RG-SAP-PRD" subscriptionId="<subscription id>" \
   pcmk_host_map="sap-cl1:sapprdascs1;sap-cl2:sapprdascs2" \
   power_timeout=240 pcmk_reboot_timeout=900 pcmk_monitor_timeout=120 \
   pcmk_monitor_retries=4 pcmk_action_limit=3 pcmk_delay_max=15 \
   meta failure-timeout=120s op monitor interval=3600 timeout=120
```

`pcmk_host_map` maps cluster node names to Azure VM names. On RHEL, the same parameters go into `pcs stonith create rsc_st_azure fence_azure_arm`. Optional `fence_kdump` can be added as a first fencing level to collect a crash dump, never as the only one.

> **Exam trap.** The fence agent role needs `powerOff` and `start`, not `deallocate` or `restart`, and the identity must be system-assigned. A user-assigned identity or a role without these actions makes fencing fail.

<!-- section: storage-replication | objectives: 3.1.8 -->
## Storage-level replication

Azure block storage keeps three synchronous copies inside one zone, but database disks get no zone-redundant option:

| Storage | Replication across zones | SAP use |
| --- | --- | --- |
| Premium SSD v1 (`Premium_ZRS`) | Synchronous, but not tested with SAP databases | Not supported for database files; supported for Azure shared disks (ASCS/SCS on WSFC, SBD) |
| Premium SSD v2, Ultra Disk | None | Replicate with the DBMS (HSR, Always On) |
| Azure Files SSD (ZRS) | Synchronous across three zones, transparent to clients | Fully supported for `sapmnt`, transport and central services HA |
| Azure NetApp Files cross-zone replication | **Asynchronous** to a volume in another zone | Zone resilience for volumes that no application replication protects; destination read-only until you break the replication peering and mount it (manual failover); no extra charge beyond the capacity pools |
| Azure NetApp Files cross-region replication | Asynchronous to a region of a supported replication pair (Azure paired regions and some nonstandard pairs) | Disaster recovery; billed per GiB replicated |
| SIOS DataKeeper | Synchronous mirror between two managed disks | Third-party shared-disk option for Windows ASCS/SCS |

Design rules:

- Database high availability across zones uses **database replication** (HSR, Always On, Data Guard): Premium SSD v2, Ultra Disk and Azure NetApp Files offer no synchronous cross-zone replication.
- Azure NetApp Files replication is asynchronous: plan for an RPO above zero and a manual failover. Large volumes support cross-zone replication only with hourly or daily schedules.
- ZRS write latency is higher than LRS: benchmark Premium_ZRS shared disks in the region.

<!-- section: restart | objectives: 3.1.9 -->
## Restarting SAP systems, instances and HANA databases

**Azure VM restart.** When a host fails, Azure service healing restarts the VM on a healthy host. Azure doesn't restart a Linux VM stuck in a kernel panic: set `kernel.panic` (20 to 30 seconds is recommended) so the guest reboots itself.

**Automatic start after the VM boots**, for systems without a cluster:

```text
# Instance start profile (ABAP or Java instance, ASCS/SCS)
Autostart = 1
```

- SAP no longer recommends `Autostart` (SAP KBA 1909114): it can't order the start of several instances or VMs. Disable it before Software Update Manager (SUM) runs, which restarts services.
- **Never use `Autostart` on clustered instances** (ASCS/SCS, ERS, clustered central instance): the cluster starts them.
- HANA restarts after a VM reboot through its service watchdog when it isn't clustered. In an HSR cluster, Pacemaker starts HANA and decides which site is primary.
- If systemd manages the SAP startup framework (SAP Note 3115048), disable the instance service units (`SAP<SID>_<nr>`) of clustered instances so they don't start outside the cluster.

```bash
# Stop an instance and its service (as <sid>adm)
sapcontrol -nr 00 -function Stop
sapcontrol -nr 00 -function StopService
# Clustered instances: let the cluster restart them
sudo crm resource restart rsc_sap_NW1_ASCS00
```

Azure Center for SAP solutions can also start and stop a registered system and its VMs (see the monitoring and maintenance chapter).

<!-- section: key-points -->
## Key points

- Single VM with premium storage 99.9%, availability set 99.95%, zones 99.99%; multiply component SLAs.
- Protect each SPOF: ASCS/SCS (cluster with ERS), database (DBMS replication and cluster), `sapmnt` (Azure Files ZRS or Azure NetApp Files).
- Internal Standard load balancer: HA ports, floating IP, 30-minute idle timeout, TCP probe `620<nr>`/`621<nr>`/`625<nr>`, `probeThreshold` 2, TCP timestamps off.
- HANA: HSR + Pacemaker (SAPHanaSR-angi, susHanaSR, susChkSrv); ASCS/ERS: ENSA2 by default; Windows: WSFC with SMB share or Azure shared disk.
- SQL Server for SAP: Always On availability groups (VNN with load balancer, DNN, or multi-subnet); no FCI.
- STONITH is mandatory: Azure fence agent (system-assigned identity, powerOff/start role) or SBD (three iSCSI targets or a shared disk).
- Databases replicate with the DBMS; Azure Files ZRS is synchronous; Azure NetApp Files replication is asynchronous.
- `Autostart = 1` only for non-clustered instances; the cluster starts clustered resources.
