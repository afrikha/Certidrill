Troubleshooting questions give you a symptom (an error message, a metric that moved, a failed deployment, a slow trace) and ask what caused it or how to find the cause with the least effort. You need to recognize the classic integration errors, read Lambda, API Gateway, SQS and DynamoDB metrics, query CloudWatch Logs, follow a deployment failure to the log that explains it, and use the AWS AI tools that analyze errors for you.

<!-- section: debugging-defects | objectives: 4.1.1 -->
## Debugging application code and service integration issues

Most defects in AWS applications are integration defects: permissions, timeouts, payload formats, throttling and networking.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `AccessDeniedException` when the function calls DynamoDB, S3 or SQS | The function's **execution role** lacks the action or the resource ARN | Add the action on the right ARN to the execution role |
| S3, SNS or EventBridge never invokes the function, nothing in its logs | The function's **resource-based policy** doesn't allow the service | `aws lambda add-permission` for that service principal and source ARN |
| `Task timed out after 3.00 seconds` | Default 3-second timeout, slow downstream call, or a function in a VPC with no route to the service | Raise the timeout, add a NAT gateway or a VPC endpoint, set SDK timeouts below the function timeout |
| `Runtime exited` or process killed, Max Memory Used equals Memory Size | Out of memory | Increase the memory setting |
| `TooManyRequestsException` (429), `Rate exceeded`, `ThrottlingException` | Concurrency or API rate limit reached | Retries with exponential backoff and jitter, reserved concurrency, quota increase |
| `ProvisionedThroughputExceededException` from DynamoDB | Capacity exceeded or a hot partition key | Backoff (the SDK retries), higher capacity or on-demand mode, a higher-cardinality key |
| API Gateway `502` with Lambda proxy integration | The function returned a malformed response (no `statusCode`, `body` not a string) or threw an error | Return `statusCode`, `headers`, `body` as a string |
| API Gateway `504` | The integration exceeded the integration timeout (29 seconds by default) | Make the work asynchronous or faster |
| API Gateway `403 Missing Authentication Token` | Wrong path or stage, or the method isn't deployed | Call the right resource and stage, redeploy the API |
| Browser blocks the response (CORS) | No `Access-Control-Allow-Origin` header; with proxy integration the function must return it | Enable CORS and return the headers from the function |
| SQS messages processed twice | Visibility timeout shorter than the processing time | Raise the visibility timeout (at least six times the function timeout for Lambda), make processing idempotent |
| `KMS AccessDeniedException` when reading an encrypted object or secret | The key policy or the role lacks `kms:Decrypt` | Grant `kms:Decrypt` on that key |

Tools that identify the defect quickly:

```bash
aws sts get-caller-identity
aws sts decode-authorization-message --encoded-message "<encoded-message>"
aws lambda get-policy --function-name orders
sam local invoke OrdersFunction --event events/order.json --debug-port 5858
```

- `get-caller-identity` shows which principal the code really uses (a wrong profile or role is a frequent cause).
- `decode-authorization-message` decodes the encoded message of some `UnauthorizedOperation` errors (EC2) to show the denied action and the policy context.
- The **IAM policy simulator** tests whether a principal's policies allow an action on a resource.
- **CloudTrail** event history (90 days of management events) shows the failed API call with its `errorCode` and the calling identity.
- `sam local invoke --debug-port` attaches an IDE debugger to the function running locally.

SDK clients retry throttling and transient errors themselves. Tune them rather than writing loops:

```text
# Python (boto3)
from botocore.config import Config
import boto3

config = Config(retries={"max_attempts": 5, "mode": "adaptive"},
                connect_timeout=2, read_timeout=5)
dynamodb = boto3.client("dynamodb", config=config)
```

> **Exam trap.** "The function works when invoked from the console but S3 events never trigger it" is the resource-based policy (or the event notification configuration), not the execution role. "The function in a private subnet times out calling an AWS API" is missing network access (NAT gateway or VPC endpoint), not a missing permission.

<!-- section: metrics-logs-traces | objectives: 4.1.2 -->
## Interpreting application metrics, logs and traces

Every Lambda invocation ends with a **REPORT** line in CloudWatch Logs:

```text
REPORT RequestId: 3f0c7a7e-1c2d-4e5f-8a9b-0c1d2e3f4a5b Duration: 2875.12 ms Billed Duration: 2876 ms Memory Size: 512 MB Max Memory Used: 498 MB Init Duration: 812.40 ms
```

`Init Duration` appears only on a cold start; `Max Memory Used` close to `Memory Size` warns of an out-of-memory failure; `Duration` close to the timeout warns of timeouts.

| Service | Metric | What it tells you |
| --- | --- | --- |
| Lambda | `Errors`, `Throttles`, `Duration`, `ConcurrentExecutions` | Function errors, throttled invocations (not counted in `Errors`), execution time, concurrency in use |
| Lambda (stream sources) | `IteratorAge` | Age of the last record read: rising means the function falls behind the Kinesis or DynamoDB stream |
| API Gateway | `4XXError`, `5XXError`, `Count` | Client errors (auth, validation, throttling 429) vs server and integration errors |
| API Gateway | `Latency` vs `IntegrationLatency` | Total time vs back-end time; a large gap is API Gateway overhead (authorizer, mapping) |
| Amazon SQS | `ApproximateNumberOfMessagesVisible`, `ApproximateAgeOfOldestMessage` | Backlog and how long messages wait: consumers too slow or failing |
| DynamoDB | `ThrottledRequests`, `ReadThrottleEvents`, `WriteThrottleEvents`, `ConsumedReadCapacityUnits` | Capacity problems, often one hot partition key |
| Application Load Balancer | `HTTPCode_ELB_5XX_Count` vs `HTTPCode_Target_5XX_Count`, `TargetResponseTime`, `UnHealthyHostCount` | Errors from the load balancer itself vs from the application |

Read statistics deliberately: an average hides outliers, so latency is judged with percentiles (p95, p99); error counts with `Sum`.

In **AWS X-Ray** traces, a trace is made of **segments** (one per service) and **subsegments** (downstream calls, SQL queries, custom code blocks). The trace map colors nodes by status: **error** for 4xx responses, **fault** for 5xx responses, **throttle** for 429. The subsegment with the longest duration locates the slow dependency. **Annotations** are indexed key-value pairs you can filter on (`annotation.customerTier = "gold"`); **metadata** is not indexed.

> **Exam trap.** A rise in API Gateway `Latency` with a flat `IntegrationLatency` points to API Gateway (a Lambda authorizer, mapping templates), not to the back end. Lambda throttles appear in `Throttles`, never in `Errors`.

<!-- section: query-logs | objectives: 4.1.3 -->
## Querying logs to find relevant data

**CloudWatch Logs Insights** queries one or more log groups interactively. Logs Insights QL chains commands with pipes:

| Command | Use |
| --- | --- |
| `fields` | Choose the fields to show |
| `filter` | Keep matching events (`like`, `=`, `in`, regular expressions) |
| `stats` | Aggregate: `count()`, `avg()`, `max()`, `pct()`, grouped `by` a field or `bin(5m)` |
| `sort`, `limit` | Order and cap the results |
| `parse` | Extract fields from unstructured text with a glob or regular expression |

Discovered fields include `@timestamp`, `@message`, `@logStream`, `@log` and, for Lambda REPORT lines, `@type`, `@requestId`, `@duration`, `@billedDuration`, `@memorySize` and `@maxMemoryUsed`. JSON logs are parsed automatically, so their keys can be filtered directly.

```text
fields @timestamp, @message
| filter level = "ERROR" and service = "checkout"
| stats count(*) as errors by bin(5m)
| sort errors desc

filter @type = "REPORT"
| stats max(@maxMemoryUsed / 1000 / 1000) as maxMemoryMB, pct(@duration, 99) as p99Duration by bin(1h)

parse @message "orderId=* status=*" as orderId, status
| filter status = "FAILED"
| limit 50
```

Facts to know: Logs Insights also accepts **OpenSearch PPL** and **OpenSearch SQL**; it can **generate a query from a natural language description** (Logs Insights QL); queries time out after 60 minutes; results are kept 7 days; you pay per GB of log data scanned, so narrow the time range and log groups.

Other ways to search logs:

| Need | Tool |
| --- | --- |
| Follow a function's logs live from a terminal | `aws logs tail /aws/lambda/orders --follow --filter-pattern ERROR` |
| Count occurrences continuously and alarm on them | A **metric filter** on the log group |
| Process log events in near real time elsewhere | A **subscription filter** to Lambda, Kinesis Data Streams or Amazon Data Firehose |
| Query logs stored in Amazon S3 (ALB access logs, CloudTrail logs) | Amazon Athena |
| Find who changed a resource and when | CloudTrail event history or a CloudTrail trail |

```bash
aws logs start-query --log-group-name /aws/lambda/orders \
  --start-time 1763600000 --end-time 1763603600 \
  --query-string 'filter level = "ERROR" | stats count(*) by errorType'
aws logs get-query-results --query-id 12ab3456-12ab-123a-789e-1234567890ab
```

> **Exam tip.** "Find the 10 slowest requests of the last hour across three log groups, with no extra infrastructure" means CloudWatch Logs Insights. "Alert when the word TIMEOUT appears more than 5 times in 1 minute" means a metric filter and an alarm, not a scheduled query.

<!-- section: deployment-failures | objectives: 4.1.4 -->
## Troubleshooting deployment failures with output logs

| Service | Where the cause is written | Frequent causes |
| --- | --- | --- |
| CloudFormation, AWS SAM, AWS CDK | Stack **events**: the first `CREATE_FAILED` or `UPDATE_FAILED` event and its status reason | Missing IAM permission, invalid property, name already used, quota reached, a resource that never signals |
| AWS CodeBuild | Build logs in CloudWatch Logs or S3, and the phase details (which phase failed, with the exit code) | `buildspec.yml` not found or invalid YAML, a command returning non-zero, a service role missing ECR or S3 permissions, Docker builds without privileged mode |
| AWS CodeDeploy (EC2/On-premises) | Lifecycle event details in the console; on the instance, the agent log and `scripts.log` | Agent not installed or not running, instance profile can't read the revision in S3, a hook script failing or timing out |
| Amazon ECS | Service events and the **stopped reason** of stopped tasks | `CannotPullContainerError` (execution role, image tag, no route to ECR), essential container exited, failing health checks that trip the circuit breaker |
| Elastic Beanstalk | Environment events, the last 100 lines or full log bundle, enhanced health | Application not listening on the expected port, failing platform hooks, health check URL returning errors |
| CodePipeline | The failed action links to its CodeBuild, CodeDeploy or CloudFormation details | Fix in the underlying service, then retry the stage |

CodeDeploy agent files on Amazon Linux, RHEL and Ubuntu: `/var/log/aws/codedeploy-agent/codedeploy-agent.log` (agent), `/opt/codedeploy-agent/deployment-root/deployment-logs/codedeploy-agent-deployments.log` (deployments) and `scripts.log` under each deployment's folder. Send them to CloudWatch with the CloudWatch agent instead of connecting to each instance.

```bash
aws cloudformation describe-stack-events --stack-name orders-prod \
  --query "StackEvents[?contains(ResourceStatus, 'FAILED')].[LogicalResourceId,ResourceStatusReason]" \
  --output table
aws ecs describe-tasks --cluster prod --tasks arn:aws:ecs:eu-west-1:111122223333:task/prod/8f2c1d0e \
  --query "tasks[].[stoppedReason,containers[].reason]"
```

- A stack whose first creation failed is in `ROLLBACK_COMPLETE`: read the events, delete it, create it again.
- To inspect resources of a failed creation (for example the instance's `/var/log/cloud-init-output.log`), create the stack with rollback disabled.
- Later events in a failed stack are often consequences (`Resource creation cancelled`); the first failure is the cause.

> **Exam trap.** A CodeDeploy deployment that fails in `ApplicationStop` on every new revision often comes from the script of the previous, broken revision, which runs during `ApplicationStop`. Redeploy with the option to ignore `ApplicationStop` failures, then fix the script.

<!-- section: ai-troubleshooting | objectives: 4.1.5 -->
## Using AWS AI tools to analyze errors and suggest fixes

| Tool | What it does | Started from |
| --- | --- | --- |
| **CloudWatch investigations** | Generative AI assistant that scans telemetry (metrics, logs, deployment events, AWS Health events, CloudTrail change events, X-Ray traces) and proposes observations, hypotheses and a root cause explained in natural language, then an investigation report | A CloudWatch alarm, a metric or a Logs Insights query |
| **Logs Insights query generation** | Turns a question in natural language into a Logs Insights QL query, with a line-by-line explanation | The Logs Insights query editor |
| **AWS DevOps Agent** (generally available since March 31, 2026) | Triages incidents by correlating telemetry, code and deployment data, then proposes a mitigation plan and prevention steps | An alarm or incident from your observability tools |
| **Kiro** (IDE and CLI) | Explains a stack trace or a failed build in the context of your code and proposes a fix; headless mode does it in a pipeline | The developer, or a CI step with the log on standard input |

CloudWatch investigations facts: it uses the permissions of the person who starts it, creates no resources, logs its actions in CloudTrail, and an account has one investigation group with up to 2 concurrent active investigations and up to 150 enhanced investigations with AI analysis per month.

```bash
{
  printf '%s\n\n' "Explain this build failure and suggest a fix:"
  cat build-error.log
} | kiro-cli chat --v3 --no-interactive --trust-tools=read_file
```

Use AI suggestions as **hypotheses**: confirm them in the metrics, logs or traces before you change anything, and make the fix through the normal pipeline. Don't paste secrets or customer data into prompts; mask sensitive data in logs first (see the observability chapter). Amazon Q Developer, which offered similar help, closed to new sign-ups on May 15, 2026.

> **Exam tip.** "An alarm fired; find the probable root cause across metrics, logs, traces and recent changes with the LEAST effort" means starting a CloudWatch investigation from the alarm. "Write the Logs Insights query from a plain-English question" means query generation in Logs Insights.

<!-- section: key-points -->
## Key points

- `AccessDenied` from code = execution role; service can't invoke the function = resource-based policy; timeout in a VPC = network path (NAT or VPC endpoint).
- API Gateway 502 = malformed proxy response, 504 = integration timeout, 403 Missing Authentication Token = wrong path or stage.
- Throttling (429, `ProvisionedThroughputExceededException`): SDK retries with backoff, adaptive retry mode, more capacity.
- REPORT line: Duration, Max Memory Used, Init Duration on cold starts. `Throttles` is not `Errors`; `Latency` minus `IntegrationLatency` is API Gateway time; `IteratorAge` measures stream lag.
- X-Ray: error 4xx, fault 5xx, throttle 429; annotations are indexed, metadata is not.
- Logs Insights: `fields | filter | stats | sort | limit | parse`; also PPL and SQL; natural language generation; charged per GB scanned.
- Deployment failures: first failed stack event, CodeBuild phase details, CodeDeploy agent and `scripts.log`, ECS stopped reason, Beanstalk events and logs.
- CloudWatch investigations, Logs Insights query generation, AWS DevOps Agent and Kiro analyze errors; verify their hypotheses before acting.
