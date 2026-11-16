This course follows the official AZ-104 study guide objective by objective. Each chapter covers one functional group of the exam; each section names the objectives it prepares. Read a chapter, then take a mock exam and come back to the sections of the questions you missed.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 100 minutes of exam time |
| Questions | 40 to 60, depending on the session |
| Passing score | 700 on a scale of 1 to 1000 |
| Wrong answers | No negative points: always answer |
| Documentation | Microsoft Learn can be opened during the exam, on the same clock |
| Validity | One year, renewed free of charge by an online assessment on Microsoft Learn |

The score is scaled: 700 doesn't mean 70 % of the questions. Questions made of several elements (drop-down lists, Yes/No statements, drag and drop) give one point per correct element, so a partly correct answer still earns points.

An exam is made of sections:

- **Case studies.** A company description (existing environment, requirements, constraints) followed by several questions. Once you leave a case study, you can't come back to it.
- **Yes/No series.** The same scenario is repeated with a different solution each time; you say whether the solution meets the goal. Each answer is final: no going back. Several solutions can be right, or none.
- **Main section.** Independent questions that you can flag and review until you submit.

> **Exam tip.** Microsoft Learn is available, but searching costs time. Use it for a precise value you can't remember (a limit, a SKU feature), never to learn a topic during the exam.

<!-- section: reading-questions -->
## Reading a question

AZ-104 questions describe an environment ("You have an Azure subscription named Sub1 that contains...") then a need ("You need to..."). The decisive words are usually the constraints:

| Constraint in the stem | What it selects |
| --- | --- |
| "minimize costs" | The cheapest SKU, tier or redundancy that still meets every requirement |
| "minimize administrative effort" | The built-in or automatic feature (policy, dynamic group, autoscale) rather than a script |
| "principle of least privilege" | The narrowest role at the narrowest scope |
| "must not affect other applications" | A targeted change (one SAS, one rule), not a global one (key rotation) |
| "future resources must also..." | A higher scope with inheritance (subscription, management group), or a policy |

Read the answer choices for what they really do. Wrong answers are real Azure features that solve a different problem.

<!-- section: azure-hierarchy -->
## The Azure hierarchy

Everything in the exam sits somewhere in this hierarchy:

| Level | Role |
| --- | --- |
| Microsoft Entra tenant | The directory: users, groups, applications. One tenant can be trusted by many subscriptions; a subscription trusts exactly one tenant |
| Management groups | Containers of subscriptions, to apply policies and role assignments to several subscriptions at once |
| Subscription | Billing unit and boundary for quotas |
| Resource group | Logical container of resources that share a life cycle. A resource belongs to exactly one resource group |
| Resource | A virtual machine, a storage account, a virtual network... |

Role assignments and policy assignments made at one level are **inherited** by all the levels below. This single rule answers a large share of the governance questions.

Two kinds of operations exist:

- The **control plane** (management plane) goes through Azure Resource Manager (`https://management.azure.com`): create a storage account, resize a virtual machine, read a configuration. Azure RBAC roles with `Actions`, Azure Policy and resource locks act here.
- The **data plane** talks to the resource itself: read a blob, sign in to a virtual machine, read a secret. It needs data roles (`DataActions`), keys or tokens of the service.

> **Exam trap.** Owner and Contributor are control plane roles. Being Owner of a storage account doesn't, by itself, let you read its blobs with your Microsoft Entra identity.

Regions matter too. A **region** is a set of datacenters; most regions have three **availability zones** (physically separate datacenter groups in the region); many regions have a **paired region** used by geo-redundant services.

<!-- section: admin-tools -->
## Administration tools

You must be able to read and complete commands in both command-line tools.

| Tool | Form | Example |
| --- | --- | --- |
| Azure portal | Web interface | Each resource has a menu with **Overview**, **Activity log**, **Access control (IAM)**, **Tags**, **Settings**... |
| Azure CLI | `az <group> <subgroup> <action> --parameter value` | `az vm start --resource-group RG1 --name VM1` |
| Azure PowerShell | `Verb-AzNoun -Parameter value` | `Start-AzVM -ResourceGroupName RG1 -Name VM1` |
| Azure Cloud Shell | Browser shell (Bash or PowerShell) with both tools already installed | Persisting files requires a storage account with a file share |
| ARM templates and Bicep | Declarative files | See the chapter on ARM templates and Bicep |

```bash
# Azure CLI
az login
az account set --subscription "Sub1"
az group create --name RG1 --location westeurope
az resource list --resource-group RG1 --output table
```

```powershell
# Azure PowerShell
Connect-AzAccount
Set-AzContext -Subscription "Sub1"
New-AzResourceGroup -Name RG1 -Location westeurope
Get-AzResource -ResourceGroupName RG1
```

Regular patterns help you rebuild a command you don't remember:

- Azure CLI actions: `create`, `list`, `show`, `update`, `delete`. PowerShell verbs: `New-`, `Get-`, `Set-` or `Update-`, `Remove-`.
- Microsoft Entra objects are managed with `az ad ...` or with the **Microsoft Graph PowerShell** module (`New-MgUser`, `Get-MgGroup`), not with `Az` cmdlets.

Before a subscription can create a resource type, its **resource provider** (for example `Microsoft.Compute`) must be registered. The portal registers the common ones automatically; otherwise use `az provider register --namespace Microsoft.ContainerInstance` or `Register-AzResourceProvider`.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: later domains reuse identities, storage and networking.
2. Reproduce the main operations in a free or pay-as-you-go subscription. Delete the resource group at the end of each session to stop the costs.
3. After each domain, take a mock exam, read every explanation, and reread the sections linked to your mistakes.
4. Book the real exam when three mock exams in a row are at 800 or more, on questions you haven't seen before.
