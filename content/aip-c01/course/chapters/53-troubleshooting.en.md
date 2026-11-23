GenAI applications fail in ways that a stack trace rarely explains: an answer stops mid-sentence, a model call is throttled only at peak, a prompt change silently breaks the JSON a downstream service expects, or the knowledge base returns plausible but wrong passages. This chapter is a troubleshooting method for each layer: content that doesn't fit the context window, API integration errors, prompt quality problems, retrieval problems, and the observability (CloudWatch Logs, model invocation logging, X-Ray and OpenTelemetry tracing, schema validation) that keeps prompts healthy as they change.

<!-- section: content-handling | objectives: 5.2.1 -->
## Context window overflow and truncation

Every request shares one token budget between the system prompt, the conversation history, retrieved passages, tool definitions and results, and the output (`maxTokens`). When the content doesn't fit, the symptom depends on where it overflows.

| Symptom | Likely cause | Diagnosis | Fix |
| --- | --- | --- | --- |
| Request rejected with `ValidationException` (HTTP 400) | Input larger than the model accepts | `CountTokens` on the same input (free, no inference); `InputTokenCount` metric trend | Trim history, fewer or smaller chunks, summarize documents first, or a model with a larger context window |
| Answer ends abruptly, `stopReason` is `max_tokens` | Output reached `maxTokens` | `stopReason` and `usage.outputTokens` in the response or invocation logs | Raise `maxTokens`, ask for shorter output, or continue generation in a follow-up turn |
| `stopReason` is `model_context_window_exceeded` | Generation stopped at the context limit (input plus output) | Same | Reduce input so output has room |
| Answer ignores part of a long document, no error | Your code (or a framework) truncated content before the call | Compare the rendered prompt in invocation logs with the source; log token counts per component | Chunk and process in parts (map-reduce summarization), retrieve instead of stuffing |
| Agent fails after many turns | History and tool results grow every turn | Token counts per turn in traces | Sliding window or summarization of older turns |
| Structured output is invalid JSON | Output cut by `maxTokens` | `stopReason` `max_tokens` with incomplete JSON | Raise `maxTokens`; smaller schema |

Dynamic chunking strategies keep content complete without exceeding the budget:

- **Per request**: count tokens of each component and allocate a budget (for example, a fixed share for retrieved context); reduce `numberOfResults` or drop the lowest-scoring passages when the budget is exceeded.
- **Per document**: split long documents on structure (sections, pages) and process each part, then combine the partial results; hierarchical chunking in a knowledge base returns larger parent chunks only when child chunks match.
- **Per conversation**: Strands Agents uses a sliding window conversation manager by default, which trims the oldest messages until the request fits; a summarizing conversation manager replaces older messages with a summary instead of discarding them.

Prompt design matters too: put instructions in the system prompt rather than repeating them every turn, ask for concise output formats, and remove unused tool definitions, which consume tokens on every call.

> **Exam trap.** A truncated answer with no error is not a context window problem to solve with a bigger model: check `stopReason` first. `max_tokens` means the output budget was too small; raising the model's context window doesn't change `maxTokens`.

> **Exam tip.** "Detect before sending that a request will exceed the model's limit, with no inference cost" is the `CountTokens` API; token counts are model-specific because each model has its own tokenizer.

<!-- section: fm-integration-errors | objectives: 5.2.2 -->
## FM API integration errors

Start from the error code and the HTTP status: they split client mistakes from capacity and service issues.

| Error (HTTP) | Meaning | Resolution |
| --- | --- | --- |
| `ValidationException` (400) | Malformed request: wrong body for the model in `InvokeModel`, unsupported parameter, unsupported JSON schema feature, input too long | Validate the request before sending; use the Converse API's uniform format; read the message |
| `AccessDeniedException` (403) | Missing IAM permission, expired temporary credentials, SCP denial, model access not granted | Check the role policy, SCPs, and the model and inference profile ARNs |
| `ResourceNotFoundException` (404) | Wrong model ID, ARN or Region | Check identifiers with `ListFoundationModels`; plan a fallback model |
| `ModelTimeoutException` (408) | Processing exceeded the model timeout | Smaller input or output, streaming, retry |
| `ModelErrorException` (424) | The model failed while processing | Retry; inspect `originalStatusCode` |
| `ThrottlingException` (429) | Account quotas (requests or tokens per minute) exceeded | Exponential backoff with jitter, cross-Region inference, quota increase, Reserved Tier or Provisioned Throughput for steady load |
| `ModelNotReadyException` (429) | Model not ready to serve | The SDK retries automatically (up to 5 times) |
| `ServiceUnavailableException` (503) | Temporary capacity issue, not your quota | Backoff with jitter, cross-Region inference, other Region |
| `InternalServerException` (500) | Server-side failure | Backoff with jitter; contact Support if persistent |

Other integration failures with a GenAI signature:

- **Inference profiles**: some models are offered in a Region only through cross-Region inference, so the call must use the inference profile ID or ARN as `modelId`. The IAM policy must allow `bedrock:InvokeModel*` on the profile and on the foundation model in **every Region** the profile routes to; allowing only the profile gives `AccessDeniedException` on some requests. Global profiles also need SCPs that allow `aws:RequestedRegion` `unspecified`.
- **Timeouts upstream**: API Gateway REST API integrations time out at 29 seconds by default (Regional and private APIs can request more, edge-optimized can't); long generations need streaming (`ConverseStream`), an asynchronous pattern, or a raised quota. Connections idle more than 350 seconds through NAT gateways, interface VPC endpoints or Network Load Balancers are dropped silently: enable TCP keep-alive in the SDK and set the OS keep-alive interval below 350 seconds.
- **Client read timeouts**: structured outputs compile a grammar on the first request for a new schema (up to about 90 seconds); AWS recommends a read timeout of at least 120 seconds.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel*"],
      "Resource": ["arn:aws:bedrock:eu-west-1:111122223333:inference-profile/eu.example-model-v1:0"]
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel*"],
      "Resource": [
        "arn:aws:bedrock:eu-west-1::foundation-model/example-model-v1:0",
        "arn:aws:bedrock:eu-central-1::foundation-model/example-model-v1:0"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:eu-west-1:111122223333:inference-profile/eu.example-model-v1:0"
        }
      }
    }
  ]
}
```

Error logging and response analysis tools:

| Tool | What it shows |
| --- | --- |
| CloudWatch `AWS/Bedrock` metrics | `Invocations`, `InvocationClientErrors`, `InvocationServerErrors`, `InvocationThrottles` (not counted in `Invocations`), `InvocationLatency`, `TimeToFirstToken`, `InputTokenCount`, `OutputTokenCount` |
| Model invocation logging | Full request and response bodies, token counts, model ID, caller identity, `requestMetadata` |
| CloudTrail | Control-plane and API activity, including the Region that processed a cross-Region request (`additionalEventData.inferenceRegion`) |
| Response fields | `stopReason`, `usage`, `metrics.latencyMs`, guardrail `trace` |

> **Exam trap.** Errors from requests that fail before Bedrock resolves the model are published without the `ModelId` dimension: a dashboard filtered by model ID can undercount client errors. Query the metric without dimensions when totals don't match.

> **Exam tip.** 429 `ThrottlingException` (your quota) and 503 `ServiceUnavailableException` (temporary capacity) both call for backoff with jitter, but only throttling is fixed by a quota increase; for both, cross-Region inference spreads load.

<!-- section: prompt-quality | objectives: 5.2.3 -->
## Troubleshooting prompt quality and consistency

When answers are inconsistent or off-target, adjusting wording by trial and error in production is the anti-pattern. A systematic approach isolates the variable, measures, and keeps a record.

1. **Reproduce** with the logged request (rendered prompt, model, inference parameters) from model invocation logs.
2. **Classify the failure** on a test set: wrong format, missing facts, ignored instruction, hallucination, refusal, inconsistent tone.
3. **Change one thing** (instruction wording, examples, ordering, temperature, model) and run the whole test set, not one example.
4. **Score** with an evaluation job (LLM-as-a-judge or custom metrics, bring your own responses if needed) and compare with the baseline.
5. **Version** the winning prompt and deploy that version.

| Tool | Use in troubleshooting |
| --- | --- |
| Amazon Bedrock Prompt Management | Prompts with variables, variants compared side by side in the prompt builder, a working draft and versions (snapshots) to deploy and compare |
| Simple prompt optimization (`OptimizePrompt`) | Fast rewrite of one short prompt (about 1K tokens or less) for one target model; nothing is saved automatically |
| Advanced Prompt Optimization | Job that rewrites up to 10 templates using your evaluation samples (up to 100 per template), ground truth and metric (LLM-as-a-judge rubric, Lambda function or steering criteria), compares up to 5 models, and reports scores, latency and time to first token |
| Model evaluation jobs | Quantify the effect of a change on the same dataset with the same judge |

Common causes and fixes:

| Symptom | Cause | Fix |
| --- | --- | --- |
| Different answers to the same question | High temperature, ambiguous instructions | Lower temperature, explicit rules and examples |
| Instructions ignored in long prompts | Instructions buried among retrieved text | Separate instructions from data (delimiters or tags), instructions in the system prompt |
| Model invents facts outside the context | No instruction to answer only from sources, no "I don't know" path | Grounding instruction, contextual grounding check |
| Quality dropped after switching models | Prompt tuned for the previous model | Re-optimize per model (Advanced Prompt Optimization supports migration comparisons) and re-run the evaluation |

> **Exam trap.** A prompt invoked by its Prompt Management ARN through `Converse` can't take `inferenceConfig`, `system`, `toolConfig` or `additionalModelRequestFields` in the request: they come from the prompt version. Overriding the temperature in application code fails; create a new version instead.

<!-- section: retrieval-troubleshooting | objectives: 5.2.4 -->
## Troubleshooting retrieval systems

Separate retrieval from generation first: run `Retrieve` (or a retrieve-only evaluation) on the failing questions. If the right passage isn't returned, the problem is ingestion, embeddings, chunking or search; if it is, look at the prompt and generation.

| Symptom | Likely cause | Remediation |
| --- | --- | --- |
| Documents never returned | Ingestion skipped or failed them | Knowledge base logging: `RESOURCE_IGNORED`, `EMBEDDING_FAILED`, `INDEXING_FAILED` with `status_reasons` |
| Answers cite outdated content | Data source not re-synced, deleted files still indexed | Run ingestion jobs on change (EventBridge schedule or S3 events), check `number_of_resources_deleted` |
| Exact identifiers (SKUs, error codes) not found | Pure semantic search | Hybrid search on a store that supports it |
| Relevant passage split across chunks, answers miss context | Chunks too small or cut mid-section | Larger fixed-size chunks with overlap, hierarchical or semantic chunking (on a new data source) |
| Tables, charts and images in PDFs missing or retrieved as noise | The default parser extracts text only | Bedrock Data Automation or foundation model parser (applies to every PDF of the data source, charged), custom transformation Lambda |
| Right document in the top 20, not in the top 5 | Ranking | Reranking, more results before reranking |
| Results from the wrong product or tenant | No filtering | Metadata filters (`.metadata.json` files for S3 sources) or implicit filtering |
| Quality degrades over months | Drift: new vocabulary, new document types, questions the index doesn't cover | Track retrieval scores and judged relevance on sampled traffic over time; refresh content and re-evaluate |
| Ingestion fails after an embedding change | Vector field dimension doesn't match the embedding model's output | Create the index with the model's dimension; a knowledge base's embedding model and vector store can't be changed, so create a new knowledge base and re-ingest |

Knowledge base logs (`APPLICATION_LOGS`) are delivered to CloudWatch Logs, S3 or Amazon Data Firehose. Query them with CloudWatch Logs Insights:

```text
fields @timestamp, event.document_location.s3_location.uri, event.status, event.status_reasons
| filter event.status in ["RESOURCE_IGNORED", "EMBEDDING_FAILED", "INDEXING_FAILED"]
| sort @timestamp desc
```

Embedding quality diagnostics: embed known paraphrase pairs and unrelated pairs and check that similar pairs score higher; check that queries and documents use the same embedding model (a knowledge base does this for you, a custom pipeline may not); with Titan Text Embeddings V2, a smaller dimension (512 or 256 instead of 1024) saves storage at some cost in accuracy. Changing the embedding model means re-embedding every document.

Vector search performance: on Aurora PostgreSQL, create the HNSW index on the embedding column (`USING hnsw (embedding vector_cosine_ops)`), plus a GIN index on the text column for text queries and on `custom_metadata` for filtering, otherwise queries scan the table. On OpenSearch Serverless, filters run inside the `knn` query (and Bedrock metadata filtering requires the `faiss` engine); compression or quantization reduces memory and cost at some cost in recall, so re-test retrieval quality after enabling it.

> **Exam trap.** You can't change the chunking configuration of an existing data source or the embedding model of an existing knowledge base. "Re-run the ingestion job" doesn't apply a new chunking strategy; the remediation is a new data source (or knowledge base) and a full ingestion, validated against the same retrieval test set.

<!-- section: prompt-maintenance | objectives: 5.2.5 -->
## Prompt maintenance and observability

Prompts change often, and each change can break something downstream. Maintenance relies on four practices.

**Template testing.** Every template version runs against a fixed suite before release: required variables present and filled (an empty `{{customer_tier}}` produces confused answers, not an error), rendered length within budget, expected format, and judged quality. A failed run blocks the deployment of the version.

**Diagnosing prompt confusion with CloudWatch Logs.** Model invocation logs hold the rendered prompt and the response, so you can see what the model actually received: unresolved placeholders, duplicated instructions, retrieved passages that contradict the instructions, or the default knowledge base prompt template (it contains generic sample content) where you expected yours. Tag each call with `requestMetadata` (prompt ID and version, feature, tenant) so Logs Insights can group failures by version.

```text
fields @timestamp, requestMetadata.promptVersion, output.outputTokenCount
| filter modelId like /example-model/ and output.outputBodyJson like /cannot answer/
| stats count(*) as refusals by requestMetadata.promptVersion
```

**Prompt observability pipelines with X-Ray and OpenTelemetry.** Trace each request across API Gateway, Lambda, retrieval and the model call, with the prompt version, token counts and stop reason as span attributes, so a latency or quality regression points to a stage and a version. X-Ray is moving to OpenTelemetry: the X-Ray SDKs and daemon entered maintenance mode on February 25, 2026, and AWS recommends OpenTelemetry SDKs or AWS Distro for OpenTelemetry (ADOT) with the OpenTelemetry Collector or CloudWatch agent, exporting traces to X-Ray. AgentCore emits OpenTelemetry-compatible traces for agents.

**Schema validation for format inconsistencies.** When a downstream system parses model output, enforce and check the format:

| Option | Behavior |
| --- | --- |
| Structured outputs (`outputConfig.textFormat` with `json_schema` in Converse) | Constrained decoding: the response conforms to the JSON schema; every object needs `"additionalProperties": false`; unsupported keywords (`minimum`, `maxLength`, recursive schemas) return `ValidationException` |
| Strict tool use (`"strict": true` in `toolSpec`) | Tool names and inputs follow the tool's input schema |
| Validation after the call (Lambda with a JSON Schema validator) | Detects drift in models or prompts without structured output support; failures go to a dead-letter queue and a CloudWatch metric |

```json
{
  "outputConfig": {
    "textFormat": {
      "type": "json_schema",
      "structure": {
        "jsonSchema": {
          "name": "ticket_triage",
          "description": "Triage result for a support ticket",
          "schema": "{\"type\":\"object\",\"properties\":{\"category\":{\"type\":\"string\",\"enum\":[\"billing\",\"technical\",\"account\"]},\"priority\":{\"type\":\"string\",\"enum\":[\"low\",\"medium\",\"high\"]}},\"required\":[\"category\",\"priority\"],\"additionalProperties\":false}"
        }
      }
    }
  }
}
```

**Systematic refinement workflow.** Production signals (invocation logs, feedback, online evaluation scores, schema failures) select failing cases; they join the test suite; a new prompt version is created in Prompt Management and evaluated against the suite and the current version; the application switches to the new version only if it wins, and the previous version stays available for rollback.

> **Exam trap.** Structured outputs guarantee the shape, not the content: a value can still be wrong, and the output can still be cut off when `maxTokens` is reached (`stopReason` `max_tokens`). Keep evaluation for correctness and check `stopReason`.

> **Exam tip.** "Find which prompt version introduced malformed responses, with the least effort" combines `requestMetadata` (or the prompt version in span attributes) with Logs Insights over model invocation logs; no new data store is needed.

<!-- section: key-points -->
## Key points

- Check `stopReason` first: `max_tokens` (output budget), `model_context_window_exceeded` (context limit); oversized input is rejected with `ValidationException`; `CountTokens` is free.
- Manage the budget: fewer or smaller chunks, map-reduce over long documents, sliding window or summarizing conversation managers.
- 429 throttling means quotas; 503 means temporary capacity; both need backoff with jitter; cross-Region inference spreads load.
- Inference profiles need IAM permissions on the profile and the model in every destination Region.
- REST API integrations time out at 29 seconds by default; idle connections over 350 seconds through NAT or endpoints are dropped.
- Prompt problems: reproduce from invocation logs, change one variable, evaluate on a test set, version in Prompt Management; use simple or Advanced Prompt Optimization.
- Retrieval problems: test retrieval alone, read knowledge base ingestion logs, hybrid search, reranking, filters; chunking and embedding model changes need a new data source or knowledge base.
- Observability: invocation logs and `requestMetadata` in CloudWatch Logs, OpenTelemetry (ADOT) traces to X-Ray, structured outputs and schema validation.
