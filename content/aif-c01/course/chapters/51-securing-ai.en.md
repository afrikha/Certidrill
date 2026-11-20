An AI system has the usual cloud attack surface (identities, data, network) plus new ones: prompts, training and retrieval data, model outputs and agents that call tools. The exam asks you to map a security requirement to an AWS service or feature, to describe data lineage and source citation, to apply secure data engineering practices, and to choose the controls against prompt injection, data leakage and hallucinations.

<!-- section: ai-security-services | objectives: 5.1.1 -->
## AWS services and features to secure AI systems

| Requirement | Service or feature |
| --- | --- |
| Grant an application, a user or an agent only the model, knowledge base or data it needs | **IAM** roles, policies and permissions, with least privilege |
| Encrypt data, custom models and knowledge bases at rest with keys you control | Encryption with **AWS KMS** customer managed keys; data in Amazon Bedrock is always encrypted in transit and at rest |
| Find personal or sensitive data in the S3 buckets used for training or RAG | **Amazon Macie** |
| Call Amazon Bedrock from a VPC without traversing the internet | **AWS PrivateLink** (interface VPC endpoint) |
| Know who secures what | **AWS shared responsibility model** |
| Give agents an identity and manage the credentials they use to access AWS and third-party services on behalf of users | **Amazon Bedrock AgentCore Identity** |
| Control which tools an agent may call, with which parameters and for which user | **Policy in AgentCore** |
| Filter harmful content, prompt attacks and sensitive information in inputs and outputs | **Amazon Bedrock Guardrails** |

- **Shared responsibility for generative AI**: AWS secures the infrastructure and the Amazon Bedrock service; the customer secures its applications, data, IAM permissions, prompts and outputs. Prompt injection is an application-level risk owned by the customer.
- With Amazon Bedrock, your prompts and completions are not used to improve the base models and are not shared with model providers.
- **Policy in AgentCore** intercepts tool calls at the AgentCore Gateway and evaluates each one against policies written in Cedar (rules can be drafted in natural language and translated). Enforcement happens outside the agent's code, so a manipulated agent cannot bypass it.

> **Exam trap.** AgentCore Identity answers "who is the agent and which credentials can it use"; Policy in AgentCore answers "which tool call is allowed"; Guardrails answers "is this content acceptable". IAM controls access to AWS resources, not the content of a prompt.

<!-- section: source-citation-lineage | objectives: 5.1.2 -->
## Source citation and documenting data origins

- **Source citation**: a generative AI answer indicates the documents it is based on. Amazon Bedrock Knowledge Bases returns citations to the source passages with a generated response, so users can verify the answer.
- **Data lineage**: the record of where data comes from and every transformation it goes through, up to the model trained on it and the predictions it makes. Lineage supports audits, reproducibility and the investigation of a bad output.
- **Data cataloging**: an inventory of datasets with their schema, owner, classification and location, such as the AWS Glue Data Catalog, which makes data discoverable and governable.
- **Amazon SageMaker Model Cards**: document the training datasets, training details, intended uses and evaluation results of a model.

> **Exam tip.** "Users must be able to check which document an answer came from" = source citation (RAG with citations). "Auditors must trace the data used to train a model" = data lineage and model documentation.

<!-- section: secure-data-engineering | objectives: 5.1.3 -->
## Best practices for secure data engineering

| Practice | How |
| --- | --- |
| **Assess data quality** | Profile and validate data before training or indexing: completeness, accuracy, duplicates, freshness (for example, with AWS Glue DataBrew or AWS Glue data quality rules) |
| **Privacy-enhancing technologies** | Remove or mask personal data, pseudonymize or tokenize identifiers, anonymize or aggregate records, encrypt data; detect PII with Amazon Macie in S3, Amazon Comprehend in text, or Guardrails sensitive information filters at run time |
| **Data access control** | Least-privilege IAM policies, S3 bucket policies, AWS Lake Formation fine-grained permissions on data lake tables, separation of training, test and production data |
| **Data integrity** | Protect data from unauthorized change: versioning, write-once storage when required, checksums, and logging of every access and change |

<!-- section: ai-security-privacy | objectives: 5.1.4 -->
## Security and privacy considerations for AI systems

| Consideration | Controls |
| --- | --- |
| **Application security** | Input validation, secure coding, least privilege, security testing of the application |
| **Threat detection** | Monitor API activity in AWS CloudTrail and usage in Amazon CloudWatch; alarms on unusual invocation volume; Guardrails prompt attack detection |
| **Vulnerability management** | **Amazon Inspector** scans Amazon EC2 instances, container images in Amazon ECR and AWS Lambda functions for software vulnerabilities and network exposure |
| **Infrastructure protection** | VPC, private subnets, security groups, AWS PrivateLink endpoints |
| **Prompt injection** | Guardrails prompt attack filter, separation of instructions and user input, least privilege for the tools an agent can use |
| **Encryption at rest and in transit** | AWS KMS keys; TLS (Amazon Bedrock requires TLS 1.2 and recommends TLS 1.3) |
| **Data leakage prevention** | Guardrails sensitive information filters (block or mask PII), no secrets or personal data in prompts and training data, IAM scoped to each knowledge base |
| **Output filtering and validation** | Guardrails content filters, denied topics and grounding checks; validation of format and values before the output is used by another system |
| **Audit trail and logging** | **CloudTrail** records Amazon Bedrock API calls (who, when, which model); **model invocation logging** records the prompts, responses and token counts to CloudWatch Logs or Amazon S3; it is disabled by default |
| **Toxicity** | Guardrails content filters (hate, insults, sexual, violence, misconduct); toxicity evaluation before deployment |

> **Exam trap.** CloudTrail tells you that a user called `InvokeModel`; it does not contain the prompt and the response. To keep the content of AI interactions for audit, enable Amazon Bedrock model invocation logging.

<!-- section: hallucination-grounding | objectives: 5.1.5 -->
## Detecting hallucinations and grounding outputs

| Technique | How it improves accuracy |
| --- | --- |
| **RAG grounding** | Retrieve relevant passages from trusted sources (Amazon Bedrock Knowledge Bases) and instruct the model to answer only from them, with citations |
| **Contextual grounding check** | A Guardrails policy that scores each response for **grounding** (supported by the source) and **relevance** (answers the query), from 0 to 1; responses below the threshold you set (0 to 0.99) are blocked or flagged |
| **Automated Reasoning checks** | Guardrails validates responses against logical rules built from your policy documents, and can suggest corrections |
| **Output validation** | Check facts, numbers and formats against systems of record, schemas or business rules before use; human review for high-risk outputs |
| **Confidence scoring** | Use scores (grounding, relevance, model or judge scores) to accept, flag, or route low-confidence answers to a person |

Other levers: lower the temperature for factual tasks, ask the model to say when it does not know, and evaluate faithfulness with Amazon Bedrock evaluations before release.

> **Exam tip.** "Block answers that are not supported by the retrieved documents in a RAG chatbot" = Guardrails contextual grounding check. "Answers must come from the company's current documents" = RAG with Knowledge Bases.

<!-- section: key-points -->
## Key points

- IAM least privilege, KMS encryption, Macie for sensitive data in S3, PrivateLink for private access, Guardrails for content.
- AgentCore Identity: agent identity and credentials; Policy in AgentCore: allowed tool calls, enforced at the Gateway with Cedar.
- Bedrock does not use your prompts to train base models or share them with providers; prompt injection is the customer's responsibility.
- Source citation, data lineage, data cataloging and model cards document data origins.
- CloudTrail = API calls; model invocation logging = prompts and responses (off by default); Inspector = vulnerabilities.
- Hallucinations: RAG grounding, contextual grounding check, Automated Reasoning checks, output validation, confidence scoring.
