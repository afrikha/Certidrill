# A-aws-10 — ARCHITECT AIP-C01 (2026-11-23, facts checked 2026-11-19/23)

## Guide version, availability and sources
- AWS Certified Generative AI Developer - Professional (AIP-C01) Exam Guide: **no version number, no date, no revisions page** (the `aip-01-revisions` URL returns only front matter; the PDF has no change history, only "Copyright © 2026") → `blueprint.version: 'AIP-C01'`.
- **Generally available**: the beta closed March 31, 2026 and standard-exam registration is open (AWS Training and Certification blog, "March 2026 new offerings"; standard version refreshed to include Bedrock AgentCore). The guide and certification page no longer mention a beta. So no NOT-AVAILABLE.md.
- Read via WebFetch: main page (HTML), domain 1–5 Markdown copies (domain 2 cross-checked on HTML: identical), technologies-concepts, service-mentions, in-scope, out-of-scope, PDF (per-task skill counts match: 98).
- Certification page: Professional, 180 min, 75 questions, multiple choice or multiple response, 300 USD; **English, Japanese, Korean, Simplified Chinese — no French**; no retirement or new-version date.
- Exam facts (guide): 65 scored + 10 unscored; scaled 100–1,000; **pass 750**; compensatory; no guessing penalty. Only multiple choice and multiple response (no ordering/matching) → typeMix single/multi only. Duration only on the certification page.
- fr_fr guide path serves English (meta locale en_us): no French guide; content is English-only (`languages: [en]`, no `fr` keys).

## Counts
- 5 domains (foundation 31, implementation 26, safety 20, operations 12, testing 11 %), **20 task statements, 98 objectives** (single "Skill n.n.n" list per task).
- **22 chapters**: `00-getting-started` + 21. Task 5.1 (9 objectives) split under the task file's last rule ("more than 8", professional level, as SAP-C03 did) — note that step 5 of the task says "more than 12", which would mean no split: 51-evaluation-quality-gates (5.1.1, 5.1.2, 5.1.4, 5.1.8, 5.1.9) and 52-rag-agent-evaluation (5.1.3, 5.1.5–5.1.7); 5.2 → 53-troubleshooting. Largest unsplit task: 2.1 (7).
- `check-cert.ts aip-c01`: `referential OK: aip-c01 vAIP-C01, 5 domains, 98 objectives`; 120 course problems, all expected (22 missing chapter files + 98 uncovered objectives).
- Profile: about 450 words of prose plus the two service lists.

## Unusual points
- Guide wording kept verbatim but dated: "AWS Transcribe" (1.3.2), "Amazon Bedrock Knowledge Base" (3.1.3), "Amazon Bedrock agent tracing" (3.4.1) and "Amazon Bedrock Agent evaluations" (5.1.7) — Bedrock Agents is now Agents Classic, closed to new customers; "SageMaker Data Wrangler" (1.3.1, now inside SageMaker Canvas); "Amazon Q Developer" (2.5.4, 2.5.6); "AWS Agent Squad" (2.1.1, 2.5.5, an open-source awslabs framework, availability not verified).
- In-scope list names several services closed to new customers (verified on the Services in Maintenance page and the June 2026 "AWS Service Availability Updates" What's New, effective July 30, 2026): Amazon Kendra, Amazon Q Business (and Q Business Apps), SageMaker Clarify, Model Monitor, Ground Truth, Augmented AI; plus Amazon Q Developer (sign-ups closed May 15, 2026, IDE plugins end of support April 30, 2027, successor Kiro — DevOps blog and Q Developer guide), AWS Chatbot (renamed Amazon Q Developer in chat applications), AWS App Runner (maintenance since March 31, 2026). Clarify's availability page names Bedrock Evaluations + Guardrails as the FM-evaluation replacement.
- In-scope lists both "Amazon Quick Sight" (Analytics) and "Amazon Quick" (ML); AWS docs now title the service **AWS Quick** (evolved from QuickSight; Quick Sight is a feature). Out-of-scope list still names retired services (QLDB, Lumberyard, Nimble Studio, WorkDocs, Alexa for Business, CloudEndure...), kept as published.
- Strands Agents is not in the in-scope list although skills 2.1.1, 2.1.6 and 2.5.5 name it (AgentCore is in scope).
- Bedrock Knowledge Bases vector stores (setup page): OpenSearch Serverless, OpenSearch Managed Clusters, S3 Vectors (float embeddings only, metadata 1 KB / 35 keys), Aurora PostgreSQL, Neptune Analytics, Pinecone, Redis Enterprise Cloud, MongoDB Atlas.
- Course code fences limited to bash, json, yaml, text by the task (the checker also accepts python); Python/boto3 samples go in `text`. `00-getting-started` set to 20 minutes.
- Level titles: GenAI developer themed (the task text said "solutions architect", a copy-over from SAP-C03).
- Not verified (left out): AgentCore component list beyond what earlier reports verified, Bedrock quotas, model-specific context windows, AWS Agent Squad status.
