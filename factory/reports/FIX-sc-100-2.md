# FIX-sc-100-2 — chapters 23, 24, 31, 32, 33 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert sc-100 23-privileged-access 24-regulatory-compliance 31-posture-management 32-endpoints 33-cloud-services` 0 problems; `content:validate --cert sc-100` 0 problems, 0 warnings; `check-quiz sc-100` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No section marker or code block changed. The shared WebFetch budget ran out several times, so a few findings were left unchanged as "not confirmed" (listed below).

## 23-privileged-access

| Finding | Learn | Change |
| --- | --- | --- |
| PAW hardware (TPM 2.0, Secure Boot, VBS) not on the deployment page | privileged-access-deployment (2024-06) has no hardware list. privileged-access-devices (updated 2026-11-10) lists TPM 2.0, BitLocker, UEFI Secure Boot, "Virtualization and HVCI Enabled", Windows Hello, DMA protection, System Guard | PAW paragraph: "TPM 2.0, UEFI Secure Boot, and virtualization and HVCI enabled" |
| "A second reviewer stage for privileged roles" | Confirmed wrong for PIM (pim-create-roles-and-resource-roles-review, 2026-04-23): one reviewer set. Options are selected users, members (self) or manager with a fallback reviewer | Reviewers row: named reviewers for privileged roles, single stage |
| Role review behaviors that q10 tests | Confirmed (same page): role-assignable groups not expanded in Entra role reviews; in Azure resource role reviews a denied user stays in the group; service principal reviews need Workload ID Premium plus P2 or ID Governance | New paragraph after the table |
| "Too many Global Administrators" alert criteria | Confirmed (pim-how-to-configure-security-alerts): fires only when both the minimum number and the percentage are reached; low severity. "Roles assigned outside PIM" is high severity | PIM design paragraph |
| Permissions Management dates (April 1 / November 1, 2025) | how-to-offboard-permissions-management: end of sale April 1, 2025. The top note says support is discontinued November 1, 2025, but the body says retirement and automatic offboarding happen October 1, 2025. The Defender for Cloud CIEM page gives no date | None (the chapter follows the note). Needs a human decision |
| Intermediaries page is dated and names Windows Virtual Desktop | The chapter doesn't use that name | None |
| FR « Defender pour le cloud » | BRIEF: product names stay in English; 10 SC-100 FR chapters write only « Defender for Cloud », 21 and 23 mixed both, 24 used only « pour le cloud » | « Microsoft Defender for Cloud », « Defender for Cloud » |

## 24-regulatory-compliance

| Finding | Learn | Change |
| --- | --- | --- |
| Purview Data Map and Unified Catalog recommended for data inventory | Confirmed (data-map-data-sources, 2026-10-13): Unified Catalog and classic data governance (formerly Azure Purview) are being retired, no new data governance accounts, maintenance mode through November 12, 2027, data governance consolidated in Microsoft Fabric; data security and compliance capabilities not affected. The page doesn't say whether the Data Map itself is included (aka.ms/DG-Deprecation couldn't be fetched) | Last row of the Purview table now gives the retirement status instead of recommending it |
| Compliance Manager "assesses other clouds through connectors" | Wrong (compliance-manager-multicloud): Azure, AWS and GCP go through the Defender for Cloud integration (subscriptions in scope of a matching regulation in Defender for Cloud); connectors are for non-Microsoft services such as Salesforce and Zoom | Paragraph after the Compliance Manager table |
| Control types | Confirmed (purview/compliance-manager): Microsoft managed, your controls (customer managed), shared | Control row of the table |
| FR « Defender pour le cloud » (14 times) | Same as chapter 23 | « Defender for Cloud » everywhere |
| Plan needed to add standards (row "Prerequisite") | Confirmed (update-regulatory-compliance-packages): any plan except Defender for Servers Plan 1 and Defender for APIs Plan 1 | None (already right) |

## 31-posture-management

| Finding | Learn | Change |
| --- | --- | --- |
| Security baselines map MCSB controls | MCSB overview is "MCSB v2 (preview)", supersedes v1, 12 domains with a new Artificial Intelligence Security domain. The Key Vault baseline says it is based on MCSB v1.0 and points to "Secure your Azure Key Vault" | MCSB paragraph: new sentence |
| Security defaults as an "alternate mitigation" example | Wrong (microsoft-secure-score): security defaults give full points on MFA for all users, MFA for admins and legacy authentication; Microsoft recommends "Resolved through alternative mitigation" for the sign-in risk and user risk policy actions | Secure Score bullet reworded |
| Secure Score roles | Confirmed (microsoft-secure-score): read/write Security Administrator or higher, Exchange Administrator, SharePoint Administrator; read-only Helpdesk Administrator, User Administrator, Service Support Administrator, Security Reader, Security Operator, Global Reader | Access bullet |
| Exemptions in Foundational CSPM | **Not confirmed**: exempt-resource states only the MCSB prerequisite, no plan; the CSPM feature table has no exemptions row. Expiration optional in the Azure portal, the page is inconsistent for the Defender portal | None |
| Continuous export feeds Sentinel | Learn (export-to-siem): Sentinel uses its built-in Defender for Cloud connectors; Splunk and QRadar use Event Hubs; the built-in policy "Deploy export to an event hub…" at the root management group streams the tenant | Integrated posture principle 3 |
| Found while checking: "another standard means Defender CSPM" | update-regulatory-compliance-packages: any paid plan except Servers Plan 1 and APIs Plan 1. The CSPM table marks "Regulatory compliance assessments" as Defender CSPM only (it compares only the two CSPM plans) | New sentence after the CSPM table; exam trap reworded. The table row is kept (it matches the CSPM page) |
| Found while checking: gated deployment | Support matrix lists it for AKS 1.31 or later only | Workload protection table: "gated deployment (AKS only)" |
| Defender for IoT OT retirement (message-center item) | **Not confirmed**: lifecycle page "In Support", overview and what's new have no OT retirement notice (only the on-premises management console, January 1, 2025) | None. Flag for review |

## 32-endpoints

| Finding | Learn | Change |
| --- | --- | --- |
| Legacy LAPS "blocked on 23H2" | Confirmed wording (laps-overview, 2026-09-16): deprecated as of Windows 11 23H2; newer OS versions block the legacy MSI | Migration paragraph |
| Windows 10 without end-of-support caveat | Confirmed: end of support October 14, 2025; Windows LAPS only on Windows 10 devices still updated (ESU); new deployments use Windows 11 or a supported Windows Server | Windows LAPS intro: new sentence |
| Tamper protection platform nuance | Confirmed (prevent-changes-to-security-settings-with-tamper-protection, 2026-09-09): Windows enabled/disabled; macOS Audit/Block; Linux preview, Audit only (reports, doesn't block, even for root). Local admin behavior not stated | Clients table row |
| Defender for IoT in the Defender portal marked preview | Confirmed (Defender for IoT overview: "(Preview)") | None |
| Post-authentication actions | QZ writer confirmed; not re-fetched (budget) | None |
| IoT row "outbound-only connections to the cloud" | **Not confirmed**: "Secure your IoT solutions" (2026-07-07) has segmentation and allow lists, nothing on connection direction | None. Flag for review |

## 33-cloud-services

| Finding | Learn | Change |
| --- | --- | --- |
| Gated deployment scope | Confirmed (support-matrix-defender-for-containers): AKS 1.31 or later (including AKS Automatic), Linux GA, commercial clouds; no EKS/GKE/Arc rows | Containers table, Deployment row |
| Azure Container Apps not supported by Defender for Containers | **Not confirmed**: the support matrix doesn't mention Container Apps | None |
| Foundry roles | Confirmed (rbac-foundry): Foundry Agent Consumer is the least-privileged role for principals that only interact with agents; Foundry User for building and testing | AI services, Identity row |
| Agent network injection "decided at deployment" | Confirmed (agents/how-to/virtual-networks, 2026-10-29): for hosted agents it must be included at Foundry account creation and can't be added later; nothing stated for prompt agents | AI services, Network row |
| Service baselines (3.3.1) | Same Key Vault baseline fact as chapter 31 | Service baselines paragraph: new sentence |
| Azure IoT Operations "secure settings" name | Suggestion only, not an error | None |
| AKS node OS default channel | Learn inconsistent (per the QZ report); the chapter states no default | None |

## Mock-exam bank questions changed

- `infrastructure/sc100-3b-laps-enable-entra` (option a explanation, EN + FR): "installation is blocked on Windows 11 23H2 and later" became "deprecated as of Windows 11 23H2, newer Windows versions block the installation of its MSI package" (laps-overview wording).
- `infrastructure/sc100-3a-containers-cspm-combo` (stem + explanation, EN + FR): the gated-deployment requirement covered AKS **and EKS**, but gated deployment is listed for AKS 1.31+ only. The requirement now reads "the deployment to the AKS clusters", and the explanation gives the AKS 1.31+ support. Same answer, id, type, difficulty.
- `infrastructure/sc100-3a-pci-multicloud-standard` (option c explanation, EN + FR): "require Defender CSPM" became "require a paid plan such as Defender CSPM (any plan except Servers Plan 1 and APIs Plan 1)". Same answer.
- `infrastructure/sc100-3a-mcsb-free-baseline` (option b explanation, EN + FR): "the paid Defender CSPM plan" became "a paid plan such as Defender CSPM". Same answer.

## Checked and left unchanged

- Access reviews: `sc100-2c-ar-design-evaluation` (its two-stage review is on groups, not PIM roles); the other 2.3.6 questions don't use a multi-stage PIM review.
- Secure Score: `sc100-3a-third-party-mfa`, `sc100-3a-planned-score`, `sc100-3a-score-reader-role`. None relies on the security-defaults example or the role list.
- Compliance Manager questions (2.4.1, 2.4.2): none relies on connectors for Azure, AWS or GCP. `sc100-2c-mdc-standards-evaluation` and `sc100-cs2b-pci-report` already state the right plan rule.
- Containers and Kubernetes: `sc100-3c-vuln-gate`, `sc100-cs1c-aks-guardrails`, `sc100-3c-container-findings`, `sc100-3c-container-controls`, `sc100-cs3a-privileged-pods`, `sc100-3c-acr-signing` (AKS only, or gated deployment only as a distractor). `sc100-3c-container-supply` doesn't involve Defender for Containers.
- AI: `sc100-3c-ai-keyless`, `sc100-cs3c-ai-controls` (Foundry User as a distractor is still right).
- LAPS: `sc100-3b-laps-device-grid`, `sc100-3b-laps-ad-encryption`.
- Defender for IoT (`sc100-3b-ot-*`, `sc100-cs2a-ot-sensors`, `sc100-3b-iot-*`): no Learn fact contradicts them (see the OT retirement flag).

## Quiz files

None changed. The five quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 31 q1 ("Defender CSPM adds … regulatory standards") is still true.

## For a human decision

1. **Defender for IoT OT security retirement.** A message-center item (AZ576255, and MC1526670 "deprecated in October 2029") was seen in search results. No Learn page carries it (lifecycle "In Support", overview, what's new). Chapters 31 (3.1.6 trap) and 32 (3.2.3, 3.2.4) and about 10 bank questions rely on Defender for IoT OT sensors. Recheck when Learn publishes it.
2. **Permissions Management end date**: October 1 or November 1, 2025 (the offboarding page gives both). The chapter keeps November 1.
3. **Purview Data Map scope.** Learn retires the Unified Catalog and classic data governance but doesn't say whether the Data Map is included. It also gives no replacement for inventorying data in Azure, AWS and on-premises databases. Out of my scope: chapter 43 and the 4.3.x/1.1.1 questions `sc100-4b-discovery-tools` (slot `datamap`, correct answer), `sc100-cs4b-data-discovery` (option c, correct answer), and the distractors in `sc100-4b-cspm-data`, `sc100-4c-multicloud-data-risk`, `sc100-4b-sql-classification`, `sc100-1a-critical-asset-discovery`.
4. **Plan for regulatory standards.** The CSPM feature table says Defender CSPM; the standards page says any plan except Servers P1 and APIs P1. The chapters now give both (table plus sentence).
5. **MCSB v2 (preview).** Learn doesn't say whether Defender for Cloud's default standard is v1 or v2. The chapters say "MCSB".
6. **Not on Learn**: plan required for exemptions (ch 31 table says Foundational: Yes); IoT "outbound-only connections" (ch 32); Container Apps not supported by Defender for Containers (QZ 33).
7. **French naming.** « Defender for Cloud » harmonized in chapters 23 and 24 (BRIEF: product names in English). This is not in the glossary. « Defender pour le cloud » is still in chapter 21 FR (7 times, other agent) and in the FR text of about 30 SC-100 bank questions (for example `sc100-2c-mdc-scores`, `sc100-2c-policy-multicloud`, `sc100-cs3c-ai-controls`). Secure Score is still `undecided` (chapters use « Niveau de sécurité Microsoft » and « degré de sécurisation »).
8. **New French terms not in the glossary**: « injection de réseau virtuel », « agents hébergés », « réviseur de secours », « groupe assignable à un rôle », « mises à jour de sécurité étendues (ESU) », « mode Block / Audit », « hub d'événements » (in the glossary as "event hub"). The MCSB domain name « Artificial Intelligence Security » and the page title "Secure your Azure Key Vault" are kept in English.
