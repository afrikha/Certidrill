Governance keeps an environment within the rules of the organization and of the law as it grows. The exam names three tools: Microsoft Purview for data, Azure Policy for resources and resource locks for protection against accidents.

<!-- section: purview | objectives: 3.2.1 -->
## Microsoft Purview

**Microsoft Purview** is a family of data governance, risk and compliance solutions that gives a single, unified view of your data, wherever it lives: on-premises, in several clouds and in software-as-a-service applications.

What it provides:

- **Automated data discovery**: it scans data sources and builds a map of the data estate.
- **Sensitive data classification**: it recognizes and labels sensitive information.
- **End-to-end data lineage**: it shows where data comes from and where it goes.

Its two solution areas:

| Area | Purpose |
| --- | --- |
| **Risk and compliance** | Protect sensitive data across clouds, applications and devices; identify data risks and manage regulatory compliance. Works with Microsoft 365 services such as Teams, OneDrive and Exchange |
| **Unified data governance** | Create an up-to-date map of the whole data estate with classification and lineage, identify where sensitive data is stored, manage access to data securely and at scale. Covers Azure, SQL and Hive databases, on-premises data and other clouds such as Amazon S3 |

Purview is about **data**: knowing what you have, where it is and how sensitive it is. It doesn't control which Azure resources can be created; that is Azure Policy.

<!-- section: azure-policy | objectives: 3.2.2 -->
## Azure Policy

**Azure Policy** lets you create, assign and manage policies that control or audit your resources, so that their configuration stays compliant with corporate standards.

| Concept | Meaning |
| --- | --- |
| **Policy definition** | One rule, for example: allow only certain regions, allow only certain virtual machine sizes, require a tag, require HTTPS on storage accounts. Many built-in definitions exist; you can write your own |
| **Initiative** | A **group of related policies** assigned together to track a larger goal, for example *Enable Monitoring in Azure Security Center* |
| **Assignment** | A policy or initiative applied to a scope: a management group, a subscription, a resource group or a resource |

How it behaves:

- Assignments are **inherited**: a policy set on a subscription applies to its resource groups and resources. A child scope can be excluded.
- New resources that violate a policy can be **denied**; **existing** resources are evaluated and flagged as non-compliant.
- Some policies can **remediate** automatically, for example add a missing tag.
- Policies apply to everyone, including owners: Azure Policy isn't about who the user is.
- It integrates with Azure DevOps to check compliance before and after deployments.

| Question in a scenario | Tool |
| --- | --- |
| "Ensure that resources are created only in Europe" | Azure Policy |
| "Ensure that only the network team can modify virtual networks" | Azure RBAC |
| "Ensure that nobody deletes the production database by mistake" | Resource lock |

<!-- section: resource-locks | objectives: 3.2.3 -->
## Resource locks

A **resource lock** prevents resources from being accidentally deleted or changed, **whatever the permissions of the user**, even an owner.

| Lock type | Authorized users can | Authorized users can't |
| --- | --- | --- |
| **Delete** (`CanNotDelete`) | Read and modify the resource | Delete it |
| **Read-only** (`ReadOnly`) | Read the resource | Modify or delete it |

- A lock is applied to a **subscription**, a **resource group** or a **resource**, never to a management group, and is **inherited**: a lock on a resource group applies to every resource in it, even resources added later. The most restrictive lock in the inheritance chain takes precedence.
- A Delete lock on a single resource blocks the deletion of its whole resource group: nothing is deleted, not even the unlocked resources.
- Locks apply only to **control plane** operations (managing the resource), not to the data: a lock on a storage account doesn't protect the data in its blobs, queues, tables or files.
- Locks are managed from the portal, Azure PowerShell, the Azure CLI or an ARM template.
- To delete or change a locked resource, you must **first remove the lock**, then perform the operation. Two steps, on purpose.

> **Exam trap.** Azure RBAC alone doesn't protect against a mistake by someone who has the rights. A lock does. And a lock isn't permanent: a user with enough rights can remove it, then delete the resource.

<!-- section: key-points -->
## Key points

- Microsoft Purview: unified governance of **data** (discovery, classification, lineage) and risk and compliance, across on-premises, multicloud and SaaS.
- Azure Policy: rules on **resources**; definitions, initiatives (groups of policies), assignments at a scope, inheritance, evaluation of existing resources, optional remediation.
- Resource locks: Delete or Read-only; on subscriptions, resource groups, resources (not management groups); inherited, the most restrictive wins; control plane only; apply regardless of RBAC; remove the lock before changing the resource.
