# A-aws-3 — ARCHITECT AIF-C01 (2026-11-19)

## Guide version and sources
- AWS Certified AI Practitioner (AIF-C01) Exam Guide **v1.2, October 29, 2026** (1.0: March 26, 2026; 1.1: April 30, 2026). No version on the cover; taken from the change history. `blueprint.version: '2026-10-29'`.
- The HTML guide page (`/userguide/ai-practitioner-01.html`) failed (client error); the **PDFs** were read (EN `docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.pdf`, FR same path under `/fr_fr/`). curl is blocked by the proxy (403), so every read went through WebFetch (model-summarised); bullets were requested two task statements at a time, bullet counts per task statement cross-checked against a separate listing fetch.
- Certification page: foundational, 90 min, 65 questions, 100 USD; **no successor announced**; only the Italian and German versions retire after October 15, 2026. AIF-C01 is current.
- Exam facts: 50 scored + 15 unscored; scaled 100–1,000; pass 700; compensatory. Response types in the guide: multiple choice, multiple response, **ordering** (3–5 responses), **matching** (3–7 prompts); all scored all or nothing. **The guide does not mention case studies** (the task assumed short case studies); none modelled. Duration not stated in the guide (90 min from the certification page).

## Counts
- 5 domains (aiml 20, genai 24, foundation 28, responsible 14, governance 14 %), 14 task statements, **69 objectives**.
- 15 chapters: `00-getting-started` + 14 (one per task statement; largest is 4.1 with 7 objectives, no split).
- `check-cert.ts aif-c01`: `referential OK: aif-c01 v2026-10-29, 5 domains, 69 objectives`; 99 course problems, all expected (30 missing chapter files + 69 objectives not covered yet).

## Unusual points
- **Guide format changed**: no "Knowledge of" / "Skills in" split any more; each task statement has one "Objectives:" list. Objectives = those bullets in order.
- English typos kept or fixed: 3.4.2 "LLM-as-ajudge" written "LLM-as-a-judge"; kept verbatim: 3.4.3 "task engineering", 2.3.4 "provision throughput", 3.2.3 "using multiple comments".
- **French guide available**, change history only up to 1.1 but bullets identical to EN 1.2 (Kiro, AgentCore, Strands Agents present). Good quality; edits listed in the `objectives.yaml` header (AWS feature names back in English, accuracy = « exactitude », safety = « sûreté », a few machine-like bullets rewritten, 1.3.6 missing "accuracy" added).
- One FR fetch (tasks 2.1–3.1 together) was refused by the summariser and replaced by two narrower fetches.
- typeMix values are the task's estimate; AWS publishes no per-type share. `scoring.multi: all_or_nothing` kept as in CLF-C02/SAA-C03; ordering and matching are also all or nothing on AWS (comment only, no schema key yet).
- **Renames / closures relevant to question writers** (verified on AWS pages, flagged in the profile):
  - Guide writes "Amazon Quick"; AWS documentation now titles the service **AWS Quick** (evolved from Amazon QuickSight; Quick Sight is a feature). Objectives keep the guide's name.
  - **SageMaker Clarify and SageMaker Model Monitor are no longer open to new customers** (docs availability-change pages; What's New "AWS Service Availability Updates" gives July 30, 2026, also for Ground Truth, A2I, Debugger, Kendra, Q Business, Bedrock Agents → Agents Classic). Clarify and Model Monitor are not named in the guide's objectives but are classic AIF-C01 answers: writers must not make them the right answer for a new project.
  - Amazon Q Business closed to new customers (successor Amazon Quick); Amazon Q Developer sign-ups closed May 15, 2026, IDE plugins end of support April 30, 2027 (successor Kiro). Amazon Q is absent from the v1.2 in-scope list.
  - Comprehend topic modeling, event detection and prompt safety classification closed to new customers.
  - Six services removed from the out-of-scope list (Elastic Transcoder, Elemental MediaStore, IoT 1-Click, IoT Analytics, IoT Events, Nimble Studio): retired services.
- Ground Truth / A2I / Debugger closure taken from the What's New summary only (no docs page fetched). Profile prose ≈ 450 words (lists excluded).
