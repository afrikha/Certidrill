Azure Monitor collects the metrics and logs of every resource, stores them, lets you query them and raises alerts. The exam checks that you know which data exists without configuration, which data you must route yourself, and which alert type fits a need.

<!-- section: monitor-data | objectives: 5.1.1, 5.1.2 -->
## What Azure Monitor collects

| Data | Content | Collected | Kept |
| --- | --- | --- | --- |
| **Platform metrics** | Numeric values of a resource at regular intervals: Percentage CPU, Transactions, Availability | **Automatically**, no agent | **93 days** |
| **Activity log** | **Control plane** operations on the subscription: who created, changed, deleted, started what; service health events | Automatically | **90 days**, not configurable |
| **Resource logs** | **Data plane** operations inside a resource: reading a secret, requests to a storage account, firewall hits | **Only with a diagnostic setting** | According to the destination |
| **Guest operating system** data | Windows events, Syslog, performance counters such as memory and free disk space | Only with the **Azure Monitor Agent** and a **data collection rule** | According to the workspace |
| Microsoft Entra logs | Sign-ins and directory audit | In Microsoft Entra ID; exportable by a diagnostic setting | |

Two stores: the **metrics database** (fast, numeric, near real time) and **Log Analytics workspaces** (logs queried with KQL).

<!-- section: metrics | objectives: 5.1.1 -->
## Interpreting metrics

In **Metrics explorer** (Monitor > Metrics, or the Metrics page of a resource) a chart is defined by:

| Setting | Meaning |
| --- | --- |
| Scope | One or more resources. Several resources on one chart must have the **same type, region and subscription** |
| Metric namespace and metric | For example *Virtual Machine Host* > *Percentage CPU* |
| **Aggregation** | How the values of each interval are combined: **Avg**, **Min**, **Max**, **Sum**, **Count** |
| Time range and **time granularity** | The period displayed and the size of each interval (1 minute, 1 hour...) |
| **Filter** | Keep only some values of a dimension |
| **Split** | Draw one line per value of a dimension (per API name, per response type, per disk) |

Choosing the aggregation: **Sum** for totals (bytes sent, transactions), **Avg** for levels (CPU percentage), **Max** to see peaks that an average hides, **Count** for the number of samples. A chart covers at most 30 days at a time within the 93 days.

> **Exam trap.** Host metrics (CPU, network, disk operations) need no agent. **Memory and free disk space are guest metrics**: they require the Azure Monitor Agent and a data collection rule.

To keep metrics longer or query them with KQL, a diagnostic setting sends *AllMetrics* to a workspace (table `AzureMetrics`).

<!-- section: log-settings | objectives: 5.1.2 -->
## Configuring log settings

A **Log Analytics workspace** stores logs in tables. It belongs to a region, but it accepts data from resources of any region and subscription.

**Diagnostic settings** route the resource logs and metrics of a resource, or the activity log of a subscription:

| Destination | Use | Constraint |
| --- | --- | --- |
| **Log Analytics workspace** | Query with KQL, alert, feed insights | Any region |
| **Storage account** | Cheap long-term archive, audits | Same region as the resource (for a regional resource); not a premium account |
| **Event hub** | Stream to a SIEM or an external tool | Same region as the resource |
| Partner solution | Integrated monitoring products | |

- A diagnostic setting selects **log categories** (or category groups such as `allLogs`, `audit`) and optionally `AllMetrics`.
- One setting can hold **one destination of each type**; a resource accepts up to **five** settings.
- Each resource needs its own setting; use Azure Policy (`deployIfNotExists`) to apply them at scale.
- Activity log: *Activity log > Export activity logs* creates a diagnostic setting at the subscription level; in a workspace the events land in `AzureActivity`.

**Guest data** uses the **Azure Monitor Agent** (the old Log Analytics agent is retired):

1. Create the workspace.
2. Create a **data collection rule** (DCR): which data (Windows event logs and levels, Syslog facilities, performance counters, text logs), and where to send it. The DCR must be in the **same region as every workspace** it sends data to; for workspaces in several regions, create several DCRs.
3. **Associate** the DCR with the machines; the portal installs the agent extension automatically. A machine can have several DCRs, and a DCR many machines.

Machines outside Azure are first connected with **Azure Arc**.

**Retention** of a workspace: *interactive retention* 30 days by default (configurable up to 2 years), then optional *long-term retention*, up to 12 years in total. Retention can be set **per table**.

```bash
az monitor diagnostic-settings create --name to-law --resource <resource ID> \
  --workspace <workspace ID> --logs '[{"categoryGroup":"allLogs","enabled":true}]' \
  --metrics '[{"category":"AllMetrics","enabled":true}]'
az monitor log-analytics workspace table update -g RG1 --workspace-name law1 -n AzureActivity \
  --retention-time 90 --total-retention-time 730
```

<!-- section: kql | objectives: 5.1.3 -->
## Querying and analyzing logs

Logs are queried with the **Kusto Query Language** (KQL) in *Logs*. A query starts with a table and pipes it through operators:

```kusto
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize AvgCpu = avg(CounterValue) by Computer, bin(TimeGenerated, 5m)
| where AvgCpu > 85
| order by AvgCpu desc
```

| Operator | Role |
| --- | --- |
| `where` | Filters rows: `where Level == "Error"`, `where TimeGenerated > ago(2h)` |
| `project` | Keeps (renames, computes) only the listed columns. A column dropped here no longer exists further down |
| `extend` | Adds a computed column and keeps the others |
| `summarize ... by` | Aggregates: `count()`, `avg()`, `min()`, `max()`, `sum()`, `dcount()`; groups with `by` |
| `bin(TimeGenerated, 1h)` | Rounds timestamps to form time buckets |
| `order by` / `sort by`, `top N by`, `take N` | Sorting and limiting |
| `join`, `union` | Combine tables |
| `render timechart` | Draws the result |

Comparison: `==` is case-sensitive, `=~` isn't; `contains`, `has`, `startswith`, `in (...)`.

Tables to recognize:

| Table | Content |
| --- | --- |
| `AzureActivity` | Activity log |
| `AzureDiagnostics` or resource-specific tables (`StorageBlobLogs`, `AppServiceHTTPLogs`...) | Resource logs |
| `AzureMetrics` | Platform metrics exported |
| `Heartbeat` | One record per minute per agent: detects machines that stopped reporting |
| `Perf`, `InsightsMetrics` | Performance counters |
| `Event`, `Syslog` | Windows events, Linux Syslog |

```kusto
// Machines silent for more than 15 minutes
Heartbeat
| summarize LastSeen = max(TimeGenerated) by Computer
| where LastSeen < ago(15m)

// Who deleted resources in the last 7 days
AzureActivity
| where TimeGenerated > ago(7d) and OperationNameValue endswith "delete"
| project TimeGenerated, Caller, ResourceGroup, OperationNameValue
```

<!-- section: alerts | objectives: 5.1.4 -->
## Alert rules, action groups and alert processing rules

Three objects with distinct roles:

| Object | Role |
| --- | --- |
| **Alert rule** | Detects: a scope, a **condition** on a signal, a severity (0 critical to 4 verbose) |
| **Action group** | Reacts: who is notified and what is run. Reusable by many rules |
| **Alert processing rule** | Modifies alerts **already fired**: adds action groups or **suppresses notifications**, on a scope and a schedule |

Types of alert rules:

| Type | Signal | Example | Needs |
| --- | --- | --- | --- |
| **Metric** alert | A metric, evaluated at regular intervals | Average Percentage CPU > 85 over 5 minutes | Nothing for platform metrics |
| **Log search** alert | A KQL query run on a schedule | More than 10 errors in the Event table; free memory of the guest | Data in a workspace |
| **Activity log** alert | An event of the activity log | A virtual machine was deleted; a policy was changed | Nothing |
| Service Health / Resource Health alerts | Activity log alerts on these categories | An Azure incident in your region; a resource becomes unavailable | Nothing |

- Metric thresholds are **static** (a value) or **dynamic** (learned from the metric's history, with a sensitivity). A dynamic threshold needs history before it can fire (at least three days of data) and can't be used in a rule with several conditions.
- Metric and log alerts can be **stateful**: they fire once, then are *Resolved* when the condition clears. Activity log alerts are **stateless**: they fire at each event.
- A log search alert scoped to a workspace fires **one alert on the workspace** for the whole query result. To get **one alert per resource**, **split by dimensions**: up to six string or numeric columns of the result, for example the **Azure Resource ID** column (the alert then targets the resource) or `Computer`. Each combination is evaluated separately and fires its own alert; with *Automatically resolve alerts* each one is resolved when its own condition clears.
- An activity log can't tell you that CPU is high, and a metric alert can't tell you who deleted a resource: match the signal to the need.

**Action group** content:

| Notifications | Actions |
| --- | --- |
| Email, SMS, push to the Azure mobile app, voice call, **Email Azure Resource Manager role** (all users holding a role such as Owner on the subscription) | Automation runbook, Azure function, logic app, webhook, event hub, ITSM connector |

**Alert processing rules** are the answer to "don't notify during the maintenance window" (suppression with a one-time or recurring schedule; the alerts still fire and remain visible) and to "add this action group to every alert of this resource group, including future rules". They never create alerts.

```bash
az monitor action-group create -g RG1 -n ag-ops --short-name ops \
  --action email admin admin@contoso.com
az monitor metrics alert create -g RG1 -n cpu-high --scopes <VM resource ID> \
  --condition "avg Percentage CPU > 85" --window-size 5m --evaluation-frequency 1m \
  --severity 2 --action ag-ops
```

<!-- section: insights | objectives: 5.1.5 -->
## Azure Monitor Insights

Insights are ready-made monitoring views per resource type.

| Insight | Shows | Prerequisite |
| --- | --- | --- |
| **VM insights** | Guest performance (CPU, memory, disks, network) of machines and scale sets, and trends | Azure Monitor Agent + a data collection rule (the onboarding creates them) |
| **Storage insights** | Availability, latency, transactions, capacity of all storage accounts | **None**: built on platform metrics |
| **Network insights** | Health and metrics of all network resources, topology, access to Connection Monitor, flow logs and traffic analytics | None for the overview |
| Container insights, Application Insights | Kubernetes clusters; application performance | Enabled per cluster or application |

When you enable VM insights in the portal, **OpenTelemetry metrics** are the default and the recommended path for new deployments: they go to an Azure Monitor workspace and are queried with PromQL. The classic **logs-based metrics** go to a Log Analytics workspace (table `InsightsMetrics`). Non-Azure machines must first be connected through Azure Arc.

The **Map** feature of VM insights (processes and connections) and its **Dependency agent** are **deprecated**: new machines can't be onboarded from the portal since September 30, 2025, and both retire on June 30, 2028. Don't choose them for a new deployment.

<!-- section: network-watcher | objectives: 5.1.6 -->
## Network Watcher and Connection Monitor

Network Watcher is a regional service, enabled automatically in a region when you create a virtual network there (resource group `NetworkWatcherRG`).

| Tool | Answers |
| --- | --- |
| **IP flow verify** | Is this packet allowed or denied for this virtual machine, and by which NSG rule? |
| **NSG diagnostics** | Same, across all the NSGs on the path, for a machine, scale set or application gateway |
| **Next hop** | Where does routing send this destination? |
| Effective security rules | The combined rules on an interface |
| **Connection troubleshoot** | A one-time connectivity test from a machine to an IP address, FQDN or URI, with hops |
| **Connection Monitor** | The same kind of test run **continuously**: failed checks percentage and round-trip time, with thresholds and alerts |
| **Packet capture** | Captures packets of a machine to a storage account or local file (Network Watcher agent extension required) |
| VPN troubleshoot | Diagnoses gateways and connections |
| **Flow logs** | Records the IP flows; analyzed by **traffic analytics** in a Log Analytics workspace |
| Topology | Diagram of the resources of a network |

**Connection Monitor** structure: a connection monitor contains **test groups**; a test group combines **sources** (Azure machines or scale sets with the Network Watcher extension, or Arc-enabled on-premises machines), **destinations** (machines, IP addresses, FQDNs or URLs: no agent needed on them) and **test configurations** (protocol TCP, ICMP or HTTP, port, frequency, thresholds). Results go to Azure Monitor metrics and to a Log Analytics workspace; alerts can be created on them.

**Flow logs:** **virtual network flow logs** record the flows of a whole virtual network into a storage account. NSG flow logs are being retired (September 30, 2027) and can no longer be created.

<!-- section: key-points -->
## Key points

- Automatic: platform metrics (93 days) and activity log (90 days). On request: resource logs (diagnostic setting) and guest data (Azure Monitor Agent + DCR).
- Diagnostic setting: one destination of each type, five settings per resource; a storage destination must be in the resource's region.
- KQL: `where`, `project`, `extend`, `summarize ... by bin()`, `top`, `render`.
- Metric alert for metrics, log search alert for KQL, activity log alert for operations and service health.
- Action group = who and how; alert processing rule = suppress or add actions on fired alerts.
- VM insights needs the agent; Storage and Network insights need nothing.
- IP flow verify, Next hop, Connection troubleshoot (one-time) versus Connection Monitor (continuous); virtual network flow logs replace NSG flow logs.
