Azure Monitor is the platform behind every logging and monitoring question: it collects metrics and logs, stores logs in Log Analytics workspaces, routes them to other destinations and raises alerts. The exam asks you to decide what to collect, where to store it, where to send it and which tool observes which workload.

<!-- section: log-sources | objectives: 1.1.1 -->
## What to log and where it starts

A logging design begins with the sources, because they don't behave the same way:

| Source | Content | Collected without configuration | Default retention |
| --- | --- | --- | --- |
| Platform metrics | Numeric values of a resource at regular intervals | Yes | 93 days |
| Activity log | Control plane operations on a subscription: who created, changed or deleted what | Yes | 90 days, free of charge |
| Resource logs | Operations inside a resource (data plane): reading a secret, requests to a storage account, firewall hits | **No**: a diagnostic setting is required | That of the destination |
| Guest operating system and workload logs | Windows events, Syslog, performance counters, text logs | No: Azure Monitor Agent and a data collection rule | That of the workspace |
| Application telemetry | Requests, dependencies, exceptions, traces | No: Application Insights instrumentation, based on OpenTelemetry | That of the workspace |
| Microsoft Entra logs | Sign-ins, directory audit, provisioning | Yes, in Microsoft Entra ID | 7 days with Microsoft Entra ID Free, 30 days with P1 or P2 |

Machines outside Azure (on-premises or in another cloud) are first connected with **Azure Arc**; they then use the same agent and the same data collection rules as Azure virtual machines.

The default answer of a logging solution is a **Log Analytics workspace**: everything that must be queried with KQL, correlated across sources or used in a log alert goes there. Microsoft Sentinel is enabled on a workspace, and Application Insights stores its telemetry in one.

> **Exam trap.** The activity log records control plane operations only. "Who read this secret" or "who downloaded this blob" is a data plane question: the answer is the resource logs of the key vault or of the storage account, which exist only once a diagnostic setting sends them somewhere.

<!-- section: workspace-design | objectives: 1.1.1 -->
## Designing Log Analytics workspaces

Start with **one workspace** and add others only for a stated reason. The size of a workspace doesn't limit its performance, and a workspace accepts data from resources of any region and any subscription of its tenant.

| Criterion in the question | Recommendation |
| --- | --- |
| One Microsoft Entra tenant, no special constraint | A single workspace |
| Several tenants | One workspace per tenant (most resources can only send to a workspace of their own tenant); Azure Lighthouse to work across them |
| Data must stay in a given region for regulatory reasons | One workspace in each such region; otherwise one workspace for all regions |
| Each team must see only the logs of its own resources | Not a reason to split: use resource-context access, and table-level access for finer control |
| Costs must be charged back per department | First check whether Cost Management or a log query is granular enough; one workspace per cost owner only if it isn't |
| Different retention for the same table depending on the resources | Separate workspaces, because retention is set per table |
| Operational data and security data (Microsoft Sentinel) | Combine them for cross-visibility and to reach a commitment tier; separate them when the security team requires it or when Sentinel pricing on operational data costs more |
| Microsoft Sentinel and Microsoft Defender for Cloud | The same workspace |
| Critical data must survive a regional failure | Ingest it into workspaces in different regions |

**Access control.** The default access mode, *Use resource or workspace permissions*, lets a user who can read a resource query the logs of that resource without any permission on the workspace (resource-context access). A user with access to the workspace itself sees all its data, unless table-level access narrows it.

**Table plans** set cost against features, table by table:

| Plan | Data it suits | Queries and alerts | Ingestion cost |
| --- | --- | --- | --- |
| Analytics | High-value data for continuous monitoring and detection | All features, all alert types, insights; queries included | Standard |
| Basic | Troubleshooting and incident response data | Full KQL, simple log alerts only; each query is charged | Reduced |
| Auxiliary | Verbose logs, audit and compliance data that is rarely read | Slower queries, no alerts; each query is charged | Minimal |

**Retention.** Analytics tables keep data 30 days by default for interactive queries (90 days with Microsoft Sentinel and for Application Insights), extendable to 2 years. Beyond that, long-term retention keeps the data of any plan up to **12 years** in total; older data is queried with a search job.

**Cost and encryption.** A commitment tier discounts a predictable daily volume. A **dedicated cluster** (commitment of at least 100 GB per day) lets several workspaces of the same region share one commitment tier, and it is required for customer-managed keys, Customer Lockbox and double encryption of log data.

> **Exam tip.** "Encrypt the logs with a key the company controls" means a dedicated cluster, not a storage account. "Keep five years for audits, rarely queried, lowest cost" means long-term retention or the Auxiliary plan, not five years of interactive retention.

<!-- section: routing | objectives: 1.1.2 -->
## Routing logs

**Diagnostic settings** route the resource logs and platform metrics of a resource, the activity log of a subscription or of a management group, and Microsoft Entra logs (configured in Microsoft Entra ID). Four destinations exist:

| Destination | Recommend it for | Constraint |
| --- | --- | --- |
| Log Analytics workspace | Queries, alerts, correlation, Microsoft Sentinel | Any region and any subscription; another tenant through Azure Lighthouse |
| Storage account | Low-cost archive, immutable storage for audits | Standard account; same region as the resource when the resource is regional |
| Event hub | Streaming to a non-Microsoft SIEM or to a custom pipeline | Same region as the resource when the resource is regional |
| Partner solution | Monitoring products integrated with Azure | Depends on the partner |

Rules that decide answers:

- Each resource needs its own diagnostic setting, with at most **five** settings per resource. One setting can hold only **one destination of each type**: sending the same logs to two workspaces takes two settings.
- A setting selects log categories or a category group (`allLogs`, `audit`). It can't filter inside a category.
- To configure every existing and future resource, assign an **Azure Policy** with the `deployIfNotExists` effect at a management group or subscription, and run a remediation task for the existing resources.
- Sending the activity log to a workspace has no ingestion charge.

For machines, the **data collection rule** (DCR) is the routing object: it states which events and counters the Azure Monitor Agent collects and to which workspaces they go. A machine can be associated with several rules, so the same server can feed an operations workspace and a security workspace.

**Transformations** are KQL statements that run at ingestion, before the data is stored and billed: they drop rows and columns or reshape records. They live in the DCR that collects the data. Data that doesn't arrive through a DCR, such as resource logs sent by diagnostic settings, is handled by the single **workspace transformation DCR** of the workspace.

A **data export rule** sends the new records of selected tables continuously from a workspace to a storage account or an event hub located in the same region as the workspace. It works for Analytics and Basic tables and never exports historical data.

| Requirement | Route |
| --- | --- |
| Analyze, alert on and correlate logs from many resources | Diagnostic settings and DCRs to a Log Analytics workspace |
| Keep logs for years at the lowest cost, almost never read | Storage account (with an immutability policy when audits demand it), or long-term retention in the workspace |
| Feed Splunk, QRadar or another external SIEM in near real time | Event hub |
| Detect and respond to threats with a Microsoft SIEM | Microsoft Sentinel on the workspace |
| Remove noisy records or sensitive columns before paying for them | Transformation in a DCR |
| Copy what already lands in the workspace to cheap storage, continuously | Data export rule |
| Agents and queries must not use public endpoints | Azure Monitor Private Link Scope (AMPLS) with a private endpoint |
| A service provider must work on the logs of customer tenants | Workspaces in each tenant, delegated through Azure Lighthouse |

An **AMPLS** groups workspaces, Application Insights resources and data collection endpoints behind one private endpoint. Its *Private Only* access mode blocks access to Azure Monitor resources outside the scope, which prevents data exfiltration; *Open* mode still allows them. Use a single AMPLS for all networks that share the same DNS.

> **Exam trap.** The region constraint applies to storage accounts and event hubs, not to workspaces. A regional resource in West Europe can send its logs to a workspace in any region, but an event hub or storage account used as destination must be in West Europe.

<!-- section: monitoring | objectives: 1.1.3 -->
## Choosing the monitoring tools

Azure Monitor has two families of data. **Metrics** are numeric, lightweight and near real time: use them for dashboards and threshold alerts; platform metrics cost nothing to collect. **Logs** are detailed records with a higher latency, billed by ingestion and retention: use them for troubleshooting, auditing and correlation.

| Need | Recommend |
| --- | --- |
| Performance, failures and dependencies of an application | Application Insights: application map, failures and performance views, live metrics |
| Check from outside that a web endpoint answers | Application Insights availability tests |
| Guest performance of virtual machines, scale sets and Arc-enabled servers | VM insights, with the Azure Monitor Agent |
| Kubernetes clusters | Container insights, managed Prometheus metrics in an Azure Monitor workspace, Grafana dashboards |
| Continuous connectivity and latency tests between endpoints, including on-premises | Network Watcher Connection Monitor |
| Which flows cross the virtual networks | Virtual network flow logs with traffic analytics |
| An Azure outage or planned maintenance that affects your services and regions | Azure Service Health |
| Whether one resource is unavailable because of the platform | Azure Resource Health |
| Recommendations on cost, security, reliability and performance | Azure Advisor |
| Correlate security events from many sources and automate the response | Microsoft Sentinel (SIEM and SOAR; its playbooks are logic apps) |
| Security posture, regulatory compliance and protection of workloads | Microsoft Defender for Cloud |

> **Exam trap.** An **Azure Monitor workspace** isn't a Log Analytics workspace. The first stores Prometheus and OpenTelemetry metrics queried with PromQL (Prometheus metrics are kept 18 months); the second stores logs and traces queried with KQL.

<!-- section: alerts-visualization | objectives: 1.1.3 -->
## Alerts and visualization

An **alert rule** detects a condition; an **action group** says who is notified (email, SMS, push, voice) and what runs (Automation runbook, function, logic app, webhook, event hub, ITSM connector); an **alert processing rule** changes fired alerts, for example to suppress notifications during a maintenance window.

| Alert type | Signal | Recommend when |
| --- | --- | --- |
| Metric | Metric values evaluated at regular intervals, against a static or dynamic threshold | The data already exists as a metric: lowest latency |
| Log search | A KQL query run on a schedule | The condition needs query logic, or the data exists only in logs |
| Activity log | A new event of the activity log | A given operation occurs: a virtual machine is deleted, a role is assigned |
| Service Health | Service issues, planned maintenance, health advisories | Teams must be told about platform events in their regions |
| Resource Health | A change of health status of a resource | A resource becomes unavailable for a platform reason |
| Smart detection | Machine learning on Application Insights telemetry | An abnormal rise of failures must be caught without setting thresholds |
| Prometheus | PromQL rules on managed Prometheus metrics | Kubernetes workloads monitored with Prometheus |

A **dynamic threshold** learns the normal pattern of a metric and suits workloads with daily or weekly cycles. One metric alert rule can cover all the resources of the same type in a region of a subscription, which avoids one rule per virtual machine. Log search alerts are billed according to their evaluation frequency: don't choose them when a metric alert does the job.

| Visualization | Recommend when |
| --- | --- |
| Azure workbooks | Interactive reports that combine many Azure data sources, including Arc-enabled resources |
| Azure dashboards | A single pane of glass in the portal that mixes Azure Monitor tiles with other Azure services |
| Azure Managed Grafana | Operational dashboards for Kubernetes, multicloud or non-Azure data sources, shared outside the portal |
| Power BI | Business reports and long-term trends for stakeholders |

<!-- section: key-points -->
## Key points

- Platform metrics (93 days) and the activity log (90 days) exist without configuration; resource logs need a diagnostic setting; guest data needs the Azure Monitor Agent and a data collection rule.
- One Log Analytics workspace by default; split for tenants, data residency, different retention of the same table or billing, not for access control.
- Analytics, Basic and Auxiliary plans trade features for cost; total retention goes up to 12 years.
- Workspace to analyze, storage account to archive, event hub to stream to an external SIEM; one destination of each type per diagnostic setting, five settings per resource.
- Azure Policy with `deployIfNotExists` deploys diagnostic settings at scale; transformations filter data at ingestion.
- Metric alerts first, log search alerts when a query is needed, activity log alerts for operations and for Service Health.
- Application Insights for applications, VM insights for machines, Connection Monitor for connectivity, Microsoft Sentinel for security events.
