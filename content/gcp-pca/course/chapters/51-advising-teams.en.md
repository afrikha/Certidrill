During implementation the architect advises the teams that build and run the solution: how to release without downtime, how to expose and protect APIs, how to test, which tool moves which data or servers, and how to use Gemini Cloud Assist safely. Exam questions give a deployment or migration constraint (zero downtime, partner developers, 200 TB over a slow link, an Oracle database, a limited operations team) and expect the Google-managed tool or practice that meets it with the least risk.

<!-- section: deployment-strategies | objectives: 5.1.1 -->
## Application and infrastructure deployment

Choose the release strategy from the risk the business accepts and the capacity it can pay for:

| Strategy | How | Downtime | Extra capacity | Rollback |
| --- | --- | --- | --- | --- |
| Recreate | Stop old version, start new | Yes | None | Redeploy old version |
| Rolling | Replace instances in batches | No, if the app supports two versions side by side | Small (surge) | Roll forward or back in batches |
| Blue/green | Deploy the full new environment, switch all traffic at once | No | Double during the switch | Immediate: switch back |
| Canary | Send a small share of traffic to the new version, watch, increase | No | Small | Immediate: shift traffic back |
| A/B or traffic split by header | Route some users to a version to compare behavior | No | Small | Shift traffic back |

How each platform implements them:

| Platform | Mechanism |
| --- | --- |
| Compute Engine MIG | New instance template, then a rolling update (`proactive` or `opportunistic`), with `--max-surge` and `--max-unavailable`; canary with `--canary-version` and `target-size` |
| GKE | Deployment rolling update (`maxSurge`, `maxUnavailable`); blue/green by switching a Service or Gateway route; Cloud Deploy canary with Gateway API or service networking |
| Cloud Run | Every deployment creates an immutable revision; deploy with `--no-traffic` and a tag, test the tag URL, then split traffic by percentage |
| Any of the above | Cloud Deploy pipelines for approvals, canary phases, verification and rollback |

```bash
# Compute Engine: canary on 10 % of a regional MIG, then full rollout
gcloud compute instance-groups managed rolling-action start-update web-mig \
  --version=template=web-v1 \
  --canary-version=template=web-v2,target-size=10% \
  --region=europe-west1
gcloud compute instance-groups managed rolling-action start-update web-mig \
  --version=template=web-v2 --max-surge=3 --max-unavailable=0 \
  --region=europe-west1

# Cloud Run: deploy without traffic, test the tagged URL, shift 10 %
gcloud run deploy checkout --image=europe-west1-docker.pkg.dev/example-ci/apps/checkout:2.3.0 \
  --no-traffic --tag=green --region=europe-west1
gcloud run services update-traffic checkout --to-tags=green=10 --region=europe-west1
gcloud run services update-traffic checkout --to-latest --region=europe-west1
```

MIG defaults: `maxSurge` and `maxUnavailable` are 1 for a zonal MIG and the number of zones (3 by default) for a regional MIG; on a regional MIG, a fixed `maxSurge` or `maxUnavailable` must be 0 or at least the number of zones (with three zones, 1 or 2 is rejected); percentages require a group of at least 10 instances. Setting `--max-unavailable=0` keeps full serving capacity during the update.

Advice that makes any strategy safe:

- Health checks, readiness probes and connection draining, so instances receive traffic only when ready and finish in-flight requests.
- Backward-compatible database changes (expand, migrate, contract): during a rolling or canary release, old and new code run against the same schema.
- Immutable infrastructure: change the instance template or the image, never patch running instances by hand.
- Infrastructure deployed by the same pipeline discipline as code: Terraform plan reviewed, applied by a service account.

> **Exam trap.** Rolling back traffic on Cloud Run is immediate and does not re-run health checks; it is the fastest rollback, but only to a revision that still exists and is known good. On a MIG, rolling back means another rolling update to the previous template.

> **Exam tip.** "Zero downtime and instant rollback, cost of double capacity accepted" is blue/green. "Expose the new version to 5 % of users first" is canary. "Keep serving capacity during the update" is `--max-unavailable=0` with a surge.

<!-- section: api-management | objectives: 5.1.2 -->
## API management best practices with Apigee

Three Google Cloud products put a managed layer in front of APIs:

| Product | Fits | Main capabilities |
| --- | --- | --- |
| API Gateway | Simple, serverless gateway for your own backends (Cloud Run, Cloud Run functions, App Engine) | OpenAPI spec (2.0, 3.0.x and 3.1.x), API key and token authentication, quotas, fully managed |
| Cloud Endpoints | APIs on Compute Engine, GKE or other platforms through the ESPv2 proxy | OpenAPI or gRPC, authentication, monitoring |
| Apigee | Full API management for external, partner and internal API programs | API proxies with policies, API products, developer apps and keys, developer portals, analytics, monetization, Advanced API Security, API hub |

**Apigee concepts**:

- **API proxy**: the facade between clients and the backend (target). Request and response flows run **policies**: security (API key verification, OAuth 2.0, JWT), traffic management (**SpikeArrest** smooths bursts to protect the backend; **Quota** counts calls per app or developer over a period, typically to enforce a business plan), mediation (transform JSON or XML), caching, and extensions such as service callouts.
- **API products** bundle proxies, operations and quotas; **developer apps** subscribe to products and receive credentials. This is how you offer "Gold" and "Free" tiers.
- **Developer portal** (integrated portal or Drupal-based) for partner onboarding and documentation.
- **Analytics** for traffic, latency, errors and anomaly detection; **monetization** with rate plans; **Advanced API Security** for risk assessment and abuse detection; **API hub** as a catalog of all APIs and their specifications.
- **Organization, environments and environment groups**: one organization per Google Cloud project, environments (dev, test, prod) as runtime contexts, environment groups mapping hostnames to environments.

**Deployment models**:

| Model | Where the runtime runs | When |
| --- | --- | --- |
| Apigee (Google-managed) | Google Cloud, managed by Google | Default choice, lowest operational overhead |
| Apigee hybrid | Your own Kubernetes clusters (on Google Cloud, on-premises or in another cloud); the management plane (UI, management APIs, analytics) stays in Google Cloud | API traffic must stay inside your network or data center, gateway close to on-premises backends, strict on-premises compliance |

Apigee organizations are provisioned as Subscription, Pay-as-you-go or evaluation.

API best practices the exam rewards:

- Design first: write the OpenAPI specification, review it, generate documentation and tests from it.
- Version explicitly (`/v1/`, `/v2/`) and keep old versions running during a published deprecation period; never break existing clients.
- Authenticate every call: OAuth 2.0 or JWT for user and partner access; API keys identify an app but are not strong authentication on their own.
- Protect backends with SpikeArrest, enforce plans with Quota, cache responses that can be cached.
- Monitor per API product and per developer app; alert on error rate and latency.

> **Exam trap.** "Partners must sign up, receive keys, see documentation and be billed per call" is Apigee (portal, API products, monetization), not API Gateway. "Requests must never leave our data center" with full API management is Apigee hybrid.

> **Exam tip.** SpikeArrest protects the backend from traffic bursts; Quota enforces how many calls an app may make in a period. If the requirement is a commercial limit ("1,000 calls per day on the free plan"), choose Quota.

<!-- section: testing-frameworks | objectives: 5.1.3 -->
## Testing frameworks: unit, integration and load

| Test type | Scope | Typical frameworks | Google Cloud support |
| --- | --- | --- | --- |
| Unit | One function or class, dependencies mocked | JUnit, pytest, Go testing, Jest | A Cloud Build step on every commit; fails the build |
| Integration | Real interaction between components | Same frameworks plus containers or emulators | Emulators (Pub/Sub, Spanner, Bigtable, Firestore) in the build; or an ephemeral test project |
| Contract | API producer and consumer agree on the interface | Contract testing tools, OpenAPI validation | Run in both pipelines |
| End-to-end and smoke | A user journey on the deployed system | Browser automation, API test suites | Cloud Deploy verification after each rollout |
| Load and stress | Behavior at expected, peak and beyond-peak load | Locust, JMeter, k6 | Load generators on GKE or Compute Engine; results in Cloud Monitoring and Cloud Trace |

Advice for each layer:

- **Unit tests** are the majority: fast, deterministic, run on every change. Code coverage is a signal, not a goal.
- **Integration tests** use emulators or isolated test resources, never shared production data. Emulators are for correctness, not performance.
- **Load tests** start from the SLOs: define the target (for example, 95th-percentile latency under 300 ms at 2,000 requests per second), then test in an isolated environment sized like production, with realistic data and traffic shape, from the regions where users are. Check autoscaling behavior, quotas and downstream limits (database connections, third-party APIs). A distributed load generator (for example Locust workers on GKE) avoids the client becoming the bottleneck.
- Tests run automatically in the pipeline; a failing test blocks promotion.

> **Exam trap.** Running load tests against production or against an emulator gives the wrong answer: production risks an outage and shares quotas, and emulators do not reproduce production performance. Use a production-sized, isolated environment.

<!-- section: migration-tooling | objectives: 5.1.4 -->
## Data and system migration and management tooling

| Requirement | Tool |
| --- | --- |
| Discover servers and databases, map dependencies, estimate TCO, plan waves | Migration Center |
| Rehost VMs from VMware vSphere, AWS, Azure or VMware Engine to Compute Engine | Migrate to Virtual Machines |
| Move VMware workloads as they are, with VMware tools and licensing | Google Cloud VMware Engine |
| MySQL, PostgreSQL or SQL Server to Cloud SQL (same engine); PostgreSQL to AlloyDB | Database Migration Service, homogeneous, continuous (CDC) |
| Oracle or SQL Server to Cloud SQL for PostgreSQL or AlloyDB | Database Migration Service, heterogeneous, with a conversion workspace (schema and code conversion, Gemini-assisted) |
| Continuous change data capture from operational databases into BigQuery | Datastream |
| Migrate a data warehouse (Teradata, Redshift, Snowflake, Netezza...) | BigQuery Migration Service (assessment, SQL translation) and BigQuery Data Transfer Service |
| Online transfer from Amazon S3, Azure Blob Storage, HTTP URLs, on-premises file systems or HDFS to Cloud Storage, scheduled or recurring | Storage Transfer Service (optimized for more than 1 TiB) |
| Small or one-off copies | `gcloud storage cp` or `gcloud storage rsync` |
| Offline transfer of tens or hundreds of TB | Transfer Appliance (Google recommends it when a network upload would take more than one week) |
| Back up and protect migrated workloads | Backup and DR Service |

Estimate network transfer time before choosing: 1 TB at 100 Mbps takes about a day (8 × 10^12 bits ÷ 10^8 bits per second ≈ 22 hours, before overhead). Google's own example: 300 TB at 100 Mbps takes about 9 months online, against under 25 days to capture on an appliance plus about 10 business days to land in Cloud Storage.

Migrate to Virtual Machines replicates VM disks while the source keeps running, lets you create **test clones** in Google Cloud without affecting the source, then performs a **cut-over** with a short downtime window and a final **finalize** step. Database Migration Service minimizes downtime the same way: initial full load, continuous replication of changes, cut-over when the destination is in sync. A one-time (snapshot) migration requires stopping writes on the source.

> **Exam trap.** For a database migration with minimal downtime, do not export and import a dump: use Database Migration Service in continuous mode and cut over when replication lag is near zero. For Oracle, the destination is Cloud SQL for PostgreSQL or AlloyDB, not Cloud SQL for MySQL.

> **Exam tip.** "Limited bandwidth, large data set, deadline in weeks" is Transfer Appliance. "Ongoing, scheduled sync from another cloud's object storage" is Storage Transfer Service.

<!-- section: gemini-cloud-assist | objectives: 5.1.5 -->
## Gemini Cloud Assist

Gemini Cloud Assist is the AI assistant of the Google Cloud console for designing, deploying, troubleshooting and optimizing workloads. Its capabilities:

| Area | Examples |
| --- | --- |
| Design and build | Natural-language application design in Application Design Center; generating gcloud, kubectl and Terraform; help choosing IAM roles |
| Troubleshoot | **Investigations** that analyze logs, metrics and configuration to propose root causes; alert investigations; handoff to Customer Care with context |
| Optimize | Cost questions and FinOps hub analysis, cost anomaly analysis, database and storage insights |
| Where | Cloud Assist panel in the console and the mobile app, Cloud Hub, CLI and IDE for investigations, integrations such as Slack |

Setting it up for a project:

```bash
gcloud services enable geminicloudassist.googleapis.com --project=example-prod
gcloud projects add-iam-policy-binding example-prod \
  --member=group:sre-team@example.com --role=roles/geminicloudassist.user
gcloud projects add-iam-policy-binding example-prod \
  --member=group:sre-team@example.com --role=roles/cloudasset.viewer
```

Enabling `geminicloudassist.googleapis.com` also enables the required `cloudaicompanion.googleapis.com`. Users need Gemini Cloud Assist User (`roles/geminicloudassist.user`) and Cloud Asset Viewer (`roles/cloudasset.viewer`), plus the product roles needed to see the resources they ask about. Folder-level setup is done in the console; projects created later in the folder must be enabled one by one.

Governance points to give the teams:

- Google documents Gemini Cloud Assist as a **Preview** offering, and warns that it can store data in any Google Cloud data center globally: do not enable it for projects with data residency or customer-managed encryption key requirements.
- Since April 10, 2026, creating, running and editing **investigations** requires a Premium Support contract or account-team access. Investigation roles are separate: Gemini Cloud Assist Investigation Creator (`roles/geminicloudassist.investigationCreator`) creates investigations, Investigation Editor runs and edits existing ones, Investigation Viewer reads them; the creator automatically becomes Investigation Owner of that investigation.
- Generated output (commands, Terraform, root-cause hypotheses) can be plausible but wrong: review it, test it and deploy it through the normal pipeline, never paste it into production directly.

> **Exam trap.** Gemini Cloud Assist assists people; it does not replace IAM, change management or testing. When the scenario has a data residency or CMEK requirement, enabling Gemini Cloud Assist on those projects is the wrong answer.

<!-- section: key-points -->
## Key points

- Blue/green for instant switch with double capacity, canary for gradual exposure, rolling for low extra cost; MIG `--canary-version`, Cloud Run tags and traffic splits.
- Backward-compatible schema changes and health checks make every strategy safe.
- API Gateway for simple serverless APIs; Apigee for full API programs (products, portal, analytics, monetization); Apigee hybrid when traffic must stay in your network.
- SpikeArrest protects backends; Quota enforces plans.
- Unit tests on every commit, integration with emulators or ephemeral projects, load tests on production-sized isolated environments.
- Migration Center to assess, Migrate to VMs to rehost, DMS for databases (continuous for low downtime), Storage Transfer Service online, Transfer Appliance offline.
- Gemini Cloud Assist: Preview, `roles/geminicloudassist.user`, investigations need Premium Support, avoid it on residency or CMEK projects, validate its output.
