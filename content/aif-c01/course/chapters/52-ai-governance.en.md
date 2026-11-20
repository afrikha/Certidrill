Governance makes sure that AI systems keep following the organization's policies and the regulations that apply to them, over their whole life. The exam asks you to tell apart the AWS services that record, evaluate and prove compliance (AWS Config, Amazon Inspector, AWS Artifact, AWS CloudTrail, AWS Trusted Advisor), to describe data governance strategies such as residency and retention, and to recognize governance processes, including the Generative AI Security Scoping Matrix.

<!-- section: governance-services | objectives: 5.2.1 -->
## AWS services for governance and regulation compliance

| Service | What it does | Typical requirement |
| --- | --- | --- |
| **AWS Config** | Records the configuration of AWS resources and its history, and evaluates it continuously against rules (managed or custom, grouped in conformance packs) | "Detect S3 buckets with training data that are not encrypted" or "show how this resource was configured last month" |
| **Amazon Inspector** | Scans EC2 instances, ECR container images and Lambda functions automatically and continuously for software vulnerabilities and unintended network exposure | "Find vulnerable packages in the container that hosts the model" |
| **AWS Artifact** | On-demand portal for AWS compliance reports (for example, SOC, ISO, PCI) and agreements with AWS | "Give auditors AWS's SOC 2 report" or "review and accept an agreement with AWS" |
| **AWS CloudTrail** | Records API calls and account activity: who did what, when, from where | "Who changed the guardrail?" or "which role invoked the model?" |
| **AWS Trusted Advisor** | Checks the account against best practices in cost optimization, performance, security, fault tolerance, service limits and operational excellence | "Get recommendations, such as open security groups or underused resources" |

- Amazon Bedrock is in scope of compliance programs such as SOC 1, 2 and 3 and ISO 27001, and is HIPAA eligible; the reports themselves come from AWS Artifact.
- Compliance of the AWS infrastructure is AWS's part of the shared responsibility model; compliance of the customer's AI application and data remains the customer's.

> **Exam trap.** Config = configuration and compliance of **resources**; CloudTrail = **actions** by users and roles; Inspector = **vulnerabilities** in software; Artifact = **AWS's** compliance documents; Trusted Advisor = **best-practice recommendations**. None of them evaluates the content of prompts or model outputs.

<!-- section: data-governance | objectives: 5.2.2 -->
## Data governance strategies

| Strategy | Practices and AWS features |
| --- | --- |
| **Data lifecycle** | Define stages from collection to deletion: classify data when it is created, move it to cheaper storage classes and delete it when no longer needed, with Amazon S3 Lifecycle rules and Amazon S3 Glacier |
| **Logging** | CloudTrail for API activity; Amazon Bedrock model invocation logging for prompts and responses; access logs for data stores |
| **Residency** | Keep data in the AWS Regions that the regulation requires; Amazon Bedrock processes data in the Region you call, and cross-Region inference with a **geographic** inference profile (US, EU, APAC) keeps processing inside that geography, while a **global** profile can route to any supported commercial Region |
| **Monitoring** | Amazon CloudWatch metrics, logs and alarms (for example, invocations and token counts); Config rules for drift from approved configurations |
| **Observation** | Continuous visibility into how the AI system behaves in production: quality, safety and usage trends, user feedback, periodic evaluations |
| **Retention** | Keep data and logs only as long as policy and law require: CloudWatch Logs retention settings, S3 Lifecycle expiration, S3 Object Lock when records must not be changed or deleted |

- Centralize data permissions and catalogs for analytics and AI data with AWS Lake Formation and the AWS Glue Data Catalog.
- Classify data (public, internal, confidential, personal) and apply controls by class; Amazon Macie helps find personal data in S3.

> **Exam tip.** "Prompts must never be processed outside the EU" = a Region in the EU and, if you use cross-Region inference, an EU geographic inference profile, not a global one. CloudTrail logs cross-Region inference requests in the source Region.

<!-- section: governance-protocols | objectives: 5.2.3 -->
## Processes to follow governance protocols

- **Policies**: written rules for acceptable AI use, data handling, model approval, human oversight and incident response.
- **Review cadence**: reviews at defined moments (before launch, after each model or prompt change) and periodically (for example, quarterly), plus reviews triggered by incidents or new regulations.
- **Review strategies**: technical review (evaluations, security testing, red teaming), legal and compliance review, ethics and fairness review, business review; independent reviewers for high-risk systems.
- **Transparency standards**: model cards, AI Service Cards, disclosure to users that they interact with AI, documented limitations.
- **Team training requirements**: train builders and users on responsible AI, security risks such as prompt injection, data privacy and the organization's policies.

**Governance frameworks.** The **Generative AI Security Scoping Matrix** classifies a generative AI workload by how much of the model and data the organization owns, which determines its security responsibilities:

| Scope | Description | Example |
| --- | --- | --- |
| **1. Consumer app** | A public third-party generative AI service, under the provider's terms | Employees use a public chatbot |
| **2. Enterprise app** | A third-party enterprise application with generative AI features, under a business agreement | A SaaS tool with an embedded AI assistant |
| **3. Pre-trained models** | Your application built on an existing FM through an API, without changing the model | An application that calls a model on Amazon Bedrock |
| **4. Fine-tuned models** | An existing FM adapted with your business data | A model fine-tuned on Amazon Bedrock with company data |
| **5. Self-trained models** | A model trained from scratch on data you own or acquire | A model pre-trained on SageMaker AI |

The matrix applies five security disciplines to each scope: governance and compliance, legal and privacy, risk management, controls, and resilience. Scopes 1 and 2 consume a third-party service; scopes 3 to 5 build on or create a model, so the organization's responsibilities grow with the scope.

> **Exam trap.** Calling a foundation model through the Amazon Bedrock API without customizing it is scope 3 (pre-trained models), not scope 2: scope 2 is a finished third-party application. Fine-tuning moves the workload to scope 4.

<!-- section: key-points -->
## Key points

- Config: resource configuration and compliance rules. Inspector: vulnerabilities. Artifact: AWS compliance reports and agreements. CloudTrail: who did what. Trusted Advisor: best-practice checks.
- Data governance: lifecycle, logging, residency, monitoring, observation, retention.
- Residency with Bedrock: choose the Region; geographic cross-Region inference profiles stay in their geography, global ones do not.
- Governance processes: policies, review cadence, review strategies, transparency standards, team training.
- Generative AI Security Scoping Matrix: consumer app, enterprise app, pre-trained models, fine-tuned models, self-trained models.
