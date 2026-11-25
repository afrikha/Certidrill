# QZ-sc-100-11-resiliency-ransomware — end-of-chapter quiz, SC-100, chapter 11

File: `content/sc-100/quizzes/11-resiliency-ransomware.yaml` (10 questions, draft).
Check: `npx tsx factory/check-quiz.ts sc-100 11-resiliency-ransomware` → 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (q1), 1.1.2 (q2, q8, q9, q10), 1.1.3 (q3, q5, q6, q7), 1.1.4 (q4). Formats 6–10: yesno_statements, dropdown, single, multi, single.
The 38 mock-exam questions of 1.1.1–1.1.4 were read first; 1.1.1 and 1.1.4 are nearly saturated in the bank, so the quiz tests them once each with decisions the bank doesn't use (commodity vs human-operated definition, Azure Arc as the prerequisite for GCP machines).

## Facts verified on learn.microsoft.com (2026-11-24)

- Ransomware phase 1/2/3 pages and the main plan page (order, parallel teams, "step 3 must not slow down steps 1 and 2", data protection checklist, MFA "starting with administrator and priority accounts", Password Protection extended to AD DS, Azure Bastion, tamper protection listed for endpoints).
- Azure Backup security overview: security level table, RBAC roles, encryption defaults; MUA page: protected operations (incl. Disable immutability, Modify policy), roles, cross-tenant Resource Guard, MUA for Backup vaults GA.
- "Azure Business Continuity Center is now Resiliency in Azure"; Resiliency manages backup and replication across vaults, subscriptions, regions and Lighthouse tenants, job monitoring across Azure Backup and Site Recovery; security levels computed for Azure Backup vaults and data sources.
- Azure Update Manager: machines that run a server OS, Azure and Arc-connected machines, no dependency on Log Analytics / Automation.

## Doubts and unverified points

- q7 (dropdown): that tamper protection blocks a local administrator from turning off real-time protection, and that AD DS fine-grained password policies can't ban words, come from general product knowledge; the phase 3 page only lists the controls (WebFetch hourly limit reached twice).
- q8 (Resiliency): the claim that Backup reports don't compute vault security levels isn't from a fetched page.
- q10: relies on Learn's Excellent level = irreversible immutability or soft delete + MUA. Learn's table is ambiguous for vaults with default (reversible) soft delete: "Good" says "soft delete is enabled", "Poor" says "only reversible capabilities". The quiz avoids asking the level of such a vault; a reviewer may want the chapter to flag this ambiguity.

## Chapter issues (not edited)

- The three stakeholder questions of the resiliency-strategy section (most damaging business assets, translation to IT assets, protection/isolation) weren't found on any fetched page (protect-against-ransomware, human-operated-ransomware, backup-plan-to-protect-against-ransomware, ransomware-prepare). Source to confirm; not used in the quiz.
- Learn's own phase 3 page labels the ASR rules "Azure Site Recovery" (Learn error); the chapter's trap (ASR = attack surface reduction) is right, and q3 tests it.
- The backup-plan page ranks restore priorities (identity, human life, financial, product enablement, security) and says the backup list is the restore list; the chapter doesn't mention this list (the bank question sc100-1a-backup-priority-systems relies on it).
