Cloud Monitoring turns metrics into dashboards and alerts; agents and Managed Service for Prometheus feed it; diagnostic tools find the slow code or query; Personalized Service Health, Cloud Hub and Active Assist tell you what Google is doing to your services and what to optimize. Questions ask for the right condition, agent, command, role or console page, often with "least effort" as the deciding constraint.

<!-- section: alerting | objectives: 3.4.1 -->
## Creating alerts on resource metrics

An **alerting policy** has one to six **conditions**, a combiner (`OR`, `AND`, or `AND_WITH_MATCHING_RESOURCE`), **notification channels** and optional documentation. With several conditions the default combiner is `AND`, which is met even when a **different resource** meets each condition; to require that the same resource meets all of them, use `AND_WITH_MATCHING_RESOURCE`. When a condition is met, Monitoring opens an **incident** and notifies every channel of the policy.

| Condition type | Fires when |
| --- | --- |
| Metric threshold | Each aligned value in the retest window crosses the threshold (for example CPU above 80 % for 5 minutes) |
| Metric absence | No data arrives for a time series during the window (agent stopped, VM down) |
| PromQL | A PromQL expression returns results (recommended query language) |
| Forecast | Every forecast produced during a 15-minute window predicts that the metric will cross the threshold |
| Log-based alert | A matching log entry arrives (defined in Logging, see below) |

Settings that change behavior:

- **Alignment period** (minimum 60 s) and **aligner** (mean, max, sum, rate...) turn raw points into regular values; the retest window (`duration`) avoids alerting on one spike: Google recommends at least 3 minutes.
- **Missing data**: by default open incidents stay open and no new one opens.
- **Auto-close**: 7 days by default.
- **Channels**: email, SMS (must be verified), Slack, PagerDuty, webhooks, Pub/Sub, the Google Cloud mobile app. Create the channel before the policy.

```bash
# Quick policy from flags
gcloud monitoring policies create --display-name="High CPU web" \
  --condition-display-name="CPU above 80% for 5 min" \
  --condition-filter='metric.type="compute.googleapis.com/instance/cpu/utilization" AND resource.type="gce_instance"' \
  --if='> 0.8' --duration=300s --aggregation='{"alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_MEAN"}' \
  --notification-channels=projects/example-prj/notificationChannels/1234567890

# Policy as code (JSON or YAML file in the alertPolicies format)
gcloud monitoring policies create --policy-from-file=high-cpu.json

# Uptime check on a public URL
gcloud monitoring uptime create shop-home --resource-type=uptime-url \
  --resource-labels=host=shop.example.com,project_id=example-prj

# Silence notifications during a maintenance window
gcloud monitoring snoozes create --display-name="Patch night" \
  --criteria-policies=projects/example-prj/alertPolicies/POLICY_ID \
  --start-time=2026-11-28T22:00:00Z --end-time=2026-11-29T02:00:00Z
```

```json
{
  "displayName": "Very high CPU usage",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "CPU above 90 % for 15 minutes",
      "conditionThreshold": {
        "filter": "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" AND resource.type=\"gce_instance\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 0.9,
        "duration": "900s",
        "trigger": { "count": 1 },
        "aggregations": [ { "alignmentPeriod": "60s", "perSeriesAligner": "ALIGN_MAX" } ]
      }
    }
  ],
  "notificationChannels": [ "projects/example-prj/notificationChannels/1234567890" ]
}
```

**Log-based alerts** (Logs Explorer > Actions > **Create log alert**) notify on a specific entry, such as an IAM policy change; set the time between notifications to avoid floods. They can't count entries: to alert on a rate or count, create a log-based metric and alert on it.

> **Exam trap.** Memory utilization and disk space used are not Compute Engine system metrics: an alert on them needs the **Ops Agent** on the VM. CPU, disk I/O and network metrics exist without an agent.

<!-- section: custom-metrics | objectives: 3.4.2 -->
## Creating and ingesting custom metrics

When no built-in metric fits, write **user-defined (custom) metrics**:

| Source | How | Metric prefix |
| --- | --- | --- |
| Application code (recommended) | OpenTelemetry SDK, exported with OTLP through the Ops Agent or an OpenTelemetry Collector (sidecar on Cloud Run) | `workload.googleapis.com/` or `prometheus.googleapis.com/` |
| Direct API calls | Cloud Monitoring API `timeSeries.create` (client libraries); the descriptor is created automatically on first write or explicitly | `custom.googleapis.com/` |
| Prometheus exporters | Managed Service for Prometheus, or the Ops Agent Prometheus receiver on VMs | `prometheus.googleapis.com/` |
| Third-party apps on VMs | Ops Agent integrations (Apache, nginx, MySQL...) | `workload.googleapis.com/` |
| Log entries | **Log-based metrics** | `logging.googleapis.com/user/` |

**Log-based metrics** turn matching log entries into a time series without changing the code:

- **Counter**: counts matching entries (for example HTTP 500 responses).
- **Distribution**: extracts a numeric value (for example a latency field) into histogram buckets.
- Labels extracted from fields create one time series per value; keep cardinality low.
- Project-level or bucket-scoped; they count only entries received **after** creation and only entries that are not excluded.

```bash
gcloud logging metrics create checkout_errors \
  --description="Checkout 5xx responses" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="checkout" AND httpRequest.status>=500'
gcloud logging metrics create latency_dist --config-from-file=latency-metric.yaml   # distribution
gcloud logging metrics list
```

Custom, external, user-defined log-based and Ops Agent third-party metrics are chargeable (per MiB ingested); Prometheus-style metrics are charged per sample; Google Cloud system metrics are free.

> **Exam tip.** "Alert when the application logs more than 10 payment failures in 5 minutes, without changing the code" → counter log-based metric plus a metric-threshold alerting policy. "Export a business KPI computed in the code" → OpenTelemetry (or the Monitoring API) custom metric.

<!-- section: diagnostic-tools | objectives: 3.4.8 -->
## Diagnostic tools: Cloud Trace, Cloud Profiler, Query Insights, index advisor

| Symptom | Tool | What it shows |
| --- | --- | --- |
| A request is slow, and it calls several services | **Cloud Trace** | Spans and latency of each call across services; Trace Explorer heatmap; links to the request's logs |
| CPU or memory is high and you need the guilty function | **Cloud Profiler** | Flame graphs of CPU time, heap, wall time (Go, Java, Node.js, Python), continuously in production |
| Exceptions are piling up | **Error Reporting** | Errors grouped by stack trace, with counts and first/last seen |
| A Cloud SQL or AlloyDB database is slow | **Query Insights** | Database load by query, user, database and client address, sampled query plans, application tags |
| Queries scan tables for lack of an index | **Index advisor** | `CREATE INDEX` recommendations with estimated impact and storage |

- **Cloud Trace**: instrument with OpenTelemetry (OTLP through the Telemetry API); Cloud Run and Cloud Run functions send request latency automatically. Spans are kept 30 days. The runtime service account needs Cloud Trace Agent (`roles/cloudtrace.agent`).
- **Cloud Profiler**: add the language agent library and start it with a service name; overhead is commonly under 0.5 %. The identity needs Cloud Profiler Agent (`roles/cloudprofiler.agent`).
- **Query Insights**: free; Cloud SQL Enterprise keeps 7 days of metrics, Enterprise Plus 30 days and adds wait events and index advisor. Viewing needs Database Insights Viewer and Cloud SQL Viewer, plus the Cloud Trace API for query plans; on Enterprise Plus, custom roles and other predefined roles don't give access to the historical data, only those two roles do.
- **Index advisor**: Cloud SQL for PostgreSQL Enterprise Plus (not Enterprise) and AlloyDB; recommendations appear in Query Insights and in views such as `google_db_advisor_recommended_indexes`; `SELECT * FROM google_db_advisor_recommend_indexes();` runs an analysis on demand.

```bash
gcloud sql instances patch orders-pg --insights-config-query-insights-enabled \
  --insights-config-record-application-tags --insights-config-record-client-address
```

> **Exam trap.** Trace answers "where is the time spent between services"; Profiler answers "which function burns CPU or memory inside one service". A slow SQL statement is a Query Insights question, not a Trace or Profiler one.

<!-- section: service-health | objectives: 3.4.9 -->
## Personalized Service Health

**Personalized Service Health** (GA) shows Google Cloud incidents that affect **your** projects (products and locations you use), unlike the public Google Cloud Service Health page, which lists every incident. Open **Service Health** in the console (also in the mobile app); each event shows affected products, locations, state, updates, start and end times. Impacted resources per event are in Preview.

| Task | How |
| --- | --- |
| Turn it on | `gcloud services enable servicehealth.googleapis.com --project=PROJECT_ID` (a script enables it for every project of a folder or organization) |
| View events | Personalized Service Health Viewer (`roles/servicehealth.viewer`) |
| Alert the on-call team | Service Health > **Create Alert Policy**, pick a template (new incident, update, specific product or location), choose notification channels |
| Organization-wide view | Organization view in the dashboard, or the API with organization permissions |
| Keep or analyze events | Events are written to Cloud Logging: query, route or export them |

Creating alerts also needs Logs Configuration Writer, Monitoring AlertPolicy Editor and Monitoring NotificationChannel Viewer.

> **Exam tip.** "Be notified automatically when a Google Cloud incident affects the services used in our projects" → Personalized Service Health alert policy, not polling the public status page.

<!-- section: ops-agent | objectives: 3.4.10 -->
## Configuring and deploying the Ops Agent

The **Ops Agent** is the single agent for Compute Engine VMs: logs (Fluent Bit) and metrics and traces (OpenTelemetry Collector). It replaces the legacy Logging and Monitoring agents, which must be removed first to avoid duplicates.

```bash
# One Linux VM
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
sudo systemctl status google-cloud-ops-agent"*"

# Fleet: agent policy (VM Manager OS policies), one per zone
gcloud compute instances ops-agents policies create prod-ops-agent \
  --zone=europe-west1-b --file=ops-agent-policy.yaml
```

```yaml
# ops-agent-policy.yaml: install version 2 on VMs labeled env=prod
agentsRule:
  packageState: installed
  version: 2.*.*
instanceFilter:
  inclusionLabels:
  - labels:
      env: prod
```

```yaml
# /etc/google-cloud-ops-agent/config.yaml: add an application log file, sample host metrics every 30 s
logging:
  receivers:
    app_logs:
      type: files
      include_paths:
      - /var/log/shop/*.log
  service:
    pipelines:
      app_pipeline:
        receivers: [app_logs]
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
      collection_interval: 30s
```

| Point | Detail |
| --- | --- |
| Default collection | Linux: syslog and host metrics (including memory and disk usage) every 60 s; Windows: event logs and host metrics |
| Configuration | `receivers`, optional `processors`, `service.pipelines`; your file is merged with the built-in configuration; restart after a change (`sudo systemctl restart google-cloud-ops-agent`) |
| Permissions | The VM's service account needs Logs Writer and Monitoring Metric Writer; Cloud Logging and Cloud Monitoring APIs enabled |
| No external IP | The agent packages are reachable through Private Google Access, but Linux dependencies from upstream repositories can be blocked; if repositories are unreachable, use a custom image with the agent preinstalled |
| Other install paths | Monitoring > VM Instances > **Install/Update Ops Agent**, the VM's **Observability** tab, or automation tools |
| Agent policies | Need the OS Config agent on the VMs and the OS Config API; take 10 to 15 minutes to apply |

> **Exam trap.** GKE nodes, Cloud Run and App Engine don't need the Ops Agent: their logs and system metrics are collected by the platform. On a VM that reports CPU but no memory metric, install the Ops Agent (and check the service account's roles), don't write a custom script.

<!-- section: managed-prometheus | objectives: 3.4.11 -->
## Deploying Managed Service for Prometheus

Google Cloud Managed Service for Prometheus stores Prometheus metrics in Monarch (the Cloud Monitoring backend) for **24 months at no storage charge** (billed per sample ingested) and serves them to PromQL in Cloud Monitoring, Grafana or any Prometheus API client.

| Collection mode | Use |
| --- | --- |
| **Managed collection** (recommended on Kubernetes) | Google runs the collectors; you declare what to scrape with `PodMonitoring` / `ClusterPodMonitoring` resources |
| Self-deployed collection | Drop-in Prometheus binary when you keep your own Prometheus configuration |
| OpenTelemetry Collector | Pipelines that already use OpenTelemetry |
| Ops Agent | Prometheus endpoints on Compute Engine VMs |

Managed collection is **on by default** on GKE Autopilot (1.25 or later, can't be turned off) and on GKE Standard clusters from 1.27; otherwise:

```bash
gcloud container clusters update shop-cluster --region=europe-west1 --enable-managed-prometheus
gcloud container clusters create new-cluster --zone=europe-west1-b --enable-managed-prometheus
```

```yaml
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: shop-api
  namespace: shop
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: shop-api
  endpoints:
  - port: metrics
    interval: 30s
```

```bash
kubectl apply -f podmonitoring.yaml
kubectl get podmonitoring -n shop
```

`PodMonitoring` scrapes Pods in its own namespace; `ClusterPodMonitoring` works across all namespaces. Query the results in Metrics Explorer or alerting policies with PromQL.

> **Exam tip.** "Keep our Prometheus exporters and PromQL dashboards but stop operating Prometheus storage on GKE" → Managed Service for Prometheus with managed collection and `PodMonitoring`. Running a self-managed Prometheus StatefulSet is the high-effort distractor.

<!-- section: gemini-cloud-assist | objectives: 3.4.12 -->
## Using Gemini Cloud Assist for Cloud Monitoring

**Gemini Cloud Assist is a Preview offering** (Pre-GA terms): know what it does, but a Preview feature is never the recommended production answer.

| Capability | Where |
| --- | --- |
| Explore metrics, logs, alerts and errors in natural language | Gemini Cloud Assist panel in the console |
| **Investigations**: root-cause analysis with observations, hypotheses and next steps | **Investigate** button on alerts that have a resource label, on Warning-or-higher log entries in Logs Explorer, on the Cloud Hub Health page, or the Investigations page |
| Proactive alert investigations | When an alerting policy fires, related alerts are grouped and a preliminary root-cause analysis is drafted |

Investigations need Investigation Creator (`roles/geminicloudassist.investigationCreator`; like every `roles/geminicloudassist.*` role, its title carries "Beta"), the creator becomes Investigation Owner of that investigation, and since 2026-04-10 creating or running them requires a Premium Support contract or access requested through the account team. An investigation uses the caller's own permissions on the resources it examines.

<!-- section: active-assist | objectives: 3.4.13 -->
## Optimizing resource utilization with Active Assist

**Active Assist** is the portfolio of **recommenders** that analyze usage and propose changes (cost, performance, security...). View recommendations on the Active Assist page, in each product's console pages (for example a "save" hint next to an idle VM), in the FinOps hub for cost, in Cloud Hub Optimization, through gcloud or the API, or exported to BigQuery.

| Recommender | ID | Suggests |
| --- | --- | --- |
| Idle VM | `google.compute.instance.IdleResourceRecommender` | Stop or delete unused VMs |
| VM machine type | `google.compute.instance.MachineTypeRecommender` | Resize over- or under-provisioned VMs |
| MIG machine type | `google.compute.instanceGroupManager.MachineTypeRecommender` | Resize the instance template |
| Idle persistent disk | `google.compute.disk.IdleResourceRecommender` | Snapshot and delete unattached disks |
| Idle IP address | `google.compute.address.IdleResourceRecommender` | Release unused static external IPs |
| Cloud SQL idle | `google.cloudsql.instance.IdleRecommender` | Stop idle instances |
| Cloud SQL overprovisioned | `google.cloudsql.instance.OverprovisionedRecommender` | Downsize instances |
| IAM recommender | `google.iam.policy.Recommender` | Remove excess permissions |
| Unattended project | `google.resourcemanager.projectUtilization.Recommender` | Shut down abandoned projects |
| Committed use discounts | `google.compute.commitment.UsageCommitmentRecommender` and spend-based | Buy commitments for steady usage |

```bash
gcloud recommender recommendations list --project=example-prj \
  --location=europe-west1-b --recommender=google.compute.instance.IdleResourceRecommender
gcloud recommender recommendations describe RECOMMENDATION_ID --project=example-prj \
  --location=europe-west1-b --recommender=google.compute.instance.IdleResourceRecommender
gcloud recommender recommendations mark-claimed RECOMMENDATION_ID --project=example-prj \
  --location=europe-west1-b --recommender=google.compute.instance.IdleResourceRecommender --etag=ETAG
```

Recommendations move through `ACTIVE`, `CLAIMED`, `SUCCEEDED`, `FAILED` or `DISMISSED`. Some can be applied in one click; review the impact first and keep a rollback plan.

> **Exam tip.** "Find VMs that are oversized, with the least effort" → the VM machine type recommender (Active Assist), not a custom script over Monitoring metrics.

<!-- section: cloud-hub | objectives: 3.4.14 -->
## Monitoring active events and application health with Cloud Hub

**Cloud Hub** (GA since 2025-12-16) is a single console entry point for operating a project or an **App Hub application**:

| Page | Shows |
| --- | --- |
| Home | Top items from every category |
| Health & troubleshooting | Open Cloud Monitoring alerts, active Google Cloud incidents (from Personalized Service Health), health metrics (utilization, latency, errors); default range last hour |
| Deployments | Failed Application Design Center deployments with the identified cause; deployed applications with an available update |
| Maintenance | Upcoming, in-progress and completed maintenance |
| Optimization | Cost totals and trends, costliest and underused resources |
| Quotas & reservations | Quotas above 90 % usage, reservations |
| Security & compliance | Top critical and high-severity Security Command Center findings; compliance framework status and top failing cloud controls |
| App Topology (Preview) | Query resources and applications across health, security and deployments, shown as an interactive topology graph |
| Support | Open cases, active incidents, in-progress maintenance |

- **Project view**: health of the Google Cloud products used in one project. **Application view**: services and workloads of an App Hub application, which requires a folder set up for application management (its management project is named `FOLDER-NAME-mp`).
- Role: Cloud Hub Operator (`roles/cloudhub.operator`) on the project, or on the management project for application views.
- From Health & troubleshooting you can open the alert, the incident in Service Health, the product page or the workload's Monitoring dashboard, or start a Gemini Cloud Assist investigation (Preview).

> **Exam tip.** "One page where the application owner sees open alerts, ongoing Google incidents and upcoming maintenance for the app" → Cloud Hub (application view). "Detailed notification about a Google incident" → Personalized Service Health.

<!-- section: key-points -->
## Key points

- Alerting policy = conditions + channels; threshold, absence, forecast and PromQL conditions; retest window of at least 3 minutes; incidents auto-close after 7 days.
- Memory and disk-space metrics on VMs need the Ops Agent; log-based alerts notify on one entry, log-based metrics count.
- Custom metrics: OpenTelemetry first; `custom.googleapis.com/` (API), `workload.googleapis.com/` (Ops Agent), `prometheus.googleapis.com/`, `logging.googleapis.com/user/`.
- Trace = latency across services; Profiler = CPU and memory per function; Query Insights and index advisor = slow SQL.
- Personalized Service Health: incidents affecting your projects, `servicehealth.googleapis.com`, alert templates.
- Ops Agent: one install script or agent policies per zone; config in `/etc/google-cloud-ops-agent/config.yaml`; Logs Writer and Monitoring Metric Writer.
- Managed Service for Prometheus: managed collection with `PodMonitoring`, default on recent GKE, 24-month retention.
- Gemini Cloud Assist is Preview. Active Assist recommenders via the console or `gcloud recommender recommendations list`. Cloud Hub: one place for alerts, incidents, maintenance and health by project or application.
