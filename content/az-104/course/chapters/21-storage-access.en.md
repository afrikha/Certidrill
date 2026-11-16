A request to a storage account must pass two checks: the **network** check (is the caller allowed through the firewall?) and the **authorization** check (does the caller hold a key, a token or a role?). This chapter covers both.

<!-- section: authorization-overview | objectives: 2.1.2, 2.1.4 -->
## Four ways to authorize a request

| Method | Proof presented | Scope | Revocation |
| --- | --- | --- | --- |
| Microsoft Entra ID | An OAuth token; access is given by Azure RBAC **data roles** | Account, container, share... | Remove the role assignment |
| Shared Key | One of the two **account access keys** | Everything in the account, all rights | Regenerate the key |
| Shared access signature (SAS) | A signed token in the URL | Limited services, resources, permissions and time | Depends on the SAS type |
| Anonymous access | Nothing | Blobs of a container whose access level allows it | Change the container access level |

Microsoft recommends Microsoft Entra ID whenever the client supports it. Blob, Queue and Table storage and Azure Files (REST and SMB) support it.

<!-- section: storage-firewall | objectives: 2.1.1 -->
## Storage firewalls and virtual networks

The **Networking** page of the account sets *Public network access*:

| Setting | Effect |
| --- | --- |
| Enabled from all networks | Default. Any network can reach the public endpoint (authorization still applies) |
| Enabled from selected virtual networks and IP addresses | The default action becomes **Deny**; only the listed sources pass |
| Disabled | The public endpoint rejects everything; only **private endpoints** work |

Rules that can be added when access is restricted:

| Rule | Allows | Details |
| --- | --- | --- |
| Virtual network rule | A **subnet** of a virtual network | The subnet needs the `Microsoft.Storage` **service endpoint** (same region as the account, or its paired region) or `Microsoft.Storage.Global` (any region). The portal enables it for you; CLI and PowerShell need a separate step. No extra cost |
| IP network rule | A **public** IPv4 address or CIDR range | For on-premises or internet clients. Private ranges (10.x, 172.16.x, 192.168.x) are refused. `/31` and `/32` aren't accepted: enter single addresses. **No effect on clients in the same Azure region as the account**: use a virtual network rule for them |
| Resource instance rule | A specific Azure resource instance (for example one Azure Data Factory) | Access still depends on the role given to its managed identity |
| Exception: trusted Azure services | A list of Microsoft services running outside your network (Azure Backup, Azure Site Recovery, Event Grid...) | Doesn't cover your own virtual machines |

```bash
az storage account update -g RG1 -n stor1 --default-action Deny
az network vnet subnet update -g RG1 --vnet-name VNet1 -n Subnet1 \
  --service-endpoints Microsoft.Storage
az storage account network-rule add -g RG1 --account-name stor1 \
  --vnet-name VNet1 --subnet Subnet1
az storage account network-rule add -g RG1 --account-name stor1 --ip-address 131.107.8.0/24
```

A **private endpoint** gives the account a private IP address in a subnet. One private endpoint is needed per sub-resource (`blob`, `file`, `queue`, `table`, `dfs`, `web`). With the private DNS zone `privatelink.blob.core.windows.net` linked to the virtual network, clients keep using `stor1.blob.core.windows.net`, which now resolves to the private address. Private endpoint traffic is allowed even when public network access is disabled, and it also works from on-premises through VPN or ExpressRoute.

> **Exam trap.** Network rules open a path; they authorize nothing. The caller still needs a key, a SAS or a role. Conversely, a valid key is useless from a network the firewall rejects.

<!-- section: sas | objectives: 2.1.2 -->
## Shared access signatures (SAS)

A SAS delegates limited access without sharing the account key.

| SAS type | Signed with | Covers | Stored access policy | Maximum validity |
| --- | --- | --- | --- | --- |
| **User delegation SAS** | A user delegation key, obtained with Microsoft Entra credentials | Blob Storage and Data Lake Storage; since January 2026 also Azure Files, queues and tables | No | 7 days (lifetime of the key) |
| **Service SAS** | An account key | One service: a container, blob, file share, queue or table | **Yes** (optional) | Set by you |
| **Account SAS** | An account key | One or more services, plus service-level operations | No | Set by you |

A SAS is the resource URI followed by the token:

```text
https://stor1.blob.core.windows.net/reports/q1.pdf?sv=2024-11-04&ss=b&srt=o&sp=r
  &st=2026-11-16T08:00Z&se=2026-11-16T18:00Z&spr=https&sip=131.107.8.10&sig=<signature>
```

| Field | Meaning |
| --- | --- |
| `sv` | Storage service version |
| `ss` | Services (account SAS): `b` blob, `f` file, `q` queue, `t` table |
| `srt` | Resource types (account SAS): `s` service, `c` container, `o` object |
| `sp` | Permissions: `r` read, `w` write, `d` delete, `l` list, `a` add, `c` create... |
| `st` / `se` | Start and expiry time (UTC) |
| `spr` | Allowed protocol: `https` or `https,http` |
| `sip` | Allowed IP address or range |
| `si` | Identifier of a stored access policy (service SAS) |
| `sig` | Signature |

In an account SAS, listing the blobs of a container is a **container** operation (`srt=c`, permission `l`) and reading a blob is an **object** operation (`srt=o`, permission `r`).

```bash
# User delegation SAS: no account key involved
az storage blob generate-sas --account-name stor1 --container-name reports --name q1.pdf \
  --permissions r --expiry 2026-11-16T18:00Z --https-only --auth-mode login --as-user
```

Good practices that show up as answers:

- Prefer a user delegation SAS; give the shortest validity and the fewest permissions; require HTTPS.
- Leave the start time empty, or set it 15 minutes in the past, to avoid failures due to clock differences.
- A SAS can't be listed or audited once issued: anyone holding the URL can use it until it expires.

How to revoke a SAS before expiry:

| SAS | Revocation |
| --- | --- |
| Service SAS bound to a stored access policy | Delete or modify the policy |
| Service or account SAS without policy | Regenerate the **account key that signed it** (this breaks everything else using that key) |
| User delegation SAS | Revoke the user delegation keys, or remove the role of the identity that created it |

<!-- section: stored-access-policies | objectives: 2.1.3 -->
## Stored access policies

A stored access policy is defined **on a container, file share, queue or table**. It holds a start time, an expiry time and permissions. A **service SAS** references it by its identifier and inherits its settings.

- Changing the policy changes every SAS that references it; deleting it (or renaming its identifier) revokes them at once, without touching the account keys.
- A value is defined in the policy **or** in the SAS, not in both.
- At most **five** policies per container, share, queue or table.
- A new or modified policy can take up to 30 seconds to become effective.
- Account SAS and user delegation SAS can't use stored access policies.

```bash
az storage container policy create --account-name stor1 --container-name lab-results \
  --name lab-read --permissions rl --expiry 2026-12-31T00:00Z
az storage container generate-sas --account-name stor1 --name lab-results --policy-name lab-read
```

<!-- section: access-keys | objectives: 2.1.4 -->
## Access keys

Each account has **two** 512-bit keys, `key1` and `key2`. A key gives full access to all data and to the generation of SAS. Two keys exist so that one stays valid while the other is rotated:

1. Move the applications to `key2`.
2. Regenerate `key1`.
3. Move the applications to the new `key1`.
4. Regenerate `key2`.

- Regenerating a key immediately invalidates the old value and **every service or account SAS signed with it**. User delegation SAS aren't affected.
- A **key expiration policy** sets a rotation reminder interval and lets Azure Policy report keys that are too old. It never rotates keys by itself. It needs both keys to have been rotated at least once on older accounts.
- Keys can be stored in **Azure Key Vault**, which can also rotate them.
- Reading keys requires `Microsoft.Storage/storageAccounts/listKeys/action`: Owner, Contributor, Storage Account Contributor, and the Storage Account Key Operator Service Role. **Reader can't**.
- To block keys altogether, set **Allow storage account key access** to Disabled (`--allow-shared-key-access false`). Shared Key requests and the service and account SAS are then rejected; Microsoft Entra ID and user delegation SAS keep working.

```bash
az storage account keys list -g RG1 -n stor1
az storage account keys renew -g RG1 -n stor1 --key key1
```

<!-- section: files-identity-access | objectives: 2.1.5 -->
## Identity-based access for Azure Files

SMB file shares can authenticate users with Kerberos instead of the account key. One identity source is enabled per storage account:

| Identity source | Use it when | Requirements |
| --- | --- | --- |
| On-premises **AD DS** | Clients are joined to your existing domain | Line of sight to domain controllers; identities synchronized to Microsoft Entra ID (or a default share-level permission); the storage account is registered in AD DS (AzFilesHybrid module, `Join-AzStorageAccount`) |
| **Microsoft Entra Domain Services** | You want a managed domain in Azure | Clients joined to the managed domain |
| **Microsoft Entra Kerberos** | Hybrid or cloud-only identities on Microsoft Entra joined or hybrid joined clients (for example FSLogix profiles) | No line of sight to domain controllers needed |

Access is then checked at two levels, and **the most restrictive wins**:

| Level | Mechanism | Values |
| --- | --- | --- |
| Share | Azure RBAC role on the share or the account | Storage File Data SMB Share **Reader** (read), **Contributor** (read, write, delete), **Elevated Contributor** (also modify ACLs) |
| Directory and file | Windows ACLs (NTFS permissions) | Set with File Explorer, `icacls` or `Set-Acl` after mounting the share |

A **default share-level permission** can replace individual role assignments: it applies to all authenticated identities, and it is the only way to serve identities that aren't synchronized to Microsoft Entra ID. Without any share-level permission, access is denied whatever the NTFS permissions.

Mounting with the storage account key is always possible and gives full control; it is how ACLs are usually first configured. SMB uses TCP **port 445**, often blocked by internet providers: from on-premises, prefer VPN or ExpressRoute with a private endpoint.

<!-- section: key-points -->
## Key points

- Two independent checks: network rules, then authorization.
- IP rules: public addresses only, no effect within the same region. Virtual network rules need a service endpoint on the subnet. *Disabled* leaves only private endpoints.
- User delegation SAS: signed with Microsoft Entra credentials, no account key, 7 days at most. Service SAS: one service, can use a stored access policy. Account SAS: several services, no policy.
- Stored access policy: five per container; delete it to revoke its SAS.
- Rotating a key revokes the SAS signed with that key. Rotate `key1` and `key2` alternately.
- Disabling Shared Key leaves only Microsoft Entra ID and user delegation SAS.
- Azure Files: share-level role plus NTFS ACLs, most restrictive applies.
