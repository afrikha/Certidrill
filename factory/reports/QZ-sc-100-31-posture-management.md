# QZ-sc-100-31-posture-management — report

File: `content/sc-100/quizzes/31-posture-management.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

Coverage: 3.1.1 (q1, q7), 3.1.2 (q3), 3.1.3 (q4, q10), 3.1.4 (q6), 3.1.5 (q8), 3.1.6 (q2), 3.1.7 (q5, q9). Hard formats: multi (q6), yesno_statements (q7), single (q8, q10), dropdown (q9).
Decisions chosen to avoid the 51 mock-exam questions of these objectives: CSPM vs CWP, EASM discovery seeds, Secure Score "Resolved through alternate mitigation" (the bank tests "third party"), continuous export to Event Hubs for Splunk at root MG, Exposure insights score-drop events, Defender for Storage + Defender for Azure Cosmos DB, classic score (preview and custom recommendations excluded, control points), Arc + Defender for SQL Servers on Machines, attack surface map / blast radius / exemption, DeployIfNotExists at the top MG + AWS management-account connector. q9 stem was reworded once (too close to `sc100-3a-exposure-blocks-dropdown`).

## Chapter out of date or imprecise against current Learn

1. **Security baselines (3.1.1).** The chapter says each Azure service has a security baseline that maps the MCSB controls. The Key Vault baseline page (fetched) now says it reflects MCSB **v1.0** and points to the service's "Secure your Azure Key Vault" guidance, while the MCSB overview page is "Microsoft cloud security benchmark v2 (preview)" (12 domains, new AI Security domain, mappings to NIST 800-53 r5, PCI DSS v4, CIS v8.1, NIST CSF v2.0, ISO 27001:2022, SOC 2). The baselines look legacy; not used in the quiz. Consider mentioning v2 (preview) and the 12 domains.
2. **Secure Score and security defaults (3.1.2).** The chapter's example "security defaults cover the MFA and legacy authentication actions" as alternate mitigation isn't on the fetched Secure Score pages; Learn defines "Resolved through alternate mitigation" as an action addressed by an internal tool. Not used; to verify or reword.
3. **Secure Score read/write roles (3.1.2).** Learn lists Exchange Administrator and SharePoint Administrator with Security Administrator for read/write, and Helpdesk Administrator, User Administrator, Service Support Administrator among read-only roles; the chapter lists a subset. Minor.
4. **Exemptions in Defender for Cloud (3.1.1).** The chapter table puts exemptions in Foundational CSPM. The "Exempt resources from recommendations" page doesn't state the plan requirement and is internally inconsistent on the score effect of Mitigated; it also says expiration is optional in the Azure portal but mandatory with review periods in the Defender portal. Avoided in the quiz.
5. **Continuous export (3.1.3).** The chapter says continuous export feeds ticketing and Sentinel; Learn adds that Event Hubs is the route for third-party SIEMs (Splunk, QRadar) and that a built-in policy deploys export to an event hub at the root management group. Q4 relies on Learn.

## Facts verified (pages fetched)

CSPM feature table (Foundational vs Defender CSPM, custom recommendations and code-to-cloud mapping = Defender CSPM); classic vs Cloud Secure Score (preview and custom recommendations excluded, weighting, 8-hour recalculation); Secure Score statuses; continuous export destinations; export-to-SIEM; Defender for Storage (on-upload malware scanning, Blob and Files); Defender for Azure Cosmos DB (NoSQL API only, SQL injection, Tor); Defender for SQL Servers on Machines (on-premises requires Arc and SQL Server enabled by Azure Arc); AWS management-account connector (delegated administrator not supported, auto-provisioning of new member accounts); onboarding a management group with Azure Policy + remediation; Exposure Management overview (exemptions with justification and review period, public cloud only), initiatives (events on score drops), attack paths (choke points, blast radius); Defender EASM overview (seeds, recursive discovery; no retirement notice found).

## Doubts and terminology

- q10: the AWS connector page doesn't explicitly say that the plans selected on the management-account connector apply to auto-provisioned member connectors; the chapter and the bank assume it. Kept, low risk.
- q8: Learn doesn't state in one sentence that Defender for Servers excludes SQL threat protection; it is implied by Defender for SQL Servers on Machines being part of Defender for Databases.
- French: chapter 31 FR writes « Defender for Cloud » while chapter 24 FR writes « Defender pour le cloud »; the quiz follows chapter 31. "Secure Score" is still `undecided` in `content/glossary.yaml`; the quiz uses « Niveau de sécurité Microsoft » and « degré de sécurisation » as the chapter does. Portal values (Resolved through alternate mitigation, Events, To address) kept in English.
- Search result seen: a message-center item about the retirement of OT security in Microsoft Defender for IoT; the chapter's 3.1.6 exam trap cites Defender for IoT for OT discovery. Not verified on Learn; worth checking for the chapter.
