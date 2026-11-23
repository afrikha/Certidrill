A GenAI application can return HTTP 200 on every request and still fail its users: wrong answers, drifting tone, runaway token spend, a tool that silently times out. Monitoring questions ask which signal reveals the problem described and which AWS feature produces it: CloudWatch metrics for Amazon Bedrock, model invocation logs, traces for agents and tools, CloudTrail for audit, Cost Anomaly Detection for spend. This chapter builds the observability stack layer by layer, then covers tools, vector stores and the failure modes that only generative models have.

<!-- section: holistic-observability | objectives: 4.3.1 -->
## Holistic observability for FM applications

Complete visibility combines four layers:

| Layer | Question answered | AWS source |
| --- | --- | --- |
| Operational metrics | Is the model call healthy, fast and within quota? | CloudWatch `AWS/Bedrock` metrics, SageMaker AI endpoint metrics, Lambda and API Gateway metrics |
| Performance tracing | Where does a slow request spend its time? | AWS X-Ray and OpenTelemetry (AWS Distro for OpenTelemetry, ADOT) traces with CloudWatch Transaction Search |
| FM interaction tracing | What exactly was sent to and returned by the model? | Bedrock model invocation logs, agent and tool spans |
| Business impact | Does the application deliver value? | Custom metrics (resolution rate, deflected tickets, feedback score, cost per conversation) on CloudWatch dashboards |

**Bedrock runtime metrics** (namespace `AWS/Bedrock`, dimension `ModelId`):

| Metric | Meaning |
| --- | --- |
| `Invocations` | Accepted requests (excludes throttled requests and input validation rejections) |
| `InvocationLatency` | Time to the last token |
| `TimeToFirstToken` | Time to the first token, streaming operations only |
| `InvocationClientErrors`, `InvocationServerErrors` | Client-side and server-side errors |
| `InvocationThrottles` | Throttled requests, not counted in `Invocations` |
| `InputTokenCount`, `OutputTokenCount` | Tokens processed |
| `CacheReadInputTokenCount`, `CacheWriteInputTokenCount` | Prompt cache activity |
| `EstimatedTPMQuotaUsage` | Approximate TPM quota consumption |

Requests that fail before Bedrock resolves the model are published without the `ModelId` dimension, so query errors without a dimension to see all of them. Metrics can also be broken down by `ServiceTier` and `ResolvedServiceTier`.

**CloudWatch generative AI observability** provides pre-built views: a **Model Invocations** dashboard (invocation count, latency, token counts by model, throttles, errors, and a table of invocations showing input and output) that requires model invocation logging, and an **Amazon Bedrock AgentCore agents** view with performance and decision metrics for agents, memory, built-in tools, gateways and identity. It works with frameworks such as Strands Agents, LangChain and LangGraph, and with agents hosted outside AgentCore that send OpenTelemetry data.

<!-- section: genai-monitoring | objectives: 4.3.2 -->
## GenAI-specific monitoring and anomaly detection

**Model invocation logging** is the source for detailed request and response analysis:

- Disabled by default; configured per account and per Region; covers `Converse`, `ConverseStream`, `InvokeModel` and `InvokeModelWithResponseStream` on `bedrock-runtime`.
- Destinations: CloudWatch Logs, Amazon S3, or both, in the same account and Region. Choose the data types to log (text, image, embedding, video, audio).
- JSON bodies up to 100 KB are logged inline; larger bodies and binary data go to S3 (for CloudWatch Logs, only if a large-data S3 location is configured).
- Each record holds `modelId`, `operation`, `identity.arn`, the optional caller-supplied `requestMetadata`, the input and output bodies and token counts.
- Delivery health is visible in metrics such as `ModelInvocationLogsCloudWatchDeliveryFailure`.

```bash
aws bedrock put-model-invocation-logging-configuration --logging-config '{
  "cloudWatchConfig": {
    "logGroupName": "/bedrock/invocations",
    "roleArn": "arn:aws:iam::111122223333:role/BedrockLoggingRole",
    "largeDataDeliveryS3Config": { "bucketName": "example-bedrock-logs", "keyPrefix": "large" }
  },
  "textDataDeliveryEnabled": true,
  "imageDataDeliveryEnabled": false,
  "embeddingDataDeliveryEnabled": false
}'
```

**KPIs specific to FMs.**

| KPI | How to measure |
| --- | --- |
| Token usage and cost per feature or tenant | Token metrics, invocation logs grouped by `requestMetadata` |
| Prompt effectiveness | Task success, follow-up rate, feedback per prompt version |
| Hallucination rate | Guardrail contextual grounding interventions; sampled responses scored by an LLM judge or against golden answers |
| Response quality and drift | Scheduled evaluation scores; distribution of response length, `stopReason` and refusals compared with a baseline |
| Performance benchmarks | TTFT, output tokens per second, p90 latency per model |

**Anomaly detection.** A CloudWatch anomaly detection alarm learns a band from the metric history and alarms when the value leaves it: use it on `InputTokenCount` or `OutputTokenCount` to catch token bursts (a looping agent, a prompt injection that floods output, a client bug). Bedrock guidance recommends a static threshold for new deployments, because the anomaly model needs about two weeks of history. Response drift is detected by comparing evaluation scores, embedding distances or output statistics with a baseline over time.

**Cost anomaly detection.** AWS Cost Anomaly Detection uses machine learning on Cost Explorer data, runs about three times a day, can take up to 24 hours to detect an anomaly, and needs 10 days of history for a new service. It monitors AWS services, member accounts, cost allocation tags or cost categories, ranks root causes by service, account, Region and usage type, and alerts by email or SNS (Slack through Amazon Q Developer in chat applications). It covers third-party foundation models on Amazon Bedrock, unlike other AWS Marketplace charges.

> **Exam trap.** Cost Anomaly Detection is not real time. When the stem needs an alert within minutes of a token spike, use a CloudWatch alarm (anomaly detection band or static threshold) on the Bedrock token metrics; Cost Anomaly Detection catches the spend pattern later.

<!-- section: integrated-observability | objectives: 4.3.3 -->
## Integrated observability, audit and compliance

**Dashboards for different audiences.** CloudWatch dashboards combine operational metrics and alarms; Amazon Managed Grafana builds dashboards over CloudWatch and other sources; AWS Quick (with its Quick Sight feature) visualizes business impact from invocation logs or evaluation results stored in S3 and queried with Amazon Athena.

**Forensic traceability and audit logging.**

| Need | Source |
| --- | --- |
| Who called which model or changed a guardrail, knowledge base or agent configuration | AWS CloudTrail management events (logged by default); `InvokeModel`, `Converse` and their streaming forms are management events |
| Agent, knowledge base, flow, guardrail and prompt runtime calls | CloudTrail **data events**, not logged by default and charged: `InvokeAgent`, `Retrieve`, `RetrieveAndGenerate`, `InvokeFlow`, `ApplyGuardrail`, `RenderPrompt` |
| Where a cross-Region inference request was processed | CloudTrail in the source Region, field `additionalEventData.inferenceRegion` |
| What the prompt and the response contained | Model invocation logs (CloudWatch Logs or S3) |

Protect the audit trail itself: restrict access to the log group and bucket, encrypt with AWS KMS, apply CloudWatch Logs data protection to mask sensitive data in invocation logs, and set retention to the compliance requirement.

**User interaction and behavior tracking.** Propagate a session ID and a user or tenant ID through every call (as `requestMetadata` on Bedrock calls and as trace attributes) so one conversation can be reconstructed across services. Track model behavior patterns: share of `max_tokens` stop reasons (truncation), refusals, guardrail interventions by policy type, tool choice frequencies and average turns per conversation.

> **Exam trap.** CloudTrail shows that a principal invoked a model; it is not the place to inspect prompt and response content. For "analyze the content of requests and responses", the answer is model invocation logging.

<!-- section: tool-performance | objectives: 4.3.4 -->
## Tool and agent performance monitoring

Agents fail in the tools they call: a slow API, a tool that returns errors, a loop that calls the same tool repeatedly.

**AgentCore Gateway metrics** (namespace `AWS/Bedrock-AgentCore`, one-minute batches):

| Metric | Use |
| --- | --- |
| `Invocations` | Call pattern tracking per operation, method and tool |
| `Throttles`, `SystemErrors`, `UserErrors` | 429, 5xx and other 4xx failures |
| `Latency` | Time to the first response token |
| `Duration` | End-to-end processing time |
| `TargetExecutionTime` | Time spent in the target (Lambda function, OpenAPI or MCP server) |
| `TargetType` | Requests served per target type |

Dimensions include `Operation`, `Protocol`, `Method` (for example the MCP method `tools/list`), `Resource` (gateway ARN) and `Name` (the tool name), so each tool can have its own alarm.

**AgentCore Runtime metrics** include `Invocations`, `Throttles`, system and user errors, `Latency`, session counts, `ActiveSessionCount`, and resource usage (`CPUUsed-vCPUHours`, `MemoryUsed-GBHours`).

**Tool calling observability and multi-agent coordination.**

- Enable CloudWatch Transaction Search once per account, then instrument agent code with ADOT (`aws-opentelemetry-distro`, run with `opentelemetry-instrument`); frameworks such as Strands Agents emit spans for each model call and tool call.
- Propagate the session with the `X-Amzn-Bedrock-AgentCore-Runtime-Session-Id` header, or the `session.id` OpenTelemetry baggage for agents outside AgentCore Runtime, so a supervisor agent and its sub-agents appear in one trace.
- Agents hosted on Lambda use the AWS Lambda Layer for OpenTelemetry.
- Bedrock Agents Classic produces its own agent traces, but it is closed to new customers since July 30, 2026: new agents use AgentCore or Strands Agents.

**Usage baselines.** Record the normal calls per session for each tool and alarm on deviations (anomaly detection on the per-tool `Invocations` metric). A sudden rise in calls to one tool per session often signals a reasoning loop or a prompt injection driving the agent.

<!-- section: vector-store-operations | objectives: 4.3.5 -->
## Vector store operational management

**Performance monitoring (OpenSearch Serverless, namespace `AWS/AOSS`).**

| Metric | Watch for |
| --- | --- |
| `SearchRequestLatency`, `SearchRequestRate`, `SearchRequestErrors` | Slow or failing retrieval |
| `IngestionRequestErrors`, `IngestionDocumentErrors` | Documents not indexed |
| `SearchableDocuments` | Document count drift after syncs |
| `SearchOCU`, `IndexingOCU` | Capacity consumption and cost |
| `VectorIndexBuildAccelerationOCU` | GPU-accelerated vector index builds |
| `StorageUsedInS3` | Index growth |

Classic vector collections scale OCUs automatically; above 200 OCUs, ask AWS Support to raise the account maximum. For Aurora PostgreSQL with pgvector, watch database CPU, memory and query latency, and keep the vector index sized for memory.

**Knowledge base ingestion monitoring.** Enable knowledge base log delivery (`APPLICATION_LOGS` to CloudWatch Logs, S3 or Amazon Data Firehose). Job-level events report `COMPLETE` or `FAILED` with resource statistics; document-level events report statuses such as `RESOURCE_IGNORED`, `EMBEDDING_FAILED`, `INDEXING_FAILED` or `PARTIALLY_INDEXED`, with reasons.

```text
filter level = "ERROR" or level = "WARN"
| filter event.status in ["EMBEDDING_FAILED", "INDEXING_FAILED", "RESOURCE_IGNORED"]
| stats count(*) by event.status
```

**Automated index optimization routines.** Schedule `StartIngestionJob` with Amazon EventBridge Scheduler or trigger it from S3 events so the index follows the source; a sync processes added, modified and deleted documents. Alarm when an ingestion job fails or when ignored documents exceed a threshold.

**Data quality validation.** Validate documents before ingestion: supported format and size, extractable text (not scanned images without OCR), required metadata in each `.metadata.json` file, no sensitive data that should not be retrievable (Amazon Macie for S3). Periodically run a fixed set of test queries and compare the retrieved documents with the expected ones to catch silent relevance regressions.

<!-- section: genai-troubleshooting | objectives: 4.3.6 -->
## FM-specific troubleshooting frameworks

Traditional ML monitoring watches input feature drift and prediction accuracy. Generative models add failure modes that a status code never shows:

| Failure mode | Detection technique |
| --- | --- |
| Hallucination (fluent but false) | Golden dataset with reference answers; contextual grounding scores; LLM-as-a-judge correctness and faithfulness |
| Inconsistent answers to the same question | Output diffing: repeat the prompt, compare responses by embedding similarity or field-by-field for JSON |
| Logical errors in multi-step reasoning | Reasoning path tracing through agent spans: inputs, tool calls and intermediate results of each step |
| Truncated or malformed output | `stopReason` `max_tokens`, schema validation failures |
| Silent retrieval misses | Retrieved chunk IDs in traces, compared with expected documents |
| Behavior change after a model or prompt update | Regression run of the golden dataset before and after, diff of scores |

**Golden datasets.** A curated set of prompts with reference answers and expected sources, versioned with the prompt templates. Run it on a schedule and after every model, prompt or knowledge base change (for example as an Amazon Bedrock evaluation job with `Builtin.Correctness` and `Builtin.Faithfulness`), and alarm when scores drop.

**Output diffing.** Send the same prompt several times with temperature 0, or the same prompt to the old and new configuration, embed the responses and flag pairs below a similarity threshold; for structured output, compare fields.

**Specialized observability pipelines.** Invocation logs land in S3; an S3 event or a scheduled job samples records, scores them with an LLM judge or guardrail checks, writes scores as custom CloudWatch metrics and stores details for Athena queries. SageMaker AI Model Monitor and Clarify are closed to new customers since July 30, 2026: build drift and quality monitoring for new FM designs on Bedrock Evaluations, Guardrails and CloudWatch.

> **Exam tip.** When the stem says "detect hallucinations before users report them", look for a golden dataset or grounding checks with an alarm, not for latency or error metrics.

<!-- section: key-points -->
## Key points

- `AWS/Bedrock` metrics: `Invocations`, `InvocationLatency`, `TimeToFirstToken` (streaming only), client and server errors, `InvocationThrottles`, token and cache token counts, `EstimatedTPMQuotaUsage`.
- Model invocation logging is off by default, per account and Region, to CloudWatch Logs and/or S3; bodies over 100 KB go to S3; it powers the CloudWatch Model Invocations dashboard.
- CloudTrail: model invocations are management events; agent, knowledge base, flow, guardrail and prompt runtime calls are data events, off by default.
- Token bursts: CloudWatch anomaly detection alarms; spend patterns: Cost Anomaly Detection (hours, not minutes).
- Tools: AgentCore Gateway metrics per tool (`Name` dimension), `TargetExecutionTime`, ADOT traces with Transaction Search, session ID propagation.
- Vector stores: `SearchRequestLatency`, OCU metrics, knowledge base `APPLICATION_LOGS`, scheduled ingestion jobs, pre-ingestion validation.
- GenAI failure modes need golden datasets, output diffing and reasoning traces; Model Monitor and Clarify are closed to new customers.
