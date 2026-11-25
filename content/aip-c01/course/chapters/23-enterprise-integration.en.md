Enterprise integration questions start from an existing estate: a mainframe or ERP behind a firewall, SaaS systems, a ticketing tool that sends webhooks, a workforce identity provider, data that must not leave a country or a factory, and a platform team that wants every team to consume models the same way. The answer combines AWS integration services (Amazon API Gateway, AWS Lambda, Amazon EventBridge, Amazon SQS, AWS Step Functions) with Amazon Bedrock security controls, so that GenAI features plug into the estate without tight coupling, without broad permissions, and without uncontrolled model access.

<!-- section: enterprise-connectivity | objectives: 2.3.1 -->
## Connecting FMs to existing enterprise systems

Three integration styles cover most scenarios:

| Style | AWS building blocks | Use when |
| --- | --- | --- |
| API-based integration with legacy systems | API Gateway REST API with a private integration (VPC link) to an internal load balancer; a Lambda adapter that translates SOAP, XML or fixed-width formats to JSON for the model and back | The legacy system must be called synchronously (look up an order, then generate an answer) |
| Event-driven, loosely coupled | EventBridge event bus and rules, SQS queues as buffers, Amazon SNS fan-out, Step Functions for multi-step processing | The source system must not wait for the model, or model calls must be throttled independently of producers |
| Data synchronization | Amazon S3 event notifications, DynamoDB Streams, Amazon AppFlow (SaaS to S3), AWS DataSync and AWS Transfer Family (file shares and SFTP), then a knowledge base sync | The model needs current enterprise data for retrieval |

**Loose coupling** means the producer publishes a business event ("claim submitted") and knows nothing about the GenAI consumer. A queue between the event and the model call absorbs bursts, retries failed calls and protects the Bedrock quota; the consumer writes results to a store and emits its own event ("claim summarized"), which other systems subscribe to.

**Keeping retrieval data synchronized** with Amazon Bedrock Knowledge Bases:

| Mechanism | Behavior |
| --- | --- |
| `StartIngestionJob` (sync) | Scans the connected data source and indexes only documents not yet indexed or changed; schedule it with Amazon EventBridge Scheduler or trigger it from an S3 event batch |
| `IngestKnowledgeBaseDocuments` (direct ingestion) | Indexes submitted documents into the vector store in one step, without a sync |
| Custom data source | Documents added, changed or deleted through the `KnowledgeBaseDocuments` operations need no sync at all |

> **Exam trap.** For an S3 data source, direct ingestion changes are not written back to the bucket: the next `StartIngestionJob` can overwrite them unless the same change is made in S3. Don't run `IngestKnowledgeBaseDocuments` and `StartIngestionJob` at the same time.

<!-- section: genai-in-existing-apps | objectives: 2.3.2 -->
## Adding GenAI capabilities to existing applications

Add GenAI as a new microservice next to the application rather than inside it:

| Requirement | Pattern |
| --- | --- |
| Existing microservices call a new summarization or drafting capability | API Gateway resource in front of a Lambda function (or a container on Amazon ECS) that calls Bedrock; versioned paths such as `/v1/summaries`; the same authorizers as the other services |
| A SaaS tool (ticketing, CRM, code host) sends webhooks | Lambda function behind API Gateway or a Lambda function URL: verify the signature, return 2xx immediately, put the payload on SQS or EventBridge, process asynchronously |
| Business events must trigger GenAI processing | EventBridge rule on the event pattern, target SQS or Step Functions, a worker that calls Bedrock |
| Results must reach other systems | Publish an event on the bus; EventBridge API destinations call external HTTPS endpoints with credentials from a connection |

```json
{
  "source": ["com.example.support"],
  "detail-type": ["TicketCreated"],
  "detail": {
    "priority": ["high", "urgent"],
    "language": ["en"]
  }
}
```

A rule with this pattern sends only high-priority English tickets to the triage queue; other tickets never reach the model.

**Why a queue before the model.** Webhook senders and EventBridge expect fast acknowledgements; model calls can take tens of seconds and be throttled. EventBridge API destinations, for example, time out after 5 seconds and retry `429` and `5xx` responses, so they are fine for notifying a system of a finished result but not for waiting on a model.

> **Exam tip.** "Without modifying the existing application" usually means: subscribe to events it already emits (EventBridge, S3 events, DynamoDB Streams) or put an API Gateway endpoint in front of a new service, instead of adding model calls to the legacy code.

<!-- section: secure-access | objectives: 2.3.3 -->
## Secure access frameworks

**Identity federation** connects enterprise identities to model and data access without IAM users:

| Users | Federation | Result |
| --- | --- | --- |
| Employees using AWS tools and consoles | AWS IAM Identity Center connected to the corporate IdP (SAML 2.0 or OIDC), permission sets per job function | Temporary role credentials per group |
| End users of a web or mobile app | Amazon Cognito user pool (or an external OIDC or SAML IdP) plus an identity pool that exchanges tokens for temporary AWS credentials | Role chosen from the token (`cognito:preferred_role` from user pool groups) or by rules on claims (`Equals`, `NotEqual`, `StartsWith`, `Contains`; up to 25 rules per provider) |
| Agents calling third-party APIs for a user | Amazon Bedrock AgentCore Identity with OAuth credential providers | No secrets in agent code |

**Role-based access control for models.** IAM policies grant `bedrock:InvokeModel` (also used by `Converse`) and `bedrock:InvokeModelWithResponseStream` on specific resources: foundation models, inference profiles, application inference profiles, provisioned models, custom model deployments, prompt routers. Bedrock condition keys narrow access further: `bedrock:GuardrailIdentifier` (a call must use the approved guardrail), `bedrock:InferenceProfileArn`, `bedrock:PromptRouterArn`, `bedrock:ServiceTier`. Tags on application inference profiles enable attribute-based control with `aws:ResourceTag`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SupportTeamProfilesOnly",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:eu-west-1:111122223333:application-inference-profile/*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/team": "support",
          "bedrock:GuardrailIdentifier": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/a1b2c3d4e5f6:3"
        }
      }
    },
    {
      "Sid": "UnderlyingModelsOnlyThroughProfiles",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:eu-*::foundation-model/*",
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:eu-west-1:111122223333:application-inference-profile/*"
        }
      }
    }
  ]
}
```

An inference profile needs two grants: the profile itself, and the foundation model in every Region the profile routes to. The `bedrock:InferenceProfileArn` condition makes the second grant usable only through the profile, so nobody can call the model directly.

**Role-based access to data.** Retrieval must respect the user's entitlements. Attach metadata (department, tenant, classification) to documents and apply a knowledge base metadata filter (`equals`, `in`, `andAll`...) built server-side from the authenticated identity, never from a value the client sends. Separate knowledge bases or vector indexes per tenant fit strict isolation requirements.

**Least privilege API access to FMs.** One execution role per function or agent, limited to the model ARNs it uses; deny both `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` to block a model (denying only one leaves the other path open); restrict callers to a VPC endpoint with `aws:SourceVpce`; prefer roles and SigV4 over long-term Bedrock API keys.

> **Exam trap.** A role mapping rule on a claim that users can edit themselves (for example a writable custom attribute) lets any user assume the privileged role. Map roles only from claims the user can't set, such as user pool groups.

<!-- section: cross-environment | objectives: 2.3.4 -->
## Cross-environment and data residency solutions

| Requirement | Solution |
| --- | --- |
| Prompts must be processed only in one geography (EU, US, APAC) | In-Region model ID or a geographic cross-Region inference profile; never a global profile. An SCP that restricts Regions must allow every destination Region of the profile |
| Cost matters more than geography | Global cross-Region inference profile (any commercial Region, about 10 % cheaper); to forbid global routing, deny `bedrock:InvokeModel*` when `aws:RequestedRegion` equals `unspecified` |
| Data must stay on premises; only derived, non-sensitive results may reach the cloud | AWS Outposts: EC2 (including GPU instances), EBS, S3 on Outposts, ECS, EKS nodes run locally; host an open-weight model in a container on the Outpost, or redact and pre-process locally before calling Bedrock in the parent Region |
| Lowest latency to mobile devices and end users on a carrier 5G network | AWS Wavelength Zones in carrier networks: EC2, EBS, ECS and EKS at the edge, a carrier gateway for mobile traffic, the rest of the application in the parent Region |
| Private path from VPC workloads to Bedrock | Interface VPC endpoints (AWS PrivateLink) for `bedrock-runtime` and `bedrock-agent-runtime`, private DNS, endpoint policies limiting models and actions |

Amazon Bedrock itself doesn't run on Outposts or in Wavelength Zones: models that must execute locally are self-hosted on the local compute, while managed models stay in the Region. An Outpost is an extension of an Availability Zone, managed over its **service link**: it is not designed for disconnected operation (running instances continue, but control plane actions such as launching instances stop until the link returns). The **local gateway** connects the Outpost to the on-premises network, so local systems reach the locally hosted model without leaving the site.

CloudTrail records cross-Region inference calls in the source Region, with the processing Region in `additionalEventData.inferenceRegion`: that field is the audit evidence for residency.

> **Exam trap.** "Process patient data on premises with the lowest latency to hospital systems" is Outposts (on-premises compute connected to the Region), not Wavelength (mobile carrier edge). And no Outposts option can "run Amazon Bedrock locally".

<!-- section: genai-cicd | objectives: 2.3.5 -->
## CI/CD pipelines for GenAI components

GenAI components (prompt templates, model IDs and parameters, guardrail versions, agent code, knowledge base configuration, infrastructure) move through a pipeline like application code, with extra quality gates:

| Stage | AWS service | GenAI-specific content |
| --- | --- | --- |
| Source | AWS CodePipeline source action (Git repository through a connection) | Prompts and configuration versioned with the code |
| Build and static checks | AWS CodeBuild | Unit tests with mocked model responses, template linting, IaC synthesis, dependency and secret scans |
| Evaluation gate | CodeBuild running an evaluation job, or Bedrock evaluations | Golden dataset scored by metrics or LLM-as-a-judge; fail the build below a threshold; adversarial prompts must be blocked by the guardrail |
| Deploy | AWS CloudFormation or AWS CDK; new prompt version, flow alias or Lambda alias | Immutable versions referenced by aliases |
| Progressive rollout and rollback | Lambda weighted aliases with AWS CodeDeploy canary or linear deployments and CloudWatch alarms; flow or prompt alias moved back to the previous version | Roll back on error rate, latency or online quality metrics |

```yaml
version: 0.2
phases:
  install:
    commands:
      - pip install -r requirements.txt
  build:
    commands:
      - pytest tests/unit
      - python eval/run_eval.py --dataset eval/golden.jsonl --threshold 0.85
      - python eval/red_team.py --guardrail-id "$GUARDRAIL_ID" --must-block eval/attacks.jsonl
reports:
  eval-report:
    files:
      - eval/report.xml
    file-format: JUNITXML
```

A prompt change is a code change: it goes through the same pipeline and evaluation gate, and rollback means pointing the alias back to the previous immutable version rather than editing the prompt in production.

<!-- section: genai-gateway | objectives: 2.3.5 -->
## GenAI gateway architectures

A **GenAI gateway** is a centralized abstraction layer between all internal applications and all models. Teams call one API; the platform team controls models, safety, quotas, costs and logging in one place.

| Capability | Implementation |
| --- | --- |
| Single API, provider switching | API Gateway plus Lambda, or a container gateway on ECS (AWS Fargate) or EKS behind an Application Load Balancer; model mappings in AWS AppConfig; AWS publishes a multi-provider gateway guidance based on LiteLLM with an OpenAI-compatible API |
| Authentication | IAM authorization, Cognito or JWT authorizers; API keys only to identify clients for usage plans, never as authentication |
| Per-team throttling and quotas | API Gateway usage plans (rate, burst, quota per API key) and stage or method throttling |
| Mandatory safety | Gateway applies the approved guardrail; IAM condition `bedrock:GuardrailIdentifier` prevents direct calls without it |
| Cost attribution | One application inference profile per team or application, tagged for cost allocation; `requestMetadata` on each call to filter invocation logs |
| Observability | Model invocation logging, CloudWatch metrics (`Invocations`, `InvocationLatency`, `InvocationThrottles`, `InputTokenCount`, `OutputTokenCount`), traces, AWS WAF in front of the entry point |

> **Exam trap.** API keys and usage plans throttle and meter clients; they don't authenticate them. A gateway requirement that says "only authorized employees" needs IAM, Cognito or a Lambda or JWT authorizer in addition to usage plans.

<!-- section: key-points -->
## Key points

- Legacy systems: API Gateway private integrations and Lambda adapters; loose coupling with EventBridge, SQS and SNS; data synchronization with S3 events, DynamoDB Streams, AppFlow, DataSync and knowledge base sync or direct ingestion.
- Webhooks: verify, acknowledge, enqueue, process asynchronously. EventBridge API destinations time out after 5 seconds.
- Federation: IAM Identity Center for employees, Cognito user and identity pools for app users, AgentCore Identity for agents calling third-party APIs.
- Least privilege: model-specific ARNs, deny both invoke actions to block a model, `bedrock:GuardrailIdentifier`, VPC endpoint conditions, metadata filters built from the authenticated identity.
- Residency: geographic inference profiles, Region-restricting SCPs, `inferenceRegion` in CloudTrail. Outposts for on-premises compute (service link required, no local Bedrock), Wavelength for 5G edge latency.
- CI/CD: CodePipeline and CodeBuild with evaluation and red-team gates, immutable prompt and flow versions behind aliases, alarm-driven rollback.
- GenAI gateway: one API, AppConfig model mappings, usage plans, enforced guardrails, application inference profiles for cost, centralized logging.
