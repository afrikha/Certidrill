A storage account is protected in four layers that SC-500 questions test separately: the account's own security settings (transport, anonymous access, keys, encryption), the storage firewall, threat protection with Microsoft Defender for Storage, and the authorization of each request (Microsoft Entra roles, shared access signatures and stored access policies). A request succeeds only if it passes the network check **and** the authorization check.

<!-- section: account-hardening | objectives: 2.1.1 -->
## Hardening the storage account

Most settings are on the account's **Settings > Configuration** page and are enforced at scale with Azure Policy (`Audit` to report, `Deny` to block creating or changing a noncompliant account).

| Setting (portal) | Property | Secure value | Effect and details |
| --- | --- | --- | --- |
| Secure transfer required | `supportsHttpsTrafficOnly` | Enabled | Requests over HTTP fail |
| Minimum TLS version | `minimumTlsVersion` | `TLS1_2` | Older TLS requests fail with 400 (Bad Request). Azure Storage supports TLS 1.2 and 1.3: since February 3, 2026, TLS 1.0 and 1.1 are no longer supported, for new and existing accounts. The portal sets 1.2 for new accounts; with CLI, PowerShell or a template the property isn't set until you configure it. TLS 1.2 is the recommended minimum; TLS 1.3 can't be enforced as the minimum |
| Allow Blob anonymous access | `allowBlobPublicAccess` | Disabled | Overrides the access level of every container. Up to 30 seconds to propagate |
| Allow storage account key access | `allowSharedKeyAccess` | Disabled | Requests signed with an account key, including service SAS and account SAS, fail with 403. Not set (null) means allowed |
| Default to Microsoft Entra authorization in the Azure portal | `defaultToOAuthAuthentication` | Enabled | The portal uses the user's Entra identity instead of the key when browsing data; users can still switch |
| Infrastructure encryption | `requireInfrastructureEncryption` | Enabled when compliance requires double encryption | Second AES-256 layer with a different key, Microsoft-managed. **Only at account creation** |

```bash
az storage account update --resource-group RG-Data --name stcontosodata \
  --https-only true --min-tls-version TLS1_2 \
  --allow-blob-public-access false --allow-shared-key-access false
```

Container access levels are **Private** (default), **Blob** (anonymous read of blobs, not of the container listing) and **Container** (anonymous read and list). When the account disallows anonymous access, containers set to Blob or Container stop accepting anonymous requests; you don't need to change each container. The `$web` container of a static website stays public.

> **Exam trap.** Disabling Shared Key access breaks every SAS signed with the account key and, by default, access to Azure file shares in the portal. Microsoft's order is: find the clients that use Shared Key (metrics and logs), move them to Microsoft Entra ID or user delegation SAS, then disable the key, then switch the policy from `Audit` to `Deny`.

**Encryption at rest** is always on (AES-256, Microsoft-managed keys). Customer-managed keys (CMK) give you control and revocation:

| CMK requirement | Value |
| --- | --- |
| Key store | Azure Key Vault or Azure Key Vault Managed HSM, any region, subscription or Microsoft Entra tenant |
| Vault settings | Soft delete **and** purge protection enabled |
| Key | RSA or RSA-HSM, 2048, 3072 or 4096 bits |
| Identity | Existing account: system-assigned or user-assigned managed identity. **New account: user-assigned only** |
| Permissions of the identity | `get`, `wrapkey`, `unwrapkey` on the key |
| Key version | Omit the version to follow rotation automatically (checked daily); wait 24 hours before disabling the old version |
| Revocation | Disable the key: reads and writes fail with 403 for everyone |
| Coverage | Blob Storage and Azure Files always; Queue and Table only if chosen at account creation |

Data protection settings complete the hardening: blob and container **soft delete**, blob versioning, **immutable storage** (WORM: time-based retention from 1 day to 146,000 days, or legal hold with tags), a `CanNotDelete` **resource lock** on the account (it protects the account and its configuration, not the data inside), and **Disallow cross-tenant object replication** (already the default for accounts created after December 15, 2023; on older accounts the property is null, which allows cross-tenant replication).

> **Exam trap.** A locked time-based retention policy can be extended but never shortened or deleted (five extensions at most for a container-level policy). Use an unlocked policy only for short tests.

<!-- section: storage-firewall | objectives: 2.1.2 -->
## Configuring the storage firewall

The account's **Networking** page sets public network access:

| Option | Effect |
| --- | --- |
| Enabled from all networks | Default: any network reaches the public endpoint (authorization still applies) |
| Enabled from selected networks | Only the listed virtual networks, IP ranges and resource instances pass; everything else is denied |
| Disabled | The public endpoint rejects all traffic; only private endpoints work (exceptions already configured stay in effect, see below) |
| Secured by perimeter | Access is governed by a network security perimeter |

With selected networks, four kinds of rules allow traffic:

| Rule | Allows | Limits and conditions |
| --- | --- | --- |
| Virtual network rule | A subnet, from any subscription or tenant | Up to 400 per account. The subnet needs a service endpoint: `Microsoft.Storage` (accounts in the same region) or `Microsoft.Storage.Global` (any region), only one of the two per subnet |
| IP network rule | A public IPv4 address or CIDR range | Up to 400 per account. No private ranges (10, 172.16 to 172.31, 192.168), no `/31` or `/32` (enter single addresses), no IPv6. **No effect on clients in the same Azure region** |
| Resource instance rule | A specific resource instance (for example one Azure Synapse workspace) | Same tenant as the account; its managed identity still needs a role |
| Exceptions | Trusted Microsoft services; read access to logs and metrics | Trusted services take precedence over other network restrictions |

```bash
az storage account update --resource-group RG-Data --name stcontosodata \
  --default-action Deny --bypass AzureServices Logging Metrics
az network vnet subnet update --resource-group RG-Net --vnet-name VNet-App \
  --name snet-app --service-endpoints Microsoft.Storage
az storage account network-rule add --resource-group RG-Data \
  --account-name stcontosodata --vnet-name VNet-App --subnet snet-app
az storage account network-rule add --resource-group RG-Data \
  --account-name stcontosodata --ip-address 131.107.0.0/16
```

Behaviors that decide answers:

- Firewall rules apply to the **data plane** only. Managing the account (control plane) isn't filtered.
- A subnet with a service endpoint reaches the account with its **private** source address, so an IP rule for the virtual network's public IP has no effect.
- For on-premises clients over ExpressRoute Microsoft peering, the IP rules list the NAT public addresses used for that peering.
- Deleting a subnet removes its rule; a new subnet with the same name must be added again.
- Switching public network access to **Disabled** after *Enabled from selected networks* keeps the resource instances and exceptions already configured, trusted services included: those services may still reach the account, because trusted service access takes precedence.
- Changes that remove restrictions can take up to a minute to apply.
- A **private endpoint** gives the account a private IP address per sub-resource (`blob`, `file`, `dfs`...) with the zone `privatelink.blob.core.windows.net`; it keeps working when public network access is disabled.

> **Exam trap.** Virtual machines in the same region as the account can't be allowed by an IP rule, even through their public IP addresses. Use a virtual network rule with a service endpoint, or a private endpoint.

<!-- section: defender-for-storage | objectives: 2.1.3 -->
## Implementing Defender for Storage

Defender for Storage is a Defender for Cloud plan, **agentless**, that protects Blob Storage, Azure Files and Azure Data Lake Storage. The current plan is billed per protected storage account, plus a per-gigabyte charge for malware scanning; accounts on **Defender for Storage (classic)** must migrate to get the current features.

| Component | What it does | Notes |
| --- | --- | --- |
| Activity monitoring | Analyzes data plane and control plane telemetry and raises alerts on unusual or potentially harmful access, such as suspicious data extraction | Always on with the plan; no need to enable resource logs; no performance impact |
| Malware scanning | Scans blobs with Microsoft Defender Antivirus **on upload** or **on demand** (account, container, single blob or path prefix) | Default cap **10,000 GB per account per month**, adjustable; up to 50 GB per blob; on-upload scanning isn't supported for Azure Files, page blobs or append blobs; legacy v1 accounts, blobs uploaded with NFS 3.0 and client-side encrypted blobs aren't scanned (CMK-encrypted blobs are) |
| Sensitive data threat detection | Finds sensitive data with smart sampling (Microsoft Purview sensitive information types) to help prioritize alerts on the accounts that hold it | No additional cost; can be turned off |

Enable the plan at the **subscription** level (recommended: existing and new accounts are covered, and you can exclude accounts) in **Defender for Cloud > Environment settings > subscription > Defender plans > Storage**, then use **Settings** to turn malware scanning and sensitive data threat detection on or off and set the cap. A storage account can **override** the subscription settings with its own configuration. At scale, use the built-in Azure Policy definition, which also covers future subscriptions of a management group; Bicep, ARM, Terraform, PowerShell and the REST API work too.

| Permission needed | Who |
| --- | --- |
| Enable the plan (activity monitoring) at subscription level | Security Admin (or `Microsoft.Security/pricings` read and write) |
| Enable malware scanning or sensitive data threat detection at subscription level | Subscription **Owner** (the feature creates role assignments) |

Malware scan results go to:

- **Blob index tags** on each scanned blob (`No threats found`, `Malicious`, `Error`, `Not scanned`, plus the scan time). On by default; not tamper-proof, so don't use them as the only control.
- **Security alerts** in Defender for Cloud for malicious files, which can be exported to Microsoft Sentinel.
- Optionally an **Event Grid custom topic** (same region, public network access, event type `Microsoft.Security.MalwareScanningResult`) to trigger a function or a logic app, and a **Log Analytics** workspace (table `StorageMalwareScanningResults`).
- The **soft delete malicious blobs** option (off by default) soft-deletes malicious blobs and enables blob soft delete if needed (retention 7 days by default, 1 to 365).

Enabling malware scanning creates an Event Grid system topic in the account's resource group and a `StorageDataScanner` resource; when the firewall uses selected networks, that scanner is added to the **resource instances** list so scanning keeps working.

> **Exam trap.** Malware scanning stops for the rest of the month once the cap is reached (alerts at 75 % and 100 %; up to 20 GB deviation; reset at midnight UTC at the end of the month). A cap set at the subscription level is allocated to each account. If uploads exceed 10,000 GB a month on one account, raise the cap at the subscription or account level.

<!-- section: storage-access | objectives: 2.1.4 -->
## Managing access to storage

| Method | How access is granted | Revocation |
| --- | --- | --- |
| Microsoft Entra ID | Azure RBAC data roles (Storage Blob Data Reader, Contributor, Owner; Storage Queue Data...; Storage File Data SMB Share...) | Remove the role assignment |
| Shared Key | Any of the two account keys: full access | Rotate the key |
| Shared access signature (SAS) | A signed token with services, resources, permissions, times, optional IP range and HTTPS-only | Depends on the type |

Holding `Microsoft.Storage/storageAccounts/listkeys/action` (Owner, Contributor, Storage Account Contributor, Reader and Data Access) means reading all data with the key. To browse blob data with Entra ID in the portal, a user needs a data role **and** at least Reader on the account or above.

| SAS type | Signed with | Covers | Stored access policy |
| --- | --- | --- | --- |
| User delegation SAS | User delegation key obtained with Microsoft Entra credentials (valid up to 7 days) | Blob and Data Lake Storage, Queue, Table, Azure Files | No |
| Service SAS | Account key | One service | **Yes** |
| Account SAS | Account key | One or more services, plus service-level operations | No |

The principal requesting a user delegation key needs `.../blobServices/generateUserDelegationKey` at the account, resource group or subscription scope (for example Storage Blob Delegator or any Storage Blob Data role). A user delegation SAS keeps working when Shared Key access is disabled, and it can't grant more than the creator's own permissions. Revoke it by calling **Revoke User Delegation Keys** (quickest) or by removing the creator's role assignment.

A **stored access policy** is defined on a container, file share, queue or table (up to **five** per resource) with an identifier, a start time, an expiry time and permissions. A service SAS that references it inherits those values; each value is set either in the policy or in the SAS, never in both. Revoke all SAS tokens linked to it by deleting the policy, renaming its identifier or setting its expiry in the past; changes take up to 30 seconds.

```bash
az storage container policy create --account-name stcontosodata \
  --container-name invoices --name read-30d --permissions rl \
  --expiry 2026-12-31T00:00Z
az storage blob generate-sas --account-name stcontosodata \
  --container-name invoices --name 2026-11.pdf --policy-name read-30d
az storage blob generate-sas --account-name stcontosodata \
  --container-name invoices --name 2026-11.pdf --permissions r \
  --expiry 2026-11-20T00:00Z --auth-mode login --as-user
```

Two more controls: the **SAS expiration policy** of the account sets a recommended maximum validity for service and account SAS (users get a warning and the event is logged), and a service SAS without a stored access policy should expire within one hour, because it can be revoked only by rotating the key.

| Requirement | Answer |
| --- | --- |
| Give an app limited, revocable access without account keys | User delegation SAS |
| Revoke many service SAS tokens without rotating keys | Stored access policy, then delete or edit it |
| Revoke an ad hoc account SAS | Rotate the account key that signed it |
| Grant a whole group read access to one container | Storage Blob Data Reader on the container scope |
| Force every client to use Microsoft Entra ID | Disallow Shared Key access |

> **Exam trap.** Stored access policies work only with **service SAS**. A user delegation SAS or an account SAS can't reference one, so "revoke without rotating keys" for an account SAS has no answer other than rotating the key.

<!-- section: key-points -->
## Key points

- Secure transfer, minimum TLS 1.2, no anonymous access and no Shared Key are the four account switches; enforce them with Azure Policy `Deny`.
- CMK needs soft delete and purge protection on the vault, an RSA key and a managed identity (user-assigned when the account is created); infrastructure encryption is set only at creation.
- Storage firewall: up to 400 IP rules and 400 virtual network rules, public IPv4 only, no effect on same-region clients; rules filter the data plane only.
- Defender for Storage: per-account plan, on-upload and on-demand malware scanning (10,000 GB monthly cap by default), sensitive data threat detection, results in index tags, alerts, Event Grid and Log Analytics.
- User delegation SAS is preferred; stored access policies (five per container) exist only for service SAS; revoking an account SAS means rotating the key.
