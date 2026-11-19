Generative AI is flexible and fast to adopt, but it can be wrong with confidence and doesn't always give the same answer twice. The exam asks you to recognize these strengths and weaknesses, the factors that decide which model to choose and the metrics that show whether a GenAI application creates business value.

<!-- section: genai-advantages | objectives: 2.2.1 -->
## Advantages of GenAI

| Advantage | What it means | Example |
| --- | --- | --- |
| **Adaptability** | One foundation model handles many tasks and domains through prompts, without a model per task | The same model summarizes contracts, drafts emails and classifies tickets |
| **Responsiveness** | Answers in seconds, at any hour, at scale | A support assistant that replies immediately to thousands of customers |
| **Conversational capabilities** | Understands natural language, follows a dialogue and keeps context | Customers describe a problem in their own words instead of navigating menus |
| **Ability to generate content** | Creates text, images, audio, video and code | Product descriptions in ten languages, first drafts of marketing copy |
| **Low entry barrier** | Usable with prompts and little or no labeled data | A pilot built in days instead of months of data collection |
| **Personalization** | Tailors the output to each user | Messages adapted to a customer's history |

<!-- section: genai-disadvantages | objectives: 2.2.2 -->
## Disadvantages of GenAI

| Disadvantage | What it means | Mitigation |
| --- | --- | --- |
| **Hallucinations** | Fluent, confident output that is false or invented (a fake citation, a policy that doesn't exist) | Ground the answers in company data with RAG, contextual grounding checks in Amazon Bedrock Guardrails, human review for critical answers |
| **Interpretability** | It is hard to explain why the model produced a given answer | Ask for sources and citations, keep humans in decisions that need justification, use an interpretable model when the regulation requires it |
| **Inaccuracy** | Errors in facts, calculations or knowledge after the training cutoff date | RAG with current data, tools for calculations, evaluation before release |
| **Nondeterminism** | The same prompt can return different answers | Lower temperature for more consistent output, fixed prompt templates, validation of the output format |
| **Bias and toxicity** | Output can reflect biases or harmful content from training data | Guardrails, evaluation on diverse test sets, human audits |
| **Cost and latency** | Large models are slower and more expensive per request | Smaller models, shorter prompts, caching, batch inference |
| **Data security and IP** | Risk of exposing sensitive data or generating content too close to protected works | Access controls, data protection, sensitive information filters, legal review |

> **Exam trap.** A model that invents a source or a fact is hallucinating; the main fix is grounding with RAG, not a higher temperature or a larger context window. Lowering the temperature makes answers more consistent, not necessarily more true.

<!-- section: model-selection-factors | objectives: 2.2.3 -->
## Factors for selecting a GenAI model

| Factor | Questions to ask |
| --- | --- |
| **Model type** | Text generation, chat, image generation, embeddings, multimodal? |
| **Performance requirements** | What quality is needed on the company's own test prompts and benchmarks? |
| **Capabilities** | Languages, reasoning, tool use, context window size, input and output modalities |
| **Constraints** | Context window, maximum output length, Region availability, customization options |
| **Compliance** | Data residency, regulatory requirements, licensing terms, the provider's responsible AI documentation |
| **Cost** | Price per input and output token, Provisioned Throughput, cost of customization |
| **Latency** | Time to first token and total response time acceptable for the user experience |
| **Model complexity and size** | Larger models are more capable on complex tasks but slower and more expensive; smaller models are often enough for simple, high-volume tasks |

Choose the smallest model that meets the quality bar: it is usually the fastest and the cheapest. Amazon Bedrock Model Evaluation compares candidate models on your own prompts before you commit.

> **Exam tip.** "Real-time chat with the lowest latency for simple questions" points to a small, fast model. "Analyze charts and photos together with text" points to a multimodal model. "Keep data in a specific country" is a compliance and Region availability factor.

<!-- section: business-value-metrics | objectives: 2.2.4 -->
## Business value and metrics for GenAI

The value of a GenAI application is measured in business terms, not only in model quality:

| Metric | What it shows | Example |
| --- | --- | --- |
| **Cross-domain performance** | How well one model performs across different tasks or business areas | The same assistant serves HR, finance and IT questions with acceptable quality |
| **Return on investment (ROI)** | Value gained compared with the total cost (development, inference, operations) | Saved agent hours versus monthly Bedrock and development costs |
| **Efficiency** | Time or effort saved per task | Average handling time of a support case down from 12 to 7 minutes |
| **Conversion rate** | Share of users who complete a desired action | More visitors buy after reading generated product descriptions |
| **Average revenue per user (ARPU)** | Revenue divided by the number of users | Personalized recommendations raise spending per customer |
| **Accuracy** | Share of correct or acceptable answers | Percentage of assistant answers validated by experts |
| **Customer lifetime value (CLV)** | Total revenue expected from a customer over the relationship | Better service increases retention and lifetime value |

Measure a baseline before launch, then compare: an A/B test against the existing process is the clearest proof of value.

> **Exam trap.** "Did the shopping assistant increase sales?" is answered by conversion rate or ARPU, not by a technical metric such as ROUGE or latency. Technical metrics judge the model; business metrics judge the application.

<!-- section: key-points -->
## Key points

- Advantages: adaptability, responsiveness, conversation, content generation, low barrier to entry.
- Disadvantages: hallucinations, poor interpretability, inaccuracy, nondeterminism, bias, cost and latency.
- Ground answers with RAG against hallucinations; lower the temperature for consistency.
- Select a model by type, performance, capabilities, constraints, compliance, cost, latency and complexity: the smallest model that meets the bar.
- Business value: ROI, efficiency, conversion rate, ARPU, accuracy, customer lifetime value, cross-domain performance.
