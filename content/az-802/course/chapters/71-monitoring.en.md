Monitoring Windows Server uses two families of tools: built-in ones (Performance Monitor, data collector sets, Event Viewer, System Insights, Windows Admin Center) that work on one server or a few, and Azure Monitor (Azure Monitor Agent, data collection rules, alerts, VM insights) for Azure VMs and Azure Arc-enabled servers at scale. Exam questions describe a need ("collect only errors", "be warned before the volume is full", "send an email when CPU stays high") and ask which tool or setting meets it.

<!-- section: performance-monitor | objectives: 7.1.1 -->
## Performance Monitor

Performance Monitor (`perfmon.exe`) displays counters in real time, from the local server or remote servers, as a **line** graph, **histogram** or **report**. Counters are named `\Object(Instance)\Counter`.

| Resource | Counter | Signs of a bottleneck |
| --- | --- | --- |
| Processor | `\Processor(_Total)\% Processor Time` | Sustained high values (around 80% or more) |
| Processor | `\System\Processor Queue Length` | Consistently more than about 2 threads per core |
| Memory | `\Memory\Available MBytes` | Low and falling |
| Memory | `\Memory\Pages/sec` | Sustained high paging, often with low available memory |
| Disk | `\PhysicalDisk(*)\Avg. Disk sec/Read` and `Avg. Disk sec/Write` | High latency (tens of milliseconds) |
| Disk | `\PhysicalDisk(*)\Current Disk Queue Length` | Requests constantly waiting |
| Network | `\Network Interface(*)\Bytes Total/sec` | Close to the adapter bandwidth |

```powershell
Get-Counter -Counter "\Processor(_Total)\% Processor Time" -SampleInterval 5 -MaxSamples 12
Get-Counter -ComputerName SRV1, SRV2 -Counter "\Memory\Available MBytes"
```

To view counters of a remote server without being an administrator, a user must belong to **Performance Monitor Users** on that server; to create and run data collector sets, **Performance Log Users**.

> **Exam tip.** Read a high processor value together with the queue length and with memory: constant paging can make the disk or the processor look like the culprit when memory is the real shortage.

<!-- section: data-collector-sets | objectives: 7.1.2 -->
## Data collector sets

A **data collector set** records data over time instead of showing it live. Types of collectors:

| Collector | Records |
| --- | --- |
| Performance counter | Counter values at a sample interval, in a `.blg` file |
| Event trace data | ETW events from providers |
| System configuration information | Registry keys and their values |
| Performance counter alert | Triggers actions when a counter crosses a threshold |

- **System** sets (System Performance, System Diagnostics; Active Directory Diagnostics on DCs) are ready-made templates. **User Defined** sets are created from a template or manually.
- Properties: **schedule** (start date, days, time), **stop condition** (overall duration, maximum size, restart when a limit is reached), output folder (default under `%SystemDrive%\PerfLogs\Admin`), and the user it runs as.
- **Data Manager**: limits the space used (maximum folders, size, age) and creates reports.
- A **performance counter alert** can log an entry in the Application log, start another data collector set and run a scheduled task.

```powershell
logman create counter Baseline -c "\Processor(_Total)\% Processor Time" "\Memory\Available MBytes" -si 00:00:15 -o C:\PerfLogs\Baseline
logman start Baseline
logman query
relog C:\PerfLogs\Baseline_000001.blg -f csv -o C:\PerfLogs\Baseline.csv
```

> **Exam trap.** A counter alert alone doesn't keep any history. "Record counters for a week to build a baseline" needs a **performance counter** data collector set with a schedule and a stop condition; "act when the threshold is crossed" needs a **performance counter alert**.

<!-- section: windows-admin-center | objectives: 7.1.3 -->
## Monitor servers with Windows Admin Center

Windows Admin Center (WAC) gathers monitoring tools in the browser, for on-premises servers and, from the Azure portal, for Azure VMs and Azure Arc-enabled servers.

| WAC tool | Use |
| --- | --- |
| Overview | Current CPU, memory and network activity; restart or shut down |
| Performance Monitor | View performance counters and reports |
| Events | Browse, search, view, clear and export event logs |
| System Insights | Predictive analytics (Windows Server 2019 or later) |
| Azure Monitor | Connect the server to Azure Monitor and configure alerts |

WAC has no alerting engine of its own: alerts and email notifications are Azure Monitor alerts. From the **Azure Monitor** tool, you register WAC with Azure and onboard the server; the alert rules are then created in the Azure portal (action group with an email notification).

> **Exam trap.** "Receive an email when a server's free memory is low, using Windows Admin Center" means onboarding the server to **Azure Monitor** from WAC and creating an alert rule, not configuring the Overview or Performance Monitor tools.

<!-- section: system-insights | objectives: 7.1.4 -->
## System Insights

**System Insights** (Windows Server 2019, 2022 and 2025) runs predictive analytics **locally** on the server, with no cloud dependency. Default capabilities:

| Capability | Data | Forecasts |
| --- | --- | --- |
| CPU capacity forecasting | % Processor Time (maximum 2-hour average per day) | CPU usage |
| Networking capacity forecasting | Bytes Total/sec | Network usage per adapter |
| Total storage consumption forecasting | Sum of volume and disk sizes | Total storage use |
| Volume consumption forecasting | Volume size | Use of each volume |

Statuses: **OK** (forecast stays within capacity), **Warning** (capacity exceeded within **30 days**), **Critical** (within **7 days**), **Error**, **None** (not enough data). No prediction is made with 5 days of data or less; the full model needs three weeks of data. Each capability runs **every day at 3:00 AM** by default. Results are written to the **Microsoft-Windows-System-Insights/Admin** log (event 148 Warning, 150 Critical).

```powershell
Get-InsightsCapability
Invoke-InsightsCapability -Name "Volume consumption forecasting"
Get-InsightsCapabilityResult -Name "Volume consumption forecasting" -History
Set-InsightsCapabilitySchedule -Name "CPU capacity forecasting" -Daily -At 2:00AM
$cred = Get-Credential
Set-InsightsCapabilityAction -Name "Volume consumption forecasting" -Type Critical -Action "C:\Scripts\Extend-Volume.ps1" -ActionCredential $cred
```

> **Exam tip.** "Run a script automatically when storage is forecast to run out within a week" is a System Insights **remediation action** on the **Critical** status, run under the credentials given by `-ActionCredential`.

<!-- section: event-logs | objectives: 7.1.5 -->
## Manage event logs

**Windows Logs** are Application, Security, Setup, System and Forwarded Events; **Applications and Services Logs** hold per-component logs (some, such as Analytic and Debug logs, are hidden or disabled by default).

- **Log properties**: maximum size and retention: *Overwrite events as needed (oldest events first)*, *Archive the log when full, do not overwrite events*, or *Do not overwrite events (Clear logs manually)*.
- **Custom views**: saved filters (level, event IDs, sources, logs) across several logs; **Attach Task To This Event** runs a task when an event occurs.
- **Event subscriptions** forward events to a collector server (Forwarded Events log):

| Mode | Who connects | Configuration |
| --- | --- | --- |
| Collector initiated | The collector pulls from listed sources | Sources: WinRM enabled; collector's computer account in **Event Log Readers** |
| Source computer initiated | Sources push to the collector | GPO **Configure target Subscription Manager** pointing to the collector; scales to many sources |

On the collector, run `wecutil qc` (Windows Event Collector service); on sources, `winrm quickconfig`. To forward the **Security** log, the **Network Service** account needs read access on the sources (Event Log Readers).

```powershell
Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)}
wevtutil sl Application /ms:104857600
wevtutil epl System C:\Logs\System.evtx
```

> **Exam trap.** Source-initiated subscriptions are configured by Group Policy and don't list the sources on the collector; collector-initiated subscriptions do. "Hundreds of servers, added automatically by OU" means **source computer initiated**.

<!-- section: data-collection-rules | objectives: 7.1.6 -->
## Data collection rules for Azure Monitor

The **Azure Monitor Agent** (AMA) collects guest data from Azure VMs and Azure Arc-enabled servers (install the Connected Machine agent first). What it collects and where it sends it is defined in **data collection rules (DCRs)**, linked to machines by **DCR associations**. A machine can have several DCRs, and a DCR can have up to 10 data sources.

| Data source | Destination | Table |
| --- | --- | --- |
| Windows events | Log Analytics workspace | `Event` |
| Performance counters | Log Analytics workspace and/or Azure Monitor Metrics | `Perf` |
| Text and JSON logs | Log Analytics workspace | Custom table |
| IIS logs | Log Analytics workspace | `W3CIISLog` |

- Create in **Monitor > Data Collection Rules > Create**; the DCR must be in the **same region** as its Log Analytics workspace. Adding resources in the portal installs AMA if needed and creates the associations.
- Windows events are filtered with **XPath** queries; collecting only what you need reduces cost.
- Data arrives within about 5 minutes; AMA writes a `Heartbeat` record every minute.
- Avoid duplicates: two DCRs collecting the same events, or Security events collected by a DCR **and** Microsoft Sentinel (`Event` and `SecurityEvent`).

```text
System!*[System[(Level=1 or Level=2 or Level=3)]]
Application!*[System[(Level=1 or Level=2)]]
Security!*[System[(EventID=4624 or EventID=4625)]]
```

```powershell
# Test an XPath query locally before using it in a DCR
Get-WinEvent -LogName System -FilterXPath "*[System[(Level=1 or Level=2 or Level=3)]]"
Get-AzDataCollectionRuleAssociation -ResourceUri $vm.Id
```

> **Exam trap.** The Log Analytics agent (MMA) is retired: new collections use AMA and DCRs. A DCR in another region than the workspace can't be used, and installing the agent without associating a DCR collects nothing but the heartbeat.

<!-- section: azure-alerts | objectives: 7.1.7 -->
## Create alerts

An **alert rule** defines a scope (resources), a condition on a signal, **actions** (action groups) and details (severity **Sev0** Critical to **Sev4** Verbose).

| Alert type | Signal | State |
| --- | --- | --- |
| Metric alert | Platform or guest metrics; static or dynamic thresholds; multiple conditions | Stateful by default: resolved after three checks without the condition |
| Log search alert | KQL query on a Log Analytics workspace at a frequency | Stateful or stateless |
| Activity log alert | Control plane events, including Service Health and Resource Health | Always stateless |

- **Action groups**: email, SMS, push and voice notifications; Automation runbooks, Azure Functions, Logic Apps, webhooks, ITSM, Event Hubs. One action group serves many rules.
- **Alert processing rules**: suppress notifications during a maintenance window, or add action groups to fired alerts, by scope and schedule.
- **Recommended alert rules** can be enabled in one step from a VM's **Alerts** page.
- User states of a fired alert: **New**, **Acknowledged**, **Closed**. Alerts are kept 30 days.

```kusto
// Log search alert: servers that stopped sending a heartbeat
Heartbeat
| summarize LastHeartbeat = max(TimeGenerated) by Computer
| where LastHeartbeat < ago(10m)
```

> **Exam trap.** "Don't send notifications during Saturday's patching window" isn't solved by disabling the rules: use an **alert processing rule** that suppresses actions on a schedule. And a guest-only counter such as free disk space needs AMA data (log search alert or guest metrics), not a platform metric.

<!-- section: vm-insights | objectives: 7.1.8 -->
## Monitor VM performance with VM insights

VM insights ("enhanced monitoring" in the portal) installs AMA and collects a predefined set of guest performance data for Azure VMs, scale sets and Azure Arc-enabled servers. Two metric options:

| Option | Destination | Experience |
| --- | --- | --- |
| OpenTelemetry metrics (recommended for new deployments) | Azure Monitor workspace | New metrics experience, optional per-process metrics |
| Logs-based metrics (classic) | Log Analytics workspace, table `InsightsMetrics` | Classic **Performance** view and workbooks |

Enable it from the VM (**Monitoring > Insights** or the enhanced monitoring option), from **Monitor > Virtual Machines**, or at scale with Azure Policy, CLI, PowerShell or templates. The portal creates the DCR and the association. Machines outside Azure need the **Azure Connected Machine agent** first.

The **Performance** view compares CPU, available memory, logical disk use and IOPS, and network across machines, with top-N lists and trends, to find which VM is saturated. The classic **Map** view (processes and dependencies) also requires the **Dependency agent**.

```kusto
// Classic logs-based VM insights: free space per logical disk
InsightsMetrics
| where Namespace == "LogicalDisk" and Name == "FreeSpacePercentage"
| summarize avg(Val) by Computer, bin(TimeGenerated, 1h)
```

> **Exam tip.** Host metrics (CPU, disk and network seen from the hypervisor) are collected for every Azure VM at no cost, without any agent. Memory use and per-volume free space come only from inside the guest, which is what VM insights adds.

<!-- section: key-points -->
## Key points

- Performance Monitor shows live counters; data collector sets record them on a schedule; counter alerts act on thresholds.
- Performance Monitor Users can view remote counters; Performance Log Users can run collector sets.
- WAC alerts are Azure Monitor alerts.
- System Insights: local forecasts, Warning at 30 days, Critical at 7 days, daily at 3:00 AM, remediation scripts per status.
- Event subscriptions: source-initiated by GPO for scale; Event Log Readers and WinRM on sources.
- AMA + DCR + association; XPath filters events; DCR in the workspace's region.
- Alerts: metric, log search, activity log; action groups notify; alert processing rules suppress.
- VM insights: AMA, OpenTelemetry or logs-based (`InsightsMetrics`); Arc agent for non-Azure machines.
