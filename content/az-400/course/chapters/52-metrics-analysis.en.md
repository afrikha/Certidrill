Once telemetry flows, the exam asks you to read it: which metric reveals the bottleneck of a virtual machine, which Application Insights tool answers a usage or performance question, how a failed request is followed across services, and which KQL query returns the expected result. Expect screenshots of charts, partial queries to complete and "which tool should you use" questions.

<!-- section: infrastructure-indicators | objectives: 5.2.1 -->
## Infrastructure performance indicators

A virtual machine exposes two families of metrics:

| Family | Collected by | Examples | Cost and setup |
| --- | --- | --- | --- |
| Host (platform) metrics | The Azure host, without any agent | `Percentage CPU`, `Available Memory Bytes`, `Available Memory Percentage`, `Disk Read Bytes`, `OS Disk IOPS Consumed Percentage`, `Data Disk Queue Depth`, `Network In Total`, `Network Out Total`, `VmAvailabilityMetric` | Automatic and free, 1-minute grain, stored 93 days in the metrics store |
| Guest metrics | Azure Monitor Agent inside the OS, driven by a data collection rule (DCR) | Logical disk free space per volume, per-process CPU and memory, OS performance counters | Requires enhanced monitoring (VM insights); ingestion is billed beyond free defaults |

When you enable guest monitoring, you choose between two experiences:

| Experience | Stored in | Queried with | Notes |
| --- | --- | --- | --- |
| OpenTelemetry metrics (recommended for new deployments) | Azure Monitor workspace | PromQL | Default set is free: `system.cpu.time`, `system.memory.usage`, `system.disk.io`, `system.network.io`, `system.filesystem.usage`... Extra metrics such as `system.cpu.utilization` or `process.cpu.utilization` are billed |
| Logs-based metrics (classic) | Log Analytics workspace, `InsightsMetrics` table | KQL | Feeds the VM insights Performance view; namespaces `Processor`, `Memory`, `LogicalDisk`, `Network` |

The VM insights **Performance** view (Monitor > Virtual Machines, or the VM's Insights) shows, for the logs-based experience:

| Indicator | Charts | Default aggregation |
| --- | --- | --- |
| CPU | CPU Utilization % | Average and 95th percentile |
| Memory | Available Memory | Average, 5th and 10th percentile (low values are the problem) |
| Disk | Logical Disk Space Used %, Logical Disk IOPS, Logical Disk MB/s, Max Logical Disk Used % | Average and 95th percentile |
| Network | Bytes Sent Rate, Bytes Receive Rate | Average |

Across machines, **Top N Charts** shows the five worst machines per metric, **Aggregated Charts** the fleet trend, and **Top N List** a sortable table (20 machines by default, up to 500). The time range reaches 30 days. Viewing it requires Monitoring Reader on the VMs and on the VM insights DCR.

Reading the indicators:

| Observation | Likely cause | Action |
| --- | --- | --- |
| CPU 95th percentile near 100 % for long periods | CPU-bound workload | Scale up or out |
| B-series VM slows down, `CPU Credits Remaining` at 0 | Burstable credits exhausted | Move to a non-burstable size |
| Available Memory low at the 5th percentile | Memory pressure, paging | Larger size or fix a leak |
| `Data Disk IOPS Consumed Percentage` at 100 %, rising `Data Disk Queue Depth` | Disk throttled at its IOPS cap | Faster disk tier or larger disk |
| Logical Disk Space Used % near 100 % | Volume full | Extend the disk, clean logs |
| Network rates high, CPU idle | Network-bound or chatty dependency | Accelerated networking, larger size, caching |

Other resources follow the same logic: an App Service plan exposes `CPU Percentage`, `Memory Percentage`, `Disk Queue Length` and `Http Queue Length`; a storage account exposes `Transactions` (split by `ResponseType` or `ApiName`), `Availability`, `SuccessE2ELatency` and `SuccessServerLatency`. In Container insights, **Memory working set** includes cache, while **Memory RSS** shows resident memory only; Managed Prometheus visualizations are preferred over Log Analytics visualizations.

> **Exam trap.** Storage `SuccessE2ELatency` includes network time and client acknowledgment; `SuccessServerLatency` is only processing time inside Azure Storage. High end-to-end latency with low server latency points to the network or the client, not to storage.

> **Exam trap.** Host metrics can't show free space per volume or per-process usage: those need the agent (guest metrics). The VM insights network chart counts all guest TCP/IP traffic, so it differs from the VM overview chart.

<!-- section: metrics-explorer | objectives: 5.2.1, 5.2.2 -->
## Analyzing metrics with metrics explorer

Metrics explorer (Monitor > Metrics, or **Metrics** on a resource) charts any platform or Application Insights standard metric:

| Setting | What to know |
| --- | --- |
| Scope | One resource, or several of the same type, location and subscription (Monitoring Reader at subscription scope for multi-resource charts) |
| Aggregation | Sum, Count, Average, Min, Max; only the ones that apply to the metric are offered |
| Time range | Default last 24 hours; up to 30 days per chart, pan to reach the 93-day retention |
| Time granularity | Automatic by default |
| Add filter | Keep only some dimension values, for example `ResponseType = ServerBusyError` |
| Apply splitting | One line per dimension value, 10 values by default (1 to 50), descending order |
| Add metric / New chart | Same chart for the same unit, a new chart for a different unit |
| Save to dashboard | Pin to dashboard or save to a workbook |
| New alert rule | Creates a metric alert that inherits the chart's metric, filters and splitting |

> **Exam tip.** "Show the 5xx rate per instance" = filter on the result code dimension, then split by instance. Filtering narrows the data, splitting draws one series per value.

<!-- section: application-performance | objectives: 5.2.2 -->
## Application performance telemetry

Application Insights resources are workspace-based: telemetry lands in a Log Analytics workspace, and standard metrics land in the metrics store.

| Metric kind | Source | Affected by sampling | Dimensions | Typical use |
| --- | --- | --- | --- | --- |
| Standard (preaggregated) | Aggregated at runtime before sampling, 1-minute grain | No | Key dimensions only | Dashboards, metric alerts, accurate rates |
| Log-based | Kusto queries over stored telemetry | Yes | Every logged property | Ad hoc analysis by any property |
| Custom (preview) | Your code through the SDK or the OpenTelemetry API | Preaggregated instruments stay accurate | Stored with the logs; the metrics store has none unless enabled | Business indicators |

Standard metric names include `requests/count`, `requests/duration`, `requests/failed`, `dependencies/duration`, `dependencies/failed`, `exceptions/count` and `availabilityResults/availabilityPercentage`.

Sampling keeps telemetry volume down: the Microsoft OpenTelemetry Distro for .NET, Node.js and Python defaults to rate-limited sampling of five traces per second, and the sampler keeps whole traces together. Each stored row carries `itemCount` (`ItemCount` in the workspace), the number of original items it represents. Count with `sum(itemCount)`, not `count()`.

```kusto
// Request volume corrected for sampling, per hour
AppRequests
| where TimeGenerated > ago(1d)
| summarize Requests = sum(ItemCount) by bin(TimeGenerated, 1h)
| render timechart
```

The portal tools for performance:

| Tool | Answers |
| --- | --- |
| Performance view | Which operations are slowest, their duration distribution and counts; **Server / Browser** toggle for page load times (requires the JavaScript SDK) |
| Failures view | Failed operations with the top 3 response codes, exception types and failed dependencies |
| Live Metrics | Request, dependency and exception rates, CPU and memory, within one second; nothing is stored, data exists only while the pane is open |
| Release annotations | Deployment markers on Performance, Failures and Usage charts, to correlate a regression with a release |
| View in Logs | Opens the KQL behind the current view |

> **Exam trap.** A dashboard built from a log query that uses `count()` underreports traffic when sampling is on. Use a standard metric, or `sum(itemCount)` in the query.

> **Exam trap.** Live Metrics is for watching a deployment in real time. It keeps no history: to investigate yesterday's slowdown, use the Performance view or Logs.

<!-- section: usage-analysis | objectives: 5.2.2 -->
## Usage analysis

Usage tools need browser telemetry from the **Application Insights JavaScript SDK** (page views and custom events); server-side instrumentation alone isn't enough.

| Question | Tool |
| --- | --- |
| How many unique users, from which country or browser? | Users |
| How many sessions and how long? | Sessions (a session ends after more than 30 minutes of inactivity or 24 hours of continuous use) |
| How often is a page or feature used? | Events (page views and custom events) |
| What percentage completes a known ordered sequence, such as cart > payment > confirmation? | Funnels (up to six steps) |
| Where do users go after a page, where do they leave? | User Flows |
| Analyze a reusable group, such as users who used a new feature | Cohorts (defined by a KQL query, reused in Users, Sessions, Events and User Flows) |
| Do users come back? | User Retention Analysis workbook |
| Does page load time affect conversion? | User Impact Analysis workbook |
| Happiness, engagement, adoption, retention, task success | HEART workbook (requires the Click Analytics plug-in) |

Users are counted by anonymous IDs stored in a browser cookie: another browser, another device or cleared cookies create a new user. To follow the same person across devices, set the authenticated user ID (`setAuthenticatedUserContext()` in the browser, `enduser.id` on the span with OpenTelemetry). Business actions are tracked with custom events:

```text
appInsights.trackEvent({name: "CheckoutCompleted"});
```

> **Exam trap.** Funnels need an ordered sequence you already know; User Flows explore paths you don't know yet. "Starting from the home page, which pages do users visit next?" is User Flows.

<!-- section: distributed-tracing | objectives: 5.2.3 -->
## Distributed tracing

Distributed tracing follows one logical operation through every component. The data model:

| Field (classic / workspace) | Meaning |
| --- | --- |
| `operation_Id` / `OperationId` | Shared by all telemetry of the operation; equals the W3C `trace-id` |
| `id` / `Id` | Unique ID of a request or dependency (the span) |
| `operation_ParentId` / `ParentId` | ID of the immediate parent; empty for the root span |
| `cloud_RoleName` / `AppRoleName` | The component (service) name |
| `cloud_RoleInstance` / `AppRoleInstance` | The machine or instance |

Incoming calls are **requests** (`AppRequests`), outgoing calls **dependencies** (`AppDependencies`). A dependency's `Id` becomes the `ParentId` of the request it triggers in the next service. The context travels in the W3C Trace Context headers `traceparent` and `tracestate`; the legacy `Request-Id` protocol is deprecated. Use the Microsoft OpenTelemetry Distro (.NET, Node.js, Python) or the Azure Monitor OpenTelemetry Distro (Java): the .NET Classic API SDK 2.x retires on March 31, 2027. Components may send to different Application Insights resources, even in different subscriptions, and still correlate.

The tools:

| Tool | Use it to |
| --- | --- |
| Application Map | See the topology: nodes are components identified by cloud role name, connectors show calls with error rate, average duration and call count. **Intelligent view** highlights probable failure causes (sensitivity High, Medium by default, Low; up to seven days) |
| End-to-end transaction details (transaction diagnostics) | Open one sample from Performance, Failures or Search: Gantt chart of every request and dependency across components, time-sequence list, details with call stack or SQL command |
| Logs | Rebuild a trace by `OperationId` |

```kusto
// Every request and dependency of one distributed operation
union AppRequests, AppDependencies
| where OperationId == "4bf92f3577b34da6a3ce929d0e0e4736"
| project TimeGenerated, Type, AppRoleName, Name, Id, ParentId, DurationMs, Success
| order by TimeGenerated asc
```

> **Exam trap.** If every microservice appears as one node on the map, the services don't set a distinct cloud role name. With OpenTelemetry, set the resource attributes `service.name` (and optionally `service.namespace`) for the role name and `service.instance.id` for the role instance.

> **Exam tip.** In the Gantt chart, a gap not covered by any dependency is time spent in process: profile the code, not the database. A downstream service shown only as an external dependency isn't instrumented, or you lack access to its resource.

<!-- section: kql-basics | objectives: 5.2.4 -->
## Basic KQL queries

A KQL query starts from a table and pipes rows through operators, top to bottom:

| Operator | Does | Example |
| --- | --- | --- |
| `where` | Filter rows | `where TimeGenerated > ago(1h)` |
| `project` | Keep or rename columns | `project Computer, CounterValue` |
| `extend` | Add a computed column, keep the others | `extend DurationSec = DurationMs / 1000` |
| `summarize` | Aggregate by groups | `summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer` |
| `count`, `distinct` | Row count, unique values | `distinct Computer` |
| `sort by` / `order by`, `top` | Order (descending by default), first N | `top 10 by DurationMs desc` |
| `take` | Arbitrary sample rows, for previewing | `take 10` |
| `join` | Combine two tables; default kind `innerunique` | `join kind=leftouter (Heartbeat) on Computer` |
| `union` | Append tables | `union AppRequests, AppDependencies` |
| `render` | Chart; must be last | `render timechart` |

Useful functions: `ago()`, `bin()`, `avg()`, `percentile()`, `percentiles()`, `arg_max()`, `dcount()`, `countif()`.

```kusto
// CPU trend per computer from the Perf table
Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer
| render timechart
```

```kusto
// Ten machines with the least free disk space (VM insights)
InsightsMetrics
| where TimeGenerated > ago(24h)
| where Origin == "vm.azm.ms"
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| summarize P90 = percentile(Val, 90) by Computer
| top 10 by P90 asc
```

```kusto
// Machines that stopped sending a heartbeat in the last 15 minutes
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| where LastHeartbeat < ago(15m)
```

```kusto
// Failure rate and 95th percentile duration per operation
AppRequests
| where TimeGenerated > ago(1d)
| summarize Total = sum(ItemCount), Failed = sumif(ItemCount, Success == false), P95 = percentile(DurationMs, 95) by Name
| extend FailureRate = round(100.0 * Failed / Total, 2)
| top 5 by FailureRate desc
```

String operators:

| Operator | Matches | Case |
| --- | --- | --- |
| `==` / `=~` | Exact value | Sensitive / insensitive |
| `has` | A whole term, uses the term index (fast) | Insensitive (`has_cs` sensitive) |
| `contains` | Any substring, scans the column (slower) | Insensitive (`contains_cs` sensitive) |
| `startswith` | Beginning of the string | Insensitive (`startswith_cs` sensitive) |
| `in` | One of a list of values | Sensitive (`in~` insensitive) |

> **Exam trap.** `"KustoExplorerQueryRun" has "Explorer"` is false, `contains "Explorer"` is true: `has` matches whole terms only. Prefer `has` and case-sensitive operators for performance when they give the right result.

> **Exam trap.** In the Logs of an Application Insights resource, classic names apply (`requests`, `timestamp`, `duration`, `operation_Id`); in the Log Analytics workspace, use `AppRequests`, `TimeGenerated`, `DurationMs`, `OperationId`. A `summarize` without `bin()` returns one row per group, not a time series.

<!-- section: key-points -->
## Key points

- Host metrics are free and agentless; per-volume disk space and per-process data need Azure Monitor Agent (guest metrics, VM insights).
- VM insights guest metrics: OpenTelemetry metrics in an Azure Monitor workspace (PromQL), or logs-based metrics in `InsightsMetrics` (KQL).
- Metrics explorer: filter narrows, splitting draws one line per value, 30 days per chart, 93 days retention.
- Standard metrics ignore sampling; log queries must use `sum(itemCount)`.
- Live Metrics is real time and stores nothing.
- Funnels for a known sequence, User Flows for exploration, Cohorts for reusable groups; usage needs the JavaScript SDK.
- `OperationId` = trace ID, `ParentId` = parent span; Application Map nodes come from the cloud role name.
- KQL: `where`, `summarize ... by bin()`, `render` last, `has` before `contains`.
