Setting up an AI solution in Microsoft Foundry means designing the Azure resources around it, choosing how each model is deployed, configuring the model and agent deployments, and automating all of it in a CI/CD pipeline. Exam questions test the order of operations, the deployment type that fits a constraint, the settings of a deployment and the identity a pipeline uses.

<!-- section: infrastructure | objectives: 1.2.1 -->
## Designing the Azure infrastructure

Foundry is organized in layers:

| Layer | Azure resource | Holds |
| --- | --- | --- |
| Foundry resource | `Microsoft.CognitiveServices/accounts`, kind `AIServices` | Governance: networking, security, model deployments, connections |
| Foundry project | `Microsoft.CognitiveServices/accounts/projects` | Development boundary of a team: agents, files, evaluations, access control |
| Connected resources | Storage account, Azure Key Vault, Azure AI Search, Application Insights | Your data, secrets, indexes and telemetry, each with its own networking and access policies |

Projects reuse the deployments and connections of their Foundry resource, so a new team can start without repeated IT setup. One resource per environment (development, test, production) is the usual pattern, with one project per team or use case. The previous model (a hub with Azure OpenAI and Azure AI services resources, and hub-based projects) is still visible in the Foundry (classic) portal; new investments target Foundry projects.

The project endpoint has this format:

```text
https://<resource-name>.services.ai.azure.com/api/projects/<project-name>
```

Design choices to make before deploying:

| Decision | Options | Driver |
| --- | --- | --- |
| Region | A region where the models and features you need are available | Model availability, data residency, quota |
| Agent data | **Basic setup**: threads, messages and files in Microsoft-managed multitenant storage. **Standard setup**: your own Azure Cosmos DB for NoSQL (conversations and agent state), Azure Storage (files) and Azure AI Search (vector stores) | Data isolation, compliance, customer-managed keys |
| Secrets of connections | Microsoft-managed Key Vault (default), or your own Azure Key Vault connected once for the resource and all its projects | Control over secrets |
| Network | Public access, private endpoints, and for agents a virtual network: your own subnet delegated to `Microsoft.App/environments`, or a managed virtual network | Isolation |
| Encryption | Microsoft-managed keys (default) or customer-managed keys in Key Vault | Compliance |

For a standard agent setup, the Cosmos DB account needs a total throughput of at least 3,000 RU/s; each container needs 1,000 RU/s, and insufficient capacity makes provisioning fail. The person who creates it needs Foundry Account Owner at subscription scope, plus the right to assign roles on Cosmos DB, Search and Storage (Owner or Role Based Access Control Administrator). Keep the Azure OpenAI resource, the Foundry resource and the project in the same region. The resources used by a project for agent state, files and vectors can't be changed on an existing project: you delete and recreate the project.

For customer-managed keys, the key vault must be in the same region as the Foundry resource, with soft delete and purge protection enabled, and the managed identity needs key permissions such as **Key Vault Crypto User**.

> **Exam trap.** A deployment with private endpoints that blocks all public access can't be configured through the portal: use the SDK, the CLI or infrastructure as code. And private endpoints on the Foundry resource don't cover the connected resources: storage, Key Vault and Azure AI Search each need their own network settings.

<!-- section: deployment-options | objectives: 1.2.2 -->
## Choosing deployment options

Models are deployed in two ways. **Serverless API** deployments (Foundry Models sold directly by Azure, and many partner models) are pay-per-token or reserved throughput, with the deployment types below. **Managed compute** hosts open-source or custom models on dedicated virtual machines and doesn't use these deployment types.

| Deployment type | SKU name | Data processed | Billing | Best for |
| --- | --- | --- | --- | --- |
| Global Standard | `GlobalStandard` | Any Azure region | Pay-per-token | Default: lowest price, highest quota, first to get new models |
| Data Zone Standard | `DataZoneStandard` | Within a data zone (US, EU or APAC) | Pay-per-token | Data zone compliance |
| Standard | `Standard` | Within the Azure geography | Pay-per-token | Geography compliance, low or bursty volume |
| Global Provisioned | `GlobalProvisionedManaged` | Any Azure region | Reserved PTUs, hourly | Predictable high throughput |
| Data Zone Provisioned | `DataZoneProvisionedManaged` | Within a data zone | Reserved PTUs, hourly | Data zone plus predictable throughput |
| Regional Provisioned | `ProvisionedManaged` | Within the Azure geography | Reserved PTUs, hourly | Geography plus predictable throughput |
| Global Batch | `GlobalBatch` | Any Azure region | 50 % less than Global Standard | Large asynchronous jobs, 24-hour target |
| Data Zone Batch | `DataZoneBatch` | Within a data zone | 50 % less than Global Standard | Large asynchronous jobs with data zone compliance |
| Developer | `DeveloperTier` | Any Azure region | Pay-per-token | Evaluating fine-tuned models only; no SLA, deleted after 24 hours |

Standard types are best effort; provisioned types guarantee throughput and give lower latency variance. Batch requests have no real-time SLA: completion is targeted within 24 hours and can take longer.

| Requirement | Deployment type |
| --- | --- |
| New project, no residency constraint | Global Standard |
| Prompts must be processed only in the EU | Data Zone Standard |
| Data must stay in one geography | Standard or Regional Provisioned |
| Steady high traffic, consistent latency, mission-critical | Provisioned (Global, Data Zone or Regional) |
| Classify 5 million archived documents, no deadline today | Global Batch |
| Test a fine-tuned model cheaply before production | Developer |

> **Exam trap.** "Global" means the request can be processed in any Azure region, but data at rest stays in the resource's geography. If the stem requires that prompts are processed only inside the EU, Global Standard is wrong and Data Zone Standard is right.

<!-- section: configure-deployments | objectives: 1.2.3 -->
## Configuring model and agent deployments

A model deployment has a **deployment name** (the value your code passes as `model`), a model and version, a deployment type (SKU), a capacity, a content filter and a version upgrade policy.

```bash
az cognitiveservices account deployment create \
  --name contoso-foundry --resource-group rg-ai \
  --deployment-name chat-prod \
  --model-name gpt-4.1-mini --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalStandard --sku-capacity 100
```

The same deployment in Bicep, with the version policy and a custom content filter:

```bicep
resource chat 'Microsoft.CognitiveServices/accounts/deployments@2025-06-01' = {
  parent: foundry
  name: 'chat-prod'
  sku: { name: 'GlobalStandard', capacity: 100 }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4.1-mini', version: '2025-04-14' }
    versionUpgradeOption: 'OnceCurrentVersionExpired'
    raiPolicyName: 'contoso-strict-filter'
  }
}
```

| Setting | Values and effect |
| --- | --- |
| `versionUpgradeOption` | `OnceNewDefaultVersionAvailable`: upgrade within two weeks after a new version becomes the default. `OnceCurrentVersionExpired` (also the behavior when the value is `null`): upgrade to the current default when the pinned version retires. `NoAutoUpgrade`: never upgrade; the deployment stops working at retirement |
| `sku.capacity` | Units of throughput taken from the subscription's quota (TPM for Standard types, PTUs for Provisioned types) |
| `raiPolicyName` | The content filter (guardrail) applied to prompts and completions of this deployment |
| Deployment name | Choose a stable, role-based name (`chat-prod`) so that code doesn't change when the model changes |

Automatic version upgrades apply only to Standard deployment types; provisioned deployments are migrated in place or to a new deployment. The Azure CLI can read `versionUpgradeOption` but can't currently set it: use REST, Azure PowerShell or infrastructure as code.

**Agents** are versioned resources of a project. Creating an agent, or changing it, creates a new version; earlier versions remain, so you can compare or roll back. Publishing promotes an agent to a managed resource with a stable endpoint that inherits the project's identity and access controls.

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

project = AIProjectClient(
    endpoint="https://contoso-foundry.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),
)

agent = project.agents.create_version(
    agent_name="support-agent",
    definition=PromptAgentDefinition(
        model="chat-prod",  # deployment name
        instructions="Answer questions about Contoso orders. Be concise.",
    ),
)
print(agent.name, agent.version)

openai = project.get_openai_client(agent_name="support-agent")
conversation = openai.conversations.create()
response = openai.responses.create(
    conversation=conversation.id,
    input="Where is my order 4512?",
)
print(response.output_text)
```

| Element | Role |
| --- | --- |
| `azure-ai-projects` 2.x | The Foundry SDK for Foundry projects; 1.x targets Foundry (classic) and isn't compatible |
| `create_version(agent_name=..., definition=...)` | Creates the agent, or a new version if it already exists |
| `PromptAgentDefinition(model=..., instructions=..., tools=[...])` | The model deployment, instructions and tools of a prompt agent |
| `get_openai_client(agent_name=...)` | An OpenAI-compatible client bound to the agent |
| `conversations.create()` then `conversation=` | Keeps the multi-turn context on the service side |

> **Exam tip.** The `model` of an agent definition is a deployment name in the project's Foundry resource. Deploy the model first, then create the agent that names it; when you move to another model, deploy it and create a new agent version that points to it.

<!-- section: cicd | objectives: 1.2.4 -->
## Integrating Foundry projects with CI/CD

A Foundry solution moves through environments like any application: infrastructure as code for resources, deployments, connections and role assignments; agent definitions and prompts in source control; automated evaluation as a quality gate before promotion.

| Stage | What it does | Tooling |
| --- | --- | --- |
| Provision | Create the Foundry resource, projects, model deployments, connections, role assignments | Bicep, ARM, Terraform, Azure CLI, `azd` |
| Build | Create the new agent version from the definition in the repository | Foundry SDK in a script |
| Evaluate | Run the agent on a test dataset and score it with evaluators; compare with the baseline version | `microsoft/ai-agent-evals` GitHub Action (preview), Azure DevOps extension |
| Gate and promote | Promote only if scores meet thresholds; then publish in the next environment | Pipeline approvals, environments |

Pipelines authenticate with **Microsoft Entra ID and workload identity federation** (OpenID Connect): the `azure/login` action exchanges a GitHub token for an Entra token, so no secret is stored. Give the pipeline identity the least privilege it needs: **Foundry User** on the project to create agent versions and run evaluations, and Contributor on a dedicated resource group only if the pipeline also provisions resources, never on the subscription.

```yaml
permissions:
  id-token: write
  contents: read

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
      - uses: microsoft/ai-agent-evals@v3-beta
        with:
          azure-ai-project-endpoint: ${{ vars.FOUNDRY_PROJECT_ENDPOINT }}
          deployment-name: eval-judge
          agent-ids: "support-agent:3,support-agent:4"
          data-path: ${{ github.workspace }}/evals/support.json
```

| Input | Meaning |
| --- | --- |
| `azure-ai-project-endpoint` | The project endpoint |
| `deployment-name` | The model deployment used by the AI-assisted evaluators |
| `agent-ids` | Agents to evaluate, as `name:version`; the first one is the baseline unless `baseline-agent-id` is set |
| `data-path` | JSON file listing the evaluators and the test queries |

The run summary shows the score of each metric with confidence intervals and, when several versions are evaluated, a statistical comparison that tells whether a difference is meaningful. Evaluations cost model tokens: run them on pull requests or before promotion rather than on every commit.

> **Exam trap.** `permissions: id-token: write` is what lets the workflow request the OIDC token. Without it, `azure/login` with federated credentials fails. Storing a client secret or an API key in the repository is never the expected answer.

<!-- section: key-points -->
## Key points

- Foundry resource (governance, deployments, network) contains projects (agents, files, evaluations); connected resources keep their own network and access settings.
- Standard agent setup = your Cosmos DB (at least 3,000 RU/s), Storage and Azure AI Search; basic setup = Microsoft-managed storage.
- Global Standard by default; Data Zone or Standard for residency; Provisioned for guaranteed throughput; Batch for 50 % cheaper asynchronous work; Developer for fine-tuned model tests.
- A deployment = name, model and version, SKU, capacity, content filter, version upgrade policy.
- Agents are versioned with `create_version`; publishing gives a stable endpoint.
- CI/CD: infrastructure as code, OIDC federation, Foundry User for the pipeline, evaluation gate with `ai-agent-evals` comparing versions.
