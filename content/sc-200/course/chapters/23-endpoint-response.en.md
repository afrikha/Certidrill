When an alert lands on a device onboarded to Microsoft Defender for Endpoint, the analyst works from the device page in the Microsoft Defender portal: read the timeline, act on the device (isolate, contain, collect, scan, open a live response session), investigate the evidence and entities (files, IP addresses, users), and handle what automatic attack disruption already did. Exam questions give a requirement ("collect forensic data without user interaction", "run a script", "block the file everywhere") and ask for the right action, its prerequisite or its limit.

<!-- section: device-timeline | objectives: 2.2.1 -->
## Investigating the device timeline

Open the device page (from **Assets > Devices**, an alert or an incident), then the **Timeline** tab. The timeline lists the events and behaviors observed on that device, in chronological order.

| Feature | What to know |
| --- | --- |
| Time range | Past 30 days by default; past day, past week, past 30 days or a custom range |
| Search | Search bar to find specific events in the timeline |
| Filters | **Data type** (events or techniques), event groups; active filters are shown at the top |
| Flag | Flag icon on an event to mark key events and build a clean breach timeline; the **Flagged events** filter shows only those |
| Customize columns | Choose the columns shown |
| Export | Current date or a date range of **up to seven days** |
| Arrows on the time bar | Mark automated investigations |

**Techniques** are MITRE ATT&CK techniques that Defender for Endpoint inferred from the events. They appear in bold with a blue icon; the ATT&CK ID and name are tags under **Additional information**, and selecting one opens a side pane with the related tactics and techniques.

Selecting an event opens a panel with its details and, when data is available, a graph of the related entities. **Hunt for related events** opens an advanced hunting query that returns the selected event and the other events of the same device around the same time; from a technique, it returns the events related to the technique, not the technique itself.

Visibility depends on what the device audits: firewall events 5025, 5031 and 5157 appear only when the **Audit Filtering Platform Connection** audit policy is enabled.

> **Exam trap.** The timeline is a per-device view in the portal. To find the same behavior on every device, or to keep and rerun the logic, use advanced hunting (for example `DeviceProcessEvents`) and, if it must run automatically, a custom detection rule.

<!-- section: device-actions | objectives: 2.2.2 -->
## Response actions on a device

The action bar of the device page offers these actions. Every action asks for a comment and is tracked in the **Action center**.

| Action | Effect | Undo |
| --- | --- | --- |
| Manage tags | Adds tags used for device groups and filtering | Remove the tag |
| Initiate automated investigation | Starts an automated investigation; alerts of the device and of the same threat on other devices join it | |
| Initiate live response session | Opens a remote shell on the device (next section) | Disconnect |
| Collect investigation package | Builds a zip of forensic data, downloaded from the Action center | |
| Run antivirus scan | Quick or full Microsoft Defender Antivirus scan, also when Defender Antivirus runs in passive mode | |
| Restrict app execution | Only Microsoft-signed files can run | **Remove app restrictions** |
| Isolate device | Cuts the device off the network while it keeps its connection to the Defender service: **full** or **selective** isolation | **Release from isolation** |
| Contain device | The other onboarded devices block all incoming and outgoing communication with this device | **Release from containment** |

Isolation versus containment:

| Requirement | Action |
| --- | --- |
| The compromised device is onboarded and must stop talking to anything except Defender | Isolate device |
| Same, but users must keep Outlook and Microsoft Teams | Selective isolation |
| The device is unmanaged or can't be trusted to enforce isolation itself | Contain device (enforced by the other onboarded devices; up to 100 devices at a time recommended, propagation up to 5 minutes) |

Points that decide answers:

- Isolating a Hyper-V host also blocks the traffic of all its child virtual machines.
- Behind a full-tunnel VPN, an isolated device can't reach the Defender cloud service: use split tunneling.
- On Linux, adding or changing an `iptables` rule on an isolated device removes the isolation.
- Restrict app execution needs Microsoft Defender Antivirus and works through an App Control (WDAC) code integrity policy.
- Isolating a device requires a role with the **Active remediation actions** permission, and the device must be in a device group the user can access.
- Isolation is lifted automatically after seven days. If the device is offline when isolation is submitted, Defender for Endpoint retries for up to three days; after that, isolate it again once it is active.

The **investigation package** is a one-shot collection of forensic artifacts. On Windows it contains, among others:

| Folder | Content |
| --- | --- |
| Autoruns | One file per auto-start extensibility point (ASEP) registry key |
| Installed programs | CSV of the installed programs |
| Network connections | Active connections, ARP and DNS caches, IP configuration, firewall logs |
| Prefetch files | Copy of the Prefetch folder |
| Processes, Services, Scheduled tasks | CSV files |
| Security event log | The Security event log |
| SMB sessions | Inbound and outbound SMB sessions |
| Users and Groups | One file per group with its members |
| Temp Directories | Content of each user's `%Temp%` folder |
| CollectionSummaryReport.xls | What was collected, with status and error codes |

On macOS and Linux, the package also exists (processes, network connections, sign-in history, sudoers, shell history on macOS, Client Analyzer output on Linux).

> **Exam trap.** Investigation package or live response? The package collects a fixed set of artifacts in one click, with no shell. Live response is interactive: collect a specific file, run a script, remediate. "Collect forensic information about running processes, services and autoruns" is the package; "copy a specific log file" or "run a PowerShell script" is live response.

<!-- section: live-response | objectives: 2.2.2 -->
## Live response

Live response gives a remote shell to a device for forensics and remediation. Prerequisites:

- **Settings > Endpoints > Advanced features**: turn on **Live response**; **Live response for servers** for Windows Server; **Live response unsigned script execution** only if unsigned PowerShell scripts must run. Only an administrator or a user with the permission to manage portal settings changes these settings.
- The user needs a role with the **Live response capabilities** permission: **Basic** gives read-only commands, **Advanced** adds the commands that change the device or upload files.
- Uploading a file to the library from the console requires the **Manage security settings** permission; uploading from the **Library management** page doesn't.

| Limit | Value |
| --- | --- |
| Concurrent sessions per tenant | 50 |
| Concurrent sessions per user | 5 |
| Sessions per device | 1 |
| Inactive session timeout | 30 minutes |
| Command timeout | 10 minutes (30 minutes for `getfile`, `findfile` and `run`) |
| `getfile` file size | 3 GB |
| Library file size | 250 MB |
| `putfile` file size | 300 MB on Windows, 10 MB on other platforms |

| Basic commands (read) | Advanced commands (change) |
| --- | --- |
| `cd`, `dir`, `processes`, `services`, `connections`, `drivers`, `registry`, `scheduledtasks`, `persistence`, `startupfolders`, `fileinfo`, `findfile`, `getfile`, `jobs`, `fg`, `status` | `library`, `putfile`, `run`, `remediate`, `undo`, `analyze` (Windows); `scan`, `collect` (macOS or Linux); `isolate`, `release` (macOS only) |

```text
getfile "C:\Users\ana\AppData\Local\Temp\invoice.js" &
jobs
fg 1234
library
run Collect-Artifacts.ps1
remediate file "C:\Users\ana\AppData\Local\Temp\invoice.js"
processes -output json
```

- A script runs with `run` only after it was uploaded to the tenant **library**; `putfile` copies a library file to the device.
- `&` sends a long command to the background; `fg` brings it back.
- The **Command log** tab keeps each command with its status, input and output.

> **Exam trap.** `getfile` is a basic command; `run` and `putfile` are advanced. A user who can download files but can't run a script has the Basic live response permission. A signed-script error means **Live response unsigned script execution** is off.

<!-- section: evidence-entities | objectives: 2.2.3 -->
## Evidence and entity investigation

In an incident, the **Evidence and Response** tab lists the entities found in its alerts (files, processes, services, IP addresses, URLs, emails), each with a **verdict** (Malicious, Suspicious, Clean) and a **remediation status**. Remediation actions waiting for approval (**Pending approval**) are approved or rejected there or in the **Action center**. The **Assets** tab groups devices, users, mailboxes and apps.

Each entity has its own page:

| Entity page | What it shows |
| --- | --- |
| File | Details and PE metadata, related incidents and alerts, devices where it was observed (30-day trend), names it used, prevalence (devices in the organization over the last 30 days, first and last seen, prevalence worldwide), VirusTotal ratio and antivirus detection, content and capabilities mapped to MITRE ATT&CK |
| IP address | Geolocation and ASN, related alerts, devices that communicated with it (up to 100), prevalence over 30 days by default |
| Domain, user account | Related alerts and the devices involved, to pivot back to a device timeline |

Actions on a file:

| Action | Behavior and limits |
| --- | --- |
| Stop and quarantine file | Stops the processes, quarantines the file and deletes its persistent data (such as registry keys) on the devices where it was seen in the last 30 days, up to **1,000 devices**; the action times out after 3 days for offline devices. Not for Microsoft-signed files |
| Add indicator (block or allow) | Blocks or allows the file hash on all devices from then on; PE files; needs the **Allow or block file** advanced feature and cloud-delivered protection |
| Download file / Collect file | Password-protected zip; **Collect file** when Defender doesn't already store the file |
| Deep analysis | Runs a PE file in a cloud sandbox: behaviors, dropped files, registry changes, contacted IP addresses; results in several minutes |
| Go hunt | Opens advanced hunting on the file |

> **Exam trap.** "Block the file on every device, including devices where it hasn't been seen yet" is an **indicator**, not Stop and quarantine: quarantine acts only where the file was observed and is limited to 1,000 devices. Microsoft recommends doing both.

Downloading a portable executable from the file page requires Security Administrator, the Advanced live response permission or the Alerts permission with the file collection permission; a non-PE file requires Security Administrator or Advanced live response.

<!-- section: attack-disruption | objectives: 2.2.4 -->
## Incidents handled by automatic attack disruption

Automatic attack disruption contains assets the attacker uses while the attack is in progress, based on high-confidence correlated signals. The analyst's job is to recognize these incidents, check what was done, finish the investigation and release the assets.

How to spot them:

| Where | Indicator |
| --- | --- |
| Incident queue | **Attack Disruption** tag, plus a tag for the threat type (for example ransomware) |
| Incident page | Highlighted banner under the title; **Attack disruption** summary card with **View activities** and **View related assets** |
| Incident graph | Status labels on assets, such as contained device or disabled user |
| API | Title suffix `(attack disruption)` |

Actions it can take:

| Action | Product |
| --- | --- |
| Contain device, contain IP address, isolate device, contain user | Defender for Endpoint |
| Disable user (Active Directory, and Microsoft Entra ID when synchronized) | Defender for Identity |
| Revoke user session, suspend user | Microsoft Entra ID |
| Act on a compromised OAuth app | Defender for Cloud Apps |
| Safeboot hardening, GPO hardening, proactive user containment (predictive shielding) | Defender for Endpoint |

Suspending a user in Okta and attaching a deny policy to an AWS user, through the Microsoft Sentinel connectors, are in preview.

**Contain user** blocks attack-related inbound protocols (network logons, RPC, SMB, RDP) for that account on onboarded devices, ends its remote sessions and doesn't disable the account; it is lifted automatically within five days, and undoing it earlier (**Undo** in the Action center or on the user) requires Global Administrator. **Contain IP** applies to the addresses of undiscovered or non-onboarded devices.

Remediation workflow:

1. Open the incident and read the summary card and the incident graph.
2. In the **Activities** tab (action tracking there is in preview), filter **Performed by: AttackDisruption** and read the **Policy status** column (preview: **Active**, **Inactive**, **Not applicable**, **No status**) to see what is still enforced.
3. Investigate and remediate the root cause (reset the credentials, remove persistence, clean the devices).
4. Release the assets: on the incident graph select the asset and **Release from containment** (device) or **Enable user** (account), or use the action details pane in the **Action center**.

```kusto
DisruptionAndResponseEvents
| where Timestamp > ago(30d)
| project Timestamp, ActionType, DeviceName, SourceUserName, SourceIpAddress, PolicyName
| order by Timestamp desc
```

```kusto
DeviceEvents
| where ActionType contains "ContainedUser"
```

The first query (`DisruptionAndResponseEvents` is a preview table) lists attack disruption events across the organization (blocks and policy applications of the triggered disruption policies, and the automatic actions taken); the second finds the sign-ins or accesses blocked because a user was contained (`ContainedDevice` for a contained device).

> **Exam trap.** Releasing the asset is the last step, not the first: releasing before the investigation ends lets the attacker resume. And assets that must never be contained automatically (a critical server, a service account) are **excluded** from automated response actions beforehand, not released after each incident.

<!-- section: key-points -->
## Key points

- Timeline: one device, 30 days by default, flags, techniques, export up to seven days; **Hunt for related events** opens advanced hunting.
- Isolate (onboarded device, full or selective with Outlook and Teams) versus contain (enforced by the other devices, for unmanaged devices).
- Investigation package = fixed forensic collection; live response = interactive shell, scripts from the library, Basic or Advanced permission.
- Live response: 1 session per device, 30-minute idle timeout, `getfile` up to 3 GB.
- Stop and quarantine acts where the file was seen (1,000 devices); an indicator blocks everywhere and in the future.
- Attack disruption incidents: tag, banner, summary card; check the Activities tab (preview), remediate, then release from the incident graph or the Action center.
