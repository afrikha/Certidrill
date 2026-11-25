Offline benchmarks tell you whether a model can do the job; they don't tell you whether your retrieval pipeline finds the right passages, whether users trust the answers, or whether an agent reaches the goal with the right tools. This chapter covers the evaluation mechanisms that look at a GenAI application from those angles: user feedback and annotation loops, RAG evaluation with Amazon Bedrock Evaluations and LLM-as-a-judge, retrieval quality testing, and agent evaluation with Amazon Bedrock AgentCore Evaluations. Several services named in older material for these tasks (SageMaker Ground Truth, Augmented AI, Clarify, Amazon Bedrock Agents) closed to new customers on July 30, 2026; the chapter says where.

<!-- section: user-feedback | objectives: 5.1.3 -->
## User-centered evaluation and feedback loops

User feedback measures what automated metrics can't: whether the answer was useful to the person who asked. On the exam, a feedback design is judged on three properties: the rating can be **joined to the exact interaction** (prompt, retrieved context, model, prompt version), it produces **metrics you can alarm on**, and negative cases flow into an **annotation and regression process**.

| Building block | AWS implementation |
| --- | --- |
| Feedback interface | Thumbs up/down, a 1–5 rating or a free-text reason in the client; the client sends the rating with the conversation and turn identifiers |
| Capture API | API Gateway or AppSync in front of a Lambda function that writes to DynamoDB (low-latency lookups) or S3 (analytics) |
| Correlation with the interaction | Pass `requestMetadata` on `Converse` (up to 16 string key-value pairs, for example `conversationId`, `promptVersion`, `tenant`); the pairs appear in model invocation logs, which record the full request and response |
| Operational metric | Lambda publishes a custom CloudWatch metric (thumbs-down rate per prompt version or model); an alarm notifies through SNS when it rises |
| Analysis and reporting | Logs and ratings in S3, cataloged with AWS Glue, queried with Athena, visualized in AWS Quick (Quick Sight dashboards) |
| Annotation workflow | Negative or low-confidence interactions queued (SQS) for subject-matter experts in an internal review tool; reviewed answers become ground-truth examples |
| Structured expert rating | Amazon Bedrock human-based evaluation job: up to two inference sources (Bedrock models or your own precomputed responses), your own work team, custom metrics with rating methods such as thumbs up/down, Likert scale and comparison choice, up to 1,000 prompts per dataset |

Model invocation logging is **disabled by default** and configured per Region; enable it (CloudWatch Logs, S3 or both) before you need to investigate feedback, because it can't be backfilled. Bodies over 100 KB go only to S3.

The loop closes when curated feedback becomes test data: reviewed questions with expert answers form the golden dataset of RAG and model evaluation jobs and of the regression gates covered in the previous chapter. Ratings alone are noisy (few users rate, unhappy users rate more), so treat them as a signal that selects cases for review, not as a quality score.

> **Exam trap.** SageMaker Ground Truth and Amazon Augmented AI (A2I) are no longer open to new customers (since July 30, 2026), and Amazon Q Business, which had built-in thumbs up/down, is closed too. For a new design, a feedback store you build (API Gateway, Lambda, DynamoDB or S3) plus Bedrock human-based evaluation jobs is the answer; an option that starts "create a Ground Truth labeling job" or "add an A2I human loop" proposes a closed service.

> **Exam tip.** "Identify which prompt version causes the drop in user satisfaction" requires the prompt version in each interaction record. Tagging requests with `requestMetadata` (or logging the prompt ARN and version with the feedback) is what makes the comparison possible; a dashboard of overall ratings can't attribute the drop.

<!-- section: rag-evaluation | objectives: 5.1.5 -->
## Multi-perspective assessment: RAG evaluation and LLM-as-a-judge

A RAG answer can fail in two places: retrieval brought the wrong passages, or generation misused good passages. **Amazon Bedrock Evaluations** offers two RAG job types, both scored by an **evaluator (judge) model** you choose from the supported list, with results in the console and a full report in S3.

| Job type | Evaluates | Built-in metrics |
| --- | --- | --- |
| Retrieve only | The passages returned for each question | Context relevance (`Builtin.ContextRelevance`); context coverage (`Builtin.ContextCoverage`, needs a ground-truth answer) |
| Retrieve and generate | The passages and the generated answer | Correctness, completeness, helpfulness, logical coherence, faithfulness (hallucination against the retrieved text), citation precision, citation coverage, harmfulness, stereotyping, refusal |

Sources you can evaluate:

- An **Amazon Bedrock knowledge base**, with a Bedrock response generator model for retrieve-and-generate jobs (foundation models, Bedrock Marketplace, custom and imported models, prompt routers, Provisioned Throughput).
- **Bring your own inference responses**: a RAG system built outside Bedrock (another vector store, a self-hosted model) writes its retrieved passages and final answer into the dataset, and the job only judges them. This is how to compare a homegrown pipeline with a knowledge base on the same metrics.

Dataset rules: JSON Lines in S3, at most **1,000 prompts** per job; retrieve-only jobs are single turn, retrieve-and-generate jobs allow up to **5 turns** per conversation.

```json
{"conversationTurns":[{"prompt":{"content":[{"text":"What is the return window for opened electronics?"}]},"referenceResponses":[{"content":[{"text":"Opened electronics can be returned within 15 days with the receipt."}]}],"output":{"text":"You can return opened electronics within 15 days if you have the receipt.","knowledgeBaseIdentifier":"returns-rag-v2","retrievedPassages":{"retrievalResults":[{"content":{"text":"Opened electronics: 15-day return window, receipt required."}}]}}}]}
```

**Model evaluation with a judge** (no retrieval) scores any generator with `Builtin.Correctness`, `Builtin.Completeness`, `Builtin.Faithfulness`, `Builtin.Helpfulness`, `Builtin.Coherence`, `Builtin.Relevance`, `Builtin.FollowingInstructions`, `Builtin.ProfessionalStyleAndTone`, `Builtin.Harmfulness`, `Builtin.Stereotyping` and `Builtin.Refusal`. **Custom metrics** let you write your own judging prompt and rating scale (for example "complies with the brand's refund policy"); they use a separate list of supported judge models.

Choosing the perspective:

| Requirement | Mechanism |
| --- | --- |
| Score thousands of answers on faithfulness and correctness, repeatably, without people | RAG or model evaluation job with an LLM judge |
| Measure only whether the knowledge base finds the right chunks before tuning the prompt | Retrieve-only RAG job with context relevance and coverage |
| Compare an external RAG stack with a Bedrock knowledge base | Bring your own inference responses for the external stack |
| Business-specific criterion (tone, policy compliance) | Custom metric in an LLM-as-a-judge job |
| Subjective quality, legal or medical sign-off, judge calibration | Human-based evaluation job with your own work team |
| Live production signal | User feedback and sampled online evaluation |

LLM-as-a-judge is fast and cheap but not neutral: calibrate it by having experts rate a sample and checking that the judge agrees, keep the judge model and its prompt fixed between runs you compare, and prefer a judge different from the generator when you compare models.

> **Exam trap.** Programmatic metrics such as exact match or BERTScore compare strings to a reference; they don't detect an answer that is fluent but unsupported by the retrieved passages. "Detect hallucinations relative to the retrieved documents" points to the faithfulness metric of a retrieve-and-generate job (offline) or a contextual grounding check in Amazon Bedrock Guardrails (at run time).

<!-- section: retrieval-quality | objectives: 5.1.6 -->
## Retrieval quality testing

Retrieval is tested on its own, with a fixed set of questions whose relevant source documents are known, before anyone judges generated answers. Three dimensions matter: are the returned passages relevant (relevance scoring), do they contain what the answer needs (context matching), and how fast do they come back (latency).

| Dimension | How to measure on AWS |
| --- | --- |
| Relevance of each passage | `score` returned with each result of the `Retrieve` API; Context relevance metric of a retrieve-only job; reranker relevance scores |
| Coverage of the needed facts | Context coverage metric (needs ground truth); recall at k against labeled source documents (`location` and `documentId` of each result) |
| Ranking quality | Position of the first relevant result (hit rate at k, mean reciprocal rank) computed from your labeled set |
| Answer grounded in the matched context | Faithfulness and citation precision/coverage in a retrieve-and-generate job; contextual grounding check (grounding and relevance scores, threshold 0 to 0.99) at run time |
| Latency | Client-side timing of `Retrieve` and `RetrieveAndGenerate` emitted as custom CloudWatch metrics, OpenTelemetry spans per stage (embedding, search, rerank, generation) |

Retrieval settings you test and tune against the same question set:

| Setting | Effect to measure |
| --- | --- |
| `numberOfResults` (default 5) | More chunks raise coverage but add tokens, cost and noise in the prompt |
| `overrideSearchType`: `HYBRID` or `SEMANTIC` | Hybrid (vector plus text) helps with product codes and exact terms; supported on Amazon RDS (Aurora PostgreSQL), OpenSearch Serverless and MongoDB stores with a filterable text field, otherwise semantic is used |
| Reranking (`rerankingConfiguration`, `numberOfRerankedResults`) | A reranker model reorders candidates by relevance: better precision at the top, extra latency |
| Metadata filters and implicit filtering | Restrict to the right product, date or tenant; implicit filtering generates the filter from the query (Anthropic Claude models only) |
| Query decomposition (`QUERY_DECOMPOSITION`) | Splits multi-part questions into sub-queries; more retrieval calls |
| Chunking strategy | Changes what a "passage" is; it can't be changed on an existing data source, so test it on a new data source |

```bash
aws bedrock-agent-runtime retrieve \
  --knowledge-base-id KB12345678 \
  --retrieval-query '{"text": "warranty for refurbished laptops"}' \
  --retrieval-configuration '{"vectorSearchConfiguration": {"numberOfResults": 8, "overrideSearchType": "HYBRID"}}'
```

Calibrate any score cutoff on your own labeled questions, since scores depend on the embedding model and the store; a cutoff that drops low-scoring passages before generation trades coverage for precision.

> **Exam trap.** End-to-end answer quality can't tell you which stage failed. When answers are wrong and the stem asks how to find out whether retrieval is the cause, the answer is a retrieve-only evaluation (or `Retrieve` calls on a labeled set), not changing the generator model or the prompt.

> **Exam tip.** "Lowest added latency" when precision is already acceptable rules out reranking and query decomposition; "the right document is in the top 20 but rarely in the top 3" is the case reranking solves.

<!-- section: agent-evaluation | objectives: 5.1.7 -->
## Agent performance evaluation

An agent is judged on the outcome (did it complete the task), on the path (right tools, right parameters, sound reasoning) and on efficiency (steps, tokens, latency per task). For new agents, AWS documents this in **Amazon Bedrock AgentCore Evaluations**, which scores agent traces with LLM-as-a-judge evaluators. It supports agents built with **Strands Agents** and **LangGraph**, instrumented with OpenTelemetry and OpenInference, whether or not they run on AgentCore Runtime.

| Level | Built-in evaluators (selection) | What it answers |
| --- | --- | --- |
| Session | Goal success rate (`Builtin.GoalSuccessRate`); goal success rate with ground truth (success assertions) | Task completion rate |
| Trace (one turn) | Helpfulness, correctness, correctness with ground truth (expected response), faithfulness, coherence, conciseness, instruction following, response relevance, refusal, harmfulness, stereotyping | Quality of each response |
| Tool call | Tool selection accuracy (call justified, no redundant repeats); tool parameter accuracy (parameters taken from context, not invented) | Tool usage effectiveness |

You can add **custom evaluators** (your own judging criteria), which, like evaluation configurations, are private resources controlled by IAM.

| Mode | Use |
| --- | --- |
| Online evaluation | A configuration (`CreateOnlineEvaluationConfig`) reads traces from CloudWatch log groups for a service name, samples a percentage of sessions (console default 10 %), applies up to 25 evaluators, and writes scores to CloudWatch Logs and metrics (namespace `Bedrock-AgentCore/Evaluations` by default) for dashboards and alarms |
| On-demand evaluation | Score chosen trace or span IDs: investigate a customer complaint, validate a fix, analyze historical sessions |

Efficiency metrics come from observability, not from judges: AgentCore Observability records session count, latency, duration, token usage and error rates in CloudWatch, and the spans show every model and tool call, so you can count steps per completed task and spot loops. Reasoning quality in multi-step workflows is assessed by reading the trace: which tool was chosen at each step, with which inputs, and what it returned.

Amazon Bedrock Agents (now **Agents Classic**) is closed to new customers since July 30, 2026. Existing agents keep their trace (`OrchestrationTrace` with `rationale`, `invocationInput` for action groups or knowledge bases, and `observation`; `FailureTrace`; `GuardrailTrace`), which you can still use to evaluate their reasoning, but a new agent is built with AgentCore or Strands Agents and evaluated with AgentCore Evaluations.

| Requirement | Answer |
| --- | --- |
| Percentage of conversations in which customers' requests were completed, continuously in production | Online evaluation with goal success rate |
| Verify that the agent calls the refund tool only when justified and with the order ID from the conversation | Tool selection accuracy and tool parameter accuracy |
| Check a fix against the sessions that failed last week | On-demand evaluation on those trace IDs |
| Compare against expected outcomes for a test suite | Ground-truth evaluators (assertions, expected responses) |
| Agent takes too many steps and costs too much | Spans and token metrics from AgentCore Observability; steps and tokens per completed task |

> **Exam trap.** Final-answer metrics alone can rate an agent well even when it reached the answer by calling the wrong tool, repeating calls or inventing parameters. A requirement about "tool usage" or "reasoning in multi-step workflows" needs trace-level and tool-call-level evaluation.

<!-- section: key-points -->
## Key points

- Feedback must join to the interaction: `requestMetadata` and invocation logs (disabled by default), a feedback store, CloudWatch metrics and alarms, Athena and AWS Quick for analysis.
- Ground Truth, A2I, Clarify, Q Business and Bedrock Agents Classic are closed to new customers; use your own annotation flow and Bedrock human-based evaluation jobs.
- RAG evaluation: retrieve-only (context relevance, context coverage) and retrieve-and-generate (correctness, faithfulness, citation precision and coverage, and more), judged by an evaluator model; 1,000 prompts per job.
- Bring your own inference responses evaluates RAG stacks and models outside Bedrock.
- Custom metrics encode business criteria; human jobs calibrate judges and cover subjective quality.
- Retrieval testing: scores, coverage, ranking and latency on a labeled set; tune results count, hybrid search, reranking, filters and chunking one at a time.
- AgentCore Evaluations: session (goal success), trace and tool-call evaluators, online (sampled, CloudWatch) or on demand (chosen traces).
