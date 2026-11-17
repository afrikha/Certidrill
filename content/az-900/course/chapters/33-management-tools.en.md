Azure can be managed by clicking, by typing commands or by describing the desired result in a file. All these tools talk to the same service, Azure Resource Manager, which is why they give the same result.

<!-- section: azure-portal | objectives: 3.3.1 -->
## The Azure portal

The **Azure portal** is a web-based, unified console. You can build, manage and monitor everything from a simple web application to a complex deployment, through a graphical interface.

- Create and manage resources, with guided forms.
- Build custom **dashboards** for an organized view of resources and their state.
- Present in every Azure datacenter, so it is resilient to individual datacenter failures; it updates continuously and needs no downtime for maintenance.
- Well suited to exploring and to occasional tasks; for repetitive or large-scale tasks, command-line tools and templates are faster and less error-prone.

The **Azure mobile app** gives access to resources, alerts and a command line from a phone.

<!-- section: command-line-tools | objectives: 3.3.2 -->
## Azure Cloud Shell, Azure CLI and Azure PowerShell

| Tool | What it is | Command style |
| --- | --- | --- |
| **Azure PowerShell** | A module of **cmdlets** (command-lets) for PowerShell; runs on Windows, Linux and macOS | `New-AzVM`, `Get-AzResourceGroup` |
| **Azure CLI** | A command-line interface with **Bash-style** commands; runs on Windows, Linux and macOS | `az vm create`, `az group list` |
| **Azure Cloud Shell** | A **browser-based** shell, opened from the portal or at shell.azure.com, with both tools already installed | Bash or PowerShell, your choice |

Azure PowerShell and the Azure CLI do the same things; they differ only by syntax. Both call the Azure REST API behind the scenes, and both let you write scripts to automate the creation of one resource or of a whole infrastructure.

Cloud Shell characteristics:

- Nothing to install or configure locally: it runs in the browser.
- **Authenticated** automatically with the account you used to sign in to the portal.
- You choose **Bash** (with the Azure CLI) or **PowerShell** (with Azure PowerShell).

<!-- section: azure-arc | objectives: 3.3.3 -->
## Azure Arc

Managing hybrid and multicloud environments quickly gets complicated. **Azure Arc** extends Azure management and compliance to resources that are **outside Azure**: in your datacenter, at the edge or in another cloud. Through Azure Resource Manager, these resources appear and are managed as if they were in Azure.

What Azure Arc lets you do:

- Manage the whole environment by **projecting** non-Azure resources into Azure Resource Manager.
- Manage multicloud and hybrid virtual machines, Kubernetes clusters and databases as if they ran in Azure.
- Use familiar Azure services and management capabilities wherever the resources are: Azure Policy, tags, Azure RBAC, Azure Monitor, Defender for Cloud.
- Keep using traditional IT operations while introducing DevOps practices.

Resource types that can be managed outside Azure: **servers**, **Kubernetes clusters**, **Azure data services**, **SQL Server** and virtual machines.

<!-- section: iac | objectives: 3.3.4 -->
## Infrastructure as code

**Infrastructure as code** (IaC) means managing infrastructure with **lines of code** instead of manual steps. The code describes the resources; a tool deploys them.

| Benefit | Meaning |
| --- | --- |
| Repeatable | The same file gives the same environment every time: development, test and production are consistent |
| Fast and scalable | Ten or a thousand resources are deployed the same way |
| Versioned | Files are stored in source control with the application code, reviewed and tracked |
| Less error-prone | No forgotten manual step |

Introductory forms of IaC are scripts in Cloud Shell, Azure CLI or Azure PowerShell. More complete forms are **ARM templates**, **Bicep** and third-party tools such as **Terraform**.

<!-- section: arm-templates | objectives: 3.3.5 -->
## Azure Resource Manager and ARM templates

**Azure Resource Manager** (ARM) is the deployment and management service of Azure. **Every request** to create, update or delete a resource goes through it, whether it comes from the portal, the CLI, PowerShell, an SDK or the REST API. ARM receives the request, authenticates and authorizes it, then sends it to the Azure service.

What ARM provides:

- Manage infrastructure through **declarative templates** rather than scripts.
- Deploy, manage and monitor all the resources of a solution **as a group**.
- Redeploy a solution throughout its life cycle with a consistent result.
- Define **dependencies** so that resources are deployed in the right order.
- Apply **access control** (RBAC) to all services, since it is built into the management layer.
- Apply **tags** and **locks**, and follow billing by groups of resources sharing a tag.

An **ARM template** is a **JSON** file that describes the resources to deploy.

| Benefit | Meaning |
| --- | --- |
| **Declarative syntax** | You state what you want, not the commands to obtain it |
| **Repeatable results** | Deploying the same template several times gives the same resources: it is idempotent |
| **Orchestration** | ARM orders the operations and deploys in parallel when possible |
| **Modular files** | A template can be split into smaller, reusable templates |
| **Extensibility** | Deployment scripts in PowerShell or Bash can be added |

**Bicep** is a language that also describes resources declaratively, with a simpler and more concise syntax than JSON. It supports all resource types, is modular and gives repeatable results; a Bicep file is converted to an ARM template at deployment.

> **Exam trap.** Declarative means describing the final state ("a storage account named X exists"). Scripts are imperative: a list of commands to run in order. ARM templates and Bicep are declarative.

<!-- section: key-points -->
## Key points

- Portal: graphical web console, dashboards, good for occasional tasks.
- Azure PowerShell (cmdlets) and Azure CLI (Bash-style) do the same things and are scriptable. Cloud Shell: both, in the browser, already authenticated.
- Azure Arc: manage servers, Kubernetes clusters and data services outside Azure with Azure tools.
- Infrastructure as code: repeatable, versioned deployments. ARM templates (JSON) and Bicep are declarative and idempotent.
- Azure Resource Manager is the single management layer behind every tool; it brings RBAC, tags, locks and resource groups.
