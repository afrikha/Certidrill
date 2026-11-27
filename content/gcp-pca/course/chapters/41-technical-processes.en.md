An architect does not only draw the target design: the exam also asks how the solution is built, released, tested, repaired and recovered. Questions in this area describe a team's current process (manual deployments, no rollback, a recurring outage, an untested DR plan) and ask which Google Cloud practice or managed service fixes it with the least effort and risk. The recurring answers are environment isolation by project, a single artifact promoted through a pipeline, progressive delivery, blameless root cause analysis, automated tests at every layer, curated self-service provisioning and a DR pattern sized to the RTO and RPO.

<!-- section: sdlc-environments | objectives: 4.1.1 -->
## Software development lifecycle on Google Cloud

The software development lifecycle (SDLC) runs from requirements and design through coding, building, testing, releasing, operating and retiring. On Google Cloud, the architect's decisions concern where each stage runs and how a change moves between stages.

| SDLC concern | Google-recommended practice | Google Cloud building block |
| --- | --- | --- |
| Environment isolation | One project per environment (dev, test, staging, prod), grouped in folders, with IAM and org policies set at folder level | Resource hierarchy, organization policies |
| Source of truth | All application code, configuration and infrastructure in version control; small, frequent merges to the main branch | GitHub, GitLab, Bitbucket (connected through Developer Connect or Cloud Build repositories), Secure Source Manager |
| Build once | Build an immutable artifact once, store it, and promote the same digest to every environment | Cloud Build, Artifact Registry |
| Release | Automated, repeatable promotion with approvals for production | Cloud Deploy |
| Infrastructure | Declarative infrastructure as code, reviewed like application code | Terraform, Infrastructure Manager, Config Connector |
| Supply chain | Provenance, vulnerability scanning, deploy-time policy | Cloud Build provenance (SLSA level 3), Artifact Analysis, Binary Authorization |
| Operate | Monitoring, logging, SLOs, incident process | Google Cloud Observability |

Developer environments also count: Cloud Shell and Cloud Shell Editor for quick work, Cloud Code in VS Code or IntelliJ, and **Cloud Workstations** when developers need managed environments provisioned inside your VPC (for example, no source code on laptops).

Google's DORA research measures delivery performance with five metrics: **change lead time**, **deployment frequency** and **failed deployment recovery time** (throughput), **change fail rate** and **deployment rework rate** (instability). High performers improve throughput and stability together: small batches, automation and fast feedback, not more manual gates.

> **Exam trap.** Cloud Source Repositories is not available to new customers since June 17, 2024, and Container Registry has been shut down for writes since March 18, 2025. A new design stores code in a supported Git provider or Secure Source Manager and images in Artifact Registry.

> **Exam tip.** "Developers must not keep source code on their laptops" or "development environments must run in our VPC" points to Cloud Workstations, not Cloud Shell, which runs on a Google-managed VM outside your network.

<!-- section: ci-cd-pipeline | objectives: 4.1.2 -->
## Continuous integration and continuous deployment

**Continuous integration** builds and tests every change automatically; **continuous delivery** keeps every build releasable and promotes it through environments; **continuous deployment** releases to production automatically when the checks pass.

The Google-managed toolchain:

| Stage | Service | What to remember |
| --- | --- | --- |
| Trigger and build | Cloud Build | Build config in YAML or JSON, each step runs in a container; triggers on push, pull request, tag, Pub/Sub or webhook; default pool (public internet) or **private pools** (dedicated workers with access to a private network) |
| Store | Artifact Registry | Container images and language packages (Maven, npm, Python...); regional or multi-region repositories; remote and virtual repositories |
| Scan | Artifact Analysis | Vulnerability scanning of images in Artifact Registry, metadata used by policies |
| Release | Cloud Deploy | Delivery pipeline = ordered sequence of targets (GKE, GKE attached clusters, Cloud Run, custom targets); a release is rendered once with Skaffold and promoted target by target |
| Enforce | Binary Authorization | Deploy-time policy on GKE and Cloud Run: only images with the required attestations are admitted |

A typical Cloud Build configuration runs the unit tests, builds and pushes the image, then hands over to Cloud Deploy:

```yaml
steps:
- id: unit-tests
  name: python:3.12
  entrypoint: bash
  args: ['-c', 'pip install -r requirements.txt && pytest tests/unit']
- id: build
  name: gcr.io/cloud-builders/docker
  args: ['build', '-t', '${_IMAGE}:$SHORT_SHA', '.']
- id: push
  name: gcr.io/cloud-builders/docker
  args: ['push', '${_IMAGE}:$SHORT_SHA']
- id: release
  name: gcr.io/google.com/cloudsdktool/cloud-sdk
  entrypoint: gcloud
  args: ['deploy', 'releases', 'create', 'rel-$SHORT_SHA',
         '--delivery-pipeline=web-app', '--region=europe-west1',
         '--images=web=${_IMAGE}:$SHORT_SHA']
substitutions:
  _IMAGE: europe-west1-docker.pkg.dev/example-ci/apps/web
options:
  logging: CLOUD_LOGGING_ONLY
```

The Cloud Deploy pipeline declares the promotion sequence and the strategy per target:

```yaml
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: web-app
serialPipeline:
  stages:
  - targetId: staging
  - targetId: prod
    strategy:
      canary:
        runtimeConfig:
          cloudRun:
            automaticTrafficControl: true
        canaryDeployment:
          percentages: [10, 50]
          verify:
            tasks:
            - type: container
              image: europe-west1-docker.pkg.dev/example-ci/tools/smoke-tests:1.4
              command: ["/bin/sh"]
              args: ["-c", "./smoke.sh"]
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
requireApproval: true
run:
  location: projects/example-prod/locations/europe-west1
```

Cloud Deploy features the exam uses:

| Requirement | Cloud Deploy feature |
| --- | --- |
| Production change needs sign-off | `requireApproval: true` on the target; approvers hold `roles/clouddeploy.approver`; approval events are published to Pub/Sub for ticketing integration |
| Expose the new version to a fraction of traffic first | **Canary** strategy (whole percentages, for example 10 then 50, then stable) |
| Run smoke tests after each deployment or canary phase | Deployment verification: `verify` tasks (a test container run by Cloud Deploy, the only option for Cloud Run), or Skaffold verify containers on the GKE cluster |
| Run a database migration before deploying | Deploy hooks (predeploy, postdeploy) |
| Promote to staging automatically after dev succeeds | Automation: `promoteReleaseRule` (optionally delayed); `timedPromoteReleaseRule` on a cron schedule |
| Move through canary phases automatically | `advanceRolloutRule` |
| Retry a failed rollout, then roll back | `repairRolloutRule` |
| Return to the last good version | Rollback: a new rollout of the last successfully deployed release |
| Deploy to several regions at once | Parallel deployment (multi-target) |

```bash
gcloud deploy apply --file=clouddeploy.yaml --region=europe-west1
gcloud deploy releases promote --release=rel-4f2a9c1 \
  --delivery-pipeline=web-app --region=europe-west1
gcloud deploy targets rollback prod \
  --delivery-pipeline=web-app --region=europe-west1
```

Pipelines authenticate with a dedicated service account that holds only the roles it needs; a pipeline outside Google Cloud (GitHub Actions, GitLab CI) uses **Workload Identity Federation** instead of a downloaded service account key.

> **Exam trap.** Rebuilding the image for each environment breaks "build once, deploy many": what was tested is not what reaches production. Promote the same image digest; change only configuration per target (Skaffold profiles, environment variables, Secret Manager references).

> **Exam tip.** "Builds must reach resources in a private VPC" (a private package mirror, a private GKE control plane) means Cloud Build **private pools**. The default pool has public internet access only.

<!-- section: troubleshooting-rca | objectives: 4.1.3 -->
## Troubleshooting and root cause analysis

The operational excellence pillar of the Well-Architected Framework asks you to "manage incidents and problems": define incident roles (incident commander, investigators, communicators), document procedures in runbooks or playbooks, track incidents in a centralized system, run a **root cause analysis** and hold **blameless** post-incident reviews that produce tracked action items.

Order of work during an incident:

1. **Mitigate first.** Restore service (roll back the last release, shift traffic, fail over, add capacity) before looking for the root cause. Change is the most frequent trigger: check what was deployed or reconfigured just before the symptom started.
2. **Communicate** status to stakeholders on a fixed cadence.
3. **Investigate** with data: correlate metrics, logs, traces and audit logs on the same time window.
4. **Find the root cause and contributing factors**, not only the trigger (for example, the bad configuration, plus the missing validation that let it through, plus the alert that fired too late).
5. **Write the postmortem**: impact, timeline, root cause, what went well, action items with owners. Blameless means the question is "which process let this happen", not "who did it".

| Symptom or question | Tool |
| --- | --- |
| Who changed this firewall rule or IAM policy, and when? | Cloud Audit Logs (Admin Activity logs are always on) |
| Which errors are new since the release? | Error Reporting (groups errors from logs) |
| Which service in the call chain adds latency? | Cloud Trace |
| Which function consumes CPU or memory in production? | Cloud Profiler (statistical, low overhead) |
| Query logs across projects with SQL | Observability Analytics (formerly Log Analytics) in Cloud Logging |
| Turn a log pattern into a metric and an alert | Log-based metrics, Cloud Monitoring alerting policies |
| Why can't VM A reach database B? | Connectivity Tests (Network Intelligence Center), VPC Flow Logs, firewall rules logging |
| Is Google Cloud itself having an incident? | Personalized Service Health |

> **Exam trap.** When users are affected and a release just went out, the first action is to roll back (or shift traffic back), not to debug in production. Root cause analysis happens after service is restored.

> **Exam tip.** Answers that add a process ("add a peer review step", "add an automated test for this case", "add an alert on this SLI") are preferred over answers that blame or retrain one person.

<!-- section: testing-validation | objectives: 4.1.4 -->
## Testing and validating software and infrastructure

Testing is layered, and each layer runs at a different point of the pipeline:

| Test | What it proves | Where it runs |
| --- | --- | --- |
| Unit | A function or class behaves as specified, in isolation (dependencies mocked or emulated) | Every commit, in Cloud Build, in seconds |
| Integration | Components work together (service plus database, publisher plus subscriber) | Pull request or merge, against emulators or an ephemeral test project |
| End-to-end and smoke | A user journey works on the deployed system | After each deployment (Cloud Deploy verification) |
| Load and performance | The system meets its latency and throughput targets at expected and peak load; where it breaks | Staging environment sized like production, before major releases |
| Security | No known vulnerabilities, no misconfigurations | Image scanning (Artifact Analysis), Web Security Scanner, penetration tests |
| Resilience | The system survives the failure of a zone, an instance or a dependency | Controlled fault injection, DR drills |

Infrastructure is tested too:

- **Static checks** on Terraform: `terraform fmt`, `terraform validate`, then `terraform plan` reviewed in the pull request before any `apply`.
- **Policy checks** before deployment: organization policy constraints are enforced by Google Cloud at deployment time; `gcloud beta terraform vet` (Preview) can validate a plan against a policy library inside the pipeline.
- **Post-deployment checks**: Connectivity Tests for network paths, Policy Analyzer and the IAM recommender for over-broad access.
- **Ephemeral environments**: create a short-lived project from the same Terraform code, run the tests, destroy it. This proves the code can rebuild the environment, which is also the basis of DR.

> **Exam trap.** A load test against a production environment with shared quotas, or against a much smaller staging environment, gives misleading results. Load-test an isolated environment that matches production in size and configuration, with realistic traffic patterns.

<!-- section: service-catalog | objectives: 4.1.5 -->
## Service catalog and provisioning

A platform team gives application teams **self-service** access to approved, pre-configured solutions instead of tickets or broad permissions. Options on Google Cloud:

| Need | Option |
| --- | --- |
| Publish curated solutions (Terraform configurations, reference links) to internal users, who launch them in their own projects | Service Catalog |
| Run Terraform as a managed service, with deployments, revisions, previews and stored state | Infrastructure Manager |
| Create new projects with the standard folder, billing, network attachment, IAM groups and budgets | A "project factory" in Terraform, run by a pipeline |
| Provision Google Cloud resources from Kubernetes manifests, managed by GitOps | Config Connector |
| Design an application from approved templates and deploy it | Application Design Center (Preview) |
| Third-party or Google solutions packaged for deployment | Cloud Marketplace |

Provisioning principles the exam rewards:

- Everything is provisioned by code from a reviewed repository; no click-ops in production.
- Guardrails are set above the teams: organization policies (allowed regions, no external IPs, no service account key creation) at the organization or folder level, so self-service cannot break compliance.
- The provisioning pipeline runs with its own service account; humans do not need Owner on projects.
- Labels on every resource (team, environment, cost center) to allocate cost and automate operations.

> **Exam trap.** Deployment Manager reached end of support on March 31, 2026 and will be turned down after June 30, 2027. Google recommends migrating to Infrastructure Manager (Terraform). A new design never chooses Deployment Manager.

<!-- section: disaster-recovery | objectives: 4.1.6 -->
## Disaster recovery

Disaster recovery planning starts with a business impact analysis that sets two objectives per application:

- **RTO** (recovery time objective): the maximum acceptable time the application can be offline.
- **RPO** (recovery point objective): the maximum acceptable period of data loss, measured in time.

Smaller RTO and RPO cost more and add complexity, so the pattern is chosen per application tier:

| Pattern | What runs in the DR location | RTO / RPO | Example |
| --- | --- | --- | --- |
| Cold | Nothing; backups and IaC only. Rebuild on demand | Hours to days / last backup | Internal reporting, compliance archives |
| Warm | A scaled-down copy, data replicated, scaled up at failover | Minutes to hours / minutes | Line-of-business application |
| Hot | Full capacity active in several zones or regions, traffic load-balanced | Near zero / near zero | Critical customer-facing service |

Building blocks and their recovery characteristics:

| Building block | DR property |
| --- | --- |
| Regional managed instance group, GKE regional cluster | Survives a zone failure automatically |
| Regional Persistent Disk, Hyperdisk Balanced High Availability | Synchronous replication across two zones; force-attach in the other zone |
| Snapshots, machine images | Incremental, can be stored multi-regionally; restore in another region |
| Instance templates | Regional or global: a regional template (recommended by Google) works only in its region, a global template in any region, so the DR region needs a global template or its own regional template. A regional or zonal resource referenced in a template restricts where it can be used |
| Reservations | Guarantee capacity in the DR region to meet the RTO |
| Cloud Storage dual-region or multi-region | Default replication: 99.9 % of new objects within one hour, 100 % within 12 hours. Turbo replication (dual-region only): RPO 15 minutes |
| Cloud SQL | Regional HA for zones; cross-region read replica promoted for regions (asynchronous, RPO not zero). Enterprise Plus advanced DR: designated DR replica, replica failover, zero-data-loss switchover, write endpoint (DNS) |
| Spanner | Multi-region and dual-region instances: 99.999 % SLA, synchronous replication, no failover to run |
| Backup and DR Service | Centralized backups in **backup vaults** that are immutable and indelible, with an enforced minimum retention (up to 99 years): protects against ransomware and deletion |
| Global external Application Load Balancer, Cloud DNS routing policies | Move traffic to the healthy region |

A DR plan is only valid if it is tested: run drills regularly, provision the DR environment with the same IaC, check that IAM permissions in the DR environment match production, keep more than one recovery path, and test the case where your usual access path to Google Cloud is unavailable.

> **Exam trap.** High availability is not a backup. A regional disk or a synchronous replica replicates corruption and deletions instantly; a point-in-time backup (ideally in a vault that nobody can delete) is still required.

> **Exam tip.** "RPO of 15 minutes for objects in two regions" means a dual-region bucket with turbo replication. "RPO and RTO near zero across regions for a relational database" means Spanner multi-region rather than Cloud SQL replicas.

<!-- section: key-points -->
## Key points

- One project per environment, one immutable artifact promoted through all of them: Cloud Build, Artifact Registry, Cloud Deploy.
- Cloud Deploy: approvals (`requireApproval`), canary percentages, verification, deploy hooks, automation rules, rollback to the last successful release.
- Incidents: mitigate first (often roll back), then blameless root cause analysis with tracked action items.
- Test every layer: unit and integration in CI, verification after deployment, load tests on a production-sized isolated environment, `terraform plan` reviewed before `apply`.
- Self-service provisioning through curated catalogs and IaC, under organization policies; Deployment Manager is out, Infrastructure Manager is in.
- DR: pick cold, warm or hot from RTO and RPO; HA does not replace immutable backups; test the plan.
