A security operations team drowns in logs and alerts unless one tool gathers them and another automates the routine response. Microsoft Sentinel does both. The exam asks you to define SIEM and SOAR, then to name the Sentinel feature that collects, detects, investigates or responds.

<!-- section: siem-soar | objectives: 3.3.1 -->
## SIEM and SOAR

A **security information and event management (SIEM)** system collects data from the whole digital estate of an organization (infrastructure, software, services, on-premises or in the cloud), then analyzes it to surface potential threats.

A **security orchestration, automation, and response (SOAR)** system takes the alerts of a SIEM and of other security tools, then triggers automated workflows that handle the response.

| | SIEM | SOAR |
| --- | --- | --- |
| Purpose | Visibility: see what is happening | Speed: act on it without manual effort |
| Input | Logs and security events from firewalls, servers, identity systems, applications, endpoints | Alerts and incidents from the SIEM and other tools |
| What it does | Aggregates, correlates, raises alerts, groups related alerts into incidents | Orchestrates tools so that they work together, automates repetitive tasks, runs playbooks |
| Typical result | An incident to investigate | A flagged account disabled, a ticket opened and the team notified, automatically |

**Microsoft Sentinel** is a cloud-native solution that is **both** a SIEM and a SOAR.

> **Exam trap.** "Collect", "correlate", "analyze logs" point to SIEM. "Automate the response", "workflow", "playbook" point to SOAR. Neither word describes a firewall or an antivirus: they sit above the other tools.

<!-- section: sentinel-capabilities | objectives: 3.3.2 -->
## Threat detection with Microsoft Sentinel

Sentinel works across multicloud and multiplatform environments, at cloud scale. Its work follows four stages:

| Stage | What Sentinel does | Feature to remember |
| --- | --- | --- |
| **Collect** | Gathers security data from users, devices, applications and infrastructure, on-premises and in several clouds | **Data connectors** for Microsoft sources (Microsoft Entra ID, Azure Activity, Azure Storage) and non-Microsoft sources (Syslog, Common Event Format, REST API) |
| **Detect** | Finds threats in the collected data and limits false positives | **Analytics rules** query the data, raise alerts and group related alerts into **incidents** |
| **Investigate** | Determines the scope and the root cause of an attack | Incident pages with an interactive graph of the entities involved; **hunting** queries |
| **Respond** | Reacts quickly to the incident | **Automation rules** and **playbooks** |

Detection relies on several mechanisms:

- **Rule-based detection**: analytics rules, with templates written by Microsoft security experts.
- **Machine learning**: behavioral baselines flag deviations, and the **Fusion** engine correlates low-severity signals from several sources into one high-confidence incident, which reveals multistage attacks.
- **Threat intelligence matching**: the data is compared with feeds of known malicious IP addresses, domains and URLs.
- **MITRE ATT&CK coverage**: a view of the attacker techniques that your rules cover, and of the gaps.

Other features to recognize:

| Feature | Purpose |
| --- | --- |
| **Content hub** | Deploy packaged **solutions**; a solution can bundle data connectors, workbooks, analytics rules, hunting queries and playbooks |
| **Workbooks** | Interactive visual reports on the collected data, from templates or custom |
| **Hunting** | Proactive search for suspicious activity that no rule has caught; a useful query can become a detection rule |
| **Notebooks** | Jupyter notebooks for advanced analysis and visualization |
| **Watchlists** | Lists of your own data (high-value assets, terminated employees) correlated with the events |

Sentinel is also a platform: its **data lake** keeps security data at low cost for long periods, beside the analytics tier (a Log Analytics workspace) where analytics rules run.

<!-- section: sentinel-response | objectives: 3.3.2 -->
## Threat mitigation with Microsoft Sentinel

The SOAR side of Sentinel automates recurring enrichment, response and remediation tasks, so that analysts keep their time for investigation and hunting.

| Feature | Role |
| --- | --- |
| **Automation rule** | Manages incident handling from a central place: assign an incident to an analyst, tag it, change its status or close it, add tasks, or run a playbook. Runs when an incident is created or updated |
| **Playbook** | A collection of response and remediation actions built on **Azure Logic Apps**. Runs automatically, triggered by an automation rule, or on demand |

Example: an automation rule detects a high-severity incident that involves a user account and runs a playbook, which disables the account, opens a ticket in the IT service tool and posts a message to the security team.

Incidents are investigated in the **Microsoft Defender portal**, in a single queue that shows Sentinel incidents together with those of Microsoft Defender XDR. The Defender portal is the recommended way to use Sentinel: after **March 31, 2027**, Sentinel is no longer supported in the Azure portal.

> **Exam trap.** Three words that look alike. **Workbook**: a report that visualizes data. **Playbook**: a Logic Apps workflow that automates a response. **Notebook**: Jupyter, for advanced analysis.

> **Exam tip.** Sentinel collects from every source and correlates across the organization (SIEM, SOAR). Defender XDR protects specific domains: endpoints, identities, email, cloud apps. Defender for Cloud protects cloud resources and workloads. All three surface in the Defender portal.

<!-- section: key-points -->
## Key points

- SIEM: collect, correlate and analyze data from everywhere, raise alerts and incidents. SOAR: orchestrate tools and automate the response with playbooks.
- Microsoft Sentinel is a cloud-native SIEM and SOAR.
- Four stages: collect (data connectors), detect (analytics rules, Fusion, threat intelligence), investigate (incidents, hunting), respond (automation rules, playbooks).
- Playbooks are built on Azure Logic Apps; automation rules decide when they run.
- Workbooks visualize, content hub deploys solutions, watchlists bring your own reference data.
- Sentinel is used in the Microsoft Defender portal; support in the Azure portal ends after March 31, 2027.
