# Q-aif-c01-1b — QUESTIONS AIF-C01, domain aiml (2026-11-19)

48 questions, prefix `aifc01-1b-`, 8 per objective (1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.3.1).
Types: single 37, multi 6 (one "Choose three" with 6 options), ordering 2, dragdrop 3. Difficulty: 19 easy / 22 medium / 7 hard.
Validator: `CERT=aif-c01 npx tsx factory/validate.ts --prefix aifc01-1b-` → 48 files, 0 problem(s).

## Sources (all fetched)
Well-Architected ML Lens pages (lifecycle, business goal identification, ML problem framing, data processing, data collection, data preparation, data preprocessing, feature engineering, model training and tuning, model evaluation); SageMaker AI built-in algorithms, What is SageMaker AI, SageMaker Canvas; Prescriptive Guidance (data differences GenAI vs traditional ML; ML model interpretability); What-is pages of Transcribe, Translate, Comprehend, Lex V2, Polly, Rekognition, Textract, Personalize; Transcribe custom vocabularies, diarization, PII redaction; Translate custom terminology; Comprehend PII detection; Polly lexicons; Bedrock overview, Knowledge Bases, AgentCore overview.

## Availability decisions
- Not used as right answers: SageMaker Clarify, Model Monitor, Ground Truth, Q Business, Q Developer, Kendra (profile); **Amazon Fraud Detector** (closed to new customers since Nov 7, 2025, availability page fetched); **Amazon Forecast** (closed to new customers, not re-verified, simply avoided); Comprehend topic modeling / event detection / prompt safety (availability page fetched); Rekognition Streaming Video and Bulk Image Analysis (closed April 30, 2026, availability page fetched).
- Fraud detection and forecasting are tested as application types / techniques only, no service answer.

## Notes
- Scoring NOTE kept on multi and dragdrop stems as in CLF-C02/SAA-C03, although AWS scores all four types all or nothing.
- 1.3.1 kept service-free (stages of the pipeline) to avoid overlapping 1.3.4 (services per stage, batch 1c).
- French: « masquage des PII (redaction) », « partitionnement des locuteurs (diarisation) », « réglage fin (fine-tuning) », « ingénierie des caractéristiques (feature engineering) », « Formulation du problème de ML » aligned with chapter 13-ml-lifecycle.fr.md.
- Reference title for AgentCore: "Overview - Amazon Bedrock AgentCore" and Bedrock "Overview - Amazon Bedrock" (the H1 is only "Overview").
