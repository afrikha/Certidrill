Cloud Logging collects audit logs, platform logs, network logs and application logs, stores them in log buckets and routes copies elsewhere through sinks. Exam questions ask which audit log records an action and whether it is on by default, how to turn on VPC Flow Logs or firewall logging, how to send logs to BigQuery, Cloud Storage or an external SIEM, how to keep logs longer, and how to find one entry and read its details.

<!-- section: audit-logs | objectives: 3.4.3 -->
## Configuring Cloud Audit Logs

| Audit log | Records | Default | Stored in |
| --- | --- | --- | --- |
| Admin Activity | API calls that change configuration or metadata (create a VM, change an IAM policy) | Always on, can't be disabled | `_Required` (400 days, free) |
| System Event | Google-initiated changes (live migration, Spot VM preemption) | Always on, can't be disabled | `_Required` |
| Data Access | `ADMIN_READ` (read configuration), `DATA_READ`, `DATA_WRITE` (read or write user data) | **Off**, except BigQuery (on, can't be disabled) | `_Default` (30 days) |
| Policy Denied | Requests denied by a security policy such as VPC Service Controls | On; can be excluded but not disabled | `_Default` |

Log names follow `projects/PROJECT_ID/logs/cloudaudit.googleapis.com%2Factivity`, `%2Fdata_access`, `%2Fsystem_event` and `%2Fpolicy`.

**Enable Data Access logs** at the organization, folder or project (a child can't turn off what a parent enabled):

- Console: **IAM & Admin > Audit Logs**, select services, check the permission types, optionally add **exempted principals**, **Save**.
- gcloud: read the IAM policy, edit only `auditConfigs`, write it back with its `etag`.

```bash
gcloud projects get-iam-policy example-prj --format=yaml > /tmp/policy.yaml
# edit the auditConfigs section, keep bindings and etag unchanged
gcloud projects set-iam-policy example-prj /tmp/policy.yaml
```

```yaml
auditConfigs:
- service: storage.googleapis.com
  auditLogConfigs:
  - logType: DATA_READ
  - logType: DATA_WRITE
    exemptedMembers:
    - serviceAccount:batch-loader@example-prj.iam.gserviceaccount.com
- service: allServices
  auditLogConfigs:
  - logType: ADMIN_READ
```

| Who | Role |
| --- | --- |
| Read Admin Activity, System Event, Policy Denied logs | Logs Viewer (`roles/logging.viewer`) |
| Also read Data Access logs in `_Default` | Private Logs Viewer (`roles/logging.privateLogViewer`) |
| Configure audit logs | A role with `resourcemanager.projects.setIamPolicy` (for example Project IAM Admin) |

> **Exam trap.** "Find who read objects in a Cloud Storage bucket last week" fails if Data Access logs were not enabled for Cloud Storage before the reads: logs are never written retroactively. Data Access logs can be large and are billed as log storage; enable them only on the services and log types required, and exempt noisy service accounts.

<!-- section: network-logs | objectives: 3.4.3 -->
## VPC Flow Logs and firewall logs

**VPC Flow Logs** sample network flows to and from VM interfaces (and other supported resources) per subnet, VPC network, VPN tunnel or VLAN attachment. Used for network monitoring, forensics, cost analysis of egress, and troubleshooting.

```bash
# Per subnet (Compute Engine API)
gcloud compute networks subnets update web-subnet --region=europe-west1 \
  --enable-flow-logs --logging-aggregation-interval=interval-30-sec \
  --logging-flow-sampling=0.5 --logging-metadata=include-all

# Recommended: Network Management API, more targets and options
gcloud network-management vpc-flow-logs-configs create web-flows \
  --location=global --subnet=projects/example-prj/regions/europe-west1/subnetworks/web-subnet \
  --flow-sampling=0.25 --aggregation-interval=interval-1-min
```

Defaults on a subnet: 5-second aggregation interval, sampling 0.5 (half of the flows kept). A lower sampling rate or a longer interval reduces log volume and cost.

**Firewall Rules Logging** records each connection that a rule allows or denies (TCP and UDP only). It is set **per rule**:

```bash
gcloud compute firewall-rules update deny-all-ingress --enable-logging --logging-metadata=exclude-all
gcloud compute network-firewall-policies rules update 100 --firewall-policy=prod-policy \
  --global-firewall-policy --enable-logging
```

| Log | Log name | Resource type |
| --- | --- | --- |
| VPC Flow Logs (subnet configuration) | `compute.googleapis.com%2Fvpc_flows` | `gce_subnetwork` |
| Firewall Rules Logging | `compute.googleapis.com%2Ffirewall` | `gce_subnetwork` |
| Cloud NAT | `compute.googleapis.com%2Fnat_flows` | `nat_gateway` |

> **Exam trap.** The implied rules (deny all ingress, allow all egress) can't be logged. To see what the implied deny blocks, create an explicit `deny` rule for all ingress at priority 65535 (the lowest, so it only catches what no other rule matched; at 65534 it would also beat the `default-allow-*` rules, since deny wins at equal priority) with logging enabled. Flow logs and firewall logs are sampled or per-connection records, not packet captures.

VPC Flow Logs, firewall logs and Cloud NAT logs are "vended network logs", billed at a lower rate per GiB than other logs when stored in Logging.

<!-- section: buckets-routing | objectives: 3.4.5 -->
## Log buckets, Log Router and Observability Analytics

Every project, folder, organization and billing account has a **Log Router**. Each **sink** checks every incoming entry against one inclusion filter and up to 50 exclusion filters, and sends matches to its destination. Two sinks and buckets exist by default:

| Sink → bucket | Content | Retention | What you can change |
| --- | --- | --- | --- |
| `_Required` → `_Required` | Admin Activity, System Event, Access Transparency logs | 400 days | Nothing: no exclusion, no change, no deletion; storage is free |
| `_Default` → `_Default` | Everything else | 30 days (free) | Retention 1 to 3,650 days in a project (extra days billed), exclusions, disable the sink |
| Your sinks → user-defined buckets | What your filter selects | 30 days by default, 1 to 3,650 | Location (at creation only), retention, lock, CMEK, analytics |

```bash
# Keep logs 1 year in _Default
gcloud logging buckets update _Default --location=global --retention-days=365

# Stop storing noisy load balancer INFO logs
gcloud logging sinks update _Default \
  --add-exclusion=name=lb-info,filter='resource.type="http_load_balancer" AND severity<WARNING'

# Regional bucket for EU logs, with Observability Analytics
gcloud logging buckets create eu-app-logs --location=europe-west1 --retention-days=90 --enable-analytics
gcloud logging sinks create eu-app-sink \
  logging.googleapis.com/projects/example-prj/locations/europe-west1/buckets/eu-app-logs \
  --log-filter='resource.type="k8s_container" AND resource.labels.namespace_name="shop"'

# Upgrade an existing bucket (irreversible) and link it to BigQuery
gcloud logging buckets update _Default --location=global --enable-analytics --async
gcloud logging links create default_link --bucket=_Default --location=global

# Make retention immutable (irreversible)
gcloud logging buckets update audit-archive --location=europe-west1 --locked
```

Key rules:

- Storage is charged on ingestion into a bucket ($0.50 per GiB beyond 50 GiB per project per month); **excluded entries are not stored and not charged**; routing itself is free. A log stored in two buckets is charged twice.
- A bucket's region can't be changed after creation; to move logs, create a new bucket and redirect the sinks.
- **Observability Analytics** (formerly Log Analytics; the exam guide says "log analytics") lets you query an upgraded bucket with SQL from the Observability Analytics page at no extra charge. A **linked BigQuery dataset** (one per bucket) is needed to join logs with other BigQuery data or query them from BigQuery. The upgrade can't be undone.
- Access to a bucket's logs goes through **log views**: grant Logs View Accessor (`roles/logging.viewAccessor`) on a view (or on the project with an IAM condition) to give a team only its logs; a project-level grant without a condition opens every view of the project. A view filter uses the `source()` function to select a project, folder or organization, optionally with `resource.type` and `log_id()` clauses joined by `AND`: `gcloud logging views create team-a --bucket=central --location=global --log-filter='source("projects/team-a-prod")'`.
- Folder and organization `_Default` buckets keep 30 days only: route their logs to a project bucket to keep them longer.
- Log sinks never route entries retroactively. To copy logs already stored, use `gcloud logging copy BUCKET gs://DEST --location=LOCATION`.

> **Exam tip.** "Reduce Logging cost without losing audit logs" → exclusion filters on `_Default` (or on the sink that creates the volume), lower VPC Flow Logs sampling; `_Required` costs nothing and can't be touched. "Keep application logs 5 years at the lowest cost" → a sink to Cloud Storage (Archive class), not a 1,825-day bucket retention.

<!-- section: export-logs | objectives: 3.4.4 -->
## Exporting logs to external systems

| Destination | Sink destination string | Destination role of the writer identity (plus Logs Writer) | Use |
| --- | --- | --- | --- |
| BigQuery dataset | `bigquery.googleapis.com/projects/P/datasets/D` | BigQuery Data Editor | SQL analysis, dashboards, joins |
| Cloud Storage bucket | `storage.googleapis.com/BUCKET` | Storage Object Creator | Cheap long-term archive (files written hourly) |
| Pub/Sub topic | `pubsub.googleapis.com/projects/P/topics/T` | Pub/Sub Publisher | Streaming to a SIEM, Splunk or on-premises systems |
| Log bucket | `logging.googleapis.com/projects/P/locations/L/buckets/B` | Logs Bucket Writer | Central log project |
| Another project | `logging.googleapis.com/projects/P` | Logs Writer only | That project's Log Router reroutes (one hop) |

```bash
# Project sink to BigQuery with partitioned tables
gcloud logging sinks create audit-to-bq \
  bigquery.googleapis.com/projects/sec-prj/datasets/audit_logs \
  --log-filter='logName:"cloudaudit.googleapis.com"' --use-partitioned-tables

# Grant the sink's writer identity access to the destination
gcloud logging sinks describe audit-to-bq --format='value(writerIdentity)'
gcloud projects add-iam-policy-binding sec-prj \
  --member='serviceAccount:WRITER_IDENTITY_EMAIL' --role=roles/bigquery.dataEditor
gcloud projects add-iam-policy-binding sec-prj \
  --member='serviceAccount:WRITER_IDENTITY_EMAIL' --role=roles/logging.logWriter

# Aggregated sink: every project of the organization, to Pub/Sub for the SIEM
gcloud logging sinks create org-to-siem pubsub.googleapis.com/projects/sec-prj/topics/siem \
  --organization=123456789012 --include-children \
  --log-filter='severity>=WARNING OR logName:"cloudaudit.googleapis.com"'
```

- **Writer identity**: a sink writes with a service account (`gcloud logging sinks describe` shows it). In the project that stores the destination, grant it **Logs Writer** (`roles/logging.logWriter`) for every destination, plus the destination role of the table. Until it has them, nothing arrives (the sink shows errors). Only a sink to a log bucket in the same project as the logs has no writer identity.
- **Aggregated sinks** (`--organization` or `--folder` with `--include-children`) collect logs from all descendant folders and projects. Adding `--intercept-children` makes the sink intercept those entries, overriding the routing of the child resources' own sinks.
- **On-premises or third-party tools**: export to Pub/Sub, then have the tool pull the subscription, or use the Dataflow **Pub/Sub to Splunk** template for Splunk.
- Cloud Storage sinks deliver in hourly batches, so they're unsuitable for near-real-time needs; BigQuery and Pub/Sub sinks stream.

> **Exam trap.** A sink created with gcloud in project A to a dataset in project B delivers nothing until someone grants the **writer identity** BigQuery Data Editor and Logs Writer in project B. Granting the role to the user who created the sink doesn't help.

<!-- section: view-filter | objectives: 3.4.6 -->
## Viewing and filtering logs

**Logs Explorer** (Logging > Logs Explorer) has a query pane, a fields pane (resource type, log name, severity...), a timeline histogram coloured by severity, and the query results. Use the time-range selector, **Stream logs** for live tailing, the **Refine scope** menu to search other projects or log views, and the **Actions** menu to create a log-based metric, a sink or a log alert from the current query.

Logging query language:

| Operator | Meaning | Example |
| --- | --- | --- |
| `=` `!=` | Equals, not equals | `resource.type="gce_instance"` |
| `>` `>=` `<` `<=` | Comparison; severity is ordered | `severity>=ERROR` |
| `:` | Has (substring) | `textPayload:"timeout"` |
| `=~` `!~` | Regular expression | `resource.labels.instance_id=~"^45"` |
| `AND` `OR` `NOT` | Uppercase only (lowercase `and`, `or`, `not` are parsed as search terms); `AND` is implicit between comparisons; precedence: `NOT`, then `OR`, then `AND`, so `a AND b OR c` means `a AND (b OR c)`: add parentheses | `NOT protoPayload.methodName:"get"` |
| `SEARCH()` | Whole-token, case-insensitive search | `SEARCH("payment failed")` |

Severity order: `DEFAULT`, `DEBUG`, `INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL`, `ALERT`, `EMERGENCY`.

```text
resource.type="gce_instance"
resource.labels.zone="europe-west1-b"
severity>=ERROR
timestamp>="2026-11-27T08:00:00Z"

logName="projects/example-prj/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.methodName="v1.compute.instances.delete"
protoPayload.authenticationInfo.principalEmail="dev@example.com"
```

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' \
  --freshness=2h --limit=20 --format=json
gcloud logging read 'logName:"cloudaudit.googleapis.com%2Factivity" AND protoPayload.methodName:"setIamPolicy"' \
  --project=example-prj --freshness=7d
```

`gcloud logging read` searches the last day by default (`--freshness=1d`), newest first. Prefer field comparisons or `SEARCH()` to a bare global term, which scans every field and is slow.

<!-- section: log-details | objectives: 3.4.7 -->
## Viewing log entry details

In the query results, click an entry, then **Expand** (or expand nested fields) to see the full JSON. On any field value, **Show matching entries** or **Hide matching entries** adds it to the query; **Pin to Fields pane** keeps the field visible; **Copy** copies the entry as JSON or a link; summary fields shown as chips are managed in **Preferences**. For entries with a trace, **View trace details** opens Cloud Trace and **Show all logs for this trace** correlates the request's logs. **Investigate log** asks Gemini Cloud Assist for a summary (Preview).

`LogEntry` fields to recognize:

| Field | Content |
| --- | --- |
| `logName` | Log the entry belongs to |
| `resource` | Monitored resource: `type` and `labels` (project, zone, instance ID...) |
| `timestamp` / `receiveTimestamp` | When the event happened / when Logging received it |
| `severity` | `DEFAULT` to `EMERGENCY` |
| `insertId` | Unique ID used for de-duplication |
| `textPayload`, `jsonPayload`, `protoPayload` | The payload: plain text, structured JSON, or a protocol buffer (audit logs) |
| `httpRequest` | Method, URL, status, latency, user agent |
| `labels` | Extra key-value metadata |
| `trace`, `spanId` | Link to Cloud Trace |
| `operation` | Groups the entries of one long-running operation (first, last) |

In an audit log entry, `protoPayload` is an `AuditLog`:

| Field | Answers |
| --- | --- |
| `authenticationInfo.principalEmail` | Who made the call (user or service account) |
| `methodName` / `serviceName` | What was called (`v1.compute.instances.delete`, `compute.googleapis.com`) |
| `resourceName` | Which resource |
| `requestMetadata.callerIp` | From which IP |
| `authorizationInfo` | Which permission was checked and whether it was granted |
| `status` | Success or the error code |

> **Exam tip.** "Who deleted the VM?" → Admin Activity log, filter `protoPayload.methodName` on the delete method, read `protoPayload.authenticationInfo.principalEmail`. "Why was the VM restarted at 3 a.m.?" → System Event log (for example a host maintenance event).

<!-- section: key-points -->
## Key points

- Admin Activity and System Event: always on, `_Required`, 400 days, free. Data Access: off by default except BigQuery, enabled in IAM & Admin > Audit Logs or `auditConfigs`.
- Private Logs Viewer is needed to read Data Access logs.
- VPC Flow Logs per subnet (`--enable-flow-logs`) or through the Network Management API; firewall logging per rule; implied rules can't be logged.
- `_Default`: 30 days, 1 to 3,650; exclusions save cost; `_Required` can't change. Bucket region fixed at creation; upgrade to Observability Analytics is irreversible.
- Sinks: BigQuery, Cloud Storage, Pub/Sub, log bucket or project; grant the writer identity Logs Writer plus the destination role; aggregated sinks with `--include-children`; nothing retroactive.
- Filters: `resource.type`, `logName`, `severity>=`, `:` substring, `=~` regex, uppercase `AND`/`OR`/`NOT`; `gcloud logging read --freshness`.
- Audit entry: `principalEmail` (who), `methodName` (what), `resourceName` (on what), `callerIp` (from where).
