Users, auditors and regulators increasingly need to know how an AI system was built and why it produced a given output. The exam asks you to tell a transparent, explainable model from a black box, to choose the tool that documents a model (Amazon SageMaker Model Cards) or evaluates it, to weigh interpretability against performance and safety, and to recognize human-centered design practices.

<!-- section: transparent-vs-opaque | objectives: 4.2.1 -->
## Transparent and explainable models versus black boxes

| Term | Question it answers |
| --- | --- |
| **Transparency** | How was the model built and how is it used? Data sources, training process, intended use, limitations and evaluation results are disclosed |
| **Interpretability** | Can a person follow the model's inner logic directly? |
| **Explainability** | Why did the model produce this specific output, in terms a person understands? |

| | Transparent and explainable | Not transparent or explainable (black box) |
| --- | --- | --- |
| **Examples** | Linear and logistic regression, decision trees, rule-based systems | Deep neural networks, large foundation models, many ensembles |
| **Explanation** | Read from the model: coefficients, the path through the tree | Needs external techniques that approximate it, such as SHAP feature attributions, or documentation of the model |
| **Performance** | Often lower on complex data (images, language) | Often higher on complex tasks |
| **Fit** | Regulated decisions that must be justified (credit, insurance, hiring) | Tasks where quality matters more than a step-by-step justification |

> **Exam trap.** A foundation model is not explainable just because its answers are written in plain language: the text it generates is not a trace of its internal reasoning. When a regulation requires explaining each decision, a simpler interpretable model can be the right answer, even with lower accuracy.

<!-- section: transparency-tools | objectives: 4.2.2 -->
## Tools to identify transparent and explainable models

| Tool or source | What it provides |
| --- | --- |
| **Amazon SageMaker Model Cards** | One place to document a model for governance and reporting: intended uses, risk rating (unknown, low, medium, high), business details, training details (datasets, hyperparameters, metrics), evaluation results, ethical considerations, caveats and recommendations |
| **Amazon Bedrock evaluations** | Comparable scores on accuracy, robustness, toxicity and quality metrics, by automatic, human or LLM-as-a-judge evaluation |
| **AWS AI Service Cards** | AWS documentation of its AI services and models: intended uses and limitations, responsible AI design choices, performance optimization best practices |
| **Open source models** | Published weights, code and often training details that can be inspected and tested; available, for example, through SageMaker JumpStart |
| **Data documentation** | Origin, collection method, composition and processing of the training data |
| **Licensing** | Rights and restrictions on commercial use, modification and redistribution of the model and its outputs |

- Model cards are **immutable records**: any change other than the approval status creates a new version, which keeps the history for audits. A model card can be exported to PDF to share with stakeholders.
- Explainability of classic ML models (SHAP) used to be computed with Amazon SageMaker Clarify, which has not been open to new customers since July 30, 2026; AWS recommends the open-source `shap` library for new projects.

> **Exam tip.** "Document intended use, risk rating and evaluation results of a model for auditors" = SageMaker Model Cards. "Compare FMs on quality and toxicity before choosing" = Amazon Bedrock evaluations.

<!-- section: safety-transparency-tradeoffs | objectives: 4.2.3 -->
## Tradeoffs between safety and transparency

- **Interpretability versus performance**: simpler models are easier to explain but often less accurate on complex data; complex models perform better but are opaque. Measure both: the accuracy lost when you choose an interpretable model, and the explanation quality lost when you choose a complex one.
- **Transparency versus safety and security**: disclosing every detail (system prompts, guardrail rules, full model internals, training data) helps attackers craft prompt injections and jailbreaks, or extract private data. Disclose what users and auditors need (purpose, limitations, data categories, evaluation results) without exposing protections.
- **Safety controls reduce transparency**: guardrails and filters block or change responses; tell users when content is filtered and why, at an appropriate level.
- **Privacy**: publishing training data improves transparency but can expose personal data.

The right balance depends on the risk of the use case: high-impact decisions about people demand more explainability, even at some cost in performance.

<!-- section: human-centered-design | objectives: 4.2.4 -->
## Human-centered design for explainable AI

Human-centered design builds the AI system around the people who use it and are affected by it.

| Principle | Practice |
| --- | --- |
| **AI decision transparency** | Tell users that they are interacting with AI; show the sources or citations of an answer, the main factors of a decision and its confidence |
| **User-feedback mechanisms** | Thumbs up or down, ratings, corrections and reports of problems, which feed evaluation, prompt improvement and fine-tuning (RLHF) |
| **Amplified decision-making** | The AI assists people, who keep the final decision for high-stakes cases; clear, actionable explanations support it |
| **Unbiased decision-making** | Check decisions for bias across user groups and let people challenge a decision |
| **Human oversight** | Escalation to a person, review of low-confidence outputs, the ability to override the AI |
| **Accessible explanations** | Explanations adapted to the audience: plain language for customers, details for experts and auditors |

> **Exam trap.** Collecting user feedback is not enough: the design must close the loop, so that feedback is reviewed and improves the system. A "human in the loop" for high-impact decisions is a human-centered design practice, not a sign that the AI failed.

<!-- section: key-points -->
## Key points

- Transparency = how the model was built and used; interpretability = inner logic readable; explainability = why this output.
- Interpretable models (regression, decision trees) versus black boxes (deep neural networks, FMs): explainability versus performance.
- SageMaker Model Cards document intended uses, risk rating, training and evaluation; immutable versions; PDF export.
- Other sources: Bedrock evaluations, AI Service Cards, open source models, data documentation, licenses.
- Too much transparency can weaken security; filters reduce transparency; balance by risk.
- Human-centered design: disclose AI use and sources, collect and use feedback, keep humans in control of high-stakes decisions.
