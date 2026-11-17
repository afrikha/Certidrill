A SIEM is only as good as the data it receives. This chapter covers how Microsoft Sentinel collects it: service-to-service connectors for Azure resources and Microsoft Entra ID, syslog and CEF through a Linux log forwarder, Windows Security events and Windows Event Forwarding through data collection rules (DCRs) and the Azure Monitor Agent (AMA), custom tables for data no connector handles, and the Microsoft Purview audit log queried from the Defender portal. Exam questions give a source and a constraint and ask which connector, which table, which role or which step comes first.

<!-- section: azure-connectors | objectives: 4.2.4 -->
## Microsoft data connectors for Azure resources

Connectors are installed with their solution from the content hub, then configured on their connector page. They use one of three methods:

| Method | How it works | Examples |
| --- | --- | --- |
| API-based | Service-to-service connection enabled from the connector page | Microsoft Defender XDR, Defender for Cloud |
| Diagnostic settings | The resource streams its logs to the workspace; for many connectors **Azure Policy** applies the diagnostic setting to every resource of one type in a scope | Azure Activity, Microsoft Entra ID, Key Vault, Storage, Azure Firewall |
| Agent-based | The Azure Monitor Agent collects from machines through a DCR | Windows Security events, syslog, CEF |

**Azure Policy-based connectors** (Azure Activity, Azure Storage Account and others). On the connector page select **Launch Azure Policy Assignment Wizard**: on **Basics** choose the scope (subscription, optionally a resource group); on **Parameters** choose the Sentinel workspace and the log categories; on **Remediation** select **Create a remediation task**, otherwise only resources created after the assignment are configured. You need **Owner** at the policy assignment scope. A standalone diagnostic-settings connector needs read and write on the workspace. The status of a policy-based connector is green only if data arrived in the last 14 days.

| Connector | Prerequisites | Tables |
| --- | --- | --- |
| Azure Activity | Policy assignment at the subscription scope; disconnect subscriptions still on the legacy method | `AzureActivity` (free ingestion, 90 days free retention) |
| Microsoft Entra ID | Microsoft Sentinel Contributor on the workspace, **Security Administrator** on the tenant, read and write on the Microsoft Entra diagnostic settings | `SigninLogs`, `AuditLogs`, `AADNonInteractiveUserSignInLogs`, `AADServicePrincipalSignInLogs`, `AADManagedIdentitySignInLogs`, `AADProvisioningLogs`, `AADRiskyUsers`, `AADUserRiskEvents`, `MicrosoftGraphActivityLogs`... |
| Azure Key Vault | Diagnostic settings on the vaults | `AzureDiagnostics` |
| Azure Storage Account | Owner for each policy assignment scope; one policy per service (blob, queue, table, file) | `StorageBlobLogs`, `StorageQueueLogs`, `StorageTableLogs`, `StorageFileLogs` |
| Azure Firewall | Diagnostic settings | `AZFWNetworkRule`, `AZFWApplicationRule`, `AZFWDnsQuery`... or `AzureDiagnostics` |
| Subscription-based Microsoft Defender for Cloud (Legacy) | Contributor or Owner on each subscription, at least one Defender plan on it, `SecurityInsights` provider registered | `SecurityAlert` |
| Tenant-based Microsoft Defender for Cloud (Preview) | Collects Defender for Cloud alerts for the whole tenant without enabling each subscription | `SecurityAlert` |

> **Exam trap.** Sign-in logs need a **Microsoft Entra ID P1 or P2** licence; audit logs work with any licence. Risky service principal logs need Microsoft Entra Workload ID Premium. If `SigninLogs` stays empty while `AuditLogs` fills, check the licence before the connector.

For Defender for Cloud, **bi-directional sync** (Contributor or Security Admin on the subscription) closes the original alert in Defender for Cloud when the Sentinel incident that contains it is closed. When the workspace is onboarded to the Defender portal, Defender for Cloud alerts already arrive through Defender XDR and the tenant-based connector isn't listed; you still install the Defender for Cloud solution for its content. Before onboarding to the Defender portal, Microsoft advises connecting the tenant-based connector on the primary workspace and disconnecting the legacy connector from all workspaces.

<!-- section: syslog-cef | objectives: 4.2.5 -->
## Syslog and CEF collection

Appliances that can't run an agent send their logs to a **Linux log forwarder** with the AMA:

```text
Firewall / proxy --(syslog, TCP or UDP 514)--> Linux forwarder: rsyslog or syslog-ng
   --(TCP 28330, AMA 1.28.11 and later)--> Azure Monitor Agent --(HTTPS 443)--> workspace
```

| Item | Rule |
| --- | --- |
| Connectors | **Syslog via AMA** (`Syslog` table) and **Common Event Format (CEF) via AMA** (`CommonSecurityLog` table) |
| Forwarder | Linux VM with rsyslog or syslog-ng and Python 2.7 or 3; an Azure Arc Connected Machine agent if it isn't an Azure VM |
| Order | Create the DCR from the connector page (this installs the AMA), then run the installation script on the forwarder |
| DCR Collect tab | A **minimum log level** per facility: selecting `LOG_ERR` also collects `LOG_CRIT`, `LOG_ALERT` and `LOG_EMERG` |
| Roles | Virtual Machine Contributor or Azure Connected Machine Resource Administrator to deploy the agent; **Monitoring Contributor** to create or edit DCRs |
| Disk | Configure the daemon not to store unneeded logs locally: a full disk stops the AMA |

```bash
sudo wget -O Forwarder_AMA_installer.py https://raw.githubusercontent.com/Azure/Azure-Sentinel/master/DataConnectors/Syslog/Forwarder_AMA_installer.py && sudo python Forwarder_AMA_installer.py

# Send a test CEF message to the local daemon
logger -p local4.warn -P 514 -n 127.0.0.1 --rfc3164 -t CEF "0|Mock-test|MOCK|common=event-format-test|end|TRAFFIC|rt=$common=event-formatted-receive_time"
```

The script configures the daemon to listen on port 514 in TCP and UDP and restarts it. Check the result after up to 20 minutes:

```kusto
CommonSecurityLog
| where TimeGenerated > ago(1d)
| where DeviceProduct == "MOCK"
```

> **Exam trap.** If the syslog DCR and the CEF DCR collect the **same facility**, CEF messages land twice: in `CommonSecurityLog` and in `Syslog`. Fix it by sending CEF on a facility not used for syslog, or by adding an ingestion-time transformation to the syslog DCR that drops CEF messages.

```json
"transformKql": "source | where ProcessName !contains \"CEF\" and SyslogMessage !contains \"CEF:0\""
```

<!-- section: windows-events | objectives: 4.2.6 -->
## Windows Security events and Windows Event Forwarding

The **Windows Security Events via AMA** connector creates a DCR that collects the Security (and AppLocker) logs of selected machines into the `SecurityEvent` table, which most built-in analytics rules query. Machines that aren't Azure VMs (on-premises, other clouds) must have **Azure Arc** installed before you enable the connector. The DCR can be in any subscription and resource group of the same tenant.

| Event set | Content |
| --- | --- |
| All events | Every event of the Security and AppLocker logs |
| Common | A standard set for auditing, with a full user audit trail (sign-in and sign-out, group changes, Kerberos operations) |
| Minimal | A small set of events that might indicate threats (for example 4624, 4625, 4688); no full audit trail |
| Custom | XPath queries: up to 20 expressions per box, XPath 1.0 only |

XPath entries take the form `LogName!XPathQuery`. Test the filter part locally with `Get-WinEvent` before putting it in the DCR:

```text
Security!*[System[(EventID=4624 or EventID=4625 or EventID=4688 or EventID=4720)]]
```

```powershell
$XPath = '*[System[(EventID=4624 or EventID=4625)]]'
Get-WinEvent -LogName 'Security' -FilterXPath $XPath -MaxEvents 5
```

**Windows Event Forwarding (WEF).** Domain machines forward their events to a **Windows Event Collector (WEC)** server through subscriptions configured in Windows. Install the AMA on the WEC server only and use the **Windows Forwarded Events** connector. Forwarded events, including Security events, go to the **`WindowsEvent`** table, not `SecurityEvent`. Deploy the ASIM parsers for `WindowsEvent`.

| Requirement | Answer |
| --- | --- |
| Collect Security events from 300 Azure VMs with the built-in rules working unchanged | Windows Security Events via AMA, Common event set |
| Collect only logon failures and account creation | Custom event set with XPath |
| On-premises servers already forward to a WEC server, no agent allowed on them | Windows Forwarded Events connector, AMA on the WEC server |
| On-premises server sends directly | Azure Arc on the server, then Windows Security Events via AMA |
| Security log collected by a plain Azure Monitor DCR without Sentinel's connector | Lands in the `Event` table, not `SecurityEvent` |

> **Exam trap.** Built-in rules that query `SecurityEvent` don't fire on events stored only in `WindowsEvent`. After moving to WEF, either adapt the rules (or use ASIM parsers) or collect with Windows Security Events via AMA.

<!-- section: custom-tables | objectives: 4.2.7 -->
## Custom log tables

When no connector or built-in table fits, create a **DCR-based custom table** in the workspace. In the portal: workspace > **Tables** > **Create**, enter a name (the portal adds the `_CL` suffix), choose the plan (**Analytics**, **Basic** or **Auxiliary**), select or create a DCR (and a data collection endpoint if needed), upload a JSON sample, optionally write a transformation, then **Create**.

| Rule | Detail |
| --- | --- |
| Name | Ends with `_CL`; the stream in the DCR must match the table name; don't put sensitive information in it |
| `TimeGenerated` | Required; added automatically to the transformation if the sample lacks it |
| Columns | Start with a letter, 2 to 45 characters, letters, digits and underscores; custom columns added to an Azure table end with `_CF` |
| Reserved names | `id`, `TenantId`, `Type`, `Title`, `UniqueId`, `_ResourceId`, `_SubscriptionId`... |
| Permissions | `Microsoft.OperationalInsights/workspaces/*` on the workspace (Log Analytics Contributor) for the table; `Microsoft.Insights/dataCollectionRules/write` (Monitoring Contributor) for the DCR |
| Schema change | Update every DCR that sends to the table; DCRs aren't updated automatically |
| Basic and Auxiliary plans | Available for DCR-based custom tables and supported Azure tables only |

Two ways to fill a custom table:

| Source | Mechanism |
| --- | --- |
| A text log file on a Windows or Linux machine | **Custom Logs via AMA** connector (preview): the table must exist first with only `TimeGenerated` (datetime) and `RawData` (string), or `Message` when logs come through a forwarder; the DCR names the file pattern (wildcards allowed) |
| An application or script that posts JSON | **Logs Ingestion API**: a Microsoft Entra app registration with the **Monitoring Metrics Publisher** role on the DCR; stream `Custom-MyTable_CL` (`Microsoft-` prefix for built-in tables); a DCE only with private link or when the DCR has no logs ingestion endpoint |

```text
POST {endpoint}/dataCollectionRules/{dcrImmutableId}/streams/Custom-FabrikamApp_CL?api-version={apiVersion}
```

> **Exam trap.** The ingestion call fails with an authorization error although the app has Contributor on the workspace: the Logs Ingestion API checks **Monitoring Metrics Publisher on the DCR**, not workspace roles. And the target table must exist before the first call.

<!-- section: purview-audit | objectives: 4.2.10 -->
## Query Microsoft Purview Audit in Defender XDR

The unified audit log records user and admin activity in Exchange, SharePoint, OneDrive, Teams, Microsoft Entra ID and other Microsoft 365 services. In the Defender portal, select **Audit** (`https://security.microsoft.com/auditlogsearch`): the search is identical to the Audit search of the Microsoft Purview portal.

| Item | Rule |
| --- | --- |
| Prerequisite | Audit log ingestion turned on; check `UnifiedAuditLogIngestionEnabled` in **Exchange Online PowerShell** (Security & Compliance PowerShell always shows `False`) |
| Roles | **Audit Logs** or **View-Only Audit Logs** in Microsoft Purview (the same roles in Exchange Online for the cmdlets) |
| Search criteria | Date range (default last 7 days, maximum 180 days), activities by friendly name or operation name, record types, users, file, folder or site, workloads, admin units, keyword |
| Search jobs | Run in the background; up to 10 in parallel per user; kept 30 days; broad searches can take up to 48 hours |
| Export | 50,000 rows with Audit (Standard), 1,000,000 rows with Audit (Premium) |
| Latency | Core services records typically appear 60 to 90 minutes after the event |
| Retention | 180 days by default; 1 year with E5 for Microsoft Entra ID, Exchange, OneDrive and SharePoint records; 10 years with an add-on licence and an audit retention policy |
| Scripting | `Search-UnifiedAuditLog` in Exchange Online PowerShell, or the Office 365 Management Activity API |

```powershell
Connect-ExchangeOnline
Get-AdminAuditLogConfig | Format-List UnifiedAuditLogIngestionEnabled
Set-AdminAuditLogConfig -UnifiedAuditLogIngestionEnabled $true
```

In **advanced hunting**, the same Microsoft 365 activity is available as KQL tables:

| Table | Source |
| --- | --- |
| `CloudAppEvents` | Microsoft Defender for Cloud Apps: Office 365 and other connected cloud apps. Requires the Microsoft 365 app connector with **Microsoft 365 activities** selected (**Settings** > **Cloud apps** > **App connectors**) |
| `OfficeActivity` | Microsoft Sentinel connector for Microsoft 365 audit logs; queryable in advanced hunting once the workspace is onboarded to the Defender portal |

```kusto
CloudAppEvents
| where Timestamp > ago(7d)
| where ActionType == "FileDownloaded"
| summarize Downloads = count() by AccountDisplayName, IPAddress
| order by Downloads desc
```

> **Exam tip.** "Search what a user did in SharePoint last month, no SIEM" points to the **Audit** search. "Correlate Microsoft 365 activity with other signals in KQL" points to advanced hunting (`CloudAppEvents`) or to `OfficeActivity` in Sentinel. "Keep the records longer than 180 days" points to Audit (Premium) retention policies, or to Sentinel retention.

<!-- section: key-points -->
## Key points

- Azure resource connectors use diagnostic settings, often pushed by Azure Policy: Owner at the assignment scope, and a remediation task for existing resources.
- Microsoft Entra ID connector: Security Administrator on the tenant; sign-in logs need P1 or P2.
- Syslog and CEF via AMA: Linux forwarder, DCR first, then the installer script; `Syslog` and `CommonSecurityLog`; separate facilities to avoid duplicates.
- Windows Security Events via AMA writes `SecurityEvent` (All, Common, Minimal, Custom XPath); WEF through the WEC server writes `WindowsEvent`. Non-Azure machines need Azure Arc.
- Custom tables end with `_CL`, need `TimeGenerated`, and are fed by Custom Logs via AMA or the Logs Ingestion API (Monitoring Metrics Publisher on the DCR).
- Purview Audit: Audit page of the Defender portal, Audit Logs or View-Only Audit Logs role, 180 days by default; `CloudAppEvents` in advanced hunting.
