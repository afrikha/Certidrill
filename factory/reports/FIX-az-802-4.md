# FIX-az-802-4 — chapters 61, 62, 71, 72 and 73 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-802 61-os-security 62-ad-ds-security 71-monitoring 72-troubleshoot-windows-server 73-troubleshoot-active-directory` 0 problems; `content:validate --cert az-802` 0 problems, 0 warnings; `check-quiz az-802` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The hourly WebFetch limit was hit twice; I waited and every finding below was then fetched.

## 61-os-security

| Finding | Learn | Change |
| --- | --- | --- |
| Defender for Servers table omits Plan 2 features | Confirmed (defender-for-servers-overview): OS system updates is Plan 2 only and applies only to machines onboarded with Azure Arc; network map is Plan 2 only (Azure); file integrity monitoring on AWS/GCP needs Arc. Plan 1 per server, Plan 2 disable-only per resource, 500 MB, 30-day trial unchanged | Table: two new rows (OS system updates, network map), FIM row notes the Arc condition |
| LAPS automatic account management | Confirmed (laps-management-policy-settings): `AdministratorAccountName` ignored when enabled; Target default 1 (new custom account, 0 = built-in Administrator); name default `WLapsAdmin`; EnableAccount default 0 (disabled); RandomizeName adds a random six-digit suffix at each rotation. The page's default-values table says "Yes" for Target and NameOrPrefix, against its own prose (prose followed) | windows-laps: new paragraph |
| Exploit protection restart rule | Confirmed: customize-exploit-protection only says "changing some settings may require restarting the device" and that you're notified when an app or Windows restart is needed. Mitigation scopes and audit modes match the chapter | Bullet "System-level changes require a restart; program-level changes don't" replaced by "Some changes need a restart of the app or of Windows; Windows Security tells you" |
| OSConfig restart ("might") | Consistent with the chapter (QZ report) | None |
| Account policies at OU level | Only archived Windows 10 pages state it (QZ report). Not re-fetched | None |
| FR « Portée » (scope) | Glossary: « étendue » (not « portée ») | Table header « Étendue » |

## 62-ad-ds-security

| Finding | Learn | Change |
| --- | --- | --- |
| Domain Admins "few members" | Confirmed (Implementing Least-Privilege Administrative Models): no day-to-day members except the secured built-in Administrator; accounts placed temporarily for build or disaster-recovery work and removed afterwards | Built-in groups table, Domain Admins row; key point |
| `New-ADAuthenticationPolicy` "enforced by default" | **Wrong**: the cmdlet page says that without `-Enforce` "the authentication policy created is in audit mode" | Table row: "audit mode unless created with `-Enforce`" (the unverified ADAC label *Only audit policy restrictions* was removed); exam trap now says "A policy or silo created without `-Enforce`" |
| Protected Users DFL wording | Inconsistent on Learn (QZ report); chapter follows the prerequisites | None |
| WS2025 DC changes, events 3074/3075, legacy Kerberos registry value | Confirmed (What's new in Windows Server 2025): LDAP signing by default on new deployments, LDAP over TLS 1.3, no RC4 TGTs, *Refuse setting default machine account password*, encrypted connection for confidential attributes, 3074/3075 channel binding audit, `SupportedEncryptionTypes` registry key no longer honored | None |
| Shielded VMs, OSConfig `DomainController` scenario | Not re-verified for 62 (the scenario name is the one used in 61) | None |

## 71-monitoring

| Finding | Learn | Change |
| --- | --- | --- |
| Azure Monitor Metrics destination is preview | Confirmed (Collect performance counters with Azure Monitor Agent: "Azure Monitor Metrics (preview)") | DCR table, performance counters row: "(preview)" |
| Dependency agent and Map retire June 30, 2028 | Confirmed (Enable VM insights using Azure Policy) | vm-insights: "both retire on June 30, 2028" |
| VM insights policies cover the logs-based experience only | Confirmed (same page: "Policies aren't yet available for the metrics-based experience") | vm-insights: parenthesis after "Azure Policy" |
| "A DCR can have up to 10 data sources" | Confirmed (Azure Monitor service limits: maximum number of data sources 10) | None |
| "Two DCRs collecting the same events create duplicates" | **Not confirmed**: the Windows events page covers only several workspaces and the Security log with Sentinel (Event and SecurityEvent); nothing about several DCRs | None. Flag below |
| Processor Queue Length threshold | Not verified (no fetched page) | None |
| OpenTelemetry metrics status | No preview label on Metrics experience for virtual machines nor Enable VM monitoring in Azure Monitor; "recommended for new deployments" | None |

## 72-troubleshoot-windows-server

| Finding | Learn | Change |
| --- | --- | --- |
| Disable VMICTimeProvider on virtualized DCs | **Not supported by Learn**: Time sync for Windows VMs in Azure documents only enabling VMICTimeProvider (host-only option) and says the domain sets the hierarchy of domain-joined machines; Virtualizing domain controllers with Hyper-V recommends disabling host time sync for DC VMs by clearing **Time synchronization** under Integration Services | time-service paragraph rewritten: domain-joined machines follow the domain hierarchy, the forest root PDC emulator still needs a source, Hyper-V DC VMs: clear Time synchronization. Registry instruction removed |
| Customer Managed Schedules "(Preview)" | Learn inconsistent: Scheduling Recurring Updates in Azure Update Manager (topic page) requires "Customer Managed Schedules" with no preview label; the troubleshoot page still writes "Customer Managed Schedules (Preview)" once. The topic page was followed. The other table facts are confirmed on the troubleshoot page (15 minutes before the schedule, Microsoft.Compute for Arc assessment, 10 minutes reserved for reboot) | None. Flag below |
| WSUS registry values | Confirmed (Manage additional Windows Update settings): `WUServer` and `WUStatusServer` (REG_SZ) under `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate` | None |
| `azcmagent config` `clear`, `--add`, `--remove`; list precedence | Confirmed (azcmagent config: `set` replaces the list unless `--add`/`--remove`; `clear` clears a value. Extensions security: an extension in both lists is blocked, unlisted extensions are blocked once an allowlist exists, delete is always allowed) | extensions: new bullet |
| ADE: 256-bit recovery key, MBAM | Confirmed (Enable Azure Disk Encryption for Windows VMs): custom BitLocker GPOs must include *Allow 256-bit recovery key*; MBAM Group Policy features aren't compatible. Retirement Sept 15, 2028, v6/v7 or newer, key vault same region and subscription also confirmed | ADE failures bullet extended |
| FR « dépannage » | Glossary: « résoudre les problèmes » (not « dépanner ») | Lead paragraph: « questions de résolution de problèmes » |

## 73-troubleshoot-active-directory

| Finding | Learn | Change |
| --- | --- | --- |
| `tombstoneLifetime` "180 days when not set" | **Wrong** (Advanced AD DS Management Using ADAC, Level 200): 180 days in forests created with Windows Server 2003 SP1 or later; when not set (forests upgraded from Windows 2000 or installed with Windows Server 2003 without a service pack) the internal default is 60 days | Recycle Bin table row |
| LDIF file and "group memberships held in other domains" | Confirmed (authoritative restore, archived): `restore object`/`restore subtree` write a text file of DNs and an LDIF file for back-links "such as group memberships of users"; `create ldif file(s) from` builds the link updates for a domain other than the restored object's | dsrm-restore sentence rewritten |
| Import the .ldf on a different DC | **Ambiguous**: Run an LDIF File to Recover Back-Links says both "run the .ldf file on the restored domain controller" (domain of the deletions) and "on a different, up-to-date domain controller" | None. Flag below |
| `netdom resetpwd` procedure | Confirmed (Reset domain controller's password with Netdom.exe): stop the KDC and set it to Manual, purge the ticket cache (klist), `netdom resetpwd /s:<server> /ud:<domain\User> /pd:*` run locally on the DC whose password is reset, restart, then KDC back to Automatic. The short switches are the ones on that page | None |
| `KRB_AP_ERR_MODIFIED` causes | Confirmed (Kerberos authentication troubleshooting guidance): several causes, check related events: clocks out of sync, SPN not unique, service account name not unique in the forest. "Wrong account / DNS name to the wrong server" isn't on the page | Kerberos table row |
| GUID of `removelingeringobjects` | Learn ambiguous: replication-error-8614 shows only `<Source DSA GUID>`, and event 2042 shows the invocation ID. Not contradicted | None. Flag below |
| Deleting a DC object moves its FSMO roles | Confirmed (Clean up AD DS server metadata): the roles move to the DC shown, which can't be changed in ADUC; move them afterwards | on-premises-ad table: metadata cleanup row now names the ADUC computer object and the FSMO behavior |
| FR « Portée » (scope) | Glossary: « étendue » | Table « Étendue » |

## Mock-exam bank questions changed

- `questions/monitoring/az802-7a-vminsights-arc-prereq.yaml` (option c explanation, EN + FR), `questions/monitoring/az802-7a-vminsights-statements.yaml` (option e, EN + FR), `questions/monitoring/az802-7a-dcr-arc-order.yaml` (action `dep`, EN + FR): "the Dependency agent only fed/served the Map feature, which is deprecated" (past tense, as if Map were gone) became "only feeds the Map feature, which retires with it on June 30, 2028". Learn (Enable VM insights using Azure Policy) gives that retirement date. The answers don't change.

## Checked and left unchanged

- 6.1.x: az802-6a-dfs-plan2-features, -dfs-onprem-arc, -dfs-resource-level (match the plan table), az802-6a-laps-* and cs2b/cs3a LAPS questions (nothing on automatic account management), az802-6a-ep-* (scopes and audit). **Note:** az802-6a-ep-aslr-command explanation says "A system-level change takes effect after a restart"; Learn says only that some settings may require a restart. Not contradicted, so not changed, but it is broader than Learn.
- 6.2.x: az802-6b-silo-audit-only and -silo-tgt-order already say that without `-Enforce` the policy and silo only audit (matches Learn); az802-6b-builtin-groups-yn has no Domain Admins membership claim.
- 7.1.x: az802-7a-dcr-statements, -dcr-security-duplicate (Sentinel/Event duplicate matches Learn), -vminsights-otel (no preview label found), -alert-disk-hybrid.
- 7.2.x: az802-7b-hyperv-dc-time (matches the Hyper-V page), -pdc-transfer-time, -w32tm-root-pdc, -member-cmos-clock (no VMICTimeProvider claim); az802-7a-um-schedule-fix (Customer Managed Schedules + 15 minutes, both on Learn; see the preview flag below); az802-7b-arc-monitor-mode, -azcmagent-tasks (match Extensions security); az802-7b-ade-enable-fails (region and subscription, proxy).
- 7.3.x: az802-7b-recycle-bin-facts, -auth-restore-order, -corrupt-dc-database, -usn-rollback, -kerberos-facts, -failed-dc-metadata (DC4 holds no FSMO role), -dc-machine-password (`/server /userd /passwordd` from the netdom resetpwd reference; the troubleshooting article uses `/s /ud /pd`).

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 73 Q (LDIF) says to import the .ldf on another up-to-date DC: one of the two statements of the Learn page (see below).

## For a human decision

- **Customer Managed Schedules**: GA wording on the Update Manager scheduling page, "(Preview)" in one passage of the troubleshoot page. The chapter and `az802-7a-um-schedule-fix` keep it as the required setting.
- **LDIF import DC**: Run an LDIF File to Recover Back-Links says both "on the restored domain controller" and "on a different, up-to-date domain controller". The chapter doesn't state it; quiz 73 uses "a different DC".
- **`removelingeringobjects` GUID**: chapter says "DSA object GUID"; Learn shows only `<Source DSA GUID>` (event 2042 lists the invocation ID). Left as is.
- **Not confirmed, left in 71**: "two DCRs collecting the same events" duplicate data; the Processor Queue Length threshold (about 2 per core).
- French terms not in the glossary or not settled: « mis hors service » (retire) used in 71 and the three bank explanations; « préversion » is in the glossary. « cmdlet / applet de commande » stays undecided (not touched). Data Manager labels and *Allow 256-bit recovery key* / *Configure user storage of BitLocker recovery information* kept in English (French UI labels not verified).
