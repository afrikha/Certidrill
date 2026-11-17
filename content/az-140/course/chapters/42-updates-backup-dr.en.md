Microsoft runs the Azure Virtual Desktop control plane; everything else is yours to update, back up and recover: session hosts, FSLogix profiles, applications, user data and identities. Azure Virtual Desktop has **no native disaster recovery feature**: you build it with a second host pool, FSLogix Cloud Cache, Azure Site Recovery, storage replication and Azure Backup. Questions give a host pool type and a recovery objective and ask for the matching design.

<!-- section: update-strategy | objectives: 4.2.1 -->
## Recommend an update strategy for session hosts

Two strategies exist:

| Strategy | How | Fits |
| --- | --- | --- |
| **Image-based** (recommended for pooled) | Patch the golden image (OS, Microsoft 365 Apps, Teams, Edge, apps), publish a new image version, replace the session hosts | Pooled host pools: every host identical, no drift, no patching during working hours |
| **In-place** | Windows Update for Business settings, Microsoft Intune, Configuration Manager or another tool patch the running VMs | Personal host pools, whose VMs hold the user's state and can't be recreated |

**Session host update** applies image-based updates for you, but only in a host pool created with a **session host configuration** (a pooled host pool option chosen at creation; it can't be added later). You change the session host configuration (image, VM size, disk type, security type, domain join or local administrator credentials, Intune enrollment, custom configuration script), then schedule an update:

1. One session host is updated first to validate the process, then the others in **batches** (*Max VMs removed during update*, default 1).
2. For each batch: users receive the **logoff message** and are signed out after the **logoff delay** (0–60 minutes, default 2), the hosts are drained and removed, new VMs are created from the new configuration with the same host names, join the directory and the host pool, then the old VMs are deleted.
3. Network, availability configuration and location are kept; manual customizations (files, registry keys, certificates) are lost, so put them in the image, Intune, Group Policy or the custom script.

Rules to remember: one update per host pool at a time; individual hosts can't be updated alone; **disable autoscale** on the host pool for the duration of the update; check subscription quotas, since new VMs are created before the old ones are deleted; Azure Monitor Agent isn't reinstalled automatically on the new hosts (use Azure Policy). With **standard management**, session host update isn't available: you rebuild hosts with your own pipelines and a registration token.

**In-place patching on multi-session with Intune:** Windows update rings aren't supported on Windows Enterprise multi-session; manage quality updates with the **settings catalog** (*Windows Update for Business* settings such as deferral and deadline periods).

| Requirement | Answer |
| --- | --- |
| Patch a pooled host pool monthly with no configuration drift and minimal admin effort | New image version + **session host update** (session host configuration host pool) |
| Pooled host pool created without a session host configuration | Rebuild hosts from the new image with your tooling; drain the old ones first |
| Personal desktops with user-installed apps | In-place patching (Intune settings catalog or Configuration Manager) |
| Maintenance on one host covered by a scaling plan | Exclusion tag + drain mode, then patch |

> **Exam trap.** Running Windows Update on each pooled host is the wrong answer when the question stresses consistency: hosts drift and the next host created from the old image is unpatched. Update the **image**.

<!-- section: disaster-recovery | objectives: 4.2.2 -->
## Plan and implement disaster recovery

| Host pool | Disaster recovery mechanism |
| --- | --- |
| **Pooled** | A **second host pool** in the secondary region, built from the same image, with the same application groups; profiles replicated by **FSLogix Cloud Cache** |
| **Personal** | **Azure Site Recovery** replication of each session host VM (Azure to Azure), with recovery plans to fail over many VMs; no secondary host pool and no Cloud Cache |

Pooled host pools can be designed two ways:

| Model | Behavior | Indicative RPO / RTO |
| --- | --- | --- |
| **Active-active** | Both host pools serve users all the time; no failover action. Users see both resources, so use separate, clearly named workspaces, and keep each user on one host pool at a time | Seconds to minutes / near zero |
| **Active-passive** | Secondary pool with few running hosts, scaled out by autoscale on failover. One workspace; failover is transparent to users but needs admin action | Seconds to minutes / 15–60 minutes |
| Personal with Site Recovery | VMs replicated continuously | 5–15 minutes / minutes per VM, plus domain rejoin and extensions |

**Active-passive failover:** remove the user groups' assignments from the primary application groups (connected users are disconnected), assign the groups to the secondary application groups, then scale out the secondary hosts. Failback repeats the steps the other way once the primary region is healthy.

**Capacity.** Deallocated VMs, quota and reserved instances don't guarantee that VMs can start in the secondary region during a regional outage: use **on-demand capacity reservations** when startup must be guaranteed.

**Site Recovery for personal desktops:** failover is triggered manually (portal, API, PowerShell) or automated; failed-over VMs start **unprotected**, so **reprotect** them to replicate back for failback. Extensions aren't replicated: reapply custom extensions after failover.

**Testing.** For pooled host pools, assign a test group (for example `GRP-TEST`) to the secondary application groups and fail it over without touching production.

> **Exam trap.** Don't use Site Recovery **test failover** on Azure Virtual Desktop session hosts: the copy registers with the control plane and conflicts with the original VM. Start the secondary hosts on a schedule and test with a test user group instead. Secondary hosts must also be started for a few hours at least every 90 days to refresh the token they use to reach the service.

<!-- section: multi-region | objectives: 4.2.3 -->
## Plan a multi-region implementation

**Service metadata.** Host pools, workspaces and application groups store their metadata in a location you choose, independent of the VMs' region. With classic **geographical** host pools the metadata sits in a database for the whole geography; **regional host pools** (preview) store it per region, replicated across availability zones and to a paired region. Geographical and regional objects aren't interoperable: primary and secondary objects must use the same deployment scope.

Design checklist for a second region:

| Layer | Secondary region design |
| --- | --- |
| Host pool and apps | Second host pool, its own desktop and RemoteApp application groups, same assignments by group |
| Images | A gallery in each region (or replicate the image version to the secondary region), several replicas per region |
| Profiles | FSLogix **Cloud Cache** with two `CCDLocations`, local storage listed **first** in each region |
| Storage | At least two storage accounts per host pool (profiles, Office containers), one more for App attach packages |
| AD DS | At least one domain controller with global catalog and DNS in the secondary region; a staging-mode Microsoft Entra Connect server there |
| Microsoft Entra Domain Services | A **replica set** in the secondary region |
| Monitoring | One Log Analytics workspace for both regions, or one per region if the primary may be lost |
| Network | Hub in each region with hybrid connectivity, firewall and DNS; test latency from users to the secondary region |

```powershell
# Primary-region session hosts: primary storage first
New-ItemProperty -Path "HKLM:\SOFTWARE\FSLogix\Profiles" -Name CCDLocations -PropertyType MultiString -Value "type=smb,connectionString=\\stprofweu.file.core.windows.net\profiles;type=smb,connectionString=\\stprofneu.file.core.windows.net\profiles" -Force
# Secondary-region session hosts: same value, order reversed
New-ItemProperty -Path "HKLM:\SOFTWARE\FSLogix\Profiles" -Name CCDLocations -PropertyType MultiString -Value "type=smb,connectionString=\\stprofneu.file.core.windows.net\profiles;type=smb,connectionString=\\stprofweu.file.core.windows.net\profiles" -Force
```

Cloud Cache writes to a local cache and replicates to every location asynchronously; it fails over automatically when the first location is unreachable. Configure it for the Profile container and, if used, for the ODFC container. Use Premium SSD disks for the local cache, sized for at least the largest profile (start at 30 GB per concurrent user).

| Profile storage option | Cross-region behavior |
| --- | --- |
| Azure Files, Premium | **No GRS**: use Cloud Cache for cross-region, ZRS within the region |
| Azure Files, Standard with GRS | Possible only where a region pair exists; higher RPO/RTO than Cloud Cache and harder failback |
| Azure NetApp Files | Cross-region replication, or cross-zone replication, but not both on one volume; failover isn't transparent |

> **Exam trap.** Availability zones aren't disaster recovery: they protect against a datacenter failure, not a regional outage. Spread hosts across zones **and** plan a second region when the requirement mentions a region failure.

<!-- section: backup-strategy | objectives: 4.2.4 -->
## Design a backup strategy

Back up what can't be rebuilt; rebuild the rest:

| Component | Strategy |
| --- | --- |
| FSLogix Profile Containers on Azure Files | **Azure Backup** for Azure Files (Recovery Services vault); vault redundancy ZRS or GRS |
| ODFC containers | Often not backed up: Outlook, OneDrive and Teams data come back from Microsoft 365; if backed up, use a longer interval |
| FSLogix containers on Azure NetApp Files | Snapshot policies, plus **Azure NetApp Files backup** for long-term copies |
| App attach packages | Back up the share if the packages can't be easily rebuilt |
| Personal desktops | **Azure Backup** of the VMs when user data is stored locally (OneDrive with Known Folder Move reduces the need) |
| Pooled session hosts | Not backed up: recreate them from the image |
| Images | Azure Compute Gallery: replicas in several regions, ZRS replica storage, two galleries in separate regions |

Back up the primary region; a disaster recovery environment usually doesn't need its own backups. Separate storage accounts for profiles and Office containers let you apply different backup policies.

| Azure Files backup tier | How it works |
| --- | --- |
| **Snapshot** | Share snapshots kept in the storage account itself; fast restore of files or the whole share; no copy outside the account |
| **Vaulted** (Vault-Standard) | After each snapshot, changed data is copied to the vault: offsite copy, ransomware protection, cross-region restore |

Limits: up to **24 scheduled snapshots per day** and **200 recovery points** per share; daily points kept up to 200 days, longer retention with weekly, monthly and yearly points. Enabling backup also turns on **soft delete** at the storage account level (14 days) and puts a lease on the backup snapshots so they can't be deleted by accident.

```bash
az backup vault create --resource-group rg-avd-bcdr --name rsv-avd-weu --location westeurope
az backup protection enable-for-azurefileshare --vault-name rsv-avd-weu --resource-group rg-avd-bcdr \
  --policy-name DailyProfiles --storage-account stprofweu --azure-file-share profiles
```

> **Exam tip.** The vault for Azure Files or VM backup is in the **same region** as the protected storage account or VM. Profiles in two regions with Cloud Cache: back up the primary copy.

<!-- section: backup-restore | objectives: 4.2.5 -->
## Configure backup and restore for profiles, personal desktops and images

**FSLogix profiles on Azure Files.** A profile is one VHD(X) file per user in a folder of the share. To restore one user's profile:

1. Make sure the user is **signed out** everywhere (the VHDX is locked while mounted).
2. In the vault, choose **Item Level Restore** for the share, select the recovery point and the user's folder or VHDX (up to 99 files or folders per restore).
3. Restore to the **original location** (overwrite) to roll back the profile, or to an **alternate location** to extract data and keep the current profile.

**Full Share Restore** (original or alternate location) is for a lost or corrupted share. Restores run from the snapshot when it exists, from the vault otherwise.

**FSLogix profiles on Azure NetApp Files** (up to 255 snapshots per volume):

| Restore option | Effect |
| --- | --- |
| Client-side restore | Copy the VHDX from the snapshot folder visible to clients (snapshot path visibility enabled) |
| Single-file snapshot restore | Restores the file in place or to a new file, almost instantly |
| Restore to new volume | Clones the snapshot to a new volume, usable immediately |
| Revert volume | Rolls the whole volume back; later data and newer snapshots are lost, irreversibly |

**Personal desktops** with Azure Backup (Trusted launch session hosts need an **Enhanced** backup policy):

| Restore option | Use |
| --- | --- |
| Replace existing | Puts the recovery point's disks back on the existing VM, which must still exist |
| Create new | New VM from the recovery point |
| Restore disks | Disks only, to build the VM yourself |
| File recovery | Mounts the recovery point to copy individual files |

**Images.** Azure Compute Gallery is regional: keep image versions replicated to each region of use (or a gallery per region), use **Standard_ZRS** replicas where available, and at least three replicas for production images (one per 20 VMs created concurrently). Protect them against deletion with resource locks, `allowDeletionOfReplicatedLocations` = `false` and `BlockDeletionBeforeEndOfLife`. To roll back a bad image, keep the previous version and set `excludeFromLatest` on the faulty one.

> **Exam trap.** Restoring a profile VHDX while the user is still signed in fails or is overwritten at sign-out. Sign the user out first, and restore to an alternate location when only a few files are needed.

<!-- section: key-points -->
## Key points

- Pooled: update the image, then replace hosts; session host update needs a host pool created with a session host configuration, disable autoscale during the update.
- Personal: in-place updates; Intune on multi-session uses the settings catalog, not update rings.
- DR: pooled = secondary host pool + Cloud Cache (active-active or active-passive); personal = Site Recovery, no test failover.
- Multi-region: Cloud Cache with local storage first, domain controllers and Entra Connect staging server in the secondary region, a gallery or replicas per region; zones aren't DR.
- Backup: Azure Files backup for profiles (snapshot or vaulted, 200 recovery points), ANF snapshots and backup, VM backup for personal desktops, pooled hosts rebuilt from image.
- Restore a profile with item-level restore while the user is signed out.
