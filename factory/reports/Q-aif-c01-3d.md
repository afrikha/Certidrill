# Q-aif-c01-3d — QUESTIONS AIF-C01, foundation 3.4.2–3.4.5 (2026-11-19)

## Result
- 40 questions, prefix `aifc01-3d-`, 10 per objective (3.4.2, 3.4.3, 3.4.4, 3.4.5).
- Types: single 31, multi 5, ordering 2, dragdrop (matching) 2. Difficulty: 16 easy / 18 medium / 6 hard.
- `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-3d-` → 40 files, 0 problem(s).
- No course chapter for 3.4 existed when I wrote these, so I could not check them against the course.

## Sources (all fetched with WebFetch)
- Bedrock: automatic evaluation metrics per task type (`model-evaluation-report-programmatic.html`, whose H1 ends in "(console)"), LLM-as-a-judge (`evaluation-judge.html`), built-in judge metrics (`model-evaluation-metrics.html`), RAG evaluations (`evaluation-kb.html`, `knowledge-base-evaluation-metrics.html`), CloudWatch runtime metrics (`monitoring-cw.html`), application inference profiles (`inference-profiles.html`).
- AgentCore Evaluations: how it works, terminology, evaluation types (online / on-demand), built-in evaluators (`prompt-templates-builtin.html`, H1 "Prompt templates").
- Prescriptive Guidance: "Evaluating quality and reliability in generated outputs" (ROUGE / BLEU / BERTScore / LLM-as-a-judge, self-preference bias), "Architecting a successful generative AI proof of concept" (business vs technical metrics, OGSM, exit criteria, curated evaluation dataset, unit cost), "Measuring the success of generative AI in software development".
- Well-Architected: Agentic AI Lens AGENTPERF01-BP01 (task completion rate, cost per completion, CI/CD quality gates), Generative AI Lens GENPERF01-BP02.
- Lex V2 Analytics and its key definitions (conversation outcomes success / failed / dropped).
- What's New "AWS Service Availability Updates" (June 2026): checked that Bedrock Model Evaluation, Knowledge Bases, Flows, Lex and CloudWatch are not on the July 30, 2026 maintenance list.

## Choices and doubts
- Closed services avoided as right answers: Clarify / FMEval, Model Monitor, A2I, Ground Truth, Q Business, Q Developer, Bedrock Agents Classic. Agents Classic appears only as a wrong ordering action.
- The definitions of ROUGE, BLEU and BERTScore come from the Prescriptive Guidance page. The SageMaker evaluation-dimensions page (Clarify, now closed) was read but not cited.
- 3.4.3 "task engineering" is undefined in AWS docs. I covered it as breaking the business task into measurable goals and evaluating on SME-validated historical data (PoC guidance). No question uses the term itself.
- The Bedrock page calls the Q&A accuracy metric "F1 score", and it defines F1 wrongly (as precision divided by recall). I only used the name.
- I could not fetch the AgentCore "Evaluators" page (empty body). Evaluator names and levels come from the "Prompt templates" page.
- The A/B-test question (aifc01-3d-ab-test-engagement) relies on general practice. Its references mention A/B comparison only as a human preference method.
