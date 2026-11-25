Containers and serverless services move scaling, patching and placement from the DevOps engineer to AWS, but only if they are configured correctly. DOP-C02 asks which platform fits a team and a workload, how to deploy container images to Amazon ECS and Amazon EKS safely, and how to configure Amazon API Gateway, AWS Lambda and AWS Fargate so that the application scales without throttling, cold-start surprises or overloaded dependencies. Several services in the exam guide's list have since been retired or closed to new customers; this chapter flags them.

<!-- section: serverless-architectures | objectives: 3.2.3 -->
## Serverless architectures

A serverless architecture has no servers to provision or patch, scales with requests, and bills for use. The building blocks:

| Layer | Serverless service |
| --- | --- |
| API front door | Amazon API Gateway (REST, HTTP, WebSocket APIs), Lambda function URLs, ALB with Lambda targets |
| Compute | AWS Lambda (functions), AWS Fargate (containers without servers) |
| Orchestration | AWS Step Functions (Standard workflows: long-running, exactly-once; Express workflows: high-volume, short) |
| Messaging and events | Amazon SQS, Amazon SNS, Amazon EventBridge (rules, Pipes, Scheduler) |
| Data | Amazon DynamoDB, Amazon S3, Aurora Serverless v2, ElastiCache Serverless |
| Packaging and deployment | AWS SAM (CloudFormation transform), AWS CDK, CodeDeploy traffic shifting on Lambda aliases |

Common patterns: API Gateway → Lambda → DynamoDB for request/response; S3 or EventBridge event → Lambda for event processing; SQS → Lambda for buffered work; Step Functions for multi-step processes with retries, parallel branches and human approval.

When Lambda is the wrong compute: steady high utilization (containers or EC2 are cheaper), processes longer than the function timeout, special hardware such as GPUs, or software that needs a full OS. Fargate keeps the serverless operating model for those containers (no GPU on Fargate).

A SAM template for an SQS-driven function that protects its database:

```yaml
Transform: AWS::Serverless-2016-10-31
Resources:
  OrdersQueue:
    Type: AWS::SQS::Queue
    Properties:
      VisibilityTimeout: 180        # at least 6 x the function timeout
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt OrdersDlq.Arn
        maxReceiveCount: 5
  OrdersDlq:
    Type: AWS::SQS::Queue
  ProcessOrder:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: python3.12
      Handler: app.handler
      CodeUri: src/
      MemorySize: 1024
      Timeout: 30
      AutoPublishAlias: live
      ReservedConcurrentExecutions: 100
      Events:
        Orders:
          Type: SQS
          Properties:
            Queue: !GetAtt OrdersQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures
            ScalingConfig:
              MaximumConcurrency: 50
```

> **Exam tip.** "Process uploaded files with the LEAST operational overhead and no servers to manage" is an S3 event (directly or through EventBridge) invoking Lambda, with a queue and a dead-letter queue if processing must survive throttling, not an EC2 fleet polling the bucket.

<!-- section: container-platforms | objectives: 3.2.4 -->
## Container platforms

| Criterion | Amazon ECS | Amazon EKS |
| --- | --- | --- |
| API | AWS-native task definitions and services | Kubernetes API, Helm, operators |
| Operations | No control plane version to manage | Kubernetes version upgrades and add-ons (reduced by EKS Auto Mode) |
| Choose when | AWS-centric team, "LEAST operational overhead" | Existing Kubernetes skills, manifests or tools, portability |
| AWS permissions for the app | Task role (the task execution role pulls images and writes logs) | EKS Pod Identity or IAM roles for service accounts (IRSA) |

Compute under the orchestrator:

| Option | Who manages the hosts | Notes |
| --- | --- | --- |
| Fargate (ECS and EKS) | AWS | One task or pod per isolated environment; `awsvpc` networking; no privileged containers, no GPU; on EKS, Fargate profiles select pods by namespace and labels |
| Fargate Spot (ECS) | AWS | Interruptible capacity at a discount for fault-tolerant tasks |
| ECS Managed Instances | AWS manages EC2 instances you describe | EC2 flexibility with less host management |
| ECS Auto Scaling group capacity provider | You (AMI, patching); ECS managed scaling grows the group | Full host control |
| EKS Auto Mode | AWS: node provisioning, scaling and consolidation built on Karpenter | Kubernetes with the least node operations |
| EKS managed node groups with Karpenter or Cluster Autoscaler | You choose AMIs and versions | Karpenter launches right-sized instances directly; Cluster Autoscaler adjusts Auto Scaling groups; Karpenter is open source with no AWS SLA |

**Amazon ECS Express Mode** deploys a production web application or API from three inputs: a container image, a task execution role and an infrastructure role. It creates a Fargate service with canary deployments, an Application Load Balancer with an HTTPS listener and an ACM certificate (shared by up to 25 Express Mode services in a VPC), target tracking auto scaling (60 % average CPU, 1 to 20 tasks by default), a log group and an alarm that detects faulty deployments. Every resource stays visible and editable in the account, at no extra charge beyond the resources.

Retired or closed services from the exam guide's list, never the answer for a new design:

| Service | Status | Use instead |
| --- | --- | --- |
| AWS App Runner | Closed to new customers | Amazon ECS Express Mode |
| AWS Copilot CLI | End of support (June 12, 2026) | ECS Express Mode, CloudFormation, CDK |
| AWS App2Container | Closed to new customers (November 7, 2025) | AWS Transform for modernization |
| AWS Proton | Shut down (October 7, 2026) | CloudFormation or CDK templates, Service Catalog |
| AWS CodeStar | Shut down (July 2024) | CodePipeline, CodeBuild, CodeDeploy |

> **Exam trap.** The task execution role and the task role are different. "The container can't pull its image from Amazon ECR" or "logs don't reach CloudWatch" is the **execution** role; "the application gets AccessDenied writing to DynamoDB" is the **task** role.

<!-- section: deploying-containers | objectives: 3.2.7 -->
## Deploying container-based applications to ECS and EKS

The pipeline is the same for both: build the image, scan it (ECR enhanced scanning with Amazon Inspector), push it with an immutable tag or by digest, then update the service or the manifests. Replicate the ECR registry to every Region that runs the application.

**Amazon ECS service deployments** (`deploymentConfiguration.strategy`):

| Strategy | Behavior | Key settings |
| --- | --- | --- |
| `ROLLING` (default) | Replaces tasks in batches | `minimumHealthyPercent` (100 % by default for replica services), `maximumPercent` (200 % by default); **deployment circuit breaker** with rollback (rolling only) |
| `BLUE_GREEN` | Starts the new revision beside the old one, shifts production traffic, keeps both during the bake time | `bakeTimeInMinutes` (required), lifecycle hooks (Lambda functions that validate or pause), CloudWatch alarms |
| `LINEAR` | Shifts traffic in equal increments with bake time between steps | `linearConfiguration` |
| `CANARY` | Shifts a small percentage first, then the rest after the bake time | `canaryConfiguration` |

The `CODE_DEPLOY` deployment controller (blue/green with an AppSpec and hooks) and `EXTERNAL` controllers also exist. With rolling updates, `maximumPercent` 200 and `minimumHealthyPercent` 100 keep full capacity during the deployment but need room for twice the tasks; `minimumHealthyPercent` 50 deploys without extra capacity at the cost of half the capacity.

```bash
aws ecs create-service --cluster prod --service-name web \
  --task-definition web:42 --desired-count 6 \
  --capacity-provider-strategy capacityProvider=FARGATE,base=2,weight=1 capacityProvider=FARGATE_SPOT,weight=3 \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-0a1b,subnet-0c2d,subnet-0e3f],securityGroups=[sg-0123456789abcdef0]}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:eu-west-1:111122223333:targetgroup/web-tg/6d0ecf831eec9f09,containerName=web,containerPort=8080 \
  --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true},maximumPercent=200,minimumHealthyPercent=100"
```

Here `base=2` guarantees two tasks on regular Fargate; the remaining tasks split 1:3 between Fargate and Fargate Spot.

**Amazon EKS deployments**: apply manifests or Helm charts from the pipeline (CodeBuild with `kubectl` and an access entry for its role), or use GitOps (Argo CD, available as a managed EKS capability, or Flux) to reconcile the cluster with a Git repository. A Kubernetes Deployment's rolling update uses `maxSurge` and `maxUnavailable`; **readiness probes** keep pods out of service until ready; **PodDisruptionBudgets** protect availability during node replacement; the **AWS Load Balancer Controller** provisions ALBs for Ingress resources and NLBs for `LoadBalancer` services. Pods get AWS permissions through EKS Pod Identity or IRSA, never through the node's instance role.

> **Exam trap.** The ECS deployment circuit breaker works only with the rolling update strategy. For "shift 10 % of traffic to the new revision, wait, then shift the rest, and roll back automatically on alarm", configure the `CANARY` strategy with CloudWatch alarms (or CodeDeploy blue/green with a canary configuration), not the circuit breaker.

<!-- section: configuring-serverless | objectives: 3.2.9 -->
## Configuring API Gateway, Lambda and Fargate

**Amazon API Gateway:**

| Setting | Facts |
| --- | --- |
| API type | REST API for API keys and usage plans, per-client throttling, caching, AWS WAF, request validation, resource policies, private and edge-optimized endpoints, canary release deployments, X-Ray tracing; HTTP API for lower cost and simpler proxies |
| Throttling | 10,000 requests per second per account and Region with a 5,000-request burst by default (adjustable); stage, method and usage plan limits below it; clients receive HTTP 429 |
| Integration timeout | 50 milliseconds to 29 seconds; can be raised for Regional and private REST APIs (possibly reducing the account throttle quota), not for edge-optimized ones |
| Payload | 10 MB |
| Caching | Per stage, TTL 300 seconds by default (maximum 3,600) |
| Deployments | Stages with stage variables; canary release on a REST API stage |

**AWS Lambda:**

| Setting | Facts |
| --- | --- |
| Memory | 128 MB to 10,240 MB; CPU is allocated in proportion to memory |
| Timeout | Up to 1,800 seconds per the current Lambda quotas page; a synchronous call through API Gateway is still bounded by the integration timeout |
| Ephemeral storage `/tmp` | 512 MB to 10,240 MB |
| Payload | 6 MB synchronous request and response, 1 MB asynchronous |
| Deployment package | 50 MB zipped upload, 250 MB unzipped with layers; container image up to 10 GB |
| Concurrency | 1,000 per Region by default; reserved concurrency guarantees and caps a function (no charge); provisioned concurrency pre-initializes environments on a version or alias (charged) |
| Scaling rate | Up to 1,000 execution environments every 10 seconds per function |
| SnapStart | Java 11+, Python 3.12+, .NET 8+; published versions only; not with provisioned concurrency, EFS or ephemeral storage above 512 MB; extra caching and restore charges except for Java |
| Versions and aliases | Immutable versions; aliases with weighted routing for canary deployments (CodeDeploy) |
| Asynchronous failures | Retries, then on-failure destinations or a dead-letter queue |
| VPC access | Subnets in several AZs; reach the internet through NAT, AWS services through VPC endpoints |

Cold starts on a latency-sensitive Java function: SnapStart (no extra charge for Java) or provisioned concurrency scheduled with Application Auto Scaling for business hours.

**AWS Fargate:**

| Setting | Facts |
| --- | --- |
| Task size | Valid CPU and memory combinations, up to 32 vCPU on Linux (platform version 1.4.0 or later) |
| Networking | `awsvpc` only: each task gets an elastic network interface, subnets and security groups; spread tasks over subnets in several AZs |
| Storage | Ephemeral task storage, Amazon EFS volumes for shared persistent files, Amazon EBS volumes |
| Capacity | `FARGATE` and `FARGATE_SPOT` capacity providers with base and weight |
| Scaling | ECS service auto scaling (Application Auto Scaling) on CPU, memory, requests per target or custom metrics |

> **Exam trap.** Reserved concurrency and SQS maximum concurrency do different jobs: reserved concurrency caps (and guarantees) the function across all triggers, maximum concurrency caps one event source mapping (2–1,000). Keep reserved concurrency at least equal to the sum of the event sources' maximum concurrency, or messages are throttled.

<!-- section: key-points -->
## Key points

- Serverless stack: API Gateway, Lambda, Fargate, Step Functions, SQS, SNS, EventBridge, DynamoDB, S3; SAM or CDK to deploy.
- ECS for least overhead, EKS for Kubernetes skills and tools; Fargate, ECS Managed Instances, EKS Auto Mode or Karpenter for compute; task role versus execution role.
- ECS Express Mode replaces App Runner for simple web services; App Runner, Copilot CLI, App2Container, Proton and CodeStar are never the answer.
- ECS strategies: `ROLLING` (circuit breaker with rollback), `BLUE_GREEN` (bake time required), `LINEAR`, `CANARY`, plus the `CODE_DEPLOY` controller; defaults 100 % minimum healthy, 200 % maximum.
- EKS: Helm or GitOps, readiness probes, PodDisruptionBudgets, AWS Load Balancer Controller, Pod Identity or IRSA.
- API Gateway: REST for keys, usage plans, caching and WAF; 10,000 requests per second and 5,000 burst by default; 29-second integration timeout (raisable for Regional and private REST APIs); 10 MB payload.
- Lambda: 128–10,240 MB memory, reserved versus provisioned concurrency, SnapStart limits, SQS visibility timeout six times the function timeout, partial batch responses.
- Fargate: `awsvpc`, no privileged containers or GPU, EFS for shared storage, Fargate Spot through capacity provider strategies.
