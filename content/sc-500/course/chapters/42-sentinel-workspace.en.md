Microsoft Sentinel is a SIEM that runs on a Log Analytics workspace and is now operated from the Microsoft Defender portal. This chapter covers what the exam asks about its foundations: enabling it on the right workspace and connecting that workspace to the Defender portal, choosing the least-privileged role for each task, installing content from the content hub, automating incident handling with automation rules and playbooks, and setting how long data stays in the analytics tier and in the data lake.

<!-- section: workspace | objectives: 4.2.1 -->
## Create and connect a Microsoft Sentinel workspace

Microsoft Sentinel is added **to a Log Analytics workspace**: the workspace stores the data, Sentinel adds the SIEM features on top. Requirements and constraints:

| Item | Rule |
| --- | --- |
| Permission to enable Sentinel | Contributor on the subscription that holds the workspace |
| Permission to use Sentinel | Microsoft Sentinel Reader or Microsoft Sentinel Contributor on the workspace's resource group |
| Pricing tier | Pay-as-you-go or a commitment tier. Legacy pricing tiers aren't supported |
| Resource lock | Not supported on the workspace when you enable Sentinel |
| Network security perimeter | Not supported. If one is enabled, analytics rules are disabled automatically |
| Workspace created by Defender for Cloud (default workspace) | Not listed: Sentinel can't be installed on it |
| Moving the workspace | Not supported once Sentinel is deployed (no move to another resource group or subscription) |
| Data isolation | Sentinel can run on several workspaces, but data stays isolated per workspace |

Microsoft recommends a **dedicated resource group** that contains only the Sentinel workspace and its related resources (playbooks, workbooks): permissions are then assigned once, at the resource group, and apply to everything Sentinel uses. Extra resource groups can hold resources reserved to more privileged groups.

Steps to enable it: search for **Microsoft Sentinel**, select **Create**, then either **Create a new workspace** (subscription, resource group, name, region) or select an existing workspace and **Add**. Then install a solution from the content hub (for example **Azure Activity**) and configure its data connector.

**The Defender portal.** After **March 31, 2027**, Microsoft Sentinel is no longer supported in the Azure portal and is available only in the Defender portal. Customers who onboard after July 1, 2025 are in many cases onboarded to the Defender portal automatically. To connect an existing workspace: Defender portal > **System** > **Settings** > **Microsoft Sentinel** > **Connect a workspace**, select the workspaces, choose the **primary workspace**, then **Connect**.

| Defender portal rule | Detail |
| --- | --- |
| Workspaces per tenant | One primary workspace and an unlimited number of secondary workspaces, in a single Microsoft Entra tenant |
| Defender XDR correlation | Only the primary workspace: its alerts are correlated with Defender XDR data in the unified incident queue, and Defender XDR incidents and alerts sync to it |
| Secondary workspaces | Their incidents contain only their own data; custom detections and API queries in advanced hunting are limited to the primary |
| Changing the primary | **System** > **Settings** > **Microsoft Sentinel** > **Workspaces**; the Defender XDR connector moves to the new primary automatically |
| Onboard or change the primary workspace | Microsoft Entra Security Administrator, plus Owner (unconditional assignment at the subscription) or User Access Administrator + Microsoft Sentinel Contributor |
| Connect or disconnect a secondary workspace | Owner, or User Access Administrator + Microsoft Sentinel Contributor |
| Cross-tenant | GDAP with Azure Lighthouse isn't supported for Sentinel data in the Defender portal; use Microsoft Entra B2B |

> **Exam trap.** A user with Owner on the subscription but no Microsoft Entra role can't onboard the primary workspace: the Security Administrator role is also required. Contributor alone isn't enough either, because onboarding needs Owner or User Access Administrator.

<!-- section: roles | objectives: 4.2.2 -->
## Assign roles in Microsoft Sentinel

Microsoft Sentinel uses Azure RBAC roles, best assigned **at the resource group** that contains the workspace. If you assign them at the workspace instead, you must also assign them on the SecurityInsights solution resource of that workspace. Assignments are cumulative.

| Role | Allows |
| --- | --- |
| Microsoft Sentinel Reader | View data, incidents, workbooks and other Sentinel resources |
| Microsoft Sentinel Responder | Reader permissions plus manage incidents (assign, change status) |
| Microsoft Sentinel Contributor | Responder permissions plus create and edit analytics rules, workbooks and other resources, install and update content hub solutions |
| Microsoft Sentinel Playbook Operator | List, view and manually run playbooks |
| Microsoft Sentinel Automation Contributor | Lets Microsoft Sentinel add playbooks to automation rules. Not for user accounts |

Related roles that appear in exam scenarios:

| Requirement | Role |
| --- | --- |
| Create and edit playbooks (Consumption logic apps) | Logic App Contributor |
| Create or delete workbooks | Microsoft Sentinel Contributor (or a lesser Sentinel role) + Workbook Contributor |
| Guest user who must assign incidents | Microsoft Sentinel Responder + Directory Reader (Microsoft Entra role) |
| Connect a data source | Write permission on the workspace, plus what the connector page lists |
| Grant Sentinel permission to run the playbooks of a resource group | Owner (or User Access Administrator) on that resource group |
| Read the Sentinel data lake for every workspace | A Microsoft Entra role such as Security Reader, Security Operator, Security Administrator or Global Reader |
| Write to data lake tables, manage data lake jobs | Security Operator or Security Administrator (Microsoft Entra) |

> **Exam trap.** Microsoft Sentinel Responder lets an analyst open the incident but not run a playbook on it: running a playbook manually needs Microsoft Sentinel Playbook Operator. Attaching a playbook to an automation or analytics rule needs Microsoft Sentinel Contributor.

Owner, Contributor and Reader on the resource group also give access to Sentinel, much more broadly: avoid them for analysts. For finer separation, use resource-context RBAC or table-level RBAC on the workspace.

<!-- section: content-hub | objectives: 4.2.3 -->
## Content hub solutions

The **content hub** delivers out-of-the-box content either as **solutions** (packages of data connectors, analytics rule templates, hunting queries, workbooks, parsers and playbook templates for one product or scenario) or as **standalone content** items.

| Action | How |
| --- | --- |
| Install one solution | Select it > **View details** > **Create** (or **Update**); choose subscription, resource group and workspace; **Review + create** |
| Install with its required connectors | **Install with dependencies** |
| Install or update in bulk | List view, select the items, **Install/Update** |
| Deploy as code | **Download a template for automation** |
| See what a solution contains | **Manage** on its details page |
| Find updates | **Update** in the status column and the **Updates** counter |
| Role required | Microsoft Sentinel Contributor at the resource group |

Installing a solution adds **templates**, not active content. You still have to act on each item:

| Content type | What turns it on |
| --- | --- |
| Data connector | Complete the connector's configuration steps; status becomes **Connected** when data arrives |
| Analytics rule template | **Open** > **Create rule** from the template gallery; an existing rule is edited from its active rule link |
| Workbook template | **View template**, then **Save** to create an instance |
| Hunting query | **Run query**, or clone it to customize |
| Parser | Added automatically as a workspace function |
| Playbook template (preview) | **Create playbook** |

> **Exam trap.** To use one item of a solution, you must install the entire solution. Updating a solution updates its templates: rules you already created from an older template stay unchanged until you edit them.

The support box of each item shows who supports it: Microsoft or the partner that publishes it.

<!-- section: automation | objectives: 4.2.8 -->
## Automation rules and playbooks

**Automation rules** handle incidents centrally without code. **Playbooks** are Azure Logic Apps workflows for multi-step responses and calls to external systems; automation rules run them.

| Automation rule element | Values |
| --- | --- |
| Trigger | **When incident is created**, **When incident is updated**, **When alert is created** (alerts of Scheduled, NRT and Microsoft security analytics rules; in the Defender portal, not for alerts created by Defender XDR) |
| Conditions | Incident properties with operators such as equals, contains, starts with; on update: changed, changed from, changed to, added; **Updated by**. The alert trigger accepts only the analytics rules as condition |
| Actions | Run playbook, change status (closing reason and comment), change severity, assign owner, add tags, add task |
| Order | Rules run sequentially by their **order** number; actions run in the listed order. Created-trigger rules run before updated-trigger rules |
| Expiration | Optional date after which the rule is disabled, for example during a penetration test |

| Requirement | Answer |
| --- | --- |
| Assign every high-severity incident to the tier-2 team, no code | Automation rule, incident created trigger, assign owner |
| Suppress incidents during a planned test | Automation rule that closes them, with an expiration date |
| Open a ticket in an ITSM tool and post to Teams | Playbook, run by an automation rule |
| Run a playbook on one alert or entity on demand | Manual run (Playbook Operator) |
| Apply one response to many analytics rules | One automation rule whose condition lists those rules |

Playbook rules to remember:

- The Microsoft Sentinel connector of Logic Apps offers an **incident** trigger (incident with its alerts and entities), an **alert** trigger and an **entity** trigger. Incident-trigger playbooks run only from incident-trigger automation rules, alert-trigger playbooks only from alert-trigger rules.
- Both **Consumption** and **Standard** logic apps are supported. With Standard: no playbook templates (create the workflow manually), no stateless workflows, and an access restriction policy is needed for private endpoints.
- The playbook authenticates to Sentinel with a **managed identity**, a service principal or a Microsoft Entra user. For the managed identity, assign **Microsoft Sentinel Responder** on the workspace if the playbook updates incidents or watchlists, **Microsoft Sentinel Reader** if it only receives incidents.
- Automation rules run playbooks through a Microsoft Sentinel **service account**, which needs **Microsoft Sentinel Automation Contributor** on the playbook's resource group (**Manage playbook permissions**). After that, any automation rule can run any playbook of that group.

> **Exam trap.** The playbook appears in the automation rule but fails to run: the Sentinel service account wasn't granted permissions on the playbook's resource group. Giving the analyst more roles doesn't fix it.

For a workspace onboarded to the Defender portal, incident creation happens in the Defender portal: Sentinel incident creation rules must be disabled, and changes made to one incident within 5 to 10 minutes are sent as a single update. Automation rules export to ARM templates for reuse in other workspaces.

<!-- section: retention | objectives: 4.2.9 -->
## Data retention in Microsoft Sentinel data stores

Sentinel data lives in two tiers:

| Tier | Use | Retention |
| --- | --- | --- |
| Analytics tier | Analytics rules, hunting, workbooks, playbooks, fast queries | Workspace default 30 days; **90 days free** for Sentinel tables; up to **2 years (730 days)** at extra cost |
| Data lake tier | Low-cost storage of high-volume or secondary data; KQL jobs, notebooks, search jobs, summary rules | Up to **12 years** total retention |

Each table has two settings: **analytics retention** and **total retention**. The difference between the two is long-term retention. In the Defender portal, set them in **Data & connectors** > **Tables**; in the Azure portal, on the **Tables** page of the workspace.

| Rule | Detail |
| --- | --- |
| Total retention | Up to 12 years (4,383 days) for every table plan |
| Basic plan | Fixed 30-day query window; only total retention is configurable |
| Auxiliary (data lake) plan | Queryable for the whole total retention; only total retention is configurable |
| Lowering analytics retention | Immediate; the rest of the total retention becomes long-term retention |
| Lowering total retention | Data is deleted after a 30-day delay, so the change can be reverted |
| Data lake onboarding | Analytics-tier data is mirrored to the data lake for the same retention period; keeping it in the lake beyond the analytics retention is billed as data lake storage |
| Data only in the lake | No analytics rules, hunting queries, workbooks or playbooks on it; KQL jobs can promote it to the analytics tier |
| Long-term data of an Analytics table | Search job (results in a `_SRCH` table) or restore (`_RST` table) |

```bash
# Keep SecurityEvent 180 days in the analytics tier and 2 years in total
az monitor log-analytics workspace table update \
  --resource-group rg-sentinel --workspace-name law-contoso-sec \
  --name SecurityEvent --retention-time 180 --total-retention-time 730
```

In Azure CLI, `--total-retention-time` goes up to 2,556 days (seven years); for up to 12 years, use the portal, the REST API or PowerShell (`Update-AzOperationalInsightsTable`).

> **Exam trap.** Increasing analytics retention to keep logs for audit is the expensive answer. When the requirement is "keep for seven years at the lowest cost, query occasionally", keep a short analytics retention and set a long total retention.

<!-- section: key-points -->
## Key points

- Sentinel is enabled on a Log Analytics workspace (Contributor on the subscription); no legacy pricing tier, no lock, no move afterwards.
- In the Defender portal: one primary workspace per tenant, correlated with Defender XDR; Security Administrator plus Owner (or User Access Administrator + Sentinel Contributor) to onboard it.
- Reader views, Responder manages incidents, Contributor creates content and installs solutions, Playbook Operator runs playbooks manually.
- Content hub installs templates; create rules and workbooks from them. Microsoft Sentinel Contributor at the resource group.
- Automation rules: trigger, conditions, ordered actions, optional expiration. Playbooks need the Sentinel service account to have Microsoft Sentinel Automation Contributor on their resource group.
- Analytics tier: 90 days free, up to 2 years; total retention up to 12 years in the data lake.
