Azure Files provides managed file shares; Blob Storage stores objects in containers. This chapter covers their creation, the access tiers and the features that protect data against deletion and overwriting.

<!-- section: file-shares | objectives: 2.3.1 -->
## Azure file shares

An Azure file share is a fully managed share that Windows, Linux and macOS clients mount, in Azure or on-premises.

| Protocol | Port | Available on | Authentication |
| --- | --- | --- | --- |
| **SMB** (2.1, 3.0, 3.1.1) | TCP 445 | Standard (HDD) and premium (SSD) shares | Identity-based (Kerberos) or storage account key |
| **NFS** 4.1 | TCP 2049 | **Premium (SSD) shares only**, in a `FileStorage` account | Network-based: virtual network rules or private endpoint; no Windows ACLs |

A share uses **either SMB or NFS**, chosen at creation; both kinds can coexist in the same premium account.

Tiers of standard shares, changeable at any time between themselves:

| Tier | Storage cost | Transaction cost | Use |
| --- | --- | --- | --- |
| Transaction optimized | Highest of the standard tiers | Lowest | Transaction-heavy workloads, **migrations** |
| Hot | Medium | Medium | General-purpose team shares |
| Cool | Lowest | Highest | Archives that stay online |
| Premium | Provisioned size (SSD) | Included | Low latency, high IOPS; separate account type |

You can't move a share between standard (HDD) and premium (SSD): create a new share and copy the data.

- The **quota** is the maximum size of the share (up to 100 TiB).
- Mounting: the portal's **Connect** button gives a ready-made script per operating system.

```powershell
net use Z: \\stor1.file.core.windows.net\share1 /user:Azure\stor1 <storage account key>
```

```bash
sudo mount -t cifs //stor1.file.core.windows.net/share1 /mnt/share1 \
  -o username=stor1,password=<storage account key>,serverino,nosharesock,actimeo=30
```

- If port 445 is blocked, mounting over the internet fails. From on-premises, use a VPN or ExpressRoute with a private endpoint.
- **Azure File Sync** synchronizes Windows file servers with an Azure file share: a *Storage Sync Service* contains *sync groups*; each sync group has one **cloud endpoint** (the share) and one or more **server endpoints** (folders on registered servers with the agent). **Cloud tiering** keeps only recently used files on the server.

```bash
az storage share-rm create -g RG1 --storage-account stor1 --name share1 \
  --quota 1024 --access-tier TransactionOptimized
```

<!-- section: blob-containers | objectives: 2.3.2 -->
## Blob containers

A container groups blobs; an account holds any number of containers. Blob URL: `https://<account>.blob.core.windows.net/<container>/<blob>`. Container names are 3 to 63 characters: lowercase letters, digits and hyphens. "Folders" are only prefixes in blob names (`2026/11/report.pdf`), unless the account has a hierarchical namespace.

**Anonymous access** depends on two settings:

1. The account setting *Allow Blob anonymous access* (disabled by default). When it is disabled, no container can be anonymous, whatever its level.
2. The container **access level**:

| Level | Anonymous clients can |
| --- | --- |
| Private (no anonymous access) | Nothing. Default |
| Blob | Read a blob whose URL they know. Can't list the container |
| Container | Read and **list** the blobs of the container |

```bash
az storage container create --account-name stor1 --name images --public-access blob
az storage container set-permission --account-name stor1 --name images --public-access off
```

Changing the anonymous access level of a container can't be authorized with Microsoft Entra ID (`--auth-mode login` is rejected): use the account key.

**Immutable storage** (WORM: write once, read many) is configured on a container or on blob versions:

| Policy | Behavior |
| --- | --- |
| Time-based retention | Blobs can be created and read, but not modified or deleted, for the retention period. *Unlocked*: can be changed or removed. **Locked**: can't be removed; the period can only be extended |
| Legal hold | Same protection without duration, until the hold is explicitly cleared |

A container can also hold a default **encryption scope** and be protected by **container soft delete** (see below).

<!-- section: access-tiers | objectives: 2.3.3 -->
## Storage access tiers

Blob tiers trade storage price against access price:

| Tier | Storage cost | Access cost | Minimum duration | Availability |
| --- | --- | --- | --- | --- |
| **Hot** | Highest | Lowest | None | Online |
| **Cool** | Lower | Higher | 30 days | Online |
| **Cold** | Lower still | Higher still | 90 days | Online |
| **Archive** | Lowest | Highest | 180 days | **Offline** |

- A blob moved or deleted before the minimum duration incurs an **early deletion charge** for the remaining days (deleted after 20 days in Cold: 70 days charged).
- The **default access tier** of an account can be Hot, Cool or Cold; blobs without an explicit tier inherit it. **Archive** is set **blob by blob**, never as account default.
- Tiers apply to **block blobs** in standard general-purpose v2 accounts (and Blob Storage accounts). Premium accounts have no tiers.
- Archive requires LRS, GRS or RA-GRS redundancy.

An archived blob can't be read or modified; only its metadata and properties are visible. To read it, **rehydrate** it:

| Method | Result |
| --- | --- |
| Change its tier (Set Blob Tier) to Hot, Cool or Cold | The same blob comes back online |
| Copy it (Copy Blob) to a new blob in an online tier | The archived source stays unchanged: no early deletion charge on it |

Rehydration priority: **Standard** (up to 15 hours) or **High** (may take less than one hour for objects under 10 GB, more expensive).

```bash
az storage blob set-tier --account-name stor1 --container-name logs --name app.log \
  --tier Archive
az storage blob set-tier --account-name stor1 --container-name logs --name app.log \
  --tier Hot --rehydrate-priority High
```

<!-- section: files-snapshots-soft-delete | objectives: 2.3.4 -->
## Snapshots and soft delete for Azure Files

| Feature | Level | Protects against | Details |
| --- | --- | --- | --- |
| **Share snapshot** | Whole share, read-only, point in time | Accidental modification or deletion of **files** | Incremental; up to **200** per share; individual files or the whole share can be restored |
| **Soft delete** | Share | Accidental deletion of the **share** | Enabled per storage account for all its shares; retention **1 to 365 days**; *undelete* restores the share with its snapshots |

- On Windows, snapshots of a mounted SMB share appear in the **Previous Versions** tab of files and folders: users restore files themselves.
- A share that has snapshots can't be deleted unless its snapshots are deleted too. Deleting the share deletes its snapshots (they come back if the soft-deleted share is undeleted).
- Soft delete doesn't protect individual files: use snapshots or Azure Backup for file shares, which schedules snapshots and manages their retention.
- A soft-deleted share is billed at snapshot rates until it is permanently deleted at the end of the retention period.

```bash
az storage share snapshot --account-name stor1 --name share1
az storage account file-service-properties update -g RG1 -n stor1 \
  --enable-delete-retention true --delete-retention-days 14
az storage share-rm restore -g RG1 --storage-account stor1 -n share1 --deleted-version <version>
```

<!-- section: lifecycle-management | objectives: 2.3.5 -->
## Blob lifecycle management

A lifecycle management policy is a set of rules, defined on the account, that Azure Storage runs once a day to move blobs to a cooler tier or delete them. No script, no cost for the policy itself.

```json
{
  "rules": [
    {
      "name": "archive-then-delete",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": { "blobTypes": [ "blockBlob" ], "prefixMatch": [ "scans/2026" ] },
        "actions": {
          "baseBlob": {
            "tierToCool":    { "daysAfterModificationGreaterThan": 30 },
            "tierToArchive": { "daysAfterModificationGreaterThan": 90 },
            "delete":        { "daysAfterModificationGreaterThan": 3650 }
          },
          "snapshot": { "delete": { "daysAfterCreationGreaterThan": 90 } },
          "version":  { "delete": { "daysAfterCreationGreaterThan": 90 } }
        }
      }
    }
  ]
}
```

| Element | Values |
| --- | --- |
| Filters | `blobTypes` (required), `prefixMatch` (starts with the **container name**), `blobIndexMatch` (blob index tags). Filters only include; they can't exclude |
| Actions | `tierToCool`, `tierToCold`, `tierToArchive`, `delete`, and `enableAutoTierToHotFromCool` |
| Conditions on current blobs | `daysAfterModificationGreaterThan`, `daysAfterCreationGreaterThan`, `daysAfterLastAccessTimeGreaterThan`, `daysAfterLastTierChangeGreaterThan` (for `tierToArchive`) |
| Conditions on snapshots and versions | `daysAfterCreationGreaterThan` |

Rules to remember:

- Conditions based on the **last access** require **access time tracking** to be enabled on the account.
- If several actions match the same blob, the least expensive one applies: delete, then archive, then cold, then cool.
- A new or changed policy can take up to 24 hours to take effect, and the run itself can take time.
- Lifecycle management never rehydrates an archived blob.
- The delete action of a policy respects soft delete: deleted blobs stay recoverable during the retention period.

<!-- section: versioning-data-protection | objectives: 2.3.6 -->
## Blob versioning and data protection

| Feature | What it does | Scope |
| --- | --- | --- |
| **Blob versioning** | Each overwrite or deletion keeps the previous state as an immutable **version** with a version ID | Account |
| **Blob soft delete** | A deleted blob, version or snapshot stays recoverable for 1 to 365 days | Account |
| **Container soft delete** | A deleted container stays recoverable, with its content, for 1 to 365 days | Account |
| **Blob snapshot** | Read-only copy taken manually at a point in time | Blob |
| **Change feed** | Ordered log of every change to blobs | Account |
| **Point-in-time restore** | Returns block blobs of containers to an earlier state | Account |

Versioning in practice:

- The latest write is the **current version**; older ones are **previous versions**. Deleting a blob removes the current version and keeps the previous ones.
- To restore, **copy a previous version over the base blob**, or make it the current version in the portal.
- Versions are billed for the data they hold: combine versioning with a lifecycle rule that deletes old versions.
- Versioning doesn't protect against the deletion of the container or of the account: add container soft delete and a `CanNotDelete` lock.
- Versioning isn't available on accounts with a hierarchical namespace.

Point-in-time restore requires **versioning, blob soft delete and the change feed**; its retention must be at least one day shorter than the soft delete retention. It works on block blobs of standard general-purpose v2 accounts and doesn't restore deleted containers.

Microsoft's recommended baseline for an account holding important blobs: a `CanNotDelete` lock on the account, container soft delete, blob soft delete and versioning.

```bash
az storage account blob-service-properties update -g RG1 -n stor1 \
  --enable-versioning true --enable-delete-retention true --delete-retention-days 14 \
  --enable-container-delete-retention true --container-delete-retention-days 14
```

<!-- section: key-points -->
## Key points

- A share is SMB or NFS; NFS needs a premium share. Standard tiers: transaction optimized, hot, cool.
- Anonymous access needs the account setting **and** a container level (Blob: read only; Container: read and list).
- Hot, Cool (30 days), Cold (90 days), Archive (180 days, offline, per blob, not with ZRS). Rehydration: up to 15 hours, or High priority.
- Azure Files: 200 snapshots per share, visible in Previous Versions; soft delete protects shares, 1 to 365 days.
- Lifecycle rules: `prefixMatch` starts with the container name; last-access conditions need access tracking; effect within 24 hours.
- Versioning keeps previous versions; point-in-time restore needs versioning, soft delete and change feed.
