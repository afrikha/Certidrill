# A-aws-9 — ARCHITECT DOP-C02 (2026-11-23, facts checked 2026-11-23)

## Guide version and sources
- AWS Certified DevOps Engineer - Professional (DOP-C02) Exam Guide: **no version number, no publication date**; the revisions URL (`dop-02-revisions.html`) has no body, the PDF has no change history and carries only "Copyright © 2026" → `blueprint.version: 'DOP-C02'` (stated in the header comment).
- Read via WebFetch: main page (HTML), domain 1–6 Markdown copies, `dop-technologies-concepts`, `dop-02-in-scope-services`, PDF (bullet counts per task cross-checked: 140 in total). No out-of-scope services page exists (`dop-02-out-of-scope-services.html` has no body; the PDF TOC has no such section): only the 4 out-of-scope job tasks.
- fr_fr guide URL serves the English text (meta `en_us`): no French guide.
- Certification page: links to the DOP-C02 guide only, **no DOP-C03 announced**, 180 min, 75 questions, multiple choice / multiple response, 300 USD; **languages: English, Japanese, Korean, Simplified Chinese (no French)** → `languages: [en]`; Korean version retires after December 31, 2026.
- Exam facts (guide): 65 scored + 10 unscored, scaled 100–1,000, **pass 750**, compensatory, no penalty for guessing. Duration only on the certification page. Response types: multiple choice and multiple response only (no ordering/matching) → typeMix single/multi only.
- Date in header comments: 2026-11-23 (the day the pages were actually read), not the 2026-11-19 suggested by the task.

## Counts
- 6 domains (sdlc 22, config 17, resilience 15, monitoring 15, incident 14, security 17 %), 18 task statements, **140 objectives** (guide still splits "Knowledge of" / "Skills in"; objectives = knowledge bullets then skill bullets, verbatim, as in SAA-C03).
- 25 chapters: `00-getting-started` + 24. Split rule applied: more than 8 objectives (task-file note, professional level, as SAP-C03) → 3.1 (9), 3.2 (9), 4.1 (13), 4.2 (10), 4.3 (11) each split in two; largest chapter now 7 objectives. Split details in the `course.yaml` header.
- `check-cert.ts dop-c02`: `referential OK: dop-c02 vDOP-C02, 6 domains, 140 objectives`; 165 course problems, all expected (25 missing `.en.md` chapter files + 140 uncovered objectives; no `.fr.md` demanded).
- `factory/validate.ts` currently aborts on `content/kcna/objectives.yaml` missing (another agent's certification in progress), unrelated to DOP-C02.

## Unusual points
- The guide is old (DOP-C02 since 2023) and its wording predates many lifecycle changes; kept verbatim in `objectives.yaml` (header lists them):
  - **AWS OpsWorks** in skills 2.1.6 and 2.3.5 and in the in-scope list: OpsWorks, OpsWorks Stacks, for Chef Automate, for Puppet Enterprise all in **full shutdown since May 1, 2024** (Services in Full Shutdown page). Writers: OpsWorks only as a distractor.
  - **4.2.3 "Amazon Inspector and common assessment templates"**: assessment templates are Inspector Classic, **full shutdown May 20, 2026**. Writers: test current Amazon Inspector (automated EC2/ECR/Lambda scanning).
  - In-scope list items shut down: **AWS CodeStar** (July 25, 2024), **AWS Proton** (October 7, 2026). Maintenance / closed to new customers: **AWS App Runner** (announced March 31, 2026; AWS recommends ECS Express Mode), **AWS App2Container** (no new customers from November 7, 2025; AWS Transform), **AWS Copilot** CLI (end of support June 12, 2026, Copilot site).
  - Amazon CodeGuru (in scope): **CodeGuru Reviewer** no new repository associations since November 7, 2025 (maintenance list, announced October 7, 2025); **CodeGuru Security discontinued November 20, 2025** (end-of-support page; the English "What is" page still shows an old preview text). CodeGuru Profiler status not checked.
  - Other verified: Cloud9 maintenance (July 25, 2024); Systems Manager Incident Manager and Change Manager closed to new customers November 7, 2025; CloudTrail Lake closed to new customers May 31, 2026 (migrate to CloudWatch); Amazon Q Developer no new sign-ups from May 15, 2026, IDE plugins end of support April 30, 2027 (Kiro); CodeCommit closed July 25, 2024, reopened November 25, 2025 (not in the DOP-C02 in-scope list).
  - **X-Ray SDKs/daemon**: maintenance mode since February 25, 2026 (X-Ray timeline page); the timeline lists **no end-of-support date** ("N/A"). The task's "end of support February 25, 2027" could not be confirmed and is left out of the profile.
  - Renames (verified): Amazon Data Firehose (guide 4.1.8 and in-scope: "Kinesis Data Firehose"); AWS Fault Injection Service (guide: "Fault Injection Simulator"); AWS Quick with Quick Sight as a feature (guide: "Amazon Quick Sight"); Security Hub docs title the service AWS Security Hub CSPM (guide: "AWS Security Hub").
- Not verified, left out: MemoryDB current naming, EKS Distro / ROSA / Serverless Application Repository / License Manager status (no notice found on the lifecycle pages read), numeric quotas.
- Profile: prose about 500 words (slightly above the 450 target, because of the closure list); about 695 words with the in-scope service list.
- Level titles rewritten for a DevOps engineer (the task text says "solutions architect", taken as a copy slip).
