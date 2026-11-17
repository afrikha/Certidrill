Putting a foundation model into production means choosing how it is hosted (serverless API or managed compute), which model fits the task, how versions change without breaking the application, and how much reserved capacity a high-volume workload needs. Exam questions describe a workload (data residency, steady or bursty traffic, an open-source model, a model that retires next month) and ask for the deployment option, the deployment type, the version policy or the number of provisioned throughput units.

<!-- section: deployment-options | objectives: 3.2.1 -->
## Serverless API and managed compute deployments

Microsoft Foundry offers these deployment options:

| | Serverless API | Managed compute (preview in Foundry projects) |
| --- | --- | --- |
| Models | All Foundry Models: models sold directly by Azure (Azure OpenAI and others) and selected partner models | Open-source and partner models from the catalog (Hugging Face collection), NVIDIA NIM, industry models |
| Where it runs | Microsoft-hosted endpoints; nothing to size | Dedicated GPU capacity managed by Microsoft (A100, H100, MI300X accelerators) |
| Deployed on | The Foundry resource | A Foundry project |
| Billing | Per token, or per provisioned throughput unit (PTU) per hour | Per hour, per accelerator SKU, while the deployment exists |
| Quota | Tokens per minute (TPM) or PTUs per subscription, region and deployment type | Managed compute quota per accelerator family and region, separate from Azure VM quota |
| Content filtering | Built-in, customizable guardrails | Not in the data path in preview: call Azure AI Content Safety yourself |
| Data processing | Global, data zone or regional | Global |
| Authentication | Microsoft Entra ID or key | Microsoft Entra ID or key |

**Serverless API deployment types** (the SKU name is what templates and the CLI use):

| Deployment type | SKU name | Data processed | Billing |
| --- | --- | --- | --- |
| Global Standard | `GlobalStandard` | Any Azure region | Per token |
| Data Zone Standard | `DataZoneStandard` | Within a data zone (US, EU or APAC) | Per token |
| Standard | `Standard` | Within the Azure geography | Per token |
| Global Provisioned | `GlobalProvisionedManaged` | Any Azure region | PTU per hour |
| Data Zone Provisioned | `DataZoneProvisionedManaged` | Within a data zone | PTU per hour |
| Regional Provisioned | `ProvisionedManaged` | Within the Azure geography | PTU per hour |
| Global Batch / Data Zone Batch | `GlobalBatch` / `DataZoneBatch` | Global / data zone | 50 % less than Global Standard, 24-hour target |
| Developer | `DeveloperTier` | Any Azure region | Per token; fine-tuned model evaluation only, no SLA, deleted after 24 hours |

**Managed compute in a Foundry project** (preview, no SLA, not recommended for production) uses the SKU `GlobalManagedCompute`, a deployment template and an accelerator type (for example `H100_80GB`). You scale by changing the number of model instances (`sku.capacity`), not the node size. Provisioning takes about 10 to 15 minutes; billing stops when you delete the deployment. Creating, updating or deleting these deployments requires Cognitive Services Contributor, Foundry Account Owner or Foundry Owner; calling them with Microsoft Entra ID requires Foundry User. The endpoint is the resource's OpenAI-compatible endpoint (`https://<account>.services.ai.azure.com/openai/v1/`) and the `model` field is the deployment name.

**Hub-based projects (Foundry classic)** expose the same two ideas through Azure Machine Learning:

| | Serverless API endpoint (classic) | Managed compute (classic) |
| --- | --- | --- |
| Resource | `az ml serverless-endpoint` in a hub-based project | Managed online endpoint and deployment |
| Model reference | Registry model ID **without** a version: the endpoint always uses the latest version | Registry model ID **with** a version, such as `azureml://registries/azureml/models/Phi-4/versions/8` |
| Infrastructure and quota | None; no subscription quota needed; 200,000 TPM and 1,000 requests per minute per deployment; one deployment per model per project | VM instance type and count; consumes VM core quota of the region |
| Partner models | Azure Marketplace subscription per project and offer (`az ml marketplace-subscription`) | Azure Marketplace access for partner and community models |
| Authentication | Key | Key (`auth_mode: key` in the classic sample) |
| Scoring URI | Shown as Target URI with its key | `https://<endpoint-name>.<region>.inference.ml.azure.com/score` |
| Role | Azure AI Developer on the resource group | Azure AI Developer on the resource group |

```yaml
# endpoint.yml for: az ml serverless-endpoint create -f endpoint.yml
name: DeepSeek-R1-qwerty
model_id: azureml://registries/azureml-deepseek/models/DeepSeek-R1
```

```bash
az ml serverless-endpoint create -f endpoint.yml
az ml serverless-endpoint get-credentials -n DeepSeek-R1-qwerty
```

Deleting the Marketplace model subscription makes its serverless endpoints Unhealthy and unusable.

| Requirement | Option |
| --- | --- |
| Azure OpenAI or another model sold by Azure, no infrastructure, pay per token | Serverless API, pay-per-token deployment type (Global Standard by default) |
| Open-source model not offered as a serverless API | Managed compute |
| Content filtering must be applied by the platform | Serverless API (managed compute has none in preview) |
| Steady high volume with predictable latency | Serverless API with a provisioned deployment type |
| A custom model you trained in Azure Machine Learning | Managed online endpoint (managed compute) |
| Lowest cost for millions of asynchronous requests | Global Batch |

> **Exam trap.** Managed compute bills per accelerator hour even when nobody calls the model, and its quota is not your VM quota. Serverless API bills per token (or per PTU-hour for provisioned types). If the stem says "only pay for what is used" and the model is offered as a serverless API, managed compute is wrong.

<!-- section: model-selection | objectives: 3.2.2 -->
## Selecting models for a use case

The **model leaderboards** (preview) in the Foundry portal compare text models (LLMs and SLMs) and embedding models on public benchmarks:

| Leaderboard | Metric | Reading |
| --- | --- | --- |
| Quality | Quality index: average of accuracy scores across benchmark datasets | 0 to 1, higher is better |
| Safety | Attack success rate (HarmBench), Toxigen F1, WMDP accuracy | Lower attack success rate is safer; higher WMDP accuracy means more hazardous knowledge |
| Performance | Latency (mean, P50, P90, P95, P99), time to first token, generated tokens per second, total tokens per second | Lower latency, higher throughput is better |
| Cost | Cost to run the model on the benchmark | Lower is cheaper |
| Embeddings | Accuracy, F1, NDCG at 10, precision and other retrieval and clustering metrics | Higher is better |

**Scenario leaderboards** group datasets by task (reasoning, coding, math, question answering, groundedness, toxicity detection...). For a task-specific choice, start from the scenario leaderboard rather than the overall quality index, then open the model's detailed benchmark results, try it in the playground and evaluate it on your own data.

| Requirement | Selection |
| --- | --- |
| Simple, high-volume task (classification, extraction, short answers) | A small model (`-mini`, `-nano` or an SLM): a fraction of the cost and latency |
| Multi-step reasoning, complex planning, code | A reasoning model; prompt techniques such as chain of thought aren't recommended for reasoning models |
| Images in the prompt | A model with image input |
| Very long documents | A model whose context window fits the input |
| Model not available as a serverless API in the required region | Another region, another deployment type, or managed compute |
| Mixed workload, mix of easy and hard prompts | Model router |
| Retrieval quality for RAG | An embedding model chosen on the embedding leaderboard, then tested on your corpus |

**Model router** is a deployable model that routes each prompt to the most suitable underlying model. Routing modes: **Balanced** (default; cheapest model within a small quality band of the best), **Quality** (highest quality, cost ignored) and **Cost** (larger quality band for more savings). A **model subset** limits which models it may use and acts as the fallback set (choose at least two). It deploys with Global Standard or Data Zone Standard; its effective context window is that of the smallest model in the subset, and it doesn't process audio.

> **Exam trap.** A model at the top of a public leaderboard isn't automatically the right answer. When the stem asks how to confirm that a cheaper model is good enough for your application, the answer is an evaluation on your own dataset, not a benchmark score.

<!-- section: versioning-strategies | objectives: 3.2.3 -->
## Model versioning and production deployment strategies

A deployment pins a model name and version behind a **deployment name** that the application sends as `model`. Use a stable, role-based deployment name (`chat-prod`) so that code doesn't change when the model does.

Model lifecycle stages:

| Stage | Meaning |
| --- | --- |
| Preview | Retirement date "not sooner than" about 90 days after launch; deployments are force-upgraded or retired |
| Generally available | Retirement date set about 18 months out |
| Legacy (optional) | Newer models exist; plan migration |
| Deprecated | Existing customers keep their deployments; new customers can't deploy |
| Retired | Removed; every inference request returns `410 Gone` |

Notices go to subscription owners with active deployments at least **60 days** before retirement for GA models and **30 days** for preview models, by email and Azure Service Health. Retirement dates can't be extended.

The `versionUpgradeOption` of a Standard-type deployment decides what happens:

| Value | Behavior |
| --- | --- |
| `OnceNewDefaultVersionAvailable` | Upgrades to the new default version within two weeks of it becoming the default |
| `OnceCurrentVersionExpired` | Stays pinned; upgrades to the current default at retirement. `null` behaves the same |
| `NoAutoUpgrade` | Never upgrades; the deployment **stops working** at retirement |

Automatic upgrades apply only to Standard deployment types. **Provisioned deployments are never auto-upgraded**: migrate them either **in place** (same deployment name and size, new model version; traffic moves over 20 to 30 minutes, state "updating") or with a **multi-deployment** migration (create a new provisioned deployment, move traffic, check that the old one receives no requests for 5 to 10 minutes, delete it). Migrations happen only between deployments of the same deployment type. The Azure CLI can read `versionUpgradeOption` but can't set it: use Bicep or ARM templates, REST or Azure PowerShell.

A safe production rollout of a new model version:

1. Deploy the new version as a **second deployment** next to the current one (for example `chat-v2` beside `chat-prod`).
2. Run the same evaluation dataset against both and compare quality, latency and cost; check API compatibility, feature support, region, quota and capacity.
3. Shift traffic through configuration (the deployment name read by the application, a gateway or a weighted route), starting with a small share.
4. Keep the previous deployment until metrics confirm the change; rolling back is switching the name back.
5. Delete the old deployment when it no longer receives traffic.

| Requirement | Strategy |
| --- | --- |
| Never change model behavior without testing | Pin the version with `OnceCurrentVersionExpired` (or `NoAutoUpgrade`) and upgrade deliberately after evaluation |
| Always run the newest default with no manual work | `OnceNewDefaultVersionAvailable` |
| Model retires next month on a provisioned deployment | Migrate manually (in place or multi-deployment) before the date |
| Instant rollback | Two deployments; switch the deployment name in configuration |

> **Exam trap.** `NoAutoUpgrade` doesn't keep an old version alive after retirement: the deployment simply fails from that date. And a model router deployment on its latest version gains new underlying models over time, which can change quality and cost: evaluate it against your baseline.

<!-- section: provisioned-throughput | objectives: 3.2.4 -->
## Provisioned throughput units for high-volume workloads

A **provisioned throughput unit (PTU)** is a fixed amount of model processing capacity reserved for a deployment. PTU quota isn't tied to a model: the same quota serves any model that supports provisioned deployments in that region and deployment type.

| Concept | Rule |
| --- | --- |
| Quota | Maximum PTUs per subscription, region and deployment type; a free policy limit (Foundry portal: Manage, Quota, Provisioned throughput unit; request more there) |
| Capacity | PTUs actually available for a model in the region, allocated at deployment time; quota doesn't guarantee it, and the deployment fails if capacity is short |
| Billing | Per PTU per hour from creation to deletion, whatever the tokens consumed |
| Azure Reservations | 1-month or 1-year commitment for a discounted hourly rate, per deployment type; don't guarantee capacity: create the deployment first, then buy the reservation |
| Scaling | Change the PTU count at any time; scaling down releases capacity that may not be available again, so don't scale up and down with traffic |

Each model has a minimum and an increment. For Global and Data Zone provisioned deployments of current models, the minimum is 15 PTUs in increments of 5; Regional provisioned minimums are higher (25 or 50 depending on the model, in matching increments).

**Sizing.** The capacity calculator in the Foundry portal computes PTUs from peak requests per minute, average input and output tokens and the cache rate:

```text
Input TPM       = peak RPM x average input tokens
Output TPM      = peak RPM x average output tokens
Normalized TPM  = input TPM x (1 - cache rate) + output-to-input ratio x output TPM
PTUs            = normalized TPM / input TPM per PTU, rounded up to the increment
```

| Model | Input TPM per PTU | Output-to-input ratio |
| --- | --- | --- |
| gpt-4.1 | 3,000 | 4 |
| gpt-4.1-mini | 14,900 | 4 |
| gpt-5 | 4,750 | 8 |
| gpt-5-mini | 23,750 | 8 |

Example: gpt-4.1, 600 requests per minute at peak, 1,000 input and 200 output tokens per request, no cache. Normalized TPM = 600,000 + 4 x 120,000 = 1,080,000, so 360 PTUs, a valid Global Provisioned size (multiple of 5); a Regional deployment rounds up to its larger increment.

**Utilization.** Watch the **Provisioned-managed utilization V2** metric in Azure Monitor. At 100 % utilization the deployment returns **HTTP 429** immediately, with `retry-after` and `retry-after-ms` headers: it's a traffic-management signal, not a service error. Options: retry after the indicated delay (the OpenAI SDKs retry twice by default), send the request to another deployment, or configure **spillover**, which routes requests that would be rejected to a standard deployment in the same Foundry resource, for every request of the deployment or per request with the `x-ms-spillover-deployment` header. Spillover is supported for Azure OpenAI models, not for models from other providers.

```bash
az cognitiveservices account deployment create \
  --name contoso-ai-prod --resource-group rg-ai-prod \
  --deployment-name chat-ptu \
  --model-name gpt-4.1 --model-version "2025-04-14" --model-format OpenAI \
  --sku-name GlobalProvisionedManaged --sku-capacity 360 \
  --spillover-deployment-name chat-standard
```

Creating a provisioned deployment requires Contributor or Cognitive Services Contributor on the subscription or resource group. Inference code is the same as for any other deployment type: pass the deployment name as `model`.

| Requirement | Answer |
| --- | --- |
| Consistent latency for steady, high, predictable traffic | Provisioned deployment |
| Occasional peaks above the provisioned capacity | Spillover to a standard deployment |
| Lowest hourly cost for a workload that runs all year | Provisioned deployment plus a 1-year reservation bought after the deployment succeeds |
| Data must stay in the EU with reserved throughput | `DataZoneProvisionedManaged` |
| Bursty, low or unpredictable volume | Standard (pay per token) deployment |

> **Exam trap.** A 429 from a provisioned deployment means it's at 100 % utilization, not that the quota is exhausted; adding PTU quota changes nothing until the deployment itself has more PTUs. And buying a reservation never creates capacity.

<!-- section: key-points -->
## Key points

- Serverless API: token or PTU billing, built-in content filters, deployment types `GlobalStandard`, `DataZoneStandard`, `Standard`, provisioned and batch. Managed compute: hourly per accelerator, own quota, no built-in filtering in preview.
- Classic hub-based projects: `az ml serverless-endpoint` (model ID without version, Marketplace subscription for partner models) and managed online endpoints (versioned model ID, VM quota).
- Choose models with scenario leaderboards, then confirm with an evaluation on your data; model router for mixed workloads.
- `versionUpgradeOption`: `OnceNewDefaultVersionAvailable`, `OnceCurrentVersionExpired` (default), `NoAutoUpgrade` (fails at retirement). Provisioned deployments are never auto-upgraded. Retired models return `410 Gone`.
- PTUs: quota is not capacity; billed hourly; reservations after deployment; 429 at 100 % utilization; spillover to a standard deployment.
