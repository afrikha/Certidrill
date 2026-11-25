# QZ-sc-500-41-defender-cloud-posture

File: `content/sc-500/quizzes/41-defender-cloud-posture.yaml` (10 questions, `sc500-qz-41-01`…`10`, draft). Check: `0 problem(s), 0 warning(s)`.

- Positions/objectives: 1 4.1.1 (d1 single), 2 4.1.6 (d1 single), 3 4.1.3 (d2 single), 4 4.1.5 (d2 single), 5 4.1.2 (d2 single), 6 4.1.3 (d3 single), 7 4.1.1 (d3 dragdrop), 8 4.1.2 (d3 multi), 9 4.1.4 (d3 dropdown), 10 4.1.5 (d3 yesno).
- The 41 mock questions of 4.1.1–4.1.6 were read; the quiz tests other decisions (risk prioritization, EASM creation role, Event Grid scan results, Waiver exemption, dashboard ≠ certification, DNS alerts in Servers Plan 2, CSPM components, standard on a foundational-only subscription for Purview, CIEM prerequisites + stack update, premium DVM features).

## Sources fetched (2026-11-24, en-us)

concept-cloud-security-posture-management, tutorial-enable-cspm-plan, critical-assets-protection, defender-for-storage-configure-malware-scan, defender-for-storage-policy-enablement, enable-permissions-management, quickstart-onboard-aws, quickstart-onboard-gcp, disable-vulnerability-findings, exempt-resource, concept-agentless-data-collection, enable-agentless-scanning-vms, defender-for-servers-overview, defender-for-dns-introduction, update-regulatory-compliance-packages, regulatory-compliance-dashboard, faq-regulatory-compliance, EASM deploying-the-defender-easm-azure-resource. EASM data-residency-and-recovery could not be fetched.

## Chapter (and mock) points out of date or inconsistent with Learn

- **Defender for Storage remediation**: Learn now has a built-in **soft delete malicious blobs** option (off by default, retention 1–365 days, turns blob soft delete on if needed). The chapter only cites Event Grid / Functions / Logic Apps. Q3 is built so that Event Grid is required (routing clean blobs); a mock or quiz asking "delete malicious blobs with least effort" would now have the built-in option as answer.
- **EASM in Defender CSPM**: the chapter says the integration covers internet-facing **cloud** resources only; the CSPM page now says EASM in Defender CSPM discovers internet-facing assets "in cloud and on-premises environments". Mock `sc500-4a-easm-standalone` relies on the cloud-only reading. Not tested here.
- **EASM cross-tenant/Lighthouse unsupported, deleted resource not restorable** (chapter): not verified (page fetch failed). The creation page says Contributor is required but doesn't state the scope (Q2 uses the resource group).
- **Standards and plans**: update-regulatory-compliance-packages = any plan except Servers Plan 1 / APIs Plan 1; FAQ = Servers gives compliance data only with Plan 2; CSPM comparison table = "Regulatory compliance assessments" Defender CSPM only; Defender for Servers overview lists "Regulatory compliance assessment" Yes for Plan 1 ("varies by standard"). Q8 avoids it (Sub-B has no paid plan).
- **Roles to add a standard**: chapter/dashboard/FAQ = Resource Policy Contributor + Security Admin; update-regulatory-compliance-packages = Owner or Policy Contributor. Not tested.
- **AWS default standard**: FAQ says AWS Foundational Security Best Practices is assigned at AWS onboarding; the chapter (and mock `rc-statements` s1) say MCSB is the default for AWS accounts. Possibly both; to check.
- **CIEM prerequisites**: the CIEM page lists only Security Admin; the AWS and GCP quickstarts add `Application.ReadWrite.All` for the tenant (Q9 follows the quickstarts and the chapter). CIEM changes of Aug 6, 2026 (no list of unused actions, PCI metric deprecated) are absent from the chapter (not exam-critical).
- **Exclusions and Sentinel-connected AWS accounts** are not in the chapter, but mock `sc500-4a-mc-statements` tests both (AWS management-account exclusion list; AWS account already connected to Sentinel can't be connected without the dedicated procedure). GCP organization connectors can also exclude project numbers and folder IDs.
- **Agentless scanning**: Defender CSPM = inventory, vulnerabilities, secrets; malware scanning (agentless) is Plan 2 only; fixed 24-hour schedule. The chapter doesn't mention agentless malware scanning.
- **Critical assets**: page title says Preview, availability table says GA; recommendation prioritization by criticality is "Preview available". Not used as an answer.
- **Azure Policy at scale** (chapter: DeployIfNotExists + remediation task): the Storage policy page names the definitions ("Configure Microsoft Defender for Storage to be enabled" and a basic variant) but doesn't state the effect or remediation. Not tested.

## Doubts

- Q2: Security Admin not able to create a `Microsoft.Easm/workspaces` resource is from the role definition (Microsoft.Security/* actions), not from an EASM page.
- Q4: Azure portal exemption categories are named Mitigated and Waiver (Defender portal: "Risk accepted"); expiration is optional in the Azure flow.
- Q10 s2: premium DVM features = Defender for Servers Plan 2 only (Servers overview); Defender CSPM doesn't add them is an inference from that table.
- French: « Secure Score » is `undecided` in the glossary, so the quiz avoids the term. Kept in English: plan names, component names in EN items, Waiver/Mitigated, Least privilege access (with French gloss). « rubrique personnalisée Event Grid », « tunnel DNS », « RSSI » not checked on fr-fr pages.
