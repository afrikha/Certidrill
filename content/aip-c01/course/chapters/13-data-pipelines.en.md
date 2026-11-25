A foundation model answers only as well as the data it receives. Incomplete records, wrong encodings, unreadable scans, audio that was never transcribed or a request body in the wrong format produce hallucinations, errors and wasted tokens. This chapter covers the pipelines that sit before inference: validating data quality, converting text, documents, images, audio, video and tables into something a model can use, formatting requests for Amazon Bedrock and SageMaker AI endpoints, and enhancing inputs so that responses are more accurate and consistent. The exam tests which service fits each data type and each check, and the exact shape of model requests.

<!-- section: data-validation | objectives: 1.3.1 -->
## Validating data before FM consumption

Validation catches problems where they are cheapest to fix: before documents are embedded into a knowledge base, before records are sent to a batch inference job, or before a fine-tuning dataset is used.

| Check | Example rule | Why it matters for an FM |
| --- | --- | --- |
| Schema and types | Required columns exist, dates parse | A malformed record breaks prompt templates |
| Completeness | No empty description field | Empty context invites the model to invent |
| Uniqueness | No duplicate document IDs | Duplicates skew retrieval and waste tokens |
| Freshness | Records updated within 24 hours | Stale context produces outdated answers |
| Length | Text fits the token budget of the prompt | Truncated input loses the important part |
| Allowed values | Language code in the supported list | Wrong-language input degrades quality |
| Sensitive data | No unexpected PII | Privacy and compliance |

**AWS Glue Data Quality** is the managed, serverless answer for structured and semi-structured data. Rules are written in the Data Quality Definition Language (DQDL), built on the open-source Deequ framework:

```text
Rules = [
    IsComplete "ticket_id",
    IsUnique "ticket_id",
    ColumnLength "description" between 20 and 20000,
    ColumnValues "language" in ["en", "fr", "de"],
    DataFreshness "updated_at" <= 24 hours,
    RowCount > avg(last(10))
]
```

The last rule is a **dynamic rule**: its threshold follows the history of previous runs. Other rule types include `Completeness`, `Uniqueness`, `ColumnDataType`, `CustomSql`, `ReferentialIntegrity`, `SchemaMatch` and `DetectAnomalies`; file rules (`FileFreshness`, `FileSize`) check files directly.

| Where it runs | What it offers |
| --- | --- |
| Data Catalog tables | Rule recommendations (including an advanced mode that uses Amazon Bedrock to generate DQDL), scheduled evaluation runs, anomaly detection, evaluation of every table in scope including tables added later |
| AWS Glue ETL jobs (Evaluate Data Quality transform in Glue Studio) | Checks before data is loaded; row-level results (`rowLevelOutcomes`) to quarantine failing records; actions on ruleset failure: none (default), fail the job after loading, or fail it without loading |

Both publish results to Amazon CloudWatch and Amazon EventBridge and can write them to S3, so an EventBridge rule can stop a pipeline or alert a team when the data quality score drops.

**Data Wrangler in SageMaker Canvas** is the low-code option for data that feeds ML and FM workflows: a data flow combines sources and transforms, the **Data Quality and Insights Report** detects anomalies and quality issues, and the flow exports to S3, SageMaker Pipelines, Feature Store or a Python script.

**Custom Lambda validators** handle what rules can't express: an S3 event invokes a function that checks file type, page count, encoding or token count, moves rejects to a quarantine prefix, and publishes custom CloudWatch metrics (rejected documents, average length). CloudWatch alarms on those metrics catch a broken upstream feed.

> **Exam trap.** Rule recommendations work on Data Catalog tables, and row-level results work in ETL jobs, not the reverse. When the stem asks to "identify and remove the bad records before loading", choose an ETL job with the Evaluate Data Quality transform; when it asks to "monitor the data lake continuously", choose Data Catalog evaluation runs.

<!-- section: multimodal-processing | objectives: 1.3.2 -->
## Processing text, documents, images, audio and tables

Each data type has a path to a form the model accepts:

| Data type | Processing | AWS service |
| --- | --- | --- |
| Plain text | Clean, split, detect language and entities | Lambda, Amazon Comprehend |
| Documents (PDF, scans, forms) | Extract text, tables and fields, or send the document to a model that reads it | Bedrock Data Automation, Amazon Textract, Converse `document` blocks |
| Images | Send to a multimodal model, or extract structured fields | Converse `image` blocks, Bedrock Data Automation |
| Audio | Transcribe to text, with speaker partitioning and multi-channel analysis | Amazon Transcribe (batch from S3 or streaming), Bedrock Data Automation |
| Video | Scene summaries, on-screen text, classification; or a model with video input | Bedrock Data Automation, Converse `video` blocks (Amazon Nova) |
| Tabular data | Filter, aggregate, convert rows to text, JSON or Markdown tables | SageMaker Processing, AWS Glue, Lambda |

**Amazon Bedrock Data Automation (BDA)** turns unstructured documents, images, audio and video into structured output through one API. **Standard output** returns the common information for each data type (document summaries, audio transcripts, video scene summaries); **custom output** uses **blueprints**, lists of the fields to extract, for documents, audio and images. A **project** groups the configurations and is referenced in the `InvokeDataAutomationAsync` call. Visual grounding and confidence scores help validate the extraction.

**Amazon Transcribe** converts speech to text, in batch from S3 or in real time. It partitions speakers, analyzes multi-channel audio, filters content for privacy (PII redaction is an extra-cost feature) and supports language customization such as custom language models.

**SageMaker Processing** runs your own pre-processing or post-processing scripts on managed infrastructure: input from S3 (or Athena and Redshift), built-in containers such as scikit-learn and Spark or your own container, output to S3, resources released at the end. It fits heavy transformations of large tabular or text datasets that don't fit a Lambda function.

A multimodal pipeline usually looks like this:

```text
S3 upload -> EventBridge rule -> Step Functions workflow
  Choice on file type:
    audio -> Amazon Transcribe job -> transcript JSON in S3
    pdf/image -> Bedrock Data Automation (project with blueprint) -> fields JSON in S3
    csv -> SageMaker Processing job -> normalized records in S3
  Validation (Lambda) -> Bedrock InvokeModel or Converse -> results in DynamoDB or S3
```

A Distributed Map state processes thousands of files in parallel. Keep large payloads in S3: the Step Functions Bedrock integration accepts a `Body` of up to 256 KiB and otherwise reads the request from an S3 URI (`Input`) and can write the response to S3 (`Output`).

> **Exam tip.** "Extract specific fields from invoices, contracts and call recordings with the least custom code" is Bedrock Data Automation with blueprints. "Transcribe and then summarize call recordings" chains Transcribe and a Bedrock model; BDA also covers audio when the stem wants one managed service.

<!-- section: input-formatting | objectives: 1.3.3 -->
## Formatting requests for model inference

**InvokeModel** sends a body in the model provider's native format, so each provider needs different code. For Anthropic Claude models on Bedrock, the body uses the Messages format:

```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 1024,
  "system": "You are a claims assistant. Answer only from the provided policy.",
  "messages": [
    { "role": "user", "content": [ { "type": "text", "text": "Is water damage from a burst pipe covered?" } ] }
  ]
}
```

**Converse** uses one format for every model that supports it, which is why the exam prefers it for portability. The model ID (or inference profile ID, or prompt ARN) is a request parameter in the URI, so the body below stays the same whichever model is called:

```json
{
  "system": [ { "text": "You are a claims assistant. Answer only from the provided policy." } ],
  "messages": [
    { "role": "user", "content": [
      { "text": "Summarize the attached policy." },
      { "document": { "format": "pdf", "name": "Home policy", "source": { "bytes": "<base64>" } } }
    ] }
  ],
  "inferenceConfig": { "maxTokens": 800, "temperature": 0.2, "topP": 0.9, "stopSequences": ["END"] },
  "additionalModelRequestFields": { "top_k": 200 }
}
```

| Element | Rule |
| --- | --- |
| `system` | Separate from `messages`: instructions, role, output format |
| `messages` | Roles `user` and `assistant`; content is a list of blocks (`text`, `image`, `document`, `video`, `toolUse`, `toolResult`, `cachePoint`, `guardContent`) |
| `document` block | `format` is required, with a `text` block in the same message; `name` accepts only alphanumerics, single spaces, hyphens, parentheses and square brackets |
| `inferenceConfig` | `maxTokens`, `temperature`, `topP`, `stopSequences`, common to all models |
| `additionalModelRequestFields` | Model-specific parameters such as `top_k` |
| `promptVariables` | Values for a Prompt Management prompt given as `modelId`; then `system`, `inferenceConfig`, `toolConfig` and `additionalModelRequestFields` aren't allowed |
| Response | `output.message`, `stopReason` (for example `end_turn`, `max_tokens`), `usage` tokens, `metrics.latencyMs` |

**Conversation formatting.** The model is stateless: every call must include the prior turns of the conversation. Store the history per session (for example in DynamoDB keyed by session ID), append the new user message, and trim or summarize old turns to stay within the context window and the cost budget. When a model returns `reasoningContent`, send it back unchanged with its `signature` in the next turn. Converse applies the model-specific prompt template (for example for Meta and Mistral models), so the application doesn't build those special tokens.

**Batch inference** takes a JSONL file in S3, one record per line, with `recordId` and `modelInput`; `modelInput` matches the model's InvokeModel body, or the Converse request body when the job's invocation type is Converse. Output order isn't guaranteed, so join results on `recordId`.

**SageMaker AI endpoints** receive whatever the serving container expects, declared by `ContentType`. A text-generation container typically takes JSON with `inputs` and `parameters`; a tabular model such as XGBoost takes `text/csv` rows in the training column order, without the label.

```json
{ "inputs": "Classify the sentiment of: The repair was fast and cheap.", "parameters": { "max_new_tokens": 50, "temperature": 0.1 } }
```

> **Exam trap.** A request that worked with one provider's InvokeModel body fails when only the `modelId` changes, because native bodies differ (`max_tokens` versus other providers' field names). When the stem requires switching models without code changes, the answer uses the Converse API, not InvokeModel with a different model ID.

<!-- section: input-enhancement | objectives: 1.3.4 -->
## Enhancing input quality for better responses

Clean inputs make responses more accurate and more consistent from one request to the next.

| Technique | Implementation | Effect |
| --- | --- | --- |
| Normalization | Lambda: Unicode normalization, whitespace, dates to ISO 8601, units, currency, removing boilerplate (headers, footers, signatures) | Same meaning, same tokens; fewer wasted tokens |
| Reformatting with an FM | A small, low-cost Bedrock model rewrites messy text (emails, OCR output, notes) into a fixed structure before the main call | Consistent input for the main prompt |
| Entity extraction | Amazon Comprehend `DetectEntities` returns PERSON, ORGANIZATION, LOCATION, DATE, QUANTITY, COMMERCIAL_ITEM, EVENT, TITLE and OTHER with offsets and confidence scores | Entities become metadata, filters or structured context |
| Language detection | Comprehend dominant language detection, then translation or routing | The right prompt and model per language |
| PII handling | Comprehend PII detection or a guardrail sensitive information filter | Remove data the model doesn't need |
| Token budgeting | CountTokens API (no charge) before sending; trim the least relevant context | Requests stay within limits and cost targets |
| Query rewriting | An FM rewrites vague user questions into precise, self-contained queries using conversation history | Better retrieval and fewer clarification turns |

Comprehend offers `DetectEntities` for one document, `BatchDetectEntities` for a small batch and `StartEntitiesDetectionJob` for asynchronous jobs on S3 data; custom entity recognition handles domain entities such as policy numbers.

A typical enhancement step for a claims assistant: Lambda normalizes the email text, Comprehend extracts dates, amounts and organization names, a small Bedrock model rewrites the customer's description into "incident, date, damage, amount", and the main prompt receives that structure plus the extracted entities as labeled fields.

> **Exam tip.** "Responses vary because users describe the same issue in many ways" calls for normalizing or restructuring the input before inference (Lambda, Comprehend, a reformatting FM call), not for raising or lowering the temperature of the main model.

<!-- section: key-points -->
## Key points

- Glue Data Quality: DQDL rules, dynamic rules and anomaly detection; recommendations on Data Catalog tables; row-level results and fail actions in ETL jobs; results to CloudWatch, EventBridge and S3. Data Wrangler is now in SageMaker Canvas; Lambda validators publish custom CloudWatch metrics.
- Multimodal: Bedrock Data Automation (standard output, blueprints, projects) for documents, images, audio and video; Transcribe for speech; SageMaker Processing for heavy custom transformations; Step Functions to orchestrate, with large payloads in S3.
- InvokeModel uses each provider's native body; Converse uses one schema (`system`, `messages`, `inferenceConfig`, `additionalModelRequestFields`) and enables model switching.
- Conversations are stateless: resend history (stored in DynamoDB), trim it, and return reasoning blocks unchanged. Batch inference uses JSONL with `recordId` and `modelInput`.
- Enhance inputs with Lambda normalization, FM reformatting, Comprehend entities and language detection, PII removal, CountTokens budgeting and query rewriting.
