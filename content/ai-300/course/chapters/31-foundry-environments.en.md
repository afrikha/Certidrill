A GenAIOps platform in Microsoft Foundry starts with the Azure resources: a Foundry resource per environment, projects for teams, identities that call models without keys, private networking, and templates that rebuild all of it identically in development, test and production. Exam questions give you a constraint (least privilege, no public network access, repeatable deployment) and ask for the resource property, the role, the network setting or the command that meets it.

<!-- section: foundry-resources | objectives: 3.1.1 -->
## Foundry resources and project environments

Microsoft Foundry is organized in two Azure resource types plus the resources you connect:

| Layer | Azure resource type | Holds |
| --- | --- | --- |
| Foundry resource | `Microsoft.CognitiveServices/accounts`, kind `AIServices` | Administrative, security and monitoring boundary: networking, model deployments, connections, quota usage |
| Foundry project | `Microsoft.CognitiveServices/accounts/projects` | Work of a team or use case: agents, evaluations, files, datasets; its own access control |
| Connected resources | Storage account, Azure Key Vault, Azure AI Search, Azure Cosmos DB, Application Insights | Your data, secrets, indexes, agent state and telemetry, each with its own network and access settings |

Projects are child resources: they have their own role assignments but **share** the network security, the model deployments and the connections of their parent Foundry resource. The project endpoint is:

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

The previous model, a **hub** with hub-based projects (built on Azure Machine Learning workspaces), is still served by the Foundry (classic) portal. Some features covered by this exam exist only there, such as `az ml serverless-endpoint` deployments, managed compute on managed online endpoints and prompt flow. New work targets Foundry projects.

| Requirement | Design |
| --- | --- |
| Separate development, test and production | One Foundry resource per environment (often one resource group or subscription each), with the same template |
| Several teams share deployments and network settings | One Foundry resource, one project per team |
| A team must not see another team's agents and evaluations | Separate projects, role assignments at project scope |
| Network isolation or a different region for one workload | A separate Foundry resource (network and deployments are resource-level) |
| Self-service exploration in a locked-down subscription | Administrators create the resource; users add projects to it |

The **default project** matters. The first project of a Foundry resource is tagged default (`is_default` in code). Only the default project supports OpenAI Batch, fine-tuning, stored completions and Speech fine-tuning; other projects support Responses, Files and Conversations from the OpenAI API. If you delete the default project, the next project you create becomes the default. A deleted project can't be recovered.

**Agent capability settings** (where agent state, vectors and files are stored) can be set on the Foundry resource as defaults. Projects inherit them unless they override them with `capabilitySettings` (`blobStore`, `documentStore`, `vectorStore`), which can only be set when the project is created. Changing the resource defaults later doesn't update existing projects. The identity that sets them needs Storage Blob Data Contributor on the storage account and Cosmos DB Operator on the Azure Cosmos DB account; runtime access for the project's managed identity is configured separately.

**Connections** link a resource or a project to external services (for example Azure AI Search or a storage account). Connections defined on the resource are shared with its projects; `az cognitiveservices account connection` and `az cognitiveservices account project connection` manage them from the command line.

To create a Foundry resource you need a role such as **Foundry Account Owner** or **Foundry Owner** on the subscription or resource group; to create it for a team and give members access, you also need a role that can assign roles, such as **Owner**.

> **Exam trap.** Fine-tuning and Batch jobs fail in a second project of the same Foundry resource: those features are available only in the default project. And private endpoints or deployments can't be set per project: they belong to the Foundry resource.

<!-- section: identity-rbac | objectives: 3.1.2 -->
## Identity and access management

Foundry uses Azure RBAC with built-in roles that split control plane (manage resources, projects, deployments) and data plane (build and run agents, evaluations, model calls):

| Role | Create resources and projects | Build and develop (data actions) | Assign roles | Manage models | Publish agents | Call agent endpoints |
| --- | --- | --- | --- | --- | --- | --- |
| Foundry Agent Consumer | No | No | No | No | No | Yes |
| Foundry User | No | Yes | No | No | No | Yes |
| Foundry Project Manager | See note | Yes | Foundry User only | No | Yes | Yes |
| Foundry Account Owner | Yes | No | Foundry User, ACR and monitoring roles | Yes | No | No |
| Foundry Owner | Yes | Yes | Foundry User, ACR and monitoring roles | Yes | Yes | Yes |
| Contributor (Azure) | Yes | No | No | Yes | No | No |

The four Foundry roles were renamed from Azure AI User, Azure AI Owner, Azure AI Account Owner and Azure AI Project Manager; role IDs and permissions are unchanged. Learn's permission matrix and its persona examples disagree on whether Foundry Project Manager creates projects, so don't build an answer on that point alone.

Recommended assignments:

| Principal | Role and scope |
| --- | --- |
| Developers of one team | Foundry User on the project, Reader on the Foundry resource |
| Team lead who publishes agents and onboards members | Foundry Project Manager on the Foundry resource |
| Platform administrators | Foundry Account Owner on the Foundry resource |
| Application or user that only calls one agent | Foundry Agent Consumer on the project, or on the agent scope `.../accounts/<account>/projects/<project>/agents/<agent>` (CLI only; the portal assigns it at resource scope) |
| Anyone who must see quota or run deployment eligibility checks | Cognitive Services Usages Reader on the **subscription** (resource group and resource scopes don't authorize the Usages API) |
| Pipeline that creates or deletes managed compute deployments | Cognitive Services Contributor on the Foundry resource |

Roles that start with "Cognitive Services" (except Usages Reader) target AI Services resources directly and aren't meant for Foundry scenarios. **Azure AI Developer** applies to Azure Machine Learning workspaces and hubs, not to Foundry projects.

**Managed identities.** Both the Foundry resource and each project can have a managed identity, system-assigned or user-assigned (`identity.type` is `SystemAssigned`, `UserAssigned`, `SystemAssigned, UserAssigned` or `None`). Use them for service-to-service access:

- Give the **project's managed identity** Foundry User on the Foundry resource.
- For a storage account created outside Foundry, give the **Foundry resource's managed identity** Storage Blob Data Reader on it; for an external Azure AI Search service, add Foundry to its role assignments.
- A user-assigned identity is a separate resource: create it, grant its roles, then reference its resource ID (`--user-assigned-identity` on `az cognitiveservices account project create`). Its lifecycle doesn't depend on the Foundry resource.

**Keyless access.** RBAC applies only with Microsoft Entra ID authentication. An API key grants full access with no role restriction. Applications use their managed identity and `DefaultAzureCredential`; then set `disableLocalAuth: true` on the Foundry resource so keys stop working.

When a user with role-assignment rights creates a Foundry resource in the Azure portal or the Foundry portal, Foundry User is assigned to them automatically. That doesn't happen when the resource is deployed with the SDK, the CLI or a template: add the assignment to your template or script.

```bash
# Least privilege for an application that calls one agent only
az role assignment create \
  --assignee-object-id "<principal-id>" \
  --assignee-principal-type ServicePrincipal \
  --role "Foundry Agent Consumer" \
  --scope "/subscriptions/<sub-id>/resourceGroups/rg-ai-prod/providers/Microsoft.CognitiveServices/accounts/contoso-ai-prod/projects/support/agents/order-agent"
```

> **Exam trap.** "Only identities with role X can call the model" isn't enforced while key authentication is enabled: disable local authentication. And the role that lets code call models and run evaluations is a data role (Foundry User); Contributor and Owner can deploy models but have no data actions.

<!-- section: network-security | objectives: 3.1.3 -->
## Network security and private networking

Inbound and outbound traffic are configured separately.

**Inbound** (clients reaching the Foundry resource):

| Requirement | Configuration |
| --- | --- |
| No access from the internet | Private endpoint (target sub-resource "account") in the same region and subscription as the virtual network; `publicNetworkAccess: 'Disabled'` |
| Access only from known IP ranges or subnets | Public network access enabled from selected networks: `networkAcls.defaultAction: 'Deny'` with `ipRules` and `virtualNetworkRules` |
| Azure AI Search or Azure Machine Learning must reach a restricted resource | Trusted services exception (`networkAcls.bypass: 'AzureServices'`) plus a role for that service's managed identity |
| Name resolution from the virtual network | Private DNS zone for the `privatelink` subdomain, linked to the virtual network (created by default with the private endpoint) |
| On-premises users must use the private endpoint | VPN gateway, ExpressRoute or Azure Bastion into the virtual network; custom DNS forwards to the private zone |

Only private endpoints in the **Approved** state carry traffic; creating one needs Network Contributor on the virtual network, and approving the connection needs Contributor or Owner on the Foundry resource. Validate with `nslookup` from inside the virtual network: the endpoint name must resolve to the private IP. From outside, it resolves to the public endpoint. Removing all private endpoints doesn't make the resource public, and enabling public access doesn't remove existing private endpoints.

**Outbound** (agents reaching your resources) uses **virtual network injection**: the agent client runs in your subnet, which must be delegated to `Microsoft.App/environments` and be /27 or larger. Use the standard agent setup (your own Storage, Azure AI Search and Azure Cosmos DB) so that agent data stays in your tenant, and create a private endpoint on each of those resources: they aren't created automatically. A Microsoft-managed network for subnet delegation also exists (`networkInjections.useMicrosoftManagedNetwork`, `az cognitiveservices account managed-network` commands in preview).

Outbound decisions are made at deployment time: you can't change the delegated subnet or add network injection to an existing resource; you redeploy. Don't use `172.17.0.0/16` for the virtual network (reserved for Docker bridge networking).

| Agent tool | Behavior with network injection |
| --- | --- |
| Private MCP, OpenAPI, Azure Functions, agent-to-agent | Through your subnet |
| Azure AI Search, file search | Through private endpoints |
| Code interpreter, function calling | Microsoft backbone |
| Grounding with Bing, web search, SharePoint grounding | Public endpoints |
| Browser automation, computer use, image generation, Logic Apps | Not supported |

> **Exam trap.** A private endpoint on the Foundry resource doesn't protect the storage account, the search service or the Cosmos DB account that agents use: each needs its own private endpoint and its own public network access setting. And the network injection subnet can't be added later: plan it in the first deployment.

<!-- section: iac-bicep-cli | objectives: 3.1.4 -->
## Deploying with Bicep and the Azure CLI

A Bicep template declares the Foundry resource, its projects, model deployments and role assignments, so each environment is identical:

```bicep
param location string = resourceGroup().location
param foundryName string
param projectName string = 'support'

resource foundry 'Microsoft.CognitiveServices/accounts@2026-05-01' = {
  name: foundryName
  location: location
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    allowProjectManagement: true
    customSubDomainName: foundryName
    publicNetworkAccess: 'Disabled'
    disableLocalAuth: true
    networkAcls: { defaultAction: 'Deny', bypass: 'AzureServices' }
  }
}

resource project 'Microsoft.CognitiveServices/accounts/projects@2026-05-01' = {
  parent: foundry
  name: projectName
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    displayName: 'Customer support'
    description: 'Support agents and evaluations'
  }
}

resource chat 'Microsoft.CognitiveServices/accounts/deployments@2026-05-01' = {
  parent: foundry
  name: 'chat'
  sku: { name: 'GlobalStandard', capacity: 50 }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4.1-mini', version: '2025-04-14' }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
  }
}
```

| Property | Why it matters |
| --- | --- |
| `kind: 'AIServices'` | The Foundry resource kind |
| `allowProjectManagement: true` | Allows `projects` child resources; without it the resource can't hold Foundry projects |
| `customSubDomainName` | Subdomain used for Microsoft Entra token authentication and the `services.ai.azure.com` endpoint |
| `identity` | Managed identity of the resource; projects have their own `identity` block |
| `publicNetworkAccess`, `networkAcls` | Inbound network rules |
| `disableLocalAuth` | Turns off API keys |
| Deployments are children of `accounts` | Projects consume the deployments of their parent resource |

The same steps with the Azure CLI:

```bash
az group create --name rg-ai-dev --location eastus2

az cognitiveservices account create \
  --name contoso-ai-dev --resource-group rg-ai-dev --location eastus2 \
  --kind AIServices --sku S0 \
  --custom-domain contoso-ai-dev \
  --assign-identity --allow-project-management true --yes

az cognitiveservices account project create \
  --name contoso-ai-dev --resource-group rg-ai-dev --location eastus2 \
  --project-name support --assign-identity

az cognitiveservices account deployment create \
  --name contoso-ai-dev --resource-group rg-ai-dev \
  --deployment-name chat \
  --model-name gpt-4.1-mini --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 50

# Deploy the Bicep template per environment
az deployment group create --resource-group rg-ai-dev \
  --template-file main.bicep --parameters foundryName=contoso-ai-dev
```

In `az cognitiveservices account`, `--name` is always the Foundry resource; the project is `--project-name` and the deployment `--deployment-name`. Other useful groups: `account identity`, `account network-rule`, `account keys`, `account connection`, `account list-deleted`, `recover` and `purge` (a deleted resource is kept and can be recovered or purged; viewing and purging deleted accounts needs Contributor at subscription scope).

Practical notes from the Learn templates: the resource name must be globally unique (2 to 64 lowercase letters, digits and hyphens in the sample); a `ServiceModelDeprecating` error means a model version in the template is retired; to start from an existing resource, use **Export template** in the Azure portal. Templates that set agent capability settings need Storage Blob Data Contributor and Cosmos DB Operator for the deployment identity.

> **Exam tip.** In infrastructure as code, a template that deploys the resource doesn't give anyone access: declare `Microsoft.Authorization/roleAssignments` for the users, the project's managed identity and the application identities, because the automatic Foundry User assignment happens only in the portals.

<!-- section: key-points -->
## Key points

- Foundry resource (`accounts`, kind `AIServices`) = network, deployments, connections; projects (`accounts/projects`) = agents, evaluations, files, access control.
- One resource per environment; one project per team. Batch, fine-tuning and stored completions only in the default project.
- Foundry User for builders and project managed identities; Agent Consumer for callers; Account Owner for administrators; Usages Reader at subscription scope for quota.
- Keys bypass RBAC: managed identity, `DefaultAzureCredential`, then `disableLocalAuth: true`.
- Inbound: private endpoint plus `publicNetworkAccess: 'Disabled'`; outbound: subnet delegated to `Microsoft.App/environments`, /27 or larger, decided at deployment. Connected resources need their own private endpoints.
- Bicep: `allowProjectManagement: true`, `customSubDomainName`, `identity`; CLI: `az cognitiveservices account create`, `account project create`, `account deployment create`.
