# QZ-az-802-13-security-principals — report

File: `content/az-802/quizzes/13-security-principals.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-802 13-security-principals` → 0 problem(s), 0 warning(s).

Objectives: 1.3.1 (Q1, Q4, Q6, Q7), 1.3.2 (Q3, Q9), 1.3.3 (Q2, Q5, Q8, Q10). Positions 6–10: single, ordering, dragdrop, multi, multi.

The 28 mock-exam questions on 1.3.x (including cs4b and series sr2) were read first. The quiz does not use the decisions they test (the default state of New-ADUser, Search-ADAccount pipelines, distribution to security, converting a global group that belongs to another global group, the one-way trust plus domain local group from the trusted side, FSP, GC port, UGMC, UPN suffix creation, dMSA create and start, gMSA and sMSA orders, KDS wait, virtual account).

## Pages fetched (November 24, 2026)

Active Directory Security Groups (scope table and conversion rules), Manage Group Managed Service Accounts, Troubleshoot gMSAs for Windows containers, Delegated MSA overview, Setting up dMSA, Add-ADPrincipalGroupMembership, Set-ADServiceAccount, Set-ADAccountExpiration, Set-ADForest, Security Identifiers, How trust relationships work for forests in Active Directory, Planning Global Catalog Server Placement.

## Facts not verified on a fetched page (taken from long-standing knowledge)

- Q1: `memberOf` is a back-link attribute that can't be written. The `-Identity` parameter of `Add-ADGroupMember` takes a single group.
- Q3 s2: moving a user between OUs of the same domain keeps its SID. The Security Identifiers page only implies it: the RID is unique per domain, and a SID changes when the domain changes.
- Q10: the Set-ADServiceAccount page says that `-PrincipalsAllowedToRetrieveManagedPassword` "sets" `msDS-GroupMSAMembership` and that its example "limits" the principals to one group. That it **replaces** the list is my reading of this, not an explicit statement. The restart that gives a host its new group membership comes from the Windows containers gMSA troubleshooting page ("you may need to restart your computer to obtain a new ticket"). The getting-started page doesn't mention it.

## Chapter versus current Learn

- **dMSA prerequisites.** The chapter lists "Windows Server 2025 DCs". Learn (setup page) says only that dMSA setup "is currently only available on devices running Windows Server 2025", that migration needs a writable DC, and, strangely, that "a two-way forest trust" between the relevant forests is a prerequisite. The chapter doesn't say that the services must be restarted after `Start-ADServiceAccountMigration`. Learn includes that step, and the dMSA learns the computers at ticket renewal. Learn also says that a dMSA can be a **standalone** account. The chapter presents it only as the replacement of an existing account, which makes the chapter's exam trap ("not a dMSA") depend on the host OS (Q8 states Windows Server 2022 for the multi-server targets).
- **Kerberos policy for dMSA.** The setup page shows only the `DelegatedMSAEnabled` registry value. The policy name "Enable Delegated Managed Service Account logons" and its path come from the overview page. The chapter is consistent with both.
- **Universal group membership in the global catalog**, and the advice to nest global groups rather than users: the fetched pages don't say it. The security groups page was cut off at 100,000 characters, and the GC placement page doesn't cover it. I didn't use it.
- **UPN suffix conflict across a forest trust** (chapter: "a suffix used in both forests is in conflict"): no current Learn page covers it. Only Windows Server 2003 pages on name suffix routing exist. I didn't use it.
- **Builtin Local scope**: the security groups page says that Builtin groups have the Builtin Local scope, and also that the Builtin container "includes groups that are defined with the Domain Local scope". This contradicts the chapter, which follows the first statement.
- **Cross-domain move**: Learn adds that the old SID is kept in `SIDHistory`, so the ACLs don't need to change. The chapter mentions only the new SID. It is worth adding, because it decides questions on reorganizations.

## French

The undecided glossary term "cmdlet" is avoided: the quiz says « commande ». The Kerberos policy name and the GPMC labels stay in English.
