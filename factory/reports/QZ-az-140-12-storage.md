# QZ-az-140-12-storage — notes

`content/az-140/quizzes/12-storage.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q2, q9), 1.2.2 (q1, q5), 1.2.3 (q3, q7), 1.2.4 (q4, q10), 1.2.5 (q6, q8). Positions 6–10: multi, single, dropdown, dragdrop, hotarea.

## Chapter vs current Learn (to fix in the chapter, not done here)

- **ODFC registry path**: "Configure ODFC containers" says to use `HKLM\SOFTWARE\Policies\FSLogix\ODFC`, but its PowerShell example writes `HKLM:\SOFTWARE\FSLogix\ODFC\`. The chapter gives only the Policies path. Learn also says now that a dual container (profile + ODFC) "isn't necessary or recommended", and that ODFC alone is recommended with third-party profile solutions. The chapter's table ("often a separate share") could reflect this. The quiz avoids the ODFC path.
- **Storage options page** ("Storage options for FSLogix profile containers"): its identity row still lists only AD DS and Microsoft Entra Domain Services for Azure Files, with no Microsoft Entra Kerberos. The chapter is more current than this page. Its Azure Files performance row says "Standard (Transaction optimized) / Premium", while the chapter says HDD/SSD.
- **Personal host pools**: the chapter says profiles "can stay on the OS disk". No fetched Learn page says this explicitly. The profile management page only lists the OS replacement reasons (pooled assignment, upgrade, host replacement). q9 relies on it, with requirements that make the local profile the only sensible choice (personal pool, nothing to keep when a VM is replaced, minimize cost).
- Confirmed as written: SizeInMBs default 30000, VolumeType vhd, IsDynamic 1; local profile honoured by default, and `DeleteLocalProfileWhenVHDShouldApply` permanently deletes it; Cloud Cache hydrates from one provider and writes to all, queues changes while a provider is unhealthy, and uses the providers in the order of `CCDLocations`; `privatelink.file.core.windows.net`; `kdc_enable_cloud_group_sids` mandatory for cloud-only identities; `LoadCredKeyFromProfile`; the Manage access tab for cloud-only identities; ANF throughput per TiB (16/64/128) and the auto QoS formula; Azure NetApp Files "relies solely on Windows ACL(s)"; recommended NTFS ACLs; default share-level permission None at initialization, applying to all authenticated identities including unsynced ones; one identity source per storage account.
- New on Learn, not in the chapter: the Flexible service level for ANF (manual QoS only, throughput set independently of capacity). The quiz doesn't use it.

## Not verified on a fetched page

- Whether **cloud-only identity support for Microsoft Entra Kerberos on Azure Files** is GA. The pages fetched don't say "preview": they give regional support (Azure public cloud only). q7 uses it as its scenario. Please check whether a preview label exists elsewhere (the mock question `az140-1a-st-cloud-only` has the same dependency).
- That the Contributor management role grants no SMB data access (q10 User1). The share-level permissions page doesn't address it. It follows from the role having no data actions and is stated in the chapter's Exam trap.
- The ZRS support of Azure Files SSD shares (q9) comes from the chapter. The storage options page lists LRS/ZRS/GRS/GZRS for Azure Files in general.

## Terminology

- The course uses both « pool d'hôtes **regroupé** » (majority) and « pool d'hôtes **partagé** ». The quiz uses « regroupé ». A glossary entry for "pooled host pool" is needed.

## Design notes

- Decisions not in the mock exam: default SizeInMBs, why pooled host pools need remote profiles, the DNS zone of a `file` private endpoint, a local profile blocking the container, Cloud Cache read/write and outage behaviour, ACLs on an ANF volume (no Azure RBAC), the cloud-group tag for cloud-only identities, choosing the ANF service level from quota and throughput, a storage choice per host pool (personal/local, ZRS, ANF), and effective access with share-level roles and NTFS combined.
