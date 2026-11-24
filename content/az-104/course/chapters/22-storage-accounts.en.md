A storage account is the container of the Azure Storage services: blobs, file shares, queues and tables. Its type, redundancy and encryption are chosen at creation; some of these choices are final, which is exactly what the exam tests.

<!-- section: account-types | objectives: 2.2.1 -->
## Creating and configuring storage accounts

| Account type (`kind`) | Performance | Services | Redundancy | Typical use |
| --- | --- | --- | --- | --- |
| Standard general-purpose v2 (`StorageV2`) | Standard (HDD) | Blobs, files, queues, tables | LRS, ZRS, GRS, RA-GRS, GZRS, RA-GZRS | The default choice |
| Premium block blobs (`BlockBlobStorage`) | Premium (SSD) | Block and append blobs | LRS, ZRS | High transaction rates, small objects, low latency |
| Premium file shares (`FileStorage`) | Premium (SSD) | Azure Files only | LRS, ZRS | Enterprise file shares; **required for NFS shares** |
| Premium page blobs | Premium (SSD) | Page blobs | LRS, ZRS | Page blobs (unmanaged disks) |

Rules:

- The name is **globally unique**, 3 to 24 characters, **lowercase letters and digits only** (no hyphen). It forms the endpoints: `https://<name>.blob.core.windows.net`, `.file.`, `.queue.`, `.table.`, `.dfs.`, `.web.`.
- The **account type can't be changed** after creation: to go from standard to premium, create a new account and copy the data.
- The redundancy, the default access tier (Hot, Cool or Cold) and most security settings can be changed later.
- **Hierarchical namespace** (Azure Data Lake Storage) is chosen at creation; an existing account can be upgraded, but not downgraded.
- Blob types: **block** blobs (files, up to about 190 TiB), **append** blobs (logs), **page** blobs (random access, disks).

Security settings on the account: *Secure transfer required* (HTTPS only, enabled by default), minimum TLS version, *Allow Blob anonymous access* (disabled by default), *Allow storage account key access*.

```bash
az storage account create -g RG1 -n stcontoso001 -l westeurope \
  --kind StorageV2 --sku Standard_ZRS --access-tier Hot --min-tls-version TLS1_2
az storage account create -g RG1 -n stcontosofast -l westeurope \
  --kind BlockBlobStorage --sku Premium_LRS
```

```powershell
New-AzStorageAccount -ResourceGroupName RG1 -Name stcontoso001 -Location westeurope `
  -Kind StorageV2 -SkuName Standard_GRS
```

<!-- section: redundancy | objectives: 2.2.2 -->
## Storage redundancy

Azure Storage always keeps at least three copies. The redundancy option decides where:

| Option | Copies | Survives a datacenter failure | Survives a zone failure | Survives a region failure | Read from the secondary without failover |
| --- | --- | --- | --- | --- | --- |
| **LRS** | 3, synchronous, one datacenter | No | No | No | No |
| **ZRS** | Synchronous, across three or more availability zones | Yes | Yes | No | No |
| **GRS** | LRS in the primary + 3 asynchronous copies (LRS) in the paired region | Yes | Yes | Yes | No |
| **RA-GRS** | GRS | Yes | Yes | Yes | **Yes** |
| **GZRS** | ZRS in the primary + 3 asynchronous copies (LRS) in the paired region | Yes | Yes | Yes | No |
| **RA-GZRS** | GZRS | Yes | Yes | Yes | **Yes** |

How to choose from the wording of a question:

| Requirement | Answer |
| --- | --- |
| Lowest cost, no resilience requirement | LRS |
| "Remain available if a datacenter or zone fails" in the region; data must stay in the region | ZRS |
| "Protect against a regional outage" | GRS (or GZRS if zone resilience is also required) |
| "Applications must be able to **read** during a regional outage", "without failover" | RA-GRS or RA-GZRS |

Details worth knowing:

- With RA-GRS and RA-GZRS, the secondary endpoint is `https://<name>-secondary.blob.core.windows.net`. The application must be written to use it. Because replication is asynchronous, the secondary can be slightly behind: the **Last Sync Time** property tells up to when writes are guaranteed to be there.
- The secondary region is the **paired region**; you don't choose it.
- **Failover.** A *customer-managed unplanned failover* makes the secondary the new primary while the primary is unavailable; the account becomes **LRS** in the new region, data written after the Last Sync Time is lost, and geo-redundancy must be reconfigured. A *planned failover* swaps both regions while both are available, without data loss. A Microsoft-managed failover happens only for a whole region in extreme cases.
- **Changing redundancy.** Adding or removing geo-replication (LRS to GRS, GRS to RA-GRS) is a simple setting change (`az storage account update --sku Standard_GRS`). Adding or removing **zone** redundancy (LRS to ZRS) requires a **conversion** that you request (`az storage account migration start`), without downtime.
- The **Archive tier** is supported only with LRS, GRS and RA-GRS: not with ZRS, GZRS or RA-GZRS.
- Premium accounts support only LRS and ZRS.

<!-- section: object-replication | objectives: 2.2.3 -->
## Object replication

Object replication asynchronously copies **block blobs** from a container of a source account to a container of a destination account, in the same region or another one, even in another subscription or tenant. Use it to bring data closer to readers or to keep a copy in a region of your choice.

Prerequisites and rules:

| Rule | Value |
| --- | --- |
| Account types | General-purpose v2 or premium block blobs, on both sides |
| **Blob versioning** | Enabled on the **source and the destination** |
| **Change feed** | Enabled on the **source** |
| Policy | One replication policy per source-destination pair, made of rules (source container, destination container, optional prefix filter) |
| Destinations | A source account can replicate to at most two destination accounts |
| Destination container | Becomes read-only for writes: writing returns 409 (Conflict); reads and deletes stay possible |
| Existing blobs | By default only the blobs created after the rule are copied; you can choose to copy everything or from a given date |
| Tiers | Source and destination blobs can be in different online tiers; archived blobs can't be replicated |
| Cross-tenant | Blocked by default on recent accounts (`AllowCrossTenantReplication` = false) |

With the command line, the policy is created on the destination first; its generated ID is then used to create the same policy on the source. The portal does both steps for you.

> **Exam trap.** Object replication isn't the redundancy of the account. GRS copies the whole account to the paired region and you can't choose the target; object replication copies selected containers to an account you choose.

<!-- section: encryption | objectives: 2.2.4 -->
## Storage account encryption

All data written to Azure Storage is encrypted at rest with 256-bit AES (**Storage Service Encryption**). It is always on, free, and can't be disabled. What you choose is the key:

| Key option | Who manages the key | Notes |
| --- | --- | --- |
| **Microsoft-managed keys** | Microsoft | Default |
| **Customer-managed keys** (CMK) | You, in Azure Key Vault or Managed HSM | Applies to the account or to an encryption scope |
| Customer-provided keys | The client sends the key with each Blob Storage request | Blobs only |

Requirements of customer-managed keys:

- The key vault must have **soft delete and purge protection** enabled.
- The key is RSA (or RSA-HSM) of 2048, 3072 or 4096 bits.
- The storage account reaches the vault with a **managed identity** that needs the `get`, `wrapKey` and `unwrapKey` permissions (role *Key Vault Crypto Service Encryption User*). When CMK is configured **at account creation**, the identity must be **user-assigned**; on an existing account, a system-assigned identity also works.
- If no key version is specified, the account automatically picks up new versions of the key.
- By default, queues and tables aren't covered by a customer-managed key. They are only if the account was **created** with account-scoped keys for these services; this can't be changed later.
- Disabling or deleting the key makes the data inaccessible.

Two more features:

- **Infrastructure encryption** adds a second encryption layer with a different Microsoft-managed key. For the whole account, it can be enabled **only at creation**.
- An **encryption scope** applies its own key (Microsoft-managed or customer-managed) to a container or to individual blobs. A container can have a default scope and forbid overrides. A scope can be disabled but not deleted.

Encryption **in transit** is separate: *Secure transfer required* enforces HTTPS and SMB encryption.

<!-- section: storage-tools | objectives: 2.2.5 -->
## Azure Storage Explorer and AzCopy

**Azure Storage Explorer** is a graphical application for Windows, macOS and Linux (the portal offers a similar *Storage browser*). You upload, download and manage blobs, files, queues and tables, change tiers and generate SAS.

- Signing in with a Microsoft Entra account lists the subscriptions and accounts, which requires control plane read access (Reader). The data operations then use your data roles or, if you hold `listKeys`, the account key.
- Without control plane access, **attach** a resource directly: by its URL with Microsoft Entra ID, by a SAS URL, or by account name and key.

**AzCopy** is the command-line tool for transfers to, from and between storage accounts.

```bash
azcopy login                      # Microsoft Entra ID; or append a SAS token to each URL
azcopy make  "https://stor1.blob.core.windows.net/backups"
azcopy copy  "C:\data" "https://stor1.blob.core.windows.net/backups" --recursive
azcopy copy  "https://stor1.blob.core.windows.net/c1?<SAS>" \
             "https://stor2.blob.core.windows.net/c1?<SAS>" --recursive
azcopy sync  "C:\data" "https://stor1.blob.core.windows.net/backups" --delete-destination=true
```

| Command | Behavior |
| --- | --- |
| `azcopy copy` | Copies everything from source to destination. Between two accounts, the copy is done server to server, without passing through your computer |
| `azcopy sync` | Compares names and last modified times and transfers only what is new or changed. Deletes extra destination files only with `--delete-destination=true` |
| `azcopy make` / `list` / `remove` | Create a container or share, list, delete |

Authorization:

- With Microsoft Entra ID, the identity needs a **data role**: Storage Blob Data Reader to download, Storage Blob Data Contributor to upload. Owner or Contributor alone isn't enough.
- With SAS, each URL that needs authorization carries its own token.
- AzCopy doesn't accept the account key directly.
- Useful options: `--recursive`, `--include-pattern`, `--exclude-pattern`, `--dry-run`, `--block-blob-tier`.

For very large offline transfers, Azure offers Data Box devices and the Import/Export service (shipping disks).

<!-- section: key-points -->
## Key points

- Name: 3 to 24 lowercase letters and digits. Account type is final; redundancy isn't.
- Premium accounts: LRS or ZRS only. NFS shares: premium file shares account.
- LRS (one datacenter), ZRS (three or more zones), GRS (plus paired region), RA- (readable secondary, `-secondary` endpoint), GZRS (zones plus region).
- Unplanned failover leaves the account in LRS. Archive isn't available with ZRS, GZRS, RA-GZRS.
- Object replication: block blobs, versioning on both accounts, change feed on the source, destination read-only.
- Encryption at rest is always on. Customer-managed keys: vault with soft delete and purge protection, managed identity. Infrastructure encryption: at creation only.
- `azcopy sync` transfers the differences; `azcopy copy` copies everything. Data roles are required with Microsoft Entra ID.
