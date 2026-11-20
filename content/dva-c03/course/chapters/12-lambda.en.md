AWS Lambda runs your code in response to events without servers to manage, but almost every exam question about it hinges on a setting: the network the function joins, its memory, timeout or concurrency, a layer or an extension, where failed events go, or how an event source is connected. This chapter covers VPC access, function configuration, error handling with destinations and dead-letter queues, and integrations through code, event source mappings and destinations.

<!-- section: vpc-access | objectives: 1.2.1 -->
## Giving Lambda access to private resources in a VPC

By default a function runs in a Lambda-managed network with internet access but no route to your VPC. To reach a private RDS database, an ElastiCache cluster or an internal API, add a **VPC configuration**: subnets (choose private subnets in at least two Availability Zones) and security groups.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --vpc-config SubnetIds=subnet-0a1b2c3d,subnet-4e5f6a7b,SecurityGroupIds=sg-0123abcd
```

- The execution role needs permissions to manage network interfaces: attach the AWS managed policy `AWSLambdaVPCAccessExecutionRole` (it allows `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DescribeSubnets`, `ec2:DeleteNetworkInterface`, `ec2:AssignPrivateIpAddresses`, `ec2:UnassignPrivateIpAddresses`).
- Lambda creates a **Hyperplane ENI** per unique combination of subnet and security group, shared by functions with the same combination. A new function stays in the `Pending` state, unable to be invoked, while the ENI is created (several minutes).
- The database's security group must allow inbound traffic from the function's security group on the database port.
- Many concurrent invocations opening database connections can exhaust the database: put **RDS Proxy** between them and open the connection outside the handler.

Once attached to a VPC, the function reaches only what the VPC can reach:

| Destination | What the VPC needs |
| --- | --- |
| Resources in the VPC (RDS, ElastiCache, internal load balancers) | Security group rules only |
| The internet (a third-party API) | Private subnets with a route `0.0.0.0/0` to a NAT gateway in a public subnet, whose route table points to an internet gateway |
| AWS services without internet (S3, DynamoDB, Secrets Manager, SQS...) | VPC endpoints: gateway endpoints for S3 and DynamoDB, interface endpoints for the others |
| IPv6 internet | Dual-stack subnets, "Allow IPv6 traffic for dual-stack subnets", a `::/0` route to an egress-only internet gateway |

> **Exam trap.** Attaching the function to a public subnet doesn't give it internet access: its network interfaces get no public IP address. "The function times out when it calls an external API after being moved into the VPC" is fixed with private subnets routed to a NAT gateway, or with VPC endpoints when the target is an AWS service.

<!-- section: function-settings | objectives: 1.2.2 -->
## Memory, timeout, runtime, handler and environment variables

| Setting | Default | Range and facts |
| --- | --- | --- |
| Memory | 128 MB | 128 MB to 10,240 MB in 1 MB steps; CPU grows with memory (one vCPU at 1,769 MB) |
| Timeout | 3 seconds | Up to 30 minutes on the current Lambda quotas page (older pages and the FAQ still say 15 minutes; 90 minutes for some Lambda Managed Instances invocations) |
| Ephemeral storage (`/tmp`) | 512 MB | 512 MB to 10,240 MB, reused while the execution environment stays warm |
| Environment variables | None | 4 KB in total, encrypted at rest; reserved names (`AWS_REGION`, `AWS_LAMBDA_FUNCTION_NAME`, `_HANDLER`...) can't be set |
| Deployment package | | 50 MB zipped for a direct upload (larger through S3), 250 MB unzipped including layers, 10 GB for a container image |
| Payload | | 6 MB request and response for synchronous invocation, 1 MB for asynchronous |

The **runtime** is the language environment (current versions include `python3.14`, `nodejs24.x`, `java25` and .NET 10); the **handler** names the entry point, `file.function` in Python (`app.lambda_handler`) and `file.export` in Node.js (`index.handler`). Code outside the handler runs once per execution environment: create SDK clients and connections there so warm invocations reuse them.

```bash
aws lambda update-function-configuration --function-name orders-api \
  --memory-size 1024 --timeout 30 \
  --environment "Variables={TABLE_NAME=Orders,LOG_LEVEL=INFO}" \
  --kms-key-arn arn:aws:kms:eu-west-3:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab
```

`--environment` replaces the whole set of variables: include the existing ones. Publishing a version locks its variables and settings. A customer managed key (`--kms-key-arn`) controls who can decrypt the variables; for database passwords and API keys, AWS recommends Secrets Manager rather than environment variables.

**Layers** package libraries, custom runtimes or configuration shared by several functions: up to five per function, extracted into `/opt` (Python libraries under `python/`, Node.js modules under `nodejs/node_modules/`), each version immutable with its own ARN, and only for .zip functions; a container image includes its dependencies instead. **Extensions** run alongside the function, from a layer (`/opt/extensions/`) as a separate process (external) or inside the runtime process (internal), with `Init`, `Invoke` and `Shutdown` phases; they share the function's memory and their run time is billed. The **AWS Parameters and Secrets Lambda Extension** caches Parameter Store and Secrets Manager values on `localhost:2773` (TTL up to 300 seconds, default 300); requests carry the header `X-Aws-Parameters-Secrets-Token` with the session token, and the role needs `ssm:GetParameter` or `secretsmanager:GetSecretValue` plus `kms:Decrypt` for encrypted values.

> **Exam tip.** "Raise the CPU available to a compute-bound function" means more memory: there is no separate CPU setting. If duration falls by more than the price rises, the bigger setting is also cheaper.

<!-- section: concurrency | objectives: 1.2.2 -->
## Concurrency settings

Concurrency is the number of requests a function serves at the same moment: average requests per second × average duration in seconds (100 requests per second of 500 ms need 50 execution environments). The account has 1,000 concurrent executions per Region by default (adjustable), and each function scales by up to 1,000 execution environments every 10 seconds. Beyond the available concurrency, invocations are throttled (HTTP 429, `TooManyRequestsException`).

| Setting | Effect | Cost | Use it when |
| --- | --- | --- | --- |
| Reserved concurrency | Guarantees the function that many environments and caps it at that number | No charge | Protect a downstream database or API, or make sure a critical function can always scale; 0 stops all invocations |
| Provisioned concurrency | Keeps that many environments initialized, on a version or alias | Charged while configured | Latency-sensitive functions where cold starts are unacceptable; schedule or scale it with Application Auto Scaling |
| SnapStart | Restores an initialized snapshot instead of running the init code | No extra cost for Java; cache and restore charges for Python and .NET | Long initialization in Java 11+, Python 3.12+ or .NET 8+, on published versions; not with provisioned concurrency |

Lambda always keeps 100 units unreserved for the functions without reserved concurrency.

```bash
aws lambda put-function-concurrency --function-name orders-api --reserved-concurrent-executions 50
aws lambda put-provisioned-concurrency-config --function-name orders-api \
  --qualifier live --provisioned-concurrent-executions 20
```

> **Exam trap.** Reserved concurrency doesn't pre-warm anything, and provisioned concurrency doesn't cap anything. "Too many connections on the database when traffic spikes" is reserved concurrency (or RDS Proxy); "the first requests after idle periods are slow" is provisioned concurrency or SnapStart.

<!-- section: errors-destinations | objectives: 1.2.3 -->
## Event lifecycle, errors, destinations and dead-letter queues

Who retries a failed event depends on how the function was invoked:

| Invocation | Retries on error | Where failures can go |
| --- | --- | --- |
| Synchronous (API Gateway, SDK `RequestResponse`) | None by Lambda: the caller gets the error and decides | Nowhere: handle it in the caller |
| Asynchronous (S3, SNS, EventBridge, `Event`) | Two retries by default (0 to 2), one minute then two minutes apart; throttles and system errors are retried for up to the maximum event age (6 hours by default and maximum) | On-failure destination or dead-letter queue |
| Event source mapping, SQS | The message becomes visible again after the visibility timeout and is received again | The source queue's dead-letter queue after `maxReceiveCount` receives |
| Event source mapping, Kinesis or DynamoDB Streams | Retried until success or record expiry by default, blocking the shard | On-failure destination (SQS or SNS) with `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds` |

**Destinations** (asynchronous invocations) send an invocation record, with the request, the response and the error details, on success or on failure, to SQS, SNS, Lambda, EventBridge or, on failure only, an S3 bucket. A **dead-letter queue** receives only the failed event (with `RequestID`, `ErrorCode` and `ErrorMessage` attributes) in a standard SQS queue or SNS topic, and is configured at function level only. Neither supports FIFO queues or topics.

```bash
aws lambda put-function-event-invoke-config --function-name resize-image \
  --maximum-retry-attempts 1 --maximum-event-age-in-seconds 3600 \
  --destination-config '{"OnSuccess":{"Destination":"arn:aws:events:eu-west-3:111122223333:event-bus/default"},"OnFailure":{"Destination":"arn:aws:sqs:eu-west-3:111122223333:resize-failures"}}'
```

For batches from SQS, Kinesis or DynamoDB Streams, enable `ReportBatchItemFailures` and return the IDs of the failed records so that only those are retried (SQS message IDs, or stream sequence numbers):

```json
{ "batchItemFailures": [ { "itemIdentifier": "059f36b4-87a3-44ab-83d2-661975830a7d" } ] }
```

An empty list means the whole batch succeeded; a thrown exception means the whole batch failed. For streams, `BisectBatchOnFunctionError` splits a failing batch in two to isolate the bad record.

> **Exam trap.** A dead-letter queue configured on a Lambda function catches only asynchronous invocations. For a function that reads an SQS queue, configure the redrive policy (DLQ and `maxReceiveCount`) on the source queue.

<!-- section: integrations | objectives: 1.2.4 -->
## Integrating Lambda with other services

Services reach a function in two ways, and permissions follow:

| Model | Services | Permission |
| --- | --- | --- |
| The service invokes the function (push) | API Gateway, S3, SNS, EventBridge, Application Load Balancer | Resource-based policy on the function: `lambda:InvokeFunction` for the service principal, limited with `--source-arn` and `--source-account` |
| Lambda polls the source (event source mapping) | SQS, Kinesis Data Streams, DynamoDB Streams, Amazon MSK, self-managed Kafka, Amazon MQ | Execution role: for example `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` |
| Your code calls a service | Any AWS API through the SDK | Execution role |

```bash
aws lambda add-permission --function-name make-thumbnail \
  --statement-id s3-uploads --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::anycompany-uploads --source-account 111122223333
```

Event source mapping settings:

| Setting | SQS | Kinesis / DynamoDB Streams |
| --- | --- | --- |
| Batch size | Default 10; up to 10,000 (standard) or 10 (FIFO) | Default 100; up to 10,000 (Kinesis) or 1,000 (DynamoDB Streams) |
| Batching window | Up to 5 minutes (not for FIFO) | Up to 5 minutes |
| Scaling | `ScalingConfig` `MaximumConcurrency` caps concurrent invocations; provisioned mode sets minimum and maximum pollers | `ParallelizationFactor` 1 to 10 concurrent batches per shard, order kept per key |
| Start | | `StartingPosition`: `TRIM_HORIZON`, `LATEST` or `AT_TIMESTAMP` |
| Filtering | Up to 5 filters (10 on request); non-matching SQS messages are deleted | Same filter syntax on the record |

Set the SQS visibility timeout to at least six times the function timeout so that a message isn't delivered again while a batch is still running. A DynamoDB stream's view type decides what the function sees: `NEW_AND_OLD_IMAGES` to compare before and after.

An AWS SAM template wires the integrations and the permissions together:

```yaml
Resources:
  # OrdersTable, OrderQueue and StreamFailures are defined in the same template
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.14
      Handler: app.lambda_handler
      MemorySize: 512
      Timeout: 20
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
      Events:
        CreateOrder:
          Type: Api
          Properties:
            Path: /orders
            Method: post
        OrderQueue:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures
        OrderChanges:
          Type: DynamoDB
          Properties:
            Stream: !GetAtt OrdersTable.StreamArn
            StartingPosition: TRIM_HORIZON
            BisectBatchOnFunctionError: true
            MaximumRetryAttempts: 3
            DestinationConfig:
              OnFailure:
                Destination: !GetAtt StreamFailures.Arn
```

> **Exam tip.** "Invoke the function only for some messages, with the LEAST development effort" is event filtering on the event source mapping, not an `if` in the handler: filtered-out events don't invoke the function at all.

<!-- section: key-points -->
## Key points

- VPC access: private subnets, security groups, `AWSLambdaVPCAccessExecutionRole`; internet through a NAT gateway, AWS services through VPC endpoints; RDS Proxy for connections.
- Memory sets CPU; timeout defaults to 3 seconds; environment variables are 4 KB, replaced as a whole, locked in versions; secrets go to Secrets Manager.
- Layers: five per function, in `/opt`, .zip only; extensions run beside the function; the Parameters and Secrets extension caches values.
- Reserved concurrency caps and guarantees; provisioned concurrency and SnapStart remove cold starts.
- Asynchronous: two retries, six hours, destinations (full record, success or failure) or DLQ (failed event only).
- SQS sources: DLQ on the queue, visibility timeout six times the function timeout, partial batch responses.
- Push services need a resource-based policy; event source mappings use the execution role.
