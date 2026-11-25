AWS describes responsible AI in eight dimensions: fairness, explainability, privacy and security, safety, controllability, veracity and robustness, governance, and transparency. Earlier chapters covered safety, privacy and governance controls. This chapter covers the three skills the exam tests here: making FM outputs transparent (reasoning, evidence, confidence, traces), measuring fairness with systematic evaluations, and building applications that demonstrably follow written responsible AI policies.

<!-- section: transparent-outputs | objectives: 3.4.1 -->
## Transparent AI systems

Transparency means a user or reviewer can see *why* an answer was given, *what* it is based on, and *how sure* the system is.

| Transparency need | Technique | AWS implementation |
| --- | --- | --- |
| Why this answer | User-facing explanation | A `rationale` field in a structured output, or a summary of the model's reasoning |
| What it is based on | Evidence presentation and source attribution | Knowledge Bases `citations` (answer span plus `retrievedReferences` with content, location and metadata); Converse `citationsContent` blocks for document citations |
| How sure the system is | Confidence metrics and uncertainty | Grounding and relevance scores, judge scores, retrieval scores, published to CloudWatch |
| What an agent did, step by step | Reasoning traces | AgentCore Observability traces and spans; `enableTrace` on Agents Classic for existing agents |

**Reasoning displays.** Models that support reasoning return their chain of thought in a `reasoningContent` block of the Converse response, separate from the `text` answer. Reasoning improves accuracy on multi-step tasks but adds latency and output tokens, and not every model supports it or lets you set the reasoning budget. Do not stream raw reasoning to end users by default:

- Guardrails evaluates user inputs and model responses **excluding reasoning content blocks**, so raw reasoning is unfiltered.
- Raw reasoning can contain abandoned hypotheses that read like facts.

The safer pattern is to ask for a short, user-facing explanation as part of the answer (for example a `rationale` field in a JSON Schema structured output), which the guardrail does evaluate, and to keep raw reasoning in protected logs for reviewers.

**Evidence presentation.** Show the passages behind each sentence: map each citation's `span` (start and end offsets in the generated text) to its references, display a snippet, the document title and link from `location`, and attributes such as effective date from `metadata`. If a sentence has no citation, mark it or remove it. For Anthropic models, structured outputs and citations cannot be enabled in the same request (the request fails), so pick per use case.

**Confidence metrics in CloudWatch.** Quantify uncertainty with signals you already have, and publish them as custom metrics (with dimensions such as `UseCase`, `ModelId` and `PromptVersion`) through `PutMetricData` or the CloudWatch embedded metric format in Lambda logs:

| Signal | Source |
| --- | --- |
| Grounding and relevance scores | Guardrail trace of the contextual grounding check |
| Judge score | A second model call or an evaluation job scoring the answer |
| Retrieval strength | Scores of the top retrieved passages; number of passages above a threshold |
| Self-consistency | Agreement between several sampled answers to the same question |
| Abstention rate | Share of answers where the assistant said it did not know |

Alarm on trends (a falling average grounding score), and use per-request thresholds in the application: below the threshold, show a "low confidence" label, ask a clarifying question, or route to a person.

**Agent reasoning traces.** Amazon Bedrock Agents is now **Agents Classic** and is closed to new customers since July 30, 2026; its `enableTrace` option on `InvokeAgent` returns step-by-step traces (prompts, reasoning, action group and knowledge base calls) for existing agents only. For new agents, built with Strands Agents or another framework and run on **Amazon Bedrock AgentCore**, use **AgentCore Observability**: OpenTelemetry-compatible traces and spans for each step of the workflow, CloudWatch dashboards with session count, latency, duration, token usage and error rates, and custom spans you add in agent code. All data lands in CloudWatch.

> **Exam trap.** The exam guide names "Amazon Bedrock agent tracing". For a new design, do not choose Agents Classic; the equivalent capability is AgentCore Observability on agents hosted in AgentCore.

<!-- section: fairness-evaluation | objectives: 3.4.2 -->
## Fairness evaluations

For FMs, unfairness shows up as differences between groups in answer quality, tone, refusal rate, stereotypes or recommendations. Measure it the way you measure quality: with defined metrics, fixed datasets and repeatable jobs.

**Define fairness metrics first.** Typical pre-defined metrics, computed per demographic segment and compared:

| Metric | Fair when |
| --- | --- |
| Quality score gap (correctness, helpfulness) | Scores are similar across segments |
| Refusal rate gap | The assistant does not refuse one group's questions more often |
| Stereotyping rate | Low, and similar across segments |
| Sentiment or toxicity gap | Tone does not change with the group |
| Outcome gap (for example, recommended credit limit in a counterfactual pair) | Identical inputs that differ only in a protected attribute get the same outcome |

Publish each segment's value as a CloudWatch custom metric with a `Segment` dimension, compute gaps with metric math, and alarm when a gap exceeds the threshold the governance team set. The thresholds are a policy decision; the metrics make them enforceable.

**Counterfactual testing with Prompt Management.** Store the evaluation prompt as an Amazon Bedrock Prompt Management template with variables (for example the applicant's name, gender or age band), render the same scenario with each value, and compare the outputs. Prompt Management keeps **versions** (immutable snapshots) and **variants** (alternative messages, models or inference settings) that you can test and compare in the prompt builder.

**Systematic A/B testing.** To compare two prompts or two models on fairness and quality:

1. Create both as versions in Prompt Management, or as two versions of an Amazon Bedrock Flows flow (the exam guide's "Prompt Flows").
2. Run both on the same counterfactual dataset offline; in production, split traffic in the application or with a feature flag (AWS AppConfig) and tag each call with `requestMetadata` (`promptVersion`).
3. Compare segment metrics in CloudWatch and promote the winner; with Flows, point the alias to the chosen version (the application keeps calling `InvokeFlow` on the alias).

**Automated evaluations with LLM-as-a-judge.** Amazon Bedrock evaluations offers:

| Job type | Fairness-relevant content |
| --- | --- |
| Automatic (programmatic) | Toxicity and robustness metrics; built-in **BOLD** dataset (Bias in Open-ended Language Generation: profession, gender, race, religious ideologies, political ideologies; 100-prompt sample); custom JSONL datasets up to 1,000 prompts, with a `category` key to report scores per group |
| Model as a judge | Built-in responsible AI metrics `Builtin.Harmfulness`, `Builtin.Stereotyping` (stereotypes of any kind, positive or negative) and `Builtin.Refusal`, plus quality metrics such as `Builtin.Correctness` and `Builtin.Faithfulness`; custom metrics with your own rubric |
| Human evaluation | Your reviewers rate outputs when judgment is nuanced or regulated |

Use the `category` key to label each prompt with its segment so the report breaks scores down by group, and run the same job on every candidate model and prompt version. Before a judge score becomes a release gate, compare it with a sample rated by your own reviewers.

```json
{"prompt": "Write a short reference letter for Maria, a nurse with 10 years of experience.", "category": "female-name"}
{"prompt": "Write a short reference letter for James, a nurse with 10 years of experience.", "category": "male-name"}
```

> **Exam tip.** "Detect whether a model's answers contain stereotypes, with the LEAST operational overhead" = Bedrock model evaluation with LLM-as-a-judge and the Stereotyping metric. SageMaker Clarify bias reports are for tabular models and Clarify is closed to new customers.

<!-- section: policy-compliant-systems | objectives: 3.4.3 -->
## Policy-compliant AI systems

A written responsible AI policy becomes compliant behavior only when each clause maps to a control and a check.

**Guardrails from policy requirements.**

| Policy clause | Guardrail configuration |
| --- | --- |
| "The assistant must not give medical, legal or investment advice" | Denied topics, one per subject, with a precise definition and sample phrases |
| "No hateful, violent or sexual content" | Content filters at `HIGH` strength on input and output |
| "Customers' personal data must not appear in answers" | Sensitive information filters, `ANONYMIZE` or `BLOCK`, plus regex for internal identifiers |
| "Answers must be based on approved documents" | Contextual grounding check with tuned thresholds |
| "Statements about eligibility must follow the published rules" | Automated Reasoning policy built from the rules document |
| "Never name competitors" | Word filter |
| "The same policy applies to every team" | One guardrail version enforced at organization or account level |

**Model cards that document FM limitations.** Users and reviewers must know what the model should not be used for. Use the provider's documentation and **AWS AI Service Cards** (intended use cases, limitations, responsible AI design choices) for AWS models, and a **SageMaker model card** for your fine-tuned or customized model or your application's use of an FM: intended and unintended uses, risk rating, evaluation results (including fairness metrics), ethical considerations and caveats. Keep the card's evaluation section in step with the deployed version.

**Automated compliance checks with Lambda.**

| When | Check | Action on failure |
| --- | --- | --- |
| Pre-deployment (CodePipeline stage invoking Lambda) | Model ID on the approved list, guardrail attached with a numeric version, required policies present (PII, prompt attack), invocation logging enabled, model card `Approved`, fairness gaps within thresholds | Fail the stage |
| Run time (post-processing Lambda) | Required disclaimer present, no forbidden commitments, output schema valid, citations present for factual answers | Rewrite, block, or route to a person; emit a custom metric |
| Scheduled (EventBridge Scheduler) or on change (EventBridge rule on CloudTrail events) | Guardrail configuration and logging configuration unchanged; new models or knowledge bases registered | Notify the owner, open a ticket, or revert |

For human oversight of high-impact outputs, orchestrate review with Step Functions (task token callbacks) rather than Amazon Augmented AI, which is closed to new customers.

> **Exam trap.** A system prompt that says "follow the company's responsible AI policy" is not a control: it can be overridden by prompt injection and leaves no evidence. Compliance comes from enforced guardrails, documented models, automated checks and logs.

<!-- section: key-points -->
## Key points

- Transparency: user-facing rationale (raw `reasoningContent` is not evaluated by Guardrails), citations with spans and metadata, confidence signals as CloudWatch custom metrics, and agent traces.
- New agents: AgentCore Observability (OpenTelemetry traces, CloudWatch dashboards); `enableTrace` belongs to Agents Classic, closed to new customers.
- Fairness: define per-segment metrics and thresholds, test counterfactual prompts with Prompt Management variables, A/B test prompt or flow versions, compare in CloudWatch.
- Bedrock evaluations: BOLD dataset and toxicity in automatic jobs; Harmfulness, Stereotyping and Refusal in LLM-as-a-judge jobs; `category` for per-group scores; human jobs for nuance.
- Policy compliance: map each clause to a Guardrails policy, document limitations in AI Service Cards and SageMaker model cards, and run Lambda checks before deployment, at run time and on a schedule.
- Clarify and Augmented AI are closed to new customers; use Bedrock evaluations and Step Functions review workflows.
