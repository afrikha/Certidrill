Governance questions ask how to organize subscriptions so that a rule is set once and inherited, how to enforce and prove compliance, and how to stop access rights from accumulating. The answers combine the resource hierarchy, tags, Azure Policy and Microsoft Entra ID Governance.

<!-- section: hierarchy | objectives: 1.3.1 -->
## Management groups

Management groups sit above subscriptions. Azure Policy assignments and Azure RBAC role assignments made on a management group are inherited by every management group, subscription, resource group and resource below it. The Azure landing zone reference of the Cloud Adoption Framework looks like this:

```text
Tenant root group
└── Contoso                   (intermediate root: policies for the whole organization)
    ├── Platform
    │   ├── Management        (subscription: Log Analytics workspace, automation)
    │   ├── Connectivity      (subscription: hubs, firewalls, private DNS zones)
    │   ├── Identity          (subscription: domain controllers)
    │   └── Security          (subscription: Microsoft Sentinel)
    ├── Landing zones
    │   ├── Corp              (subscriptions: workloads connected to the corporate network)
    │   └── Online            (subscriptions: internet-facing workloads)
    ├── Sandbox               (subscriptions: experiments, relaxed policies)
    └── Decommissioned        (canceled subscriptions)
```

| Rule | Value |
| --- | --- |
| Hierarchies per Microsoft Entra tenant | One, under the tenant root group |
| Depth | Six levels, not counting the root and the subscription level |
| Management groups per tenant | 10,000 |
| Parents | Exactly one per management group and per subscription |
| New subscriptions | Placed under the root, unless a default management group is configured |
| Access to the root | Nobody by default; a Global Administrator can elevate access |

Design recommendations:

- Keep the hierarchy **flat**: three to four levels.
- Build it on **policy and access requirements** (workloads that share the same rules), not on the organization chart, not on regions and not on environments. Production, test and development are separate subscriptions inside the same management group.
- Don't assign at the tenant root group: create an intermediate root and assign there, so that exceptions stay possible.
- Configure a **default management group** (the sandbox, for example) so that new subscriptions never land at the root, and require authorization to create management groups: by default, any principal of the tenant can create one.
- Give workload teams their roles at the subscription or resource group, not at a management group.

> **Exam trap.** Resource locks can't be applied to a management group: their scopes are the subscription, the resource group and the resource. Azure Policy and Azure RBAC are the two controls that a management group propagates.

<!-- section: subscriptions-resource-groups | objectives: 1.3.1 -->
## Subscriptions and resource groups

A subscription is a unit of management, billing and scale, and a boundary for policies and quotas. It isn't tied to a region.

| Reason to add a subscription | Example |
| --- | --- |
| Environment that is managed differently | Production with strict policies; development with relaxed policies and other administrators |
| Policy or compliance boundary | A workload subject to PCI DSS |
| Scale | A large workload that would exhaust the limits of a shared subscription |
| Billing | A business unit that must receive its own invoice |
| Platform function | Management, connectivity, identity and security each in their own subscription |

Not sufficient reasons: one subscription per region (only data sovereignty justifies it) or per small application. For chargeback inside a subscription, tags are enough. Large organizations automate creation with **subscription vending**: a request produces a subscription already placed in the right management group, with its policies, roles and network. To keep subscriptions from leaving or entering the tenant, restrict directory transfers in the subscription policies.

Resource groups follow other rules:

| Rule | Design consequence |
| --- | --- |
| Resources of a group share a life cycle | Group what is deployed, updated and deleted together; a shared database with its own life cycle goes in another group |
| A resource belongs to exactly one group and can be moved | Reorganizing is possible, but direct role assignments must be recreated |
| The location of the group is where its metadata is stored | Choose it for data residency; resources may be in other regions, though the same region is recommended |
| A group is a scope for roles, policies, locks and cost analysis | One group per application and environment makes delegation and cost reading simple |
| Deleting the group deletes everything in it | Put a `CanNotDelete` lock on the groups of critical resources |

<!-- section: tagging | objectives: 1.3.1 -->
## Tagging strategy

Tags are name-value pairs for what the hierarchy can't express: cost centers, owners, criticality. Facts that decide answers:

- Up to **50** tags per resource, resource group or subscription; name up to 512 characters (128 for storage accounts), value up to 256.
- Tag names are case-insensitive, values are case-sensitive: agree on one spelling.
- Tags are **not inherited**: a resource doesn't receive the tags of its resource group or subscription.
- Tags are stored in plain text and appear in cost reports: never put secrets in them. Some resource types don't support tags.
- The Tag Contributor role manages tags without giving access to the resources.

| Category | Purpose | Examples |
| --- | --- | --- |
| Functional | Role of the resource in the workload | `app`, `tier`, `env` |
| Classification | Sensitivity and service level | `confidentiality`, `criticality`, `sla` |
| Accounting | Chargeback and budgets | `costcenter`, `department`, `program` |
| Purpose | Link to the business process | `businessprocess`, `businessimpact` |
| Ownership | Who answers for it | `businessunit`, `opsteam` |

A strategy that relies on people is not a strategy; enforce it with Azure Policy:

| Requirement | Built-in policy | Effect |
| --- | --- | --- |
| Refuse resources created without a `costcenter` tag | Require a tag on resources | `deny` |
| Resources must carry the `costcenter` of their resource group, existing resources included | Inherit a tag from the resource group | `modify`, with a remediation task for existing resources |
| Add a default value when the tag is missing | Add a tag to resources | `modify` |
| Measure the gap before enforcing | Require a tag on resources, assigned with enforcement disabled | `deny` evaluated and reported, not applied |

> **Exam tip.** "Costs must be reported per department" with resources of several departments in the same subscription is a tagging answer, completed by a policy that makes resources inherit the tag. It isn't a reason for one subscription per department unless each must receive a separate invoice.

<!-- section: compliance | objectives: 1.3.2 -->
## Managing compliance

**Azure Policy** evaluates resources against rules, whoever acts: an Owner is subject to it. A **definition** holds a rule and an effect; an **initiative** groups definitions towards one goal; an **assignment** applies either to a management group, subscription or resource group, minus optional exclusions. Assignments are cumulative and the most restrictive result wins: a lower scope can't relax what a higher scope denies. An **exemption** keeps a resource in the assignment without evaluating it, with a category (Waiver: non-compliance accepted temporarily; Mitigated: the intent is met another way) and an optional expiration date.

| Effect | Use in a design |
| --- | --- |
| `deny` | Prevent the creation or update of a non-compliant resource |
| `audit`, `auditIfNotExists` | Report without blocking; first step before enforcing |
| `modify`, `append` | Correct the request: add tags or properties |
| `deployIfNotExists` | Deploy what is missing beside a resource: diagnostic settings, agents, extensions |
| `denyAction` | Block an action on existing resources, such as deletion |
| `manual` | Attestation by a person for controls that can't be evaluated automatically |

Existing resources are evaluated and reported, never changed by `deny`. To bring them into compliance, `modify` and `deployIfNotExists` assignments run **remediation tasks** with a managed identity that needs the roles to make the change.

| Requirement | Recommend |
| --- | --- |
| Data must stay in approved regions; only approved SKUs or resource types | Azure Policy with `deny` (Allowed locations, for example) assigned at a management group |
| Measure compliance with ISO 27001, PCI DSS or NIST and show it to auditors | The built-in regulatory compliance initiatives, read in the regulatory compliance dashboard of Microsoft Defender for Cloud |
| Check or enforce settings inside the operating system of Azure and Arc-enabled machines | Azure machine configuration, assigned through Azure Policy |
| Protect critical resources against deletion, whatever the role | Resource lock `CanNotDelete` |
| Deploy resources as one unit and stop anyone else from changing or deleting them | Deployment stack with deny settings (`denyDelete`, `denyWriteAndDelete`) |
| Share approved, versioned templates in the organization | Template specs |

Microsoft Defender for Cloud assigns the Microsoft cloud security benchmark by default and shows each added standard as a set of controls, compliant or not.

Locks and deny settings act on the **control plane** only: a `ReadOnly` lock on a storage account doesn't prevent writing blobs, but it blocks listing the account keys. Among the general roles, Owner and User Access Administrator manage locks; Contributor can't.

> **Exam trap.** Azure Blueprints is being retired (final date January 31, 2027). Don't recommend it for a new design: deployment stacks and template specs, combined with policy assignments at management groups, replace it.

<!-- section: identity-governance | objectives: 1.3.3 -->
## Identity governance

Microsoft Entra ID Governance answers who has access, whether they still need it and who approved it.

| Need | Feature | What to remember |
| --- | --- | --- |
| Administrative rights only when needed, for a limited time, with approval, multifactor authentication and justification | Privileged Identity Management (PIM) | **Eligible** assignments are activated on demand; **active** ones need no action. Covers Microsoft Entra roles, Azure resource roles and groups |
| Confirm periodically that members, guests and administrators still need their access, and remove it otherwise | Access reviews | Recurring; reviewers are owners, chosen people or the users themselves. Reviews of roles are created in PIM, reviews of access packages in entitlement management |
| Let employees and partners request a bundle of groups, applications and SharePoint sites, with approval and expiration | Entitlement management | Access packages grouped in catalogs; connected organizations for partners; the guest account can be removed when its last assignment ends; catalogs can be delegated to business owners |
| Automate tasks when people join, move or leave | Lifecycle workflows | Triggered by attributes such as the hire date: temporary access pass, group membership, account disabling |
| Create and update accounts from the HR system | HR-driven provisioning | Workday or SuccessFactors as the source |
| Make users accept legal terms before access | Terms of use | Enforced as a Conditional Access control |

Licences decide between two plausible answers:

| Licence | Brings |
| --- | --- |
| Microsoft Entra ID P1 | Conditional Access with terms of use, HR-driven provisioning |
| Microsoft Entra ID P2 | PIM, access reviews and entitlement management in their basic form |
| Microsoft Entra ID Governance | Lifecycle workflows and the advanced capabilities: reviews limited to inactive users, machine learning recommendations, automatic assignment policies |

Who manages PIM depends on the roles: Privileged Role Administrator (or Global Administrator) for Microsoft Entra roles; Owner or User Access Administrator of the resource for Azure roles.

> **Exam trap.** PIM limits when a privileged role is held; access reviews check whether the assignment should still exist. "Administrators must request the role for four hours" is PIM; "every quarter, managers must confirm who keeps the role" is an access review, created in PIM because it concerns roles.

<!-- section: key-points -->
## Key points

- One management group hierarchy per tenant, six levels at most, kept to three or four; structure it by policy needs, with environments as subscriptions.
- A subscription is a boundary for management, billing, scale and policy; a resource group holds resources that share a life cycle.
- Tags aren't inherited: 50 per resource, enforced with `deny` and propagated with `modify` policies.
- Azure Policy controls what resources may be, whoever acts; remediation tasks fix existing resources; exemptions document exceptions.
- Regulatory compliance is measured with built-in initiatives and Microsoft Defender for Cloud; Azure Blueprints is retired in favour of deployment stacks and template specs.
- PIM for just-in-time privileged roles, access reviews for recertification, entitlement management for access packages, lifecycle workflows for joiners and leavers.
