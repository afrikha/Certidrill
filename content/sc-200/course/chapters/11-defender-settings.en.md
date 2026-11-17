Before a SOC can respond, the Defender portal must be configured: who is told about incidents and response actions, which alerts are noise, how alerts are grouped into incidents, which Defender for Endpoint features are on for the whole tenant, which rules and indicators apply to devices, what extra endpoint telemetry is collected and which attack surface reduction (ASR) rules block attacker techniques. Most of these settings live under **Settings** in the Microsoft Defender portal (security.microsoft.com); the exam asks which page to open and which option to select.

<!-- section: email-notifications | objectives: 1.1.1 -->
## Email notifications for incidents, actions and threat analytics

All three kinds of notification rules are under **Settings > Microsoft Defender XDR > General > Email notifications**, one tab each:

| Tab | Notifies about | Main settings |
| --- | --- | --- |
| Incidents | New incidents | Alert severity, service and detection sources, device group scope, **Send only one notification per incident**, include organization name, include tenant-specific portal link |
| Actions | Manual or automated response actions | Action source (manual, automated or both), the actions to watch, device group scope, action status (completed, failed or both) |
| Threat analytics | New or updated threat analytics reports | All reports, or only reports of a given type or tag (for example Ransomware) |

Each rule is a short wizard: name and description, notification settings, recipients (one or more email addresses, with **Send test email**), review, create. Deleting a rule is permanent.

| Permission | Rule |
| --- | --- |
| Configure notification rules | **Manage security settings** permission; with basic permissions, Security Administrator or higher |
| With RBAC and device groups | You create, edit, delete and receive notifications only for the device groups you're allowed to manage |

Points the exam likes:

- An incident notification contains the incident name, severity and categories, with a link to the incident. A recipient added later is notified only about incidents that arrive after being added.
- You can set severities per source: for example Medium and High for endpoint detections, all severities for another source.
- The **Actions** tab covers automated investigation and automatic attack disruption actions when **automated** is selected. It doesn't support custom detections that contain response actions.
- Deleting a device group removes it from the notification rules that use it; a rule whose only group was deleted is deleted too.

> **Exam trap.** The requirement "alert the SOC lead only when a device of the Finance group is isolated" is an **Actions** notification rule (action: isolate device, scope: the Finance device group), not an incident notification rule.

<!-- section: alert-tuning | objectives: 1.1.2 -->
## Alert tuning, suppression and correlation

**Alert tuning** (formerly alert suppression) handles alerts you know are benign. Create a rule in **Settings > Microsoft Defender XDR > Alert tuning > Add new rule**, or directly from an alert's page.

| Rule element | Values |
| --- | --- |
| Service sources | The Defender services (and, in preview, detection sources) the rule applies to; only services you have permissions on are listed |
| Conditions | Alert triggers (IOCs) such as file, process, scheduled task, AMSI script or WMI event, combined with **AND**, **OR** and grouping; up to 200 conditions; values not case sensitive, some support wildcards |
| Action | **Hide alert**, **Resolve alert** or **Set as behavior** |

| Action | Effect | Limits |
| --- | --- | --- |
| Hide alert | The alert is suppressed and no incident is created; it stays in `AlertInfo` and `AlertEvidence` | Defender for Endpoint alerts only |
| Resolve alert | Matching alerts and their incidents are created already resolved | |
| Set as behavior | Signals become behaviors, visible in `BehaviorInfo` and `BehaviorEntities` for hunting, never in the alert queue | Not for Defender for Cloud or Defender for Office 365 alerts |

Defender also ships **built-in tuning rules** for common benign activity. They don't affect automated investigations or email notifications, and an alert they suppressed is reactivated if an investigation finds malicious activity. You disable one from its details pane. Built-in rules don't apply to custom detection and custom threat intelligence alerts.

**Correlation.** Defender XDR groups related alerts into incidents with its own correlation logic, and merges incidents that share entities, artifacts, time frames or an attack sequence. The source incident is closed with a `Redirected` tag and its alerts, tags and entities move to the target. Incidents are **not** merged when:

- one of them is closed;
- they are assigned to two different people;
- they have different classifications or determinations;
- the merge would exceed the maximum number of entities;
- they contain devices of different device groups, a condition that is off by default.

You can merge up to five incidents manually, or move an alert to another incident. Only the **primary** Microsoft Sentinel workspace has its alerts correlated with Defender XDR alerts; secondary workspaces are correlated separately.

> **Exam trap.** Tuning and suppression act on **alerts at creation** in Defender XDR. A Sentinel automation rule that closes incidents acts **after** the incident exists. When the question says "the alert must not create an incident", the answer is an alert tuning rule.

<!-- section: advanced-features | objectives: 1.1.3 -->
## Defender for Endpoint advanced features

**Settings > Endpoints > General > Advanced features** holds tenant-wide switches. Turn a feature on or off, then **Save preferences**.

| Requirement | Advanced feature |
| --- | --- |
| Block malicious artifacts even when another antivirus is primary | **Enable EDR in block mode** (works with Defender Antivirus in passive mode) |
| Block a file hash from the file page | **Allow or block file** (needs Defender Antivirus active and cloud-based protection) |
| Create IP, domain or URL indicators | **Custom network indicators** |
| Prevent apps and users from changing Defender Antivirus security settings | **Tamper protection** |
| Close alerts when no threat is found or the threat was remediated | **Automatically resolve alerts** (alerts set manually to In progress or Resolved aren't overwritten) |
| Run commands on a device remotely | **Live response**, and separately **Live response for servers** |
| Run unsigned scripts in live response | **Live response unsigned script execution** |
| Find unmanaged devices on the network | **Device discovery** |
| Download a quarantined file for analysis | **Download quarantined files** (on by default) |
| Device risk-based Conditional Access | **Microsoft Intune connection** (also enabled in Intune) |
| Send endpoint signals to Defender for Cloud Apps | **Microsoft Defender for Cloud Apps** |
| Block websites by category | **Web content filtering**, then a web content filtering policy |
| Local SOCs see incidents only for their device groups | **Restrict correlation to within scoped device groups** (applies to future correlations; not recommended unless needed) |
| Prevent spoofed telemetry | **Enable authenticated telemetry** |

> **Exam trap.** Live response needs two things: the **Live response** advanced feature (plus **Live response for servers** for servers) and a role with live response permissions. A Defender for Endpoint role alone doesn't enable it.

<!-- section: rules-settings | objectives: 1.1.4 -->
## Rules settings in Defender for Endpoint

The **Settings > Endpoints > Rules** section groups the rules that apply to devices:

| Page | Purpose |
| --- | --- |
| Indicators | Allow, audit, warn or block files, certificates, IP addresses, URLs and domains |
| Web content filtering | Policies that block website categories for device groups |
| Automation uploads | Content analysis: file extensions sent to the cloud for inspection during automated investigation |
| Automation folder exclusions | Folders that automated investigation skips |
| Asset rule management | Rules that apply **dynamic tags** to devices |
| Custom data collection | Extra telemetry rules, see the next section |

**Indicators.** Up to 15,000 per tenant. Each has an action, an expiration and a scope (all devices or device groups).

| Indicator type | Actions |
| --- | --- |
| File hash | Allow, Audit, Warn, Block execution, Block and remediate |
| IP address, URL or domain | Allow, Audit, Warn, Block execution |
| Certificate (.cer or .pem) | Allow, Block and remediate |

Rules to remember:

- File indicators need Defender Antivirus in **active** mode, cloud-based protection and the **Allow or block file** advanced feature. On Windows, they apply to PE files (.exe, .dll). Indicators aren't supported in passive mode.
- IP and URL indicators rely on network protection. A domain indicator also covers its subdomains; HTTPS paths are matched only in Microsoft Edge. IP ranges and wildcards aren't supported.
- With conflicting file indicators, the longer hash wins (SHA-256, then SHA-1, then MD5), and a device group indicator beats an all-devices indicator.
- **Allow** creates no alert, **Audit** creates an alert with your severity, **Block** and **Warn** create informational alerts only.
- Microsoft-signed files can't be blocked, and file indicators don't override Defender Antivirus exclusions.
- An enforcement usually takes effect within 15 to 30 minutes, up to 2 hours.

**Automation folder exclusions** apply to every onboarded device and only to automated investigation: the excluded files are still scanned by the antivirus. Fields: folder (required, subfolders included, trailing wildcard allowed), extensions, file names, description (required).

> **Exam trap.** To stop automated investigation from acting on a build folder, use an **automation folder exclusion**. A Defender Antivirus exclusion would also stop scanning, which the requirement rarely allows.

<!-- section: custom-data-collection | objectives: 1.1.5 -->
## Custom data collection

Default Defender for Endpoint telemetry is filtered. **Custom data collection** adds rules that collect extra endpoint events with your own filters and sends them to the **Microsoft Sentinel workspace**, alongside the default telemetry (it doesn't replace it).

| Item | Rule |
| --- | --- |
| Where | **Settings > Endpoints > Rules > Custom Data Collection** |
| License | Defender for Endpoint Plan 2; Sentinel ingestion is billed as usual |
| Workspace | A connected Sentinel workspace, selected on the **Workspace scope** page; one workspace per tenant |
| Targeting | All devices, or devices with **dynamic tags** from Asset rule management (manual tags not supported) |
| Supported systems | Windows 10 and 11 (Windows 10 with ESU), Windows Server 2019 and later |
| Limit | 75,000 events per rule per device in a rolling 24 hours; the rule then stops on that device until the window resets |
| Deployment | Usually 20 minutes to 1 hour after creation or edit |

Rule wizard: general information (name, description), then **Table**, **Action** and **Conditions**, then rule scope, then **Submit**. The data lands in five tables:

| Table | Events |
| --- | --- |
| `DeviceCustomProcessEvents` | Process creation and termination |
| `DeviceCustomFileEvents` | File creation, modification, deletion, access |
| `DeviceCustomNetworkEvents` | Network connections |
| `DeviceCustomImageLoadEvents` | DLL and image loads |
| `DeviceCustomScriptEvents` | Script execution |

```kusto
search in (DeviceCustomFileEvents, DeviceCustomNetworkEvents, DeviceCustomProcessEvents) "a1b2c3d4e5"
| where DeviceId == "a1b2c3d4e5"
| summarize EventCount = count() by RuleName, $table
```

> **Exam trap.** Disabling a rule stops collection at the next agent check-in; deleting it is permanent, but data already in Sentinel stays. A rule that collects every event of a table quickly reaches the 75,000-event limit: filter it and pilot it on a small tagged group.

<!-- section: asr-rules | objectives: 1.1.6 -->
## Security policies and attack surface reduction rules

ASR rules block behaviors that malware abuses: Office apps creating child processes, scripts launching downloads, credential theft from LSASS. Each rule has a GUID and a mode:

| Mode | Value | PowerShell |
| --- | --- | --- |
| Off | 0 | `Disabled` |
| Block | 1 | `Enabled` |
| Audit | 2 | `AuditMode` |
| Not configured | 5 | `NotConfigured` |
| Warn | 6 | `Warn` |

Rules seen in exam scenarios:

| Rule | Note |
| --- | --- |
| Block credential stealing from the Windows local security authority subsystem | Standard protection rule; no Warn mode; not applicable when LSA protection is on |
| Block abuse of exploited vulnerable signed drivers | Standard protection rule |
| Block persistence through WMI event subscription | Standard protection rule |
| Block all Office applications from creating child processes | |
| Block Office applications from injecting code into other processes | No Warn mode |
| Block executable content from email client and webmail | |
| Block process creations originating from PSExec and WMI commands | |
| Block executable files from running unless they meet a prevalence, age, or trusted list criterion | Needs cloud-delivered protection |
| Use advanced protection against ransomware | Needs cloud-delivered protection |
| Block untrusted and unsigned processes that run from USB | |

Ways to deploy them:

| Method | How |
| --- | --- |
| Defender portal | **Endpoint security policies**, Windows policies tab, **Attack surface reduction rules** template |
| Intune | Endpoint security > Attack surface reduction policy, assigned to device groups (not user groups) |
| Group Policy | Microsoft Defender Exploit Guard > Attack Surface Reduction > **Configure Attack Surface Reduction rules**: GUID as value name, mode as value |
| PowerShell | `Add-MpPreference` or `Set-MpPreference` |

```powershell
# Block Office child processes, audit PSExec and WMI process creation
Add-MpPreference -AttackSurfaceReductionRules_Ids d4f940ab-401b-4efc-aadc-ad5f3c50688a,d1e49aac-8f56-4280-b9ba-993a6d77406c -AttackSurfaceReductionRules_Actions Enabled,AuditMode

# Exclusion for every ASR rule
Add-MpPreference -AttackSurfaceReductionOnlyExclusions "C:\Tools\Packager\pack.exe"
```

`Set-MpPreference` replaces the whole list of rules; `Add-MpPreference` adds to it. Local settings have the lowest precedence. Group Policy wins over MDM unless `MDMWinsOverGP` is set to 1.

Exclusions are either **global** (`AttackSurfaceReductionOnlyExclusions`, all rules) or **per rule** (the ASR only per rule exclusions section in Intune and the Defender portal). Several rules have limited exclusion support, including the LSASS rule.

> **Exam trap.** Deploy new ASR rules in **Audit** mode first and review the events in advanced hunting (`DeviceEvents` with an `ActionType` that starts with `Asr`) before switching to Block. Warn lets the user bypass the block; it isn't a safer form of Audit.

<!-- section: key-points -->
## Key points

- Email notifications: Settings > Microsoft Defender XDR > Email notifications, with Incidents, Actions and Threat analytics tabs; scoped by device group with RBAC.
- Alert tuning hides, resolves or turns alerts into behaviors before they create incidents; Hide alert is for Defender for Endpoint alerts only.
- Incidents don't merge when closed, assigned to different people or differently classified.
- Advanced features are tenant-wide switches: live response, EDR in block mode, allow or block file, custom network indicators, tamper protection.
- Indicators: 15,000 per tenant, scoped to device groups, file indicators need active Defender Antivirus and cloud protection.
- Automation folder exclusions affect automated investigation only, not antivirus scanning.
- Custom data collection sends `DeviceCustom*Events` to the Sentinel workspace, targets dynamic tags, 75,000 events per rule per device per day.
- ASR modes: Off 0, Block 1, Audit 2, Not configured 5, Warn 6; audit first, then block.
