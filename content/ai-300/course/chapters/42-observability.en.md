Evaluation before release tells you whether a generative AI application is good enough; observability tells you whether it stays good, fast and affordable once real users arrive. In Microsoft Foundry, observability rests on three capabilities that share one store, the **Application Insights** resource connected to the project: **evaluation** of outputs (now also on live traffic), **monitoring** dashboards and alerts, and **tracing** built on OpenTelemetry. Model deployments add their own **Azure Monitor metrics** and **resource logs**, and Cost Management adds the bill. Exam questions give a symptom (latency doubled, the token bill jumped, quality dropped since last week, no trace appears) and ask which metric, log, setting or role answers it.

<!-- section: continuous-monitoring | objectives: 4.2.1 -->
## Continuous monitoring in Foundry

After deployment, Foundry monitors an application at four levels:

| Capability | What it does | Data |
| --- | --- | --- |
| Operational metrics | Token usage, latency, run success rate, error rates | Live traffic |
| **Continuous evaluation** | Runs quality and safety evaluators on **a sample of production traffic** | Live responses |
| **Scheduled evaluation** (recurring evaluations, preview) | Runs evaluators on a fixed test dataset on a schedule, to detect **system drift** | Test dataset |
| **Scheduled red teaming** (red team scans, preview) | Recurring adversarial scans for safety and security weaknesses | Generated attacks |
| **Alerts** (preview) | Notify when latency, token usage, evaluation scores or red team findings cross a threshold | All of the above |

The **Monitor** tab of an agent (Build, Agents, select the agent, Monitor) is the dashboard. It shows summary cards and charts for the selected time range:

| Metric | Investigate when |
| --- | --- |
| Token usage | High usage: verbose prompts or responses |
| Latency | Above 10 seconds: throttling, complex tool calls or network issues |
| Run success rate | Below 95 % |
| Evaluation metrics | Scores from evaluators running on sampled outputs drop |
| Red teaming results | A scheduled scan fails |

Prerequisites, in order:

1. Connect an **Application Insights** resource to the project (Agents, Traces, **Connect**, or Manage, Project details, Connected resources, Add connection). Monitoring data and traces are stored there; retention and billing follow its configuration.
2. Give readers **Log Analytics Reader** on the Log Analytics workspace behind it, plus **Privileged Monitoring Data Reader** if its tables are protected.
3. For continuous evaluation, assign the **project's managed identity** the **Foundry User** role (formerly Azure AI User) on the project: the evaluations run as that identity.

A continuous evaluation is an evaluation object plus an **evaluation rule** that fires on each completed response, up to an hourly cap:

```text
from azure.ai.projects.models import (
    EvaluationRule, ContinuousEvaluationRuleAction,
    EvaluationRuleFilter, EvaluationRuleEventType,
)

eval_object = openai_client.evals.create(
    name="support-agent-continuous",
    data_source_config={"type": "azure_ai_source", "scenario": "responses"},
    testing_criteria=[
        {"type": "azure_ai_evaluator", "name": "violence_detection",
         "evaluator_name": "builtin.violence"},
    ],
)

project_client.evaluation_rules.create_or_update(
    id="support-agent-rule",
    evaluation_rule=EvaluationRule(
        display_name="Support agent continuous evaluation",
        action=ContinuousEvaluationRuleAction(eval_id=eval_object.id, max_hourly_runs=100),
        event_type=EvaluationRuleEventType.RESPONSE_COMPLETED,
        filter=EvaluationRuleFilter(agent_name="support-agent"),
        enabled=True,
    ),
)
```

The default cap is **100 runs per hour**; when it is reached, further runs are **skipped** until the next hour, so raise `max_hourly_runs` if coverage is too low. Custom evaluators are added under Monitor, Settings, Continuous evaluation, Add evaluator(s). Scheduled evaluations use a schedule with a recurrence trigger (for example daily at 9 AM) over agent traces or a dataset.

Agents that don't run on Foundry can use the same dashboard: register them in the Foundry control plane, instrument them with the **OpenTelemetry semantic conventions for generative AI**, and send telemetry to the **same Application Insights instance** as the project.

> **Exam trap.** Continuous evaluation scores **live production responses** at a sampled rate; scheduled evaluation re-runs a **fixed test dataset** to detect drift of the system over time. "Quality of what users get today" is continuous evaluation; "did last week's model update change answers to our golden questions" is scheduled evaluation.

> **Exam tip.** Charts empty: no traffic in the time range, or ingestion delay. Authorization error: Log Analytics Reader missing. Continuous evaluation results missing: rule disabled, or the project's managed identity lacks Foundry User. Runs skipped: hourly limit reached. Note also that evaluations in the agents playground are **on by default** and billed; turn them off under metrics in the playground.

<!-- section: performance-metrics | objectives: 4.2.2 -->
## Monitoring latency, throughput and response times

Per-call latency of a model deployment decomposes into:

```text
TTLT = TTFT + (TBT x tokens generated)
```

Time to first token (TTFT) is how long the user waits before anything appears, time between tokens (TBT) is the generation speed, and time to last token (TTLT) is the end-to-end response time. Because TTLT grows with output length, a longer answer is slower without any service problem: always read a latency metric **together with a token count metric**. **Throughput** is measured in tokens per minute (TPM) and requests per minute; on Standard deployments quota governs admission, not guaranteed throughput.

Deployment metrics are collected automatically in Azure Monitor (time grain one minute). In the Azure portal, Monitor, Metrics, set the resource type to **Foundry Tools**; in the Foundry portal, open the deployment's **Metrics** tab.

| Metric (display name) | REST name | Measures |
| --- | --- | --- |
| Time to Response | `AzureOpenAITimeToResponse` | TTFT, the recommended responsiveness metric for **streaming**; measured at the API gateway, excludes client latency |
| Time Between Tokens | `AzureOpenAINormalizedTBTInMS` | TBT, generation speed of streaming requests |
| Time to Last Byte | `AzureOpenAITTLTInMS` | TTLT, overall time of non-streaming requests |
| Normalized Time to First Byte | `AzureOpenAINormalizedTTFTInMS` | First-byte latency divided by prompt tokens: compare across prompt sizes only |
| Tokens Per Second | `AzureOpenAITokenPerSecond` | Generated tokens per second of generation |
| Azure OpenAI Requests | `AzureOpenAIRequests` | Request volume, split by `StatusCode` (429s) or `IsSpillover` |
| Provisioned-managed Utilization V2 | `AzureOpenAIProvisionedManagedUtilizationV2` | PTUs consumed divided by PTUs deployed; at 100 % calls return **HTTP 429** |
| Model Availability Rate | `ModelAvailabilityRate` | (calls minus server errors) divided by calls; server errors are HTTP 500 and above |

Useful dimensions are `ModelDeploymentName`, `ModelName`, `ModelVersion`, `StatusCode` and `StreamType`. Time Between Tokens and Tokens Per Second aren't available for Standard deployments. Don't use the legacy **Latency** metric of the Cognitive Services HTTP Requests category for Azure OpenAI.

Diagnosis order:

1. Non-streaming: Time to Last Byte split by deployment, next to Generated Completion Tokens. Both rising together is expected. TTLT rising alone: check Provisioned-managed Utilization V2 (provisioned) or Azure OpenAI Requests for 429s and concurrency.
2. Streaming: Time to Response, Time Between Tokens and Processed Prompt Tokens. A larger prompt raises TTFT; Time Between Tokens rising means the deployment is under load.

| Symptom or goal | Action |
| --- | --- |
| Long waits before the first word in a chat UI | Enable streaming (`stream: true`): first token earlier, total time unchanged |
| Long total time | Lower `max_tokens`, add stop sequences, keep `n` at 1, generate fewer tokens |
| Slow model overall | A smaller, faster model |
| Short calls slowed by long ones on one deployment | Separate deployments per workload |
| Utilization at 100 %, 429 errors | Add PTUs or reduce request volume; spillover to a standard deployment |
| Consistent latency at high, steady volume | Provisioned deployment sized with the capacity calculator |
| Content filtering adds latency on a low-risk workload | Evaluate a modified content filtering policy |

> **Exam trap.** A higher `max_tokens` value adds latency even when the number of tokens generated is the same, and `max_tokens` changes only the length of a response, never its quality. And streaming improves time to first token, not time to last token.

<!-- section: cost-metrics | objectives: 4.2.3 -->
## Tracking and optimizing token consumption and cost

Token metrics in Azure Monitor:

| Metric | REST name | Content |
| --- | --- | --- |
| Processed Prompt Tokens | `ProcessedPromptTokens` | Input tokens |
| Generated Completion Tokens | `GeneratedTokens` | Output tokens |
| Processed Inference Tokens | `TokenTransaction` | Input plus output tokens |
| Input Tokens, Output Tokens, Total Tokens | `InputTokens`, `OutputTokens`, `TotalTokens` | Same counts in the Models category, for standard and provisioned |
| Active Tokens | `ActiveTokens` | Total minus cached tokens (provisioned) |
| Prompt Token Cache Match Rate | `AzureOpenAIContextTokensCacheMatchRate` | Percentage of prompt tokens served from cache |
| Processed FineTuned Training Hours | `FineTunedTrainingHours` | Training hours of fine-tuning jobs |

Every response also returns a `usage` object, the per-request source for chargeback by user or feature:

```json
"usage": {
  "prompt_tokens": 1566,
  "completion_tokens": 1518,
  "total_tokens": 3084,
  "prompt_tokens_details": { "cached_tokens": 1408 },
  "completion_tokens_details": { "reasoning_tokens": 576 }
}
```

Cost analysis in **Cost Management**:

- Scope to the **resource group** of the Foundry resource (partner and community model meters appear under the resource group), then group by **Meter** (which model series cost most) or by **Resource**.
- Azure OpenAI usage is classified under the **Cognitive Services** service. Segment with deployment or custom tags; supported Models sold by Azure are tagged automatically with `project` (preview) for per-project allocation.
- Roles: **Cost Management Reader** to view costs; a custom role with `Microsoft.Consumption/*/read` and `Microsoft.CostManagement/*/read` for a cost-only reader.
- Costs appear in cost analysis about five hours after usage. Create **budgets and alerts** on the subscription or resource group: Azure OpenAI has **no hard spending limit**, and action groups only automate a response.

To meter **per consumer** when several applications share one deployment, put **Azure API Management** in front: `llm-emit-token-metric` emits token metrics with custom dimensions (subscription, user ID, API) to Application Insights, and `llm-token-limit` caps tokens per minute or per period per counter key.

| Lever | Effect |
| --- | --- |
| Prompt caching | On by default for supported models; needs prompts of at least 1,024 tokens with an identical start. Put stable content (instructions, tool definitions) first and variable content last; cached input tokens are billed at a discount |
| Global Batch or Data Zone Batch | 50 % less than Global Standard for jobs that can wait (24-hour target) |
| Smaller model, shorter prompts, lower `max_tokens` | Fewer and cheaper tokens |
| Semantic caching in API Management | `llm-semantic-cache-lookup` and `llm-semantic-cache-store` reuse answers to similar prompts |
| Provisioned throughput | Fixed hourly price: cost-effective only with high, steady use |
| Remove idle fine-tuned deployments | Fine-tuned models bill hosting **per hour while deployed**, even unused |
| Collect only needed log categories | Log Analytics ingestion is billed under Azure Monitor, not the Foundry resource |

> **Exam trap.** Token charts and estimated cost can differ temporarily from the invoice: use the estimate for near-real-time tracking and Cost Management plus invoices for reconciliation. HTTP status codes don't determine billing.

<!-- section: logging-tracing | objectives: 4.2.4 -->
## Logging, tracing and debugging in production

**Resource logs** of the Foundry resource need a **diagnostic setting** (Monitoring, Diagnostic settings, Add diagnostic setting, choose categories and **AllMetrics**, send to a Log Analytics workspace). Configure it on each resource; it requires Monitoring Contributor, while viewing metrics requires Monitoring Reader.

| Category | Content |
| --- | --- |
| `RequestResponse` | Every inference request and response, with status code and latency |
| `Trace` | Detailed logs for debugging inference calls |
| `Audit` | Administrative operations: deployments, configuration changes, access events |
| `AzureOpenAIRequestUsage` | Usage and token logs (export is billed) |

Logs land in **AzureDiagnostics**, exported metrics in **AzureMetrics**; allow up to 15 minutes for data:

```kusto
AzureMetrics
| where TimeGenerated > ago(1d)
| summarize Total = sum(Total) by MetricName, bin(TimeGenerated, 1h)
| order by TimeGenerated desc
```

**Tracing** shows what happened inside one request. Each operation is an OpenTelemetry span with its duration, status, tokens and, if enabled, inputs and outputs.

| Option | How | Notes |
| --- | --- | --- |
| Server-side | Automatic for prompt agents, hosted agents and workflows once Application Insights is connected | No code; traces in the **Traces** tab for the **past 90 days**; GA for prompt and hosted agents |
| Client-side | Foundry SDK and OpenTelemetry in your code | Your own spans and functions; preview |
| Local | Foundry Toolkit for Visual Studio Code collector | No Application Insights needed |

```text
import os
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"   # before instrument()

from azure.ai.projects import AIProjectClient
from azure.ai.projects.telemetry import AIProjectInstrumentor, trace_function
from azure.monitor.opentelemetry import configure_azure_monitor
from azure.identity import DefaultAzureCredential
from opentelemetry import trace

project = AIProjectClient(endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"],
                          credential=DefaultAzureCredential())
configure_azure_monitor(
    connection_string=project.telemetry.get_application_insights_connection_string())
AIProjectInstrumentor().instrument(enable_content_recording=False)

@trace_function("lookup-order")
def lookup_order(order_id: str) -> str:
    ...

tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("support-request"):
    with project.get_openai_client(agent_name="support-agent") as openai:
        response = openai.responses.create(input="Where is order 4512?")
```

| Setting | Default | Effect |
| --- | --- | --- |
| `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` | Off | Must be `true` **before** `instrument()`, or nothing is traced (a warning is logged) |
| `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` or `enable_content_recording` | `False` | Records prompts, tool arguments and outputs |
| `enable_trace_context_propagation` | `True` | Sends trace IDs to Azure services for end-to-end correlation |
| `enable_baggage_propagation` | `False` | Sends the `baggage` header, which can carry personal data |
| `AZURE_TRACING_GEN_AI_INSTRUMENT_RESPONSES_API` | `true` | Auto-instrumentation of the Responses API |

`@trace_function` records parameters (`code.function.parameter.<name>`) and the return value (`code.function.return.value`) for basic types, always, regardless of content recording. Add your own attributes (for example `session.id`) with a span processor; print spans locally with `ConsoleSpanExporter`. A parameter passed to `instrument()` overrides its environment variable, and OpenAI clients obtained **before** instrumentation aren't correlated. Traces take about **2 to 5 minutes** to appear. In the Traces tab, search by **Response ID** or **Trace ID**, then open the conversation to see tokens, run steps, tool calls, inputs and outputs in order.

| Production problem | Where to look |
| --- | --- |
| Which step of an agent is slow or failing | The request's trace: span durations and status |
| Error rate or latency trend, alerting | Azure Monitor metrics and alert rules |
| Who changed a deployment | `Audit` logs |
| A user's exact exchange | Trace with content recording, or `RequestResponse` logs |
| No traces at all | Application Insights not connected, or the tracing variable not set before `instrument()` |

> **Exam trap.** Content recording captures user messages and model outputs: keep it off in production unless compliance allows it, and never put secrets or tokens in prompts, tool arguments or span attributes. Turning it off doesn't stop `@trace_function` from recording parameters.

<!-- section: key-points -->
## Key points

- Foundry observability = evaluation, monitoring and tracing, stored in the Application Insights resource connected to the project.
- Continuous evaluation samples live responses (rule with `max_hourly_runs`, default 100, project managed identity with Foundry User); scheduled evaluation re-runs a test dataset to catch drift.
- Readers need Log Analytics Reader, plus Privileged Monitoring Data Reader for protected tables.
- TTLT = TTFT + TBT x tokens: pair latency metrics with token metrics. Time to Response for streaming, Time to Last Byte for non-streaming.
- Provisioned-managed Utilization V2 at 100 % means 429s; streaming shortens time to first token only.
- Cost: token metrics and `usage`, Cost Management by meter, tags and `project` tag, budgets (no hard limit), API Management token metrics per consumer, prompt caching and batch for savings.
- Diagnostic settings send `RequestResponse`, `Trace`, `Audit` and `AzureOpenAIRequestUsage` logs to AzureDiagnostics.
- Client-side tracing: set `AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING` before `instrument()`; content recording off by default.
