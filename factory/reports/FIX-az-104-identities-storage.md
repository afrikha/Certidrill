# FIX-az-104-identities-storage — chapter corrections from the QZ reports

Chapters: 11-entra-users-groups, 12-rbac, 13-governance, 21-storage-access, 22-storage-accounts, 23-files-blobs. EN and FR were changed the same way. Code blocks, sections and callouts are unchanged. Tables are the same shape in both languages. Every fact below was checked on learn.microsoft.com in November 2026.

Checks: `check-cert az-104 <6 chapters>` 0 problems · `content:validate --cert az-104` 0 problems / 0 warnings · `check-quiz az-104` 0 problems / 0 warnings (also per chapter).

## Findings

### 11-entra-users-groups

| Finding | Learn | Change |
| --- | --- | --- |
| FR « Attribué » for the Assigned membership type | Glossary: « Affecté » | FR: « Affecté (Assigned) », « l'appartenance doit être Affecté ». Also aligned with the glossary: « licence(s) basée(s) sur un groupe », « groupes d'appartenance dynamique » |
| Least-privileged role for group license assignment | **Confirmed** (delegate-by-task). Groups > Assign license → User Administrator. Licenses > Assign license → License Administrator | Role table: the row "Assign licenses" is now two rows: "Assign licenses to users → License Administrator" and "Assign licenses to groups (group-based licensing) → User Administrator" |
| SSPR methods moved out of the legacy policy | **Confirmed** (concept-authentication-methods-manage). Since September 30, 2025, methods can't be managed in the legacy MFA/SSPR policies. Two settings stay in the legacy SSPR policy: *Number of methods required to reset* and security questions | SSPR table, "Authentication methods" row: it now holds only the number of methods (1 or 2) and the security questions. The other methods are enabled for SSPR in the Authentication methods policy, with the date |
| Licensing pages moved to the M365 admin center | Not a chapter fact. The chapter has no link | None. The bank has no question that cites the old Entra licensing URLs (grep: 0) |

### 12-rbac

| Finding | Learn | Change |
| --- | --- | --- |
| "Classic administrators" tab | **Confirmed** (classic-administrators). Classic administrator roles were fully retired in May 2026 and the tab was removed from the portal. In December 2025, Azure assigned Owner at subscription scope to the users who still held a classic role | Removed the row from the IAM tabs table. Added a sentence with both dates and "manage access with Azure RBAC only" |
| Virtual Machine Contributor has `listKeys` | The chapter says nothing wrong | None |
| FR « attribution de refus » | Glossary: « affectation de refus » | FR: « affectations de refus » in all 3 places, including the tab name |

### 13-governance

| Finding | Learn | Change |
| --- | --- | --- |
| Lock and move sentence | Already fixed before this task (read-only locks only) | None |
| Hierarchy Settings Administrator role is not in the chapter | The chapter makes no wrong claim, and the quiz doesn't use the role | None |

### 21-storage-access

| Finding | Learn | Change |
| --- | --- | --- |
| `Microsoft.Storage` service endpoint "same region or paired region" | **Confirmed** (storage-network-security). `Microsoft.Storage` = accounts in the same region as the virtual network. `Microsoft.Storage.Global` = any region | "(accounts in the same region as the virtual network)". Removed "or its paired region" |
| Storage Account Contributor in the list of roles with `listKeys` | **Not confirmed as an error.** The built-in roles (storage) page says the role "Provides access to the account key" (`Microsoft.Storage/storageAccounts/*`). "Manage account access keys" names only Owner, Contributor and Key Operator, but it doesn't exclude this role | None |
| More SMB share-level roles | **Confirmed** (Assign Share-Level Permissions for Azure Files). Learn lists 7 roles | Share-level row: added Storage File Data Privileged Reader / Privileged Contributor (override ACLs), SMB Admin (equivalent to the account key) and SMB Take Ownership |
| User delegation SAS "Blob only" on the Shared Key page | SAS overview: Blob (and Data Lake), Queue, Table, Files. This matches the chapter | None. Not verified: the chapter's "since January 2026" (the SAS overview gives no date) |

### 22-storage-accounts

| Finding | Learn | Change |
| --- | --- | --- |
| ZRS "three" zones | **Confirmed** (storage-redundancy): "three or more" availability zones | Redundancy table and key points: "three or more" |
| FR versioning term | Glossary: « contrôle de version des objets blob » | FR: object replication table and key points |
| FR purge protection | Not in the glossary | Not settled (see below) |

### 23-files-blobs

| Finding | Learn | Change |
| --- | --- | --- |
| File Sync topology (quiz Q6) | **Confirmed** (file-sync-planning). A server registers with only one Storage Sync Service. A sync group has one server endpoint per registered server. A file share (cloud endpoint) is in only one sync group. A server can have endpoints in several sync groups | Added to the Azure File Sync bullet |
| Changing the default tier affects inferred-tier blobs only (quiz Q3) | **Confirmed** (access-tiers-overview: "Hot (inferred)", applies to blobs without an explicitly set tier) | Added to the default access tier bullet |
| Premium block blobs can't be tiered (quiz Q8) | **Confirmed**. No Set Blob Tier and no lifecycle management. Copy the data to another account (Put Block From URL / AzCopy) | Added to the tiers bullet |
| Versioning + soft delete behaviour (quiz Q10) | **Confirmed** (versioning-overview) | Versioning bullets. Delete without a version ID → the current version becomes a previous version and no current version remains. With soft delete on, nothing is soft-deleted. Deleting a version by its ID soft-deletes it. Undelete Blob restores all soft-deleted versions and promotes none |
| Azure Backup turns on share soft delete; NFS not supported | **Confirmed**. azure-file-share-backup-overview: soft delete at account level, 14 days. Support matrix: NFS snapshot backup is in private preview and vaulted backup is "coming soon" | Added: backup enables share soft delete (14 days); Azure Backup for NFS shares isn't generally available. The preview is mentioned only as a status, not taught |
| FR versioning term | Glossary: « contrôle de version des objets blob » | FR: section title, table, all prose and key points (section id unchanged) |

## Mock-exam bank questions changed (EN + FR)

The ZRS zone count was made precise in the explanations only: "three or more availability zones" / « trois zones de disponibilité ou plus ». Stems and answers are unchanged.

- `questions/storage/cs1-contoso-03.yaml`
- `questions/compute/cs3-lucerne-05.yaml` (a storage-account question of the cs3-lucerne case)
- `questions/storage/s2-cli-create-premium-blockblob.yaml`
- `questions/storage/stor-cli-create-zrs.yaml`
- `questions/storage/s2-redundancy-requirements-match.yaml`
- `questions/storage/s2-redundancy-ra-gzrs.yaml`

Checked with no change needed:

- License roles: no bank question uses License Administrator.
- SSPR settings pages: i1-033 and i1-029 already match the Authentication methods policy.
- Classic administrators: only a reference title in i2-scope-level-per-requirement.
- Service endpoint regions: s1-fw-rules-statements is correct.
- Versioning delete: cs3-lucerne-01 is correct.
- Default tier / Archive: s3-tier-archive-statements and cs3-relecloud-02 are correct.
- SMB roles: i2-builtin-files-smb-contributor is correct.

Quiz files: none changed. They all still agree with the corrected chapters.

## Terms left undecided (not in the glossary or not settled)

- **purge protection**: « protection contre le vidage » (chapter 22, quiz 22, 4 bank questions) vs « protection contre la purge » (5 bank questions). Not in the glossary.
- **Authentication methods policy**: I used « stratégie de méthodes d'authentification », as bank question i1-029 does. Not in the glossary.
- **Deny assignments tab (FR portal label)**: I wrote « Affectations de refus » to follow the glossary. The actual fr-fr portal label was not checked.
- **blob versioning**: the chapters now use the glossary's « contrôle de version des objets blob ». Quizzes 22 and 23 still say « versioning des objets blob », the study-guide wording. Not changed, because it isn't wrong. To harmonise.
- **Hot (inferred)**: the portal label is kept in English in FR. The fr-fr portal wording was not checked.

## Other observations (not changed)

- storage-redundancy lists premium page blobs under LRS only. Chapter 22's account-type table says "LRS, ZRS". The page shows it as a "recommended options" table, so this needs a check before any change.
- Learn now calls premium file shares "SSD file shares" (FileStorage). The chapters still say "premium". This is a naming change only.
