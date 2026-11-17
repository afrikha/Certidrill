Many incidents end in Microsoft 365: a compromised mailbox, an inbox forwarding rule, files downloaded from SharePoint, an app reading data through Microsoft Graph. Three tools answer three different questions. **Microsoft Purview Audit** tells who did what and when. **Content search** in Microsoft Purview eDiscovery finds the content itself (the phishing message, the leaked document) and can delete email. **Microsoft Graph activity logs** record every API request made to Microsoft Graph in the tenant. The exam gives an investigation need and asks for the tool, the role, the limit or the query.

<!-- section: purview-audit | objectives: 2.3.1 -->
## Investigating with Microsoft Purview Audit

The unified audit log records user and admin activities across Exchange Online, SharePoint, OneDrive, Microsoft Teams, Microsoft Entra ID and other services. Auditing is on by default.

| | Audit (Standard) | Audit (Premium) |
| --- | --- | --- |
| Default retention | 180 days | 1 year for Microsoft Entra ID, Exchange, OneDrive and SharePoint; 180 days for the other services |
| Audit log retention policies | Not available | Up to 1 year, or up to 10 years with the 10-Year Audit Log Retention add-on license |
| Export from a search | 50,000 rows | 1,000,000 rows |
| Office 365 Management Activity API | Baseline bandwidth | About twice the bandwidth |

Audit (Premium) also adds properties to some events, for example the sensitivity label in `MailItemsAccessed` records and extra details in Teams events. Ten-year retention isn't retroactive: it applies from the creation of the policy.

**Running a search.** In the Microsoft Purview portal, open **Audit**, fill in the criteria and run the search. The user needs the **Audit Logs** or **View-Only Audit Logs** role.

| Criterion | Use |
| --- | --- |
| Date and time range (UTC) | Last 7 days by default, **180 days** at most per search |
| Activities - friendly names / operations names | Activity groups or exact operation names, comma-separated (`New-InboxRule,Set-InboxRule`) |
| Record types, Workloads | Narrow to a service |
| Users | Blank = all users and service accounts |
| File, folder, or site | Partial name or URL, `*` as a trailing wildcard |
| Keyword Search | Indexed common-schema fields only |
| Admin Units | Restrict to administrative units |

Search limits and behavior:

- Up to **10** search jobs running in parallel per user account, and only **one** unfiltered search at a time.
- A search keeps running after the browser is closed; in a large tenant a broad search can take up to 48 hours. Completed searches are kept **30 days**.
- Events from Exchange, SharePoint, OneDrive and Teams usually appear 60 to 90 minutes after they happen; other services can take longer.
- An administrator restricted to administrative units sees only the user-generated records of the users in those units.

The same search runs in Exchange Online PowerShell, which is what the portal uses:

```powershell
Get-AdminAuditLogConfig | Format-List UnifiedAuditLogIngestionEnabled

Search-UnifiedAuditLog -StartDate 2026-11-01 -EndDate 2026-11-08 `
  -UserIds ana@contoso.com -Operations New-InboxRule,Set-InboxRule,MailItemsAccessed `
  -ResultSize 1000
```

Activities an analyst typically looks for after an account compromise:

| Question | Operations |
| --- | --- |
| Did the attacker create a forwarding or deletion rule? | `New-InboxRule`, `Set-InboxRule`, `UpdateInboxRules` |
| Which messages did the attacker read? | `MailItemsAccessed` |
| Which files were taken? | `FileAccessed`, `FileDownloaded`, `FileSyncDownloadedFull` |
| Did the attacker grant access? | `Add member to role.`, `Consent to application.` (Microsoft Entra ID), `Add-MailboxPermission` |

For bulk or continuous export to a SIEM, use the **Office 365 Management Activity API** rather than scripts around the cmdlet. In the Defender portal, the `CloudAppEvents` advanced hunting table also exposes Microsoft 365 activities when the Microsoft 365 app connector of Defender for Cloud Apps is connected.

> **Exam trap.** `UnifiedAuditLogIngestionEnabled` must be read in **Exchange Online PowerShell**: in Security & Compliance PowerShell the property always shows `False`. And a requirement such as "keep Exchange audit records for 3 years" needs an audit log retention policy plus the 10-year add-on, not a longer search range.

<!-- section: content-search | objectives: 2.3.2 -->
## Investigating with Content search in Microsoft Purview eDiscovery

Audit tells that a message was sent or a file shared; **Content search** finds the items themselves across Exchange Online mailboxes, SharePoint and OneDrive sites, Microsoft Teams, Microsoft 365 Groups and Viva Engage, then gives statistics, a sample, and export.

The classic Content search, eDiscovery (Standard) and eDiscovery (Premium) experiences were retired on August 31, 2025 (except for Microsoft 365 operated by 21Vianet). Content search now lives in **eDiscovery** in the Microsoft Purview portal: all content searches belong to a **system-generated Content Search case**, available by default to eDiscovery managers and administrators (**eDiscovery Manager** role group). Restrict who sees the searches with the **Case settings** of that case (case members).

Building a search:

1. In **eDiscovery**, open the Content Search case (or another case) and create a search.
2. Add the **data sources**: users (their mailbox and OneDrive), groups, sites.
3. Write the query with the **condition builder** or directly in **KeyQL** (Keyword Query Language).
4. Run the query to get **statistics** (estimated items and size, top locations), then review a **sample** of the results.
5. Export the results, or, in eDiscovery (Premium), add them to a **review set**.

```text
from:attacker@fabrikam.com AND subject:"Invoice overdue" AND received>=2026-11-01
participants:ana@contoso.com AND attachmentnames:payroll.xlsx
```

| Feature | eDiscovery (Standard) | eDiscovery (Premium) |
| --- | --- | --- |
| Searches with KeyQL and conditions, statistics, samples, export, holds | Yes | Yes |
| Search and delete data (email, Teams messages) | Yes | Yes |
| Review sets, tagging, analytics, OCR, KQL queries on review sets | No | Yes (E5) |

**Deleting malicious or spilled email** (search and purge) separates two permissions: searching needs the **eDiscovery Manager** role group or the **Compliance Search** role; deleting needs the **Search And Purge** role (for example through the **Organization Management** role group of Microsoft Purview, not the Exchange Online group of the same name).

```powershell
Connect-IPPSSession -EnableSearchOnlySession
$Search = New-ComplianceSearch -Name "Remove Phishing Message" -ExchangeLocation All `
  -ContentMatchQuery '(Received:11/13/2026..11/14/2026) AND (Subject:"Action required")'
Start-ComplianceSearch -Identity $Search.Identity
New-ComplianceSearchAction -SearchName "Remove Phishing Message" -Purge -PurgeType SoftDelete
Get-ComplianceSearchAction
```

| Point | Value |
| --- | --- |
| Items removed per mailbox per run (PowerShell) | 10 |
| Items removed per location per run (Microsoft Graph, Premium cases) | 100 |
| Mailboxes in a search used for a purge | 50,000 at most |
| Locations | Mailboxes and public folders only; a search that includes SharePoint or OneDrive sites fails at the purge step |
| `SoftDelete` | Items go to Recoverable Items (Deletions): the user can recover them during the deleted item retention period |
| `HardDelete` | Items go to the Purges folder: the user can't recover them |
| Mailboxes on hold | Items are kept until the hold ends |

> **Exam trap.** A user with eDiscovery Manager can find the phishing message but gets the error that the `Purge` parameter can't be found: the **Search And Purge** role is missing. And with Microsoft Defender for Office 365 Plan 2, Microsoft recommends remediating malicious email from Defender for Office 365 (Explorer) rather than search and purge.

Teams chat messages are deleted with a separate procedure, and items already in a review set are removed only by deleting the case.

<!-- section: graph-activity-logs | objectives: 2.3.3 -->
## Investigating with Microsoft Graph activity logs

Microsoft Graph activity logs are an audit trail of **every HTTP request** Microsoft Graph receives for the tenant: line-of-business apps, scripts and SDKs, Microsoft apps, and AI clients that call the Microsoft MCP Server for Enterprise (their `RequestUri` contains `/enterprise`). Use them to trace what a compromised account or app did through the API, to spot unusual call volumes, and to investigate unexpected permission grants.

Prerequisites and setup:

- A **Microsoft Entra ID P1 or P2** license for the tenant.
- **Security Administrator** is the least-privileged Microsoft Entra role that can configure the diagnostic settings.
- In the Microsoft Entra diagnostic settings, send the Microsoft Graph activity logs to a destination: a **Log Analytics workspace** (for KQL and Microsoft Sentinel), a **storage account** (long-term retention), or an **event hub** (another SIEM).

| Point | Value |
| --- | --- |
| Table in Log Analytics and Microsoft Sentinel | `MicrosoftGraphActivityLogs` |
| Latency | Usually within 30 minutes, up to 2 hours |
| Scope | Requests to the resource tenant only; a multitenant app's activity in another tenant isn't visible |
| Filtering | Not in the diagnostic setting; use a workspace transformation to drop rows or columns, or the Basic plan to lower cost |

Key columns:

| Column | Content |
| --- | --- |
| `RequestMethod`, `RequestUri`, `ResponseStatusCode` | What was called and the result (401, 403, 429...) |
| `AppId`, `ServicePrincipalId`, `UserId` | Which app, service principal or user made the call |
| `IPAddress`, `UserAgent`, `Location` | Where the call came from |
| `Roles`, `Scopes` | Application roles or delegated scopes in the token |
| `SignInActivityId` | Joins to the sign-in logs (`UniqueTokenIdentifier`) |
| `TokenIssuedAt`, `SessionId`, `DeviceId` | Token and session context |

```kusto
MicrosoftGraphActivityLogs
| where TimeGenerated > ago(7d)
| where UserId == "7f3c2a10-0000-4b8e-9c55-1d2e3f4a5b6c"
| where RequestMethod in ("POST", "PATCH", "DELETE")
| summarize Calls = count() by AppId, RequestMethod, tostring(parse_url(RequestUri).Path), IPAddress
| order by Calls desc
```

```kusto
MicrosoftGraphActivityLogs
| where TimeGenerated > ago(7d)
| join kind=leftouter (union SigninLogs, AADNonInteractiveUserSignInLogs, AADServicePrincipalSignInLogs
    | where TimeGenerated > ago(7d))
    on $left.SignInActivityId == $right.UniqueTokenIdentifier
```

The first query lists the write operations of one user by app, path and IP address; the second links each Graph request to the sign-in that issued its token.

> **Exam trap.** Two tables, two places. `MicrosoftGraphActivityLogs` is in the Log Analytics workspace (Microsoft Sentinel, after the diagnostic setting). In Defender XDR advanced hunting, the equivalent table is `GraphAPIAuditEvents`. And Graph activity logs show the API calls, not the sign-ins: those are in `SigninLogs` and the related tables.

<!-- section: key-points -->
## Key points

- Audit = who did what: 180 days by default; Audit (Premium) keeps Entra ID, Exchange, OneDrive and SharePoint records 1 year, retention policies up to 10 years with the add-on.
- Audit search: Audit Logs or View-Only Audit Logs role, 180-day range per search, 10 parallel searches, results kept 30 days, 50,000 or 1,000,000 exported rows.
- Content search = find the items; it now lives in the Content Search case of eDiscovery, with KeyQL, statistics and samples.
- Purge email: eDiscovery Manager to search, Search And Purge to delete, 10 items per mailbox, 50,000 mailboxes, mailboxes only.
- Graph activity logs: Entra ID P1 or P2, Security Administrator, diagnostic setting, `MicrosoftGraphActivityLogs` table, join on `SignInActivityId`.
