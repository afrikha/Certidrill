Section 6 of the exam guide checks that you can keep a solution healthy once it is live: apply the operational excellence pillar of the Well-Architected Framework, choose the right Google Cloud Observability tool, alert on what matters, release safely, support the solution, measure quality and prove reliability. The deciding words are usually "least operational overhead", "reduce alert fatigue", "minimize the impact of a bad release" or "Google-recommended practice".

<!-- section: operational-excellence-pillar | objectives: 6.1.1 -->
## The operational excellence pillar

The pillar has five principles. Use them as a checklist: an answer that skips one (no SLO, no runbook, manual change) is usually wrong.

| Principle | What it asks for | Typical tools |
| --- | --- | --- |
| Ensure operational readiness and performance using CloudOps | SLOs tracked by SLIs, comprehensive observability, load and stress tests, capacity planning (quotas requested ahead, several zones, autoscaling, capacity in the DR region) | Cloud Monitoring, BigQuery for trends, managed instance groups, future reservations |
| Manage incidents and problems | Clear roles (incident commander, communicator, experts), runbooks, one central incident system, blameless post-incident reviews, a knowledge base, automated remediation | Monitoring alerts, Cloud Run functions |
| Manage and optimize cloud resources | Right-sizing, autoscaling, discounts, labels for cost allocation, budgets | Recommender, autoscalers, committed use discounts, Spot VMs, budgets |
| Automate and manage change | Infrastructure as code in version control, CI/CD, configuration management, automated tests | Terraform, Git, Cloud Build, Cloud Deploy, VM Manager |
| Continuously improve and innovate | Learning culture, retrospectives, feedback, KPIs and dashboards | Monitoring dashboards, BigQuery |

The vocabulary comes from Site Reliability Engineering (SRE):

| Term | Meaning | Example |
| --- | --- | --- |
| SLI | Ratio of good events to valid events | Requests answered in under 300 ms without a 5xx |
| SLO | Internal target for an SLI over a compliance period | 99.9 % over a rolling 30 days |
| SLA | Customer contract with penalties, looser than the SLO | 99.5 % monthly, service credits below |
| Error budget | 1 minus the SLO | 99.9 % over 30 days = 43.2 minutes of outage |
| Error budget policy | What happens when the budget is spent | Freeze feature releases, fix reliability |
| Toil | Manual, repetitive, automatable work | Restarting a VM by hand every night |

> **Exam trap.** The SLO is tighter than the SLA so the team reacts before penalties apply. An SLO equal to the SLA, or a 100 % target, is wrong: 100 % leaves no error budget for releases.

<!-- section: monitoring-logging | objectives: 6.2.1 -->
## Monitoring and logging

| Need | Product |
| --- | --- |
| Metrics, dashboards, uptime checks, alerting, SLO monitoring | Cloud Monitoring |
| Store, search and route logs, audit logs | Cloud Logging (Logs Explorer, Log Router) |
| SQL over logs and traces | Observability Analytics (formerly Log Analytics), on an upgraded log bucket |
| Prometheus metrics and PromQL without running Prometheus storage | Google Cloud Managed Service for Prometheus |
| Grouped application errors | Error Reporting |
| Latency across services (spans) | Cloud Trace |
| CPU and memory hot spots in code | Cloud Profiler |
| VM logs, metrics and OTLP traces | Ops Agent (Fluent Bit and OpenTelemetry Collector) |

A Compute Engine VM reports basic metrics such as CPU utilization and network traffic without an agent; **memory and disk space utilization need the Ops Agent**. Instrument applications with OpenTelemetry, which Google Cloud Observability ingests natively (OTLP).

**Metrics scopes.** Every project hosts a metrics scope that starts with itself. To monitor several projects together, add them to a scoping project's metrics scope. Google recommends a dedicated scoping project with no resources, and several scoping projects when teams must see different sets of projects.

**Log routing.** Each project, folder, organization and billing account has a Log Router; every sink evaluates each entry with one inclusion filter and any number of exclusion filters.

| Bucket | Content | Retention | Changeable? |
| --- | --- | --- | --- |
| `_Required` | Admin Activity, System Event and Access Transparency logs | 400 days | No: cannot be excluded, modified or deleted |
| `_Default` | Everything else, including Data Access and Policy Denied logs | 30 days | In a project: 1 to 3,650 days (charged beyond the default), exclusions allowed |
| User-defined (project) | What your sinks send | 30 days | 1 to 3,650 days |

Sink destinations: log bucket, BigQuery dataset, Cloud Storage bucket, Pub/Sub topic, or another project. An **aggregated sink** at folder or organization level with `--include-children` collects logs from every descendant project.

```bash
# Archive the audit logs of the whole organization in Cloud Storage
gcloud logging sinks create org-audit-sink \
  storage.googleapis.com/example-audit-archive \
  --organization=123456789012 --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'
# Then grant the sink's writer identity roles/storage.objectCreator on the bucket

# Keep application logs 90 days in the project's _Default bucket
gcloud logging buckets update _Default --location=global --retention-days=90
```

| Requirement | Answer |
| --- | --- |
| Keep logs for years at the lowest cost | Sink to Cloud Storage, colder class, retention lock if required |
| SQL on logs joined with business data | Observability Analytics with a linked BigQuery dataset, or a sink to BigQuery |
| Stream logs to a third-party SIEM | Sink to Pub/Sub |
| Stop paying for noisy debug logs | Exclusion filter on the `_Default` sink |
| Alert on a log pattern | Log-based metric or log-based alerting policy |
| See who read Cloud Storage objects | Enable Data Access audit logs (off by default, except BigQuery) |

> **Exam trap.** Reading Data Access audit logs requires Private Logs Viewer (`roles/logging.privateLogViewer`); Logs Viewer is not enough. Folders and organizations cannot extend log retention: route those logs to a project-level bucket.

<!-- section: profiling-benchmarking | objectives: 6.2.2 -->
## Profiling and benchmarking

| Question | Tool |
| --- | --- |
| Which function burns CPU or allocates memory in production? | Cloud Profiler |
| Which microservice adds latency to a request? | Cloud Trace |
| Which error is new since the last release? | Error Reporting |
| Does the design reach its throughput target? | Load test (Locust, JMeter, k6) on GKE or Compute Engine |
| Which machine type gives the best price-performance? | Benchmark, for example with PerfKit Benchmarker (open source, maintained by Google) |

**Cloud Profiler** is a continuous statistical profiler: an agent library collects a profile for about 10 seconds once per minute per instance, with overhead commonly under 0.5 % averaged over time. Profile types: CPU time, heap, allocated heap, contention, threads (Go); CPU time, heap, wall time (Java); heap, wall time (Node.js); CPU time, wall time (Python). Profiles are kept 30 days.

Benchmark methodically: fix a baseline, change one variable at a time (machine family, disk type, database tier), reach steady state, use production-like data, and compare percentiles (p95, p99), not averages.

> **Exam tip.** "Find the code causing high CPU in production with minimal overhead" is Cloud Profiler; "find which service in the call chain is slow" is Cloud Trace. Adding log lines and redeploying is never the recommended answer.

<!-- section: alerting | objectives: 6.2.3 -->
## Alerting strategies

| Alerting condition | Fires when |
| --- | --- |
| Metric threshold | A metric crosses a static or dynamic threshold for a retest window |
| Metric absence | A time series sends no data for a window (alignment period plus retest window at most 25 hours) |
| Forecasted metric value (Preview) | The threshold is predicted to be crossed within a forecast window of 1 hour to 2.5 days (disk full); a Preview feature, not a default to recommend |
| PromQL | A PromQL expression is true |
| Log-based / SQL-based | A log entry matches, or a SQL query over logs meets a condition |
| SLO burn rate | The error budget is consumed too fast (`select_slo_burn_rate`) |

Notification channels: email, Mobile App, PagerDuty, SMS, Slack, webhooks (public endpoints only), Pub/Sub. Mobile App, PagerDuty, webhooks and Slack share one delivery service, so pair them with email or Pub/Sub; SMS is not fully reliable. Use **Pub/Sub** for a private endpoint or automated remediation.

**Burn-rate alerts** on SLOs are the recommended strategy for user-facing services. Burn rate 1 spends exactly the budget over the compliance period.

| Alert | Lookback | Threshold | Response |
| --- | --- | --- | --- |
| Fast burn | 1 to 2 hours | 10x the baseline | Page the on-call engineer |
| Slow burn | 24 hours | 2x the baseline | Ticket, working hours |

- Page only on symptoms users feel (latency, errors, availability); send causes (CPU, queue depth) to dashboards or tickets.
- Put playbook and dashboard links in the policy documentation, shown in the notification.
- Snooze policies during planned maintenance instead of deleting them; manage policies as code.

> **Exam trap.** "CPU over 80 %" pages on every VM are the classic source of alert fatigue. When engineers are woken by alerts that do not affect customers, the answer is SLO burn-rate alerting, not a higher CPU threshold.

<!-- section: deployment-release | objectives: 6.3.1 -->
## Deployment and release management

| Strategy | How | Rollback | Caveat |
| --- | --- | --- | --- |
| Recreate | Stop old, start new | Redeploy old | Downtime |
| Rolling update | Replace instances in batches (MIG `maxSurge`/`maxUnavailable`, GKE Deployment) | Roll back the update | Two versions live at once |
| Blue/green | Full new environment, switch at the load balancer or DNS | Switch back instantly | Double capacity during the switch |
| Canary | Small share of traffic to the new version, watch SLIs, increase | Send traffic back | Needs per-version metrics |

Cloud Run revisions are immutable and split traffic by percentage or tag; MIGs support a canary template; GKE uses rolling updates, with Gateway API or Cloud Service Mesh for weighted traffic.

```bash
# Cloud Run canary: deploy without traffic, then shift 10 %
gcloud run deploy web --image=europe-docker.pkg.dev/example-prj/app/web:2.4.0 \
  --region=europe-west1 --no-traffic --tag=candidate
gcloud run services update-traffic web --region=europe-west1 --to-tags=candidate=10
gcloud run services update-traffic web --region=europe-west1 --to-latest

# MIG canary: 10 % of instances on the new template
gcloud compute instance-groups managed rolling-action start-update web-mig \
  --zone=europe-west1-b --version=template=web-v1 \
  --canary-version=template=web-v2,target-size=10%
```

**Cloud Deploy** is the managed continuous delivery service for GKE, GKE attached clusters and Cloud Run. A **delivery pipeline** lists **targets** in promotion order; CI creates a **release** (manifests rendered with Skaffold); deploying a release to a target is a **rollout**. Strategies: **standard** and **canary**. A target with `requireApproval: true` waits for approval. Rollback redeploys the last successful release.

```yaml
apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: web
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
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: prod
requireApproval: true
run:
  location: projects/example-prj/locations/europe-west1
```

```bash
gcloud deploy apply --file=clouddeploy.yaml --region=europe-west1
gcloud deploy releases create rel-2-4-0 --delivery-pipeline=web --region=europe-west1 \
  --images=web=europe-docker.pkg.dev/example-prj/app/web:2.4.0
gcloud deploy releases promote --release=rel-2-4-0 --delivery-pipeline=web --region=europe-west1
gcloud deploy rollouts advance ROLLOUT_NAME --release=rel-2-4-0 --delivery-pipeline=web --region=europe-west1
gcloud deploy targets rollback prod --delivery-pipeline=web --region=europe-west1
```

The prod rollout runs phases `canary-10`, `canary-50`, then `stable`, advanced manually or automatically with deploy analysis.

> **Exam trap.** Cloud Build builds and tests; Cloud Deploy promotes and rolls out. "Promote the same artifact through dev, staging and prod with an approval before prod and easy rollback" is Cloud Deploy, not one Cloud Build trigger per environment.

<!-- section: supporting-solutions | objectives: 6.4.1 -->
## Supporting deployed solutions

**Cloud Customer Care**: free Basic support (documentation, community, billing, Active Assist) and three paid tiers.

| Tier | Intended for | P1 first response | Hours |
| --- | --- | --- | --- |
| Standard | Workloads in development | No P1; P2 in 4 hours | 8/5 for high impact |
| Enhanced | Production workloads | 1 hour | 24/7 for high and critical impact |
| Premium | Business-critical workloads | 15 minutes | 24/7, Technical Account Manager |

| Support need | Answer |
| --- | --- |
| Know whether a Google incident affects your projects, and alert on it | Personalized Service Health (dashboard, API, log-based alerts) |
| Production workload, 1-hour response, lowest cost | Enhanced Support |
| Find idle or oversized resources | Active Assist recommenders |
| Triage new errors after a release | Error Reporting, linked to logs and traces |
| Consistent on-call steps | Runbooks linked from alert documentation |

Run incidents with one incident commander and a communication channel; mitigate first (roll back, drain a zone), find the root cause second, then hold a blameless postmortem with owned action items. Give support engineers time-bound, least-privilege access, not Owner.

Gemini Cloud Assist, named in the exam guide, investigates issues from logs, metrics and configuration and can hand an investigation to a support case. It is in Preview in November 2026: never the only control of a production support design.

> **Exam trap.** A support case is not monitoring. "Detect that a Google outage affects the application" is Personalized Service Health plus your own uptime checks and SLO alerts, not "open a P1 case".

<!-- section: quality-control | objectives: 6.5.1 -->
## Evaluating quality control measures

Quality gates run automatically in the pipeline, before production:

| Gate | Implementation |
| --- | --- |
| Unit, integration and end-to-end tests | Cloud Build steps; a failing step stops the build |
| Infrastructure code validation | Terraform plan and policy checks before apply |
| Image vulnerability scanning | Artifact Analysis in Artifact Registry |
| Only verified images deploy | Binary Authorization attestations on GKE and Cloud Run (enforcement; dry run to test) |
| Sign-off before production | Cloud Deploy `requireApproval` |
| Post-deploy checks | Cloud Deploy verification and analysis, canary phases |

Measure outcomes with the DORA metrics: change lead time, deployment frequency, failed deployment recovery time, change fail rate and deployment rework rate. Add SLO compliance per release: a release that burns error budget fails quality control even if every test passed.

> **Exam tip.** Binary Authorization continuous validation (images already running) is in Preview. "Block unsigned or unscanned images at deploy time" is a Binary Authorization policy in enforcement mode with attestors.

<!-- section: reliability-production | objectives: 6.6.1 -->
## Ensuring reliability in production

The reliability pillar asks you to test recovery from failures and from data loss, then run postmortems.

**Chaos engineering** injects failures on purpose: state a hypothesis tied to an SLO, start in a production-like staging environment, keep monitoring and rollback ready, widen the blast radius gradually, and combine failures with load.

```bash
# Trigger a host maintenance event on a VM
gcloud compute instances simulate-maintenance-event web-1 --zone=europe-west1-b

# Fail over a Cloud SQL high-availability instance to its standby
gcloud sql instances failover orders-db
```

Other injections: delete pods or drain GKE nodes, Cloud Service Mesh fault injection (delay or abort a share of requests), stop a zone's instances, drain a region, misconfigure DNS failover or an IAM permission. Measure recovery against RTO and RPO, regularly (for example quarterly), ideally automated in CI/CD.

**Load testing** validates scaling before launches and peaks: distributed workers with realistic traffic, autoscaler reaction, quotas and database limits, then stress beyond the forecast peak to find the breaking point. Request quota increases and reservations ahead.

**Penetration testing** on Google Cloud requires no notification to Google: follow the Acceptable Use Policy and Terms of Service and test only your own projects. Web Security Scanner (Security Command Center) scans public App Engine, GKE and Compute Engine web apps for issues such as XSS and outdated libraries, but does not replace a manual review.

> **Exam trap.** "Ask Google Cloud support for permission before the penetration test" is wrong. A load test from a single VM rarely reaches realistic concurrency and may measure the client, not the service.

<!-- section: key-points -->
## Key points

- Five pillar principles: CloudOps readiness, incidents, resource optimization, automated change, continuous improvement.
- SLO tighter than SLA; error budget = 1 minus SLO; blameless postmortems.
- `_Required`: 400 days, fixed; `_Default`: 30 days, 1 to 3,650 in projects; aggregated sinks with `--include-children`.
- VM memory and disk space metrics need the Ops Agent; Data Access audit logs are off by default except BigQuery.
- Profiler for code hot spots, Trace for latency between services, Error Reporting for grouped errors.
- Page on SLO burn rate (fast: 1–2 h, 10x; slow: 24 h, 2x); Pub/Sub for private or automated notifications.
- Cloud Deploy: pipeline, targets, releases, rollouts, canary phases, approvals, rollback.
- Premium: 15-minute P1 and TAM; Enhanced: 1 hour; Personalized Service Health for Google incidents.
- Chaos and failover tests against RTO and RPO; penetration tests need no notification to Google.
