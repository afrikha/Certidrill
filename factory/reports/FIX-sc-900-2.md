# FIX-sc-900-2 — chapters 24, 31, 32, 33 and 34 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-900 24-identity-protection-governance 31-azure-infrastructure-security 32-defender-for-cloud 33-sentinel 34-defender-xdr` 0 problems; `content:validate --cert sc-900` 0 problems, 0 warnings; `check-quiz sc-900` (5 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No section marker changed. The hourly WebFetch budget ran out several times. Each fetch was retried after a wait, and every fact changed below was fetched.

## 24-identity-protection-governance

| Finding | Learn | Change |
| --- | --- | --- |
| PIM also protects the last active Privileged Role Administrator assignment | Confirmed (pim-configure, updated 2026-11-17): "last active Global Administrator and Privileged Role Administrator role assignments" | PIM paragraph names both roles |
| PIM app roles | Preview (pim-configure, needs Entra ID Governance licenses) | None (preview, not in the objective) |
| "Require risk remediation"; legacy risk policies retired | Confirmed (concept-identity-protection-policies, updated 2026-08-14): for user risk, grant controls are Require risk remediation (the remediation flow for every authentication method: secure password change, or session revocation for passwordless users), Require password change, and Block. The legacy risk policies configured in ID Protection retire on **October 1, 2026**. Secure password change is still documented (howto-identity-protection-remediate-unblock, 2026-11-17) | Remediate row: MFA for a risky sign-in; for a risky user, Require password change or Require risk remediation. New sentence: risk policies are created in Conditional Access, and the legacy ID Protection policies retire on October 1, 2026 |
| Access review reviewers ("designated", no sponsors) | Overview table: "Specified reviewers", group owners (groups only), self-review, group members (access packages). create-access-review: "Managers of users" is also a reviewer option. Multi-stage: "up to three stages" confirmed | Who reviews row: self-review, group owners, the users' managers, or specified reviewers |

## 31-azure-infrastructure-security

| Finding | Learn | Change |
| --- | --- | --- |
| Default outbound access ("Outbound to the internet: Allowed") | Confirmed (ip-services/default-outbound-access, updated 2026-09-10): the portal already creates private subnets. With API versions released after March 31, 2026, subnets of new VNets have `defaultOutboundAccess = false`. Existing VNets aren't changed. The NAT gateway is the recommended explicit method | Segmentation table row: depends on the subnet; new VNets have private subnets that need an explicit method such as a NAT gateway; existing VNets keep default outbound access. The NSG default rule AllowInternetOutBound (NSG section) is an NSG fact and wasn't changed |
| Bastion and peering: Developer SKU | Confirmed (bastion-sku-comparison): Developer is "No" for VNet peering support and for connecting to VMs in peered VNets | Bastion sentence: "except with the Developer SKU"; Developer row: "no peered virtual networks" |
| WAF deployment options | WAF overview: Application Gateway, Application Gateway for Containers, Front Door, CDN (CDN in preview). The chapter says "mainly Application Gateway or Front Door", which is still correct | None |
| WAF modes | Confirmed (ag-overview: Detection logs, Prevention blocks) | None |
| FR « réseaux virtuels appairés » | Glossary and guide: « peering » | « réseaux virtuels reliés par peering » |

## 32-defender-for-cloud

| Finding | Learn | Change |
| --- | --- | --- |
| Two secure score models | Confirmed (secure-score-security-controls): the classic secure score stays in the Azure portal; the Defender portal has a risk-based **Cloud Secure Score** (0–100, asset risk factors and criticality). No preview label | CSPM section: new sentence |
| When the score improves | Confirmed: "To get all the possible points for a security control, all of your resources must comply with all of the security recommendations within the security control." Also confirmed: only built-in MCSB recommendations count, preview ones don't | Policies section: "a control gives all its points only when all the resources comply with all of its recommendations" |
| Regulatory compliance plan | CSPM table: "Regulatory compliance assessments" are in Defender CSPM, not Foundational. plan-defender-for-servers-select-plan (2026-11-17): "Available with Defender for Servers Plan 2 or any other paid plan". security-policy-concept: available "when you enable a Defender for Cloud plan". The pages agree that it needs a paid plan, which isn't only Defender CSPM | Policies section: new sentence: regulatory standards need a paid plan, Defender CSPM or another such as Defender for Servers Plan 2. The CSPM table row (Foundational No / Defender CSPM Yes) stays correct |
| Agentless scanning also in Defender for Servers Plan 2 | Confirmed (plan-defender-for-servers-select-plan: agentless vulnerability, malware and secrets scanning in Plan 2) | Defender for Servers row: "Plan 2 also includes agentless scanning of the machines" |
| Defender portal posture experience (no free Foundational CSPM, "MDC Baseline Policy", Azure only) | Confirmed on security-policy-concept, but the page says "This feature is currently in Public Preview in the Microsoft Defender portal" | None: the chapter keeps the GA Azure portal model (Foundational CSPM free, MCSB by default, confirmed on concept-regulatory-compliance-standards and the CSPM page) |
| Defender for DNS folded into Servers Plan 2 | Not re-fetched; the chapter doesn't mention it | None |

## 33-sentinel

| Finding | Learn | Change |
| --- | --- | --- |
| Fusion in the Defender portal | Confirmed (sentinel/fusion): "For Microsoft Sentinel workspaces that are onboarded to the Microsoft Defender portal, Fusion is disabled. Its functionality is replaced by the Microsoft Defender XDR correlation engine." Azure portal support ends after March 31, 2027 | Machine learning bullet: new sentence; key point "detect" now names the Defender XDR correlation engine |
| Data lake status | sentinel-lake-overview: no preview label and no GA date; up to 12 years; analytics tier mirrored to the lake tier | None (the chapter's sentence is correct) |
| Incident graph wording | Not re-fetched; the chapter wording isn't contradicted | None |

## 34-defender-xdr

| Finding | Learn | Change |
| --- | --- | --- |
| 3.4.1 suite list: eight services | Confirmed (training unit 2-describe-services): Defender for Endpoint, Defender Vulnerability Management, Defender for Office 365, Defender for Identity, Entra ID Protection, Defender for Cloud Apps, **Microsoft Defender Threat Intelligence**, **Microsoft Security Exposure Management**; Sentinel and Defender for Cloud are combined in the portal but aren't listed in the suite | Service table: two new rows (Defender TI, pointing to the Microsoft Threat Intelligence section; Security Exposure Management) |
| 3.4.5: Defender for Identity also monitors Entra ID and other IdPs | Confirmed (defender-for-identity/what-is, 2026-07-23: "on-premises Active Directory and Microsoft Entra ID, other IAM solutions (for example, Okta)"; same in training unit 2) | MDI section: new sentence; table row "on-premises Active Directory and Microsoft Entra ID, in hybrid environments"; key point updated. The exam trap (risky sign-ins → Entra ID Protection) stays |
| Defender TI standalone retirement (chapter and `sc900-3d-ti-standalone-converged`) | Confirmed (training unit 6b: "being retired on August 1, 2026", capabilities converging into Defender XDR and Sentinel). The Defender TI docs pages don't mention it | None |
| New Threat intelligence experience (not in the QZ report, found while checking 3.4.7) | defender-xdr/threat-intelligence-transition (2026-09-23) and the Defender TI page (2026-09-23): the new experience has two pages, **Overview** (threat articles) and **Intel explorer**; intel profiles become Intel explorer types (threat actor, tool, vulnerability...). Intel projects aren't mentioned. The training unit still lists threat analytics, intel profiles, intel explorer, projects | TI section: one sentence on the new experience, after the training-unit list (kept, because the exam follows it) |
| 3.4.4 naming: "Conditional Access app control" vs "adaptive access control (AAC)" | Docs page proxy-intro-aad (2026-05-08) uses only "Conditional Access app control", with no rename. The training-unit wording reported by the QZ agent wasn't re-fetched | None. Flagged |
| 3.4.2 impersonation protection | Not re-fetched (the QZ agent verified anti-phishing-policies-about). The chapter row is consistent with it | None |

## Mock-exam bank questions changed

None. No bank question of these 25 objectives relies on a fact that a verified Learn page contradicts, and none has a preview or retired feature as its correct answer (no "preview" in any of the 219 files).

## Quiz files changed

- `quizzes/32-defender-for-cloud.yaml` q3 (`sc900-qz-32-03`), explanation EN + FR: "belong to the Defender CSPM plan" became "require a paid plan: here, the Defender CSPM plan". The answer doesn't change: it is the only option that enables a plan.
- Same file, q10 (`sc900-qz-32-10`), explanations of f4 (regulatory compliance "require a paid plan such as Defender CSPM; Foundational CSPM doesn't include them") and f5 (agentless secrets scanning "comes with Defender CSPM as well as with Defender for Servers Plan 2"). The answers don't change: f3 is still the only finding that only a workload protection plan can produce.

## Checked and left unchanged

- 2.4.x: `sc900-2c-pim-assignments-yn` (s1 still true, and the explanation already names both roles), `sc900-2c-idp-risk-policies` (user risk → secure password change is still a documented control), `sc900-2c-idp-remediation-yn` (s2 No; Learn's exception, no MFA autoremediation for token-theft and verified-threat-actor-IP detections, doesn't make the general statement true), `sc900-2c-rev-*` (reviewers, recurrence, PIM for Entra and Azure roles), `sc900-2c-pim-groups` (PIM for Groups not labeled preview).
- 3.1.x: `sc900-3b-bastion-peering-scope` (states the Standard SKU), `sc900-3b-bastion-sku-table`, `sc900-3a-nsg-default-rules-yn` (NSG default rules, not default outbound access), `sc900-3a-seg-*` (none relies on default outbound access), `sc900-3a-waf-basics-yn` ("such as Application Gateway or Front Door").
- 3.2.x: `sc900-3b-pol-default-standard` (MCSB default, confirmed), `sc900-3b-pol-compliance-dashboard`, `sc900-3b-pol-custom-standard`, `sc900-3b-cspm-*`, `sc900-3b-cwp-*`, `sc900-3b-mdc-defender-portal`. None offers Defender for Servers as a wrong answer for agentless scanning or regulatory compliance.
- 3.3.x: all 16 (none mentions Fusion or the data lake).
- 3.4.x: `sc900-3c-xdr-*` (no item says the suite has six services or excludes Exposure Management or Defender TI), `sc900-3d-mdi-*` and `sc900-3c-xdr-incident-alerts` (each alert maps to a different service, so "leaked credentials" stays Entra ID Protection), `sc900-3d-ti-*` (Threat intelligence node, Intel explorer search, threat analytics), `sc900-3d-ti-standalone-converged` (retirement confirmed), `sc900-3c-mdca-capabilities-complete` and `-shadow-it` (Conditional Access app control, the docs name).
- Quizzes 24, 31, 33, 34: still agree with the corrected chapters. Quiz 34 q7's explanation lists six suite services with "includes", which isn't exhaustive, so it wasn't changed. A reviewer may want it aligned with the eight-service table.

## For a human decision

- **Default outbound access (31).** The VNet overview and the SC-900 training unit still say outbound is allowed by default. The chapter now follows the specific default-outbound-access page. Decide whether the course should keep this nuance for a fundamentals exam.
- **3.4.4 name.** The docs say "Conditional Access app control"; according to the QZ report, the training unit says "built-in adaptive access control (AAC)" (not re-fetched here). The chapter, the quiz and two bank questions use the docs name.
- **3.4.7 new Threat intelligence experience.** Overview + Intel explorer (docs, 2026-09-23), while the training unit lists threat analytics, intel profiles, intel explorer, projects. The chapter keeps both. `sc900-3d-ti-sentences-complete` slot t3 ("threat analytics dashboard … highest exposure") follows the training unit.
- **Defender portal posture management (32)** is in public preview (no free Foundational CSPM there, "MDC Baseline Policy"). The chapter isn't changed; revisit at GA.
- **Regulatory compliance plan (32).** The chapter now says "a paid plan" (Defender CSPM or another such as Defender for Servers Plan 2). Check that this is the wording you want; the CSPM comparison table still shows it as a Defender CSPM feature.
- French terms not settled: « score de sécurité » for Secure Score (still `undecided` in the glossary; chapter 32 uses it, now also for the classic score); « Cloud Secure Score » kept in English; « accès sortant par défaut », « sous-réseaux privés », « moteur de corrélation », « expérience Threat Intelligence », « Vue d'ensemble (Overview) », « Explorateur Intel », « réviseurs spécifiés », « responsables des utilisateurs » (Managers of users), « mises hors service » (retire): none is in the glossary. Grant control names (Require password change, Require risk remediation) are kept in English as portal values.
