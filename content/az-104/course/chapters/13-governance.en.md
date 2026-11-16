Governance is the set of rules that keeps subscriptions compliant, organized and within budget: Azure Policy says what resources may look like, locks protect them from accidents, tags classify them, and management groups, subscriptions and resource groups structure them.

<!-- section: azure-policy | objectives: 1.3.1 -->
## Azure Policy

Azure RBAC controls **who** may act; Azure Policy controls **what** the resources may be, whoever acts. Even an Owner is subject to policies.

| Object | Role |
| --- | --- |
| Policy definition | A rule: a condition (`if`) and an effect (`then`). Built-in (Allowed locations, Require a tag on resources...) or custom |
| Initiative (policy set) | A group of definitions assigned together, with one compliance state |
| Assignment | A definition or initiative applied to a **scope**: management group, subscription or resource group. It is inherited by child scopes; child scopes can be listed as **exclusions** |
| Exemption | A resource or scope left assigned but not evaluated, with a category: **Waiver** (non-compliance accepted) or **Mitigated** (intent met another way), and an optional expiration date |

```json
{
  "if": {
    "allOf": [
      { "field": "location", "notIn": "[parameters('allowedLocations')]" },
      { "field": "location", "notEquals": "global" }
    ]
  },
  "then": { "effect": "deny" }
}
```

Effects:

| Effect | What it does |
| --- | --- |
| `deny` | Rejects the create or update request that matches the rule |
| `audit` | Lets the request through and reports the resource as non-compliant |
| `append` | Adds fields to the request (for example an IP rule) |
| `modify` | Adds, replaces or removes properties or tags; can fix existing resources through remediation |
| `auditIfNotExists` | Reports when a **related** resource is missing (for example a diagnostic setting) |
| `deployIfNotExists` | Deploys the related resource when it is missing (for example an extension) |
| `denyAction` | Blocks an action on matching resources; currently the delete action |
| `disabled` | Turns the rule off |

Evaluation rules you are asked about:

- A policy applies to resources **created or updated** after the assignment. **Existing resources** are evaluated and reported as non-compliant, but `deny` never deletes or modifies them.
- To fix existing resources with `modify` or `deployIfNotExists`, create a **remediation task**. It runs with the **managed identity** of the assignment, which needs the roles listed in the definition (the portal grants them; on the command line you assign them yourself).
- Compliance is evaluated when the assignment is created or changed, when a resource changes, and in a full cycle every 24 hours. Force it with `az policy state trigger-scan` or `Start-AzPolicyComplianceScan`.
- Several assignments are **cumulative**: the most restrictive result wins. A lower scope can't relax a policy assigned higher.
- **Enforcement mode** *Disabled* (`DoNotEnforce`) evaluates and reports without applying the effect: useful to test a `deny` before enforcing it.

> **Exam trap.** *Allowed locations* restricts the location of **resources**. *Allowed locations for resource groups* restricts only where resource groups are created; a resource group located in one region can contain resources of any region.

```bash
az policy assignment create --name allowed-locations \
  --policy "<definition name or ID>" --scope "/subscriptions/<id>" \
  --params '{ "listOfAllowedLocations": { "value": ["westeurope","northeurope"] } }'
```

<!-- section: resource-locks | objectives: 1.3.2 -->
## Resource locks

A lock protects against accidental changes, **whatever the user's role**.

| Lock (portal name) | Allowed | Blocked |
| --- | --- | --- |
| `CanNotDelete` (Delete) | Read and modify | Delete |
| `ReadOnly` (Read-only) | Read (GET) | Delete, modify, and every POST action |

- Locks apply to **subscriptions, resource groups and resources**, not to management groups. A lock is **inherited** by everything below, including resources added later; the most restrictive lock wins.
- Locks act on the **control plane** only. A `ReadOnly` lock on a storage account doesn't prevent writing blobs, but it blocks listing the keys (`listKeys` is a POST) and therefore breaks the tools that rely on keys. A `ReadOnly` lock on a resource group prevents starting or restarting its virtual machines (POST actions).
- A `CanNotDelete` lock on one resource makes the deletion of its whole resource group fail.
- Managing locks requires `Microsoft.Authorization/locks/*`: **Owner** or **User Access Administrator**. Contributor can't. To delete a locked resource, remove the lock first.

```bash
az lock create --name no-delete --lock-type CanNotDelete --resource-group RG1
```

```powershell
New-AzResourceLock -LockName no-delete -LockLevel CanNotDelete -ResourceGroupName RG1
```

<!-- section: tags | objectives: 1.3.3 -->
## Tags

A tag is a name-value pair (`CostCenter = 1234`) used to classify resources, filter them and break down costs in Cost analysis.

- Tags apply to resources, resource groups and subscriptions, not to management groups.
- **Tags aren't inherited.** A resource doesn't receive the tags of its resource group or subscription.
- Up to 50 tags per resource; name up to 512 characters (128 for storage accounts), value up to 256. Names are case-insensitive, values are case-sensitive.
- Applying tags requires write access to the resource (Contributor) or the **Tag Contributor** role.

Enforce tags with built-in policies:

| Policy | Effect |
| --- | --- |
| Require a tag on resources / on resource groups | `deny`: creation without the tag is refused |
| Inherit a tag from the resource group | `modify`: adds or replaces the tag with the resource group's value |
| Inherit a tag from the resource group if missing | `modify`: adds it only when the resource has none |
| Add a tag to resources | `modify`: adds the tag with a given value |

Existing resources are tagged by a remediation task.

```bash
# Merge keeps the other tags; Replace overwrites the whole set; Delete removes the listed tags
az tag update --resource-id <id> --operation Merge --tags CostCenter=1234
```

```powershell
Update-AzTag -ResourceId <id> -Tag @{ CostCenter = "1234" } -Operation Merge
```

<!-- section: resource-groups | objectives: 1.3.4 -->
## Resource groups

- A resource belongs to exactly one resource group; resource groups can't be nested or **renamed**.
- The **location** of a resource group is where its metadata is stored. Its resources can be in any region.
- Deleting a resource group deletes everything in it. Resources that share a life cycle belong together.
- A resource group is a scope for role assignments, policies, locks and budgets.

**Moving resources** to another resource group or subscription:

- The resource keeps its **region**. Only the resource group changes, and therefore the **resource ID**: update scripts, alerts and dashboards that reference it.
- During the move, both resource groups are locked for writes and deletes, but the resources keep running.
- Between subscriptions, both must be in the **same Microsoft Entra tenant**, the destination must have the resource provider registered, and a resource must move **together with its dependent resources** (a virtual machine with its disks and network interface), from one single resource group.
- Not every resource type can be moved; check before moving.
- Required permissions: `moveResources` action on the source resource group and write on the destination.
- Role assignments made directly on the resource don't follow. A lock on the source or destination blocks the move.

```bash
az resource move --destination-group RG2 --ids <resource id 1> <resource id 2>
```

```powershell
Move-AzResource -DestinationResourceGroupName RG2 `
  -DestinationSubscriptionId <id> -ResourceId <resource id>
```

Moving to another **region** is a different operation, done with Azure Resource Mover or by redeployment.

<!-- section: subscriptions | objectives: 1.3.5 -->
## Subscriptions

A subscription is a billing unit, a boundary for quotas and a scope for access and policy. Organizations separate subscriptions by environment (production, development), department or billing.

- **Quotas** (for example vCPUs per region and per virtual machine family) are set per subscription. Request an increase from the **Quotas** page or with a support request.
- **Resource providers** are registered per subscription.
- A subscription trusts one tenant. **Changing the directory** requires an account that is Owner of the subscription and exists in both tenants. Afterwards, all role assignments are lost, custom roles are deleted, and managed identities must be recreated or re-enabled. Billing ownership is transferred separately.
- A subscription can be **canceled**; its resources are then stopped and deleted after a retention period.
- Subscription-level roles: Owner, Contributor, Reader. Billing has its own roles (for example Billing Reader, Cost Management Reader, Cost Management Contributor).

<!-- section: costs | objectives: 1.3.6 -->
## Managing costs

| Tool | Use |
| --- | --- |
| Cost analysis | Explore actual and forecasted costs; group and filter by resource group, service, location or **tag** |
| Budgets | An amount per month, quarter or year at a scope (management group, subscription, resource group), with alerts |
| Cost alerts | **Budget alerts** (thresholds), **anomaly alerts** (unusual daily usage, at subscription scope), credit and quota alerts for some agreements |
| Azure Advisor | Recommendations in five categories: **Cost**, Security, Reliability, Operational excellence, Performance |
| Pricing calculator | Estimate the price of a design before deployment |

Budgets:

- Alert thresholds are **percentages** of the budget, evaluated on **Actual** cost (already spent) or **Forecasted** cost (projected for the period: warns *before* the overspend).
- A budget **never stops or blocks** resources. It notifies by email and can call an **action group**, which can run an automation runbook, an Azure function or a logic app that stops resources.
- Cost data is refreshed several times a day, so a budget alert isn't immediate.

Advisor cost recommendations: resize or shut down **underutilized virtual machines** (the CPU threshold is configurable per subscription in Advisor's configuration), buy reservations or savings plans, delete unattached public IP addresses and unused disks.

Ways to lower the bill: **reservations** (commit one or three years to a resource type and region), **savings plan for compute** (commit to an hourly amount), **Azure Hybrid Benefit** (reuse Windows Server and SQL Server licenses), **Spot** virtual machines for interruptible workloads, deallocating virtual machines (a machine that is only *stopped* from the operating system is still billed for compute), choosing storage tiers.

<!-- section: management-groups | objectives: 1.3.7 -->
## Management groups

Management groups organize subscriptions so that policies and role assignments are applied once and inherited.

- Each tenant has one **Tenant root group**; every management group and subscription is below it.
- Up to **six levels** of depth below the root (root and subscription levels not counted); up to 10,000 management groups per tenant.
- A management group or subscription has exactly **one parent**.
- New subscriptions land in the root management group by default (a default management group can be configured).
- A management group can be deleted only when it is **empty**.
- Azure Policy and role assignments made on a management group apply to all its subscriptions, present and future. Locks and tags don't exist at this level.
- To move a subscription you need Owner on the subscription and write permission on the target and current parent management groups (Owner, Contributor or Management Group Contributor). If your Owner role on the subscription is only inherited from its current management group, you can move it only to a management group where you are Owner too.
- At first use, a Global Administrator may need to elevate access to manage the root group.

```bash
az account management-group create --name mg-prod --display-name "Production"
az account management-group subscription add --name mg-prod --subscription "Sub1"
```

Typical design: root > *Production* and *Non-production* management groups, an initiative of security policies assigned at the root, Allowed locations assigned per branch, and Reader for auditors at the top.

<!-- section: key-points -->
## Key points

- Policy = what is allowed (even for Owner); RBAC = who is allowed.
- `deny` blocks new non-compliant requests and never touches existing resources; `modify` and `deployIfNotExists` fix existing ones through a remediation task and a managed identity.
- Locks: `CanNotDelete` and `ReadOnly`, inherited, control plane only, managed by Owner or User Access Administrator; not on management groups.
- Tags aren't inherited; use the *Inherit a tag* policies. 50 tags per resource.
- A move changes the resource group and the resource ID, never the region.
- Budgets alert (actual or forecasted) but never stop resources by themselves.
- Management groups: six levels, one parent, new subscriptions in the root, delete only when empty.
