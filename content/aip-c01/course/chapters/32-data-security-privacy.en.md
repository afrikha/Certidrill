GenAI applications move sensitive data through new paths: prompts, retrieved passages, conversation history, embeddings, invocation logs and model outputs. The exam tests whether you can keep that traffic private on the network, give each component only the data it needs, use the privacy features Amazon Bedrock already provides, find and remove personally identifiable information (PII) at the right stage, and keep the application useful after masking. Expect the qualifiers "MOST secure", "without traversing the internet" and "LEAST operational overhead".

<!-- section: protected-environments | objectives: 3.2.1 -->
## Isolating FM workloads on the network

**AWS PrivateLink interface endpoints** keep calls to Amazon Bedrock inside the AWS network, with no internet gateway, NAT device or public IP address. Each API family has its own endpoint service:

| Endpoint service (`com.amazonaws.region.…`) | API |
| --- | --- |
| `bedrock` | Control plane (create guardrails, customization jobs, logging configuration) |
| `bedrock-runtime` | Inference: `InvokeModel`, `Converse`, `ApplyGuardrail` |
| `bedrock-agent` | Build-time API for Knowledge Bases, Agents Classic, Prompt management, Flows |
| `bedrock-agent-runtime` | `Retrieve`, `RetrieveAndGenerate`, `InvokeFlow`, `InvokeAgent` |
| `bedrock-mantle` | Amazon Bedrock Mantle API (separate host name, `bedrock-mantle.region.api.aws`) |
| `bedrock-fips`, `bedrock-runtime-fips` | FIPS endpoints, in a few US and Canada Regions only |

With **private DNS** enabled, the SDK's default Regional host names resolve to the endpoint, so no code change is needed; without it, the client must set `endpoint_url` (or `--endpoint-url`) to the endpoint's DNS name.

> **Exam trap.** A RAG application that calls `RetrieveAndGenerate` needs the `bedrock-agent-runtime` endpoint, not only `bedrock-runtime`. An S3 gateway endpoint covers the documents in Amazon S3, and an OpenSearch Serverless or Aurora vector store has its own private access options.

Two policies close the loop:

- The **endpoint policy** limits what can be done *through* the endpoint (the default allows full access). Allow only `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on the approved model ARNs.
- An **IAM or resource policy condition** limits *where* calls may come from. `aws:SourceVpce` denies calls that do not arrive through your endpoint:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyBedrockOutsideVpcEndpoint",
      "Effect": "Deny",
      "Action": "bedrock:*",
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:SourceVpce": "vpce-0a1b2c3d4e5f67890" }
      }
    }
  ]
}
```

Other components of the environment: Lambda functions and Amazon ECS tasks in private subnets with security groups that allow only HTTPS to the endpoints; Amazon SageMaker AI endpoints for self-hosted models deployed in your VPC (network isolation blocks outbound calls from the container); TLS 1.2 or later in transit; AWS KMS customer managed keys at rest.

**Encryption with customer managed keys** (AWS KMS) is supported for model customization jobs and custom models, knowledge base data source ingestion jobs, model evaluation jobs, Agents Classic, OpenSearch vector stores, and the S3 data used for training and as knowledge base sources (SSE-KMS). Model invocation logs written to S3 can use SSE-KMS if the key policy allows `bedrock.amazonaws.com` to call `kms:GenerateDataKey`.

<!-- section: data-access-controls | objectives: 3.2.1 -->
## Granular data access and access monitoring

| Requirement | Control |
| --- | --- |
| An application may call only approved models | IAM policy on `bedrock:InvokeModel` with specific `foundation-model` or inference profile ARNs |
| A team may query only its own knowledge base | IAM on `bedrock:Retrieve` and `bedrock:RetrieveAndGenerate` scoped to the knowledge base ARN |
| Users see only documents they are entitled to | Metadata on each document (`.metadata.json`, for example `department` or `clearance`) and a retrieval filter built from the user's identity on every query |
| Analysts or pipelines see only some columns or rows of data lake tables used for RAG or fine-tuning | **AWS Lake Formation**: database, table, column, row and cell-level permissions, data filters, LF-Tags (tag-based access control) |
| Secrets for third-party vector stores or tools | AWS Secrets Manager, never in prompts or code |

Lake Formation grants are enforced by Amazon Athena, AWS Glue, Amazon EMR and Amazon Redshift Spectrum, so a Glue job that builds a RAG corpus from a data lake cannot read the masked `ssn` column if its role was not granted it. Hybrid access mode lets you adopt Lake Formation table by table without breaking existing IAM-based access.

> **Exam trap.** Retrieval filters are only as safe as the code that builds them. The filter must come from the authenticated identity (for example, Amazon Cognito token claims mapped in the backend), never from text the user typed, or a prompt injection can widen the filter.

**Monitoring data access.**

| What you need to know | Source |
| --- | --- |
| Who called which model, when, from where | AWS CloudTrail management events (`InvokeModel`, `Converse` are logged by default) |
| Who queried which knowledge base, flow or guardrail | CloudTrail **data events** (`AWS::Bedrock::KnowledgeBase`, `AWS::Bedrock::FlowAlias`, `AWS::Bedrock::Guardrail`), not logged by default, extra charge |
| What was asked and answered, with token counts and caller ARN | Amazon Bedrock **model invocation logging** to CloudWatch Logs or S3 |
| Who read which data lake table | Lake Formation audit in CloudTrail |
| Unusual volume or access patterns | CloudWatch metrics, metric filters on logs, alarms, anomaly detection |

<!-- section: bedrock-privacy-features | objectives: 3.2.2 -->
## Amazon Bedrock native data privacy

Know what Amazon Bedrock guarantees so you do not build controls you do not need:

- Inputs and outputs are **not used to train** models by AWS or by third-party model providers, and are **not shared with model providers**.
- Models run in **model deployment accounts** owned by the Amazon Bedrock service team, one per provider per Region; providers have no access to them, so they never see your prompts, completions or logs.
- Data is encrypted in transit and at rest; customer content processed by Amazon Bedrock is stored at rest in the Region where you use the service. A customized model stays in the Region where it was created.
- **Data retention** is a per-Region setting: mode `none` means no request or response data is written to durable storage; other modes let AWS retain data for abuse prevention or a human review that some models require. A model that requires retention is blocked when the Region is set to `none`. With cross-Region inference, retained data is stored in the Region that processed the request.
- **Model invocation logging is disabled by default.** When you enable it, prompts and responses are stored in your CloudWatch Logs group or S3 bucket, **unmasked**, even when a guardrail masked the response. Protect them with a CloudWatch Logs data protection policy, KMS encryption, tight IAM and a retention period.

> **Exam tip.** "Ensure the model provider cannot access prompts" or "ensure prompts are not used for training" needs no extra design on Amazon Bedrock: it is a property of the service. The design work is in your own logs, conversation history and vector stores.

<!-- section: pii-detection | objectives: 3.2.2, 3.2.3 -->
## Detecting PII at each stage

| Stage | Service | What it does |
| --- | --- | --- |
| Data at rest in S3 (training data, RAG sources, exported logs) | **Amazon Macie** | Finds sensitive data in S3 objects with managed and custom data identifiers and allow lists; automated sensitive data discovery (continuous, sampled) or sensitive data discovery jobs (targeted, one-time or scheduled); findings to Amazon EventBridge and AWS Security Hub CSPM |
| Text in a pipeline before indexing or prompting | **Amazon Comprehend** | `DetectPiiEntities` returns entity type, offsets and score in real time; `ContainsPiiEntities` returns labels only; redaction runs only as an asynchronous job on documents in S3; English and Spanish |
| Prompts and responses at run time | **Amazon Bedrock Guardrails** sensitive information filters | `BLOCK` or `ANONYMIZE` PII types (`NAME`, `EMAIL`, `PHONE`, `US_SOCIAL_SECURITY_NUMBER`, `CREDIT_DEBIT_CARD_NUMBER`, `AWS_ACCESS_KEY`...) and custom regex, separately for input and output |
| Log events | **CloudWatch Logs data protection policies** | Detect and mask sensitive data at ingestion; only principals with `logs:Unmask` see the original values; `LogEventsWithFindings` metric |

A typical ingestion pipeline: a new document lands in S3, an EventBridge rule starts a Step Functions workflow, Macie or Comprehend flags it, a Comprehend redaction job writes a clean copy to the bucket that the knowledge base indexes, and the original is kept in a restricted bucket or deleted.

> **Exam trap.** Macie scans **S3 objects**; it does not inspect a prompt in flight. Guardrails inspects prompts and responses; it does not scan a bucket. Comprehend works on any text you pass it. Pick by where the data is when it must be checked.

**Retention.** Personal data must not live longer than the policy allows:

- **S3 Lifecycle configurations** expire objects (raw uploads, invocation logs, evaluation outputs) after a number of days, or transition them to cheaper storage classes first; scope rules with prefixes or tags.
- **CloudWatch Logs retention** on each log group (the default is never expire).
- **DynamoDB Time to Live** on conversation history items, with an expiry timestamp attribute.
- Remember the derived copies: chunks and embeddings in the vector store must be removed by re-syncing the knowledge base after the source document is deleted.

<!-- section: privacy-preserving-design | objectives: 3.2.3 -->
## Keeping utility while protecting privacy

Removing all personal data can break the use case (a support assistant must still know which order the customer means). Choose the technique by what the model actually needs:

| Technique | Result | Reversible | Keeps utility when |
| --- | --- | --- | --- |
| Redaction | Value removed | No | The value is irrelevant to the task |
| Masking with entity type (`{NAME}`, `[PHONE]`) | Value replaced by its type | No | The model must know a value existed (Guardrails `ANONYMIZE`, Comprehend `REPLACE_WITH_PII_ENTITY_TYPE`) |
| Partial masking | `****-****-****-1234` | No | Users must recognize the item |
| Pseudonymization or tokenization | Consistent token (`CUST_8842`) mapped to the real value in a protected store | Yes, with access to the mapping | The same person must be recognized across messages or documents; the application re-identifies after the model call |
| Generalization or aggregation | Exact age to age band, address to region | No | Analytics or summaries do not need individuals |
| Synthetic data | Realistic fake records | No | Testing, prompt development, evaluation datasets |

Design patterns:

- **Minimize before the model.** Send only the fields the task needs; look up account data with a tool at answer time instead of putting it in the prompt or the index.
- **Tokenize, then re-identify.** A Lambda function replaces identifiers with tokens before the call (mapping in a KMS-encrypted DynamoDB table), the model works on tokens, and the function restores the values for the authorized user only. The model, its logs and the vector store never see the real values.
- **Mask outputs** with Guardrails `ANONYMIZE` so that PII a model reproduces from its context does not reach the user, and remember that the guardrail trace still contains the original values.
- **Clean the corpus once** rather than masking at every query: redacting documents before indexing protects every future retrieval and the embeddings themselves.

> **Exam tip.** "Mask PII in prompts and responses with the LEAST operational overhead" = Guardrails sensitive information filter. "Identify which S3 buckets used for fine-tuning contain PII" = Macie. "Redact PII from documents before they are indexed" = Comprehend PII redaction job (or a Lambda using `DetectPiiEntities`). "Hide PII in invocation logs" = CloudWatch Logs data protection policy.

<!-- section: key-points -->
## Key points

- Interface endpoints: `bedrock-runtime` for inference, `bedrock-agent-runtime` for knowledge bases and flows; private DNS avoids code changes; endpoint policy plus `aws:SourceVpce` conditions.
- Least privilege on model ARNs and knowledge base ARNs; metadata filters for document-level access, built from the authenticated identity; Lake Formation for column, row and cell-level data lake access.
- CloudTrail logs inference calls as management events; knowledge base, flow and guardrail calls are data events (off by default); invocation logging (off by default) records the content.
- Bedrock does not train on or share your prompts; providers cannot reach the model deployment accounts; per-Region data retention mode `none` stores nothing.
- Macie for S3, Comprehend for pipeline text (redaction only in async jobs), Guardrails for prompts and responses, CloudWatch Logs data protection for logs.
- Retention: S3 Lifecycle expiration, log group retention, DynamoDB TTL, and re-sync of the vector store.
- Preserve utility with type masking, tokenization with re-identification, and data minimization.
