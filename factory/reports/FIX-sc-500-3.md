# FIX-sc-500-3 — chapters 41 to 44 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-500 41-defender-cloud-posture 42-sentinel-workspace 43-sentinel-collection 44-security-copilot` 0 problems; `content:validate --cert sc-500` 0 problems, 0 warnings; `check-quiz sc-500` (4 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed. The shared WebFetch budget ran out several times during the pass; the pages that could not be read are named below.

## 41-defender-cloud-posture

| Finding | Learn | Change |
| --- | --- | --- |
| Defender for Storage built-in remediation missing | Confirmed (defender-for-storage-configure-malware-scan, 2026-07-03): **soft delete malicious blobs**, off by default, subscription or account level, turns blob soft delete on if needed, retention 7 days by default (1–365) | Storage bullets: new bullet for the built-in option; the Event Grid / Functions / Logic Apps bullet now covers custom responses (quarantine, notify) |
| EASM in Defender CSPM: cloud only, or cloud and on-premises | The CSPM overview (2026-09-30) says "in cloud and on-premises environments"; concept-easm (the specific page, 2026-06-17) still says "internet facing cloud resources" | None (most specific page followed). See human decisions |
| EASM cross-tenant/Lighthouse unsupported, deleted resource not restorable | **Not confirmed**: data-residency-and-recovery failed three times | None |
| Plans needed to add standards | update-regulatory-compliance-packages (2026-08-08) and the FAQ: any plan except Defender for Servers Plan 1 / Defender for APIs Plan 1. The CSPM comparison table says Defender CSPM only | Section text and key point: "a Defender plan other than Defender for Servers Plan 1 or Defender for APIs Plan 1" (was "a paid plan"); matches bank `sc500-4a-rc-standard-plan` |
| Roles to add a standard | FAQ (2026-06-16): Resource Policy Contributor + Security Admin; update-regulatory-compliance-packages (2026-08-08): "Owner or Policy Contributor" | None. See human decisions |
| AWS default standard | concept-regulatory-compliance-standards (2026-06-17): AWS = MCSB **and** AWS Foundational Security Best Practices; GCP = MCSB and GCP Default | Sentence added; MCSB-by-default statement kept (bank `rc-statements` s1 stays correct) |
| Exclusions and Sentinel-connected AWS accounts absent | Confirmed (quickstart-onboard-aws, quickstart-onboard-gcp, 2026-08-04): AWS management account excludes account IDs; GCP organization excludes project numbers and folder IDs; an AWS account connected to Sentinel needs the dedicated procedure | multicloud-connectors: two sentences (supports bank `mc-statements`) |
| Agentless malware scanning | Confirmed (concept-agentless-data-collection, 2026-10-14): malware scanning is Defender for Servers Plan 2 only; agentless also covers secrets and EDR settings | mdvm-settings: one sentence after the table |
| Exemption expiration | exempt-resource (2026-10-29): Azure portal "(Optional) Set an expiration date"; the Defender portal section talks of mandatory expiration | "optionally with an expiration date in the Azure portal" |
| CIEM prerequisites, Aug 2026 CIEM changes, critical assets preview, Policy at scale | CIEM prerequisites re-confirmed in both quickstarts; the rest not exam-critical / not tested | None |

## 42-sentinel-workspace

| Finding | Learn | Change |
| --- | --- | --- |
| Primary workspace onboarding: Security Administrator **and** Owner, or alternatives | Ambiguous. workspaces-defender-portal (2026-06-08) table: Security Administrator (scope Tenant) with Owner OR UAA + Sentinel Contributor (scope Subscription), under "Use one of the following roles or role combinations"; microsoft-sentinel-onboard (2026-08-07) footnote: Security Administrator "also" required when the tenant has more than one Sentinel workspace | None (chapter reads it as a combination). See human decisions |
| Playbook templates are preview | Confirmed (automate-responses-with-playbooks, 2026-06-12) | Content hub table: "Playbook template (preview)" |
| Running playbooks needs Logic App Contributor? | The playbooks page says "To run the playbooks, you'll also need the Logic App Contributor role"; its own role table and the roles page say Playbook Operator runs playbooks manually | None. See human decisions |
| Alert trigger scope | Confirmed (automate-incident-handling-with-automation-rules): Scheduled, NRT **and Microsoft security** analytics rules; in the Defender portal, not for alerts created by Defender XDR (Enhanced Alert Trigger instead) | Trigger row of the automation-rule table |
| Data lake mirroring "without extra charge" | manage-data-overview (2026-11-09): analytics data is mirrored to the lake for the same retention period; free storage is stated only when total = analytics retention; beyond that, data lake storage costs | Retention table row rewritten without the cost claim |
| CLI limit | Confirmed (data-retention-configure, 2026-09-29): `--total-retention-time` up to 2,556 days; portal, REST or `Update-AzOperationalInsightsTable` for up to 4,383 days | One sentence after the code block (code unchanged) |
| Analytics default 30 days / 90 days free | Confirmed (manage-data-overview: default 30 days, Sentinel solution tables extendable to 90 days free; up to two years) | None |

## 43-sentinel-collection

| Finding | Learn | Change |
| --- | --- | --- |
| Third table plan name | Confirmed (create-custom-table, 2026-09-30): "Analytics (default), Basic, or Auxiliary / Lake" | "**Auxiliary / Lake**" in the custom-table paragraph and table row; "Analytics by default" |
| Purview Audit 1-year E5 list includes OneDrive | audit-log-retention-policies (2026-06-19) lists Exchange Online, SharePoint, **OneDrive** and Microsoft Entra | None (chapter is right) |
| Storage connector "one policy per service" | **Not confirmed**: the connector URL now redirects to the 1.5 MB connector reference page | None; no bank question of my objectives relies on it |
| q6 port 28330, q9 DCR drop behaviour, q10 provider registration | Inferences of the quiz writer; the DCR statement ("doesn't update data collection rules automatically") is confirmed on create-custom-table | None |
| Defender for Cloud connector page title (title tag vs H1) | Reference titles only | None |

## 44-security-copilot

| Finding | Learn | Change |
| --- | --- | --- |
| Conditional Access Administrator listed as default owner | Wrong: authentication page (2026-06-04) lists Billing Administrator, Entra Compliance Administrator, Global Administrator, Intune Administrator, Security Administrator, and Purview Compliance Administrator, Purview Data Governance Administrator, Purview Organization Management | Default-roles table row: Conditional Access Administrator removed, list aligned |
| Security Alert Triage Agent preview | Confirmed (security-copilot-agents-defender, 2026-08-05): heading "(Preview)"; available only to preview customers, others keep the Phishing Triage Agent in Security Store. No other agent on the page is labelled preview | Agents table row: "(preview)" on the agent and the availability note |
| Default workspace and per-product assignment | Confirmed (training unit "Assign workspaces for integrated agents"): **Owner settings** > **Workspaces for Microsoft Security Copilot agents** assigns a workspace per product (Defender XDR, Purview, Intune, Microsoft Entra), tenant-wide; without assignment the oldest workspace is used; turn off agent triggers before switching, feedback and session memory don't carry over | Default workspace row qualified; new table row for the setting |
| Agent identity "currently Microsoft-built agents only" | **Not confirmed** (not found by the quiz writer; not re-fetched) | None |
| Redirected URLs manage-workspaces / workspaces-overview | No chapter, bank or quiz file of these chapters references them (course.yaml not checked: not mine) | None |

## Mock-exam bank questions changed

- `questions/posture/sc500-4c-agent-defender-map.yaml` (4.3.4, dragdrop): r1 mapped to the Security Alert Triage Agent, a Preview agent. r1 now reads "Run on-demand anomaly detection, risk scoring and forecasting on Sentinel data lake data without writing queries" (EN + FR) and maps to the Security Analyst Agent; the triage agent stays as the unused item. Explanation (EN + FR) rewritten accordingly from security-copilot-agents-defender. Same id, type, objective, difficulty.
- `questions/posture/sc500-4c-copilot-capacity-facts.yaml` (4.3.1, yesno): s3 (Defender embedded prompts consume WS-SOC's capacity) became arguable because a product can be assigned to another workspace. Stem now states that no workspace is assigned to any product in **Workspaces for Microsoft Security Copilot agents**; explanation qualified (EN + FR). Answer unchanged.

## Checked and left unchanged

`sc500-4a-easm-standalone` (relies on the cloud-only reading of concept-easm; assets are third-party hosted, not connected environments), `sc500-4a-rc-statements` (s1 true: MCSB is default for AWS), `sc500-4a-rc-standard-plan` (follows update-regulatory-compliance-packages), `sc500-4a-mc-statements` (all three statements confirmed), the storage plan questions (`sc500-4a-wp-storage-*`, `wp-plan-match`: none asks for blob deletion), the automation questions using the alert trigger (`sc500-cs1a-automation-rule`, `sc500-4b-auto-closed-sync`, `sc500-4b-auto-grayed-playbook`), the retention questions (`sc500-4c-retention-*`, `sc500-sr2-signin-retention-*`: all CLI values ≤ 1,095 days; "90 days free" confirmed), the Sentinel role questions (`sc500-4b-roles-*`, `sc500-cs1a-sentinel-roles`, `sc500-cs3b-soc-roles`), and the Copilot default-workspace and role questions (`sc500-4c-copilot-default-ws`, `-contributor-group`, `-ws-create`, `-intune-helpdesk`: none lists Conditional Access Administrator).

Note for a reviewer: `sc500-4a-mc-statements` cites "Connect AWS accounts to Microsoft Defender for Cloud"; the current page title is "Connect your AWS Account". Not changed (title only).

## Quiz files

None changed. Quiz 41 Q8 explanation says standards "require a paid plan, so Sub-B first needs a plan such as Defender CSPM": still true with the more precise chapter wording. check-quiz 0/0.

## For a human decision

- **Roles to add a compliance standard** (41): Resource Policy Contributor + Security Admin (FAQ, regulatory-compliance-dashboard, chapter) vs "Owner or Policy Contributor" (update-regulatory-compliance-packages, newer). Not tested in bank or quiz.
- **Plans for compliance standards** (41): the CSPM comparison table says "Regulatory compliance assessments" is Defender CSPM only, against two pages that accept any plan except Servers Plan 1 / APIs Plan 1. Chapter and bank follow the two specific pages.
- **EASM scope in Defender CSPM** (41): overview "cloud and on-premises" vs concept-easm "cloud resources". If the overview wording is adopted, revisit the chapter's EASM table and `sc500-4a-easm-standalone` options a/d.
- **EASM cross-tenant / Lighthouse and non-restorable deletion** (41): page unreadable; claim kept unverified.
- **Primary workspace onboarding roles** (42): Security Administrator required always, or only with more than one Sentinel workspace? Chapter trap and key point depend on it.
- **Logic App Contributor to run playbooks** (42): playbooks page vs roles page.
- **Agent identity limited to Microsoft-built agents** (44) and **Storage connector "one policy per service"** (43): unverified, kept.
- French: « degré de sécurisation » is used in 41 for Secure Score, which is `undecided` in the glossary (not settled here). Chapter 42 translates portal paths (« Données et connecteurs », « Système > Paramètres ») while the questions guide keeps blade names in English: to harmonise. New terms not in the glossary: « suppression réversible des objets blob malveillants », « Antivirus Microsoft Defender », « préversion », « mise en miroir ».
