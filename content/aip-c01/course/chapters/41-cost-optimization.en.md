A GenAI application pays for every token it sends and receives, for the capacity it reserves and for the calls it could have avoided. Cost questions describe an assistant, a RAG search or a document pipeline whose bill grows faster than its usage, and ask which change cuts the cost without breaking a stated latency or quality constraint. This chapter covers the four levers the exam tests: fewer tokens per call, a cheaper model or pricing option for each request, capacity that is actually used, and calls that never reach the model because a cache answered first.

<!-- section: token-efficiency | objectives: 4.1.1 -->
## Token efficiency

On-demand Amazon Bedrock inference bills input and output tokens. Token efficiency starts with measuring them, then removing the tokens that do not change the answer.

**Estimate and track tokens.**

| Need | Mechanism |
| --- | --- |
| Know the size of a prompt before sending it | `CountTokens` API on `bedrock-runtime`: returns the token count the model would bill for the same `InvokeModel` or `Converse` input; calling it is not charged |
| Tokens of each call | `usage` in the `Converse` response (`inputTokens`, `outputTokens`, `totalTokens`, plus `cacheReadInputTokens` and `cacheWriteInputTokens` with prompt caching) |
| Tokens per model over time | CloudWatch `AWS/Bedrock` metrics `InputTokenCount` and `OutputTokenCount` (dimension `ModelId`) |
| Tokens per tenant, feature or team | Model invocation logs: `identity.arn` and the caller-supplied `requestMetadata` key-value pairs, queried with CloudWatch Logs Insights |
| Cost per application in the bill | An **application inference profile** with cost allocation tags; the application calls the profile ARN instead of the model ID |

**Reduce input tokens.**

- **Context window optimization**: send only what the model needs. Retrieve fewer, better chunks (a Knowledge Base returns 5 results by default; add metadata filters and reranking rather than raising the count), and put long stable instructions first so prompt caching can reuse them.
- **Context pruning**: keep a sliding window of recent conversation turns and replace older turns with a short summary produced by a small model; drop tool outputs once their result is used.
- **Prompt compression**: remove duplicated instructions, shorten few-shot examples or keep only the most similar ones, and strip boilerplate (HTML, headers, signatures) from documents during ingestion rather than at every call.

**Limit output tokens.** Output generation is the slow, sequential part of inference, and on most text models output tokens are priced higher than input tokens.

- `maxTokens` in `inferenceConfig` caps the response. It truncates: the response ends with `stopReason` `max_tokens`, it does not make the model concise.
- `stopSequences` end generation at a delimiter.
- Instructions such as "answer in at most three sentences" or a strict JSON schema shorten responses at the source.

`maxTokens` also affects throughput: at the start of a request, Bedrock deducts input tokens plus `max_tokens` from the tokens-per-minute (TPM) quota, then gives back the unused part at the end. A `maxTokens` far above the real output length reduces the number of concurrent requests the quota allows.

> **Exam trap.** A lower `maxTokens` alone cuts cost but returns truncated answers. When a stem requires complete answers at lower cost, combine a conciseness instruction or output schema with a `maxTokens` set close to the expected length.

<!-- section: model-selection | objectives: 4.1.2 -->
## Cost-effective model selection

The cheapest correct answer comes from the smallest model that meets the quality bar for that request. A model selection framework measures quality and cost together, then routes each request to the right model and pricing option.

**Measure price-to-performance.** Run the same evaluation dataset through each candidate with Amazon Bedrock Evaluations (programmatic metrics or LLM-as-a-judge), record cost per request from token counts, and compare cost per correct answer and latency per quality point. A model that is 5% more accurate but three times the price rarely wins for a high-volume, low-risk task.

**Tier models by query complexity.**

| Pattern | How it works | Fits |
| --- | --- | --- |
| Amazon Bedrock intelligent prompt routing | One serverless endpoint routes each request between two models of the same family, predicting response quality; a fallback model and a `responseQualityDifference` criterion decide when the larger model is worth it | Mixed simple and complex prompts, English, one model family |
| Classifier or rules in front of models | A small model or rule set labels the request (FAQ, extraction, reasoning) and the application picks the model | Different families, routing by business rules or tenant |
| Cascade | Small model answers first; a confidence or validation check escalates failures to a larger model | Most requests are easy, quality must be guaranteed |
| Model distillation | A large teacher model generates responses that fine-tune a smaller, faster student model | A narrow, repetitive task where a large model is accurate but too expensive |

Intelligent prompt routing has documented limits: it is optimized for English prompts, routes only within one model family, and cannot use application-specific performance data. Default routers exist for select Amazon Nova and Meta Llama models; configured routers let you choose the models, fallback model and routing criteria.

**Choose the pricing option for the traffic.**

| Traffic | Option |
| --- | --- |
| Interactive, variable | On-demand, Standard tier (`service_tier` omitted or `default`) |
| Interactive, latency-critical, customer facing | Priority tier (the pricing page states a 75% premium over Standard) |
| Can wait longer: evaluations, summarization, background agents | Flex tier (the pricing page states a 50% discount to Standard) |
| Thousands of prompts with no user waiting | Batch inference (the pricing page states 50% lower than on-demand) |
| Mission-critical, steady volume | Reserved tier (1 or 3 months, fixed price per 1K TPM) or Provisioned Throughput |
| No data residency constraint, lowest on-demand price | Global cross-Region inference profile (documented as approximately 10% savings compared with geographic profiles) |

> **Exam trap.** Global cross-Region inference can process the request in any supported commercial Region. If the stem requires data to stay in the EU or the US, the answer is a geographic profile, even though the global profile is cheaper.

<!-- section: throughput-utilization | objectives: 4.1.3 -->
## Throughput and resource utilization

Reserved capacity saves money only when it is used; on-demand capacity is wasted when requests are throttled and retried.

**Batching.** Batch inference processes JSONL files from S3 asynchronously and writes results to S3:

- Created with `CreateModelInvocationJob` (`jobName`, `roleArn`, `modelId`, `inputDataConfig`, `outputDataConfig`); `modelInvocationType` `InvokeModel` (default) or `Converse`.
- `timeoutDurationInHours` defaults to 24, valid values 24 to 168.
- Not supported on provisioned models; tool calling is not supported with the `Converse` invocation type; prompt caching does not apply.
- Job state changes arrive through Amazon EventBridge, so a pipeline reacts without polling.

**Capacity planning.** On-demand quotas are set per model (TPM and requests per minute). Plan with these facts:

- Quota consumption at the end of a request is `InputTokenCount + CacheWriteInputTokenCount + (OutputTokenCount x burndown rate)`. The burndown rate is 1:1 for most models, but several Anthropic Claude models apply a multiplier of 5 or more to output tokens (check the model card). Billing uses actual tokens, not the burndown.
- `CacheReadInputTokenCount` does not count toward the TPM quota.
- `EstimatedTPMQuotaUsage` approximates TPM consumption but does not reflect the reservation that drives throttling: do not use it alone for capacity planning.

**Provisioned Throughput** buys model units (MUs), each a fixed number of input and output tokens per minute, billed hourly:

| Commitment | Behavior |
| --- | --- |
| No commitment | Delete at any time, highest hourly price |
| 1 month | Cannot delete before the term ends, discounted |
| 6 months | Cannot delete before the term ends, most discounted |

Inference profiles do not support Provisioned Throughput. A customized model runs either on Provisioned Throughput or, where supported, through an on-demand custom model deployment invoked by its deployment ARN.

The **Reserved tier** is the alternative for on-demand models: it reserves input and output TPM for 1 or 3 months (minimum 100,000 input TPM and 10,000 output TPM, through the AWS account team), targets 99.5% uptime, and sends overflow to the Standard tier. Size it with `InputTokenCount` plus `CacheWriteInputTokenCount`.

**Self-hosted models on SageMaker AI endpoints.** Scale on concurrency rather than CPU:

- Target tracking on `SageMakerVariantConcurrentRequestsPerModelHighResolution` (variant) or `SageMakerInferenceComponentConcurrentRequestsPerCopyHighResolution` (inference component); both metrics are emitted every 10 seconds, faster than `SageMakerVariantInvocationsPerInstance` (every minute).
- Default cooldowns are 300 seconds for scale-in and scale-out; scheduled scaling covers predictable peaks.
- An endpoint can scale to zero instances only if it hosts inference components (`MinInstanceCount` 0); scaling out from zero needs a step scaling policy on a CloudWatch alarm on `NoCapacityInvocationFailures`, and requests fail for several minutes while an instance is provisioned.

> **Exam tip.** Steady, predictable, high volume on one model points to reserved capacity (Provisioned Throughput or Reserved tier). Spiky or unpredictable traffic points to on-demand, possibly with cross-Region inference. A purchased commitment that sits idle is the classic wrong answer for "MOST cost-effective".

<!-- section: caching | objectives: 4.1.4 -->
## Intelligent caching

Caching works at several layers; the exam asks which layer removes the cost described.

| Technique | What is cached | Model still invoked | Best for |
| --- | --- | --- | --- |
| Bedrock prompt caching | The processed prompt prefix (system prompt, tools, long documents) | Yes, cheaper input and lower time to first token | Long, repeated context with different questions |
| Deterministic request hashing (result fingerprinting) | The full response, keyed by a hash of the normalized request | No, on exact match | Repeated identical requests, deterministic settings |
| Semantic caching | The response, keyed by the embedding of the question | No, when a similar question is found | FAQs and paraphrased questions |
| Edge caching | HTTP responses at Amazon CloudFront or in the API Gateway cache | No | Precomputed, non-personalized answers |

**Prompt caching** on Bedrock:

- Implicit caching is automatic and best effort. Explicit caching uses cache checkpoints (`cachePoint` in `Converse`, `cache_control` for Claude in `InvokeModel`) that mark a cacheable prefix.
- The prefix before a checkpoint needs a model-specific minimum (512 to 4,096 tokens); Claude and Nova models accept up to 4 checkpoints per request.
- Processing order is `tools`, then `system`, then `messages`: a change in an earlier section invalidates the later ones, so put stable content first and the user question last.
- Default TTL is 5 minutes, reset on each hit; some Claude models also accept a 1-hour TTL.
- Cache writes are billed at the cache-write rate, cache reads at a reduced rate, and cache reads do not count toward the TPM quota. Prompt caching does not apply to batch inference.
- Verify hits with `cacheReadInputTokens` in the response or the `CacheReadInputTokenCount` metric.

**Deterministic request hashing.** Normalize the request (trim whitespace, sort parameters), hash it together with the model ID, the inference parameters and the prompt template version, and look up the hash in Amazon DynamoDB or Amazon ElastiCache with a TTL. Include the prompt version in the key so a new prompt never serves old answers, and use temperature 0 where the same answer is expected.

**Semantic caching.** Embed the incoming question, search a vector index of past questions, and return the stored answer when the similarity passes a threshold; otherwise call the model and store the new pair. ElastiCache for Valkey 8.2 provides vector search on node-based clusters at no additional cost, with HNSW and FLAT indexes, cosine, Euclidean and inner product distances, TTLs and `allkeys-lru` eviction. A threshold that is too loose returns answers to different questions: tune it on real queries, and never share cached answers across tenants or permission levels.

**Edge caching.** The API Gateway REST API cache keeps responses for 300 seconds by default (maximum 3,600 seconds; `0` disables it), caches only `GET` methods by default, needs cache keys and caches responses up to 1,048,576 bytes. CloudFront caches responses close to users.

> **Exam trap.** Prompt caching does not avoid the model call: it lowers the cost of a repeated prefix and the time to first token. When the stem says many users ask the same or similar questions and the goal is to avoid invoking the FM, the answer is a response cache (semantic or hash-based), not prompt caching.

<!-- section: key-points -->
## Key points

- Measure before optimizing: `CountTokens` (free), `usage` fields, `InputTokenCount`/`OutputTokenCount`, invocation logs with `requestMetadata`, application inference profiles with tags.
- `maxTokens` truncates and is reserved against the TPM quota at request start: set it close to the expected output and pair it with conciseness instructions.
- Route by complexity: intelligent prompt routing within one family (English), classifiers or cascades across families, distillation for narrow high-volume tasks.
- Pricing options: Standard, Priority (premium), Flex (discount), batch (50% lower than on-demand), Reserved tier and Provisioned Throughput for steady volume; global cross-Region inference is cheaper but not for data residency.
- Batch inference: S3 JSONL, `CreateModelInvocationJob`, 24 to 168 hours, no provisioned models, no prompt caching.
- Prompt caching lowers the cost of a stable prefix; semantic and hash caches skip the model call; edge caches serve precomputed, non-personalized answers.
