# C-aif-c01-2 — course AIF-C01, chapters 32, 33, 34, 41, 42, 51, 52 (EN + FR)

Checker: `course problems (your chapters): 0`. 14 files, all chapters `draft`; course.yaml untouched. English wc 1,070–1,527 per chapter (tables and code included; prose near the 1,200 fundamentals bound, 32 and 41 slightly above because of 5 and 7 objectives).

## Sources fetched (2026-11-19)

- SageMaker: Clarify availability change, Model Monitor availability change, Model Cards, ML Lineage Tracking, JumpStart fine-tuning; AWS "Service availability updates" (June 2026 What's New: Clarify, Model Monitor, Ground Truth, A2I, Debugger, Role Manager... closed to new customers July 30, 2026).
- Bedrock: prompt engineering concepts; Prompt management (overview, create, deploy with versions, optimize); customization (custom-models, fine-tuning, data prep, distillation, custom model inference); evaluations (overview, task types and built-in datasets, LLM-as-a-judge, judge metrics, human jobs, RAG evaluation and RAG metrics); Guardrails (overview, contextual grounding, ApplyGuardrail); prompt injection security; data protection; FAQ; model invocation logging; cross-Region inference; watermarking.
- AgentCore: Identity, Policy, Evaluations, built-in evaluators.
- Nova Canvas: image generation, negative prompts, prompting best practices.
- Generative AI Security Scoping Matrix; AWS Responsible AI page and resources (AI Service Cards); Inferentia page (Inf2 up to 50% better performance/watt); WA SUS01-BP01; Inspector; Artifact; Trusted Advisor check reference; RLHF "What is".

## Decisions and doubts

- **Continued pre-training on Bedrock**: the current Bedrock customization page lists only supervised fine-tuning, reinforcement fine-tuning and distillation (the fine-tuning page title dropped "or continued pre-training"). The course describes continued pre-training as a concept and does not claim Bedrock offers it; JumpStart domain adaptation is cited instead. Review before questions say "Bedrock continued pre-training".
- Clarify and Model Monitor presented as existing tools closed to new customers since July 30, 2026, with AWS's documented replacements (shap, fmeval / Bedrock evaluations, Guardrails, CloudWatch and aws-samples monitoring solutions). Ground Truth and A2I closure mentioned in 33.
- Bedrock automatic summarization accuracy uses BERTScore (not ROUGE); ROUGE/BLEU described as general metrics, no claim that Bedrock computes them.
- Bedrock feature named "Amazon Bedrock evaluations" (lowercase on the docs page); guide says Model Evaluation(s).
- Guide's "using multiple comments" (3.2.3) interpreted as iterative refinement over several exchanges; "task engineering" (3.4.3) interpreted as task design/decomposition. Both are unclear in the guide.
- Human-centered design principles (amplified / unbiased decision-making) written from general AWS training material, not from a fetched page.
- Data integrity practices (versioning, Object Lock, checksums), Glue data quality rules, Lake Formation fine-grained permissions, Config conformance packs, CloudWatch Logs retention: stable knowledge, not re-fetched.
- Policy in AgentCore page also mentions a second policy language ("Dogwood"); left out, only Cedar named.
- On-demand inference for custom models written as "where available" (the page lists it as an option without model scope).
