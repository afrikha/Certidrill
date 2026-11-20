# A-aws-5 — ARCHITECT SOA-C03 (2026-11-20, facts checked 2026-11-19/20)

## Guide version and sources
- AWS Certified CloudOps Engineer - Associate (SOA-C03) Exam Guide, **version 1.2, published October 29, 2026** (Revisions page: 1.0 September 30, 2025; 1.1 June 1, 2026; 1.2 October 29, 2026). `blueprint.version: '2026-10-29'`. The Revisions page only details 1.0 → 1.1 changes; nothing says what 1.2 changed.
- Read: main page, domain 1–5 Markdown copies (domain 1 also HTML: identical), in-scope, out-of-scope, comparison and revisions pages. Direct curl blocked by the proxy (403); all reads via WebFetch.
- Comparison page: SOA-C02 in use until September 29, 2025; SOA-C03 from September 30, 2025.
- Certification page: name AWS Certified CloudOps Engineer - Associate (formerly SysOps Administrator - Associate; the new name applies only to those passing the current version), current version SOA-C03, 130 min, 65 questions, 150 USD, English / Japanese / Korean / Simplified Chinese (**no French exam**); Simplified Chinese and Korean versions retire after November 19, 2026. The exact phrase "the latest version (SOA-C03)" was not confirmed verbatim (WebFetch summary).
- Exam facts: 50 scored + 15 unscored; scaled 100–1,000; pass 720; compensatory; multiple choice / multiple response only. Duration not in the guide (certification page).
- **Exam labs**: none in SOA-C03 (guide lists two response types only). SOA-C02 labs suspended "until further notice" from March 28, 2023 (AWS Training and Certification blog, March 2023).

## Counts
- 5 domains (22/22/22/16/18 %), 13 task statements, **53 objectives** (single "Skill n.n.n" list per task, no Knowledge/Skills split).
- 14 chapters: `00-getting-started` + 13 (one per task; largest 1.3 and 3.1 with 6 objectives, no split).
- `check-cert.ts soa-c03`: `referential OK: soa-c03 v2026-10-29, 5 domains, 53 objectives`; 81 course problems, all expected (28 missing chapter files + 53 uncovered objectives).

## Unusual points
- **No French guide**: the fr_fr URLs serve English. All French titles/objectives are our translation (principles in the `objectives.yaml` header). To review: « veilleuse [pilot light] », « secours semi-actif [warm standby] », « politiques de ressources », « restauration à un instant dans le passé », RTO/RPO as « objectif de temps / de point de reprise », level title « Automaticien des piles ».
- Domain slugs: monitoring, reliability, deployment, security, networking.
- New services in the guide (v1.1): Amazon Bedrock, AWS DevOps Agent (GA March 2026 per What's New search result), AWS Health Dashboard, Kiro, AWS Security Agent, Amazon S3 Files (S3 user guide page exists). Not fetched in detail: writers must verify features before use.
- Guide inconsistency: Revisions says Amazon Chime and Amazon WorkDocs were removed from the out-of-scope list, yet both still appear on the out-of-scope page (copied as published). The in-scope list puts ELB, internet gateways, NAT gateways, network ACLs under "Security, Identity, and Compliance".
- Out-of-scope job tasks: design distributed architectures, CI/CD pipelines, hybrid/multi-VPC networking; develop software; define security/compliance/governance requirements; ransomware defense strategies; capacity assessment/planning; cost/TCO analysis; billing and invoicing. Tension: 5.1.4 "Optimize the cost of network architectures" vs "Analyze costs and TCO" out of scope — test concrete cost fixes (NAT gateway vs gateway endpoints, data transfer), not TCO.
- **Service status (verified on AWS pages)**: OpsWorks end of life, disabled for new and existing customers (Stacks EOL May 26, 2024). Cloud9 no longer available to new customers (doc page, no date). CodeCommit reopened to new customers November 25, 2025 (doc history; closed July 25, 2024). X-Ray SDKs/daemon maintenance mode from February 25, 2026; the timeline page lists **no end-of-support date** (A-aws-4 said February 25, 2027: not confirmed here). Amazon Q Developer new sign-ups closed May 15, 2026, end of support April 30, 2027, successor Kiro (DevOps blog). Q Developer no longer appears in either scope list.
- Profile: prose 450 words (with title); ≈710 with the two service lists.
