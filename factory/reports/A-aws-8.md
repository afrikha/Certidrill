# A-aws-8 — ARCHITECT DEA-C01 (2026-11-22, facts checked 2026-11-19/22)

## Guide version and sources
- AWS Certified Data Engineer - Associate (DEA-C01) Exam Guide, **version 1.1, published December 12, 2025** (Revisions page `dea-01-revisions` and PDF change history; 1.0 "first release", undated) → `blueprint.version: '2025-12-12'`.
- Read via WebFetch: main page (HTML + Markdown), domain 1–4 Markdown copies (domain 1 also fr_fr HTML: same 12 bullets), in-scope, out-of-scope, revisions, PDF (version and per-task bullet counts: 120 in total, matching the domain pages).
- Certification page: DEA-C01 only, 130 min, 65 questions, multiple choice / multiple response, 150 USD; English, Japanese, Korean, Simplified Chinese (**no French exam**); **no retirement or new-version date**; notes that the exam uses short service names (list under the Help button).
- Exam facts (guide): 50 scored + 15 unscored; scaled 100–1,000; pass 720; compensatory; no penalty for guessing. Duration not in the guide (certification page).

## Counts
- 4 domains (ingestion 34, datastore 26, operations 22, governance 18 %), 17 task statements, **120 objectives** (single "Skill n.n.n" list per task since v1.1).
- 18 chapters: `00-getting-started` + 17 (one per task statement). Largest task 1.1 has exactly 12 objectives: not "more than 12", so no split. 1.4 has 11, 1.2 has 10.
- `check-cert.ts dea-c01`: `referential OK: dea-c01 v2025-12-12, 4 domains, 120 objectives`; 156 course problems, all expected (36 missing chapter files + 120 uncovered objectives).

## Unusual points
- **No French guide**: fr_fr HTML serves English (meta locale en_us), fr_fr PDF fails. All French titles and objectives are our translation (principles in the `objectives.yaml` header). To review: « robots d'analyse [crawlers] », « convergence [fan-in] / diffusion [fan-out] », « capacité de relecture [replayability] », « lignage des données [data lineage] », « asymétrie des données [data skew] », « Dépanner les flux de travail gérés par Amazon » (3.1.2, ambiguous in English too), level titles.
- v1.1 (revisions page) merged Knowledge/Skills, added 8 skills (LLMs, Iceberg, vector indexes, business catalogs, vectorization, SageMaker Unified Studio domains/projects, SageMaker Catalog projects, governance frameworks), added Aurora, Amazon Q, Bedrock, Kendra, Data Exchange, S3 Tables to scope, removed Cloud9, CodeCommit, AWS SCT from scope (SCT still named in skill 2.4.3), and removed Honeycode, WorkDocs, Timestream, CodeWhisperer from the out-of-scope list.
- Guide wording kept verbatim: "Amazon Kinesis Data Firehose" and "MemoryDB for Redis" (in-scope list), "Amazon QuickSight" (3.2.1, 3.2.2) next to "Amazon Quick" (in-scope), 4.5.4 "Viewing ...", 2.1.7 "for example Apache Iceberg". In-scope page lists "Amazon S3 Tables" twice and SageMaker AI under both Analytics and Machine Learning (de-duplicated in the profile).
- Course code fences: `sql` is not in `COURSE_CODE_LANGUAGES` (lib/content/course.ts), so SQL goes in `text`; `python` is accepted (stated in course.yaml header and profile).
- `00-getting-started` set to 20 minutes (exam format plus how to read SQL, PySpark and JSON snippets).
- **Service status (verified on AWS pages)**:
  - **AWS CloudTrail Lake** (skill 4.4.3): no longer open to new customers from **May 31, 2026**; critical fixes only; AWS recommends migrating to Amazon CloudWatch. Writers: test what Lake does for existing users, never recommend it for a new design.
  - Maintenance (Services in Maintenance page): Amazon Kendra (in scope, announced June 30, 2026), Amazon Q Business (June 30, 2026), AWS Glue Ray jobs (March 31, 2026), S3 Select and S3 Glacier Select (July 25, 2024), S3 Glacier Direct / vaults (October 7, 2025), Application Discovery Service (in scope, October 7, 2025), Timestream for LiveAnalytics (June 20, 2025), App Runner (out of scope, March 31, 2026).
  - Full shutdown page: Kinesis Data Analytics for SQL (January 27, 2026), Snowball Edge (November 12, 2025) and Snowmobile (March 14, 2024) — "AWS Snow Family" is still in the in-scope list —, Lake Formation Governed Tables (December 31, 2024), QLDB (July 31, 2025), FinSpace (October 7, 2026), Pinpoint (October 30, 2026), IoT Events, IoT 1-Click, IoT RoboRunner, Elastic Transcoder, MediaStore, AWS IQ (out-of-scope list, kept as published).
  - AWS Data Pipeline: "no longer available to new customers", maintenance mode (no date on the page).
  - Renames: Amazon Data Firehose (docs title); Amazon Managed Service for Apache Flink; Quick docs title the service **AWS Quick** ("evolved from Amazon QuickSight", Quick Sight is a feature).
  - Amazon Q Developer: new sign-ups closed May 15, 2026; IDE plugins and paid subscriptions end of support April 30, 2027; console Q Developer continues; successor Kiro (DevOps blog + Q Developer guide).
  - SageMaker Data Wrangler integrated into SageMaker Canvas (Data Wrangler page notice).
  - AWS SCT: no availability notice on its welcome page.
  - Athena for Apache Spark: in-console notebooks only on PySpark engine version 3; Spark 3.5 release runs from SageMaker Unified Studio notebooks or Spark Connect clients (relevant to skill 3.2.4).
- Not verified (left out of the profile): MemoryDB current naming, numeric quotas (Kinesis shard throughput, Lambda limits, Redshift limits).
- Profile: prose about 450 words; about 680 with the two service lists.
