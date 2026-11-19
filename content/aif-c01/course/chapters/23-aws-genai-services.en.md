AWS offers generative AI at several levels: foundation models through an API (Amazon Bedrock), a platform to build and host your own models (Amazon SageMaker AI), ready-to-use AI applications for business users and developers (Amazon Quick, Kiro), and tools to build and run agents (Strands Agents, Amazon Bedrock AgentCore). The exam asks which one fits a need, why a managed service helps, what the AWS infrastructure brings and how pricing options trade cost against performance.

<!-- section: aws-genai-services | objectives: 2.3.1 -->
## AWS services to develop GenAI applications

| Service | What it is |
| --- | --- |
| **Amazon Bedrock** | Fully managed, serverless access to foundation models from Amazon (Amazon Nova) and leading AI companies through one API. Features: Knowledge Bases (managed RAG), Guardrails (safeguards), Prompt Management, Model Evaluation, model customization (fine-tuning, continued pre-training, distillation), batch inference, Bedrock Marketplace for more specialized models |
| **Amazon SageMaker AI** | Build, train, fine-tune and deploy any ML model, including foundation models, with control over instances, code and endpoints; SageMaker HyperPod for large-scale training |
| **SageMaker JumpStart** | A hub inside SageMaker AI of pretrained proprietary and open source models, plus solution templates, that you deploy to SageMaker AI endpoints, fine-tune and evaluate |
| **Amazon Quick** | An AI-powered service for business users (the AWS documentation now calls it AWS Quick, evolved from Amazon QuickSight): chat with AI agents over company data, dashboards (Quick Sight), document grounding (Quick Index), cited research reports (Quick Research), workflow and process automation (Quick Flows, Quick Automate) |
| **Kiro** | An agentic development environment (IDE and CLI) that turns a prompt into requirements, a design and tasks (spec-driven development), then writes, tests and documents the code; supports MCP |
| **Strands Agents** | An open source SDK (Python and TypeScript) for building AI agents in a few lines of code: the model plans and calls tools; works with Amazon Bedrock and other model providers, MCP tools and multi-agent patterns |
| **Amazon Bedrock AgentCore** | Services to deploy and operate agents securely at scale, with any framework (Strands Agents, LangGraph, CrewAI...) and any model: Runtime (serverless hosting with session isolation), Memory, Gateway (turns APIs and Lambda functions into MCP tools), Identity, Code Interpreter, Browser, Observability, Policy, Evaluations |

Status in November 2026: Amazon Bedrock Agents is now Amazon Bedrock Agents Classic and no longer accepts new customers (AgentCore is the successor); Amazon Q Business is closed to new customers (successor Amazon Quick); Amazon Q Developer takes no new sign-ups and its IDE plugins reach end of support on April 30, 2027 (successor Kiro).

| Requirement | Answer |
| --- | --- |
| Use a high-performing FM through an API with the least operational overhead | Amazon Bedrock |
| Full control over training and hosting of a model, custom code | Amazon SageMaker AI |
| Deploy an open source pretrained model to a dedicated endpoint in a few clicks | SageMaker JumpStart |
| Business users ask questions about company data and dashboards in natural language | Amazon Quick |
| Developers generate code from specifications in their IDE | Kiro |
| Write an agent in Python with a few lines of code | Strands Agents |
| Run agents in production with memory, identity, tool gateway and observability | Amazon Bedrock AgentCore |

> **Exam trap.** Bedrock serves foundation models; SageMaker AI is where you build and host your own. JumpStart is part of SageMaker AI, not of Bedrock. Strands Agents is the code you write; AgentCore is where the agent runs and is governed.

<!-- section: aws-genai-advantages | objectives: 2.3.2 -->
## Advantages of AWS GenAI services

| Advantage | How AWS delivers it |
| --- | --- |
| **Accessibility** | Many models behind one consistent API and a console playground; no GPU to obtain |
| **Lower barrier to entry** | No ML expertise or infrastructure needed; managed features replace custom code for RAG, guardrails and agents |
| **Efficiency** | Serverless scaling, managed ingestion and retrieval, built-in evaluation and monitoring |
| **Cost-effectiveness** | Pay per token with no upfront cost; batch, caching and smaller models lower the bill |
| **Speed to market** | A prototype in days: switch models by changing a model ID, no training required |
| **Ability to meet business objectives** | Choice of models for each use case, customization with company data, integration with existing AWS data and security services |

<!-- section: aws-infrastructure-benefits | objectives: 2.3.3 -->
## Benefits of AWS infrastructure for GenAI

- **Security.** With Amazon Bedrock, your content is not used to improve the base models and is not shared with model providers. Data is encrypted in transit and at rest (AWS KMS keys, including customer managed keys), access is controlled with IAM and traffic can stay private through AWS PrivateLink from a VPC. Customer content processed by Bedrock is stored in the Region where it is processed.
- **Compliance.** Bedrock is in scope of compliance programs such as SOC and ISO, is HIPAA eligible and can be used in compliance with GDPR; customers download the AWS compliance reports from AWS Artifact.
- **Responsibility.** Under the shared responsibility model, AWS secures the infrastructure and the managed service; the customer secures its data, access permissions, prompts and application. AWS AI Service Cards document the intended uses, limits and responsible design choices of AWS AI services.
- **Safety.** Amazon Bedrock Guardrails filters harmful content, blocks denied topics, masks personal data and checks that answers are grounded in the source.
- **Performance and scale.** Purpose-built chips (AWS Trainium for training and inference, AWS Inferentia for inference) and GPU instances in Amazon EC2, deployed across AWS Regions worldwide.

> **Exam trap.** "Will our prompts be used to train the provider's model?" No: Amazon Bedrock doesn't use customer content to improve base models or share it with model providers. A fine-tuned model is private to the account that created it.

<!-- section: cost-tradeoffs | objectives: 2.3.4 -->
## Cost tradeoffs of AWS GenAI services

| Option | How you pay | Tradeoff |
| --- | --- | --- |
| **On-demand (token-based pricing)** | Per input and output token, no commitment | Flexible and cheap for variable or low traffic; subject to account quotas |
| **Batch inference** | A lower price than on-demand for select models | Asynchronous results; not for interactive use |
| **Service tiers** | Priority (premium price), Standard (default), Flex (discount), Reserved (fixed monthly price for reserved tokens per minute) | Priority gives the fastest responses for customer-facing apps; Flex suits workloads that tolerate longer processing; Reserved guarantees capacity for mission-critical apps |
| **Provisioned Throughput** | Hourly price per model unit, with no commitment or a one-month or six-month commitment (lower hourly price) | Guaranteed, consistent throughput for steady high volume; you pay even when idle |
| **Cross-Region inference** | Requests are routed to other Regions of a geography or globally | Higher throughput and availability during peaks; data is processed in the destination Region |
| **Custom models** | Training (tokens processed × epochs), monthly model storage, then inference through Provisioned Throughput or an on-demand custom model deployment | Better fit for the domain, but added fixed costs; try prompt engineering and RAG first |

Other factors: **regional coverage** (not every model is offered in every Region, and prices vary by Region), **responsiveness** (larger models and long outputs are slower), **availability and redundancy** (reserved capacity or cross-Region inference cost more but absorb peaks) and **performance** (a more capable model costs more per token).

> **Exam tip.** "Predictable, constant high volume with guaranteed throughput" is Provisioned Throughput. "Variable traffic, pay only for what is used" is on-demand. "Process 1 million documents overnight at the lowest cost" is batch inference.

<!-- section: key-points -->
## Key points

- Bedrock: FMs by API, serverless, with Knowledge Bases, Guardrails, Prompt Management, Model Evaluation and customization.
- SageMaker AI builds and hosts your own models; JumpStart provides pretrained models to deploy and fine-tune.
- Quick serves business users, Kiro serves developers, Strands Agents builds agents, AgentCore runs them in production.
- Bedrock doesn't use your content to improve base models; encryption, IAM, PrivateLink and compliance programs secure GenAI workloads.
- On-demand for variable traffic, batch for offline volume, Provisioned Throughput for steady guaranteed throughput; custom models add training, storage and hosting costs.
