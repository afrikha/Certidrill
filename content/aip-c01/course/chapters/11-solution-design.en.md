Before any prompt is written, a GenAI developer turns business needs into an architecture: which model family and hosting option, how the application reaches the model, where the knowledge comes from, how answers reach users, and what the solution costs at scale. The exam tests this with scenarios that describe requirements and ask for the design, the proof-of-concept plan or the standard that keeps many teams consistent. This chapter covers the decisions of an architectural design, the integration and deployment patterns, how to validate feasibility with Amazon Bedrock before a full build, and how the AWS Well-Architected Framework and its Generative AI Lens standardize components.

<!-- section: requirements-to-design | objectives: 1.1.1 -->
## From requirements to an architectural design

A design starts with the requirements that change the architecture, not with a model name. Extract them from the stem and map each one to a decision:

| Requirement in the scenario | Design decision |
| --- | --- |
| Answers must use company documents that change often | RAG with Amazon Bedrock Knowledge Bases, not fine-tuning |
| A consistent style, format or narrow task that prompting can't reach | Model customization (fine-tuning or distillation), after prompt engineering and RAG were tried |
| The model must act: look up orders, open tickets, call APIs | An agent with tools (Amazon Bedrock AgentCore, Strands Agents) or a deterministic Step Functions workflow when the steps are known |
| Text, images, audio or video as input | A model whose card lists those input modalities, or a pre-processing step (Amazon Transcribe, Bedrock Data Automation) |
| Users wait for the answer in a chat | Synchronous call with response streaming (`ConverseStream`) |
| Thousands of documents processed overnight | Batch inference from S3, or SQS-buffered asynchronous calls |
| Data must stay in a geography | In-Region inference or a geographic cross-Region inference profile |
| A model hosted and controlled by the company (own weights, specific open-weights version, chosen GPUs) | Amazon SageMaker AI endpoint, or Custom Model Import into Bedrock for supported architectures |
| The least operational overhead | Bedrock serverless inference and managed features rather than self-hosted models on EC2 or EKS |

The **model access** decision has three levels. Amazon Bedrock serves managed FMs from several providers through one API, with no infrastructure. SageMaker AI hosts any model on instances you choose, with full control and full operational responsibility. Bedrock Custom Model Import sits between them: you bring customized weights of a supported architecture and Bedrock serves them on demand.

The **deployment strategy** follows the traffic pattern:

| Traffic pattern | Bedrock option |
| --- | --- |
| Variable or unpredictable, pay per token | On-demand inference, Standard tier (default) |
| Latency-sensitive customer calls | Priority tier |
| Tolerant workloads at a discount | Flex tier |
| Guaranteed capacity for a critical workload | Reserved tier (through the AWS account team) or Provisioned Throughput (model units) |
| Large offline jobs | Batch inference (JSONL in S3, results in S3) |
| Spikes beyond one Region's capacity | Cross-Region inference profile |

> **Exam trap.** Fine-tuning does not keep a model current. When the scenario says documents are updated daily or weekly, retraining would always lag; RAG retrieves the latest version at query time and can cite it. Fine-tuning answers "learn this tone, format or task", not "know these facts".

<!-- section: integration-patterns | objectives: 1.1.1 -->
## Integration patterns and reference architectures

Most exam designs combine a few recurring patterns:

| Pattern | Components | Choose when |
| --- | --- | --- |
| Synchronous API | Amazon API Gateway, AWS Lambda, Bedrock `Converse` | A web or mobile client needs one answer per request |
| Streaming chat | API Gateway WebSocket API or Lambda response streaming, `ConverseStream` | Users must see tokens as they are generated |
| Event-driven pipeline | S3 event, Amazon EventBridge, AWS Step Functions, Bedrock | Documents arrive continuously and each needs several processing steps |
| Buffered asynchronous | Amazon SQS, Lambda consumers, results in DynamoDB or S3 | Bursts must not exceed model quotas; callers can wait |
| Batch | Bedrock batch inference job, S3 input and output | Large, non-urgent volumes at the lowest cost |
| Retrieval augmented | Bedrock Knowledge Bases, vector store, `RetrieveAndGenerate` | Answers grounded in private documents with citations |
| Agentic | AgentCore Runtime, AgentCore Gateway tools, AgentCore Memory | Multi-step tasks that call enterprise systems |
| Central GenAI gateway | API Gateway, Lambda, shared guardrails, logging and quotas | Many teams consume FMs under one set of controls |

A typical customer-support assistant combines several of them:

```text
Users -> Amazon CloudFront -> API Gateway (WebSocket, Amazon Cognito authorizer)
      -> Lambda (session handler: history in Amazon DynamoDB)
      -> Amazon Bedrock ConverseStream (guardrail attached, cross-Region profile)
      -> Bedrock Knowledge Bases Retrieve (product manuals in Amazon S3)
Model invocation logging -> CloudWatch Logs and S3; metrics and alarms -> Amazon CloudWatch
```

Each layer has one job: authentication at the edge, conversation state in DynamoDB (Bedrock doesn't store the messages you send), retrieval from the knowledge base, safety in the guardrail, and observability in CloudWatch.

> **Exam tip.** When two options differ only by the integration style, check the latency and volume words. "Respond in real time" rules out batch and queues; "process 2 million records by tomorrow at the lowest cost" rules out synchronous calls from a fleet of Lambda functions.

<!-- section: proof-of-concept | objectives: 1.1.2 -->
## Validating feasibility with a proof of concept

A proof of concept (PoC) answers three questions before a full build: can a model do the task well enough, how fast, and at what cost per request. Amazon Bedrock keeps the PoC cheap because nothing has to be provisioned.

1. **Define success criteria first**: a quality bar on a representative dataset (for example 90 % of answers judged correct), a latency target, a cost ceiling per request or per month, and the business metric the PoC must move.
2. **Shortlist models** from the model cards: input and output modalities, context window, maximum output tokens, supported features (streaming, tool use, Guardrails, Knowledge Bases), Regions and lifecycle state.
3. **Experiment** in the Bedrock console playgrounds, or in Amazon Bedrock in SageMaker Unified Studio, where a team can compare the output of several models, share prompts and build chat agent apps or flow apps without code.
4. **Measure** with code on real samples: the Converse response returns `usage` (input, output and total tokens) and `metrics.latencyMs`; the CountTokens API estimates input tokens before sending, at no charge.
5. **Evaluate quality systematically** with a Bedrock evaluation job on your own prompt dataset: automatic metrics, LLM-as-a-judge, or human reviewers.
6. **Project costs** from measured tokens: requests per month × (input tokens × input price + output tokens × output price), then compare with batch, caching or a smaller model.

```text
# Python (boto3): measure tokens and latency for one PoC sample
response = bedrock_runtime.converse(
    modelId=candidate_model_id,
    system=[{"text": "Answer from the policy excerpt only."}],
    messages=[{"role": "user", "content": [{"text": sample_question}]}],
    inferenceConfig={"maxTokens": 400, "temperature": 0.2},
)
tokens = response["usage"]        # inputTokens, outputTokens, totalTokens
latency = response["metrics"]["latencyMs"]
```

Because the Converse API has one request shape for every model that supports it, the same harness compares candidates by changing only `modelId`. Model-specific parameters go in `additionalModelRequestFields`.

A PoC also exposes the gaps to close before production: quotas and throttling under load, guardrail behavior on adversarial prompts, data access permissions, logging, and the human review the business requires.

> **Exam trap.** A PoC that "works in the playground" proves nothing about cost or quality at scale. When the stem asks how to validate business value or compare models objectively, the answer is a repeatable evaluation on a representative dataset with defined metrics, not a few manual chats.

<!-- section: standard-components | objectives: 1.1.3 -->
## Standardized components and the Generative AI Lens

When many teams build GenAI applications, each one should not reinvent model access, safety and logging. Standardization has two layers: a review framework and reusable building blocks.

**The AWS Well-Architected Framework Generative AI Lens** (first published April 15, 2025; new version November 19, 2025 adding an agentic AI section and eight scenarios) applies the six pillars to workloads that use FMs on Amazon Bedrock or customer-managed models on SageMaker AI. Traditional ML is covered by the separate Machine Learning Lens.

| Pillar | Generative AI focus areas |
| --- | --- |
| Operational excellence | Consistent output quality, operational health monitoring, traceability, lifecycle automation, deciding when to customize a model |
| Security | Protecting endpoints, mitigating harmful outputs and excessive agency, monitoring and auditing, securing prompts, remediating model poisoning |
| Reliability | Throughput requirements, reliable component communication, graceful failure handling, artifact versioning, distributed inference |
| Performance efficiency | Capturing and improving model performance, optimizing compute, improving data retrieval |
| Cost optimization | Cost-effective model choice, balancing inference cost and performance, prompts engineered for cost, optimized vector stores and agent workflows |
| Sustainability | Minimal compute for customization, hosting and data processing, efficient models, serverless architectures |

The lens follows the lifecycle: scoping, model selection, customization, development, deployment and continuous improvement. Its six design principles are design for controlled autonomy, implement comprehensive observability, optimize resource efficiency, establish distributed resilience, standardize resource management, and secure interaction boundaries.

To review a workload against it, download the lens JSON file from the AWS samples repository for Well-Architected custom lenses, import it into the **AWS Well-Architected Tool** as a custom lens, then apply it to a workload. The tool records answers, identifies risks and tracks improvement plans across reviews.

**Reusable components** turn the lens into practice:

| Component | AWS implementation | What it standardizes |
| --- | --- | --- |
| Infrastructure templates | AWS CDK constructs, AWS CloudFormation templates and modules, AWS Service Catalog products | The same secure baseline (VPC endpoints, KMS keys, IAM roles, logging) in every deployment |
| Central model access | A GenAI gateway: API Gateway and Lambda in front of Bedrock, with quotas per team | Approved models, authentication, throttling, logging |
| Prompt catalog | Bedrock Prompt Management versions | Reviewed, parameterized prompts reused across applications |
| Safety baseline | A versioned Bedrock guardrail referenced by every application | The same content, topic and PII policies everywhere |
| Cost attribution | Application inference profiles with tags | Usage and cost per application or team |
| Runtime configuration | AWS AppConfig | Model IDs and parameters changed and rolled back without redeployment |
| Observability | Model invocation logging, CloudWatch dashboards and alarms | Comparable metrics across workloads |

> **Exam tip.** "Consistent implementation across teams with the least effort" points to templates and shared services that teams consume (CDK constructs, Service Catalog products, a shared guardrail, a central gateway), not to a document each team must follow manually. "Identify risks in an existing GenAI workload" points to a Well-Architected review with the Generative AI Lens.

<!-- section: key-points -->
## Key points

- Map each requirement to a decision: RAG for changing knowledge, customization for behavior, agents for actions, streaming for chat, batch for offline volume, geographic profiles for residency.
- Model access: Bedrock for managed FMs with the least overhead, SageMaker AI for full control, Custom Model Import to serve your own weights of a supported architecture on Bedrock.
- Deployment options follow traffic: on-demand Standard, Priority for latency, Flex for discounted tolerant jobs, Reserved tier or Provisioned Throughput for guaranteed capacity, batch inference for offline jobs, cross-Region profiles for spikes.
- A PoC defines success criteria, shortlists models from model cards, measures tokens and latency from the Converse response, evaluates quality with a Bedrock evaluation job and projects cost.
- The Generative AI Lens extends the six pillars to FM workloads; import it as a custom lens in the Well-Architected Tool. Standardize with templates, a central gateway, Prompt Management, a shared guardrail, application inference profiles and AppConfig.
