Microsoft Sentinel only detects what it ingests. Exam questions describe a data source (domain controllers, a Linux firewall appliance, Azure subscriptions, a threat feed, a custom application) and ask which connector, which agent configuration or which table you need, often with "minimize ingestion costs" or "use the built-in analytics rules unchanged" as the deciding constraint.

<!-- section: connector-selection | objectives: 1.3.1 -->
## Selecting the right data connector

Connectors are installed from the **Content hub**: install the product solution, then open the connector page under **Configuration > Data connectors**. The main families:

| Source | Connector | Destination table |
| --- | --- | --- |
| Windows Security log of servers (Azure VMs or Azure Arc-enabled servers) | Windows Security Events via AMA | `SecurityEvent` |
| Events collected on a Windows Event Collector (WEF) | Windows Forwarded Events | `WindowsEvent` |
| Linux machines, network devices that send plain Syslog | Syslog via AMA | `Syslog` |
| Firewalls, proxies and appliances that send CEF | Common Event Format (CEF) via AMA | `CommonSecurityLog` |
| Text log files written by an application on Windows or Linux | Custom Logs via AMA | A custom `_CL` table |
| Subscription-level Azure operations | Azure Activity | `AzureActivity` |
| Azure resources (Key Vault, storage, SQL...) | Service connector based on diagnostic settings | Resource log tables |
| Defender XDR incidents, alerts and raw events | Microsoft Defender XDR | Incidents, alerts and the advanced hunting tables |
| STIX/TAXII feeds, Microsoft threat intelligence | Threat Intelligence - TAXII, Microsoft Defender Threat Intelligence | `ThreatIntelIndicators`, `ThreatIntelObjects` |
| An application that pushes JSON over HTTPS | Logs Ingestion API (no connector page needed) | A custom `_CL` table or a supported Azure table |

Every AMA-based connector needs outbound port 443 from the machine running the agent to Microsoft Sentinel, and any machine that isn't an Azure VM must be onboarded to **Azure Arc** first: physical servers, on-premises VMs and VMs in other clouds.

> **Exam trap.** Choosing a connector also chooses a table. Many built-in Windows analytics rules, including near-real-time rules, query `SecurityEvent`. Events forwarded through WEF land in `WindowsEvent`, so those rules don't match them unless you adapt the queries or use ASIM parsers.

In the Defender portal, alerts of the Microsoft security products arrive through the Microsoft Defender XDR connector, in the primary workspace only.

<!-- section: windows-security-ama | objectives: 1.3.2 -->
## Windows Security Events via AMA and data collection rules

The Azure Monitor Agent (AMA) receives its instructions from **data collection rules (DCRs)**: which machines, which events, which destination. A DCR is independent of the workspace and of the machine, so one rule can be reused across many servers.

Configuration from the connector page:

1. **Configuration > Data connectors > Windows Security Events via AMA > Open connector page > +Add data collection rule**.
2. **Basics**: rule name, subscription, resource group.
3. **Resources**: add Azure VMs and Azure Arc-enabled servers. AMA is installed on the selected machines that don't have it.
4. **Collect**: choose the event set.
5. **Review + create**.

Prerequisite permission: read and write on the Sentinel workspace.

| Event set | Content | When to choose it |
| --- | --- | --- |
| All Security Events | Every event of the Security and AppLocker logs | Full visibility, highest cost |
| Common | A full user audit trail: sign-in and sign-out (4624, 4634), group changes, key Kerberos operations on domain controllers | Standard auditing at a manageable volume |
| Minimal | A small set that might indicate a threat: 4624, 4625, 4688, 1102, account and group changes. No full audit trail | Lowest volume of the predefined sets |
| Custom | Events matched by XPath queries | Exactly the event IDs you need |

Filtering happens **at the source**: events excluded by the DCR are never sent, which is how you reduce ingestion costs. XPath rules: AMA supports XPath 1.0 only, up to 20 expressions per box and up to 100 boxes per rule; `contains` and `starts-with` aren't supported. Each entry has the form `LogName!XPath`:

```text
Security!*[System[(EventID=4624 or EventID=4625 or EventID=4688)]]
Security!*[System[(EventID=4648)]] and *[EventData[Data[@Name='ProcessName']='C:\Windows\System32\consent.exe']]
```

Test the XPath part locally before adding it to the DCR:

```powershell
$XPath = '*[System[(EventID=4625)]]'
Get-WinEvent -LogName 'Security' -FilterXPath $XPath -MaxEvents 5
```

> **Exam trap.** A generic Azure Monitor DCR with the **Windows Event Logs** data source sends Security events to the `Event` table. Only the Sentinel connector Windows Security Events via AMA sends them to `SecurityEvent`, where the Sentinel content expects them.

```kusto
SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID == 4625
| summarize FailedLogons = count() by TargetAccount, Computer
| where FailedLogons > 20
```

<!-- section: windows-event-forwarding | objectives: 1.3.3 -->
## Planning Windows Event Forwarding

Windows Event Forwarding (WEF) sends events from many Windows machines to a **Windows Event Collector (WEC)** server. Sentinel then collects the collector's Forwarded Events log with AMA, so you install one agent instead of one per source. Typical reasons: thousands of workstations, machines that can't get an agent, or an existing WEF infrastructure.

| Decision | Options |
| --- | --- |
| Subscription type | **Source-initiated (push)**: clients configured by Group Policy, simplest and most scalable. **Collector-initiated (pull)**: the WEC lists the clients, for a small set of closely monitored machines |
| Scope | **Baseline** subscription for all devices, low volume; **suspect** (targeted) subscription for devices under investigation, with "read existing events" set to true |
| Authentication | Kerberos inside the domain (encrypted, mutual authentication); HTTPS with certificates when Kerberos isn't possible |
| Capacity | Plan about 3,000 events per second on average per WEC server; disk I/O, open TCP connections and registry size are the limits. Publish several WEC URIs for high availability |

Minimum client configuration by Group Policy:

1. Configure the collector URI (the subscription manager).
2. Start the WinRM service.
3. Add the **Network Service** account to the built-in **Event Log Readers** group, so the forwarding client can read secured channels such as Security.

On the Sentinel side:

1. Install AMA on the WEC server (Azure Arc first if it isn't an Azure VM).
2. Install the Windows Forwarded Events solution, open the **Windows Forwarded Events** connector and create a DCR that targets the WEC server.
3. Install the ASIM parsers for `WindowsEvent` to normalize the data.

```kusto
WindowsEvent
| where TimeGenerated > ago(1d)
| where Channel == "Security" and EventID == 4625
| extend TargetUserName = tostring(EventData.TargetUserName)
| summarize Failures = count() by TargetUserName, Computer
```

> **Exam tip.** "Collect security events from domain controllers and keep using the built-in Windows analytics rules" points to Windows Security Events via AMA on each domain controller. "Collect events from 5,000 workstations without deploying an agent on each" points to WEF plus the Windows Forwarded Events connector, with rules adapted to `WindowsEvent`.

<!-- section: syslog-cef | objectives: 1.3.4 -->
## Syslog via AMA and CEF via AMA

Both connectors rely on a **log forwarder**: a dedicated Linux machine (Azure VM, or any machine with the Azure Arc Connected Machine agent) running `rsyslog` or `syslog-ng` and AMA. Devices send to the forwarder on port 514 (TCP or UDP); the daemon passes messages to AMA (TCP port 28330 for AMA 1.28.11 and later); AMA sends them to the workspace.

| | Syslog via AMA | CEF via AMA |
| --- | --- | --- |
| Format | RFC 3164 or RFC 5424 Syslog | Syslog message with a `CEF:0` header: vendor, product, version, event class, severity, then extensions |
| Table | `Syslog` | `CommonSecurityLog` (parsed vendor, product, IP, action fields) |
| Typical source | Linux servers, generic appliances | Firewalls and security appliances (Palo Alto, Check Point, Cisco ASA...) |

Deployment order:

1. Install the **Syslog** or **Common Event Format** solution from the Content hub.
2. Create the DCR from the connector page: select the forwarder, then the **minimum log level for each facility** (choosing `LOG_ERR` also collects `LOG_CRIT`, `LOG_ALERT` and `LOG_EMERG`). AMA is installed automatically. The Logs Ingestion API alternative allows finer level filtering but requires installing AMA manually first.
3. Run the installation script on the forwarder: it configures the daemon, opens port 514 for TCP and UDP and restarts the daemon.
4. Point the devices to the forwarder.

```bash
sudo wget -O Forwarder_AMA_installer.py https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/DataConnectors/Syslog/Forwarder_AMA_installer.py&&sudo python Forwarder_AMA_installer.py
```

Required roles: Virtual Machine Contributor or Azure Connected Machine Resource Administrator to deploy the agent, Monitoring Contributor to create the DCR, and a role with `Microsoft.Resources/deployments/*`.

> **Exam trap.** If Syslog and CEF use the same facility, messages are ingested twice, in `Syslog` and in `CommonSecurityLog`. Send CEF on facilities that the Syslog DCR doesn't collect, or add a transformation to the Syslog DCR that drops CEF messages.

```kusto
CommonSecurityLog
| where TimeGenerated > ago(1d)
| where DeviceVendor == "Cisco" and DeviceProduct == "ASA"
| summarize Events = count() by Activity, DeviceAction
```

Planning points: scale out with forwarders in a Virtual Machine Scale Set behind a round-robin load balancer; configure TLS in the daemon if devices use it; don't store unneeded logs locally, because a full disk stops AMA. `TimeGenerated` is the forwarder's processing time, not the device's `EventTime`.

<!-- section: azure-activity-diagnostics | objectives: 1.3.5 -->
## Azure activity logs, Azure Policy and diagnostic settings

Azure resources send logs through **diagnostic settings**. Sentinel offers two procedures:

| Procedure | How | Covers |
| --- | --- | --- |
| Standalone | From the resource: **Diagnostic settings > + Add diagnostic setting**, select the categories, **Send to Log Analytics workspace** | One resource at a time |
| Azure Policy-managed | Connector page > **Launch Azure Policy Assignment wizard**: scope, parameters (workspace, log types set to True), remediation | Every resource of the scope, including future ones |

In the policy wizard, the assignment applies to resources created **after** assignment. To configure existing resources, select **Create a remediation task** on the **Remediation** tab. You need the **Owner** role at the policy assignment scope, plus read and write permissions on the workspace.

> **Exam trap.** "Make sure that all existing and future key vaults of the subscription send their logs" requires both the policy assignment and a remediation task. Without the remediation task, only new key vaults are configured.

The **Azure Activity** connector collects subscription-level events (Resource Manager operations, service health, write operations) into `AzureActivity` through diagnostic settings; DCR transformations aren't supported for this table. If the legacy connection method is still in use, select **Disconnect All** on the connector page before configuring the new one. The activity log itself keeps 90 days; there is no ingestion charge for activity logs sent to a workspace.

```kusto
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue =~ "MICROSOFT.AUTHORIZATION/ROLEASSIGNMENTS/WRITE"
| where ActivityStatusValue =~ "Success"
| project TimeGenerated, Caller, CallerIpAddress, ResourceGroup, _ResourceId
```

<!-- section: threat-indicators | objectives: 1.3.6 -->
## Ingesting threat indicators

All threat intelligence lands in **`ThreatIntelIndicators`** (indicators) and **`ThreatIntelObjects`** (threat actors, attack patterns, identities, relationships). The legacy `ThreatIntelligenceIndicator` table stopped receiving data after July 31, 2025: rules and workbooks must query the new tables.

| Method | Use it when | Notes |
| --- | --- | --- |
| Microsoft Defender Threat Intelligence connector | You want Microsoft's indicators | Standard: public indicators and OSINT; premium: Microsoft indicators and enriched OSINT |
| Threat Intelligence - TAXII connector | A provider exposes a TAXII 2.0 or 2.1 server | Needs the API root and the collection ID |
| Threat Intelligence Upload API | A threat intelligence platform or script pushes STIX objects | No connector; the Microsoft Entra app needs **Microsoft Sentinel Contributor** on the workspace |
| Manual creation in the UI | An analyst adds a few indicators | Defender portal: **Threat intelligence > Intel management** |
| Threat Intelligence Platforms connector | Legacy only | Being deprecated; indicators only, through the Graph tiIndicators API |

**Ingestion rules** act on data coming from connectors only (not on the upload API or manual entries): update attributes (for example extend **Valid until** by 30 days for a trusted feed) or **Delete** objects before ingestion, such as low-confidence indicators. Rules run in order and take up to 15 minutes to apply.

```kusto
ThreatIntelIndicators
| where TimeGenerated > ago(30d)
| summarize Indicators = dcount(Id) by SourceSystem
```

> **Exam tip.** Ingesting indicators doesn't detect anything by itself. Enable the **Microsoft Defender Threat Intelligence Analytics** rule or the threat intelligence matching rule templates (domain, email, file hash, IP, URL) to compare them with your logs.

<!-- section: custom-tables | objectives: 1.3.7 -->
## Creating custom log tables

When no connector writes to a standard table, create a **DCR-based custom table**. Its name ends with `_CL`; the portal adds the suffix, other methods require you to add it, and the stream name in the DCR must match the table name exactly.

Portal steps in the Log Analytics workspace: **Tables > Create** (new custom log), name, **table plan**, an existing or new DCR, a data collection endpoint if required, a **JSON sample** of the data, an optional **transformation** (a KQL query on each record), then **Create**.

| Plan | Use for |
| --- | --- |
| Analytics | Default; data used by analytics rules, hunting and workbooks |
| Basic | High-volume data queried less often, at lower cost |
| Auxiliary / Lake | Low-cost storage for verbose data; `TimeGenerated` must be ISO 8601 with microseconds |

Rules to remember:

- `TimeGenerated` is required on every table; if the source has no such column, the transformation must create it.
- Custom column names: 2 to 45 characters, start with a letter, no spaces or punctuation, and the suffix `_CF` when added to an Azure (standard) table. Reserved names such as `TenantId`, `Type` or `_ResourceId` are refused.
- After a schema change, update the DCRs yourself: Azure Monitor doesn't.
- Permissions: `Microsoft.OperationalInsights/workspaces/*` to manage the table (Log Analytics Contributor) and `Microsoft.Insights/dataCollectionRules/write` to create the DCR (Monitoring Contributor).

Data reaches the table through **Custom Logs via AMA** (text files on a server) or the **Logs Ingestion API**. For the API: register a Microsoft Entra app, create the table first, create the DCR, then assign the app the **Monitoring Metrics Publisher** role on the DCR. A data collection endpoint is needed only with private link or when the DCR has no logs ingestion endpoint. The API requires TLS 1.2 or later.

```kusto
// DCR transformation: build TimeGenerated and keep only useful columns
source
| extend TimeGenerated = todatetime(EventTime)
| project TimeGenerated, UserName, SourceIP, Action
```

> **Exam trap.** The HTTP Data Collector API is being deprecated in favor of the Logs Ingestion API. A new integration must use the Logs Ingestion API with a DCR, not a workspace key.

<!-- section: key-points -->
## Key points

- Connector = table: `SecurityEvent` (AMA), `WindowsEvent` (WEF), `Syslog`, `CommonSecurityLog` (CEF), `AzureActivity`, `_CL` custom tables.
- Non-Azure machines need Azure Arc before any AMA-based connector; DCRs filter at the source to cut costs.
- Event sets: All, Common (full audit trail), Minimal (threat-oriented, no audit trail), Custom (XPath 1.0, 20 expressions per box).
- WEF centralizes collection on a WEC server; Network Service in Event Log Readers; built-in rules on `SecurityEvent` don't see `WindowsEvent` data.
- Syslog and CEF through one Linux forwarder; separate the facilities to avoid duplicates.
- Azure Policy assignment plus remediation task for existing resources; Owner at the assignment scope.
- Threat intelligence goes to `ThreatIntelIndicators` and `ThreatIntelObjects`; upload API needs Microsoft Sentinel Contributor; ingestion rules apply to connectors only.
- Custom tables: `_CL`, `TimeGenerated`, plan chosen at creation; Logs Ingestion API app needs Monitoring Metrics Publisher on the DCR.
