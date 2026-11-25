# FIX-az-802-1 — chapters 11, 12, 13, 14 and 21 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-802 11-domain-controllers 12-sites-domains-forests 13-security-principals 14-group-policy 21-remote-management` 0 problems; `content:validate --cert az-802` 0 problems, 0 warnings; `check-quiz az-802` (the five chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed. The shared hourly WebFetch limit ran out before the end of the pass. The points that couldn't be fetched are listed as "not confirmed" below.

## 11-domain-controllers

| Finding | Learn | Change |
| --- | --- | --- |
| FR « des réseaux appairés » | Glossary: « peering », never « appairé » | FR azure-dcs table: « réseaux connectés par peering » |
| Denied RODC Password Replication Group members | **Learn is inconsistent.** "Active Directory security groups" (the group's own page) lists Cert Publishers, Domain Admins, Domain Controllers, Enterprise Admins, Group Policy Creator Owners, Read-only Domain Controllers, Schema Admins, which is what the chapter says. The `Add-ADDSReadOnlyDomainControllerAccount` reference lists Enterprise Domain Controllers and Enterprise Read-Only Domain Controllers instead of Domain Controllers / Read-only Domain Controllers, and adds krbtgt | None (the chapter follows the group's page). For a human decision (krbtgt) |
| Rights to move the schema master | **Learn is inconsistent.** KB "Transfer or seize Operation Master roles in AD DS" says Enterprise Admins for the schema master and the domain naming master. The forest recovery guide ("Seizing an operations master role") gives Schema Admins for the schema master, Enterprise Admins for the domain naming master and Domain Admins for the domain roles, which is what the chapter says. `Move-ADDirectoryServerOperationMasterRole` names no group | None. For a human decision |
| A raised functional level "generally can't be lowered" | **Learn is inconsistent.** `Set-ADDomainMode`: it can be decreased as long as no feature that needs it (for example the Recycle Bin) is in use. "Upgrade domain controllers…" (updated 2026-09-16): it can't be rolled back, except to 2012 R2 / 2008 R2 forest levels and some domain-level cases. "Functional levels" says nothing on this | None ("generally" covers both pages) |
| Learn: "no functional level since 2016" against the 2025 level | The functional-levels page lists Windows Server 2025, 2016 and 2012 R2; the upgrade page still says no level was added after 2016 | None (the chapter follows the functional-levels page) |
| Staged RODC attach by the delegated user | Not re-fetched; the QZ report found it in the `-UseExistingAccount` reference | None |
| RID pool of 500, IFM media from the same version | Not checked (fetch limit) | None |

## 12-sites-domains-forests

| Finding | Learn | Change |
| --- | --- | --- |
| SID filtering "enforced on external and forest trusts" | **Not confirmed.** `netdom trust`: `/quarantine:No` "accepts any SID (default)". No current page gives the default for forest trusts. Only archived pages say quarantine is on by default for new external trusts. "How trust relationships work for forests" (Entra Domain Services) doesn't mention SID filtering | None. For a human decision |
| SMTP "can't replicate domain partitions" | Not on Learn. "Active Directory Replication Concepts": SMTP replication won't be supported in future versions, so SMTP site links aren't recommended | Site-link table, Transport row: now says this (the bank already used that wording) |
| Minimum replication interval of 15 minutes | **Not confirmed**: only archived 2003/2008 pages (web search). Replication Concepts doesn't give it | None. Flag |
| Remove the site from `DEFAULTIPSITELINK` | **Not confirmed**: not on Replication Concepts | None. Flag |
| Overlapping schedules on a transitive path | Confirmed (Replication Concepts: bridged links with overlapping schedules) | None (already in the Schedule row) |
| Bitwise AND of site link options, UGMC 8-hour refresh and "Refresh cache from" site | Not on Replication Concepts (it confirms only that UGMC removes the need for a GC in every site) | None |
| Forest trust rights | Confirmed: Domain Admins of the forest root or Enterprise Admins; Enterprise Admins of both sides create both halves at once (concepts-forest-trust). `netdom trust` can't create a forest trust (netdom-trust) | None |
| Name suffix conflict | `netdom trust`: a suffix in conflict can't be toggled until it's disabled in the other trust. A conflict "between both forests" isn't stated as such | None |

## 13-security-principals

| Finding | Learn | Change |
| --- | --- | --- |
| dMSA can be standalone | Confirmed (overview: "a standalone account, or to replace an existing standard service account"; setup page: standalone creation steps) | Account table, dMSA row; dMSA paragraph; key points |
| dMSA prerequisites | Setup: "only available on devices running Windows Server 2025", KDS root key, `DelegatedMSAEnabled` on clients. Overview: migration needs a writable DC, and every machine that uses the account must support dMSA. The policy name and path are on the overview | dMSA paragraph: Windows Server 2025, writable DC for the migration |
| Service restart, computers learned | Setup: restart the running services once the account is linked. Overview: `groupMSAMembership` is updated at each ticket renewal | dMSA paragraph: one sentence |
| Exam trap "not a dMSA (which replaces an existing account)" | Now wrong (standalone dMSA exists). The real limit is that dMSA is available only on Windows Server 2025 | Exam trap: the stem now names Windows Server 2022 servers, and the dMSA is excluded because it is Windows Server 2025 only |
| Two-way forest trust "prerequisite" (setup page) | It applies only to cross-domain and cross-forest dMSA scenarios | None (out of the chapter's scope) |
| Cross-domain move keeps the old SID in `SIDHistory` | Confirmed ("Security identifiers": old SID copied to `SIDHistory`, kept in the token, no ACL change) | multi-domain-forest bullet |
| Builtin Local scope | Learn contradicts itself on the security groups page ("Builtin Local" vs "groups that are defined with the Domain Local scope") | None (the chapter follows the explicit scope statement). Flag |
| Universal group membership in the GC, nest global groups | Not on the security groups page (the first 100,000 characters were fetched) | None. Not confirmed |
| UPN suffix "in conflict" across a forest trust | No current page. concepts-forest-trust: UPN suffixes are collected into the TDO | None. Not confirmed |

## 14-group-policy

| Finding | Learn | Change |
| --- | --- | --- |
| *Run in logged-on user's security context*: drive map example | Wrong. "Group Policy preferences in Windows": user items run as SYSTEM by default. Use the option for user-specific resources (network drives, user environment variables). Drive Maps and Printers already use the user's context | Common tab sentence: new explanation, without the drive map example |
| MS14-025 list omits Immediate tasks | Confirmed: the Update FAQ lists Scheduled tasks and Immediate tasks (uplevel/downlevel). The CVE FAQ gives the shorter list | MS14-025 exam trap: "Scheduled Tasks (immediate tasks included)" |
| Loopback: user settings can't be filtered by denying Read/Apply to the computer object | Confirmed on the troubleshoot page "Loopback processing of Group Policy" | **None**: the sentence predates MS16-072, and it reads against the chapter's rule that computers need Read on user GPOs. For a human decision |
| Security settings reapplied every 16 hours | **Not confirmed** (fetch limit; a web search found only archived pages) | None. Flag |
| GPO status label "All settings disabled" vs Learn's "All policy settings disabled" | Not re-fetched (QZ report). GPMC itself shows "All settings disabled" | None. Naming choice for a human |
| Central store | Consistent (QZ report) | None |

## 21-remote-management

| Finding | Learn | Change |
| --- | --- | --- |
| Kerberos delegation doesn't support the second hop for WinRM | Confirmed ("Making the second hop in PowerShell Remoting": unconstrained, constrained and resource-based) | Second-hop table: on the three Kerberos rows; exam trap: one sentence; key points |
| Missing option "PSSessionConfiguration using RunAs" | Confirmed: configured on every intermediate server, password maintenance with a domain RunAs account | New table row |
| WAC in the Azure portal "at no cost" | **Learn is inconsistent.** "Windows Server Management enabled by Azure Arc": Windows Admin Center in Azure for Arc is a benefit that needs attestation or Windows Server pay-as-you-go, and isn't available to other customers through Arc. The WAC Arc page (last updated 2024-11-06) FAQ says "no associated cost" | wac-azure-portal: the extension has no cost; on Arc it needs SA attestation or pay-as-you-go. The more recent page is followed. Flag |
| `/restrictedAdmin` ignored with *Restrict credential delegation*; Restricted Admin for help desk | Confirmed (Remote Credential Guard page) | remote-desktop policy paragraph: two sentences |
| "Two simultaneous administrative sessions without the RDS role" | **Not confirmed**: no Learn docs page found, only Q&A threads | None. Flag |
| WinRM enabled by default on Windows Server | Not re-fetched; the QZ report found that the Win32 WinRM page (no listener by default) is generic | None |
| `/remoteGuard` to an RD Session Host works only for administrators; WAC/SSH over an Arc private link scope | The first is confirmed (RCG page). The second isn't on the WAC Arc page | None (detail beyond the objective) |

## Mock-exam bank questions changed

None. Every question on objectives 1.1.1–1.1.5, 1.2.1–1.2.3, 1.3.1–1.3.3, 1.4.1–1.4.2 and 2.1.1–2.1.4 (157 files, case-study and series questions included) was searched for the facts above. None contradicts a verified Learn fact.

Checked and left unchanged:
- Preferences context: `az802-1b-gpp-first-available` (option d explanation: Drive Maps already uses the user's context) and `az802-1b-gpo-computer-read` (MS16-072).
- RODC PRP: `az802-1a-prp-hotarea-users` and `az802-1a-rodc-unstaged-params` (default Denied list, which both Learn pages agree on).
- Rights: `az802-1a-dc-child-domain-rights` and `az802-1a-rodc-stage-rights` (Schema Admins is only a distractor).
- dMSA: `az802-1b-svc-dmsa-source` (already says standalone or superseding), `az802-1b-svc-dmsa-dropdown` and `az802-1b-svc-gmsa-prereq`.
- SID filtering through `/quarantine`: `az802-1a-trust-netdom-command`, `-trust-netdom-dragdrop` and `-trust-selective-auth` (they describe the switch, not a default).
- SMTP: `az802-1a-site-bridging` and `-site-link-params-dragdrop` (already "won't be supported in future versions").
- Second hop: `az802-2a-rbcd-winrm-hop` and `az802-sr1-share-hop-1/2/3`.
- RDP modes: `az802-2a-rdp-credential-modes` (Restricted Admin for help desk) and `-rdp-delegation-policies`.
- No bank question tests WAC licensing on Arc.

## Quiz files

None changed. The quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 13 Q9's dMSA explanation describes the migration use only, which is still correct.

## For a human decision

- The Denied RODC Password Replication Group members: does krbtgt belong, and "Enterprise" or plain (R)ODC groups? The cmdlet reference and the security groups page disagree.
- Schema master transfer/seizure: Schema Admins (forest recovery guide, chapter) or Enterprise Admins (FSMO KB)?
- Default SID filtering on external and forest trusts: the current `netdom trust` page says quarantine defaults to No.
- The WAC-in-Azure cost for Arc-enabled servers: the 2024 WAC page says no cost, the Arc management page says it needs SA or pay-as-you-go. The chapter follows the latter.
- Loopback filtering through the computer object: whether to add the troubleshoot-page sentence, which predates MS16-072.
- GPO status label "All settings disabled" (GPMC UI) or "All policy settings disabled" (Learn GPMC page).
- Not confirmed and kept: the 15-minute minimum interval, the `DEFAULTIPSITELINK` removal rule, the 16-hour security refresh, the two administrative RDP sessions, the UPN suffix conflict, universal group memberships in the GC, the RID pool of 500 and the IFM version rule. Re-check them once the fetch limit allows.

## French terms not settled

- « applet de commande » (chapter 11) / « cmdlet »: still `undecided` in the glossary; not changed.
- New in this pass, not in the glossary: « paiement à l'utilisation (pay-as-you-go) de Windows Server » (as in chapter 22); « attestation Software Assurance »; « listes de contrôle d'accès (ACL) »; « second saut pour WinRM »; « compte RunAs ».
- Out of scope, not changed: the bank (`az802-2a-rdp-credential-modes`) says « mode Administration restreinte », while chapter 21 says « mode Restricted Admin ».
- AD DS terms (approbation, lien de sites, mise en cache de l'appartenance aux groupes universels) are still missing from the glossary, and there is no `content/az-802/glossary.yaml` (QZ report 12).
