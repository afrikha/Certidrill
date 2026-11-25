Generative AI workloads built in Microsoft Foundry need four kinds of controls that the exam tests separately: a gateway that authenticates, limits and logs model traffic (AI Gateway in Azure API Management), threat detection on prompts and responses (Defender for AI services), content and security filters on what models and agents read and write (Foundry guardrails), and a single place to see the posture of data and AI resources (the Data and AI security dashboard).

<!-- section: ai-gateway | objectives: 3.1.7 -->
## AI Gateway in API Management for Foundry

The **AI gateway** capabilities of **Azure API Management** put an API Management instance in front of the model deployments of a Foundry resource. The instance acts as a reverse proxy with a single inbound endpoint: it authenticates the caller, applies token limits, logs the request and only then forwards it to the model deployment. Every API Management tier, classic or v2, can act as the gateway; support for individual AI gateway features depends on the tier.

Foundry can consume models through two distinct resource types:

| Path | Configuration | How projects use it |
| --- | --- | --- |
| API Management | Backends, authentication, policy XML, token limits and networking are configured in API Management (Azure portal or code). In Foundry: **Connections** > **Add connection** > **Model** > **Gateway** source, with the gateway base URL and authentication | As connected models. A **resource-scope** connection can be used across the projects of the Foundry resource; a **project-scope** connection is limited to one project |
| Azure AI Gateway | A separate product with its own portal and `az aigateway`; in Foundry, **Manage** > **Gateways** > **Azure AI Gateway** (Foundry UI integration still rolling out) | The aliases you select appear in projects as connected models |

The earlier preview experience linked and managed an API Management instance from the Foundry portal; new API Management links can no longer be created from Foundry. Existing links, APIs and policies keep working; their token-limit settings stay visible in Foundry, but are changed in the API Management policy XML.

> **Exam trap.** The gateway enforces its policies only on traffic sent to its endpoint. An application that calls the model deployment's own endpoint, or an MCP tool registered with its direct backend URL, bypasses the gateway: no token limits, no gateway logs. Code must use the gateway runtime endpoint, and agents the connected model. Management access to a gateway doesn't grant runtime access either.

Token limits are set with the `llm-token-limit` policy, per counter key (for example the API Management subscription of each team):

| Limit | What it caps | Response when exceeded |
| --- | --- | --- |
| `tokens-per-minute` | Rate | `429 Too Many Requests` |
| `token-quota` with `token-quota-period` | Volume over a period (Hourly, Daily, Weekly, Monthly, Yearly) | `403 Forbidden` |

Authentication and network controls of the gateway:

- Callers authenticate with **Microsoft Entra tokens** (each application uses its own managed identity) rather than one shared key, so a compromised application can't use another application's quota or identity.
- The gateway itself uses a **system-assigned or user-assigned managed identity** to call the model deployments: assign it **Cognitive Services OpenAI User** on the Foundry resource, and get the token with `authentication-managed-identity` for the resource `https://cognitiveservices.azure.com`. No key to store or rotate. Caller validation (`validate-azure-ad-token`) comes before the back-end authentication policies.
- Restrict the gateway endpoint with a **private endpoint** for callers inside Azure, or IP allowlisting for external callers, combined with Microsoft Entra token validation.

Custom policies are managed in the API Management instance. The AI gateway policies to recognize:

| Policy | Purpose |
| --- | --- |
| `llm-token-limit` | TPM limit or token quota per counter key (subscription, IP address...); can estimate prompt tokens and reject before calling the backend |
| `llm-emit-token-metric` | Sends token consumption metrics with custom dimensions to Azure Monitor |
| `llm-content-safety` | Sends prompts or completions to Azure AI Content Safety and returns `403` when content is flagged; `shield-prompt="true"` also checks for prompt attacks. Also covers MCP tool and A2A agent APIs |

```text
<llm-token-limit counter-key="@(context.Subscription.Id)"
    tokens-per-minute="500" estimate-prompt-tokens="false"
    remaining-tokens-variable-name="remainingTokens" />
```

To audit traffic, add a diagnostic setting on the API Management instance with **Logs related to ApiManagement Gateway**, sent to a Log Analytics workspace with **Resource specific** tables. Diagnostic logs capture request metadata (time, caller, response code, latency), **not request or response bodies** by default; bodies enabled per API are capped at 8,192 bytes each. For LLM APIs, also select **Logs related to generative AI gateway**: it records token usage and models and, if you enable message logging on the LLM API, the prompts and completions (split into 32 KB chunks, up to 2 MB per message). Then alert on anomalies such as a caller close to its token limit or an agent suddenly making far more model calls than usual.

```kusto
ApiManagementGatewayLogs
| where TimeGenerated > ago(1h)
| summarize Requests = count() by ApiId, ResponseCode
```

<!-- section: defender-ai-services | objectives: 3.1.8 -->
## Defender for AI services

**Threat protection for AI services** is a Defender for Cloud workload protection plan. It detects threats to generative AI applications in real time, such as jailbreak attempts, data leakage, data poisoning and credential theft, using Azure AI Content Safety **Prompt Shields** and Microsoft threat intelligence. Alerts can be correlated into incidents in the Microsoft Defender portal (Defender XDR).

Enable it: **Microsoft Defender for Cloud** > **Environment settings** > select the subscription > on the **Defender plans** page, set **AI services** to **On**. Enabling the plan requires **Owner** or **Contributor** level. Then open **Settings** for the plan to configure its components:

| Component | Effect | Notes |
| --- | --- | --- |
| Suspicious prompt evidence (**Enable user prompt evidence**) | Alerts include the suspicious segments of the prompt and model response, with sensitive data redacted | Off: prompts are still analyzed, but their content is masked in alerts |
| Data security for AI interactions | Lets Microsoft Purview analyze prompts and responses (classification, audit, insider risk, communication compliance, eDiscovery) | Paid Purview feature, requires a Purview license; not included in the plan. Doesn't include Foundry agent data; full data security policy support needs Entra ID calls with a user-context token |
| AI model security | Scans models in Azure Machine Learning registries for issues such as malware and serialization vulnerabilities | |

Coverage facts:

- Supported: Azure OpenAI models and Azure AI Model Inference service models. Only **text** tokens are scanned (not image or audio).
- Commercial clouds only; not for connected AWS accounts.

> **Exam trap.** Defender for AI services **detects and alerts**; it doesn't block a prompt. Blocking a jailbreak before it reaches the model is a guardrail (user prompt attacks control) in Foundry. Turning off prompt evidence doesn't stop detection, it only hides prompt text in alerts.

Posture for AI is a different capability: **AI security posture management** is part of **Defender CSPM**. It discovers the AI bill of materials (AI BOM) of applications built with Azure OpenAI, Foundry, Azure Machine Learning, Amazon Bedrock and Google Vertex AI, and adds recommendations (private endpoints, managed identity, identity-based authentication for Azure AI service accounts) and attack paths, for example grounding data exposed to the internet. Since July 1, 2026, discovery and posture of individual agents (Foundry agents, third-party cloud agents) requires a Microsoft Agent 365 license; Defender CSPM still discovers Foundry accounts and projects.

| Requirement | Plan |
| --- | --- |
| Alert on jailbreak attempts against an Azure OpenAI deployment | Defender for AI services |
| Show prompt text in the alert | Defender for AI services + user prompt evidence |
| Find AI resources whose grounding data is internet exposed | Defender CSPM (AI security posture) |
| Audit and classify prompts in Purview | Data security for AI interactions + Purview licence |

<!-- section: foundry-guardrails | objectives: 3.1.9 -->
## Guardrails for agents in Foundry

A **guardrail** is a named collection of **controls**. Each control defines a **risk** to detect, the **intervention points** to scan and the **action** to take. Risks are detected by Azure AI Content Safety classifiers. Guardrails apply to Foundry Models sold by Azure and to agents built in Foundry Agent Service (agent guardrails are in preview), not to other agents registered in the Foundry control plane.

| Risk | Models | Agents (preview) |
| --- | --- | --- |
| Hate, Sexual, Self-harm, Violence | Yes | Yes |
| User prompt attacks (jailbreak) | Yes | Yes |
| Indirect attacks (prompt injection in documents or tool output) | Yes | Yes |
| Protected material for text / for code | Yes | Yes |
| Personally identifiable information (preview) | Yes | Yes |
| Task adherence (preview) | Yes | Yes |
| Groundedness (preview), Spotlighting (preview) | Yes | No |

Groundedness detection (preview) in Azure OpenAI retires on April 30, 2027. Hosted agents also get network egress controls (generally available, except Transform rules, in preview).

Intervention points:

| Point | Scans | Applies to |
| --- | --- | --- |
| User input | The prompt sent to the model or agent | Models and agents |
| Tool call (preview) | The tool the agent wants to call and the data it sends | Agents |
| Tool response (preview) | Content returned by the tool, before it reaches the agent's memory or the user | Agents |
| Output | The final completion returned to the user | Models and agents |

Actions: **Annotate** (models only) or **Annotate and block** (models and agents). For the four harm categories, the blocking level is **Low** (blocks high severity only), **Medium** (medium and high) or **High** (low, medium and high, most restrictive); **Off** blocks nothing for that risk, and turning content harms off for outputs is only available to approved customers. Tool call and tool response controls only work with tools that support moderation, such as Azure AI Search, Azure Functions, OpenAPI, SharePoint grounding, Bing grounding and Browser Automation.

Assignment and inheritance:

- Models use the default guardrail `Microsoft.DefaultV2` unless you assign another. Default guardrails can't be edited: create a custom one.
- An agent without its own guardrail **inherits** the guardrail of its model deployment.
- An agent's guardrail **fully overrides** the model's guardrail. If the model has Violence at High and the agent's guardrail sets Violence at Low on input and output only, the agent is checked at Low and its tool calls aren't checked for Violence.
- A request can name another guardrail in the `x-policy-id` header; in the REST API a guardrail is an RAI policy assigned to a deployment through `raiPolicyName`.

Create one in the Foundry portal: **Build** > **Guardrails** > **Create Guardrail**; step 1 add controls (risk, intervention points, action, **Add control**), step 2 **Add agents** and/or **Add models**, step 3 review, name and **Create**. Assigning takes effect immediately. The role required is **Foundry Account Owner** or higher on the resource.

> **Exam trap.** Indirect prompt injection hidden in a web page or document returned by a tool is caught by the **Indirect attacks** risk at the **Tool response** point, not by user prompt attacks at the user input point. And a control on tool points has no effect if the tool doesn't support moderation.

<!-- section: data-ai-dashboard | objectives: 3.1.10 -->
## Data and AI security dashboard

The **Data and AI security dashboard** in Defender for Cloud gives one view of data resources (storage, managed databases, databases on VMs) and AI services, their protection status, their risks and their sensitive data. It works at subscription level and shows what the enabled plans allow.

Full value requires:

- **Defender CSPM** with the **sensitive data discovery** extension
- **Defender for Storage** and **Defender for Databases**
- Threat protection for **AI services**
- The `Microsoft.Security` resource provider registered on each subscription
- Read permissions on assessments, sub-assessments and alerts (`Microsoft.Security/assessments/read`, `Microsoft.Security/alerts/read`)

| Section | Shows |
| --- | --- |
| Data and AI security overview | Resources by category and whether each is fully, partially or not protected; resources with high or critical recommendations, alerts or attack paths |
| Top issues | Highest-severity alerts (by MITRE ATT&CK tactic), critical and high recommendations and attack paths |
| Data closer look | Sensitive data discovery (information types, sensitivity labels), data threat protection alerts, security explorer queries (plaintext secrets, public storage with sensitive data), internet-exposed data resources |
| AI closer look | AI discovery, AI threat protection (prompts scanned, alerts by severity), security explorer queries (sensitive data used for grounding, vulnerable containers used for AI), internet-exposed resources used for grounding |

From the dashboard, **Manage Sensitivity Settings** opens the tenant-level data sensitivity settings based on Microsoft Purview information types and labels.

> **Exam trap.** Without Defender CSPM and sensitive data discovery, the dashboard can't show which grounding data is sensitive or the attack paths to it; without the AI services plan, the AI threat protection widgets stay empty.

<!-- section: key-points -->
## Key points

- AI Gateway = API Management in front of Foundry models: Entra authentication, `llm-token-limit` TPM (`429`) and quota (`403`) per counter key, logging (generative AI gateway category for prompts and completions).
- API Management is configured in Azure, then consumed in Foundry through a Gateway connection (resource or project scope); new API Management links can't be created from Foundry, and traffic that skips the gateway endpoint isn't controlled.
- Defender for AI services detects (jailbreak, data leakage) and alerts; prompt evidence only adds prompt text to alerts; Purview integration needs a Purview licence.
- AI posture (AI BOM, attack paths) comes from Defender CSPM, not from the AI services plan.
- Guardrail = controls (risk + intervention point + action); agent guardrail overrides the model's; tool call and tool response points are agent-only.
- The Data and AI security dashboard is fed by Defender CSPM, Defender for Storage, Defender for Databases and the AI services plan.
