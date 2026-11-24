Azure role-based access control (Azure RBAC) decides who can do what on which Azure resources. Exam questions give you a set of assignments and ask either which role to assign and where, or what a given user can finally do.

<!-- section: rbac-model | objectives: 1.2.1 -->
## The model: who, what, where

A **role assignment** links three elements:

| Element | Meaning | Values |
| --- | --- | --- |
| Security principal | Who | User, group, service principal, managed identity |
| Role definition | What | A list of allowed operations (built-in or custom role) |
| Scope | Where | Management group, subscription, resource group or resource |

A role definition is a JSON document:

```json
{
  "Name": "Virtual Machine Operator (custom)",
  "IsCustom": true,
  "Description": "Start, restart and deallocate virtual machines.",
  "Actions": [
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Compute/virtualMachines/start/action",
    "Microsoft.Compute/virtualMachines/restart/action",
    "Microsoft.Compute/virtualMachines/deallocate/action"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [ "/subscriptions/<subscription id>" ]
}
```

| Property | Role |
| --- | --- |
| `Actions` | Control plane operations allowed. `*` is a wildcard |
| `NotActions` | Operations **subtracted** from `Actions`. Effective permissions = Actions minus NotActions |
| `DataActions` / `NotDataActions` | Same logic for data plane operations (read a blob, read a secret) |
| `AssignableScopes` | Where the role can be assigned. For a custom role: management groups, subscriptions or resource groups |

> **Exam trap.** `NotActions` isn't a deny. If another assignment grants the operation that a role excludes, the user has it.

Operation names follow `{Provider}/{resource type}/{operation}`, with `read`, `write`, `delete` or `{name}/action`. Examples: `Microsoft.Storage/storageAccounts/listKeys/action`, `Microsoft.Authorization/roleAssignments/write`.

**Custom roles** are created when no built-in role fits (portal: Access control (IAM) > Add > Add custom role, by cloning a role, starting from scratch or from JSON; `az role definition create --role-definition role.json`; `New-AzRoleDefinition -InputFile role.json`). Creating one requires `Microsoft.Authorization/roleDefinitions/write` on every assignable scope: Owner or User Access Administrator. A custom role with `DataActions` can't be assigned at the management group scope, and a custom role can list only one management group in `AssignableScopes`.

<!-- section: built-in-roles | objectives: 1.2.1 -->
## Built-in roles to know

The fundamental roles apply to every resource type:

| Role | Manage resources | Assign roles | Notes |
| --- | --- | --- | --- |
| Owner | Yes | Yes | `Actions: *` |
| Contributor | Yes | No | `*` minus `Microsoft.Authorization/*/Write` and `/Delete`, among others. Can't assign roles or manage locks |
| Reader | Read only | No | `*/read`. Can't read secrets such as storage keys (`listKeys` is an action, not a read) |
| User Access Administrator | No | Yes | `Microsoft.Authorization/*`: role assignments, custom roles, locks |
| Role Based Access Control Administrator | No | Yes | Role assignments only, optionally limited by a **condition** (which roles, to which principals). Preferred for delegation |

Job function roles are limited to a service:

| Role | What it allows | What it doesn't |
| --- | --- | --- |
| Virtual Machine Contributor | Create and manage virtual machines and their disks | Manage the virtual network or the storage account they connect to; sign in to the machine |
| Virtual Machine Administrator Login / Virtual Machine User Login | Sign in to a virtual machine with Microsoft Entra ID, as administrator or as standard user | Manage the virtual machine |
| Network Contributor | Manage networks (virtual networks, NSGs, route tables, load balancers) | Manage virtual machines |
| Storage Account Contributor | Manage storage accounts, **including access keys** | Nothing through Microsoft Entra data access, but the keys give full access to data |
| Storage Blob Data Reader / Contributor / Owner | Read / read-write-delete / full access including POSIX ACLs on blob data | Manage the account |
| Storage File Data SMB Share Reader / Contributor / Elevated Contributor | Read / modify / modify plus change NTFS permissions on Azure file shares over SMB | Manage the account |
| Key Vault Secrets User | Read secret contents (vaults using the Azure RBAC permission model) | Manage the vault |
| AcrPull / AcrPush | Pull / pull and push images in a container registry | Manage the registry |
| Monitoring Reader / Monitoring Contributor | Read all monitoring data / also edit alert rules and diagnostic settings | |
| Backup Reader / Operator / Contributor | View / also run backups and restores / also manage policies and stop protection | Backup Operator can't remove backups or manage policies |
| Tag Contributor | Manage tags on any resource | Access the resources themselves |

To read blob data in the portal with a Microsoft Entra identity, a user needs **two** roles: Reader (to navigate to the account) and a data role such as Storage Blob Data Reader.

> **Exam trap.** A user who holds `listKeys` (Owner, Contributor, Storage Account Contributor) reads the data through the account key in the portal, whatever the data roles. To force Microsoft Entra authorization, disable Shared Key authorization on the account.

<!-- section: scopes | objectives: 1.2.2 -->
## Assigning roles at different scopes

```text
Tenant root group
└── Management group
    └── Subscription          /subscriptions/{id}
        └── Resource group    /subscriptions/{id}/resourceGroups/RG1
            └── Resource      .../providers/Microsoft.Compute/virtualMachines/VM1
```

An assignment is **inherited** by every child scope, including the children created or moved there later. Choosing a scope means choosing the narrowest level that still contains everything required:

| Requirement | Scope |
| --- | --- |
| One virtual machine | The resource |
| All the resources of an application, present and future | Its resource group |
| "Including resource groups created later" | The subscription |
| "Including subscriptions added later" | The management group |

Some resources have sub-scopes: a blob container (`.../blobServices/default/containers/invoices`), a file share, a subnet.

In the portal, open the scope first, then **Access control (IAM) > Add > Add role assignment**: *Role* tab, *Members* tab, optionally *Conditions*, then *Review + assign*.

```bash
az role assignment create --assignee ana@contoso.com \
  --role "Virtual Machine Contributor" \
  --scope "/subscriptions/<id>/resourceGroups/RG-Web"

# Managed identity: use the object ID and the principal type
az role assignment create --assignee-object-id <object id> \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope "<container resource ID>"
```

```powershell
New-AzRoleAssignment -SignInName ana@contoso.com `
  -RoleDefinitionName "Virtual Machine Contributor" -ResourceGroupName RG-Web
```

To assign roles you need `Microsoft.Authorization/roleAssignments/write`: Owner, User Access Administrator or Role Based Access Control Administrator at that scope.

Also remember:

- Prefer assigning roles to **groups**: one assignment, and membership then drives access.
- Guests and managed identities receive role assignments like any other principal.
- When a resource is **moved** to another resource group or subscription, the assignments made directly on it don't follow: they become orphaned and must be recreated. Inherited assignments are simply replaced by those of the new parent.
- When a subscription is transferred to another tenant, all its role assignments are permanently deleted.

<!-- section: interpret-access | objectives: 1.2.3 -->
## Interpreting access assignments

Rules for computing what a user can do on a resource:

1. Collect every role assignment that applies: made to the user or to a group the user belongs to (**transitively**, through nested groups), at the resource scope or at **any parent scope**.
2. Permissions are **additive**: the result is the union of all the roles. Reader inherited from the subscription plus Contributor on a resource group equals Contributor on that resource group and Reader elsewhere.
3. A lower scope can't remove what a higher scope grants. An inherited assignment can only be removed at the scope where it was made.
4. **Deny assignments** are checked first and win over any role assignment. You can't create them yourself: Azure creates them, for example for deployment stacks with deny settings and managed applications.
5. For a data operation, a role with the matching `DataActions` is required. Owner doesn't have any.
6. If the assignment has a **condition**, it is evaluated last.

Azure RBAC isn't the only check: a **resource lock** blocks the operation whatever the role, **Azure Policy** can deny the request, and the service's own firewall can block data access.

Worked example. Dev1 belongs to G-Dev. Assignments: G-Dev has Reader on Sub1; Dev1 has Contributor on RG-Test; G-Dev has Storage Blob Data Reader on the account st1 in RG-Prod.

| Question | Answer | Why |
| --- | --- | --- |
| Can Dev1 create a virtual machine in RG-Test? | Yes | Contributor on RG-Test |
| Can Dev1 restart a virtual machine in RG-Prod? | No | Only Reader is inherited there; restart is an action |
| Can Dev1 read a blob of st1 with Microsoft Entra authorization? | Yes | Data role inherited through the group |
| Can Dev1 give a colleague access to RG-Test? | No | Contributor excludes role assignment writes |

The **Access control (IAM)** page of any scope has these tabs:

| Tab | Shows |
| --- | --- |
| Check access | The assignments of one principal at this scope and inherited by it (not those made at child scopes) |
| Role assignments | Who holds which role at this scope, with the scope each assignment comes from |
| Roles | Role definitions and their permissions |
| Deny assignments | Deny assignments that apply |

There is no *Classic administrators* tab any more: classic administrator roles (Co-Administrator, Service Administrator) are fully retired since May 2026, and the tab was removed from the portal. In December 2025, Azure assigned Owner at subscription scope to the users who still held one of these roles. Manage access with Azure RBAC only.

```bash
# Current subscription only by default; add scopes explicitly
az role assignment list --assignee ana@contoso.com --all \
  --include-inherited --include-groups --output table
```

```powershell
Get-AzRoleAssignment -SignInName ana@contoso.com -ExpandPrincipalGroups
```

Changes can take a few minutes to apply; a user may need to sign out and sign in again when group membership changed.

<!-- section: key-points -->
## Key points

- Assignment = principal + role + scope; inherited downward; permissions add up.
- `NotActions` subtracts from the role itself; only deny assignments (created by Azure) deny.
- Contributor manages everything except access; User Access Administrator and Role Based Access Control Administrator manage access but not resources.
- Control plane roles don't give data access; storage data roles do. `listKeys` bypasses data roles.
- Least privilege = the most specific role at the narrowest scope that covers present and future resources.
- Moving a resource orphans its direct role assignments.
