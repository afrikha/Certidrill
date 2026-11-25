Governance turns safety and privacy controls into something an auditor can verify: documented models, traceable data sources, logged decisions, policies applied the same way in every account, and monitoring that detects and fixes violations. Exam questions describe a regulated company (finance, healthcare, insurance, public sector) and ask which AWS mechanism produces the evidence, enforces the policy centrally, or detects drift and misuse with the least custom code.

<!-- section: compliance-frameworks | objectives: 3.3.1 -->
## Building a compliance framework for FM deployments

A compliance framework answers four auditor questions with four kinds of evidence:

| Auditor question | Evidence | AWS mechanism |
| --- | --- | --- |
| What is this model, what is it for, what are its limits and risks? | Model documentation | **Amazon SageMaker Model Cards** (created programmatically) and, for AWS-provided models, AWS AI Service Cards |
| Where did the data come from and how was it transformed? | Data lineage | **AWS Glue Data Catalog** (records transformations and operations on cataloged data), with job and table metadata |
| Which source produced this piece of content? | Source attribution | Metadata tags on documents, carried into knowledge base citations |
| What did the system decide, for whom, and why? | Decision logs | **CloudWatch Logs**: model invocation logs plus structured application decision logs |

**Programmatic model cards.** `CreateModelCard` takes a name, a JSON `Content` that follows the model card schema (up to 100,000 characters), a `ModelCardStatus` (`Draft`, `PendingReview`, `Approved`, `Archived`), an optional KMS key (`SecurityConfig`) and tags. The schema covers the model overview, **intended uses** with a `risk_rating` (`High`, `Medium`, `Low`, `Unknown`), business details, training details, **evaluation details**, and additional information such as ethical considerations and caveats. Every edit other than a status change creates a new version, so history is preserved; cards export to PDF for regulators; a card can be linked to a model version in **SageMaker Model Registry**.

```json
{
  "ModelCardName": "claims-summarizer-ft-v4",
  "ModelCardStatus": "PendingReview",
  "Content": "{\"model_overview\":{\"model_description\":\"Fine-tuned summarizer for insurance claim notes\",\"model_owner\":\"genai-platform\"},\"intended_uses\":{\"intended_uses\":\"Internal adjusters only\",\"risk_rating\":\"Medium\",\"explanations_for_risk_rating\":\"Summaries inform but do not decide claims\"}}",
  "SecurityConfig": { "KmsKeyId": "1234abcd-12ab-34cd-56ef-1234567890ab" },
  "Tags": [ { "Key": "data-classification", "Value": "confidential" } ]
}
```

Generate the card in the deployment pipeline from the evaluation job outputs, so the documented results always match the deployed version, and block promotion until the status is `Approved`.

**Decision logs.** Model invocation logging records the prompt, response, model ID, caller ARN and token counts, and accepts caller-supplied `requestMetadata` key-value pairs (for example `useCase`, `tenant`, `promptVersion`). Add an application log event per decision with the request ID, the prompt template version, the guardrail version and action, the retrieved document IDs and the final outcome. CloudWatch Logs Insights then reconstructs any decision; an S3 copy with Object Lock and a lifecycle rule meets long retention requirements.

> **Exam trap.** CloudTrail shows that a principal called `InvokeModel` on a model; it does not contain the prompt or the response. Regulators who ask "what did the assistant tell this customer" need model invocation logging or application decision logs.

<!-- section: data-source-tracking | objectives: 3.3.2 -->
## Tracking data sources and attributing generated content

**Register sources.** Every dataset used for retrieval, fine-tuning or evaluation is registered in the **AWS Glue Data Catalog** (databases and tables with schema, location and properties), populated by **crawlers** or defined manually. Lake Formation governs access to the same catalog, and Athena queries it. The catalog becomes the inventory that answers "which data feeds which GenAI application".

**Tag sources for attribution.** For Amazon Bedrock Knowledge Bases with an S3 data source, attach a metadata file next to each document, named after it with `.metadata.json` appended (10 KB maximum):

```json
{
  "metadataAttributes": {
    "source_system": { "value": { "type": "STRING", "stringValue": "policy-library" }, "includeForEmbedding": false },
    "document_owner": { "value": { "type": "STRING", "stringValue": "compliance-team" }, "includeForEmbedding": false },
    "effective_date": { "value": { "type": "NUMBER", "numberValue": 20260901 }, "includeForEmbedding": false }
  }
}
```

The attributes are returned in the `metadata` of each `retrievedReferences` entry of a citation, alongside the source `location` (S3 URI, web URL, SharePoint or Confluence URL), so the application can display "Source: policy-library, owned by compliance-team, effective 2026-09-01". `includeForEmbedding: true` prepends the attribute to the chunk before embedding (it then influences semantic search); `false` keeps it only for filtering and attribution. Tag S3 objects and AWS resources as well (`data-classification`, `owner`, `source`) so cost, access and lineage reports use the same vocabulary.

**Audit logging with AWS CloudTrail.**

| Event type | Amazon Bedrock operations | Default |
| --- | --- | --- |
| Management events | `InvokeModel`, `InvokeModelWithResponseStream`, `Converse`, `ConverseStream`, all control plane calls (`CreateGuardrail`, `PutModelInvocationLoggingConfiguration`...) | Logged |
| Data events | `Retrieve` and `RetrieveAndGenerate` (`AWS::Bedrock::KnowledgeBase`), `InvokeFlow` (`AWS::Bedrock::FlowAlias`), `ApplyGuardrail` including guardrail evaluations during inference (`AWS::Bedrock::Guardrail`), `InvokeAgent`, `InvokeInlineAgent` | Not logged; enable with advanced event selectors, extra charge |

```bash
aws cloudtrail put-event-selectors --trail-name genai-audit \
  --advanced-event-selectors '[
    {"Name": "Knowledge base queries",
     "FieldSelectors": [
       {"Field": "eventCategory", "Equals": ["Data"]},
       {"Field": "resources.type", "Equals": ["AWS::Bedrock::KnowledgeBase"]}]},
    {"Name": "Guardrail evaluations",
     "FieldSelectors": [
       {"Field": "eventCategory", "Equals": ["Data"]},
       {"Field": "resources.type", "Equals": ["AWS::Bedrock::Guardrail"]}]}
  ]'
```

For streaming calls, Amazon Bedrock also records a stream-completion event (`eventType` `AwsServiceEvent`) with token counts and the `inferenceRegion`, which differs from the source Region when a cross-Region inference profile served the request: useful evidence for data residency reviews.

<!-- section: organizational-governance | objectives: 3.3.3 -->
## Organizational governance systems

An organizational framework maps each policy to an owner, a technical control and the evidence that proves it is applied:

| Policy statement | Control | Evidence |
| --- | --- | --- |
| Only approved models may be used | Service control policy (SCP) in AWS Organizations denying `bedrock:InvokeModel` on model ARNs outside an allow list; IAM permissions per application | SCP in the organization, CloudTrail denials |
| Every model call is filtered by the corporate guardrail | **Guardrail enforcement** at organization or account level | `DescribeEffectivePolicy`, guardrail CloudWatch metrics |
| Prompts are reviewed before production | Amazon Bedrock Prompt Management versions promoted by a pipeline with an approval step | Prompt versions, pipeline history |
| Only approved architectures are deployed | AWS Service Catalog products built with AWS CloudFormation (VPC endpoints, logging, guardrail, KMS keys preconfigured) | Provisioned products |
| Workloads are reviewed against best practices | AWS Well-Architected Tool with the Generative AI Lens | Review reports and improvement plans |
| Each model is documented and risk-rated | SageMaker Model Cards with an approval status | Approved cards |

**Guardrail enforcement** applies a guardrail to Amazon Bedrock model invocations without any change to application code:

- **Organization level**: an **Amazon Bedrock policy** (`BEDROCK_POLICY`), a declarative policy type of AWS Organizations, attached to the root, OUs or accounts. It names a guardrail version per Region, can include or exclude models (for example, exclude embedding models), and chooses selective or comprehensive evaluation of system prompts and messages. Enable the policy type from the management account.
- **Account level**: `PutEnforcedGuardrailConfiguration`, configured in each Region.
- Requirements: a **numeric** guardrail version (immutable, so member accounts cannot alter it) and a resource-based policy that lets member accounts call `bedrock:ApplyGuardrail` on the shared guardrail. Automated Reasoning policies are not supported in enforced guardrails.
- At run time, organization, account and request guardrails all apply; the most restrictive control wins.

```json
{
  "bedrock": {
    "guardrail_inference": {
      "eu-west-1": {
        "corporate_baseline": {
          "identifier": { "@@assign": "arn:aws:bedrock:eu-west-1:111122223333:guardrail/gr-corp:2" },
          "model_enforcement": {
            "included_models": { "@@assign": ["ALL"] },
            "excluded_models": { "@@assign": ["amazon.titan-embed-text-v2:0"] }
          }
        }
      }
    }
  }
}
```

> **Exam tip.** "Apply the same content policy to every Bedrock call in all accounts of the organization without changing application code" = organization-level guardrail enforcement with an Amazon Bedrock policy. An SCP can deny calls, but it cannot inject a guardrail; the `bedrock:GuardrailIdentifier` condition key denies calls that omit the guardrail, so every application must still pass it.

Responsible AI principles (fairness, explainability, privacy and security, safety, controllability, veracity and robustness, governance, transparency) become concrete policies in this table; the next chapter covers how to implement them.

<!-- section: continuous-monitoring | objectives: 3.3.4 -->
## Continuous monitoring and automated governance controls

| Signal | How to detect it | Automated response |
| --- | --- | --- |
| Policy violations | Guardrails metrics in `AWS/Bedrock/Guardrails`: `InvocationsIntervened` by `GuardrailPolicyType` (content, topic, word, sensitive information, contextual grounding) and `GuardrailContentSource` (input or output); Automated Reasoning `FindingCounts` | CloudWatch alarm, SNS notification, review queue |
| Misuse | Token bursts per principal (Logs Insights on `identity.arn` in invocation logs), spikes of prompt-attack interventions, CloudWatch anomaly detection on invocation and token metrics | EventBridge rule, Lambda that disables the API key or usage plan, or revokes the role session |
| Output drift | Scheduled Amazon Bedrock evaluation jobs on a fixed golden dataset (correctness, faithfulness), scores published as custom metrics | Alarm on a drop, rollback to the previous prompt or model version |
| Bias drift | Same scheduled jobs with `Builtin.Stereotyping` and per-segment scores (prompts grouped by `category`), tracked over time | Alarm when the gap between segments exceeds the threshold you defined |
| Sensitive data in logs | CloudWatch Logs data protection `LogEventsWithFindings` metric, Macie findings on log buckets | Mask at ingestion, notify the data owner |
| Configuration drift | Changes to guardrails, logging configuration or endpoint policies in CloudTrail, AWS Config rules | EventBridge rule, Lambda remediation, Config remediation |

**Bias drift without closed services.** SageMaker Clarify and SageMaker Model Monitor (including its bias drift monitor) are **no longer open to new customers** since July 30, 2026. AWS's replacements: Amazon Bedrock evaluations and Guardrails for foundation models, and, for classical ML models, the AWS-published monitoring solutions (open-source libraries with MLflow, EventBridge, Lambda, Athena and SNS) or custom CloudWatch metrics with anomaly detection alarms. Do not design a new system on Clarify or Model Monitor.

**Token-level redaction and response logging.**

- Guardrails `ANONYMIZE` replaces each detected entity with its type in the response the user sees.
- Comprehend `DetectPiiEntities` returns character offsets, so a Lambda function can redact exact spans in text it logs or forwards.
- CloudWatch Logs data protection policies mask sensitive tokens in log events at ingestion, account-wide or per log group; only principals with `logs:Unmask` see the originals. Events ingested before the policy are not masked.
- Invocation logs are not masked by Guardrails, and the guardrail trace contains the original values: apply the log data protection policy to the invocation log group.

**AI output policy filters** combine Guardrails (semantic policies) with deterministic Lambda checks for rules that a filter cannot express: mandatory disclaimers, no promises of approval, no prices that differ from the catalog. A failed check blocks or rewrites the response and emits a custom metric, so audits see both the rule and how often it fired.

> **Exam trap.** Detect-only mode (`NONE` action) is a governance tool: it lets you measure how often a new policy would intervene, through metrics and traces, before you switch it to `BLOCK`.

<!-- section: key-points -->
## Key points

- Evidence for auditors: SageMaker Model Cards (statuses `Draft`, `PendingReview`, `Approved`, `Archived`; versioned; PDF export), Glue Data Catalog lineage, metadata-based source attribution, decision logs in CloudWatch Logs.
- Knowledge base `.metadata.json` attributes come back in citations; `includeForEmbedding` controls whether they are embedded.
- CloudTrail: inference calls are management events; knowledge base, flow, guardrail and agent runtime calls are data events, off by default. CloudTrail never holds prompts.
- Central enforcement: Amazon Bedrock policy (`BEDROCK_POLICY`) at organization level or account-level enforcement, numeric guardrail version, no application change; SCPs restrict which models can be called.
- Monitor `InvocationsIntervened` and other `AWS/Bedrock/Guardrails` metrics, token anomalies, scheduled evaluations for drift and bias drift, and automate remediation with EventBridge and Lambda.
- Clarify and Model Monitor are closed to new customers: use Bedrock evaluations, Guardrails and custom CloudWatch metrics.
- Redaction: Guardrails `ANONYMIZE`, Comprehend offsets, CloudWatch Logs data protection (`logs:Unmask`).
