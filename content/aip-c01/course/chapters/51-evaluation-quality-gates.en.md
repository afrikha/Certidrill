A generative model has no single accuracy number: the same question has many acceptable answers, and an answer can be fluent, relevant and wrong at the same time. Evaluation questions ask how to measure quality, how to compare models or configurations, how to stop a regression before it reaches production and how to prove to stakeholders that a change is an improvement. This chapter covers quality metrics for FM outputs, Amazon Bedrock Evaluations and live A/B and canary testing, continuous quality assurance with automated gates, reporting, and validation of deployments when a model, prompt or knowledge base changes. RAG, retrieval, agent and user-feedback evaluation are in the next chapter.

<!-- section: quality-metrics | objectives: 5.1.1 -->
## Quality metrics for FM outputs

Traditional ML evaluation compares a prediction with one label (accuracy, F1, RMSE). FM outputs are open text, so the assessment framework scores several dimensions, each with a method that fits it:

| Dimension | Question | Typical method |
| --- | --- | --- |
| Relevance | Does the answer address the question asked? | LLM-as-a-judge (`Builtin.Relevance`), embedding similarity between question and answer |
| Factual accuracy (correctness) | Is it true, compared with a reference? | Reference answers with judge correctness, exact match or F1 for short answers |
| Faithfulness | Does it stay within the provided context? | Judge faithfulness, Guardrails contextual grounding score |
| Completeness | Does it cover every part of the question? | Judge completeness with a reference answer |
| Consistency | Same question, same substance? | Repeated sampling and output comparison, logical coherence scoring |
| Fluency and style | Readable, well formed, right tone? | Judge coherence and professional style and tone |
| Safety | Harmful, biased or refusing wrongly? | Toxicity, harmfulness, stereotyping, refusal metrics |

**Metric families.**

- **Programmatic (reference-based) metrics** are cheap and repeatable but reward word overlap: BERTScore (semantic similarity to a reference), F1 on tokens, word error rate for robustness to perturbed prompts, toxicity classifiers.
- **LLM-as-a-judge** scores meaning and gives an explanation per response; it handles open answers but needs a capable judge model and periodic calibration against human ratings.
- **Human evaluation** is the reference for subjective quality (brand voice, helpfulness, domain expertise) and for validating the judge; it is slow and costly, so use it on samples.

The Bedrock judge's built-in metrics are `Builtin.Correctness`, `Builtin.Completeness`, `Builtin.Faithfulness`, `Builtin.Helpfulness`, `Builtin.Coherence` (logical coherence), `Builtin.Relevance`, `Builtin.FollowingInstructions`, `Builtin.ProfessionalStyleAndTone`, and the responsible AI metrics `Builtin.Harmfulness`, `Builtin.Stereotyping` and `Builtin.Refusal`. Custom metrics with your own judge prompt cover domain criteria such as "cites the policy number".

> **Exam trap.** BLEU-style or exact-match scores penalize a correct answer phrased differently. When the stem requires judging meaning, helpfulness or tone at scale without a human team, the answer is LLM-as-a-judge, not a lexical metric.

<!-- section: model-evaluation-systems | objectives: 5.1.2 -->
## Model evaluation systems and live testing

**Amazon Bedrock Evaluations job types.**

| Job type | How it scores | Facts to know |
| --- | --- | --- |
| Programmatic (automatic) | Built-in algorithms on built-in or custom datasets | Task types: general text generation, text summarization, question and answer, text classification; metric categories accuracy, robustness, toxicity; up to 1,000 prompts in a custom dataset |
| Model as a judge | A second LLM scores each response and explains the score | Built-in and custom metrics; you choose the judge model from the supported list |
| Human-based | Your own workers rate responses | Up to two inference sources compared; rating methods such as thumbs up/down, Likert scale (individual or comparison), choice buttons, ordinal ranking; up to 1,000 prompts |
| RAG evaluation | Judge metrics on retrieval and generation | Covered in the next chapter |

Built-in datasets per task include TREX, BOLD, WikiText2 and RealToxicityPrompts (generation), Gigaword (summarization), BoolQ, NaturalQuestions and TriviaQA (question and answer), and Women's Ecommerce Clothing Reviews (classification). Domain applications need a custom dataset in S3, JSON Lines with `prompt`, `referenceResponse` (required for accuracy and robustness) and an optional `category` that breaks scores down per category:

```json
{"prompt": "What is the return window for opened electronics?", "referenceResponse": "15 days with the original receipt.", "category": "returns"}
{"prompt": "Can I change the delivery address after shipping?", "referenceResponse": "No. Contact the carrier with the tracking number.", "category": "delivery"}
```

Evaluation jobs can target foundation models, Amazon Bedrock Marketplace models, customized and imported models, prompt routers and Provisioned Throughput models. With **bring your own inference responses**, the dataset already contains responses (from any model, including one hosted outside Bedrock) and the job only scores them. Results go to the S3 location you specify; the console shows a summary card per metric with a score histogram and explanations for the first five prompts.

**Multi-model evaluation and cost-performance analysis.** Run one dataset against each candidate and add the operational side:

| Measure | Computed from |
| --- | --- |
| Token efficiency | Quality score per 1,000 tokens, average input and output tokens per answer |
| Latency-to-quality ratio | p90 latency or TTFT against the quality score |
| Cost per correct answer | Token cost divided by the number of answers scored correct |
| Business outcome | Resolution rate, conversion, escalations avoided, measured in a live test |

**A/B and canary testing of FMs in production.** Offline scores predict; live traffic confirms.

- **Bedrock-based applications**: the application chooses the model or prompt version per request. AWS AppConfig multi-variant feature flags with the `split` operator assign a stable percentage of users to each variant, and AppConfig deployment strategies roll a flag change out gradually with a bake time that rolls back if a CloudWatch alarm fires.
- **SageMaker AI endpoints**: production variants split traffic by weight; `TargetVariant` forces a request to one variant; `UpdateEndpointWeightsAndCapacities` shifts weights without redeploying. **Shadow tests** send a copy of live requests to a shadow variant whose responses are never returned to users (not available with serverless or asynchronous inference, multi-model or multi-container endpoints). **Deployment guardrails** shift traffic all at once, canary (a small portion first) or linear (n steps), watch CloudWatch alarms during a baking period and roll back automatically.

> **Exam trap.** A shadow test compares a new model on real traffic with zero user impact; an A/B test exposes real users to the new model to measure business outcomes. "Validate latency and errors of a new model without affecting users" is shadow testing; "measure which model increases conversions" is A/B.

<!-- section: quality-assurance | objectives: 5.1.4 -->
## Continuous quality assurance and quality gates

FM behavior changes when anything around it changes: the model version, the prompt template, the inference parameters, the knowledge base content, the guardrail. Quality assurance runs the same tests every time.

**Continuous evaluation workflow.**

1. A trigger: a pipeline run, a new prompt version, a knowledge base sync, or an EventBridge Scheduler rule for periodic runs.
2. AWS Step Functions starts an evaluation job (`CreateEvaluationJob`) on the golden dataset, or runs inference and scoring in Lambda for custom checks.
3. A step reads the results from S3, publishes scores as CloudWatch custom metrics and compares them with the baseline.
4. Alarms or the pipeline act on the comparison.

**Regression testing for model outputs.** Keep a versioned golden dataset that grows with every production incident (each reported bad answer becomes a test case). Compare the candidate with the current production configuration on the same prompts: aggregate scores, per-category scores (a global average can hide a collapse in one category) and pass/fail assertions such as valid JSON, required disclaimer present, no PII.

**Automated quality gates for deployments.** In AWS CodePipeline, a CodeBuild stage runs the evaluation and fails the build when a threshold is missed, which stops the pipeline before deployment:

```yaml
version: 0.2
phases:
  build:
    commands:
      - python run_eval.py --dataset s3://example-eval/golden/v12.jsonl --config candidate.json --out results.json
      - python check_gate.py --results results.json --min-correctness 0.85 --max-regression 0.02 --max-p90-latency-ms 3000
```

Gate criteria combine quality (minimum scores, maximum regression per category), safety (zero harmful outputs on the red-team set) and operations (latency, tokens per answer). Add a manual approval action when a human must review borderline results.

> **Exam tip.** A quality gate runs before release and blocks it; a CloudWatch alarm with automatic rollback acts after release on live traffic. A complete answer often uses both: gate in the pipeline, canary with alarm-based rollback in production.

<!-- section: reporting | objectives: 5.1.8 -->
## Reporting to stakeholders

Each audience needs a different view of the same evaluation data:

| Audience | Content | Tool |
| --- | --- | --- |
| Executives, product owners | Business outcomes, cost per conversation, quality trend, adoption | AWS Quick dashboards (Quick Sight feature) over S3 results queried with Athena |
| Engineering, operations | Latency, errors, throttles, token usage, scores per release | CloudWatch dashboards, Amazon Managed Grafana |
| ML and prompt engineers | Per-metric, per-category scores, judge explanations, failing prompts | Bedrock evaluation report cards and S3 results |
| Risk and compliance | Safety metric results, guardrail interventions, human review outcomes | Scheduled reports from the stored results and audit logs |

**Automated reporting mechanisms.** Evaluation jobs write results to S3; a scheduled Lambda function or Step Functions workflow aggregates them, writes a summary (for example a JSON or CSV table to S3 for the dashboard data set), and notifies through Amazon SNS or Amazon Q Developer in chat applications. Reports update without manual work after every pipeline run.

**Model comparison visualizations.** Side-by-side bars per metric and model, a scatter plot of quality against cost per request (the efficient frontier shows which models are never worth choosing), score distributions rather than averages, and trends per release so a slow decline is visible.

<!-- section: deployment-validation | objectives: 5.1.9 -->
## Deployment validation during FM updates

Models are updated by providers, prompts are edited, knowledge bases are synced: each change can alter answers without any code change. Pin explicit model IDs and prompt versions so updates are deliberate, watch the `LegacyModelInvocations` metric for calls to models that are moving to the end of their lifecycle, and validate every change.

**Synthetic user workflows.** Amazon CloudWatch Synthetics canaries are scripts (Node.js, Python or Java) that run on a schedule, as often as once per minute, and follow the same steps as a user: open the chat, ask a known question, check the answer. They publish metrics in the `CloudWatchSynthetics` namespace (dimension `CanaryName`) and can use X-Ray active tracing. Alarm on canary failures to detect a broken flow even when no real user is active.

**AI-specific output validation.**

| Risk after an update | Check |
| --- | --- |
| Hallucination rate rises | Golden questions with reference answers scored for correctness; Guardrails contextual grounding (grounding and relevance thresholds between 0 and 0.99) on RAG answers |
| Semantic drift (answers change meaning or tone) | Embedding similarity between new and baseline answers to the same prompts, alert below a threshold |
| Format breaks | JSON schema validation, required fields, length limits |
| Refusals or safety changes | Refusal and harmfulness metrics on the safety test set |

**Automated consistency checks.** Ask each validation question several times at low temperature and compare the responses; ask paraphrases of the same question and check that the facts match. Inconsistent answers to paraphrases indicate a fragile prompt or retrieval.

**Safe rollout of the update.** Release the new configuration to a canary group (AppConfig flag, SageMaker canary traffic shifting or a weighted Lambda alias), run the synthetic checks and the sampled quality scoring on that group, and roll back automatically when an alarm fires during the bake time.

> **Exam trap.** HTTP health checks and latency alarms do not detect a model that answers confidently but wrongly after an update. Deployment validation for FMs needs content checks: golden answers, grounding scores or drift measures.

<!-- section: key-points -->
## Key points

- FM quality is multidimensional: relevance, correctness, faithfulness, completeness, consistency, fluency, safety.
- Bedrock Evaluations: programmatic (four task types, accuracy/robustness/toxicity, up to 1,000 prompts), judge (11 built-in metrics plus custom metrics), human (up to two inference sources), RAG; bring your own inference responses for external models.
- Compare models on quality and cost together: token efficiency, latency-to-quality, cost per correct answer.
- Live testing: AppConfig `split` flags for A/B, SageMaker production variants, shadow tests without user impact, deployment guardrails canary or linear with auto-rollback.
- Quality gates in CodePipeline block a release before deployment; alarms with rollback protect live traffic.
- Validate FM updates with Synthetics canaries, golden answers, grounding checks and drift measures, not only health checks.
