This chapter is about the code path between an application and a model: which Amazon Bedrock Runtime operation to call, synchronously or through a queue, how to stream tokens to a browser, how to survive throttling and model errors, and how to send each request to the right model. Exam questions give you the client (web, mobile, batch job, partner API), a latency or reliability requirement and a limit (a 29-second integration timeout, a quota, a WebSocket frame size), and the right answer is the API and integration pattern that respects that limit.

<!-- section: bedrock-runtime-apis | objectives: 2.4.1 -->
## Bedrock Runtime APIs for model interaction

| Operation | What it does | Choose it when |
| --- | --- | --- |
| `Converse` | One message format (`messages`, `system`, `inferenceConfig`, `toolConfig`, `guardrailConfig`) for every supported model | Default for chat and text generation; switching models changes only `modelId` |
| `ConverseStream` | Same request, response as an event stream | Interactive UIs that show tokens as they arrive |
| `InvokeModel` | Model-specific JSON `body` | Embeddings, image models, features only available in a provider's native format |
| `InvokeModelWithResponseStream` | Native body, streamed chunks | Streaming with a native request format |
| Batch inference job | Records in S3, results in S3, completion notified through EventBridge | Large offline datasets |
| `CountTokens` | Returns the token count of an `InvokeModel` or `Converse` input, free of charge | Checking a prompt against limits or estimating cost before sending it |
| OpenAI-compatible APIs (Chat Completions, Responses) | Same models through OpenAI-style requests on the `bedrock-runtime` endpoint | Porting code written for the OpenAI API |

`modelId` accepts a base model ID or ARN, an inference profile ID or ARN, a prompt router ARN, a Provisioned Throughput ARN, a custom model deployment ARN, a Bedrock Marketplace endpoint ARN, or a Prompt management prompt version ARN (then `promptVariables` fills the template, and `system`, `inferenceConfig`, `toolConfig` and `additionalModelRequestFields` can't be sent). Parameters outside the base set (`maxTokens`, `temperature`, `topP`, `stopSequences`) go in `additionalModelRequestFields`. `requestMetadata` (up to 16 key-value pairs) tags the call for filtering invocation logs.

The response carries `output.message`, `usage` (`inputTokens`, `outputTokens`, `totalTokens`, cache read and write tokens), `metrics.latencyMs` and a `stopReason`: `end_turn`, `tool_use`, `max_tokens`, `stop_sequence`, `guardrail_intervened`, `content_filtered`, `malformed_model_output`, `malformed_tool_use` or `model_context_window_exceeded`. Always check it: a `max_tokens` answer is truncated.

```bash
aws bedrock-runtime converse \
  --model-id arn:aws:bedrock:eu-west-1:111122223333:application-inference-profile/a1b2c3d4e5f6 \
  --messages '[{"role":"user","content":[{"text":"Summarize ticket 4521 in two sentences."}]}]' \
  --inference-config '{"maxTokens":300,"temperature":0.2}' \
  --request-metadata '{"team":"support","feature":"ticket-summary"}'
```

**From various compute environments.** Every AWS SDK exposes the same operations (boto3 `converse`, `ConverseCommand` in the SDK for JavaScript v3, the Java SDK v2 Bedrock Runtime clients), authenticated with the role of the compute: a Lambda execution role, an ECS task role, an EKS service account role, an EC2 instance profile. IAM needs `bedrock:InvokeModel` for `Converse` and `InvokeModel`, and `bedrock:InvokeModelWithResponseStream` for both streaming operations.

<!-- section: sync-async-patterns | objectives: 2.4.1 -->
## Synchronous, asynchronous and validated interfaces

| Requirement | Pattern |
| --- | --- |
| Answer in a few seconds, user waiting | Synchronous: API Gateway, Lambda or a container, `Converse` |
| Long generation, bursts above the model quota, or a caller that can't wait | Asynchronous: API Gateway writes the request to SQS (direct AWS service integration, no Lambda) and returns `202` with a job ID; a worker consumes the queue at a controlled concurrency, calls Bedrock, stores the result in DynamoDB or S3; the client polls a status endpoint or receives a push notification |
| Thousands of documents with no deadline | Batch inference job instead of a queue of single calls |

Asynchronous details the exam checks: set the queue visibility timeout to at least six times the consumer function timeout; configure a dead-letter queue with `maxReceiveCount` so poison messages stop retrying; put large documents in S3 and send only the object key (claim check), because SQS messages are limited to 1 MiB; use Lambda reserved concurrency or the SQS event source maximum concurrency to cap parallel model calls under the Bedrock quota.

**Request validation.** API Gateway REST APIs validate requests before any integration runs, so malformed or oversized prompts never cost a model call. A request validator checks required parameters and headers (presence only) and, for the body, a JSON Schema (draft 4) model for the content type (`$default` matches every content type). Failures return `400` immediately and are logged to CloudWatch Logs.

```json
{
  "x-amazon-apigateway-request-validators": {
    "all": { "validateRequestBody": true, "validateRequestParameters": true }
  },
  "x-amazon-apigateway-request-validator": "all",
  "components": {
    "schemas": {
      "ChatRequest": {
        "type": "object",
        "required": ["sessionId", "question"],
        "properties": {
          "sessionId": { "type": "string", "pattern": "^[a-f0-9-]{36}$" },
          "question": { "type": "string", "minLength": 1, "maxLength": 4000 }
        }
      }
    }
  }
}
```

> **Exam trap.** Request validation checks structure, not intent. A schema with `maxLength` blocks oversized prompts, but it doesn't detect prompt injection or harmful content: that is a guardrail's job.

<!-- section: streaming | objectives: 2.4.2 -->
## Real-time streaming of model responses

`ConverseStream` returns events in order: `messageStart`, `contentBlockStart`, `contentBlockDelta` (incremental text or tool input), `contentBlockStop`, `messageStop` (with the `stopReason`) and `metadata` (usage and metrics). Errors can arrive inside the stream (`throttlingException`, `modelStreamErrorException`, `serviceUnavailableException`...), so the consumer must handle them mid-response. Not every model streams: check `responseStreamingSupported` with `GetFoundationModel`. The AWS CLI doesn't support Bedrock streaming operations; use an SDK.

```text
# Python (boto3): forward each delta to the client as soon as it arrives
response = runtime.converse_stream(
    modelId=MODEL_ID,
    messages=[{"role": "user", "content": [{"text": question}]}],
    inferenceConfig={"maxTokens": 800})
for event in response["stream"]:
    if "contentBlockDelta" in event:
        send_to_client(event["contentBlockDelta"]["delta"].get("text", ""))
    elif "messageStop" in event:
        stop_reason = event["messageStop"]["stopReason"]
    elif "metadata" in event:
        record_usage(event["metadata"]["usage"])
```

Delivering the stream to the client:

| Transport | Limits and behavior | Best for |
| --- | --- | --- |
| API Gateway REST API, response transfer mode `STREAM` | `HTTP_PROXY` or `AWS_PROXY` integrations; streams up to 15 minutes and beyond the 10 MB payload limit; idle timeout 5 minutes (Regional, private) or 30 seconds (edge-optimized); no caching, content encoding or VTL response mapping; default mode is `BUFFERED` | HTTP chunked responses and server-sent events from a managed API |
| Lambda response streaming | Function URLs or `InvokeWithResponseStream`; Node.js managed runtimes (other languages through a custom runtime or the Lambda Web Adapter); up to 200 MB, first 6 MB uncapped then 2 MBps; function URLs don't stream inside a VPC | Serverless token streaming |
| API Gateway WebSocket API | Connection up to 2 hours, idle timeout 10 minutes, message 128 KB, frame 32 KB, integration timeout 29 seconds (not adjustable) | Bidirectional chat, server push of tokens and status |
| AWS AppSync real-time subscriptions (the Amplify AI kit builds its routes on AppSync) | GraphQL real-time updates pushed to subscribed clients | Web and mobile apps built with Amplify |

With WebSockets, the route integration must answer within 29 seconds, so the route handler starts the work (asynchronous Lambda invocation or a queue) and the worker sends each delta back with the `@connections` management API (`PostToConnection`) for that connection ID.

Measure user-perceived latency with the Bedrock `TimeToFirstToken` metric, emitted for streaming operations, rather than `InvocationLatency`, which ends at the last token.

> **Exam trap.** A buffered REST integration that waits for a long generation hits the 29-second default integration timeout. Raising the timeout (possible only for Regional and private REST APIs, at the cost of throttle quota) still makes the user wait for the whole answer; response streaming fixes both the timeout and the time to first byte.

<!-- section: resilience | objectives: 2.4.3 -->
## Resilient FM integrations

Know which Bedrock errors to retry:

| Error | HTTP | Retry? |
| --- | --- | --- |
| `ThrottlingException` | 429 | Yes, with backoff; then a cross-Region profile, quota increase or another tier |
| `ModelNotReadyException` | 429 | Yes; the SDK retries it automatically up to 5 times |
| `ServiceUnavailableException`, `InternalServerException` | 503, 500 | Yes, with backoff, then fall back |
| `ModelTimeoutException` | 408 | Retry once, then reduce the input or output size, or stream |
| `ModelErrorException` | 424 | Possibly, then fall back to another model |
| `ValidationException`, `AccessDeniedException`, `ResourceNotFoundException` | 400, 403, 404 | No: fix the request, permissions or model ID |

**SDK retries.** AWS SDKs retry throttling and transient errors with exponential backoff and full jitter (each delay capped at 20 seconds). `standard` mode uses a retry quota; `adaptive` adds a client-side rate limiter that can delay the first attempt after throttling; `legacy` exists only for backward compatibility. Default maximum attempts is 3 (one call plus two retries), configurable with `max_attempts` or `AWS_MAX_ATTEMPTS` (`retry_mode` or `AWS_RETRY_MODE` for the mode).

```text
# Python (boto3): retries and timeouts for long generations
from botocore.config import Config
runtime = boto3.client("bedrock-runtime", config=Config(
    retries={"max_attempts": 5, "mode": "adaptive"},
    connect_timeout=5, read_timeout=120))
```

In AWS Step Functions, a `Retry` block on the Bedrock task does the same: `ErrorEquals`, `IntervalSeconds` (default 1), `MaxAttempts` (default 3), `BackoffRate` (default 2.0), `MaxDelaySeconds` and `JitterStrategy` `FULL`; a `Catch` then routes to a fallback state.

**Rate limiting at the edge.** API Gateway throttles with a token bucket: 10,000 requests per second per account and Region with a 5,000-request burst by default (lower in some newer Regions), stage and method throttling, and usage plans that give each API key a rate, a burst and a quota. Throttled callers receive `429` before any model capacity is consumed.

**Fallback and graceful degradation**, from least to most degraded:

1. Same model through a cross-Region inference profile (more capacity, same output).
2. Another model with the same `Converse` request (a smaller model or another provider).
3. A cached answer for frequent questions, or the retrieved documents without a generated summary.
4. Accept the request asynchronously and notify the user later.

A **circuit breaker** stops calling a failing model after repeated errors (state kept in DynamoDB or ElastiCache, or a Step Functions workflow that checks it), sends traffic to the fallback, and retries the primary after a cool-down.

**Observability across service boundaries.** Enable tracing on API Gateway stages and Lambda functions and instrument the code with AWS Distro for OpenTelemetry (ADOT): the trace shows the API Gateway, Lambda, Bedrock, DynamoDB and SQS segments of one request, so a slow answer can be attributed to retrieval, the model or a retry storm. The X-Ray SDKs and daemon are in maintenance mode since February 25, 2026; new instrumentation uses OpenTelemetry, with traces still viewed in X-Ray and CloudWatch.

> **Exam trap.** Retrying `ValidationException` (for example an input over the context window) or `AccessDeniedException` never succeeds. And a retry loop without backoff and jitter makes throttling worse: use the SDK's retry modes instead of custom tight loops.

<!-- section: model-routing | objectives: 2.4.4 -->
## Intelligent model routing

| Routing need | Implementation |
| --- | --- |
| Fixed model per feature or tenant, changeable without redeploying | Static routing table in application configuration, ideally AWS AppConfig (validators, gradual deployment, rollback) |
| Route by content: legal questions to one model, code to another, images to a multimodal model | Step Functions: a classification step (small model or rules), then a `Choice` state that sends the request to the specialized model task |
| Route easy prompts to a cheaper model of the same family automatically | Bedrock intelligent prompt routing (router ARN as `modelId`) |
| Route on measured latency, error rate or cost | CloudWatch alarms on `InvocationLatency`, `InvocationThrottles` or custom quality metrics change the routing configuration (AppConfig or a parameter) that the router reads |
| Route at the API layer | API Gateway resources per route (`/chat/fast`, `/chat/expert`) to different integrations, stage variables, or a mapping template that rewrites the request body for a backend |

```json
{
  "Comment": "Content-based routing to specialized models",
  "StartAt": "Classify",
  "States": {
    "Classify": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": { "FunctionName": "classify-request", "Payload.$": "$" },
      "ResultSelector": { "category.$": "$.Payload.category", "text.$": "$.Payload.text" },
      "Next": "Route"
    },
    "Route": {
      "Type": "Choice",
      "Choices": [
        { "Variable": "$.category", "StringEquals": "contract", "Next": "ContractModel" },
        { "Variable": "$.category", "StringEquals": "code", "Next": "CodeModel" }
      ],
      "Default": "GeneralModel"
    },
    "ContractModel": { "Type": "Pass", "End": true },
    "CodeModel": { "Type": "Pass", "End": true },
    "GeneralModel": { "Type": "Pass", "End": true }
  }
}
```

The three target states are placeholders for Bedrock tasks (`arn:aws:states:::bedrock:invokeModel`, body up to 256 KiB inline or `Input` and `Output` in S3).

> **Exam tip.** Match the router to the decision: configuration (AppConfig) when the choice is static, Step Functions or code when it depends on the content or on business rules, intelligent prompt routing when it is "cheaper model when quality is equivalent" within one model family, and metrics plus alarms when it depends on observed performance.

<!-- section: key-points -->
## Key points

- `Converse` and `ConverseStream` give one format for all models; `InvokeModel` keeps native bodies; `CountTokens` is free; batch inference for offline volume. Always check `stopReason`.
- `bedrock:InvokeModel` covers `Converse`; `bedrock:InvokeModelWithResponseStream` covers both streaming operations.
- Asynchronous pattern: API Gateway to SQS, `202` plus job ID, workers with capped concurrency, DLQ, visibility timeout at least six times the function timeout, S3 for large payloads.
- API Gateway request validators: required parameters and JSON Schema body, `400` before the integration runs.
- Streaming: REST `STREAM` mode (15 minutes, beyond 10 MB, `HTTP_PROXY` or `AWS_PROXY`), Lambda response streaming (Node.js, 200 MB), WebSockets (2 hours, 10-minute idle, 128 KB messages, 29-second integration, push with `@connections`). Watch `TimeToFirstToken`.
- Resilience: retry throttling and 5xx with backoff and jitter (SDK `standard` or `adaptive`), never validation errors; API Gateway throttling and usage plans; fallback chain and circuit breaker; ADOT tracing across services.
- Routing: AppConfig for static choices, Step Functions `Choice` for content, intelligent prompt routing within a family, alarms for metric-driven switches.
