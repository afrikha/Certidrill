# QZ-gcp-pca-41-technical-processes — report

File: `content/gcp-pca/quizzes/41-technical-processes.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-pca 41-technical-processes`: 0 problem(s), 0 warning(s).

## Coverage

| Pos. | Objective | Type | Diff. | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 4.1.1 | single | 1 | Images go to Artifact Registry (Container Registry is shut down for writes, CSR is closed) |
| 2 | 4.1.3 | single | 1 | Incident roles (commander, communicator) for uncoordinated responses |
| 3 | 4.1.4 | single | 2 | Post-deployment access validation with Policy Analyzer (inheritance and group expansion) |
| 4 | 4.1.2 | single | 2 | Cloud Deploy `predeploy` hook for schema migrations (vs postdeploy, verify, repair) |
| 5 | 4.1.5 | single | 2 | Self-service guardrail: `constraints/sql.restrictPublicIp` on the folder |
| 6 | 4.1.1 | single | 3 | Regulated in-region, single-tenant, CMEK, VPC SC Git: Secure Source Manager |
| 7 | 4.1.3 | multi (2 of 5) | 3 | Blameless review: action items on systemic factors (review + test, SLI alert) |
| 8 | 4.1.6 | single | 3 | HA and asynchronous replication copy corruption: hourly snapshot schedule |
| 9 | 4.1.2 | multi (2 of 5) | 3 | `promoteReleaseRule` with wait vs `timedPromoteReleaseRule`; `advanceRolloutRule` for canary phases |
| 10 | 4.1.2 | multi (2 of 5) | 3 | Least privilege for a CI identity: Releaser + Service Account User on the execution SA |

I read the 44 mock-exam questions of 4.1.1–4.1.6 first, plus related questions of 4.2.x, 5.x and 6.x on Cloud Deploy, load tests, PITR, snapshots, PAM and dry runs. The mock bank already covers environments, build once, trunk-based development, remote repositories, Workstations, provenance, private pools, PR checks, trigger service accounts, multi-targets, repair rules, approvals, Error Reporting, Connectivity Tests, Flow Logs, mitigate-first, blameless reviews, the main test layers, Service Catalog, project factory, golden images, every DR pattern, Spanner, Cloud SQL DR, Backup for GKE, async replication and reservations. The quiz avoids those decisions.

## Facts checked (pages fetched on 2026-11-27)

- Transition from Container Registry: shut down, no writes since March 18, 2025; Artifact Registry is recommended, gcr.io repositories are possible.
- Cloud Source Repositories documentation: not available to new customers since June 17, 2024; Secure Source Manager recommended.
- Secure Source Manager overview: regional, single-tenant, CMEK, VPC Service Controls. Its release notes show GA on August 4, 2025.
- Manage incidents and problems: roles (incident commanders, investigators, communicators, technical experts); root cause plus systemic issues; blameless reviews.
- Policy Analyzer for allow policies: analyzes inherited policies; group expansion; export to BigQuery.
- Run hooks before and after deploying: `predeploy` always runs as the first job of the phase; `postdeploy` runs after deploy; `verify` runs before `postdeploy`.
- Cloud SQL "Add predefined organization policies": `constraints/sql.restrictPublicIp`, settable on an organization, folder or project.
- Automate your deployment: `promoteReleaseRule` (optional `wait`), `advanceRolloutRule` (canary targets only), `repairRolloutRule`, `timedPromoteReleaseRule` (cron).
- Cloud Deploy IAM roles and permissions: Releaser creates releases and rollouts; creating a release needs `actAs` on the rendering service account, and creating a rollout needs it on the deploying one.
- Snapshot schedules: hourly from 1 to 23 hours, retention in days. Asynchronous Replication: target RPO of one minute; consistency groups align disks to a common point in time; Hyperdisk Balanced High Availability is a supported primary disk.

## Doubts

- Q4: the hooks page says that a hook job fails on its first failed task. It does not say explicitly that a failed `predeploy` job fails the rollout, so the question does not rely on it.
- Q3: the Policy Analyzer page shows no launch stage. Policy Analyzer for allow policies is a long-standing Cloud Asset API feature, and I treated it as GA.
- Q10 keeps Workload Identity Federation in the stem (already in place), because the mock question `gcppca-1c-cicd-keyless-auth` already tests choosing it.

## Mock-exam questions and chapter vs current documentation

- **Mock question with a Preview product as the correct answer:** in `gcppca-4a-cat-design-center` (4.1.5), the answer is Application Design Center. Its overview page shows a Preview banner today, and the chapter itself marks it "(Preview)". The question should be reworked or retired.
- Chapter, DR building-blocks table: "Instance templates | Global resources: recreate VMs in another region" is imprecise. Compute Engine now has both regional and global instance templates (the instance templates page compares the two); only global templates can be used in any region.
- Nothing else in `41-technical-processes.en.md` contradicts the pages fetched.
