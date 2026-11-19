# Q-aif-c01-2b — report

60 questions in `content/aif-c01/questions/genai/`, prefix `aifc01-2b-`: 12 per objective (2.1.6, 2.2.1, 2.2.2, 2.2.3, 2.2.4).
Types: single 45, multi 8, ordering 3, dragdrop 4. Difficulty: 24 easy / 27 medium / 9 hard. Validator: 0 problem(s).

## Deviations and choices
- Overlap with sibling batches: after reading `aifc01-2a-*` and `aifc01-2c-*`, I removed/replaced my drafts that duplicated their decisions
  (distillation teacher/student, intelligent prompt routing, smallest-model-meets-quality, context window for a long contract,
  multimodal image input, AgentCore long-term memory "window seat" example, contextual grounding check for unsupported claims,
  synthetic data, text-to-image product concepts, AgentCore Gateway + Code Interpreter). `aifc01-2b-sel-geo-inference-profile`
  is the data-residency counterpart of `aifc01-2c-cost-global-cris` (opposite answer, on purpose).
- No closed service is a correct answer (no Clarify, Model Monitor, Q Business, Q Developer, Bedrock Agents Classic, Kendra).
- Scoring NOTE kept on multi and dragdrop stems, as in the clf-c02 / ai-901 examples (AWS scores all or nothing; the loader ignores it for now).
- French: « peaufinage (fine-tuning) » as in the objectives file; « inférence interrégionale » for cross-Region inference;
  « revenus moyens par utilisateur », « valeur du cycle de vie du client », « exactitude », « performances interdomaines » as in objectives.yaml.

## Sources and doubts
- Business-metric definitions (conversion rate, ARPU, CLV, ROI) have no definitional page in AWS documentation; questions cite
  the ML Lens KPI best practice (MLPERF01-BP01), the gen AI PoC guide (OGSM, unit economics) and the CLV Analytics guidance.
- Agentic patterns come from AWS Prescriptive Guidance (agentic-ai-patterns: routing, chaining, parallelization, orchestration,
  evaluator loops, multi-agent collaboration, memory-augmented agents). The A2A page is thin (says only "cross-platform agent
  ecosystems"); the question relies on that plus AgentCore Runtime supporting MCP and A2A.
- Amazon Nova facts (Sonic speech-to-speech, modalities) come from the Nova Version 1 user guide; Nova 2 pages were not read.
- "Supported foundation models in Amazon Bedrock" now only points to "models at a glance"; cited for Region availability per model.
- Benefits/limitations of GenAI come from aws.amazon.com/what-is pages (generative AI, foundation models, LLM) and the
  Generative AI Lens definitions page (hallucination, interpretability).
