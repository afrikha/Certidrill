Responsible AI means designing, building and operating AI systems so that they are fair, safe, truthful and accountable. The exam asks you to name the dimension at stake in a scenario, to choose the tool that enforces it (often Amazon Bedrock Guardrails), to recognize legal risks of generative AI, and to link bias and variance to underfitting, overfitting and harm to demographic groups.

<!-- section: responsible-ai-features | objectives: 4.1.1 -->
## Features of responsible AI

AWS describes these core dimensions of responsible AI:

| Dimension | Meaning |
| --- | --- |
| **Fairness** | Consider the impact on different groups of stakeholders; avoid outcomes that disadvantage a group (bias) |
| **Explainability** | Understand and evaluate the outputs of the system |
| **Privacy and security** | Obtain, use and protect data and models appropriately |
| **Safety** | Prevent harmful output and misuse |
| **Controllability** | Have mechanisms to monitor and steer the behavior of the system |
| **Veracity and robustness** | Produce correct outputs, even with unexpected or adversarial inputs |
| **Governance** | Build best practices into the AI supply chain, for providers and deployers |
| **Transparency** | Help stakeholders make informed choices about their engagement with the system |

- **Bias** is a systematic error that favors or harms some groups; **fairness** is the goal of equitable outcomes.
- **Inclusivity** means the system works for all intended users: languages, accents, ages, abilities and backgrounds.
- **Robustness** is reliable behavior under noisy, unusual or malicious input; **veracity** is truthful, accurate output (no hallucination).

<!-- section: responsible-ai-tools | objectives: 4.1.2 -->
## Tools that enforce responsible AI

**Amazon Bedrock Guardrails** applies configurable safeguards to user inputs and model responses:

| Safeguard | What it does |
| --- | --- |
| **Content filters** | Detect and filter harmful text or images in the categories Hate, Insults, Sexual, Violence, Misconduct and Prompt Attack, with a configurable strength |
| **Denied topics** | Block topics you define as out of bounds for the application (for example, investment advice) |
| **Word filters** | Block custom words and phrases, and profanity |
| **Sensitive information filters** | Block or mask personally identifiable information (PII), plus custom regular expressions |
| **Contextual grounding checks** | Detect responses that are not grounded in the source or not relevant to the query |
| **Automated Reasoning checks** | Validate responses against logical rules that you define |

- A guardrail is attached to model invocations by ID and version, or called on its own with the `ApplyGuardrail` API, which validates any text input or output without invoking a foundation model (for example, the response of a model hosted outside Amazon Bedrock).
- You configure the message returned when an input or a response is blocked.
- To measure responsible AI properties before deployment, Amazon Bedrock evaluations score toxicity, harmfulness, stereotyping and refusal.
- **AWS AI Service Cards** document the intended use cases, limitations and responsible AI design choices of AWS AI services and models.

> **Exam tip.** "Block a topic, filter hateful content or mask PII in a generative AI application, with the least effort" = Amazon Bedrock Guardrails. Instructions in the prompt alone are not an enforcement mechanism.

<!-- section: responsible-model-selection | objectives: 4.1.3 -->
## Responsible practices to select a model

- **Environmental impact**: training and running large models consumes a lot of energy. Prefer the **smallest model that meets the requirement**, reuse a pretrained model instead of training one from scratch, and consider distillation to run a smaller model.
- **Efficient infrastructure**: managed services share capacity; purpose-built accelerators such as AWS Inferentia (Inf2 instances offer up to 50% better performance per watt than comparable Amazon EC2 instances) reduce energy per inference.
- **Region**: the AWS Well-Architected sustainability pillar recommends choosing a Region based on both business requirements and sustainability goals.
- **Fit for purpose**: read the model's documentation (AI Service Cards, model cards, license) for intended use, known limitations, languages and evaluation results; test the model on your own data, including for bias.

<!-- section: legal-risks | objectives: 4.1.4 -->
## Legal risks of generative AI

| Risk | Example | Mitigation |
| --- | --- | --- |
| **Intellectual property infringement claims** | Generated text, code or images reproduce protected work | Check model licenses and indemnity terms, filter outputs, review before publishing |
| **Biased model outputs** | A screening assistant ranks candidates differently by gender | Representative data, bias evaluation, human review of decisions |
| **Loss of customer trust** | An assistant gives offensive or false answers in public | Guardrails, testing, transparency about AI use |
| **End user risk** | A user acts on wrong medical or financial advice | Denied topics, disclaimers, escalation to a human |
| **Hallucinations** | The model invents a policy, a price or a legal citation | Grounding with RAG, contextual grounding checks, output validation |

<!-- section: dataset-characteristics | objectives: 4.1.5 -->
## Characteristics of responsible datasets

- **Inclusivity**: the data represents every group that will use or be affected by the system.
- **Diversity**: varied sources, contexts, languages, formats and edge cases, so that the model generalizes.
- **Curated data sources**: trusted, documented, legally usable sources, cleaned of errors, duplicates and toxic content.
- **Balanced datasets**: no class or group heavily under-represented; rebalance (collect more, resample, weight) when it is.

> **Exam trap.** A model that performs well overall but poorly for one group usually has an under-represented group in its training data. The fix is in the data (more representative, balanced data), not a larger model.

<!-- section: bias-variance | objectives: 4.1.6 -->
## Effects of bias and variance

| | High bias | High variance |
| --- | --- | --- |
| **Fit** | **Underfitting**: the model is too simple to capture the patterns | **Overfitting**: the model memorizes the training data, including noise |
| **Symptom** | Poor accuracy on training data and on new data | Very good on training data, poor on new data |
| **Typical fixes** | More relevant features, a more complex model, longer training | More and more diverse data, simpler model, regularization, early stopping |

- The goal is a balance between the two (the bias-variance tradeoff).
- **Effects on demographic groups**: a model trained on unrepresentative data is inaccurate for under-represented groups; in lending, hiring or healthcare, this inaccuracy becomes unfair and potentially illegal treatment.

<!-- section: bias-detection | objectives: 4.1.7 -->
## Detecting and monitoring bias, trustworthiness and truthfulness

| Technique | What it reveals |
| --- | --- |
| **Analyzing label quality** | Wrong or inconsistent labels, or labels that encode past human bias |
| **Human audits** | Reviewers check samples of outputs and decisions for fairness, accuracy and harm |
| **Subgroup analysis** | Metrics (accuracy, error rates, approval rates) compared group by group to find disparities |
| **Ongoing monitoring** | Changes in data and in quality after deployment (drift) |

AWS tools:

- **Amazon SageMaker Clarify** computes pre-training and post-training bias metrics and SHAP feature attributions, and **Amazon SageMaker Model Monitor** detects data quality, model quality and bias drift on endpoints. Both have not been open to new customers since July 30, 2026; existing customers can keep using them.
- For new projects, AWS recommends the open-source `shap` library and bias formulas computed with standard libraries, the `fmeval` library or Amazon Bedrock evaluations for FMs, Amazon Bedrock Guardrails for runtime toxicity and PII filtering, and Amazon CloudWatch or AWS-published monitoring solutions for drift.
- Amazon Bedrock human-based evaluation jobs support human audits of generative AI output, and LLM-as-a-judge evaluations score stereotyping, harmfulness and faithfulness.

> **Exam trap.** Bedrock evaluations cover foundation models only; they do not compute bias metrics of a tabular, classic ML model. Never choose a service closed to new customers as the answer for a new project.

<!-- section: key-points -->
## Key points

- Dimensions: fairness, explainability, privacy and security, safety, controllability, veracity and robustness, governance, transparency.
- Amazon Bedrock Guardrails: content filters, denied topics, word filters, PII filters, contextual grounding, Automated Reasoning; also standalone with `ApplyGuardrail`.
- Responsible selection: smallest adequate model, reuse pretrained models, efficient hardware and Region.
- Legal risks: IP, bias, trust, end-user harm, hallucinations.
- Datasets: inclusive, diverse, curated, balanced. High bias = underfitting; high variance = overfitting.
- SageMaker Clarify and Model Monitor are closed to new customers since July 30, 2026.
