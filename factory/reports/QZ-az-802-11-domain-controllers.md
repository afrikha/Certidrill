# QZ-az-802-11-domain-controllers — report

File: `content/az-802/quizzes/11-domain-controllers.yaml` (10 questions, `az802-qz-11-01` to `-10`).
Check: `npx tsx factory/check-quiz.ts az-802 11-domain-controllers` → 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 1.1.3 | single | 1 | Passwords stored by an RODC with the default PRP (own computer account + own krbtgt) |
| 2 | 1.1.1 | single | 1 | `Test-ADDSDomainControllerInstallation` (prerequisites only) |
| 3 | 1.1.4 | single | 2 | `Get-ADAccountResultantPasswordReplicationPolicy` for one account with nested groups |
| 4 | 1.1.2 | single | 2 | Static IP warning of the prerequisites check in Azure: ignore it |
| 5 | 1.1.5 | single | 2 | Holder back tomorrow: wait, don't seize |
| 6 | 1.1.3 | single | 3 | Staged RODC: server name must match the pre-created account |
| 7 | 1.1.4 | single | 3 | Branch computer accounts must be cacheable too; per-RODC Allowed list + prepopulate |
| 8 | 1.1.1 | single | 3 | First WS2025 DC: forestprep needs Schema/Enterprise/Domain Admins; Domain Admin of the child can then promote |
| 9 | 1.1.2 | yesno | 3 | Deallocating all Azure DCs at once (RID pool discard, no authoritative SYSVOL) |
| 10 | 1.1.5 | multi | 3 | Which operations fail with the schema master and RID master offline |

No mock-exam decision reused with the same answer (all 52 questions of 1.1.1–1.1.5 read first).

## Chapter issues against current Learn (chapter not edited)

- **French chapter, section azure-dcs:** « des réseaux appairés » — the glossary uses « peering de réseaux virtuels » and says to avoid « appairage ».
- **Denied RODC Password Replication Group members:** the chapter lists "Domain Controllers and Read-only Domain Controllers" and omits krbtgt. Learn (`Add-ADDSReadOnlyDomainControllerAccount` reference and the archived "Password Replication Policy" page) lists Cert Publishers, Domain Admins, Enterprise Admins, **Enterprise** Domain Controllers, **Enterprise** Read-Only Domain Controllers, Group Policy Creator Owners, **the krbtgt account** and Schema Admins. Check and align (not used in the quiz).
- **Rights to move the schema master:** the chapter says Schema Admins. KB "Transfer or seize Operation Master roles in AD DS" says Enterprise Admins for both the schema master and the domain naming master, Domain Admins for the three domain roles. Not used in the quiz; to be settled.
- **Lowering functional levels:** the chapter says a raised level "generally can't be lowered". The `Set-ADDomainMode` reference says the level can be decreased as long as no feature that needs it is in use (for example the Recycle Bin); "Upgrade domain controllers…" says it can't be rolled back except to 2008 R2 / 2012 R2. Learn is inconsistent; not used.
- **Learn inconsistency (not the chapter):** "Upgrade domain controllers to a newer version of Windows Server" still says no functional level was added after Windows Server 2016, while "Active Directory Domain Services Functional Levels" lists the Windows Server 2025 level.
- **Staged RODC attach rights:** the RODC level-200 page says attaching requires Domain Admins, but the same page (delegation dialog) and the `Install-ADDSDomainController -UseExistingAccount` reference say a delegated user can attach. Question 6 relies on the delegated user, as the chapter does.

## Unverified or weakly sourced (left out of the quiz or noted)

- RID pool size of 500 and the "IFM media from the same Windows Server version" rule: not checked (not used).
- "Safely virtualizing AD DS" doesn't say that copied VHDX files defeat the VM-Generation ID; only "Deploy AD DS in an Azure Virtual Network" says not to copy VHD files. Not used.
- PRP facts (computer accounts must be cached, prepopulation only for allowed accounts, Resultant Policy) come only from archived Windows Server 2008/2012 pages; no current Learn page found.
- Question 9 states that the runbook "stops and deallocates" the VMs: the `Stop-AzVM` reference only implies that deallocation is the default (through `-StayProvisioned`).
