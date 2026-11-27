# QZ-gcp-pca-32-compliance — report

File: `content/gcp-pca/quizzes/32-compliance.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-pca 32-compliance`: 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.2.4 | single | 1 | MIG autoscaling recorded in System Event audit logs |
| 2 | 3.2.1 | single | 1 | HIPAA: no PHI in resource names or labels (BAA, CMEK, disabling Data Access logs do not help) |
| 3 | 3.2.2 | single | 2 | Sensitive Data Protection risk analysis (k-anonymity) vs discovery and inspection |
| 4 | 3.2.3 | single | 2 | SOC 3 (public, same scope as SOC 2) vs SOC 2, bridge letter, Compliance Manager |
| 5 | 3.2.4 | single | 2 | Aggregated sink writes nothing: grant the writer identity BigQuery Data Editor |
| 6 | 3.2.1 | single | 3 | SecNumCloud and partner operation, no customer hardware: Google Cloud Dedicated |
| 7 | 3.2.4 | multi (2 of 5) | 3 | Who changed a firewall rule (Admin Activity) + its full configuration 20 days ago (Cloud Asset Inventory, 35 days) |
| 8 | 3.2.2 | multi (2 of 5) | 3 | PCI CDE: VPC Service Controls against copying with valid credentials + CMEK for key rotation and revocation |
| 9 | 3.2.4 | single | 3 | Intercepting aggregated sink (no copies in child `_Default` buckets or child sinks, `_Required` kept) |
| 10 | 3.2.3 | single | 3 | Assured Workloads monitoring: emails to the Essential Contacts Legal category, exceptions with a justification |

I read the 35 mock-exam questions of 3.2.1–3.2.4 first. Mock questions already test BAA acceptance, resource locations, Access Transparency and Approval, EKM/KAJ, FedRAMP High, discovery, tokenization, FPE, hashing, date shifting, masking, SOC 2 download and bridge letter, services in scope, Compliance Manager, Data Access enablement and exemptions, Private Logs Viewer, Policy Denied, retention and Bucket Lock. The quiz avoids those decisions.

## Facts checked (pages fetched on 2026-11-27)

- Cloud Audit Logs overview: System Event example = MIG autoscaling; System Event always written; Data Access off except BigQuery; Policy Denied on by default and charged.
- Logging quotas: `_Required` 400 days (not configurable); `_Default` 30 days, 1–3,650 in projects.
- Route log entries: an intercepting sink's matching entries are not sent to child sinks, but they are always sent to the `_Required` sink of the resource where they originate.
- Aggregated sinks page: writer identity roles per destination (BigQuery Data Editor for BigQuery); the console's only destination for an intercepting sink is a Google Cloud project.
- Cloud Asset Inventory overview: history kept for up to 35 days.
- Re-identification risk analysis: k-anonymity, l-diversity, k-map, δ-presence; quasi-identifiers.
- HIPAA compliance on Google Cloud: avoid PHI in resource metadata and labels; no pre-GA offerings with PHI; turn off services the BAA does not cover.
- SOC 3 page: public report with the same scope as SOC 2, from Compliance Reports Manager; no bridge letters for SOC 3. Compliance Reports Manager: Google Confidential Information is shared under the agreement, and Google's permission is needed to share it outside the organization.
- Sovereign Cloud page: Data Boundary, Google Cloud Dedicated (S3NS in France, designed for SecNumCloud; built to keep running for up to 12 months if its connection to Google is cut), Google Distributed Cloud air-gapped (Google cannot access it or shut it down remotely).
- VPC Service Controls overview, CMEK page.
- Assured Workloads monitoring: on by default; the Legal category of Essential Contacts is emailed; exceptions with a business justification; ITAR is covered by several organization policy violation types.

## Doubts and points for review

- Q10 relies on the rule that Essential Contacts' Legal category gets the emails. The rule comes from the monitoring page; the chapter does not mention it. The chapter only says that Assured Workloads monitors violations and accepts exceptions with a justification. Consider adding one sentence to the chapter.
- Q7: Admin Activity entries also carry the request body of the change. The stem therefore asks for the *complete* configuration "with every field", which only the Cloud Asset Inventory history guarantees.
- Q9: the documentation shows an intercepting sink routing to a project (whose own sinks then store the logs), not straight to a log bucket. The quiz is worded that way. The chapter's "Central audit design" step 2 says an aggregated sink routes "to a central log bucket, BigQuery dataset or Cloud Storage bucket" and that intercepting "also stops child-project sinks". This is correct, but it could add that an intercepting sink's destination is a project.
- None of the correct answers is a Preview product. The Assured Workloads monitoring page, the SOC 3 page and the Sovereign Cloud page show no launch stage.

## Chapter vs current documentation

No error found in `32-compliance.en.md` on the points checked. Possible addition: the console offers only a Google Cloud project as the destination of an intercepting aggregated sink.
