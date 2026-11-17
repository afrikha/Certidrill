Microsoft Security Copilot is a generative AI assistant for security teams, used in a standalone portal (`https://securitycopilot.microsoft.com`) and embedded in Defender, Microsoft Entra, Intune and Microsoft Purview. For the exam you configure it rather than prompt it: workspaces and their capacity, the owner and contributor roles, plugins, and agents from Microsoft and from the Security Store. Security Copilot is documented for commercial clouds only; it isn't designed for US government clouds.

<!-- section: workspaces | objectives: 4.3.1 -->
## Configure workspaces for Security Copilot

A **workspace** groups, for one team or use case, the capacity that powers Security Copilot, the data residency settings and the people who have access. Typical split: a production SOC workspace, a compliance workspace whose data must stay in the EU, a sandbox for testing.

```text
Microsoft Entra tenant
├── Workspace: Contoso-SOC        capacity: Capacity-SOC (10 provisioned + 5 overage SCUs)
├── Workspace: Contoso-Compliance capacity: Capacity-EU  (data storage: Europe)
└── Workspace: Contoso-Sandbox    capacity: Capacity-Dev (data sharing: opt in)
```

**Capacity** is an Azure resource measured in **Security Compute Units (SCUs)**. Every use consumes SCUs: the standalone portal, embedded experiences, Microsoft agents and partner agents.

| Capacity type | Rule |
| --- | --- |
| Provisioned SCUs | Bought in advance, minimum 1; refresh every full billing hour; unused SCUs expire at the end of the hour; billed per hour, any usage in an hour counts as a full SCU |
| Overage SCUs | Consumed only when provisioned SCUs run out; a maximum or unlimited; billed per exact use, to one decimal |
| No capacity left | Requests stop, unless overage is available |
| Change provisioned SCUs | Azure portal or Security Copilot portal; changes are best made at the start of an hour |
| Microsoft 365 E5 and E7 | Security Copilot is included: Microsoft auto-provisions a **default capacity** and a **default workspace** for eligible, enabled tenants |

To create a workspace: in the Security Copilot portal select the workspace name in the breadcrumb (or **Owner settings** > **Manage workspaces**) > **New workspace**, enter a name, select or **Create new capacity** (subscription, resource group, capacity name, provisioned and overage SCUs), then set the data storage location, the prompt evaluation location and the data sharing preference, and **Create**.

| Setting | Behavior |
| --- | --- |
| Name | Unique in the tenant; letters, digits, hyphens and underscores; can't be changed afterwards |
| Data storage location | Where session data is stored at rest (Australia, Europe, Switzerland, United Kingdom, United States). **Immutable**: changing the geography means a new workspace |
| Prompt evaluation location | The data storage geography, or "Evaluate anywhere with available capacity" (least busy datacenter worldwide, less geographic control) |
| Data sharing | Whether Microsoft may capture prompts and responses (with human review) to validate the product or build its security AI model; Off by default in auto-provisioned workspaces |
| Capacity | One capacity serves one workspace at a time; the association can change, but a workspace always needs a capacity |
| Access to Microsoft 365 service data | On by default in auto-provisioned workspaces; turning it off limits Copilot with Microsoft 365 products |
| Default workspace | The one used by the embedded experiences of Defender, Microsoft Entra, Purview and Intune; if workspaces already exist, the earliest-created one |

To provision capacity you need **Contributor or Owner** on the Azure subscription or resource group, and **Security Administrator** or higher in the tenant.

> **Exam trap.** "All prompts and stored data must stay in the EU" requires both data storage in Europe **and** prompt evaluation in the same geography. "Evaluate anywhere" breaks the requirement, and an existing workspace in the United States can't be moved: create a new workspace.

<!-- section: roles | objectives: 4.3.2 -->
## Manage permissions and roles in Security Copilot

Security Copilot has two roles of its own, **Copilot owner** and **Copilot contributor**. They aren't Microsoft Entra roles: they only control access to the Security Copilot platform and give **no access to security data**. Roles are assigned per workspace: an owner of the SOC workspace has nothing in the sandbox unless assigned there.

| Capability | Copilot owner | Copilot contributor |
| --- | --- | --- |
| Create sessions, run promptbooks | Yes | Yes |
| Upload files | Yes | Yes by default |
| Manage file upload usage | Yes | No |
| Manage personal custom plugins | Yes | No by default |
| Data sharing and feedback options | Yes | No |
| Capacity management, usage dashboard | Yes | No |

Who is an owner or contributor without an explicit assignment:

| Default role | Members |
| --- | --- |
| Copilot owner | Microsoft Entra roles such as Global Administrator, Security Administrator, Conditional Access Administrator, Intune Administrator, Billing Administrator, and compliance roles (Compliance Administrator, Purview Compliance Administrator, Purview Organization Management, Purview Data Governance Administrator) |
| Copilot contributor | Custom Defender XDR roles and Intune roles that include the Security Copilot permission, and Purview roles; new instances use the **Recommended Microsoft Security roles** group |
| Everyone group | Contributor on older instances; can be removed, and once removed can't be added again |

To assign a role: home menu > **Role assignment** > **Add members** (or **Owner settings** > **Role assignments** > **Add role assignment**), select the users or groups, select **Copilot owner** or **Copilot contributor**, then **Add**. Security Copilot always keeps two owners, which can't be removed. Microsoft Entra role membership itself is managed only in the Microsoft Entra admin center.

**Data access.** Copilot uses **on-behalf-of** authentication: each plugin still requires the user's own role on its service. A contributor without Microsoft Sentinel Reader gets nothing from the Sentinel plugin; a contributor without an Intune role such as Endpoint Security Manager gets nothing from Intune.

> **Exam trap.** Don't assign Security Administrator only so that someone can use Copilot. Create a security group, add it to Copilot contributor (or owner), and give the members the data roles they need in each product. Replace the Everyone group with the Recommended Microsoft Security roles group.

Two owner settings with a different scope: **audit logging** of Security Copilot activity to Microsoft Purview applies to the whole tenant and only a Security Administrator can change it; the file upload permission (owners only or all contributors) applies per workspace.

<!-- section: plugins | objectives: 4.3.3 -->
## Enable and configure plugins

Plugins give Copilot access to data and capabilities of a service: preinstalled **Microsoft** plugins (Microsoft Sentinel, Microsoft Defender XDR, Natural Language to KQL...), preinstalled **non-Microsoft** plugins, and **custom** plugins.

| Task | Where |
| --- | --- |
| Turn a plugin on or off for your sessions | **Sources** icon in the prompt bar > **Manage plugins**, toggle |
| Restrict preinstalled plugins | **Owner settings** > **Plugin settings**: All users or Owners only. Immediate, applies to the standalone and embedded experiences; new preinstalled plugins then go to owners only |
| Who can add their own custom plugins | Owners only (default) or Contributors and Owners |
| Who can add custom plugins for everyone in the workspace | Owners only or Owners and Contributors |
| Add a custom plugin | **Manage plugins** > **Custom** > add a **Security Copilot plugin** (upload or link a YAML or JSON manifest) or an **OpenAI plugin** |
| Plugin that needs configuration values | **Set up** (gear icon); each user configures it for themselves |
| Edit or delete a custom plugin | Gear icon > **Edit file** or **Delete** |

Rules to remember:

- Plugin decisions are **per workspace**: enabling a plugin in the SOC workspace doesn't enable it elsewhere.
- A plugin added by an owner can be available to that owner only (it gets a **private** tag) or to everyone in the organization; only owners can modify an organization-wide plugin, and contributors can't edit custom plugins created by owners.
- When an agent is set up, its required plugins are enabled **for that agent only**, without changing the plugin settings of the organization.
- Vet a custom plugin at user level before publishing it to the organization.

> **Exam trap.** Turning on the Microsoft Sentinel plugin doesn't give access to Sentinel data. The user also needs a Sentinel role on the workspace, because the plugin acts on behalf of the signed-in user.

<!-- section: agents | objectives: 4.3.4 -->
## Enable and configure Microsoft agents and Security Store agents

**Agents** run security tasks autonomously, on a schedule, on an event or on demand, and consume SCUs from the workspace's capacity. In the Security Copilot portal select **Agents** to open the agent library (Microsoft and partner agents available to the workspace); **Browse more agents** or **Security Store** lists the others. In the Defender portal: **Security Copilot** > **Agents**.

Setting up an agent: select it > **Set up** > choose an identity > enter the parameters > finish; then **Run** or manage it from its page.

| Element | Detail |
| --- | --- |
| Who sets up | Copilot owners and contributors, plus the product roles the agent lists |
| Identity | **Create an agent identity** (a dedicated nonhuman identity, Microsoft Entra Agent ID; recommended; currently Microsoft-built agents only) or **Assign an existing user account** (the agent inherits that user's access) |
| Trigger | Automatic (schedule or event) or manual (**One time**); **pause** to stop it temporarily |
| Feedback | Owners and contributors give feedback that is stored in the agent's **memory**; **Manage memory** > **Reject feedback** removes an item |
| Changes | **Edit** to change the identity or parameters |

Microsoft agents in the Defender portal:

| Agent | Key facts |
| --- | --- |
| Security Alert Triage Agent | Extends the Phishing Triage Agent; triages email and collaboration alerts (needs Defender for Office 365 Plan 2), plus cloud and identity alerts in preview; runs on each new alert; Security Administrator to set up |
| Threat Intelligence Briefing Agent | Regular, customized threat intelligence briefings; scheduled or manual; Security Administrator to set up |
| Security Analyst Agent | On-demand analysis of Defender XDR or Sentinel data; tied to each user's identity |
| Threat Hunting Assistant | Natural-language hunting that writes KQL and interprets results |
| Dynamic Threat Detection Agent | Always-on backend service that looks for false negatives across Defender and Sentinel |

Other agents surface in their product, for example identity agents such as Conditional Access optimization in the Microsoft Entra admin center.

**Security Store agents.** Microsoft Security Store is a catalog of agents and solutions from Microsoft and partners. Flow: **Explore agents** > choose an agent > **Get solution** > select the Azure billing subscription, resource group and name > select deployment resources (a Sentinel workspace if the agent uses Sentinel data lake jobs) > **Place order** > **Open Microsoft Security Copilot** to set it up. Deployed agents are listed in **Management** > **My solutions**.

| Step | Role |
| --- | --- |
| Purchase and deploy | Contributor or Owner on the Azure billing subscription |
| Set up in Security Copilot | Copilot owner or contributor |
| Approve a partner agent that accesses Microsoft products (Defender, Sentinel, Microsoft Entra, Intune, Defender Threat Intelligence) | **Global Administrator** |

> **Exam trap.** A contributor sees a partner agent with **Set up** disabled and a consent banner: they can't fix it themselves. They select **Copy link** and send it to a Global Administrator, who selects **Start approval**; then the contributor completes setup with an existing user account.

<!-- section: key-points -->
## Key points

- A workspace ties capacity, data residency and access together; the data storage location and the name can't be changed afterwards.
- SCUs: provisioned (minimum 1, hourly, use it or lose it) plus optional overage; E5 and E7 tenants get a default workspace and capacity.
- Copilot owner and contributor are Security Copilot roles, not Microsoft Entra roles, and grant no data access: plugins act on behalf of the user.
- Owners control preinstalled plugin availability and who can add custom plugins; plugin choices are per workspace.
- Agents: agent identity recommended, automatic or manual triggers, feedback in memory; partner agents come from the Security Store and may need Global Administrator approval.
