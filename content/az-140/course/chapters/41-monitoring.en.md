Monitoring Azure Virtual Desktop combines two data sources in Log Analytics: the **service logs** of the Azure Virtual Desktop objects (host pools, workspaces, application groups) and the **guest data** of the session hosts (performance counters and Windows event logs). Azure Virtual Desktop Insights turns both into workbooks, and autoscale adjusts the running capacity. Questions ask which data source answers a question, which role is the minimum, and what a scaling plan does at a given time.

<!-- section: log-collection | objectives: 4.1.1 -->
## Collect logs from Azure Virtual Desktop and session hosts

| Data | Collected by | Lands in |
| --- | --- | --- |
| Connections, errors, checkpoints, feed, management activity, host registration, agent health | **Diagnostic settings** on each Azure Virtual Desktop object | `WVD*` tables (`WVDConnections`, `WVDErrors`, `WVDCheckpoints`...) |
| CPU, memory, disk, input delay, Windows event logs of the session hosts | **Azure Monitor Agent** on each session host + a **data collection rule (DCR)** | `Perf` and `Event` tables |

**Diagnostic settings.** Open the object, then *Diagnostic settings > Add diagnostic setting*, give it a name without spaces, select the categories and *Send to Log Analytics workspace* (archive to a storage account and stream to Event Hubs are the other destinations). Enable it on **every** object to monitor; data exists only from then on.

| Category | What it records |
| --- | --- |
| Management Activities | Changes to Azure Virtual Desktop objects through the APIs or PowerShell, and whether they succeeded |
| Feed | Whether users could subscribe to a workspace (download their list of apps and desktops) |
| Connections | Start and end of user connections |
| Host registration | Whether a session host registered with the service |
| Errors | Problems users met during an activity |
| Checkpoints | Steps reached during an activity, such as a RemoteApp launched |
| Agent Health Status | Health of the Azure Virtual Desktop agent on each session host |
| Network | Average network data of sessions, including estimated round-trip time |
| Connection Graphics | Performance data of the graphics stream |
| Session Host Management Activity | Management activity on session hosts |
| Autoscale | Scaling operations |

For Insights, the host pool needs Management Activities, Feed, Connections, Errors, Checkpoints, HostRegistration and AgentHealthStatus; the workspace needs Management Activities, Feed, Errors and Checkpoints. An application group offers Checkpoints, Errors and Management.

A connection reports three states: **Started** (the user selects a resource in the client), **Connected** (the session is established on the host) and **Completed** (disconnected). In `WVDErrors`, `ServiceError` = `false` means an administrator can usually fix the cause; `true` means an issue to escalate to Microsoft with the *CorrelationId*.

```kusto
// Session duration per resource for one user
let Events = WVDConnections | where UserName == "ana@contoso.com";
Events
| where State == "Connected"
| project CorrelationId, UserName, ResourceAlias, StartTime = TimeGenerated
| join (Events | where State == "Completed" | project EndTime = TimeGenerated, CorrelationId) on CorrelationId
| project Duration = EndTime - StartTime, ResourceAlias
| sort by Duration asc
```

```kusto
// How many users hit the same error
WVDErrors
| where CodeSymbolic == "ErrorSymbolicCode"
| summarize count(UserName) by CodeSymbolic
```

**Session host data.** The Log Analytics agent is retired: use the **Azure Monitor Agent** (a VM extension), which needs a **system-assigned managed identity** on the VM, and a DCR that defines the counters, the event logs and the destination workspace, associated with each session host. Microsoft recommends a **designated workspace** for session host data so that only Azure Virtual Desktop data is collected; it can differ from the workspace of the diagnostic settings. Log data appears with up to about 15 minutes of latency.

> **Exam trap.** Diagnostic settings never collect CPU or memory from the session hosts, and the Azure Monitor Agent never collects connection or feed events: a question about "why users can't see their apps" needs the **Feed** category of the **workspace**, while "which host has high input delay" needs **performance counters** through a DCR.

<!-- section: azure-monitor-insights | objectives: 4.1.2 -->
## Monitor with Azure Monitor and Azure Virtual Desktop Insights

**Azure Virtual Desktop Insights** is a set of Azure Monitor workbooks (`https://aka.ms/avdi`, or *Insights* on a host pool). Setup uses the **configuration workbook** (*Workbooks > Check Configuration*, choose subscription, resource group and host pool):

| Tab | What it deploys |
| --- | --- |
| Resource diagnostic settings | *Configure host pool* and *Configure workspace*: diagnostic settings toward the chosen workspace |
| Session host data settings | *Create data collection rule* (after choosing the workspace and the DCR resource group), then *Deploy association*, *Add extension* (Azure Monitor Agent) and *Add system managed identity*; then *Configure performance counters* and *Configure Events* for the missing items |

The automated deployment from the workbook supports up to 1,000 session hosts; beyond that, install the agent when you create the session hosts, for example with an ARM template.

**Minimum roles to view Insights:** **Desktop Virtualization Reader** on the resource group or subscription of the host pools, workspaces and session hosts, plus **Log Analytics Reader** on each workspace.

Main reports:

| Report | Shows |
| --- | --- |
| Connection Reliability | Disconnections compared with concurrent connections, by host, client, transport or gateway region |
| Connection Performance | Round-trip time (RTT) by user and gateway region; aim below 100 ms, quality drops above 200 ms |
| Host Performance | User input delay by host (aim below 100 ms), CPU, memory and disk metrics |
| Host Diagnostics | Counters per host: Available MBytes, Page Faults/sec, CPU, disk space, Input Delay per Session |
| Utilization | Session history (active, idle or disconnected) and number of active session hosts |
| Clients | Client versions in use and users with potentially outdated clients |

**Alerts.** Insights doesn't create alerts: build **log search alert rules** on the `WVD*` tables (for example a count of `WVDErrors` above a threshold) or on `Perf`, with an action group. For incidents on the Azure Virtual Desktop service itself, create a **Service Health** alert for the Azure Virtual Desktop service in your regions.

> **Exam tip.** "Give the help desk read access to Insights with least privilege" = Desktop Virtualization Reader on the Azure Virtual Desktop resources **and** Log Analytics Reader on the workspace. Neither role alone is enough.

<!-- section: customize-workbooks | objectives: 4.1.3 -->
## Customize the Insights workbooks

The Insights workbooks are Microsoft templates. To change them, open the workbook, **save a copy** as your own workbook, then select **Edit**:

| Element | Use |
| --- | --- |
| Query | A KQL query against a workspace (or a resource type), shown as a grid, chart, tiles or map |
| Metric | An Azure Monitor metric of selected resources with an aggregation |
| Parameter | A drop-down or text value (subscription, host pool, time range) reused by the queries |
| Links/tabs | Tabs that set a parameter value to show or hide groups |
| Group | Several elements loaded together, editable or from a template |

Select **Done editing** for each element, then save. The gallery (*Monitor > Workbooks*) has the tabs *Workbooks* (saved workbooks), *Public Templates* (Microsoft templates) and *My Templates* (your deployed templates).

| Action | Role |
| --- | --- |
| View a workbook | Read access to the data it queries (for example Monitoring Reader, Log Analytics Reader) |
| Save a shared workbook | **Workbooks Contributor** or **Monitoring Contributor** (`microsoft.insights/workbooks/write`) |

> **Exam trap.** A saved custom copy **doesn't receive** the updates Microsoft publishes to the Insights template. Saving favorite settings also requires a custom copy.

<!-- section: capacity-performance | objectives: 4.1.4 -->
## Optimize session host capacity and performance

Microsoft's starting points for **multi-session** sizing:

| Workload | Maximum users per vCPU | Minimum per VM | Example sizes |
| --- | --- | --- | --- |
| Light | 6 | 8 vCPUs, 16 GB RAM, 32 GB OS storage | D8s_v5, D16s_v5 |
| Medium | 4 | 8 vCPUs, 16 GB RAM, 32 GB OS storage | D8s_v5, D16s_v5 |
| Heavy | 2 | 8 vCPUs, 16 GB RAM, 32 GB OS storage | D8s_v5, D16s_v5 |
| Power | 1 | 6 vCPUs, 56 GB RAM, 340 GB OS storage | D16ds_v5, NV16as_v4 |

Plan at least 30 GB of profile storage per user. Size VMs between 4 and 24 vCPUs (stay at or below 32): two-vCPU multi-session VMs are unstable, and returns diminish above about 16 cores, so two 16-core VMs give a better experience than one 32-core VM. Validate with a pilot or load simulation and keep headroom for logon storms.

| Symptom (Insights) | Action |
| --- | --- |
| High input delay or CPU on all hosts at peak | Lower the **max session limit**, add hosts, or lower the capacity threshold of the scaling plan so hosts start earlier |
| One host saturated while others are idle | Use **breadth-first** load balancing during working hours |
| Hosts running nearly empty in the evening | **Depth-first** load balancing and autoscale to stop unused hosts |
| Memory pressure (low Available MBytes, high Page Faults/sec) | Larger memory size or fewer sessions per host |
| High RTT for one region of users | Session hosts closer to the users, RDP Shortpath (chapter 11) |

The **max session limit** of a pooled host pool caps the sessions per host and is the basis of every capacity calculation in autoscale. **Breadth-first** spreads new sessions across available hosts; **depth-first** fills one host up to the limit before using the next.

> **Exam trap.** Depth-first with the default, very high max session limit puts every user on the first host. Set a realistic max session limit whenever you use depth-first or autoscale.

<!-- section: autoscale | objectives: 4.1.5 -->
## Implement autoscale with scaling plans

A **scaling plan** starts and stops session hosts on a schedule and according to load. Prerequisites and rules:

| Rule | Detail |
| --- | --- |
| Permission | Role **Desktop Virtualization Power On Off Contributor** for the Azure Virtual Desktop service principal (or a managed identity of the host pool), at the **subscription** scope of the session hosts; a lower scope breaks autoscale |
| Assignment | One plan can serve several host pools **of the same type**; a host pool has **one** plan at most |
| Region | The plan is created in the same Azure region as the host pool object; the session hosts can be elsewhere |
| Time zone | One per plan; schedule times are read in that time zone |
| Pooled prerequisite | A custom **max session limit** on the host pool |
| Other tools | Don't combine with the Azure Automation scaling script or third-party tools on the same host pool |
| Excluded hosts | VMs with the plan's **exclusion tag** (for example `excludeFromScaling`) are never started, stopped or drained |

Each schedule has four phases: **ramp-up**, **peak**, **ramp-down**, **off-peak**.

| Setting (pooled) | Effect |
| --- | --- |
| Minimum percentage of hosts | Hosts kept running, rounded up (10 % of 7 hosts = 1 host) |
| Capacity threshold | Used capacity = sessions ÷ (available hosts × max session limit). Above the threshold, a host is started |
| Load balancing algorithm | Overrides the host pool setting during the phase: breadth-first recommended for ramp-up, depth-first for off-peak |
| Force logoff (ramp-down only) | Drains the hosts with the fewest sessions, notifies users, signs them out after the wait time, then deallocates. Without it, choose to stop hosts with no active or disconnected sessions, or with no active sessions |

Example: 2 hosts × 20 sessions = 40 sessions of capacity. With a 75 % threshold, a third host starts when sessions exceed 30. Autoscale never stops hosts during ramp-up, and it stops a host only if the remaining capacity stays under the threshold.

**Personal host pools.** For each phase: start assigned VMs, assigned and unassigned VMs, or none at the start time; **Start VM on Connect** (strongly recommended if VMs aren't started at ramp-up); and actions after a disconnection or a sign-out (0–360 minutes): **deallocate**, **hibernate** or nothing. Hibernation isn't supported with FSLogix or App attach.

**Scaling methods for pooled host pools:** **power management** autoscaling starts and stops existing hosts; **dynamic** autoscaling (preview) also creates and deletes hosts, and requires a host pool with a **session host configuration**.

To reduce used capacity, sign out disconnected sessions with the policy *Set time limit for disconnected sessions* (*Remote Desktop Session Host > Session Time Limits*) through Intune or Group Policy.

> **Exam trap.** For pooled host pools, autoscale **overwrites drain mode**: to keep a host out of service during maintenance, use the **exclusion tag**, not drain mode. And Start VM on Connect only starts a VM when a user connects; it never stops one.

<!-- section: sessions-app-groups | objectives: 4.1.6 -->
## Manage active sessions and application groups

**Drain mode** (*Host pools > Session hosts > Turn drain mode on*) blocks new sessions on a host while existing sessions continue until users sign out or an administrator ends them; administrators can still connect directly. Required role: **Desktop Virtualization Session Host Operator**.

From a session host's session list, an administrator can **send a message**, **disconnect** a session (it stays open on the host) or **log off** a user (the session ends, unsaved work is lost). The role **Desktop Virtualization User Session Operator** allows these actions without managing the host pool.

```powershell
# Drain a session host
Update-AzWvdSessionHost -ResourceGroupName rg-avd -HostPoolName hp-sales -Name sh-0.contoso.com -AllowNewSession:$false
# List the sessions of the host pool
Get-AzWvdUserSession -ResourceGroupName rg-avd -HostPoolName hp-sales
# Warn the user of session 2, then sign it out
Send-AzWvdUserSessionMessage -ResourceGroupName rg-avd -HostPoolName hp-sales -SessionHostName sh-0.contoso.com -UserSessionId 2 -MessageTitle "Maintenance" -MessageBody "Save your work: sign-out in 10 minutes."
Remove-AzWvdUserSession -ResourceGroupName rg-avd -HostPoolName hp-sales -SessionHostName sh-0.contoso.com -Id 2 -Force
```

`Disconnect-AzWvdUserSession` disconnects without signing out.

**Application groups.** Monitor their use with diagnostic settings on the application group (Checkpoints, Errors, Management): `WVDCheckpoints` records each RemoteApp a user opens, while full desktop app usage isn't tracked there; `ResourceAlias` in `WVDConnections` shows only the first resource of a connection. Assignments are managed on the application group (*Assignments*); `Register-AzWvdApplicationGroup` registers it to a workspace. A user who doesn't see an expected app: check the assignment, the workspace registration, then the **Feed** and **Errors** logs.

> **Exam tip.** Drain mode is the first step before patching a host by hand; then send a message, wait, and log off the remaining sessions. In a host pool covered by a scaling plan, also add the exclusion tag.

<!-- section: key-points -->
## Key points

- Service logs: diagnostic settings on host pools, workspaces and application groups to `WVD*` tables. Session host data: Azure Monitor Agent with managed identity + DCR.
- Insights: configuration workbook deploys both; viewing needs Desktop Virtualization Reader + Log Analytics Reader.
- Custom workbooks: save a copy, edit; copies don't receive template updates; saving needs Workbooks Contributor or Monitoring Contributor.
- Sizing: 6 / 4 / 2 / 1 users per vCPU for light / medium / heavy / power; prefer several 4–24 vCPU hosts; set a real max session limit.
- Scaling plan: Power On Off Contributor at subscription scope, one plan per host pool, same type, same region, four phases; exclusion tag, not drain mode, for maintenance.
- Sessions: drain mode, message, disconnect, log off; Session Host Operator and User Session Operator roles.
