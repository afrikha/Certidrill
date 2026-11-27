# QZ-gcp-pca-31-security-design — report

File: `content/gcp-pca/quizzes/31-security-design.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-pca 31-security-design` → 0 problem(s), 0 warning(s).

## Coverage

| # | Objective | Type | Difficulty | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 3.1.2 | single | 1 | Project name editable; project ID permanent |
| 2 | 3.1.1 | single | 1 | `iam.automaticIamGrantsForDefaultServiceAccounts` for an organization created before May 3, 2024 |
| 3 | 3.1.6 | single | 2 | Disable a key version (reversible) vs scheduling destruction (30-day window), rotating, or changing the default key |
| 4 | 3.1.9 | single | 2 | Model Armor rollout: Inspect only first, then Inspect and block |
| 5 | 3.1.8 | single | 2 | Artifact Analysis SBOM generation (SPDX 2.3) |
| 6 | 3.1.3 | single | 3 | Cloud Run secret mounted as a volume on latest vs environment variable resolved at startup |
| 7 | 3.1.7 | multi (2) | 3 | IAP enabled directly on Cloud Run (no load balancer) + IAP-secured Web App User |
| 8 | 3.1.1 | single | 3 | Writer with a request.time condition; legacy Editor accepts no conditions; no folder custom roles |
| 9 | 3.1.5 | single | 3 | VPC Service Controls egress rule for one service account to a partner project in another organization |
| 10 | 3.1.4 | multi (2) | 3 | PAM: remove standing bindings (an entitlement does not revoke them) and keep setIamPolicy roles out of entitlements |

The ~75 mock-exam questions of 3.1.x (case-study questions included) were read first. Decisions already in the bank were avoided: resource locations, trusted images, restricted VIP, IAP through a load balancer, private pools, Private Logs Viewer, the PAM entitlement itself, and others.

## Doubts and unverified points

- Q5: neither "SBOM overview" nor "Generate and store SBOMs" gives a launch stage. `gcloud artifacts sbom export` is in the GA command group (no alpha or beta prefix), and no Preview label was found. The Artifact Analysis release notes could not be fetched (site error). Please recheck the stage.
- Q7: IAP directly on Cloud Run was Preview in April 2025 (IAP release notes) and became GA on March 13, 2026 (Cloud Run release notes). The explanation says this.
- Q10: the PAM pages don't say whether a principal who is both requester and approver can approve their own grant. The explanation of option b therefore rests on separation of duties (engineers approving their own team's elevations), not on a product limit.
- Q9: the egress rule option names "the Cloud Storage object creation method" without the exact method string, which I did not verify.

## Chapter issues (content/gcp-pca/course/chapters/31-security-design.en.md)

- Section cloud-kms says "Key rings cannot be deleted". The current page "Enable and disable key versions | Cloud Key Management Service" says that key rings and keys can be deleted in some circumstances: a deleted key ring's name can be reused, but a deleted key's name cannot. The dedicated delete page could not be fetched (site error). The sentence should be checked and probably updated.
- Section secure-remote-access gives "Identity-Aware Proxy on the load balancer, App Engine or Cloud Run" without saying that IAP directly on Cloud Run (GA since March 13, 2026) is now the option the IAP docs recommend for a single service. With the load balancer option, the run.app URL still bypasses IAP unless the default URL is disabled. A sentence on this would help the IAP-related questions.
- Section data-security lists Secret Manager mounting without saying that environment variables are resolved at instance startup while volumes fetch the value at each read. This difference decides rotation designs (quiz Q6).
- Section iam: confirmed against "Roles overview" (Admin/Writer/Reader support conditions, legacy roles don't; custom roles at organization or project level only; `TESTING` not for production).
