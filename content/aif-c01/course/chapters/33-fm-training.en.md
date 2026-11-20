A foundation model (FM) is built in stages: a very expensive pre-training on a huge unlabeled corpus, then optional adaptation with much less data. The exam describes a requirement (add domain vocabulary, follow a company format, make a smaller and cheaper model, align answers with human preferences) and asks which training method fits and what data it needs.

<!-- section: training-elements | objectives: 3.3.1 -->
## Key elements of training an FM

| Element | Data | What it changes | Cost and effort |
| --- | --- | --- | --- |
| **Pre-training** | Massive unlabeled data (text, code, images), learned with self-supervision such as predicting the next token | Creates the general model and its broad knowledge | Highest: months of large accelerator clusters; done by model providers |
| **Fine-tuning** | A smaller set of **labeled** examples (prompt and expected completion) | Adjusts the model's weights for specific tasks, formats or styles | Moderate: training job billed by tokens processed, plus storage of the custom model |
| **Continuous (continued) pre-training** | Large amount of **unlabeled** domain text (contracts, medical notes, internal documents) | Extends the model's knowledge and vocabulary of a domain | Higher than fine-tuning, much lower than pre-training from scratch |
| **Distillation** | Prompts for your use case; a large **teacher** model generates the responses | Trains a smaller **student** model to approach the teacher's quality on that use case | Training cost once; afterwards the student is faster and cheaper to run |

On AWS:

- **Amazon Bedrock** customizes models without managing infrastructure. Its customization methods are supervised fine-tuning (labeled data), **reinforcement fine-tuning** (prompts or invocation logs plus reward functions written in AWS Lambda, no labeled pairs) and **distillation** (teacher responses generated from your prompts or taken from invocation logs). The resulting custom model is private to your account.
- **Amazon SageMaker AI** trains or fine-tunes models on infrastructure that you configure, including training from scratch. **SageMaker JumpStart** offers pretrained models with two fine-tuning approaches: domain adaptation on your domain-specific text, and instruction-based fine-tuning on prompt and response examples.
- Bedrock training is billed by the tokens processed (tokens in the training data × number of epochs), plus a monthly storage charge per custom model. To use the custom model, you buy **Provisioned Throughput** (dedicated capacity) or deploy it for **on-demand** inference, where available.

> **Exam trap.** Pre-training from scratch is almost never the answer for a company: it is the most expensive option. "Domain vocabulary with lots of unlabeled documents" = continued pre-training; "labeled examples for a task" = fine-tuning; "smaller, faster, cheaper model with similar accuracy" = distillation.

<!-- section: fine-tuning-methods | objectives: 3.3.2 -->
## Methods to fine-tune an FM

| Method | How it works | Typical requirement |
| --- | --- | --- |
| **Instruction tuning** | Fine-tunes on pairs of instructions and ideal responses | The model must follow instructions in a given format, tone or policy |
| **Domain adaptation** | Trains on data of one field so the model handles its terms and patterns | Legal, medical, financial or internal jargon |
| **Transfer learning** | Reuses what a pretrained model learned and trains it further on a new, related task | Little data and budget: start from a pretrained model instead of training from scratch |
| **Continuous pre-training** | Keeps the pre-training objective on new unlabeled data, repeatedly as the domain evolves | Keep the model current with a growing body of domain documents |

- All fine-tuning is a form of transfer learning: the FM's general knowledge is the starting point.
- Fine-tuning changes the model permanently, so it suits stable knowledge or behavior. For facts that change often or must be cited, RAG is usually cheaper and fresher than retraining.
- Fine-tuning can make a model forget part of its general abilities or overfit a small dataset; keep a validation dataset and evaluate the custom model against the base model.

> **Exam tip.** Choose the lightest method that meets the need: prompt engineering, then RAG, then fine-tuning, then continued pre-training, then pre-training. Each step adds cost, data and effort.

<!-- section: fine-tuning-data | objectives: 3.3.3 -->
## Preparing data to fine-tune an FM

Fine-tuning data on Amazon Bedrock is stored in Amazon S3 as JSON Lines: one example per line. For a non-conversational text task, each line has a prompt and the expected completion:

```json
{"prompt": "Classify the ticket: My card was charged twice.", "completion": "Billing"}
{"prompt": "Classify the ticket: The app crashes when I log in.", "completion": "Technical"}
```

| Factor | Good practice |
| --- | --- |
| **Data curation** | Remove duplicates, errors, irrelevant and low-quality examples; quality matters more than volume |
| **Governance** | Use only data you have the right to use; remove or mask personal data; record sources, owners and approvals; control access with IAM and encryption |
| **Size** | Enough examples to cover the task, within the model's limits; more examples raise training cost (tokens × epochs) |
| **Labeling** | Accurate, consistent labels written by people who know the domain, with clear guidelines |
| **Representativeness** | Examples that reflect real inputs, all user groups, languages and edge cases, to avoid bias |
| **Validation data** | A separate set, not used for training, to measure the custom model |

**Reinforcement learning from human feedback (RLHF)** aligns a model with human preferences:

1. Humans write prompts and high-quality responses, used for supervised fine-tuning.
2. Humans rank several responses to the same prompt; the rankings train a **reward model** that predicts what people prefer.
3. The FM is optimized with reinforcement learning to produce responses that the reward model scores highly.

Bedrock's reinforcement fine-tuning follows the same idea with reward functions that you define instead of human rankings.

> **Exam trap.** Amazon SageMaker Ground Truth and Amazon Augmented AI (A2I) have not been open to new customers since July 30, 2026; existing customers can keep using them. Do not choose them as the labeling or human review tool for a new project.

<!-- section: key-points -->
## Key points

- Pre-training: unlabeled, massive, most expensive. Fine-tuning: labeled, task-specific. Continued pre-training: unlabeled domain data. Distillation: teacher to student, smaller and cheaper.
- Amazon Bedrock customization: supervised fine-tuning, reinforcement fine-tuning, distillation; inference with Provisioned Throughput or on-demand deployment.
- Fine-tuning methods: instruction tuning, domain adaptation, transfer learning, continuous pre-training.
- Data: curated, governed, sized, accurately labeled, representative, with a validation set; JSONL prompt and completion pairs in S3.
- RLHF: human rankings train a reward model that steers the FM.
