Governance turns security intentions into controls that hold even when someone forgets: Azure Policy refuses or fixes non-compliant resources, Defender for Cloud measures posture against standards, locks and deny settings stop destructive changes, least-privilege roles limit what a compromised account can do, and the backup vault survives an attacker who has admin rights. Exam questions ask which control enforces a requirement and at which scope.

<!-- section: azure-policy | objectives: 1.3.1 -->
## Security controls with Azure Policy

A **definition** is a rule (`if` condition, `then` effect); an **initiative** groups definitions; an **assignment** applies one of them to a management group, subscription or resource group, inherited below, with optional exclusions. An **exemption** (category **Waiver** or **Mitigated**, optional expiry) skips a resource or scope.

| Effect | Security use |
| --- | --- |
| `deny` | Refuse creating or updating a non-compliant resource (public blob access, missing TLS 1.2) |
| `audit` | Report non-compliance without blocking |
| `auditIfNotExists` | Report a missing related resource (no diagnostic setting, no extension) |
| `deployIfNotExists` | Deploy the missing related resource (diagnostic setting, Defender plan, extension) |
| `modify` | Add, replace or remove properties and tags (for example disable public network access) |
| `append` | Add fields to the request |
| `denyAction` | Block an action, currently delete, on matching resources |
| `manual` | Compliance attested by a person (controls that can't be checked automatically) |
| `disabled` | Turn the rule off, often through an effect parameter |

Evaluation order on a request: `disabled`, then `append` and `modify`, then `deny`, `audit`, `manual`, `auditIfNotExists`, and `denyAction` last. `deny` never touches existing resources: they only show as non-compliant. `deployIfNotExists` and `modify` fix existing resources through a **remediation task**, which runs with the assignment's **managed identity**; that identity needs the roles listed in the definition's `roleDefinitionIds`. **Enforcement mode** *Disabled* reports without applying the effect: use it to test a `deny`.

A custom definition with a parameterized effect:

```json
{
  "mode": "All",
  "policyRule": {
    "if": {
      "allOf": [
        { "field": "type", "equals": "Microsoft.Storage/storageAccounts" },
        { "field": "Microsoft.Storage/storageAccounts/allowBlobPublicAccess", "equals": true }
      ]
    },
    "then": { "effect": "[parameters('effect')]" }
  },
  "parameters": {
    "effect": {
      "type": "String",
      "allowedValues": [ "Audit", "Deny", "Disabled" ],
      "defaultValue": "Audit"
    }
  }
}
```

```bash
az policy definition create --name deny-public-blob --mode All \
  --rules rules.json --params params.json
az policy assignment create --name deny-public-blob --policy deny-public-blob \
  --scope /subscriptions/<subscription id> --params '{ "effect": { "value": "Deny" } }'
az policy remediation create --name fix-diagnostics --policy-assignment <assignment id>
```

Creating definitions and assignments requires **Resource Policy Contributor** (or Owner); a remediation also needs the right to assign the identity's roles.

<!-- section: regulatory-compliance | objectives: 1.3.2 -->
## Regulatory compliance in Defender for Cloud

The **Regulatory compliance** dashboard shows, for each assigned standard, its controls and the resources that pass or fail them. The **Microsoft cloud security benchmark (MCSB)** is assigned by default (on AWS and GCP, with the provider's own default standard). Other standards (ISO/IEC 27001:2022, PCI DSS v4.0.1, NIST SP 800-53, SOC 2, CIS benchmarks, HIPAA, EU GDPR, DORA, EU AI Act...) are added:

- **Prerequisites**: any Defender for Cloud plan **except Defender for Servers Plan 1 and Defender for APIs Plan 1**, and **Owner** or **Policy Contributor** on the scope.
- **Steps**: **Regulatory compliance > Manage compliance policies >** management group, subscription, AWS account or GCP project **> Security policies >** toggle the standard **On** (set parameters if asked). Prefer the highest scope.
- Only controls that can be **assessed automatically** have a status: green (compliant), red (non-compliant), greyed out (manual: attest it yourself). A standard with no relevant resources doesn't appear.
- **Download audit reports** (Microsoft's certifications) or a report of your own status, and follow trends in the compliance-over-time workbook.

> **Exam trap.** A green control means the automated checks pass, not that you are certified. Greyed-out controls still need evidence.

<!-- section: defender-standards-recommendations | objectives: 1.3.3 -->
## Security standards and recommendations in Defender for Cloud

**Environment settings >** scope **> Security policies** lists three kinds of **security standards**: benchmarks (MCSB), regulatory standards and **custom standards**. Azure standards are Azure Policy initiatives. A resource failing a control produces a **recommendation**: description, severity, affected resources, remediation steps, sometimes a **Fix** button, risk factors and attack paths.

| Requirement | Feature |
| --- | --- |
| New resources must never be non-compliant | **Deny** on the MCSB recommendation (Security policies > MCSB > Manage recommendations); Azure only |
| New resources must be remediated automatically | **Enforce** on the recommendation details page (`DeployIfNotExists`) |
| The resource is protected by another tool | Exemption, category *Mitigated* (counts as healthy) |
| The risk is accepted | Exemption, category *Waiver* (excluded from the secure score) |
| Each finding needs an owner and a due date | **Governance rules** (Defender CSPM): owner by email or resource tag, 7, 14, 30 or 90 days, optional grace period, weekly emails |
| Your own check (KQL) | Custom recommendation in a custom standard (Defender CSPM) |

- Exemptions need the MCSB assigned and **Owner** or **Security Admin** (or Contributor, Resource Policy Contributor); they take up to 24 hours and don't apply to custom recommendations.
- **Security Admin** updates security policies, dismisses alerts and manages connectors; **Security Reader** views only.
- The **secure score** counts built-in MCSB recommendations; preview recommendations and risk prioritization don't change it.
- **Foundational CSPM** is free (recommendations, secure score, MCSB); **Defender CSPM** adds attack paths, cloud security explorer, agentless scanning, governance, CIEM and DSPM.

<!-- section: resource-locks | objectives: 1.3.4 -->
## Resource locks

| Lock (portal name) | Blocks |
| --- | --- |
| `CanNotDelete` (Delete) | Deleting the resource |
| `ReadOnly` (Read-only) | Deleting, modifying, and every POST action (such as `listKeys`) |

- Set on subscriptions, resource groups or resources (not management groups), inherited, most restrictive wins, applied **whatever the role**, Owner included.
- Managing locks requires `Microsoft.Authorization/locks/*`: Owner or User Access Administrator.
- Locks act on the **control plane**: a `CanNotDelete` lock on a key vault stops deletion of the vault, not of its secrets; a `ReadOnly` lock on a storage account blocks `listKeys` and tools that rely on keys.
- A lock blocks moving the resource and deleting its resource group.

```bash
az lock create --name protect-vault --lock-type CanNotDelete \
  --resource-group rg-security --resource-name kv-orders-prod-weu \
  --resource-type Microsoft.KeyVault/vaults
```

> **Exam trap.** Anyone who can manage locks can remove one. To stop even subscription Owners from deleting resources, use a **deployment stack** with deny settings (it creates a deny assignment) or a `denyAction` policy assigned above them.

<!-- section: built-in-role-assignments | objectives: 1.3.5 -->
## Azure built-in role assignments

Azure portal: **Access control (IAM) > Add > Add role assignment**. The **Role** tab separates **Job function roles** from **Privileged administrator roles**: Owner, Contributor, User Access Administrator, Role Based Access Control Administrator and Reservations Administrator.

| Need | Role |
| --- | --- |
| Manage Defender for Cloud policies, alerts, connectors | Security Admin |
| View posture and alerts only | Security Reader |
| Create policy definitions and assignments | Resource Policy Contributor |
| Delegate access management, limited to some roles or principals | Role Based Access Control Administrator **with a condition** |
| Read secrets in a vault | Key Vault Secrets User |
| Assign user-assigned identities | Managed Identity Operator |

| | Azure roles | Microsoft Entra roles |
| --- | --- | --- |
| Control | Azure resources through Azure Resource Manager | Entra objects (users, groups, apps) through Microsoft Graph |
| Scopes | Management group, subscription, resource group, resource | Tenant, administrative unit, application, group |
| Examples | Owner, Contributor, Security Admin | Global Administrator, Security Administrator, Privileged Role Administrator |

A **Global Administrator** has no Azure access by default; **Access management for Azure resources** (elevate access) grants User Access Administrator at the root scope (`/`). Turn it off afterwards.

> **Exam trap.** The Entra role **Security Administrator** and the Azure role **Security Admin** are different roles in different systems. Questions about Defender for Cloud on a subscription want the Azure role.

<!-- section: custom-roles | objectives: 1.3.6 -->
## Custom roles: Azure and Microsoft Entra

An **Azure custom role** lists `Actions`, `NotActions`, `DataActions`, `NotDataActions` and `AssignableScopes`. Creating it requires `Microsoft.Authorization/roleDefinitions/write` (Owner or User Access Administrator). Don't use `*` wildcards: they grant operations added later.

```json
{
  "Name": "NSG Rule Operator (custom)",
  "IsCustom": true,
  "Description": "Read NSGs and manage their security rules.",
  "Actions": [
    "Microsoft.Network/networkSecurityGroups/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/read",
    "Microsoft.Network/networkSecurityGroups/securityRules/write",
    "Microsoft.Network/networkSecurityGroups/securityRules/delete"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [ "/subscriptions/<subscription id>/resourceGroups/rg-network" ]
}
```

```bash
az role definition create --role-definition nsg-operator.json
```

A **Microsoft Entra custom role** is built from the preset list of Entra permissions (for example `microsoft.directory/applications/credentials/update`), created by a Privileged Role Administrator, and needs **Microsoft Entra ID P1** for each assignee. It is assigned at the tenant, an administrative unit, or one group, enterprise application or app registration. Built-in Entra roles can't be modified. Entra permissions can't go into an Azure role, and the reverse.

> **Exam tip.** "Let the team manage credentials of one application only" is an Entra custom role (or the Application Administrator role) assigned **at the scope of that application**, not tenant-wide.

<!-- section: overprivileged-access | objectives: 1.3.7 -->
## Remediating overprivileged access

Find it:

- **Access control (IAM) > Role assignments** at each management group and subscription, filtered on privileged administrator roles; `az role assignment list --all --include-inherited`.
- Defender for Cloud identity recommendations: *A maximum of 3 owners should be designated for subscriptions*, *There should be more than one owner assigned to subscriptions*, *Guest accounts with owner permissions on Azure resources should be removed*, *Blocked accounts with owner permissions on Azure resources should be removed*, *Deprecated accounts should be removed from subscriptions*, *Privileged roles should not have permanent access at the subscription and resource group level*.
- **CIEM** in Defender CSPM: *Permissions of inactive identities in your Azure subscription should be revoked* (no activity for 45 days) and *Azure overprovisioned identities should have only the necessary permissions*, for users, groups and service principals in Azure, AWS and GCP.

Fix it:

| Finding | Remediation |
| --- | --- |
| Owner or Contributor at subscription scope for one application | Job function role at the resource group or resource |
| Standing privileged role | PIM eligible assignment with MFA and approval |
| Delegated administrator who can assign Owner | Role Based Access Control Administrator with a condition limiting roles and principals |
| Guest, blocked, deprecated or inactive account with access | Remove the assignment |
| Many direct user assignments | Assign to groups |

<!-- section: backup-security | objectives: 1.3.8 -->
## Securing backups with Azure Backup

| Feature | Behavior |
| --- | --- |
| **Soft delete** | Deleted backup data kept 14 days at no extra cost, extendable to 180; **always-on** soft delete can't be disabled (irreversible) |
| **Immutable vault** | States *Disabled*, *Enabled* (reversible), *Enabled and locked* (**irreversible**). Blocks deleting recovery points before expiry and reducing retention; increasing retention stays allowed. Recovery Services and Backup vaults |
| **Multi-user authorization (MUA)** | A **Resource Guard**, owned by a security admin (ideally another subscription or tenant), must authorize critical operations |
| Encryption | Microsoft-managed keys by default; customer-managed keys in Key Vault for Recovery Services vaults |
| Private endpoints | For SQL Server and SAP HANA in VMs, MARS agent, DPM |

MUA: disabling soft delete and removing MUA are always protected; deleting protection, reducing retention, changing encryption settings, disabling immutability and others are protected by default and can be excluded. The backup admin needs only **Reader** on the Resource Guard; the security admin grants **Backup MUA Operator** temporarily (ideally through PIM) for one operation. Don't give the backup admin Contributor or **Backup MUA Admin** on the guard.

Security levels shown by the vault: **Excellent** (irreversible immutability or soft delete, plus MUA), **Good** (locked immutability or soft delete), **Fair** (MUA only), **Poor**.

> **Exam trap.** "A compromised backup administrator must not be able to destroy backups" needs MUA with a Resource Guard he doesn't control **and** an irreversible setting. Soft delete alone can be disabled by whoever has the rights.

<!-- section: infrastructure-as-code | objectives: 1.3.9 -->
## Security controls with infrastructure as code

Write secure settings into the templates, so every deployment starts compliant:

```bicep
resource st 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stordersprod001'
  location: resourceGroup().location
  sku: { name: 'Standard_ZRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    publicNetworkAccess: 'Disabled'
  }
}
```

| Control | What it gives |
| --- | --- |
| Policy as code | Definitions, initiatives and assignments stored in Git and deployed by the pipeline |
| Static analysis in the pipeline | Microsoft Security DevOps runs Template Analyzer, Checkov and Terrascan on Bicep, ARM and Terraform; Defender for Cloud DevOps security collects the findings |
| `what-if` | Preview of the changes before deployment |
| Cloud deployment secrets scanning | Defender CSPM finds plaintext secrets in IaC deployments |
| **Deployment stack** deny settings | `DenyDelete` or `DenyWriteAndDelete` on the managed resources, through a deny assignment; up to 5 excluded principals and 200 excluded actions |

```powershell
New-AzSubscriptionDeploymentStack -Name "landing-zone" -Location "westeurope" `
  -TemplateFile "main.bicep" -ActionOnUnmanage "detachAll" `
  -DenySettingsMode "denyWriteAndDelete" `
  -DenySettingsExcludedPrincipal "<pipeline identity object id>"
```

Deny settings act on the control plane only, need the **Azure Deployment Stack Owner** role (Azure Deployment Stack Contributor manages stacks but not their deny settings), and apply to everyone not excluded, Owners included.

<!-- section: key-points -->
## Key points

- `deny` prevents, `audit` reports, `deployIfNotExists` and `modify` remediate through a managed identity; test with enforcement mode Disabled.
- Regulatory standards beyond MCSB need a paid plan (not Servers Plan 1 or APIs Plan 1) and Owner or Policy Contributor.
- Recommendations: Deny and Enforce to prevent, exemptions (Mitigated, Waiver) to accept, governance rules to assign owners.
- Locks bind every role but can be removed by Owners; deployment stack deny settings can't.
- Privileged roles: Owner, Contributor, User Access Administrator, RBAC Administrator, Reservations Administrator. Prefer job function roles, PIM and conditions.
- Entra custom roles need P1 and use Entra permissions only.
- Backups: always-on soft delete, locked immutable vault, MUA with a Resource Guard outside the backup admin's reach.
