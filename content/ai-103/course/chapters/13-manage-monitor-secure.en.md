Once a Foundry solution runs, you manage how much it can consume and what it costs, watch the quality of the model, the agents and the retrieval pipeline, and lock down identities and networks. Exam questions describe a symptom (HTTP 429, a bill that doubled, answers that drift, an indexer that skips files, a key found in code) and ask for the right setting, metric or role.

<!-- section: quotas-cost | objectives: 1.3.1 -->
## Managing quotas, scaling, rate limits and cost

**Quota** is assigned to a subscription per region, per model and per deployment type, in tokens per minute (TPM). You split it among deployments: with 240,000 TPM of a model in a region, you can create one deployment of 240,000 TPM or two of 120,000, as long as the total in that region stays within the quota. Each deployment then enforces a **rate limit** derived from its TPM, plus a requests-per-minute (RPM) limit whose ratio to TPM depends on the model (6 RPM per 1,000 TPM for older chat models; the quota page lists lower RPM ratios for the o-series reasoning models).

How limits are evaluated:

- Tokens counted are the actual input and generated tokens, not the maximum output configured in the request: a high `max_output_tokens` doesn't reserve TPM.
- Requests are checked over short windows, typically 1 or 10 seconds: a 600-RPM deployment is throttled if it receives more than 10 requests in one second.
- A request over the limit returns **HTTP 429**. The response includes `retry-after-ms`; every response includes `x-ratelimit-remaining-tokens` and `x-ratelimit-remaining-requests`. Failed requests still count toward the limit.
- On Standard deployments, the service can temporarily lower the effective limit under heavy load; a value of `x-ratelimit-limit-tokens` below your TPM shows it.

**Provisioned throughput** works differently. A provisioned throughput unit (PTU) is a fixed amount of model processing capacity reserved for your deployment and billed per PTU and per hour, whatever the tokens consumed. PTU quota is a policy limit per subscription, region and deployment type; it doesn't guarantee that **capacity** is available, and the deployment fails if the region lacks capacity. Azure Reservations (1 month or 1 year) discount the hourly rate but don't guarantee capacity either: create the deployment first, then buy the reservation. Size PTUs with the capacity calculator in the Foundry portal from requests per minute, average input and output tokens and cache rate.

**Spillover** routes the requests that a fully used provisioned deployment would reject (for example with 429) to a standard deployment in the same Foundry resource, per deployment or per request with the `x-ms-spillover-deployment` header.

| Symptom or goal | Action |
| --- | --- |
| Occasional 429 on a Standard deployment | Retry with exponential back-off honoring `retry-after-ms`; smooth bursts |
| Constant 429, quota not fully allocated | Raise the deployment's TPM |
| Constant 429, regional quota exhausted | Request a quota increase (Foundry portal: Manage, Quota), or deploy in another region and load-balance |
| Consistent latency at high, steady volume | Provisioned deployment, sized with the capacity calculator |
| Bursts above provisioned capacity | Spillover to a standard deployment |
| See available quota | Cognitive Services Usages Reader at subscription scope |
| Large offline jobs at lowest cost | Global Batch or Data Zone Batch (50 % less) |

Cost levers, from the most effective:

| Lever | Effect |
| --- | --- |
| Right-size the model | A `-mini` or `-nano` model, or an SLM, costs a fraction of a large model for simple tasks |
| Batch deployments | 50 % less than Global Standard for work that can wait 24 hours |
| Shorter prompts and outputs | Trim instructions and retrieved chunks; cap `max_output_tokens` |
| Fewer agent steps | Limit tool calls and reasoning loops; each step consumes tokens |
| Reserved PTUs | For steady load only: idle PTUs are still billed |
| Budgets and Cost Management | Alerts on spend per resource group or tag |

> **Exam trap.** Quota and rate limit aren't the same thing. If the regional quota is already fully allocated, raising a deployment's TPM fails: you first free quota from another deployment or request an increase. And having PTU quota doesn't mean a provisioned deployment will succeed: capacity must exist in the region.

<!-- section: monitor-models | objectives: 1.3.2 -->
## Monitoring model performance, drift, safety and grounding

Foundry observability has three parts, all integrated with Azure Monitor Application Insights: **evaluation** (quality, safety and reliability scores on datasets, production traces or simulated conversations), **monitoring** (real-time dashboards of operational metrics, token consumption, latency, error rates and quality scores, with alerts), and **tracing** (built on OpenTelemetry: every model call, tool invocation and reasoning step of a run). Connect an Application Insights resource to the project to collect traces and metrics.

In production, combine four practices: operational metrics, **continuous evaluation** of production traffic at a sampled rate, **scheduled evaluation** on test datasets to detect drift, and scheduled red teaming; Azure Monitor alerts notify you when outputs fail quality thresholds or produce harmful content. In the Agent Monitoring Dashboard, recurring evaluations, red team scans and alerts are marked preview; continuous evaluation isn't.

| What to watch | Signal | Where |
| --- | --- | --- |
| Performance | Latency, tokens per request, request volume, error rates and 429 | Azure Monitor metrics of the resource, Foundry dashboards, traces |
| Provisioned utilization | Utilization of the PTU deployment; 429 when it is full | Azure Monitor metrics |
| Safety events | Prompts and completions blocked or annotated by content filters, by category and severity; outputs flagged by safety evaluators | Content filter results returned with responses, continuous evaluation, alerts |
| Grounding quality | Groundedness and relevance scores; answers not supported by the retrieved context | Evaluators run on traffic or on a test set |
| Drift | A metric that degrades over time for the same type of request | Scheduled evaluation on the same test dataset, compared run after run |

Drift comes from several causes, each with its check:

| Cause | How to detect it |
| --- | --- |
| A model version changed (automatic upgrade) | Version upgrade policy, deployment history, evaluation before and after |
| User questions changed | Relevance scores (and Intent Resolution, in preview) on sampled traffic |
| Source content changed or the index is stale | Groundedness scores, indexer status (next section) |
| Prompts or tools changed | Compare agent versions with the same evaluation dataset |

Built-in evaluator families: general purpose (coherence, fluency), RAG (groundedness, relevance, retrieval, response completeness), agents (task adherence, task completion, intent resolution, tool call accuracy, tool selection), and risk and safety (hate and unfairness, sexual, violence, self-harm, protected materials, indirect attack, code vulnerability, sensitive data leakage). Response Completeness, Groundedness Pro, Task Adherence, Task Completion and Intent Resolution are in preview; the tool evaluators (Tool Call Accuracy, Tool Selection, Tool Input Accuracy, Tool Output Utilization, Tool Call Success) aren't.

> **Exam trap.** A content filter blocks harmful content at run time but says nothing about whether an answer is correct. To detect answers that aren't supported by the documents, run a groundedness evaluator. To see why a single run failed (which tool was called, with what arguments, how long it took), open its trace.

<!-- section: monitor-search | objectives: 1.3.3 -->
## Monitoring ingestion, index health and relevance

The quality of a RAG answer can't exceed the quality of retrieval. Watch the pipeline from source to query:

| Area | Check | Tool |
| --- | --- | --- |
| Ingestion | Status of each run (`success`, `transientFailure`, `persistentFailure`, `Reset`), items processed, items failed, document errors and warnings; up to 50 runs kept | Indexer execution details in the portal, Get Indexer Status API |
| Enrichment | Which skill failed, with which input; images or PDFs with no text | Debug sessions, indexer warnings, Skill execution invocation count (dimension Failed) |
| Freshness | Indexer schedule and change detection; time of the last successful run | Indexer status |
| Index health | Document count against the source; storage and vector storage against the tier limits | Index statistics, Storage usage and Vector Storage usage metrics |
| Service health | Search Latency, Search queries per second, Throttled search queries percentage | Azure Monitor metrics of the search service |
| Query detail | Each operation (`Query.Search`, `Indexers.Status`...) with its result | Resource logs (category `OperationLogs`) sent to Log Analytics, table `AzureDiagnostics` |
| Relevance | Scores and order of results for a set of test queries | Search Explorer, `@search.score`, `@search.rerankerScore`, evaluators |

```json
{
  "status": "running",
  "lastResult": {
    "status": "success",
    "errorMessage": null,
    "itemsProcessed": 1840,
    "itemsFailed": 12,
    "errors": [ { "key": "manuals/x200.pdf", "errorMessage": "..." } ]
  }
}
```

The top-level `status` of `running` only means the indexer is available to run; the result of each run is in `lastResult` and `executionHistory`. A run ends in `persistentFailure` when its errors exceed the indexer's **Max failed items** setting; below that limit, a run with document errors still reports `success`.

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.SEARCH" and Category == "OperationLogs"
| where OperationName == "Query.Search"
| summarize count() by ResultSignature, bin(TimeGenerated, 1h)
```

Throttled queries return "You are sending too many requests" or HTTP 503 when the requests in execution exceed the service capacity.

Relevance scores differ by query type: `@search.score` is BM25 for keyword queries, similarity for vector queries and the RRF fusion score for hybrid queries; `@search.rerankerScore` comes from the semantic ranker, from 0 to 4, and is comparable across queries. Improve relevance with hybrid queries, the semantic ranker, a better chunk size, scoring profiles or a minimum score threshold, and measure each change on the same set of test queries.

> **Exam trap.** An indexer run that reports `success` can still have skipped content: failed items under the Max failed items limit, warnings for images or PDFs without text. Check `itemsFailed`, errors and warnings, not only the status. And a rising Throttled search queries percentage points to capacity (add replicas), not to relevance.

<!-- section: security | objectives: 1.3.4 -->
## Configuring identity, keyless access, networking and roles

**Keyless credentials.** API keys grant full access to the resource with no role restriction, can leak and must be rotated. Microsoft Entra ID authentication applies Azure RBAC and keeps secrets out of code. In code, `DefaultAzureCredential` uses the developer's sign-in locally and the managed identity in Azure:

```text
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient

project = AIProjectClient(
    endpoint="https://contoso-foundry.services.ai.azure.com/api/projects/support",
    credential=DefaultAzureCredential(),  # no key in code or configuration
)
```

Steps to make an application keyless:

1. Enable a managed identity on the compute that runs the application (App Service, Container Apps, Functions, virtual machine).
2. Assign that identity the least-privileged role on the project, for example **Foundry User**.
3. Use `DefaultAzureCredential` (or `ManagedIdentityCredential`) in the code and remove the keys from the configuration.
4. Disable key authentication on the Foundry resource (`disableLocalAuth: true`); enforce it at scale with the built-in policy *Azure AI Services resources should have key access disabled (disable local authentication)*. The change can take minutes to hours to reach the gateway: old keys may work during that window, then return HTTP 401.

**Roles** (renamed from Azure AI to Foundry; IDs unchanged):

| Role | For | Can | Can't |
| --- | --- | --- | --- |
| Foundry Agent Consumer | Applications and users that only call agents | Interact with agent endpoints | Build, deploy |
| Foundry User | Developers, application identities, the project's managed identity | Data actions: build agents, run evaluations, call models | Create projects, deploy models, assign roles |
| Foundry Project Manager | Team leads | What Foundry User can, publish agents, assign the Foundry User role only | Manage models |
| Foundry Account Owner | Administrators | Create resources and projects, manage deployments, assign Foundry User | Build agents (no data actions) |
| Foundry Owner | Administrators who also build | Everything above | |
| Cognitive Services Usages Reader | Quota viewers | Read quota at subscription scope | |

Developers get Foundry User on the project and Reader on the Foundry resource. Avoid Owner and Contributor for daily work: Contributor can deploy models but has no data actions. Azure AI Developer applies to hubs and Azure Machine Learning workspaces, not to Foundry projects.

**Managed identities between services.** The Foundry resource and its projects have managed identities. Give the project's managed identity Foundry User on the Foundry resource; for a storage account created outside Foundry, give the Foundry resource's managed identity Storage Blob Data Reader; for the Azure AI Search tool, give the Foundry account's system-assigned managed identity Search Index Data Contributor and Search Service Contributor on the search service (the tool page's troubleshooting names the project's managed identity instead).

**Private networking.**

| Requirement | Configuration |
| --- | --- |
| No access to the Foundry resource from the internet | Private endpoint in the same region as the virtual network; public network access **Disabled** |
| Access only from known networks | Public network access **Enabled from selected IP addresses** (selected networks) |
| Agents must reach resources inside your virtual network | Network injection: a subnet delegated to `Microsoft.App/environments`, /27 or larger, with the standard setup; decide it at deployment, it can't be added later |
| Connected Storage, Azure Cosmos DB, Azure AI Search private too | A private endpoint on each: they aren't created automatically |
| Azure AI Search must reach the Foundry resource behind its firewall | Trusted Azure services exception, plus a role for the search service's managed identity |
| Name resolution | Private DNS zone for the `privatelink` subdomain linked to the virtual network |

Some agent tools aren't supported with network injection: computer use, image generation and Logic Apps are under development, and the Fabric data agent needs public network access; Fabric IQ and workflow agents are only partly supported. Grounding with Bing, web search and SharePoint grounding use public endpoints. An indexer that must reach its data source through private endpoints needs `executionEnvironment` set to `"Private"`; otherwise indexing can fail silently and leave an empty index. A search service with public access disabled behind a private endpoint needs the standard agent setup with network injection, and the Search tool connection must use the project's managed identity: key-based authentication isn't supported with private networking.

> **Exam trap.** Azure RBAC applies only with Microsoft Entra ID authentication. A caller with an API key bypasses every role, so "only users with role X may call the model" requires disabling local authentication. And the role that lets an application call models and agents is a data role (Foundry User), not Contributor or Owner.

<!-- section: key-points -->
## Key points

- Quota: TPM per subscription, region, model and deployment type; split among deployments. Rate limit: enforced per deployment; 429 with `retry-after-ms`.
- PTU quota isn't capacity; reservations discount but don't reserve; spillover sends overflow to a standard deployment.
- Cost: smaller model, batch, shorter prompts and outputs, fewer agent steps; idle PTUs are billed.
- Monitor with traces, evaluations and metrics; groundedness for grounding quality, content filter results for safety events, repeated evaluations for drift.
- Search: indexer status, items failed and warnings, throttled queries, `@search.rerankerScore` 0 to 4, logs in Log Analytics.
- Keyless: managed identity plus Foundry User plus `DefaultAzureCredential`, then `disableLocalAuth`. Private endpoints for the resource and each connected resource; subnet delegated to `Microsoft.App/environments` for agents.
