Evaluating a foundation model (FM) answers two questions: is the output good, and does the application deliver business value? The exam asks you to choose an evaluation approach (people, benchmarks, automatic metrics, a judge model), to match a metric to a task (ROUGE for summaries, BLEU for translation, BERTScore for meaning), and to pick the right measure for RAG applications, agents and business goals.

<!-- section: evaluation-approaches | objectives: 3.4.1 -->
## Approaches to evaluate FM performance

| Approach | How it works | Strengths and limits |
| --- | --- | --- |
| **Human-in-the-loop evaluation** | People rate or compare responses against criteria (helpfulness, tone, accuracy) | Captures nuance, style and domain correctness; slow and costly; needs clear instructions |
| **Benchmark datasets** | Standard datasets with expected answers scored automatically | Objective and repeatable comparison of models; may not reflect your use case |
| **Custom prompt dataset** | Your own prompts and reference answers | Measures your actual task |
| **LLM-as-a-judge** | A second model scores each response and explains the score | Scales like automation with judgment close to human review; the judge can be biased |

**Amazon Bedrock evaluations** (the Model Evaluation feature) provides several job types:

- **Programmatic (automatic) model evaluation**: built-in or custom datasets, metrics of **accuracy**, **robustness** (does the output stay correct when the input is slightly changed) and **toxicity**, for task types such as general text generation, text summarization, question and answer, and text classification. Built-in datasets include TriviaQA, BoolQ, Gigaword and RealToxicityPrompts.
- **Human-based evaluation**: your own work team (employees or subject matter experts) rates up to two models or response sets with methods such as thumbs up or down, a Likert scale, choice buttons or ordinal ranking, on metrics you define. A custom prompt dataset can contain up to 1,000 prompts.
- **LLM-as-a-judge**: a generator model answers, an evaluator model scores built-in metrics such as correctness, completeness, faithfulness, helpfulness, logical coherence, relevance, following instructions, professional style and tone, harmfulness, stereotyping and refusal, or custom metrics.
- **RAG evaluation** of knowledge bases (next sections).

You can also evaluate responses produced outside Amazon Bedrock by bringing your own inference responses. Reports are stored in the Amazon S3 bucket that you specify.

> **Exam tip.** "Compare models on our own task with subjective criteria such as brand tone" = human-based evaluation. "Quick, repeatable comparison with standard metrics" = automatic evaluation. "Human-like judgment at scale without a team" = LLM-as-a-judge.

<!-- section: evaluation-metrics | objectives: 3.4.2 -->
## Metrics to assess FM output

| Metric | What it measures | Typical task |
| --- | --- | --- |
| **ROUGE** (Recall-Oriented Understudy for Gisting Evaluation) | Overlap of words and n-grams between the generated text and a reference, oriented toward recall (how much of the reference is covered); ROUGE-N for n-grams, ROUGE-L for the longest common subsequence | **Summarization** |
| **BLEU** (Bilingual Evaluation Understudy) | Precision of n-grams of the output against one or more reference texts, with a penalty for outputs that are too short | **Machine translation** |
| **BERTScore** | Similarity of meaning, computed by comparing contextual embeddings of the output and the reference; credits paraphrases that use different words | **Semantic similarity**, summaries and answers worded differently from the reference |
| **F1, exact match** | Overlap of words between the answer and the expected answer | Question answering |
| **Accuracy** | Share of correct predictions | Classification |
| **LLM-as-a-judge** | A model applies a rubric to rate qualities that n-gram metrics cannot see | Open-ended answers: helpfulness, faithfulness, harmfulness |

> **Exam trap.** ROUGE and BLEU count matching words: a correct paraphrase can score low. When the requirement is "same meaning even with different wording", choose BERTScore. Accuracy, precision, recall and F1 of classic ML models are not the metrics for free-text generation.

<!-- section: business-objectives | objectives: 3.4.3 -->
## Does the FM meet business objectives?

A model that scores well on benchmarks can still fail the business. Evaluate it against the goal of the project:

- **Productivity**: time saved per task, documents processed per hour, share of drafts accepted without major edits.
- **User engagement**: active users, return rate, session length, use of suggestions.
- **Task engineering**: whether the task was designed so that the FM can succeed: clear task definition, the right decomposition into steps, the right inputs and success criteria agreed before launch.

Compare the FM solution with the current process or a baseline, and with cheaper alternatives such as a smaller model or a better prompt. Run pilots or A/B tests with real users before a full rollout.

<!-- section: application-evaluation | objectives: 3.4.4 -->
## Evaluating applications built with FMs

An application adds components around the model (retrieval, tools, steps), and each one can fail.

| Application | What to evaluate | AWS support |
| --- | --- | --- |
| **RAG** | Retrieval: are the retrieved passages relevant and complete? Generation: is the answer correct, complete and faithful to the passages, with correct citations? | Amazon Bedrock RAG evaluation: **retrieve-only** jobs (context relevance, context coverage) and **retrieve-and-generate** jobs (correctness, completeness, helpfulness, logical coherence, faithfulness, citation precision, citation coverage, harmfulness, stereotyping, refusal); works with Amazon Bedrock Knowledge Bases or your own RAG responses |
| **Agents** | Did the agent achieve the user's goal? Did it choose the right tool with the right parameters at each step? | **Amazon Bedrock AgentCore Evaluations**: evaluators per session (goal success rate), per trace (correctness, helpfulness, faithfulness) and per tool call (tool selection accuracy, tool parameter accuracy) |
| **Workflows** | End-to-end result and each step: errors, latency and cost per step | Evaluate each prompt or model step, then the full flow on test cases |

> **Exam trap.** A wrong RAG answer has two possible causes. Low context relevance or coverage means the **retrieval** is at fault (chunking, embeddings, data source); good context with low faithfulness means the **generation** is at fault (model or prompt).

<!-- section: alignment-metrics | objectives: 3.4.5 -->
## Business alignment metrics for AI applications

| Metric | What it shows |
| --- | --- |
| **Task completion rate** | Share of requests or sessions where the user's task was completed, without handoff to a human |
| **User satisfaction** | Ratings, thumbs up or down, satisfaction surveys, complaints |
| **Cost per interaction** | Token and infrastructure cost divided by the number of interactions; to compare with the cost of the same interaction handled by a person |
| **Containment or escalation rate** | Share of conversations resolved by the assistant versus transferred to an agent |
| **Conversion rate, revenue per user** | Commercial effect of AI recommendations or assistants |

> **Exam tip.** "Is the chatbot reducing the load on human agents?" = task completion or containment rate. "Is the solution economical?" = cost per interaction. "Do customers like it?" = user satisfaction.

<!-- section: key-points -->
## Key points

- Approaches: human evaluation, benchmark datasets, custom datasets, LLM-as-a-judge.
- Amazon Bedrock evaluations: automatic (accuracy, robustness, toxicity), human-based (your team, up to two models), LLM-as-a-judge, RAG evaluation.
- ROUGE = summaries (recall), BLEU = translation (precision), BERTScore = meaning, LLM-as-a-judge = open-ended quality.
- RAG: evaluate retrieval and generation separately; agents: goal success and tool use (AgentCore Evaluations).
- Business: productivity, engagement, task completion rate, user satisfaction, cost per interaction.
