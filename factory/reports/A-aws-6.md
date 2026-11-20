# A-aws-6 — ARCHITECT SAP-C03 (2026-11-20, facts checked 2026-11-19/20)

## Guide version and sources
- AWS Certified Solutions Architect - Professional (SAP-C03) Exam Guide: **no version number, no publication date, no revisions page** (HTML, Markdown and PDF; the PDF only says "Copyright © 2026"). `blueprint.version: 'SAP-C03'` (stated in the blueprint header).
- Read via WebFetch: main page, domain 1–5 Markdown copies (domain 1 also HTML: same 13/4/5/5/7 bullets), in-scope/out-of-scope page, comparison page, PDF (version check only). curl not used (proxy).
- Comparison page: **SAP-C02 in use until November 16, 2026; SAP-C03 in use beginning November 17, 2026**.
- Certification page: links to SAP-C03 only (SAP-C02 not mentioned); 180 min, 75 questions, multiple choice / multiple response, 300 USD; English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America) — **no French exam**; no retirement date for any language.
- Exam facts (guide): **65 scored + 10 unscored** (75 total, as on the certification page); scaled 100–1,000; pass 720; compensatory; multiple response needs all correct answers. Duration not in the guide (certification page).

## Counts
- 5 domains (architecture 25, security 25, cost 15, resilience 15, operations 20 %), 21 task statements, **115 objectives** (single "Skill n.n.n" list per task, no Knowledge/Skills split).
- 23 chapters: `00-getting-started` + 22. Only task 1.1 (13 objectives) is over 8: split thematically into `11-event-driven-serverless` (1.1.1–1.1.5, 1.1.12) and `12-containers-edge-tenancy` (1.1.6–1.1.11, 1.1.13). Largest other tasks: 1.5 and 5.3 with 7.
- `check-cert.ts sap-c03`: `referential OK: sap-c03 vSAP-C03, 5 domains, 115 objectives`; 161 course problems, all expected (46 missing chapter files + 115 uncovered objectives).

## Unusual points
- **No French guide**: fr_fr HTML/Markdown serve English (meta locale en_us), fr_fr PDF fails. All French titles and objectives are our translation (principles in the `objectives.yaml` header). To review: « modèles d'entrée du trafic (ingress) », « mutualisées (multi-tenant) », « DNS à horizon partagé », « répartition fractionnée des coûts », « présentation des coûts (showback) », « hypothèses d'état stable », « déploiements propagés [rolling] », level titles.
- Domains are entirely new compared with SAP-C02 (comparison page lists additions, three deletions — application upgrade path, delegating to AWS, migration-tool security — and consolidations). Slugs: architecture, security, cost, resilience, operations.
- Guide wording kept verbatim: "AWS GuardDuty" (2.3.2, Amazon GuardDuty), "Amazon QuickSight" (in-scope list; AWS now documents Amazon Quick, per A-aws-1, not re-fetched), "Amazon Aurora serverless" (3.4.3, FR written « Aurora Serverless »), "AWS Cost and Usage Reports" (3.3.2).
- Verified on AWS pages for writers: AWS Transform MGN is the current name of Application Migration Service (MGN user guide title); Lambda durable functions run up to one year; Database Savings Plans exist (announced December 2025, search result only); RCPs do not affect the management account or service-linked roles and restrict external principals too.
- **Service status (verified)**: Migration Hub closed to new customers November 7, 2025; Application Discovery Service closed to new customers from November 7, 2025 (both → AWS Transform). Snowball Edge / Snow Family devices no longer offered to new customers (no date on the page; DataSync, Data Transfer Terminal, Outposts suggested). OpsWorks end of life, disabled for new and existing customers (no date on the page). CodeCommit closed July 25, 2024, reopened November 25, 2025 (in SAP-C03 scope). Amazon Q Developer new sign-ups closed May 15, 2026, end of support April 30, 2027, successor Kiro (DevOps blog). None of the closed services is in the SAP-C03 in-scope list.
- difficultyMix: the schema takes one share per level; used the middle of the task's ranges (0.15 / 0.50 / 0.35).
- Task text had two split rules (more than 12 in step 5, more than 8 in the closing note); both give the same result here (only 1.1).
- Profile: prose 450 words; about 670 with the two service lists.
