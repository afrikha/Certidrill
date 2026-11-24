Azure Backup keeps recovery points to go back in time; Azure Site Recovery keeps a running copy in another region to restart quickly after a disaster. Questions test which vault protects what, where the vault must be, and the order of the operations.

<!-- section: vaults | objectives: 5.2.1, 5.2.2 -->
## Recovery Services vaults and Backup vaults

Two vault types exist; each protects its own list of workloads:

| | **Recovery Services vault** | **Backup vault** |
| --- | --- | --- |
| Azure Backup workloads | **Azure virtual machines**, **Azure Files** shares, SQL Server and SAP HANA in Azure virtual machines, on-premises files and servers (MARS agent, Azure Backup Server) | **Azure managed disks**, **Azure Blobs**, Azure Database for PostgreSQL, Azure Kubernetes Service |
| Azure Site Recovery | **Yes** | No |

A scenario with a virtual machine and blobs therefore needs **one vault of each type**.

**Location rules:**

- For **Azure Backup**, the vault must be in the **same region as the data source**. Resources in three regions need three vaults. The vault can be in a different resource group from the data source.
- For **Azure Site Recovery** (Azure to Azure), the vault must be in **any region except the source region**, usually the target region.

**Settings of a Recovery Services vault:**

| Setting | Values | Rule |
| --- | --- | --- |
| **Storage replication type** | **GRS** (default), LRS, ZRS | Changeable **only before the first item is protected** |
| **Cross Region Restore** | Off by default | Requires GRS. Lets you restore in the **paired region** at any time, even without outage. Can't be turned off once enabled |
| **Soft delete** | On by default: deleted backup data is kept **14 days** (configurable up to 180) | Protects against accidental or malicious deletion; can be made always-on (irreversible) |
| Immutable vault | Prevents operations that would shorten or remove recovery points | Can be locked |
| Encryption | Platform-managed keys, or customer-managed keys | Customer-managed keys must be configured before any item is protected |

To **delete a vault**, first stop protection and delete the backup data of every item (including soft-deleted items), and unregister servers and storage accounts.

```bash
az backup vault create -g RG1 -n rsv-we --location westeurope
az backup vault backup-properties set -g RG1 -n rsv-we \
  --backup-storage-redundancy GeoRedundant --cross-region-restore-flag true
```

<!-- section: backup-vault-workloads | objectives: 5.2.2 -->
## Workloads of a Backup vault

A Backup vault uses its **managed identity** to reach the data sources; you grant it roles.

| Workload | How it works | Roles for the vault identity |
| --- | --- | --- |
| **Azure Disk Backup** | Scheduled **incremental snapshots** of a managed disk, several times a day, stored in a **snapshot resource group** of your subscription (operational tier). No agent, no impact on the machine. Restore always creates a **new disk** | Disk Backup Reader on the disk; Disk Snapshot Contributor on the snapshot resource group; Disk Restore Operator for restores |
| **Azure Blobs, operational backup** | Continuous, local to the storage account: relies on point-in-time restore, versioning, soft delete and change feed, which Azure Backup enables | Storage Account Backup Contributor on the account |
| **Azure Blobs, vaulted backup** | Scheduled copies transferred to the vault: protects against deletion of the account | Same |

A new blob backup policy always includes **vaulted backup**: it is selected by default and can't be turned off. Operational backup can be added to it, but a policy can't be operational-only.

Creation order: Backup vault, **backup policy**, then **backup instance** (the association of a data source with a policy).

<!-- section: backup-policy | objectives: 5.2.3 -->
## Backup policies

A backup policy defines **when** recovery points are taken (schedule) and **how long** they are kept (retention: daily, weekly, monthly and yearly points). A vault can hold several policies; a policy can protect many items; an item follows one policy.

Policies for Azure virtual machines:

| | **Standard** policy | **Enhanced** policy |
| --- | --- | --- |
| Frequency | Once a day (or weekly) | **Several per day**: every 4, 6, 8, 12 or 24 hours |
| Instant restore snapshot retention | 1 to 5 days (default 2) | 1 to 30 days (default 7) |
| Required for | | **Premium SSD v2 and Ultra disks** (not supported by Standard). Trusted launch machines from the portal: Standard protects them only through Azure CLI 2.73.0+, Az PowerShell 14.0.0+ or REST API 2025-01-01+ |
| Change | | A machine can't go back from Enhanced to Standard |

How a virtual machine backup runs:

1. The backup **extension** takes a snapshot of the disks: **application-consistent** (VSS on Windows, pre and post scripts on Linux), else file-system-consistent, else crash-consistent.
2. The snapshot is kept with the disks for the **instant restore** retention: restores from it are fast.
3. The data is then transferred to the **vault tier**, where the retention of the policy applies.

Other workloads: **SQL Server in an Azure virtual machine** uses full, differential and **log backups, as often as every 15 minutes**, for point-in-time restore. **Azure Files** backup is based on share snapshots, with optional vaulted copies.

The default policy (Standard) backs up once a day, keeps the daily points 30 days and the instant restore snapshots 2 days.

<!-- section: backup-restore | objectives: 5.2.4 -->
## Backup and restore operations

**Enabling backup** of a virtual machine: from the machine (*Backup*), from the vault (*+ Backup*) or from **Resiliency**. Choose the vault (same region) and the policy. The first backup is a full copy; the following ones are incremental. **Backup now** triggers an on-demand backup with its own retention.

**Restore options for an Azure virtual machine:**

| Option | Result |
| --- | --- |
| **Create new** virtual machine | A new machine from the recovery point, in the network you choose |
| **Restore disks** | Only the disks (and a template), to build or customize the machine yourself |
| **Replace existing** | Replaces the disks of the current machine, which must still exist; the old disks are kept |
| **Cross Region Restore** | Create new or restore disks in the paired region (vault in GRS with the option enabled) |
| **File recovery** | Mounts the recovery point as drives (iSCSI) with a downloaded script to copy individual files; unmount afterwards (valid 12 hours) |

A restore uses a **staging storage account** in the same region as the vault.

**Azure Files:** restore the **full share** or individual files and folders (**item-level recovery**), to the **original location** (overwrite or skip) or to an **alternate location**.

**On-premises and guest-level backup:**

| Tool | Protects |
| --- | --- |
| **MARS agent** (Microsoft Azure Recovery Services) | Files, folders, volumes and system state of **Windows** machines, on-premises or in Azure. Installed on the machine, registered with the vault credentials file, encrypted with a passphrase you must keep |
| Azure Backup Server (MABS) / DPM | Workloads such as Hyper-V and VMware machines, SQL Server, SharePoint, Exchange |

**Stopping protection:** *Stop backup and retain backup data* (recovery points stay, billed) or *Stop backup and delete backup data* (the data goes to soft delete for 14 days). Roles: **Backup Contributor** (everything except deleting the vault and giving access), **Backup Operator** (no deletion of backups, no policy management), **Backup Reader**.

```bash
az backup protection enable-for-vm -g RG1 --vault-name rsv-we --vm VM1 --policy-name DefaultPolicy
az backup protection backup-now -g RG1 --vault-name rsv-we --container-name VM1 --item-name VM1 \
  --backup-management-type AzureIaasVM --retain-until 31-12-2026
```

<!-- section: site-recovery | objectives: 5.2.5 -->
## Azure Site Recovery for Azure resources

Site Recovery **replicates** virtual machines continuously to another region so that they can be started there if the primary region fails.

| | Azure Backup | Azure Site Recovery |
| --- | --- | --- |
| Purpose | Recover data: deletion, corruption, ransomware, long retention | Keep the **service running**: regional disaster |
| Copy | Recovery points on a schedule | Continuous replication |
| RPO / RTO | Hours | Minutes |

**RPO** (recovery point objective) is the maximum acceptable data loss, measured in time; **RTO** (recovery time objective) is the maximum acceptable downtime.

Components of Azure-to-Azure replication:

| Component | Role |
| --- | --- |
| Recovery Services vault | In a region **other than the source** |
| **Mobility service** extension | Installed automatically on each replicated machine; captures disk writes |
| **Cache storage account** | In the **source** region; receives the writes before they are sent to the target |
| Replica managed disks | In the target region |
| Target resource group, virtual network, availability option | Created by default by Site Recovery, or chosen by you |
| **Replication policy** | Retention of recovery points (1 day by default, up to 15) and frequency of **app-consistent** snapshots. Crash-consistent points are taken every 5 minutes |

Steps: create the vault; **Enable replication** (source region, machines, target settings, replication policy); wait for the initial replication to finish (*Protected*).

Replicated machines need **outbound** HTTPS access to the storage, Microsoft Entra ID and Site Recovery endpoints; Site Recovery never needs inbound access to them. Target virtual machines don't run, and therefore cost only storage, until a failover.

<!-- section: failover | objectives: 5.2.6 -->
## Failing over with Site Recovery

| Operation | What it does |
| --- | --- |
| **Test failover** | Creates a copy of the machine in the target region, in a **network you choose (an isolated, non-production one)**, without stopping replication or touching production. Finish with **Cleanup test failover** |
| **Failover** | Starts the machines in the target region from a recovery point. Option to shut down the source machines first |
| **Commit** | Confirms the failover; the other recovery points are discarded |
| **Re-protect** | Reverses the replication: target back to the original region |
| **Failback** | A failover in the other direction, then re-protect again |

Complete cycle: test failover (regularly) → failover → commit → re-protect → failback (failover to the primary region) → re-protect.

Recovery point to choose at failover:

| Choice | Effect |
| --- | --- |
| **Latest** (lowest RPO) | Processes all the data received first: least data loss, longer RTO |
| **Latest processed** (low RTO) | Uses the last point already processed: fastest |
| **Latest app-consistent** | Last application-consistent point: no application recovery needed |
| Custom | A point you select |

A **recovery plan** orchestrates the failover of several machines: **groups** that start in order (database tier, then application tier, then web tier), with machines of a group failing over in parallel, plus **manual actions** and **Azure Automation runbooks** before or after a group. One click fails over the whole application.

<!-- section: backup-reports-alerts | objectives: 5.2.7 -->
## Reports and alerts for backups

| Need | Tool |
| --- | --- |
| See jobs, protected items and health across vaults | **Resiliency** (which extends Azure Business Continuity Center; the legacy Backup center is no longer in portal search), *Backup jobs*, *Backup items* |
| History, trends, consumption, policy adherence over months | **Backup reports** |
| Be notified of failures and risky operations | **Azure Monitor alerts** for Azure Backup |

**Backup reports** rely on Azure Monitor logs:

1. Create a **Log Analytics workspace** (any region and subscription; one workspace can serve all vaults). Extend its retention beyond the default 30 days if you need a longer history.
2. On each vault, add a **diagnostic setting** that sends the backup events to the workspace, in **resource-specific** mode.
3. Open the reports; the first data can take up to 24 hours to arrive.

**Alerts:**

- **Built-in alerts** are raised by default, without creating any rule: **security alerts** (deleting backup data, disabling soft delete, changing a policy to a shorter retention... always on) and **job failure alerts** (backup or restore failed; can be turned off).
- A built-in alert notifies nobody by itself. Create an **alert processing rule** on the subscription, resource group or vault that attaches an **action group** (email, ITSM, webhook, logic app).
- For custom conditions, create **log search alerts** on the workspace that receives the vault's diagnostics, for example on failed jobs in the `AddonAzureBackupJobs` table. Azure Backup metrics (*Backup Health Events*, *Restore Health Events*) are still in preview.

<!-- section: key-points -->
## Key points

- Recovery Services vault: virtual machines, Azure Files, SQL in virtual machines, MARS, Site Recovery. Backup vault: disks, blobs, PostgreSQL, AKS.
- Backup: vault in the **same** region as the source. Site Recovery: vault **outside** the source region.
- GRS by default; set the replication type before protecting anything; Cross Region Restore needs GRS; soft delete keeps deleted data 14 days.
- Standard policy: daily. Enhanced policy: every 4 to 24 hours, required for Premium SSD v2 and Ultra disks and for trusted launch machines in the portal.
- Restore: create new, restore disks, replace existing, file recovery. MARS: files, folders and system state of Windows machines.
- Site Recovery: Mobility extension, cache storage account in the source region, crash-consistent points every 5 minutes.
- Test failover in an isolated network; then failover, commit, re-protect, failback.
- Backup reports need a Log Analytics workspace and diagnostic settings; built-in alerts need an alert processing rule and an action group to notify.
