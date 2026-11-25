Choosing a foundation model is not a one-time decision. Models are compared on capabilities, limits, quality, latency and price; the application must be able to switch models without a redeployment; it must keep answering when a model or a Region is throttled or unavailable; and customized models need versioning, safe rollouts and retirement. The exam tests each of these with a constraint that eliminates the tempting option: a model that lacks a modality, a model ID hard-coded in the application, a retry loop with no fallback, or a fine-tuned model deployed with no rollback.

<!-- section: model-assessment | objectives: 1.2.1 -->
## Assessing and choosing a foundation model

Start from the requirements and eliminate models on hard limits before comparing quality:

| Criterion | What to check | Typical elimination |
| --- | --- | --- |
| Modalities | Input (text, image, audio, video) and output modalities on the model card | A text-only model for scanned invoices |
| Context window and maximum output tokens | Tokens of the longest prompt with retrieved context; length of the longest answer | 150-page contracts in one prompt |
| Features | Streaming, tool use, structured outputs, reasoning, Guardrails, Knowledge Bases, prompt caching, model evaluation support | Agents that need tool calling |
| Regions and inference options | In-Region, geographic or global cross-Region profiles | A residency requirement that only a geographic profile meets |
| Lifecycle | Active or Legacy, EOL date | A Legacy model for a new application |
| Customization | Fine-tuning, distillation, Custom Model Import support | A task that needs customization of a model that offers none |
| Cost and latency | Price per input and output token, service tiers, measured latency | A large model where a small one passes the quality bar |
| Terms | EULA, provider, Marketplace offer | Licensing the legal team hasn't approved |

Every Bedrock model card shows the lifecycle state and earliest EOL date, context window, maximum output tokens, modalities, supported APIs and features, model and inference profile IDs, service tiers and Regional availability.

> **Exam trap.** Some models can't be called on demand with their bare model ID; the card requires a geographic or global inference profile ID (for example a `us.` or `global.` prefix). An option that calls such a model on demand with the bare ID in `modelId` fails for that reason, not because of permissions or quotas.

**Benchmarks and evaluation.** Public leaderboards rank general ability; the exam expects measurement on your own task. Amazon Bedrock evaluations offer four job types:

| Job type | How it scores | Use for |
| --- | --- | --- |
| Automatic (programmatic) | Built-in metrics per task type on built-in or custom prompt datasets | Fast, repeatable comparison of accuracy, robustness and toxicity |
| LLM-as-a-judge | A judge model scores each response and explains the score | Quality aspects such as correctness, completeness or helpfulness at scale |
| Human | Your employees or subject-matter experts rate responses | Subjective or regulated judgments |
| RAG evaluation | Retrieval and generation metrics for a knowledge base or another RAG source | Choosing the model and retrieval settings of a RAG application |

Automatic jobs have one task type per job:

| Task type | Accuracy metric | Robustness metric | Built-in datasets |
| --- | --- | --- | --- |
| General text generation | Real world knowledge score | Word error rate | TREX, BOLD, WikiText2, RealToxicityPrompts |
| Text summarization | BERTScore | BERTScore and deltaBERTScore | Gigaword |
| Question and answer | NLP-F1 | F1 and deltaF1 | BoolQ, NaturalQuestions, TriviaQA |
| Text classification | Accuracy | Classification accuracy and its delta | Women's Ecommerce Clothing Reviews |

Evaluations accept foundation models, Marketplace models, customized and imported models, prompt routers and models with Provisioned Throughput, so the same dataset compares every option. Include limitation tests in the same dataset: questions beyond the knowledge cutoff, long contexts and adversarial inputs.

> **Exam tip.** "Select the most cost-effective model that meets the accuracy requirement" means: evaluate several models on the same custom dataset, keep those above the bar, then pick the cheapest. Choosing the highest-scoring model or the cheapest model alone answers a different question.

<!-- section: dynamic-model-selection | objectives: 1.2.2 -->
## Switching models and providers without code changes

A model ID compiled into the application turns every model change into a release. The flexible pattern separates a stable client API, a model-agnostic call and the model choice stored as configuration.

1. **Stable façade.** Clients call Amazon API Gateway; a Lambda function behind it builds the request. Clients never see the model ID.
2. **Model-agnostic request.** The Converse API uses one request shape (`messages`, `system`, `inferenceConfig`) for every model that supports it; provider-specific settings go in `additionalModelRequestFields`. Changing the model changes the configuration, not the code.
3. **Configuration outside the code.** AWS AppConfig stores the model ID and parameters. The Lambda function reads them through the AppConfig Agent or the `StartConfigurationSession` and `GetLatestConfiguration` APIs, caches them, and picks up changes without redeployment.

```json
{
  "default": { "modelId": "global.anthropic.claude-haiku-4-5-20251001-v1:0", "maxTokens": 800, "temperature": 0.2 },
  "routes": {
    "legal-review": { "modelId": "eu.anthropic.claude-haiku-4-5-20251001-v1:0", "maxTokens": 1500 },
    "summarize": { "modelId": "<small-model-profile-id>", "maxTokens": 400 }
  },
  "fallback": { "modelId": "<fallback-model-profile-id>" }
}
```

AppConfig adds the safety that a plain environment variable lacks: validators reject a malformed configuration, deployments roll out gradually (for example to 10 %, then 20 %, then 30 % of traffic), and a CloudWatch alarm during the rollout triggers an automatic rollback. Since November 19, 2026, AppConfig also has native **AI model invocation configurations** (model identifier, inference parameters, messages such as system prompts, provider-specific custom parameters) and **AI prompt configurations** (prompts versioned separately and reused across applications), at no additional cost.

Other levers that change model behavior without code:

| Lever | What changes |
| --- | --- |
| Bedrock Prompt Management | A prompt version stores the template, variables, model and inference settings; the application calls the prompt ARN with `promptVariables` |
| Application inference profile | A taggable resource wrapping a model or cross-Region profile; the application calls the profile, and usage is tracked per application |
| Bedrock intelligent prompt routing | One router endpoint picks, per request, between two models of the same family based on predicted response quality and cost |

Intelligent prompt routing works only within one model family, is optimized for English prompts, and can't use your application's own performance data; default routers use select Amazon Nova and Meta Llama models. Routing on business rules (department, document type) stays in Lambda or Step Functions, driven by configuration.

> **Exam trap.** Storing the model ID in a Lambda environment variable avoids code changes but still updates the function and offers no gradual rollout or automatic rollback. When the stem asks to switch models safely at runtime, AppConfig is the better answer.

<!-- section: resilience | objectives: 1.2.3 -->
## Designing resilient FM applications

GenAI applications fail in specific ways, each with its own remedy:

| Failure | Signal | Remedy |
| --- | --- | --- |
| Account quota exceeded | HTTP 429 `ThrottlingException` | Retry with backoff, request a quota increase, Reserved tier or Provisioned Throughput |
| Temporary capacity shortage | HTTP 503 `ServiceUnavailable` | Retry with backoff and jitter, cross-Region inference, another Region |
| Model not offered in the application's Region | Model missing from the Region | Cross-Region inference profile, or call Bedrock in another Region |
| Regional disruption | Errors on every call in a Region | Multi-Region deployment with failover |
| Model retirement | Model enters Legacy, EOL date announced | Evaluate and migrate to an Active model before EOL |

**Cross-Region inference** routes requests from the source Region to destination Regions listed in an inference profile. Traffic stays on the AWS network, encrypted in transit; there is no extra routing charge, and the price is that of the source Region.

| | Geographic profile | Global profile |
| --- | --- | --- |
| Processing | Regions inside the geography (US, EU, APAC...) | Any supported commercial Region |
| Price | Standard | About 10 % lower |
| SCP requirement | Allow every destination Region of the profile | Allow `aws:RequestedRegion` set to `unspecified` |
| Choose for | Data residency | Cost and maximum throughput |

CloudTrail logs the call in the source Region, with the processing Region in `additionalEventData.inferenceRegion`. Inference profiles don't support Provisioned Throughput, and an SCP that blocks any destination Region makes the request fail even if other destinations are allowed.

**Retries and circuit breakers.** The AWS SDKs retry throttling and transient errors with exponential backoff. In AWS Step Functions, a `Retry` block (defaults: `IntervalSeconds` 1, `MaxAttempts` 3, `BackoffRate` 2.0; `JitterStrategy` `FULL` adds randomness) handles transient errors, and a `Catch` block sends exhausted errors to a fallback state:

```json
"AskPrimaryModel": {
  "Type": "Task",
  "Resource": "arn:aws:states:::bedrock:invokeModel",
  "Arguments": { "ModelId": "{% $states.input.modelId %}", "Body": "{% $states.input.body %}" },
  "Retry": [ { "ErrorEquals": ["States.ALL"],
               "IntervalSeconds": 2, "MaxAttempts": 3, "BackoffRate": 2.0, "JitterStrategy": "FULL" } ],
  "Catch": [ { "ErrorEquals": ["States.ALL"], "Next": "AskFallbackModel" } ],
  "Next": "ReturnAnswer"
}
```

The **circuit breaker** pattern on AWS stores the state of each dependency in a DynamoDB table: before calling, the workflow reads the status; if the circuit is open, it fails fast (or goes to the fallback) without calling; after retries are exhausted, it writes a record with an expiry timestamp, and DynamoDB TTL removes it so that calls resume (the half-open trial).

**Cross-Region deployment.** Against Regional disruptions, run the stack in two Regions behind Route 53 failover, each calling Bedrock locally or its own SageMaker AI endpoint built from the same artifacts.

**Graceful degradation** keeps a reduced service instead of an error: a smaller or different model, a cached answer, retrieved passages without generation, or a request queued in SQS with a later notification.

> **Exam trap.** A model that isn't available in the company's Region doesn't require moving the application: call it through a cross-Region inference profile. But if the stem adds that data must stay in the EU, only an EU geographic profile qualifies, and the SCPs must allow all its destination Regions.

<!-- section: customization-lifecycle | objectives: 1.2.4 -->
## Deploying and managing customized models

Amazon Bedrock offers **supervised fine-tuning** (labeled prompt and response pairs), **reinforcement fine-tuning** (training prompts or invocation logs plus reward functions, which can be Lambda functions) and **distillation** (a teacher model's responses train a smaller student model). Training is charged per token processed (tokens × epochs) plus monthly model storage; a custom model is served through Provisioned Throughput or an on-demand custom model deployment.

On **SageMaker AI**, open-weights models are fine-tuned with JumpStart or your own training code. **Low-rank adaptation (LoRA)** freezes the base weights and trains small low-rank matrices; JumpStart exposes it through hyperparameters such as `lora_r`, `lora_alpha` (usually 2 to 4 times `lora_r`) and `lora_dropout`. One base model then serves many domain adapters.

```text
# Python (boto3): attach a LoRA adapter to a base model inference component
sm.create_inference_component(
    InferenceComponentName="claims-adapter-v3",
    EndpointName="llm-endpoint",
    Specification={
        "BaseInferenceComponentName": "base-llm",
        "Container": {"ArtifactUrl": "s3://amzn-s3-demo-bucket/adapters/claims-v3.tar.gz"},
    },
)
# invoke_endpoint(..., InferenceComponentName="claims-adapter-v3") uses base model + adapter
```

The adapter component has no compute requirements of its own: it uses the resources of its base inference component. To serve customized weights on Bedrock instead, **Custom Model Import** accepts Hugging Face format weights (`.safetensors` plus configuration and tokenizer files) from S3 for supported architectures such as Llama, Mistral, Mixtral, Qwen and GPT-OSS; imported models are invoked on demand. It doesn't support embedding models, batch inference or CloudFormation.

**Versioning with SageMaker Model Registry.** Register each trained model as a new version in a model package group, with its metrics. The approval status (`PendingManualApproval` when created, then `Approved` or `Rejected`) gates deployment: with the SageMaker project templates, approving a version starts the CI/CD deployment, and rejecting the approved version redeploys the latest approved one.

```bash
aws sagemaker update-model-package \
  --model-package-arn arn:aws:sagemaker:eu-west-1:111122223333:model-package/claims-llm/7 \
  --model-approval-status Approved
```

**Automated pipelines and rollback.** A pipeline (SageMaker Pipelines or CodePipeline with CodeBuild) fine-tunes, evaluates against a golden dataset, registers the version, waits for approval and deploys. SageMaker **deployment guardrails** shift traffic from the old fleet (blue) to the new one (green) all at once, by canary or linearly, or replace capacity in rolling batches; CloudWatch alarms watched during a baking period trigger an automatic rollback. They apply to real-time and asynchronous endpoints.

**Retiring and replacing models.** Bedrock models move from **Active** to **Legacy** to **End-of-Life**. For models launched on or after September 7, 2026, the Legacy period is 6 months for most models (45 days for some), and the EOL date appears on the model card when it starts. In Legacy, new customers can't adopt the model, existing customers may lose access after 15 days of inactivity, and no new Provisioned Throughput or fine-tuning job can be created. After EOL, requests fail; migration is never automatic. Check the `modelLifecycle` field of `GetFoundationModel` or `ListFoundationModels`, evaluate replacements, then switch through configuration.

> **Exam trap.** A fine-tuned model is a snapshot: it doesn't follow the base model's updates, and it needs its own evaluation, versioning and rollback. When the requirement is "roll back automatically if error rates rise after a new model version", the answer is deployment guardrails with CloudWatch alarms, not a manual redeploy from the registry.

<!-- section: key-points -->
## Key points

- Eliminate models on hard limits (modalities, context window, features, Regions, lifecycle, terms), then compare quality, latency and cost on your own dataset with Bedrock evaluations.
- Some models need an inference profile ID (`us.`, `eu.`, `global.`) for on-demand calls; the model card says which.
- Switch models without code: Converse API plus model IDs in AppConfig (gradual rollout, alarm-based rollback, native AI model and prompt configurations since November 2026), Prompt Management versions, application inference profiles, intelligent prompt routing within one family.
- Resilience: retries with backoff and jitter, a circuit breaker in DynamoDB with TTL, cross-Region inference (geographic for residency, global for cost), multi-Region stacks, graceful degradation.
- Customization lifecycle: Bedrock fine-tuning and distillation, LoRA adapters as inference components, Custom Model Import, Model Registry approvals, deployment guardrails with rollback, migration before EOL.
