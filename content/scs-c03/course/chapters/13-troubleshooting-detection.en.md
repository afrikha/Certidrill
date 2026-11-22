Troubleshooting questions describe a detection chain that stays silent: a function with no logs, an API whose requests can't be traced, a health check that always fails, a CloudFront distribution that writes nothing, an agent that sends no data, a trail or rule that misses events. The answer is almost always one permission, one resource policy, one Region or one setting that applies only to new data. This chapter gives the checks in the order to run them.

<!-- section: lambda-api-logging | objectives: 1.3.1 -->
## Lambda and API Gateway logging

**Lambda** writes to CloudWatch Logs through its **execution role**: it needs `logs:CreateLogGroup`, `logs:CreateLogStream` and `logs:PutLogEvents` (the `AWSLambdaBasicExecutionRole` managed policy). Without them the function still runs, but no log appears. The default log group is `/aws/lambda/<function-name>`.

Advanced logging controls change what reaches the log group:

- **Log format**: plain text or JSON. With JSON, an **application log level** and a **system log level** (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`) filter events before they're sent: `DEBUG` lines disappear when the level is `INFO`.
- **Log group**: a custom log group (for example one shared by several functions with a long retention); the execution role must allow writing to that group.
- **Destination**: CloudWatch Logs by default, or Amazon S3 or Firehose through a log group of the `Delivery` class, which keeps events only two days and doesn't support Logs Insights.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --logging-config LogFormat=JSON,ApplicationLogLevel=INFO,SystemLogLevel=WARN,LogGroup=/security/lambda/orders
```

**API Gateway REST APIs** have two independent log types:

| | Execution logs | Access logs |
| --- | --- | --- |
| Content | How API Gateway processed each request: authorizer result, integration errors, traces | Who called and how, in a format you build from `$context` variables |
| Levels | `ERROR` or `INFO`; optional data tracing logs full requests and responses (sensitive data, not for production) | One line per request |
| Destination | Log group `API-Gateway-Execution-Logs_{rest-api-id}/{stage_name}`, managed by API Gateway; or a CloudWatch Logs delivery to your own log groups, S3 buckets or Firehose streams | A log group you create, or a Firehose stream whose name starts with `amazon-apigateway-` |
| HTTP APIs | Not available | Available |

To write to CloudWatch Logs at all, API Gateway needs an IAM role trusting `apigateway.amazonaws.com` with the `AmazonAPIGatewayPushToCloudWatchLogs` policy, set as `cloudWatchRoleArn` in the API Gateway **account settings**, separately in **each Region**.

```bash
aws apigateway update-account --patch-operations \
  op=replace,path=/cloudwatchRoleArn,value=arn:aws:iam::111122223333:role/ApiGatewayCloudWatchLogs
aws apigateway update-stage --rest-api-id a1b2c3d4e5 --stage-name prod --patch-operations \
  op=replace,path=/*/*/logging/loglevel,value=ERROR
```

```text
{ "requestId":"$context.requestId", "ip":"$context.identity.sourceIp", "caller":"$context.identity.caller", "method":"$context.httpMethod", "path":"$context.resourcePath", "status":"$context.status" }
```

| Symptom | Cause |
| --- | --- |
| Lambda runs, no log group or no events | Execution role lacks the logs actions, an SCP or permissions boundary denies them, or the custom log group isn't writable |
| Only some Lambda log lines appear | JSON log level filters them |
| Enabling stage logging fails | No `cloudWatchRoleArn` in the account settings of this Region |
| Need the client IP of every request | Access logs with `$context.identity.sourceIp`, not execution logs |

> **Exam trap.** "Log the caller identity and source IP of every API request without exposing payloads" is access logging. Execution logging at `INFO` with data tracing records full request and response bodies, which is a data exposure risk.

<!-- section: health-checks-cloudfront | objectives: 1.3.1 -->
## Health checks and CloudFront logging

**Route 53 health checks**:

- A public health check of an endpoint whose security group or network ACL blocks the Route 53 health checker ranges always reports unhealthy.
- A private IP can't be checked by public health checkers: use a private endpoint health check (its health check source and the endpoint's security groups must allow the traffic; same account and Region as the source) or a CloudWatch alarm health check.
- With string matching, the string must be in the first 5,120 bytes of the response body, case-sensitive.
- Alarm notifications for public health checks use an SNS topic in US East (N. Virginia).

**ELB target health**: a target stays unhealthy when its security group doesn't allow the load balancer's security group on the health check port, the health check path returns a code outside the matcher, or the check times out; the target health reason (`Target.Timeout`, `Target.ResponseCodeMismatch`, `Target.FailedHealthChecks`) tells which.

**CloudFront logging**:

| Method | Destinations | Requirements and pitfalls |
| --- | --- | --- |
| Standard logging (v2) | CloudWatch Logs, Firehose, S3 | Configured through CloudWatch vended logs, API calls in US East (N. Virginia); the Firehose stream must be in `us-east-1`; S3 buckets in opt-in Regions are supported; formats JSON, plain, w3c, raw, Parquet (S3 only), fixed at creation; bucket and key policies allow `delivery.logs.amazonaws.com` |
| Standard logging (legacy) | S3 | Bucket with **ACLs enabled** (not Object Ownership "bucket owner enforced"); CloudFront grants the `awslogsdelivery` account `FULL_CONTROL`, so the user enabling logging needs `s3:GetBucketAcl` and `s3:PutBucketAcl`; no opt-in Regions; SSE-KMS only with a customer managed key whose policy allows `delivery.logs.amazonaws.com` |
| Real-time logs | Kinesis Data Streams | Selected fields and a sampling rate, delivered within seconds |

Changes to standard logging settings take effect within 12 hours, so an empty bucket right after enabling isn't yet a misconfiguration.

> **Exam trap.** Legacy CloudFront logs that stopped after a bucket was moved to "bucket owner enforced" or encrypted with the AWS managed `aws/s3` key are a bucket problem, not a distribution problem: re-enable ACLs or use a customer managed key, or switch to standard logging (v2).

<!-- section: cloudwatch-agent | objectives: 1.3.2 -->
## Troubleshooting the CloudWatch agent

Work through the agent in this order:

1. **Is it running?** `amazon-cloudwatch-agent-ctl -a status` returns `running` and the version.
2. **What does its log say?** `/opt/aws/amazon-cloudwatch-agent/logs/amazon-cloudwatch-agent.log` on Linux, `C:\ProgramData\Amazon\AmazonCloudWatchAgent\Logs\amazon-cloudwatch-agent.log` on Windows.
3. **Was the configuration accepted?** If the agent won't start, read `configuration-validation.log` in the same logs folder; the generated `.toml` and `.yaml` files show what the JSON was translated into. Edits apply only after `fetch-config`.
4. **Is the target the one you look at?** Check `region`, `log_group_name` and the metrics `namespace` (`CWAgent` by default).
5. **Can it authenticate and reach the endpoints?** EC2 instance profile with `CloudWatchAgentServerPolicy`; on-premises servers use a named profile set in `common-config.toml`. In a private subnet, `dial tcp ...:443: i/o timeout` means no route: add interface endpoints for CloudWatch and CloudWatch Logs with private DNS, allow TCP 443 in their security groups, or provide a NAT gateway.

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a fetch-config -s \
  -c ssm:AmazonCloudWatch-linux-security
curl -v https://logs.eu-west-1.amazonaws.com
```

| Symptom | Cause and fix |
| --- | --- |
| Agent fails to start after a change | JSON rejected: read the validation log |
| Metrics arrive but no log file | Wrong `file_path`, or the agent's user (`run_as_user`) can't read the file |
| Agent in a container gets 401 from instance metadata | IMDSv2 hop limit of 1: set it to 2 |
| Old log lines never re-sent after restart | Expected: the state file in `logs/state/` keeps the read position; only an inode change restarts a file from the beginning |
| `Received signal from OS: terminated` | Something stopped the agent (Systems Manager, `systemctl`, a maintenance window) |
| `append_dimensions` missing behind a proxy | The agent must reach the EC2 endpoint to read instance metadata |

For debugging, set `"debug": true` in the `agent` section, then run `fetch-config` again.

> **Exam trap.** No data from instances in a private subnet with no NAT gateway is a network problem, not an IAM one: the error is a timeout, not `AccessDenied`. The fix is interface VPC endpoints for `monitoring` and `logs`, not a broader instance role.

<!-- section: missing-logs | objectives: 1.3.2 -->
## Finding missing logs and events

| Where it's missing | Check |
| --- | --- |
| CloudTrail files in S3 | `get-trail-status` shows `IsLogging` and the latest delivery error; bucket policy resource path matches the prefix (and `AWSLogs/o-...` for an organization trail) with the right `aws:SourceArn`; KMS key policy allows `cloudtrail.amazonaws.com`; bucket isn't Requester Pays |
| An S3 `GetObject` or Lambda invoke in the trail | Data events aren't logged by default: add an event selector |
| IAM or other global service events | Look in US East (N. Virginia): global service events are delivered there |
| CloudTrail events in CloudWatch Logs | Trail CloudWatch Logs role allowed `logs:CreateLogStream` and `logs:PutLogEvents` on the group |
| EventBridge rule never fires on an API call | A trail with logging must exist; read-only events (`Get*`, `List*`, `Describe*`) match only a rule in state `ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS`; the rule must be in the Region of the event |
| Metric filter or alarm stays at zero | Filter added after the events (filters see new events only), pattern mismatch, or log group in the Essentials class (no metric filters) |
| Any log group writes failing after encryption | Key policy must allow `logs.<region>.amazonaws.com`, scoped with `kms:EncryptionContext:aws:logs:arn` |
| VPC flow logs | Role trusting `vpc-flow-logs.amazonaws.com` with logs permissions (CloudWatch Logs destination) or bucket policy for `delivery.logs.amazonaws.com` (S3); no traffic yet; `log-status` `NODATA` or `SKIPDATA`; configuration can't be edited, only recreated |
| ELB access logs | Bucket in the same Region, SSE-S3 only, bucket policy for `logdelivery.elasticloadbalancing.amazonaws.com`, prefix without `AWSLogs` |
| Findings missing in one Region | GuardDuty, Security Hub CSPM or Config not enabled in that Region |

```bash
aws cloudtrail get-trail-status --name org-trail
aws cloudtrail get-event-selectors --trail-name org-trail
aws events put-rule --name iam-read-activity --region us-east-1 \
  --state ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS \
  --event-pattern '{"source":["aws.iam"],"detail-type":["AWS API Call via CloudTrail"]}'
```

Make the fix durable: Config rules such as `cloudtrail-enabled`, `vpc-flow-logs-enabled` and `cloudwatch-log-group-encrypted`, CloudWatch telemetry enablement rules for new resources, and an SCP that denies stopping or deleting the trail.

> **Exam trap.** After someone runs `StopLogging`, re-enabling the trail doesn't recover the gap: those events are only in the 90-day event history of each Region. Prevent it with an SCP, and detect it with an EventBridge rule on `StopLogging`.

<!-- section: key-points -->
## Key points

- Lambda logs need the execution role's logs actions; JSON log levels filter lines; custom log groups must be writable; `Delivery` class groups keep two days.
- API Gateway: `cloudWatchRoleArn` per Region; execution logs for processing details, access logs for who and from where; data tracing exposes payloads; HTTP APIs have access logs only.
- Route 53 health checks fail when health checker ranges are blocked; private resources need a private endpoint or alarm-based health check.
- CloudFront legacy logs need ACLs enabled and a customer managed key if SSE-KMS; standard logging (v2) adds CloudWatch Logs and Firehose (in `us-east-1`); real-time logs go to Kinesis Data Streams.
- CloudWatch agent: status, agent log, validation log, target names, credentials, endpoints from private subnets, IMDSv2 hop limit.
- Missing events: trail status, bucket and key policies, data event selectors, `us-east-1` for global events, EventBridge rule state for read-only events, metric filters on new data only.
