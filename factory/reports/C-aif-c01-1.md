# C-aif-c01-1 — COURSE AIF-C01, chapters 00, 11, 12, 13, 21, 22, 23, 31 (2026-11-19)

## Result
- 16 files (8 chapters × EN/FR), every objective of the task in a section marker; `check-cert.ts` → course problems (your chapters): 0 (all chapters: 0).
- English length (alphanumeric tokens incl. tables, markers excluded): 00: 1,289; 11: 1,267; 12: 1,144; 13: 1,328; 21: 1,332; 22: 894; 23: 1,232; 31: 1,353.

## Verified (WebFetch, November 19, 2026)
- SageMaker AI inference: real-time, Serverless Inference (scale to zero, cold starts, no GPU, 1–6 GB memory), Asynchronous Inference (1 GB payload, 1 h, S3 in/out, SNS, scale to zero), batch transform (no persistent endpoint).
- SageMaker Clarify and Model Monitor "no longer open to new customers" (doc banners + availability-change pages: recommended replacement = open-source monitoring solutions on MLflow/Evidently, CloudWatch custom metrics with anomaly detection, QuickSight dashboards, SHAP). What's New 2026/06 "AWS Service Availability Updates": July 30, 2026 maintenance for Bedrock Agents (→ Agents Classic), Kendra, Q Business, SageMaker A2I, Clarify, Debugger, Ground Truth, Model Monitor, Role Manager, Studio Lab...
- Bedrock Agents page: "You can no longer sign up for Amazon Bedrock Agents (now Agents Classic)"; points to AgentCore / Strands.
- Amazon Q Developer: AWS DevOps blog — new sign-ups closed May 15, 2026; IDE plugins and paid subscriptions end of support April 30, 2027; successor Kiro. Q Developer user guide: console experience renamed AWS assistant.
- Bedrock: Provisioned Throughput (model units, no commitment / 1 / 6 months, hourly); custom model inference by Provisioned Throughput **or on-demand custom model deployment**; service tiers Reserved / Priority / Standard / Flex; pricing page: batch 50 % lower for select models, on-demand per 1M input/output tokens; prompt caching (reduced cache-read rate, 5-min default TTL, not for batch); customization methods (supervised fine-tuning, reinforcement fine-tuning, distillation; continued pre-training named in the overview); distillation (teacher/student, private model); inference parameters page (temperature, top-k, top-p, response length, penalties, stop sequences); Guardrails policies; FAQ (content not used to improve base models nor shared with providers, stored in Region, PrivateLink, HIPAA eligible, SOC/ISO/GDPR, Bedrock Marketplace 100+ models).
- Knowledge Bases: managed vs customer-managed, connectors (S3, SharePoint, Confluence, Google Drive, OneDrive, web crawler), citations, reranking, document-level permission filtering; supported vector stores (OpenSearch Serverless, OpenSearch managed clusters, S3 Vectors, Aurora PostgreSQL, Neptune Analytics, Pinecone, Redis Enterprise Cloud, MongoDB Atlas); Aurora pgvector page; S3 Vectors page.
- AgentCore components (Runtime, Memory, Gateway, Identity, Code Interpreter, Browser, Observability, Policy, Evaluations, plus Harness, Payments, Optimization, Registry not used); framework/model-agnostic. Strands Agents (open source, Python and TypeScript, many providers, MCP, agents-as-tools/swarm/graph/workflow, A2A). Kiro docs (specs, steering, hooks, MCP, CLI). AWS Quick "What is" page (Quick Sight, Flows, Automate, Index, Research, Apps; evolved from QuickSight).
- Nova lifecycle: **Nova Canvas, Nova Reel (EOL September 30, 2026) and Nova Sonic v1 (EOL September 14, 2026)** — so no Nova image/video model is named; diffusion example = Stability AI Stable Diffusion models (listed in Bedrock "models at a glance").
- SageMaker AI rename (Dec 3, 2024), feature list (Canvas, Data Wrangler, Feature Store, Pipelines, Model Registry, Model Cards, Experiments, HyperPod, JumpStart); JumpStart page; Comprehend insights list; Trainium page (Inferentia mentioned); AWS AI Service Cards.

## Not fetched (memory / stable facts)
- Transcribe (speaker identification, custom vocabulary, PII redaction), Translate (documents, custom terminology), Polly, Rekognition, Textract, Personalize, Lex V2 intents/slots (Lex V2 page not fetched; V1 page only).
- Comprehend topic modeling and event detection closure taken from the profile (Comprehend availability-change page not fetched).
- Retrieve / RetrieveAndGenerate API names; DocumentDB vector search; RDS for PostgreSQL pgvector; OpenSearch k-NN and hybrid search; KMS customer managed keys for Bedrock.
- MCP and A2A definitions (open standards, not AWS docs); context engineering (no AWS page found, generic definition).
- ML metric formulas, MLOps concepts, pipeline stages (textbook).

## Deviations
- Chapters 00, 11, 13, 21, 23, 31 are 1,230–1,350 tokens (above the 1,200 fundamentals target; tables counted): 5–6 objectives each, plus the closures paragraph in 00.
- 00 question-type shares are estimates (AWS publishes none), labeled "estimate".
- "Amazon Quick" kept as the exam guide's name, with "AWS Quick" (current documentation title) stated in 00, 23 and the CLF-C02-style wording.
- Monitoring row of 13 uses CloudWatch / managed MLflow / AWS open-source solutions instead of Model Monitor (closed), as the availability-change page recommends.
