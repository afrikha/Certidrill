Microservice platforms at professional level raise decisions that associate-level questions skip: which orchestrator a team of a given skill set can run, how services in different VPCs and accounts find and authorize each other, how images stay patched, how each layer scales, where traffic enters and where code runs at the edge, and how a SaaS product keeps tenants apart. This chapter covers those decisions and the traps between options that all work.

<!-- section: container-orchestration | objectives: 1.1.6 -->
## Container orchestration with Amazon ECS, Amazon EKS and AWS Fargate

| Criterion | Amazon ECS | Amazon EKS |
| --- | --- | --- |
| API and tooling | AWS-native task definitions and services | Kubernetes API, Helm, operators, portable manifests |
| Operational overhead | Lowest: no control plane version to upgrade | Kubernetes version upgrades and add-ons to manage (reduced by EKS Auto Mode) |
| Choose when | New microservices, AWS-centric team, "LEAST operational overhead" | Existing Kubernetes skills or workloads, multi-cloud portability, Kubernetes ecosystem tools |
| Pod or task permissions | Task role (application calls AWS) and task execution role (pull images, write logs) | EKS Pod Identity or IAM roles for service accounts (IRSA) |

Compute options:

| Option | Who manages the instances | Use it for |
| --- | --- | --- |
| Fargate | AWS, serverless: one task or pod per isolated environment | No instance management; per-task isolation |
| Fargate Spot (ECS) | AWS, spare capacity with a 2-minute interruption warning | Fault-tolerant, interruptible tasks at a discount |
| ECS Managed Instances | AWS manages the EC2 instances; you choose their attributes | EC2 flexibility with Fargate-like operations |
| ECS Auto Scaling group capacity provider | You (AMI, patching), ECS scales the group | Full control of hosts, daemon agents |
| EKS Auto Mode | AWS: Karpenter-based node scaling, immutable Bottlerocket-based nodes with a 21-day maximum lifetime, built-in load balancing, block storage and pod networking | Kubernetes with the LEAST node operations |
| EKS managed node groups | You choose AMIs and versions; EKS automates node updates | Custom node configuration |

ECS recommends **capacity providers** over launch types: a service can move between Fargate, Managed Instances and Auto Scaling groups by changing its capacity provider strategy. EKS Auto Mode nodes allow no SSH or SSM access; customization goes through custom NodePools and NodeClasses.

> **Exam trap.** The task execution role is used by the ECS agent to pull images from Amazon ECR and send logs; the task role is what application code uses to call DynamoDB or S3. "The container gets AccessDenied writing to S3" means the task role, not the execution role.

<!-- section: service-mesh | objectives: 1.1.7 -->
## Service-to-service communication and service mesh

AWS discontinued **AWS App Mesh** on September 30, 2026: its console and resources are no longer accessible, so it is never a correct answer. The managed choices are:

| | Amazon ECS Service Connect | Amazon VPC Lattice |
| --- | --- | --- |
| Scope | ECS services in one AWS Cloud Map namespace (same Region), across clusters, and across accounts when the namespace is shared with AWS RAM | Services and resources across VPCs and accounts: EC2, ECS tasks, Kubernetes pods, Lambda, ALB, IP targets |
| Data path | Managed proxy container in each task: round-robin load balancing, outlier detection, timeouts | Fully managed service network; no sidecar |
| Discovery | Short names (`http://orders:8080`) | DNS names resolved through Route 53 Resolver to VPC Lattice |
| Security | TLS encryption with AWS Private CA (certificates rotated automatically) | Security groups on VPC associations, IAM auth policies (SigV4) per service network and per service |
| Observability | Standard metrics in ECS and CloudWatch, Envoy access logs | Per-request metrics and access logs to CloudWatch Logs, Firehose or S3 |
| Networking | Within the VPC network | Works with overlapping CIDRs and without peering or Transit Gateway; no inter-AZ data transfer charge |

VPC Lattice concepts: a **service** (listeners, rules, target groups) is associated with a **service network**; VPCs associated with the service network can reach every service they are authorized for. Resource configurations and resource gateways share TCP resources (an RDS database, an IP or domain name target) the same way. A service network VPC endpoint gives access from on premises over Direct Connect or VPN. On EKS, the AWS Gateway API Controller creates VPC Lattice resources from Kubernetes Gateway API objects.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::444455556666:role/checkout-task-role" },
    "Action": "vpc-lattice-svcs:Invoke",
    "Resource": "arn:aws:vpc-lattice:eu-west-1:111122223333:service/svc-0a1b2c3d4e5f6a7b8/*",
    "Condition": { "StringEquals": { "vpc-lattice-svcs:RequestMethod": "GET" } }
  }]
}
```

> **Exam tip.** "Microservices in many accounts and VPCs with overlapping CIDRs must call each other with IAM authorization and no network plumbing" is VPC Lattice shared through AWS RAM. "ECS services only, short names, load balancing and metrics with no extra infrastructure" is Service Connect.

<!-- section: ecr-images | objectives: 1.1.8 -->
## Managing container images with Amazon ECR

**Scanning.** ECR offers two registry-level scanning modes:

| | Basic scanning | Enhanced scanning |
| --- | --- | --- |
| Engine | AWS native technology with the CVE database | Amazon Inspector |
| Coverage | Operating system packages | Operating system and programming language packages |
| Frequency | Scan on push or manual | Scan on push and continuous rescanning as new CVEs appear |
| Notifications | Findings through the API | Inspector findings sent to EventBridge (and Security Hub) |

Switching modes makes established scans unavailable until you switch back. Archived images can't be scanned.

**Lifecycle policies** expire or archive images within 24 hours of matching a rule. Rules are evaluated together and applied by `rulePriority` (lowest first; a `tagStatus` of `any` must have the highest number). Count types are `imageCountMoreThan`, `sinceImagePushed`, `sinceImagePulled` and `sinceImageTransitioned`; actions are `expire` or `transition` to the `archive` storage class. Always run a lifecycle policy preview first.

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep the 20 most recent release images",
      "selection": { "tagStatus": "tagged", "tagPatternList": ["release-*"], "countType": "imageCountMoreThan", "countNumber": 20 },
      "action": { "type": "expire" }
    },
    {
      "rulePriority": 2,
      "description": "Archive images not pulled for 90 days",
      "selection": { "tagStatus": "any", "countType": "sinceImagePulled", "countUnit": "days", "countNumber": 90 },
      "action": { "type": "transition", "targetStorageClass": "archive" }
    }
  ]
}
```

Other controls: **tag immutability** (a released tag can't be overwritten), **replication** of the private registry to other Regions and accounts (for multi-Region deployments and DR), **pull through cache** rules that cache upstream public registries in ECR, and repository policies or organization conditions for cross-account pulls.

> **Exam trap.** Basic scanning on push checks an image once. "Be alerted when a new vulnerability affects images already in production, including Java and Python libraries" requires enhanced scanning (continuous, language packages) with an EventBridge rule on Inspector findings.

<!-- section: auto-scaling | objectives: 1.1.9 -->
## Scaling serverless and containerized workloads

**Lambda.** Concurrency is in-flight requests. Each function scales by up to 1,000 execution environments every 10 seconds, within the account's concurrency quota (1,000 by default per Region, adjustable).

| Control | Effect | Cost |
| --- | --- | --- |
| Reserved concurrency | Guarantees and caps concurrency for one function (protects a database from too many connections) | No charge |
| Provisioned concurrency | Pre-initialized environments, no cold starts, on a version or alias only | Charged while configured |
| Application Auto Scaling on provisioned concurrency | Scheduled scaling for known peaks, target tracking on `LambdaProvisionedConcurrencyUtilization` | Pays only for the capacity scheduled |

```bash
aws application-autoscaling register-scalable-target --service-namespace lambda \
  --resource-id function:checkout:live --scalable-dimension lambda:function:ProvisionedConcurrency \
  --min-capacity 10 --max-capacity 200
aws application-autoscaling put-scaling-policy --service-namespace lambda \
  --resource-id function:checkout:live --scalable-dimension lambda:function:ProvisionedConcurrency \
  --policy-name pc-target-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{"TargetValue": 0.7, "PredefinedMetricSpecification": {"PredefinedMetricType": "LambdaProvisionedConcurrencyUtilization"}}'
```

**ECS service auto scaling** (Application Auto Scaling) changes the desired task count: target tracking (average CPU, memory, ALB requests per target), step scaling, scheduled actions, **predictive scaling** from daily or weekly patterns, and scaling on SQS backlog per task. Scale-in is paused during deployments. Capacity providers with managed scaling then add or remove instances to fit the tasks.

**EKS** scales in two layers:

| Layer | Mechanism |
| --- | --- |
| Pods | Horizontal Pod Autoscaler (replicas from CPU, memory or custom metrics); KEDA for event sources such as queue depth |
| Nodes | Cluster Autoscaler (adjusts the desired capacity of Auto Scaling groups when pods are unschedulable; one active replica) or Karpenter (launches right-sized instances directly and consolidates); EKS Auto Mode runs Karpenter-based scaling for you |

> **Exam trap.** The Horizontal Pod Autoscaler adds pods, not nodes. When new pods stay Pending, the missing piece is node scaling (Karpenter, Cluster Autoscaler or EKS Auto Mode), not a higher HPA maximum.

<!-- section: ingress | objectives: 1.1.10 -->
## Ingress patterns and load balancing for microservices

| Requirement | Ingress |
| --- | --- |
| HTTP routing by host or path to many services, OIDC authentication, AWS WAF | Application Load Balancer |
| TCP, UDP or TLS passthrough, static IP per AZ, client IP preservation, PrivateLink service | Network Load Balancer |
| API keys and usage plans, request validation, per-client throttling, Lambda and HTTP back ends | Amazon API Gateway (REST API; HTTP API for a cheaper, simpler proxy) |
| Public API in front of private containers | API Gateway private integration through a VPC link V2 to an internal ALB or NLB (REST and HTTP APIs) |

On EKS, the **AWS Load Balancer Controller** watches Kubernetes objects: an `Ingress` creates an ALB, a Service of type `LoadBalancer` creates an NLB, and from version 2.14 a Kubernetes `Gateway` also creates an ALB. Target type `ip` registers pod IPs directly (required for Fargate pods, and fewer hops); target type `instance` goes through node ports. An **IngressGroup** merges many Ingress objects into one ALB, so dozens of services share one load balancer and its cost. Without the controller, the legacy cloud provider creates Classic Load Balancers.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: orders
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/group.name: shop-public
spec:
  ingressClassName: alb
  rules:
    - http:
        paths:
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders
                port:
                  number: 8080
```

> **Exam tip.** "Reduce the cost of 30 internet-facing ALBs created by 30 Kubernetes Ingress objects" means an IngressGroup that shares one ALB with host or path rules.

<!-- section: edge | objectives: 1.1.11 -->
## Edge computing with CloudFront Functions and Lambda@Edge

| | CloudFront Functions | Lambda@Edge |
| --- | --- | --- |
| Language | JavaScript | Node.js and Python |
| Events | Viewer request, viewer response | Viewer request and response, origin request and response |
| Scale and duration | Millions of requests per second, submillisecond | Up to 10,000 requests per second per Region, up to 30 seconds |
| Memory and size | 2 MB memory, 10 KB code | 128 MB (viewer events) or up to 10,240 MB (origin events); 50 MB package |
| Network, file system, request body | No | Yes |
| Data store | CloudFront KeyValueStore | Calls to other services (for example DynamoDB) |
| Typical uses | Cache key normalization, header changes, redirects and rewrites, JWT validation | Calls to external services, third-party libraries, body inspection, origin selection with lookups |

Lambda@Edge restrictions: the function lives in US East (N. Virginia), is referenced by a numbered version (not `$LATEST` or an alias), and supports no VPC access, environment variables, layers, container images, arm64 or provisioned concurrency. For one cache behavior, each event type has one function, and CloudFront Functions and Lambda@Edge can't be combined on viewer events; a CloudFront Function on viewer request with Lambda@Edge on origin request is allowed.

> **Exam trap.** The cheapest, lowest-latency answer for header rewrites, redirects or token checks at millions of requests per second is CloudFront Functions. Choose Lambda@Edge only when the stem needs network calls, the request body, more memory or origin events.

<!-- section: multi-tenancy | objectives: 1.1.13 -->
## Multi-tenant architectures and tenant isolation

The AWS SaaS Lens defines three deployment models:

| Model | Resources | Strengths | Costs |
| --- | --- | --- | --- |
| Silo | Dedicated per tenant (account, VPC, database or stack) | Strongest isolation, per-tenant cost, no noisy neighbor, fits regulated tenants | Higher cost and per-tenant operations |
| Pool | Shared by all tenants | Economies of scale, one deployment | Isolation enforced in code and policies, noisy neighbor risk |
| Bridge | Mix: some services siloed, others pooled, or premium tiers siloed | Isolation where it matters | Two operating models |

**Tenant context** must come from a trusted identity, never from a request parameter. With Amazon Cognito: a user pool per tenant (strongest separation, per-tenant MFA and branding), an app client per tenant, groups, or a custom attribute such as `custom:tenantID` in a shared pool, read-only to app clients. The token carries the tenant; API Gateway authorizers and services read it from the token.

**Enforcing isolation in a pool**:

- **IAM with session tags.** A token vending service assumes a role with a `TenantId` session tag; policies scope access by tag, for example DynamoDB items whose partition key is the tenant ID, or S3 prefixes per tenant.
- **Row-level security.** In Aurora PostgreSQL, an RLS policy filters rows by a session variable set from the token, so a forgotten `WHERE` clause can't leak data.
- **Tenant-specific encryption.** A KMS key per tenant (deleting or disabling the key renders that tenant's data unreadable), or a shared key with the tenant ID in the encryption context, which CloudTrail records and key policies can require.
- **Compute isolation.** Lambda tenant isolation mode, set only at function creation, serves each `tenant-id` from its own execution environments; it isn't supported with provisioned concurrency, SnapStart or function URLs.
- **Noisy neighbors.** API Gateway usage plans per tenant tier, SQS queues per tier, reserved concurrency for premium tiers.

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
  "Resource": "arn:aws:dynamodb:eu-west-1:111122223333:table/orders",
  "Condition": {
    "ForAllValues:StringEquals": { "dynamodb:LeadingKeys": ["${aws:PrincipalTag/TenantId}"] }
  }
}
```

> **Exam trap.** A custom tenant attribute in a shared user pool is surface-level tenancy: it can't give tenants different MFA or sign-in settings. "Each enterprise tenant requires its own identity provider configuration and password policy" means a user pool per tenant.

<!-- section: key-points -->
## Key points

- ECS for the least operational overhead, EKS for Kubernetes skills and portability; Fargate removes hosts, ECS Managed Instances and EKS Auto Mode delegate instance operations to AWS.
- App Mesh is discontinued (September 30, 2026): use ECS Service Connect inside ECS namespaces, VPC Lattice across VPCs and accounts with IAM auth policies.
- ECR enhanced scanning (Inspector) is continuous and covers language packages; lifecycle policies expire or archive by count, age, last pull or archive age.
- Lambda reserved concurrency caps and reserves, provisioned concurrency removes cold starts; ECS scales tasks with Application Auto Scaling; EKS needs pod scaling (HPA, KEDA) and node scaling (Karpenter, Cluster Autoscaler, Auto Mode).
- AWS Load Balancer Controller: Ingress or Gateway to ALB, Service to NLB, `ip` targets, IngressGroup to share one ALB; API Gateway reaches private services through a VPC link V2.
- CloudFront Functions for lightweight viewer logic at massive scale; Lambda@Edge for network calls, bodies and origin events, deployed from us-east-1 as a numbered version.
- Silo, pool or bridge; tenant context from Cognito tokens; isolation through session tags and LeadingKeys, row-level security, per-tenant KMS keys or encryption context, Lambda tenant isolation mode.
