Performance questions describe a GenAI application that is too slow, throttled under load or less accurate than it should be, and ask for the change that fixes the stated symptom. The answer depends on which part of the request is slow: building the context, retrieving documents, the model's prefill, token generation, or the calls between services. This chapter covers the latency and cost tradeoffs of responsive systems, retrieval performance, throughput, inference parameters, resource allocation for FM traffic and end-to-end profiling.

<!-- section: responsive-systems | objectives: 4.2.1 -->
## Responsive AI systems and latency-cost tradeoffs

An LLM request has two stages. **Prefill** processes the input and produces the first token; it grows mainly with input length and drives time to first token (TTFT). **Decode** generates the output one token at a time; it grows with output length. Users of a chat perceive TTFT and the streaming rate, not the total time.

| Requirement | Technique |
| --- | --- |
| Users must see text immediately | Response streaming with `ConverseStream` or `InvokeModelWithResponseStream`; TTFT replaces total latency as the user-facing metric |
| Predictable questions (daily reports, product descriptions, top FAQs) | Pre-computation: generate answers ahead of time, for example with a nightly batch inference job, and serve them from DynamoDB, S3 or a cache |
| Time-sensitive interactions on supported models | Latency-optimized inference: `"performanceConfig": {"latency": "optimized"}` |
| Fastest response on any request, price premium accepted | Priority service tier |
| A workflow with independent sub-tasks | Parallel requests: AWS Step Functions `Parallel` or `Map` state, or concurrent SDK calls, then merge the results |
| Long input reused across requests | Prompt caching: a cached prefix lowers TTFT and input cost |
| Prove an improvement | Performance benchmarking on representative prompts: TTFT, output tokens per second, p50/p90/p99 latency, cost per request |

**Latency-optimized inference** facts (preview feature):

- `latency` is `standard` (default) or `optimized` in `performanceConfig`.
- Supported models are listed on the feature page (for example Amazon Nova Pro, Anthropic Claude 3.5 Haiku and Meta Llama 3.1 70B and 405B Instruct) in a few US Regions through cross-Region inference.
- When the latency-optimization quota for a model is reached, requests are served, and billed, at standard latency. The configuration used appears in the API response and in CloudTrail.

> **Exam trap.** Streaming does not make the model faster: total generation time is unchanged. It is the answer when users wait for the first words; when the whole pipeline must finish sooner, look at a smaller or latency-optimized model, shorter outputs or parallel calls.

<!-- section: retrieval-performance | objectives: 4.2.2 -->
## Retrieval performance

Retrieval adds latency before the model starts and decides what the model sees. Improve speed and relevance together.

**Index optimization (OpenSearch Serverless vector collections).**

- HNSW is the approximate nearest neighbor method; a classic vector collection must use the `faiss` engine for metadata filtering with Bedrock Knowledge Bases (indexes on `nmslib` need a new `faiss` index).
- Compression reduces memory: NextGen vector collections use 32x compression by default (1x, 2x, 8x, 16x or 32x selectable per field); classic collections offer Faiss 16-bit scalar quantization, binary vectors and disk-based vector search.
- Fewer dimensions mean smaller indexes and faster search; choose the embedding dimension when you create the index, since changing it means re-embedding.
- New documents become searchable after the refresh interval: 5 seconds on NextGen vector collections, 60 seconds on classic ones.

**Query preprocessing.**

| Problem | Fix |
| --- | --- |
| Complex, multi-part questions retrieve poor chunks | Query decomposition: `orchestrationConfiguration.queryTransformationConfiguration.type` = `QUERY_DECOMPOSITION` (breaks the query into sub-queries; more retrieval calls) |
| Conversational follow-ups ("and for 2024?") | Rewrite the question into a standalone query with a small model before retrieval |
| Results from the wrong product, year or tenant | Metadata filters (`equals`, `in`, `greaterThan`, `andAll`, `orAll`...), or implicit filtering that generates the filter from the query (Anthropic Claude models only) |

**Hybrid search and custom scoring.** Semantic search misses exact identifiers (part numbers, error codes, names); keyword search misses paraphrases. Hybrid search combines both:

- In Bedrock Knowledge Bases, set `overrideSearchType` to `HYBRID`. It is supported only for Amazon RDS (Aurora PostgreSQL), OpenSearch Serverless and MongoDB vector stores that contain a filterable text field; otherwise the query uses semantic search.
- On OpenSearch directly, a hybrid query with a search pipeline normalizes the lexical and vector scores and combines them with weights you choose, which lets you favor exact matches for identifier-heavy content.
- A reranker model reorders retrieved chunks by relevance to the question: retrieve a wider candidate set, rerank, pass only the best chunks.

`numberOfResults` defaults to 5. Raising it adds context tokens and latency; filtering and reranking usually improve relevance at lower cost.

> **Exam trap.** When users search by SKU, ticket number or exact product name and semantic search returns similar but wrong documents, the fix is hybrid search, not a larger embedding model or more results.

<!-- section: throughput-optimization | objectives: 4.2.3 -->
## FM throughput optimization

Throughput problems show up as `ThrottlingException` errors and the `InvocationThrottles` metric (throttled requests are not counted in `Invocations`).

**Token processing optimization.**

- The TPM quota is reserved at request start as input tokens plus `max_tokens`: an oversized `maxTokens` reduces concurrency even when responses are short. Set it close to the real output length.
- Prompt cache reads do not count toward the TPM quota, so caching a long shared prefix raises the effective throughput.
- Shorter prompts lower both quota use and prefill time.

**Batch inference strategies.** Move work that no user is waiting for out of the on-demand quota path: batch inference jobs read JSONL from S3 and write results to S3, with a 24 to 168 hour timeout and EventBridge notifications. Split very large workloads into several jobs and keep the on-demand quota for interactive traffic.

**Concurrent invocation management.**

| Technique | Effect |
| --- | --- |
| SDK retries with exponential backoff and jitter (standard or adaptive retry mode) | Absorbs short throttling bursts; adaptive mode also rate-limits the client |
| Amazon SQS queue in front of the workers | Smooths bursts; workers consume at the rate the quota allows |
| Lambda reserved concurrency on the worker function | Caps the number of parallel model calls |
| Cross-Region inference profile | Distributes requests across the Regions of the profile for higher throughput |
| Service Quotas increase request | Raises an adjustable TPM or RPM quota for a model |
| Provisioned Throughput or Reserved tier | Dedicated capacity for steady, high volume |

> **Exam tip.** "Intermittent throttling during peaks, latency of a few seconds is acceptable" points to a queue plus backoff or cross-Region inference. "Consistent high volume that must never be throttled" points to reserved capacity.

<!-- section: fm-parameters | objectives: 4.2.4 -->
## Model-specific parameters and A/B testing

Inference parameters trade determinism against diversity. In `Converse`, `inferenceConfig` carries the common ones; model-specific parameters such as top-k go in `additionalModelRequestFields` using the model's native key name.

| Parameter | Converse field | Effect |
| --- | --- | --- |
| Temperature | `temperature` (0 to 1) | Lower values favor high-probability tokens, more deterministic; higher values more varied |
| Top-p | `topP` (0 to 1) | Samples from the smallest set of tokens whose cumulative probability reaches p |
| Top-k | `additionalModelRequestFields` (for example `top_k`) | Samples from the k most likely tokens |
| Maximum length | `maxTokens` | Caps output tokens; defaults to the model maximum |
| Stop sequences | `stopSequences` | Stops generation at a delimiter |

Defaults and ranges depend on the model; check the model parameters page.

| Use case | Typical settings |
| --- | --- |
| Extraction, classification, JSON output, SQL generation | Low temperature, low top-p, strict `maxTokens` |
| Factual RAG answers | Low temperature, citations required in the prompt |
| Marketing copy, brainstorming | Higher temperature or top-p |
| Agents choosing tools | Low temperature for consistent tool selection |

```json
{
  "inferenceConfig": { "maxTokens": 400, "temperature": 0.2, "topP": 0.9, "stopSequences": ["END"] },
  "additionalModelRequestFields": { "top_k": 50 }
}
```

**A/B testing improvements.** Change one variable at a time (model, prompt version, parameters) and compare on the same metrics:

- AWS AppConfig multi-variant feature flags return a variant per request; the `split` rule operator sends a percentage of traffic based on a consistent hash of a context value (for example a user ID), so each user stays in the same group.
- Amazon Bedrock Prompt Management versions keep each prompt variant immutable, so results map to an exact version.
- On SageMaker AI endpoints, production variants split traffic by weight.

Amazon CloudWatch Evidently is no longer available (support ended October 17, 2025); AWS recommends AppConfig for feature flags.

> **Exam trap.** Adjusting temperature and top-p together makes it hard to attribute a change. When a stem says outputs are inconsistent for an extraction task, lower the temperature (and use structured output), rather than switching to a larger model.

<!-- section: resource-allocation | objectives: 4.2.5 -->
## Resource allocation for FM workloads

GenAI traffic is measured in tokens, not requests: one request may use 200 tokens and the next 20,000.

**Capacity planning for token processing.**

- Estimate TPM as requests per minute multiplied by (input tokens plus reserved `max_tokens`), then the settled value with the output burndown rate of the model.
- Separate interactive and background workloads: interactive on on-demand or reserved capacity, background on batch inference or the Flex tier.
- For Provisioned Throughput, size model units from the measured input and output tokens per minute at peak.

**Utilization monitoring for prompt and completion patterns.**

- `InputTokenCount` and `OutputTokenCount` per `ModelId` show the prompt-to-completion ratio; the CloudWatch automatic dashboard for Bedrock includes "Token Counts by Model".
- Model invocation logs with CloudWatch Logs Insights reveal the distribution of prompt sizes, the longest prompts and which caller (`identity.arn`, `requestMetadata`) produces them.
- `TimeToFirstToken` growing with input size indicates prefill cost; caching or trimming context helps.

**Auto scaling tuned for GenAI traffic (SageMaker AI).**

- Scale on concurrency, because LLM requests last seconds and invocation counts per minute react too late: `SageMakerVariantConcurrentRequestsPerModelHighResolution` or, for inference components, `SageMakerInferenceComponentConcurrentRequestsPerCopyHighResolution` (10-second metrics).
- Inference components pack several models on shared instances and scale copies per model; managed instance scaling adds or removes instances.
- Scheduled scaling pre-warms capacity before known peaks, since a GPU instance with a large model takes minutes to load.

> **Exam trap.** Target tracking on CPU utilization is the wrong signal for GPU-bound LLM containers. Choose the concurrency-based predefined metrics for FM endpoints.

<!-- section: system-performance | objectives: 4.2.6 -->
## End-to-end FM system performance

**API call profiling.** Use the Bedrock metrics to locate the slow stage:

```text
InvocationLatency = TimeToFirstToken + (OutputTokenCount / OTPS) * 1000
OTPS = OutputTokenCount / (InvocationLatency - TimeToFirstToken) * 1000
```

`TimeToFirstToken` is published only for streaming operations. If `InvocationLatency` rises while output tokens per second (OTPS) stay stable, the workload changed (longer prompts or responses); if OTPS drops, generation itself slowed. Graph OTPS with CloudWatch metric math (p50, 5-minute period) and alarm on a drop. Distributed traces (AWS X-Ray, OpenTelemetry) show the time spent in retrieval, guardrails, tools and the model for each request.

**Latency reduction techniques specific to LLM inference.**

| Slow stage | Technique |
| --- | --- |
| Prefill (high TTFT) | Shorter prompts, fewer retrieved chunks, prompt caching of the stable prefix |
| Decode (long generation) | Lower `maxTokens`, concise output format, smaller or latency-optimized model |
| Retrieval | Metadata filters, compression, fewer results, reranking only the top candidates |
| Sequential pipeline | Run independent calls in parallel; skip steps with a cache |

**Vector database query optimization.** Restrict the search space with filters, keep only the fields the application needs in the response (NextGen OpenSearch Serverless excludes the vector from search responses by default), and watch `SearchRequestLatency` on the collection.

**Efficient service communication.**

- Reach Bedrock through interface VPC endpoints (AWS PrivateLink) from private subnets instead of NAT gateways.
- Reuse SDK clients and connections across Lambda invocations (create them outside the handler).
- Stream end to end: model stream, then Lambda response streaming or an API Gateway WebSocket API to the browser.
- Decouple long tasks: accept the request, process it asynchronously through SQS or EventBridge and notify the client when the result is ready.

<!-- section: key-points -->
## Key points

- TTFT measures prefill (input size), OTPS measures decode; streaming improves perceived latency, not total time.
- Latency-optimized inference (`performanceConfig.latency` = `optimized`) works on listed models only and falls back to standard latency and pricing when its quota is reached.
- Hybrid search (`overrideSearchType` `HYBRID`) needs RDS, OpenSearch Serverless or MongoDB with a filterable text field; use it for exact identifiers.
- `max_tokens` is reserved against TPM at request start: oversizing it reduces concurrency.
- Throttling fixes: backoff with jitter, SQS buffering, cross-Region inference, quota increase, reserved capacity.
- Temperature, `topP`, `maxTokens` and `stopSequences` live in `inferenceConfig`; top-k goes in `additionalModelRequestFields`.
- A/B tests: AppConfig multi-variant flags with `split`, prompt versions, SageMaker production variants; Evidently has ended.
- Scale SageMaker FM endpoints on high-resolution concurrency metrics, with scheduled scaling for known peaks.
