# A-aws-7 — ARCHITECT SCS-C03 (2026-11-22, facts checked 2026-11-19/22)

## Guide version and sources
- AWS Certified Security - Specialty (SCS-C03) Exam Guide, **version 1.0, published March 26, 2026** (Revisions page `scs03-revisions`, single entry) → `blueprint.version: '2026-03-26'`. Odd: the exam itself is in use since December 2, 2025, earlier than the guide's 1.0 date.
- Read via WebFetch: main page (HTML + Markdown), domain 1–6 Markdown copies (domain 5 also HTML: identical), in-scope, out-of-scope, technologies-and-concepts, comparison (`security-specialty-03-appendix-b`), revisions. curl refused by the proxy (docs.aws.amazon.com 403).
- Comparison page: **SCS-C02 in use until December 1, 2025; SCS-C03 in use beginning December 2, 2025**.
- Certification page: links to SCS-C03 guide only (SCS-C02 not mentioned); 170 min, 65 questions, multiple choice / multiple response, 300 USD; English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America) — Simplified Chinese, Spanish (LatAm) and Portuguese (Brazil) retire after December 31, 2026; no French exam. Notes that the exam uses short service names (list under the Help button).
- Exam facts (guide): 50 scored + 15 unscored; scaled 100–1,000; **pass 750**; compensatory. Duration not in the guide (certification page).

## Counts
- 6 domains (detection 16, incident 14, infrastructure 18, identity 20, data 18, governance 14 %), 16 task statements, **70 objectives** (single "Skills in:" list per task, no Knowledge/Skills split).
- 17 chapters: `00-getting-started` + 16. Largest task 3.2 (7 objectives): no split under either rule (>8 or >12).
- `check-cert.ts scs-c03`: `referential OK: scs-c03 v2026-03-26, 6 domains, 70 objectives`; 104 course problems, all expected (34 missing chapter files + 70 uncovered objectives).

## Unusual points
- **Question types**: the guide lists four response types — multiple choice, multiple response, **ordering** (3–5 responses) and **matching** (3–7 prompts), all-or-nothing. The certification page lists only multiple choice / multiple response. Following the task and BRIEF-AWS §3, typeMix is single/multi only; ordering/matching not modelled (stated in blueprint header and profile). Decision for the owner if the platform should add these types.
- **No French guide**: fr_fr HTML serves English (meta locale en_us), fr_fr PDF fails. All French titles and objectives are our translation (principles in the `objectives.yaml` header). To review: « rayon d'impact [blast radius] », « empreinte du client [client fingerprinting] », « politiques de désactivation des services d'IA [AI service opt-out policies] », « artefacts d'investigation numérique (forensic) », « analyser syntaxiquement » (parse), « éléments de clé importés », level titles.
- Guide wording kept verbatim despite errors: 4.1.3 "Troubleshooting authentication issues"; 5.1.1 "when connecting to connect to resources" (French written correctly); 5.3.5 "AWS KMS customer managed AWS KMS keys". In-scope page uses `scs-02-*` file names and lists "VPC endpoints" twice and Network Access Analyzer twice.
- **Service status relevant to the guide (verified on AWS pages)**:
  - Amazon CodeGuru Security (skill 3.2.6, in-scope list): **discontinued November 20, 2025** (console, resources and docs gone); AWS points to Amazon Q Developer code review and Amazon Inspector code repository scanning.
  - Amazon Q Developer (3.2.6): new sign-ups closed May 15, 2026; IDE plugins and paid subscriptions end of support April 30, 2027; successor Kiro; console Q Developer continues (DevOps blog).
  - Amazon SNS message data protection (skill 5.3.4): maintenance, closed to new customers April 30, 2026; recommended alternative Lambda + Amazon Bedrock Guardrails.
  - AWS Audit Manager (6.3.2): maintenance, no new accounts from April 30, 2026; alternatives Config conformance packs, Security Hub CSPM, Control Tower.
  - AWS CloudTrail Lake (in-scope list): closed to new customers May 31, 2026; migrate to CloudWatch.
  - Amazon Q Business (in-scope) and AWS Directory Service Simple AD: maintenance, closed to new customers July 30, 2026.
  - ARC readiness check (April 30, 2026), Systems Manager Incident Manager and Change Manager (announced November 7, 2025): maintenance.
  - Amazon Glacier vaults (S3 Glacier Vault Lock, skill 5.2.2): standalone vault service no longer accepts new customers (no date on the Vault Lock page).
  - New AWS Security Hub GA December 2, 2025; previous service now called **Security Hub CSPM**.
  - Not in maintenance (Services in Maintenance page): Detective, Macie, GuardDuty, Security Lake, Inspector, Verified Access, Verified Permissions, CloudHSM, Firewall Manager.
  - Automated Forensics Orchestrator for Amazon EC2 is an AWS Solution (docs now titled "...for Amazon EC2 and EKS"); no deprecation notice found.
- KMS (for writers): automatic rotation only for `AWS_KMS` origin; on-demand rotation also for imported (`EXTERNAL`) material; keys in custom key stores rotate manually only (rotate-keys page).
- difficultyMix: schema takes one share per level; used 0.15 / 0.50 / 0.35 (middle of the ranges). Profile: prose 448 words; about 645 with the two service lists.
