Securing Microsoft 365 Copilot and agents starts with data: Copilot answers from whatever content the user can already open, so overshared SharePoint sites become AI exposure. Then come the agents themselves: their Microsoft Entra Agent ID identities, the Conditional Access policies and access packages that bound them, the blast radius Defender XDR shows for them, runtime protection for Copilot Studio agents, and the agent inventory of the Microsoft 365 admin center. Many of these features are in preview.

<!-- section: sharepoint-overexposure | objectives: 3.1.1 -->
## Identifying data overexposure in SharePoint

Overexposure means permissions broader than the content's sensitivity: **Everyone except external users** (EEEU), anyone-with-the-link sharing, broad groups. Two toolsets find it.

**SharePoint Advanced Management (SAM)**, used by SharePoint administrators in the SharePoint admin center:

| Tool | What it shows or does |
| --- | --- |
| Data access governance (DAG) reports | Permission state reports (sites, OneDrive, files), site permissions for a given user, sensitivity label snapshot, sharing links activity (last 28 days), EEEU insights (last 28 days) |
| Site access reviews | Delegate the review of a DAG finding to the owners of the overshared site |
| Restricted content discovery (RCD) | Keeps a site out of organization-wide search and Copilot responses, without changing permissions |
| Restricted access control (RAC) | Limits access to a site to members of specific groups, whatever the sharing |
| Conditional Access with authentication contexts | Applies an Entra policy to a specific site |
| Block download policy | Blocks downloads from a site |

```powershell
Set-SPOSite -Identity https://contoso.sharepoint.com/sites/Finance `
  -RestrictContentOrgWideSearch $true
Set-SPOTenant -DelegateRestrictedContentDiscoverabilityManagement $true
```

RCD facts: only SharePoint administrators manage it unless the second cmdlet delegates it to site administrators (who must justify changes); SharePoint sites only, not OneDrive; users with access still open the content; content stays indexed for eDiscovery and auto-labeling; very large sites can take over a week. It's a temporary control while owners fix permissions.

**Microsoft Purview DSPM for AI** runs **data risk assessments**: a default assessment runs **weekly on the top 100 SharePoint sites** by usage, and you can create custom assessments for other sites or users. For each site, the **Overview**, **Identify**, **Protect** and **Monitor** tabs show scanned items, sensitive data and sharing links. Remediation from the Protect tab:

| Option | Effect |
| --- | --- |
| Restrict access by label | Creates a DLP policy that stops Microsoft 365 Copilot and agents from summarizing content with given labels; permissions unchanged |
| Restrict all items | Uses Restricted content discovery to remove the site from Copilot grounding; people keep access |
| Create an auto-labeling policy | Labels unlabeled files that contain sensitive information types |
| Create retention policies | Deletes stale content (not accessed for at least three years) |

> **Exam trap.** Restricted content discovery doesn't remove anyone's access: it only hides the site from organization-wide search and Copilot. To stop people opening an overshared site, fix its permissions or apply restricted access control.

<!-- section: dspm-ai-risks | objectives: 3.1.2 -->
## Identifying Copilot and AI app risks with DSPM

In the Microsoft Purview portal, **Solutions > DSPM for AI (classic)** remains available; new features go to the newer **Data Security Posture Management** experience. Prerequisites:

| Requirement | Detail |
| --- | --- |
| Microsoft Purview Audit | Enabled (on by default for new tenants) |
| Licenses | Microsoft 365 Copilot for monitored users; Microsoft 365 E5 or Microsoft Purview Suite (E3 doesn't qualify) |
| Role | Compliance Administrator or an equivalent role |
| External AI sites (ChatGPT consumer, Gemini) | Devices onboarded to Microsoft Purview and the Microsoft Purview browser extension |
| Sensitivity labels | Recommended: without them, only sensitive information types are detected |

The **Get started** section activates one-click policies that create the underlying rules for you, for example **Detect risky AI usage**, **Unethical behavior in AI apps** and **Detect sensitive info shared with AI via network**.

| Dashboard area | Content |
| --- | --- |
| Reports | AI interactions by category: Copilot experiences and agents, Enterprise AI apps, Other AI apps |
| Data risk assessments | Overshared SharePoint sites used as grounding data |
| Activity explorer | Events: AI interaction, AI website visit, Sensitive info types, DLP rule match, with user, app, label or sensitive information type |
| Apps and agents | Discovered AI apps and agents with usage |

Risks DSPM highlights: sensitive data in a prompt, sensitive data in a response (Copilot referencing labeled files), sensitive data pasted into an external AI site, and data crossing security zones.

> **Exam trap.** DSPM for AI gives visibility; it doesn't block. To prevent users from pasting sensitive content into external AI apps, create a Microsoft Purview DLP policy for that scenario.

<!-- section: copilot-studio-realtime | objectives: 3.1.3 -->
## Real-time protection for Copilot Studio agents

Copilot Studio custom agents have built-in protection against user prompt injection attacks (UPIA) and cross-domain prompt injection attacks (XPIA). For agents that use generative orchestration, **real-time protection** adds an external check: every time the orchestrator is about to invoke a tool, it sends the prompt, recent history, previous tool outputs and the proposed tool call to a threat detection endpoint, which answers allow or block. A blocked request stops the agent and tells the user the message was blocked. The provider can be Microsoft Defender, another vendor or your own service.

Enabling it with Microsoft Defender is a two-team procedure (preview):

1. Security engineer, Microsoft Defender portal: **System > Settings > Security for AI**, turn on **Security for AI Agents** (starts discovery), then enable **Real time protection during agent runtime** and copy the URL it provides.
2. Power Platform administrator, Power Platform admin center: **Security > Threat Protection > Microsoft Defender - Copilot Studio AI Agents**, turn it on, enter the URL, create or select a Microsoft Entra application and share its **App ID**.
3. Security engineer: enter the App ID in the Security for AI settings and save. Status **Connected** confirms the link.

| Fact | Value |
| --- | --- |
| Roles | Power Platform Administrator for the Power Platform side; Global Administrator or Security Administrator to connect the Microsoft 365 app connector |
| Microsoft 365 app connector | Must be connected, or blocks happen but no alerts or incidents appear |
| Custom provider setup | **Security > Threat detection > Additional threat detection**, per environment, including environments created later |
| Timeout | No decision within one second: by default the tool runs (error behavior can be set to block) |
| Sessions | Applies to new sessions only |
| Entra app for a custom provider | Single-tenant app registration with a federated identity credential (no secret) |

In the Defender portal, **Settings > Security for AI > Policies & rules > Real-time protection** holds the rules: the default rule **audits** all agents; custom rules **block** selected detection types (malicious content, secret exfiltration, evasion techniques, unsafe email domain) for all or specific agents. Outputs: alerts and incidents in **Incidents & alerts**, the `BehaviorInfo`, `CloudAppEvents` and `AIAgentsInfo` tables in advanced hunting, and a **Protection status** column on the Copilot Studio Agents page.

```kusto
AIAgentsInfo
| summarize arg_max(Timestamp, *) by AIAgentId
| project AIAgentName, Platform, CreatorAccountUpn, AgentToolsDetails, IsBlocked
```

> **Exam trap.** Turning on Security for AI Agents in Defender only discovers agents. Nothing is blocked until the Power Platform administrator completes the Copilot Studio side and the App ID matches on both sides.

<!-- section: agent-conditional-access | objectives: 3.1.4 -->
## Conditional Access for Microsoft Entra Agent ID

Conditional Access applies to the **subject of the token**:

| Access pattern | Token subject | Policy targets |
| --- | --- | --- |
| On-behalf-of (delegated) | The signed-in user | Users and groups |
| Autonomous (app-only) | The agent identity | Agent identities or agent identity blueprints |
| Agent user | The agent's user account | Agent Users |

Create the policy in **Entra ID > Conditional Access > Policies > New policy**: **Users, agents or workload identities > What does this policy apply to? > Agents**, then include **All agent identities**, selected agent identities or blueprint principals, or agents matched by **custom security attributes**. A policy that targets a **blueprint** covers every agent identity created from it, including future ones. Typical policies, both started in **Report-only**:

| Goal | Configuration |
| --- | --- |
| Only approved agents | Include All agent identities, exclude the approved ones (or use custom security attributes), All resources, **Block** |
| Block risky agents | All agent identities, condition **Agent risk (Preview)** = High, **Block** |

| Fact | Value |
| --- | --- |
| Role | Conditional Access Administrator |
| Licensing | Microsoft 365 E7, or Microsoft Agent 365 with Microsoft Entra ID P1 or Microsoft 365 E3; agent risk needs Entra ID P2 or Microsoft 365 E5 |
| Evaluated | When Entra ID issues or refreshes a token |
| Not evaluated | API keys, resources not secured by Entra ID, blueprints creating agents, security defaults |

> **Exam trap.** Policies scoped through **Users** (all users, groups, roles) never apply to agent user accounts, and policies on agent identities don't cover the agent's user account. Each token subject needs its own policy.

<!-- section: agent-blast-radius | objectives: 3.1.5 -->
## Analyzing agent blast radius with Defender XDR

The **blast radius** of an agent identity is what an attacker reaches if it's compromised. Defender XDR evaluates three components and gives each agent a risk score:

| Component | Larger blast radius | Smaller blast radius |
| --- | --- | --- |
| Permissions | Application permissions such as `Sites.FullControl.All`, `Mail.ReadWrite.All` | `Sites.Selected`, `Files.Read.Selected`, delegated scopes |
| Knowledge sources | Many sites with Highly Confidential content | Few sites with appropriately labeled content |
| Blueprint configuration | Actions such as external email or code execution | Only the actions the task needs |

The **AI agent inventory** is in **Assets > AI Agents** (preview). It lists agents with Entra-backed identities from Copilot Studio, Microsoft Foundry, AWS Bedrock and GCP Vertex AI, with status, identities, last activity and risk level. Selecting a Foundry, Bedrock or Vertex AI agent opens a pane with permissions, knowledge sources and risk factors; **View on map** shows **attack paths** from the agent to sensitive data or privileged accounts. Copilot Studio agents are analyzed with the **AI Agents** queries of advanced hunting. Since July 1, 2026, agent-level discovery, posture and threat detection for Copilot Studio and Foundry agents require a Microsoft Agent 365-eligible license.

Remediation: fewer permissions, fewer knowledge sources, fewer blueprint actions, Conditional Access. **ID Protection for agents** lists detections (Sign-in spike, Unfamiliar resource access...) in the **Risky Agents** report; **Confirm compromise** sets the risk to High, which an agent risk Block policy enforces, and **Disable** blocks all sign-ins.

> **Exam trap.** Prioritize attack paths by the criticality of the target, not the number of steps: a three-step path to financial records outranks a seven-step path to meeting notes.

<!-- section: agent-id-access | objectives: 3.1.6 -->
## Managing Microsoft Entra Agent ID access

An **agent identity blueprint** is the template from which **agent identities** are created; an agent identity can have a paired **agent user account**. Agent identities get **autonomous** access (Microsoft Graph application permissions, Azure RBAC roles, Microsoft Entra roles, app roles) or **delegated** access (acting for a user, within the rights the user delegates).

Each object has relationships that are separate from Entra admin roles such as **Agent ID Administrator**:

| Relationship | Who | Required | Can do |
| --- | --- | --- | --- |
| Owner | Users (guests included) or service principals, not groups | No | Technical administration: settings, credentials, owners and sponsors, disable, re-enable, restore, delete |
| Sponsor | Users or groups (dynamic groups, Microsoft 365 assigned groups; not role-assignable groups) | **Yes**, at least one per agent identity and blueprint (up to 100, 5 groups) | Business accountability: request access packages, renew or remove access, disable or soft-delete, but not re-enable or restore |
| Manager | Individual users | No | Request access packages for the agent's user account; can't modify or delete the agent |

**Entitlement management** governs what agents get: in the access package policy, **Who can get access** = **For users, service principals, and agent identities in your directory** > **All agents**. The agent can request the package itself (Graph `accessPackageAssignmentRequest`), its sponsor or owner can request it on its behalf, or an administrator assigns it. Packages can hold security group memberships, OAuth API permissions (delegated and application) and Microsoft Entra roles. Before an assignment expires, the sponsor is notified and can request an extension. Lifecycle Workflows can transfer sponsorship to a departing sponsor's manager, and a default inactivity policy disables inactive agent identities.

> **Exam trap.** A sponsor is accountable, not an administrator: sponsors can disable an agent identity but can't re-enable or restore it. Recovery needs an owner or an administrator.

<!-- section: m365-admin-agents | objectives: 3.1.11 -->
## Managing agents in the Microsoft 365 admin center

The **Agent Registry** (**Agents > All agents > Registry**) is the tenant inventory of agents, with tiles **Total agents**, **Agents without owners** and **Unmanaged agents**, filters and a **Risks** column (E7 or Agent 365 license). Publisher types: **Microsoft agents**, **External partner-built agents**, **Published by your org**, **Shared by creator**; one Copilot Studio agent can appear twice with two publisher types.

| Action | Effect |
| --- | --- |
| Install / Uninstall | Deploy to the whole organization or to users and groups / remove |
| Block / Unblock | Restricts or restores the agent across the organization |
| Publish to store / Reject submission | Answers a user's request to publish an agent to the Agent Store |
| Assign new owner | Reassigns an ownerless shared agent; the previous owner loses access |
| Delete / Restore / Permanently delete | Soft delete with 30-day retention |
| Start / Stop | Foundry agents only; needs the Azure AI Owner role |

**Agents > Settings** holds **Agent and plugin access** (allow agents built by Microsoft, by your organization, by external publishers), **User access** (All users by default, No users, or specific users or groups), **Sharing** (who can share Agent Builder agents), **Agent management rules** (for example block ownerless agents without usage) and tags. Use the **AI Administrator** role rather than Global Administrator; AI Administrators can't configure Conditional Access or access package policies.

> **Exam trap.** Disabling "Allow agents and plugins built by your organization" hides those agents from the Agent Store; to stop one risky agent everywhere, **Block** it in the registry instead.

<!-- section: key-points -->
## Key points

- SharePoint: DAG reports find overexposure; RCD hides a site from Copilot without changing access; RAC and permissions restrict it; DSPM assesses the top 100 sites weekly.
- DSPM for AI needs Purview Audit and E5 or Purview Suite; it shows risks, DLP blocks.
- Copilot Studio real-time protection: Defender portal plus Power Platform admin center, matching App ID, one-second timeout that allows by default.
- Conditional Access for agents targets agent identities or blueprints, never agent users through Users; Entra-issued tokens only.
- Blast radius = permissions, knowledge sources, blueprint actions; inventory in Assets > AI Agents, attack paths with View on map.
- Agent ID: sponsors required, owners technical; access packages for All agents; Microsoft 365 admin center registry to install, block and publish.
