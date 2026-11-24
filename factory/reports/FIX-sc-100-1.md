# FIX-sc-100-1 — chapters 11, 12, 13, 21 and 22 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-100 11-resiliency-ransomware 12-mcra-mcsb 13-caf-waf 21-security-operations 22-identity-access` 0 problems; `content:validate --cert sc-100` 0 problems, 0 warnings; `check-quiz sc-100` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR, with the same sections, tables and callouts. No section marker or code block changed. The WebFetch budget (shared by all agents) ran out several times. Every finding below was fetched in the end, except the stakeholder questions of chapter 11, which no fetched page contains.

## 11-resiliency-ransomware

| Finding | Learn | Change |
| --- | --- | --- |
| The three stakeholder questions (most damaging assets, translation to IT assets, isolation) have no source | **Not confirmed**: not on backup-plan-to-protect-against-ransomware, the RaMP "Quickly protect your organization against ransomware attacks" page or "Prevent or reduce business damage from a breach with Zero Trust". Two web searches found no other page | None. Flagged below |
| The backup-plan priority list is missing (bank question sc100-1a-backup-priority-systems relies on it) | Confirmed ("Azure backup and restore plan to protect against ransomware"): identity systems, human life, financial systems, product or service enablement, security (minimum); "your prioritized backup list also becomes your prioritized restore list" | bcdr-design: new paragraph after the secure-backups checklist |
| Security level table: is a vault with reversible soft delete Good or Poor? | Confirmed, the chapter matches Learn word for word (Azure Backup security overview). The ambiguity is in Learn itself: Good = "immutability is locked or soft delete is enabled"; Poor = "only reversible capabilities are enabled" | None. Flagged below |
| Phase 3 page calls ASR "Azure Site Recovery" | Learn's error; the chapter's trap (attack surface reduction) is right | None |

## 12-mcra-mcsb

| Finding | Learn | Change |
| --- | --- | --- |
| Is MCSB v1 or v2 Defender for Cloud's default? | concept-regulatory-compliance-standards: the MCSB is enabled by default (Azure). AWS adds AWS Foundational Security Best Practices; GCP adds GCP Default. No version is given. "Cloud Secure Score": "Only built-in recommendations from the MCSB affect the secure score" (classic score); no version is given | mcsb paragraph: AWS and GCP defaults added; "only built-in MCSB recommendations affect the secure score"; a sentence saying the Defender for Cloud documentation doesn't name the version. Key point: no longer ties "default standard" to v2 (preview) |
| IRM templates Risky browser usage (preview) and "by risky users" not named | Not re-fetched. The chapter's list says "such as" and is not wrong | None |

## 13-caf-waf

| Finding | Learn | Change |
| --- | --- | --- |
| The CAF secure DevOps attribution is loose | Confirmed: the CAF best-practices/secure-devops URL serves the Zero Trust article "Secure the developer environment for Zero Trust" (EMU, SSH CA, branch protection, verified extension publishers, GitHub OIDC federation). Release pipelines and test environments with production data appear only in its next-steps summary. CodeQL, Dependabot and Defender for Cloud DevOps security are not on it | devsecops intro: "Microsoft's guidance…", a note that the CAF page now leads to the Zero Trust article, and one sentence with its recommendations. The DevSecOps table is unchanged (it is a synthesis) |
| Incident preparation stage names | CAF Secure overview: "…recovery, and post-incident learning" | "lessons learned" → "post-incident learning" (FR « apprentissage post-incident », the quiz's wording) |
| Strategy step "incident preparedness" | Confirmed: the Strategy checklist lists "Incident preparedness and response strategy" | None |

## 21-security-operations

| Finding | Learn | Change |
| --- | --- | --- |
| AIR changed on September 1, 2026 | Confirmed ("Automation levels in automated investigation and remediation", Important note): AIR no longer runs as a separate investigation experience and can't be triggered manually in Microsoft Defender. Its capabilities run automatically in the default antivirus protection stack, and a full antivirus scan replaces on-demand investigation. Automation levels are still described there. The Defender for Office 365 AIR page (updated 2026-06-02) still describes email AIR: triggered by alerts or manually, with actions queued for approval. The Defender XDR AIR page (2025) has no note | SOAR table AIR row: email AIR (Defender for Office 365, actions approved by the SOC); on devices, the September 2026 change and the role of the automation level. "Seconds" SLA sentence: attack disruption only. Requirement row: "Full automation level on the device group". Key point updated |
| Playbook managed identity is preview | Confirmed ("Authenticate playbooks to Microsoft Sentinel": "Managed identity (Preview)") | Playbook design sentence: "an identity with only the roles… (a service principal; managed identity authentication of the Sentinel connector is still in preview)" |
| MSSP / Azure Lighthouse in the Defender portal | Confirmed: microsoft-sentinel-onboard says GDAP with Azure Lighthouse isn't supported for Sentinel data in the Defender portal and to use Microsoft Entra B2B. mto-requirements: Sentinel data uses B2B, GDAP isn't supported, and Lighthouse is required only for cross-tenant queries (`workspace()`). move-to-defender: the Defender multitenant portal serves MSSPs | centralized-logging: MSSP sentence rewritten (multitenant portal, B2B, no GDAP, Lighthouse for cross-tenant queries) |
| MITRE page (simulated coverage) is preview | Confirmed: the whole MITRE page is preview; it is aligned with ATT&CK v18 | None (the chapter already says preview). Bank questions flagged below |
| Analytics retention up to 2 years | Confirmed (manage-data-overview: up to two years; 90 days free for solution tables; data lake up to 12 years; advanced hunting 30 days) | None |
| Tenant-based Defender for Cloud connector: GA? | **Preview**: microsoft-sentinel-onboard names it "Tenant-based Microsoft Defender for Cloud (Preview)" | None in the chapter (not mentioned). Quiz Q9 flagged below |
| Sentinel leaves the Azure portal after March 31, 2027 | Confirmed (microsoft-sentinel-defender-portal) | None |

## 22-identity-access

| Finding | Learn | Change |
| --- | --- | --- |
| Agent user "a mailbox, a Teams presence" | Confirmed: agent-users page ("digital worker capabilities such as a mailbox, Teams presence…") | None |
| CA for agents "require a compliant device for agent users" | Partly confirmed: device compliance applies to agents on managed endpoints (Windows 365 Cloud PCs for Agents), with the "Agent execution environments (Preview)" condition | agent-identities: the clause is now limited to managed endpoints, and the preview condition is named |
| "All users" policies don't cover agent's user accounts | Confirmed: "Policies scoped through the 'Users' assignment don't apply to agent user accounts… whether the policy targets all users…" | Limits sentence: new first item |
| Tenant restrictions are separate; B2B direct connect with MFA needs MFA trust | Confirmed (cross-tenant-access-overview), plus "Organizational settings take precedence over default settings" | external-identities: one parenthesis and two sentences |
| LDAP signing vs channel binding | Confirmed ("LDAP signing" page): signing = integrity and authenticity against man-in-the-middle and replay, no confidentiality. CBT binds authentication to the TLS session against credential relay, and applies to "TLS + SASL sessions only" | harden-ad-ds, Legacy protocols row |
| Workload identity risk: managed identities out of scope | Confirmed (concept-workload-identity-risk); without Workload ID Premium, detections still appear with limited details | modern-authn-authz: risk sentence |

## Mock-exam bank questions changed

- `questions/operations-identity/sc100-2a-automation-layers.yaml` (dragdrop, 2.1.4): the t3 target "Investigate an alert and quarantine malicious files and email messages" became "Investigate a suspicious email alert and queue remediation of the malicious messages for approval" (EN + FR). The `explanation.correct` AIR sentence now describes Defender for Office 365 AIR. Why: since September 1, 2026, device AIR no longer runs as a separate investigation, so "quarantine malicious files" through AIR was out of date. Email AIR is still documented. Same id, type, objective, difficulty and answer mapping.

## Checked and left unchanged

- AIR distractors: `sc100-2a-itsm-ticketing` (option d) and `sc100-2a-containment-speed` (option c). Both are still wrong for their stated reasons.
- `sc100-2a-agent-delegated-risk`: the "compliant device for the agent's user account" distractor is still wrong.
- `sc100-1a-backup-priority-systems`: matches the fetched priority list.
- `sc100-1a-aws-default-standards`: matches concept-regulatory-compliance-standards.
- External identities: `sc100-2b-partner-trust-scope`, `sc100-2b-b2b-direct-connect`, `sc100-2b-external-facts`. They agree with cross-tenant-access-overview.
- `sc100-2a-coverage-data-gap`: its answer (the data connector) is GA.
- `sc100-cs2a-ics-coverage`: its answer is the ICS matrix, not the Sentinel page.
- No bank question of these objectives mentions Azure Lighthouse, the tenant-based Defender for Cloud connector or LDAP channel binding.
- Quizzes: none changed. The five quizzes agree with the corrected chapters (Quiz 13 already says "post-incident learning"; quiz 22 already uses the LDAP, workload-risk and "All users" facts; quiz 21 avoids AIR).

## For a human decision

- **Preview MITRE page as a correct answer (2.1.6).** The whole Sentinel MITRE ATT&CK page is preview. `sc100-2a-simulated-coverage` makes its simulated coverage view the correct answer. `sc100-2a-coverage-table` and `sc100-2a-mitre-page-facts` use the page as their premise. The objective names "MITRE ATT&CK matrices", not the page, but the page is Microsoft's tool for evaluating coverage against them. Kept: decide whether the objective covers it.
- **MCSB v2 (preview) AI controls (1.2.3).** The objective names the benchmark, and the AI domain exists only in v2 (preview). Bank and quiz questions on AI-1 to AI-7 were kept.
- **Quiz 21 Q9** (`sc100-qz-21-09`): the correct answer is the tenant-based Defender for Cloud connector, which Learn labels "(Preview)". The quiz isn't in scope for this fix (no chapter change made it wrong). Owner to decide.
- **`sc100-2a-playbook-permissions`**: the answer (Responder / Reader roles) matches Learn. But the scenario's identities are playbook managed identities, which are preview for the Sentinel connector. Not changed, because nothing contradicts Learn. Rewrite it with service principals if preview premises are excluded. Note: Learn's service-principal section suggests Sentinel Contributor for updating incidents, which would make s1 ambiguous with a service principal.
- **Chapter 11 stakeholder questions**: not found on any fetched Learn page. Source them or remove them.
- **Azure Backup security levels**: Learn is ambiguous for reversible soft delete (Good vs Poor). The chapter copies Learn.
- **Default MCSB version** in Defender for Cloud: not stated on the fetched pages.

## French terms not settled (not in the glossary, or not decided)

- « paramètres d'approbation » (trust settings), « restrictions de locataire » (tenant restrictions): consistent with « approuver » in the questions guide and the bank, but not checked on fr-fr Learn.
- « attaques de l'intercepteur et par relecture » (man-in-the-middle and replay), « liaison de canal LDAP », « relais d'informations d'identification », « liaisons SASL »: not in the glossary.
- « portail multilocataire Microsoft Defender », « requêtes interlocataires »: not in the glossary.
- « pile de protection antivirus », « mettre en file d'attente des actions de correction »: not in the glossary.
- « apprentissage post-incident »: from quiz 13, not in the glossary.
- Out of scope, not changed: chapter 12 FR uses « degré de sécurisation » for Secure Score, and "Secure Score" is `undecided` in the glossary. Bank `sc100-2a-automation-layers` FR says « Examen et réponse automatisés (AIR) » while chapter 21 FR says « Investigation et réponse automatisées (AIR) ». Neither was harmonized.
