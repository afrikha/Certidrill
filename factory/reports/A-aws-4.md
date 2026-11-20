# A-aws-4 — ARCHITECT DVA-C03 (2026-11-19)

## Guide version and sources
- AWS Certified Developer - Associate (DVA-C03) Exam Guide: **no version number or publication date printed** (the intro refers to a "Revisions" section that does not exist on the pages). `blueprint.version: 'DVA-C03'` (stated in the blueprint header).
- Read: HTML pages and their `.md` copies (`developer-associate-03.html`, `-domain1..4`, `dva-03-in-scope-services`, `dva-03-out-of-scope-services`, `dva-03-comparison`, `dva-03-technologies-concepts`, `dva-03-service-mentions`) and the PDF. Every domain was read twice (HTML and Markdown): bullets identical. Reads via WebFetch (model-summarised); Markdown copies returned raw text.
- Dates: comparison page "DVA-C02 is in use until November 30, 2026; DVA-C03 beginning December 1, 2026" — **confirmed on AWS pages**. Registration note: the HTML page and one Markdown copy say registration for DVA-C03 "opened on October 27, 2026"; another Markdown copy (probably cached) says "opens December 1, 2026". Kept October 27 in the blueprint header.
- Certification page: 130 min, 65 questions, multiple choice / multiple response, 150 USD, DVA-C03 only (no mention of DVA-C02). Languages: English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America) — **no French exam**.
- Exam facts: 50 scored + 15 unscored; scaled 100–1,000; pass 720; compensatory; multiple response all-or-nothing. Duration not in the guide (130 min from the certification page).

## Counts
- 4 domains (development 30, security 26, deployment 22, troubleshooting 22 %; DVA-C02 was 32/26/24/18), 12 task statements, **72 objectives**.
- 13 chapters: `00-getting-started` + 12 (one per task statement; largest 1.1 with 10 objectives, no split).
- `check-cert.ts dva-c03`: `referential OK: dva-c03 vDVA-C03, 4 domains, 72 objectives`; 98 course problems, all expected (26 missing chapter files + 72 uncovered objectives).

## Unusual points
- **Domain 3 is "Testing and Deployment"** (DVA-C02: "Deployment"); code kept `deployment` as the task suggested.
- **Guide format**: single "Skill n.n.n" list per task (no Knowledge/Skills split); objective codes = the guide's skill numbers.
- **No French guide**: the fr_fr URLs (DVA-C03 and DVA-C02) serve the English text. All French group titles and objectives are our translation (BRIEF-AWS §6); principles listed in the `objectives.yaml` header. A French reviewer should check them, notably « Assumer un rôle IAM », « masquage [redaction] », « propagé [rolling] », « sondes de vivacité et de disponibilité », « Contribuer à une analyse des causes racines ».
- Out-of-scope job tasks (guide): designing architectures, designing CI/CD pipelines, administering IAM users/groups or servers, selecting FMs / prompt engineering / RAG design, designing AI safety frameworks / guardrails / governance, ETL pipelines, networking design. Note the tension with 2.3.3 (content filtering, denied topics): writers should test *applying* filters, not designing guardrail frameworks.
- **Service status (verified on AWS pages)**: Amazon Q Developer sign-ups closed May 15, 2026, IDE plugins EOS April 30, 2027, successor Kiro (DevOps blog); Q Developer not in the in-scope list, Kiro is. AWS Cloud9 closed to new customers July 25, 2024 (doc history). **AWS CodeCommit reopened to new customers November 25, 2025** (doc history) — the task's assumption that it is closed is outdated. X-Ray SDKs/daemon maintenance mode February 25, 2026, end of support February 25, 2027, migrate to OpenTelemetry (X-Ray doc history). **AWS Copilot CLI end of support June 12, 2026** (Containers blog, March 6, 2026), yet skill 3.2.4 names "AWS Copilot environments" — kept verbatim, flagged in the profile. Amazon Glacier vaults closure taken from A-aws-1 (not re-fetched).
- Guide names: "Amazon Quick" in scope, "Amazon Quick Sight" out of scope; "Strands Agents" out of scope while Bedrock AgentCore is in scope.
- Not verified (left out of the profile): numeric Lambda/DynamoDB/SQS limits; the DVA-C02 in-scope list (so no "new in-scope services" claim beyond the AI services).
- Profile: prose 449 words; ≈590 with the in-scope / out-of-scope lists.
