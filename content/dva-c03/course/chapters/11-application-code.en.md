Application code on AWS calls other services through SDKs, receives events, publishes messages and depends on APIs that can fail or slow down. DVA-C03 questions show such code and ask which integration pattern, SDK setting, API Gateway feature, serialization fix or managed AI service makes it correct, resilient and loosely coupled.

<!-- section: coupling | objectives: 1.1.1 -->
## Tightly and loosely coupled components

Components are **tightly coupled** when one must be available, fast and unchanged for the other to work: a synchronous call to a slow back end, a hard-coded endpoint, a shared schema, a producer that fails when the consumer is down. They are **loosely coupled** when an intermediary absorbs the differences.

| Coupling problem in the stem | Decoupling service |
| --- | --- |
| The producer loses work when the consumer is slow, offline or being deployed | Amazon SQS queue; the consumer polls at its own pace |
| One event must reach several independent consumers, and more will be added | Amazon SNS topic (often fanning out to one SQS queue per consumer) or one Amazon EventBridge rule per consumer |
| Events from AWS services or SaaS applications must be routed by content | Amazon EventBridge event bus with rules |
| Several consumers must read the same ordered records and replay them | Amazon Kinesis Data Streams |
| A multi-step process with retries and branches | AWS Step Functions state machine |
| Clients must not know which servers or functions answer | Amazon API Gateway or an Application Load Balancer |

> **Exam trap.** A Lambda function that invokes another one synchronously (`RequestResponse`) stays tightly coupled: it pays for the wait and fails when the callee fails. Put a queue, a topic, an event bus or a Step Functions workflow between them.

<!-- section: sync-async | objectives: 1.1.2 -->
## Synchronous and asynchronous patterns

In a **synchronous** pattern the caller waits for the result and handles errors itself; in an **asynchronous** pattern a service stores the work, acknowledges at once, and the work runs later.

| Pattern | How the caller is answered | Choose it when |
| --- | --- | --- |
| API Gateway invoking Lambda | Waits for the response, within the integration timeout (29 seconds by default) | A user waits for a result computed in milliseconds to seconds |
| SQS queue | `SendMessage` returns a message ID; a consumer processes later | Work can wait, load is spiky, the consumer must be protected |
| SNS topic or EventBridge bus | `Publish` or `PutEvents` returns at once; the service pushes to subscribers or rule targets | The same event goes to several consumers |
| Lambda asynchronous invocation | Lambda queues the event and returns HTTP 202 | Fire-and-forget with Lambda's retries and destinations |
| Step Functions Standard workflow | `StartExecution` returns an execution ARN | Long multi-step processes |

```bash
aws lambda invoke --function-name process-order \
  --invocation-type Event \
  --cli-binary-format raw-in-base64-out \
  --payload '{"orderId":"o-1001"}' response.json
```

`RequestResponse` (the default) is synchronous, `Event` asynchronous, `DryRun` only checks permissions.

> **Exam tip.** "The request takes several minutes and clients time out" means: queue the work or start a Step Functions execution, return an ID at once (HTTP 202), and let the client poll or be notified.

<!-- section: resilience | objectives: 1.1.3 -->
## Fault tolerance: retries, idempotency and graceful degradation

The AWS SDKs retry transient errors (throttling, HTTP 5xx, timeouts, connection resets) automatically. The default **standard** retry mode uses exponential backoff with jitter and `max_attempts` 3 (initial request included); **adaptive** adds client-side rate limiting for a resource that throttles often; **legacy** exists for backward compatibility. Set them with `AWS_RETRY_MODE` and `AWS_MAX_ATTEMPTS` or in code. `AccessDeniedException`, `ValidationException` and `ResourceNotFoundException` are never retried.

```text
# Python (boto3)
from botocore.config import Config
dynamodb = boto3.client("dynamodb", config=Config(retries={"mode": "standard", "max_attempts": 5}))

// JavaScript (SDK v3)
const client = new DynamoDBClient({ maxAttempts: 5, retryMode: "adaptive" });
```

Your own retry loops (for the items a batch call didn't process) must wait longer after each attempt, add random jitter so clients don't retry in lockstep, and cap the attempts. A retry is safe only if the operation is **idempotent**: use an idempotency key (an order ID checked by a DynamoDB conditional write, `ClientRequestToken` on DynamoDB transactions, SQS FIFO deduplication IDs) and make consumers of SQS, SNS, EventBridge and Kinesis tolerate duplicates, since delivery is at least once.

Step Functions declares retries and fallbacks per state (defaults: `IntervalSeconds` 1, `MaxAttempts` 3, `BackoffRate` 2.0):

```json
"ChargeCard": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": { "FunctionName": "charge-card", "Payload.$": "$" },
  "Retry": [
    { "ErrorEquals": ["States.Timeout", "Lambda.TooManyRequestsException"], "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0, "JitterStrategy": "FULL" }
  ],
  "Catch": [
    { "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "QueueForLater" }
  ],
  "Next": "SendReceipt"
}
```

**Graceful degradation** keeps the application useful when a dependency fails: serve cached or default data, switch off a non-essential feature with an AWS AppConfig feature flag, and stop calling a failing dependency for a while (circuit breaker).

> **Exam trap.** A loop that retries immediately turns throttling into an outage. "Calls fail with `ProvisionedThroughputExceededException` during peaks" is answered by retries with exponential backoff and jitter (plus capacity or key fixes), never by retrying faster.

<!-- section: apis | objectives: 1.1.4 -->
## Creating, extending and maintaining APIs

Only API Gateway **REST APIs** have request validation, body transformation with mapping templates, caching, API keys and usage plans, AWS WAF, private endpoints and mock integrations. **HTTP APIs** are cheaper; their parameter mapping changes headers, query strings, paths and status codes (`append:header.name`, `overwrite:path`, `overwrite:statuscode`) but not the body.

| Integration | Who shapes the response |
| --- | --- |
| Lambda proxy (`AWS_PROXY`): the whole request becomes the event | The function, in a fixed format |
| Lambda custom (non-proxy) | Request and response mapping templates |
| AWS service (SQS `SendMessage`, Step Functions `StartExecution`) without Lambda | Mapping templates |
| Mock | The integration response template, with no back end |

A proxy integration expects this output, `body` as a string; anything else gives the client a 502 error:

```json
{
  "statusCode": 201,
  "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": "https://app.example.com" },
  "body": "{\"orderId\":\"o-1001\",\"status\":\"CREATED\"}",
  "isBase64Encoded": false
}
```

A **request validator** checks the body against a **model** (JSON Schema draft 4) and/or that required query strings, headers and path parameters are present. A failure returns HTTP 400 without calling the integration, so the function isn't billed for bad input; gateway responses (`BAD_REQUEST_BODY`, `BAD_REQUEST_PARAMETERS`) customize the error.

**Mapping templates** (Velocity Template Language) reshape requests and responses of non-proxy integrations:

```text
#set($root = $input.path('$'))
{
  "customerId": "$root.customer.id",
  "items": $input.json('$.cart.items'),
  "requestId": "$context.requestId"
}
```

When no template matches the `Content-Type`, `WHEN_NO_MATCH` (default) passes the body through, `WHEN_NO_TEMPLATES` passes it only if the method has no template, `NEVER` returns 415. A REST API change reaches clients only after a **deployment** to a stage. Add versions without breaking clients through a new path (`/v2/orders`) or stage, and point each stage at its Lambda alias with stage variables.

> **Exam trap.** Mapping templates are ignored with a Lambda proxy integration. "Transform the request body without changing the function" means a custom (non-proxy) integration on a REST API; HTTP APIs can't transform bodies.

<!-- section: sdk | objectives: 1.1.5 -->
## Calling AWS services with the APIs and SDKs

Every API call is an HTTPS request signed with Signature Version 4; the SDKs (boto3, the modular JavaScript SDK v3...) build, sign, retry and parse them.

| Symptom or requirement | Fix |
| --- | --- |
| No access keys in code | The SDK default credential chain finds a role: Lambda execution role, ECS task role, EC2 instance profile, IAM Identity Center for developers |
| A list call returns only part of the results | Follow the pagination token or use a paginator |
| Wait until a resource is ready | A waiter, not a sleep loop |
| A batch call reports partial failures | Retry only the entries in `UnprocessedItems` (DynamoDB) or flagged by `FailedRecordCount` (Kinesis), with backoff |
| Each invocation recreates clients and connections | Create clients outside the Lambda handler |
| The call fails with an error code | Catch the service exception and branch on its code (`ConditionalCheckFailedException`, `ThrottlingException`) |

```text
# Python (boto3): paginator and waiter
s3 = boto3.client("s3")
for page in s3.get_paginator("list_objects_v2").paginate(Bucket="anycompany-invoices", Prefix="2026/"):
    for obj in page.get("Contents", []):
        print(obj["Key"])
s3.get_waiter("object_exists").wait(Bucket="anycompany-invoices", Key="2026/11/summary.csv")

// JavaScript (SDK v3): one client per service, commands sent with send()
import { S3Client, paginateListObjectsV2 } from "@aws-sdk/client-s3";
const s3 = new S3Client({});
for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket: "anycompany-invoices" })) {
  console.log(page.Contents?.length);
}
```

> **Exam tip.** A boto3 `client` maps one-to-one to the API (DynamoDB values typed as `{"S": "..."}`); the `Table` resource converts Python types. In the AWS CLI, `--query` filters with JMESPath and `--debug` shows the signed requests.

<!-- section: streaming | objectives: 1.1.6 -->
## Managing streaming data

**Amazon Kinesis Data Streams** keeps records in shards for 24 hours by default, up to 365 days. A provisioned shard takes 1 MB/s or 1,000 records/s of writes and serves 2 MB/s of reads shared by its consumers; on-demand mode scales automatically. The **partition key** is hashed to pick the shard: same key, same shard, same order, so choose a key with many distinct values.

- `PutRecords` sends up to 500 records and can partly fail: resend only the records whose result has an `ErrorCode`.
- `ProvisionedThroughputExceededException`: retry with backoff, spread the keys, add shards or use on-demand mode.
- The **Kinesis Client Library** keeps one lease per shard in a DynamoDB table and checkpoints progress; more workers than shards add nothing. KCL 1.x reached end of support on January 30, 2026.
- **Enhanced fan-out** gives each registered consumer its own 2 MB/s per shard.

```text
# Python (boto3): resend only the failed records
response = kinesis.put_records(StreamName="clickstream", Records=records)
if response["FailedRecordCount"] > 0:
    retry = [rec for rec, res in zip(records, response["Records"]) if "ErrorCode" in res]
    # wait with exponential backoff and jitter, then put_records(Records=retry)
```

**Amazon Data Firehose** buffers records by size or time, can transform them with Lambda, and delivers them to S3, Amazon OpenSearch Service, Amazon Redshift or HTTP endpoints, with no replay. **DynamoDB Streams** keeps item changes for 24 hours, each change once and in order per item; at most two processes should read a shard. Amazon Athena queries the delivered files in S3 with SQL.

> **Exam trap.** SQS isn't a stream: a processed message is deleted, so a second application can't read it and nothing can be replayed. "Several applications process the same events" or "reprocess the last day" points to Kinesis Data Streams.

<!-- section: serialization | objectives: 1.1.7 -->
## Serializing and deserializing data

| Where | Format to handle |
| --- | --- |
| API Gateway proxy event | `body` is a string: parse it (`json.loads`, `JSON.parse`) and return `body` as a string |
| Kinesis record in a Lambda event | `kinesis.data` is base64: decode, then parse |
| SNS delivered to SQS | The SQS body is the SNS JSON envelope (`Type`, `TopicArn`, `Message`...) unless raw message delivery is enabled |
| EventBridge event | `detail` is already a JSON object |
| DynamoDB low-level API | Typed values (`S`, `N`, `B`, `BOOL`, `NULL`, `M`, `L`, `SS`, `NS`, `BS`); numbers travel as strings, up to 38 digits |

```text
# Python: DynamoDB Table resource and JSON
from decimal import Decimal
table.put_item(Item={"orderId": "o-1001", "total": Decimal("19.99")})   # a float raises TypeError
item = table.get_item(Key={"orderId": "o-1001"})["Item"]
json.dumps(item, default=str)                                            # Decimal isn't JSON serializable by default

// JavaScript (SDK v3): document client or marshall/unmarshall
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
const doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
await doc.send(new PutCommand({ TableName: "Orders", Item: { orderId: "o-1001", total: 19.99 } }));
const plain = unmarshall(record.dynamodb.NewImage);   // DynamoDB Streams images use the typed format
```

Send large payloads to S3 and pass the object key in the message.

> **Exam trap.** An SQS consumer subscribed to SNS that can't find its fields is reading the SNS envelope: parse the inner `Message` or enable raw message delivery on the subscription. Don't change the producer.

<!-- section: event-driven | objectives: 1.1.8 -->
## Event-driven patterns

An **EventBridge rule** matches events on a bus with a pattern shaped like the events (array values are alternatives) and sends them to targets such as Lambda, SQS, SNS, Step Functions or API destinations. Avoid rules whose target writes the event that triggers them again.

```json
{
  "source": ["com.anycompany.orders"],
  "detail-type": ["OrderPlaced"],
  "detail": {
    "country": ["FR", "BE"],
    "total": [{ "numeric": [">=", 500] }]
  }
}
```

**Amazon S3 Event Notifications** publish object events (created, removed, restored, replication, lifecycle...) to an SNS topic, an SQS queue, a Lambda function or EventBridge, filtered by prefix and suffix. Delivery is at least once, usually within seconds; the destination's resource policy must allow S3. A function that writes back to the triggering prefix loops.

```json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:eu-west-3:111122223333:function:make-thumbnail",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": { "Key": { "FilterRules": [ { "Name": "prefix", "Value": "uploads/" }, { "Name": "suffix", "Value": ".jpg" } ] } }
    }
  ]
}
```

| Need | Event-driven answer |
| --- | --- |
| Several independent actions on one upload | S3 to SNS fanning out to SQS queues, or S3 to EventBridge with one rule per action |
| React to an AWS service event (a CodeDeploy deployment, an EC2 state change) | EventBridge rule on the default event bus |
| Subscribers receive only some messages of a topic | SNS subscription filter policy |
| Run a task every night | EventBridge Scheduler |

> **Exam trap.** SQS FIFO queues aren't supported as S3 event notification destinations. Send the bucket's events to EventBridge and target the FIFO queue from a rule.

<!-- section: ai-assisted-development | objectives: 1.1.9 -->
## AI-assisted development tools

**Kiro**, AWS's agentic IDE and CLI, succeeds Amazon Q Developer (sign-ups closed May 15, 2026). It offers chat with inline suggestions and code generation, and **spec-driven development**: a feature request becomes three files you review before code is written.

| Spec file | Content |
| --- | --- |
| `requirements.md` (or `bugfix.md`) | Testable requirements in EARS notation |
| `design.md` | Architecture, sequence diagrams, implementation considerations |
| `tasks.md` | Trackable implementation tasks, run one by one or in dependency-based waves |

```text
WHEN a customer submits an order with an unknown product ID
THE SYSTEM SHALL reject the order with HTTP 400 and the message "Unknown product"
```

| Task in the stem | Tool |
| --- | --- |
| Apply team conventions to every generated change | Kiro steering files (`.kiro/steering/`: `product.md`, `tech.md`, `structure.md`; also `AGENTS.md`) |
| Lint, test, document or review automatically on a file save or when the agent stops | Kiro hooks (`.kiro/hooks/`) |
| Refactor or explain code, complete code as you type | Kiro chat and inline suggestions |
| Connect the agent to external tools; run it headless in CI | MCP servers; Kiro CLI |
| Scan code (SAST), dependencies (SCA) and IaC in GitHub or GitLab repositories, with fix pull requests | Amazon Inspector code security |

Amazon CodeGuru Reviewer accepts no new repository associations since November 7, 2025.

> **Exam trap.** AI-generated code is reviewed and tested like any other code before merging. Never put secrets in steering files or prompts, and keep human approval on agent changes to production.

<!-- section: ai-services | objectives: 1.1.10 -->
## Integrating managed AI services

**Amazon Bedrock** serves models on the `bedrock-runtime` endpoint. `Converse` and `ConverseStream` use one message format (`messages`, `system`, `inferenceConfig`, `toolConfig`, `guardrailConfig`) for every model that supports messages; `InvokeModel` takes a model-specific body. `Converse` needs `bedrock:InvokeModel`, `ConverseStream` needs `bedrock:InvokeModelWithResponseStream`. Streaming shows the first tokens sooner; send the previous messages with each request to keep a conversation.

```text
# Python (boto3)
brt = boto3.client("bedrock-runtime")
response = brt.converse(
    modelId=MODEL_ID,                                   # from configuration, not hard-coded
    system=[{"text": "Answer as AnyCompany's support assistant."}],
    messages=[{"role": "user", "content": [{"text": question}]}],
    inferenceConfig={"maxTokens": 512, "temperature": 0.2},
)
answer = response["output"]["message"]["content"][0]["text"]
```

Most serverless models need no access request in commercial Regions; third-party models start an AWS Marketplace subscription on the first call, which needs Marketplace permissions. An `AccessDeniedException` on a first call usually means a missing prerequisite; retry a `ThrottlingException` with backoff.

| Requirement | Service |
| --- | --- |
| Support several models with the least code | Bedrock `Converse` |
| Show the answer while it is generated | Bedrock `ConverseStream` |
| Let the model call your functions | Bedrock tool use (`toolConfig`), or Amazon Bedrock AgentCore Gateway to expose APIs and Lambda functions as MCP tools |
| Host an agent built with any framework, with session isolation, memory and tool policies | AgentCore Runtime, Memory and Policy |
| Business users get dashboards, research and automations over company data | Amazon Quick (AWS Quick in its documentation: Quick Sight, Quick Flows, Quick Research...) |

> **Exam trap.** Switching models with `InvokeModel` means rewriting the request body per provider. "Support several models with the LEAST development effort" is `Converse`, which passes model-specific parameters in `additionalModelRequestFields`.

<!-- section: key-points -->
## Key points

- Decouple with SQS, SNS, EventBridge, Kinesis or Step Functions; long work behind an API returns 202 and an ID.
- SDK retries: `standard` mode, backoff with jitter, transient errors only; idempotency keys make retries safe.
- Proxy integrations ignore mapping templates and need `statusCode` and a string `body`; REST APIs validate requests.
- Paginators, waiters, clients outside the handler, roles; retry only the failed entries of batch calls.
- Parse API Gateway bodies, decode Kinesis base64, unwrap the SNS envelope, use `Decimal` with boto3.
- S3 notifications reach FIFO queues only through EventBridge.
- Kiro specs, steering and hooks; Amazon Inspector for code scanning; Bedrock `Converse` for model-agnostic code.
