AIF-C01 is a foundational exam about artificial intelligence on AWS. Each question asks you to recognize one thing: a type of learning, an ML technique, a metric, a way to customize a foundation model, an inference parameter, a responsible AI practice or the AWS service that fits a need. You never write code or build a pipeline: the exam tests someone who uses AI/ML solutions. This chapter covers the format, a reading method, the families to tell apart and a study plan.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Certification | AWS Certified AI Practitioner |
| Exam guide | Version 1.2, October 29, 2026 |
| Duration | 90 minutes |
| Questions | 65: 50 scored and 15 unscored, which are not identified |
| Score | Scaled from 100 to 1,000; 700 passes |
| Scoring model | Compensatory: only the total score counts, there is no passing mark per domain |
| Wrong or blank answers | A blank answer counts as wrong and there is no penalty for guessing: always answer |
| Target candidate | Up to six months of exposure to AI/ML technologies on AWS; uses AI/ML solutions without building them |

The five domains don't weigh the same:

| Domain | Weight |
| --- | --- |
| Fundamentals of AI and ML | 20 % |
| Fundamentals of GenAI | 24 % |
| Applications of Foundation Models | 28 % |
| Guidelines for Responsible AI | 14 % |
| Security, Compliance, and Governance for AI Solutions | 14 % |

The exam uses four question types, all scored all or nothing:

| Type | What you do | Share (estimate) |
| --- | --- | --- |
| Multiple choice | Choose the one correct answer among four options | The large majority |
| Multiple response | Choose two correct answers among five options ("Choose two."), rarely three among six | About one question in seven |
| Ordering | Select three to five responses and put them in the correct order to complete a task, for example the stages of an ML pipeline or of the FM lifecycle | A few questions |
| Matching | Match three to seven prompts with the right responses, for example use cases with AWS services | A few questions |

There is no lab.

> **Exam tip.** Ordering and matching questions earn nothing for a partly correct answer. Fill in the items you are sure of first, then place the remaining ones by elimination. Certidrill mock exams score all 65 questions.

<!-- section: reading-questions -->
## Reading a question

A stem has one to four sentences: a company ("A retail company", "A bank") and one need, then the question: "Which solution will meet these requirements?", "Which metric should the company use?", "Which type of learning is this?". The options come from the same family, so one detail of the stem decides. Work in this order:

1. Read the question sentence first: are you choosing a concept, a technique, a metric, a parameter or a service?
2. Underline the key words of the need and the qualifier ("LEAST operational overhead", "MOST cost-effective", "without retraining the model").
3. Eliminate the options that do something close but different, then those that break the qualifier.
4. For "Choose two.", check each option on its own: each correct option must answer the question alone.

| Words in the stem | What they point to |
| --- | --- |
| "predict a number" (price, demand, temperature) | Regression |
| "assign a category", "fraud or not" | Classification |
| "group customers", "no labels" | Clustering (unsupervised learning) |
| "use the company's current documents", "without retraining" | RAG, for example Amazon Bedrock Knowledge Bases |
| "more consistent, less random answers" | Lower temperature |
| "quality of generated summaries" | ROUGE |
| "quality of machine translation" | BLEU |
| "block a topic", "mask personal data in prompts and responses" | Amazon Bedrock Guardrails |
| "document the intended use and risks of a model" | Amazon SageMaker Model Cards |
| "who invoked the model", "audit API calls" | AWS CloudTrail |

> **Exam trap.** "LEAST operational overhead" points to the managed option: a ready-to-use AI service or Amazon Bedrock before a model you train and host in SageMaker AI, prompt engineering or RAG before fine-tuning.

<!-- section: confusing-pairs -->
## Concepts and services that are easy to confuse

Learn the one-line difference between the members of each family:

| Family | Options | What separates them |
| --- | --- | --- |
| Types of learning | Supervised, unsupervised, reinforcement | Labeled examples; patterns in unlabeled data; an agent learns from rewards |
| ML techniques | Classification, regression, clustering | A category; a number; groups found without labels |
| ML metrics | Accuracy, precision, recall, F1 score, AUC | Share of correct predictions; how many flagged positives are real; how many real positives are found; balance of precision and recall; ranking quality across thresholds |
| GenAI metrics | ROUGE, BLEU, BERTScore, LLM-as-a-judge | Summaries; translations; semantic similarity with a reference; a model grades another model's answers |
| Customization | Prompt engineering, RAG, fine-tuning, continued pre-training, distillation | Better instructions; retrieved documents in the prompt; labeled examples change the weights; unlabeled domain data; a small student model learns from a large teacher |
| Inference parameters | Temperature, top-p, top-k, maximum length | Randomness; share of probability mass considered; number of candidate tokens considered; length of the response |
| Bedrock pricing | On-demand, batch, Provisioned Throughput | Pay per token; asynchronous jobs at a lower price for select models; model units reserved by the hour |
| Building with AI | Amazon Bedrock, Amazon SageMaker AI, SageMaker JumpStart | Foundation models through an API; build, train and host your own models; a hub of pretrained models to deploy and fine-tune |
| AI assistants and tools | Amazon Quick, Kiro, Strands Agents, Amazon Bedrock AgentCore | AI-powered business intelligence, research and automation for business users; agentic development environment; open-source SDK to code agents; services to deploy and operate agents at scale |
| Bedrock features | Guardrails, Knowledge Bases, Prompt Management, Model Evaluation | Safeguards on inputs and outputs; managed RAG; versioned prompts; compare models with metrics or human reviewers |
| GenAI risks | Hallucination, prompt injection, jailbreaking, poisoning | Fluent but false output; instructions hidden in input hijack the model; prompts that bypass safety rules; corrupted training data |
| Governance | AWS Config, AWS CloudTrail, AWS Artifact, Amazon Inspector, Amazon Macie | Resource configuration and compliance with rules; API activity; AWS compliance reports; vulnerability scanning; sensitive data discovery in Amazon S3 |

AWS renames and closes services, and some of the exam's classic answers are affected. Since July 30, 2026, Amazon SageMaker Clarify, SageMaker Model Monitor, SageMaker Ground Truth, Amazon Augmented AI (A2I), SageMaker Debugger, Amazon Kendra, Amazon Q Business and Amazon Bedrock Agents (now Bedrock Agents Classic) are closed to new customers. AWS points Q Business customers to Amazon Quick and agent builders to Amazon Bedrock AgentCore; Bedrock Knowledge Bases and Guardrails are not affected. Amazon Q Developer has accepted no new sign-ups since May 15, 2026, and its IDE plugins reach end of support on April 30, 2027: Kiro is the successor. The exam guide writes "Amazon Quick"; the AWS documentation now titles it AWS Quick, which evolved from Amazon QuickSight. Certidrill never makes a service closed to new customers the correct answer for a new project.

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: the vocabulary of the first module (learning types, inference, data, metrics) is reused in every later answer.
2. In the Amazon Bedrock console playground, send the same prompt with a low and a high temperature: the inference parameters become concrete.
3. For each family of the table above, write the one-line difference from memory, then compare.
4. After each domain, take a mock exam, read every explanation, including why the wrong options fail, and reread the sections linked to your mistakes.
5. Book the exam when three mock exams in a row reach 800 or more on questions you haven't seen before.

<!-- section: key-points -->
## Key points

- 90 minutes, 65 questions (15 unscored), 700 out of 1,000 to pass, no per-domain minimum, no penalty for guessing.
- Four types: multiple choice, multiple response, ordering and matching, all scored all or nothing.
- Applications of foundation models (28 %) and GenAI fundamentals (24 %) are about half of the exam.
- Find the key word and the qualifier, then eliminate the neighbors from the same family.
- Never choose a service closed to new customers, such as SageMaker Clarify, SageMaker Model Monitor or Amazon Q Business, for a new project.
