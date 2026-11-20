SAP-C03 tests generative AI and machine learning as architecture, not as data science: how applications in many accounts reach foundation models under central control, how agents call enterprise tools safely, which inference hosting option fits a traffic pattern, and how a retrieval augmented generation (RAG) pipeline ingests and retrieves documents. Model training and tuning are out of scope; the decisions are about access, capacity, isolation, cost and data residency.

<!-- section: genai-integration | objectives: 1.2.1 -->
## Generative AI integration and multi-account patterns with Amazon Bedrock

Applications call Amazon Bedrock models through the runtime API (`InvokeModel`, or the model-agnostic `Converse` and `ConverseStream`). The capacity and cost choice comes first:

| Need | Bedrock option |
| --- | --- |
| Variable traffic, pay per token | On-demand inference, Standard tier (the default) |
| Fastest responses for customer-facing calls, no reservation | Priority tier (`service_tier` set to `priority`, price premium) |
| Workloads that tolerate longer processing (evaluations, summarization, agentic jobs) at a discount | Flex tier |
| Mission-critical capacity reserved for 1 or 3 months, overflow to Standard | Reserved tier (through the AWS account team) |
| Dedicated model units, for example for custom models | Provisioned Throughput |
| Large offline jobs from S3 | Batch inference |

On-demand quota is shared by the Priority, Standard and Flex tiers; CloudWatch reports the tier that actually served each request.

**Cross-Region inference** routes requests through an inference profile to Regions with capacity:

| | Geographic profile (US, EU, APAC...) | Global profile |
| --- | --- | --- |
| Processing location | Regions inside the geography | Any supported commercial Region |
| Cost | Standard pricing | About 10 % savings |
| SCP requirement | Allow every destination Region of the profile | Allow `aws:RequestedRegion` set to `unspecified` |
| Choose for | Data residency requirements | Cost and throughput without geographic restriction |

Cross-Region traffic stays on the AWS network and is encrypted in transit; CloudTrail logs the call in the source Region with the processing Region in `additionalEventData.inferenceRegion`. Inference profiles don't support Provisioned Throughput.

**Application inference profiles** wrap a model or a cross-Region profile in a taggable resource: tag one per application or business unit to allocate Bedrock costs and track usage.

Multi-account designs:

| Pattern | How it works | Choose when |
| --- | --- | --- |
| Centralized AI platform account | One account holds model access, guardrails, logging and quotas; workload accounts call it through an API (API Gateway with IAM or a Lambda authorizer, or a private endpoint) | Central cost control, one place to audit prompts, shared quotas |
| Decentralized with organization guardrails | Each account calls Bedrock directly; SCPs allow only approved model IDs and Regions; Amazon Bedrock policies in AWS Organizations enforce a guardrail version on every inference call in the OUs they are attached to | Teams own their quotas and budgets but compliance rules must hold everywhere |

Supporting controls: interface VPC endpoints for the Bedrock runtime so calls never use the internet, model invocation logging to CloudWatch Logs and S3, and a KMS customer managed key for logged data.

> **Exam trap.** A global cross-Region inference profile can process a request in any commercial Region. If the stem says EU customer data must be processed in the EU, choose an EU geographic profile, and make sure the SCPs allow all its destination Regions, or calls fail with access denied.

<!-- section: agents-tools | objectives: 1.2.2 -->
## AI agent architectures with Amazon Bedrock AgentCore

An agent is a model in a loop that plans, calls tools, reads results and decides the next step. Two managed approaches exist:

- **Amazon Bedrock Agents**: a configured agent with action groups (Lambda functions or OpenAPI schemas) and attached knowledge bases; the least code for a single, Bedrock-native agent.
- **Amazon Bedrock AgentCore**: modular services to deploy and operate agents built with any framework (Strands Agents, LangGraph, CrewAI, LlamaIndex...) and any model, in or outside Bedrock.

| AgentCore service | Role in the architecture |
| --- | --- |
| Runtime | Serverless hosting of agents and tools; each session runs in a dedicated microVM with isolated CPU, memory and file system, for up to 8 hours (terminated after 15 minutes idle); HTTP, MCP and A2A protocols; inbound auth with IAM SigV4 or OAuth 2.0 tokens |
| Gateway | Turns APIs (OpenAPI, Smithy), Lambda functions and existing services into MCP tools behind one endpoint, connects existing MCP servers, offers semantic tool search, and handles inbound and outbound authentication |
| Identity | Agent identity and credentials: validates users' tokens from existing identity providers, and obtains OAuth tokens or API keys to call tools on behalf of a user or autonomously |
| Memory | Short-term memory for multi-turn sessions and long-term memory shared across sessions and agents |
| Policy | Deterministic rules, checked at the Gateway on every tool call, on which tools an agent may use and under what conditions (Cedar-compatible policy language) |
| Code Interpreter and Browser | Sandboxed code execution and a managed cloud browser for web tasks |
| Observability and Evaluations | OpenTelemetry-compatible traces of every step in CloudWatch; automated quality evaluation of sessions and tool use |

A reference design for an enterprise assistant: a front end authenticates users with Amazon Cognito or the corporate IdP; the agent runs in AgentCore Runtime; it reaches internal systems only through AgentCore Gateway targets (a Lambda function for the order system, an OpenAPI target for the CRM); AgentCore Identity exchanges the user's token for the downstream credentials so that tools enforce the user's own permissions; Policy blocks refunds above a threshold; Memory keeps the conversation; a knowledge base supplies documents.

> **Exam trap.** Session state in AgentCore Runtime is ephemeral: the microVM is destroyed when the session ends. "The agent must remember a customer's preferences across conversations" is AgentCore Memory (long-term), not a longer session or a file in the runtime.

<!-- section: ml-inference | objectives: 1.2.3 -->
## ML inference architectures with Amazon SageMaker AI

When the model is your own (or open weights you host), SageMaker AI offers four inference options:

| Option | Limits | Scales to zero | Choose for |
| --- | --- | --- | --- |
| Real-time endpoint | Payload up to 25 MB; 60 seconds for regular responses, 8 minutes for streaming | Only with inference components | Steady, low-latency online traffic; GPUs |
| Serverless inference | Payload up to 4 MB, 60 seconds; memory 1,024 to 6,144 MB; up to 200 concurrent invocations per endpoint | Yes (cold starts; provisioned concurrency optional) | Intermittent or unpredictable traffic that tolerates cold starts |
| Asynchronous inference | Payload up to 1 GB, processing up to 1 hour; requests queued, results written to S3 with SNS notifications | Yes | Large inputs (documents, video), long processing, bursty queues |
| Batch transform | Datasets of GBs, jobs of days, no endpoint | Not applicable | Offline scoring of a complete dataset |

Serverless inference doesn't support GPUs, VPC configuration, multi-model endpoints, data capture or multiple production variants. A real-time endpoint scales to zero instances only when it hosts **inference components**, with a minimum instance count of 0 and a step scaling policy triggered by the `NoCapacityInvocationFailures` metric; scale-out from zero takes several minutes. Inference components and multi-model endpoints also pack many models on shared instances to cut cost.

Endpoints scale with Application Auto Scaling (target tracking on invocations per instance or per copy). For safe model updates, **deployment guardrails** shift traffic blue/green all at once, by canary or linearly, watch CloudWatch alarms during a baking period and roll back automatically; rolling deployments replace capacity in batches. Shadow tests send a copy of production traffic to a new variant without returning its answers.

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace sagemaker \
  --resource-id inference-component/claims-scorer \
  --scalable-dimension sagemaker:inference-component:DesiredCopyCount \
  --min-capacity 0 --max-capacity 8
```

> **Exam tip.** Use Bedrock when a managed foundation model meets the need with the LEAST operational overhead. Use SageMaker AI endpoints when the company must host its own trained model, a specific open-weights model version, or needs control of instance types and GPUs. "Requests take 20 minutes on 500 MB inputs" is asynchronous inference; "a few calls a day, cost must be near zero when idle" is serverless inference.

<!-- section: rag-architecture | objectives: 1.2.4 -->
## RAG architectures with Amazon Bedrock Knowledge Bases

RAG grounds a model's answer in your documents: retrieve the most relevant passages, add them to the prompt, generate with citations. Amazon Bedrock Knowledge Bases manages the pipeline.

**Ingestion** runs as sync jobs from data source connectors (Amazon S3, web crawler, Confluence, SharePoint, Salesforce, custom sources) and repeats on change:

1. **Parse.** The default parser extracts text; a foundation model parser or Bedrock Data Automation handles tables, figures and scanned pages.
2. **Chunk.** Default chunking makes chunks of about 300 tokens on sentence boundaries; fixed-size chunking sets tokens per chunk and overlap; hierarchical chunking retrieves precise child chunks and returns their larger parents; semantic chunking splits on meaning (extra model cost); no chunking keeps each file whole; a Lambda function can apply custom chunking or transformations.
3. **Embed** with an embeddings model (Amazon Titan Text Embeddings V2: 1,024, 512 or 256 dimensions; Cohere Embed). The vector index dimension must match the model.
4. **Store** vectors, text chunks and metadata in the vector store.

| Vector store | Distinctive points |
| --- | --- |
| Amazon OpenSearch Serverless | Quick create, hybrid search, binary vectors, the richest metadata filters |
| Amazon OpenSearch Service managed cluster | Existing domains; binary vectors; the domain needs public access for the knowledge base |
| Amazon Aurora PostgreSQL (pgvector) | Hybrid search, SQL and existing database skills; the cluster must be in the knowledge base's account |
| Amazon S3 Vectors | Lowest-cost durable vector storage for infrequent queries, sub-second latency; float vectors only; metadata size limits per vector (avoid large hierarchical chunks) |
| Amazon Neptune Analytics | GraphRAG: retrieval follows relationships between entities |
| Pinecone, Redis Enterprise Cloud, MongoDB Atlas | Third-party stores, credentials in Secrets Manager |

**Retrieval.** `Retrieve` returns chunks (up to five by default) for your own prompt or agent; `RetrieveAndGenerate` also generates the answer with citations. Quality levers:

| Problem | Lever |
| --- | --- |
| Exact terms (product codes, error numbers) missed by semantic search | Hybrid search (OpenSearch Serverless, Aurora/RDS, MongoDB with a filterable text field) |
| Users must see only their own tenant's or department's documents | Metadata in `.metadata.json` files, filters such as `equals` on `tenantId` applied by the application, never chosen by the user |
| Relevant chunks ranked too low | A reranker model on the retrieved results |
| Multi-part questions | Query decomposition into sub-queries |
| Filters must follow the question ("2024 reports from the finance team") | Implicit metadata filtering from a metadata schema |
| Harmful or off-topic answers | A Bedrock guardrail in the generation configuration |

```json
{
  "retrievalConfiguration": {
    "vectorSearchConfiguration": {
      "numberOfResults": 8,
      "overrideSearchType": "HYBRID",
      "filter": { "andAll": [
        { "equals": { "key": "tenantId", "value": "tenant-042" } },
        { "greaterThan": { "key": "year", "value": 2023 } }
      ] }
    }
  }
}
```

> **Exam trap.** Metadata filtering is an access control only if the application sets the filter from the authenticated identity. For strict separation between tenants with different data owners, use a knowledge base per tenant (silo); a shared index with filters is the pool model.

<!-- section: key-points -->
## Key points

- Bedrock capacity: on-demand Standard, Priority for latency, Flex for discounted tolerant jobs, Reserved for guaranteed capacity, Provisioned Throughput for dedicated units, batch inference for offline jobs.
- Cross-Region inference: geographic profiles keep processing in a geography (data residency), global profiles save about 10 % and need `aws:RequestedRegion` `unspecified` in SCPs; application inference profiles tag usage and cost.
- Multi-account generative AI: central platform account behind an API, or direct access controlled by SCPs, Bedrock policies in AWS Organizations enforcing guardrails, VPC endpoints and invocation logging.
- AgentCore: Runtime (microVM per session, up to 8 hours), Gateway (APIs and Lambda as MCP tools), Identity (inbound and outbound auth), Memory (short and long term), Policy (rules on tool calls), Observability and Evaluations.
- SageMaker AI: real-time for steady low latency and GPUs, serverless for intermittent small payloads, asynchronous for large payloads and long jobs, batch transform for offline datasets; deployment guardrails for canary or linear rollouts with automatic rollback.
- RAG: parse, chunk, embed, store; pick the vector store by search features, cost and skills; improve retrieval with hybrid search, metadata filters set by the application, reranking and query decomposition.
