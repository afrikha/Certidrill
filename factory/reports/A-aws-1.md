# A-aws-1 — ARCHITECT SAA-C03 (2026-11-19)

## Guide version and sources
- AWS Certified Solutions Architect - Associate (SAA-C03) Exam Guide **v1.1, October 29, 2026** (v1.0: August 28, 2026). `blueprint.version: "2026-10-29"`.
- The HTML guide pages (`/userguide/solutions-architect-associate-03.html`, `/examguides/...`) returned an error or only the JavaScript shell; the **PDFs** were read instead (EN `docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.pdf`, FR same path under `/fr_fr/`). curl to docs.aws.amazon.com is blocked by the session proxy (403), so all reads went through WebFetch (model-summarised); EN bullets were spot-checked verbatim in a second fetch.
- Certification page: 130 min, 65 questions, multiple choice / multiple response, 150 USD; **no successor announced**; only the Italian-language version retires after December 31, 2026. SAA-C03 is current.
- Exam facts: 50 scored + 15 unscored; scaled 100–1,000; pass 720; compensatory scoring.

## Counts
- 4 domains (secure 30, resilient 26, performance 24, cost 20 %), 14 task statements, **189 objectives** (Knowledge then Skills bullets).
- 23 chapters: `00-getting-started` + 22 domain chapters. Split (more than 12 objectives): 2.1 (23), 2.2 (20), 3.3 (13), 3.5 (14), 4.1 (21), 4.2 (15), 4.3 (14), 4.4 (14). Splits are thematic, not Knowledge/Skills; see `factory/plans/saa-c03.json`.
- `check-cert.ts saa-c03`: `referential OK: saa-c03 v2026-10-29, 4 domains, 189 objectives`; 235 course problems, all expected (46 missing chapter files + 189 objectives not yet covered).

## Unusual points
- **French guide available** (fr_fr PDF, not machine-like). Small edits listed in the `objectives.yaml` header: "Régions" capitalised; "(AMS)" removed in 2.2.2 (mistranslation: AMS = AWS Managed Services, another product); "proxy Amazon RDS" → "Amazon RDS Proxy"; "Rapport d'utilisation et de coût AWS" → "AWS Cost and Usage Report"; "instances Spot, instances réservées" → "Spot Instances, Reserved Instances"; missing "au" added in 4.2.10. The FR guide itself mixes "infrastructure globale" and "infrastructure mondiale"; kept as written.
- Repeated bullets across task statements (cost management features/tools in 4.1–4.4; global infrastructure; caching; read replicas; storage types; purpose-built services in 2.1 and 2.2) are distinct objectives by code; question writers should vary the angle per task statement.
- v1.1 renames visible in the guide: **Amazon Quick** (ex-QuickSight / Quick Suite, confirmed on docs.aws.amazon.com/quick), **Amazon SageMaker AI**. Elastic Transcoder removed from in-scope in v1.1.
- **In-scope services closed or ending** (verified): AWS Data Pipeline (no new customers, doc history 25 July 2025); AWS Proton (sign-ups closed Oct 7, 2025, end of support Oct 7, 2026, already past); AWS Snow Family / Snowball Edge (no new device orders; DataSync, Data Transfer Terminal, Outposts suggested); Amazon Glacier (vaults) and AWS Application Discovery Service (maintenance, no new customers from Nov 7, 2025; also AWS Migration Hub). Flagged in the profile.
- Profile: the prose is about 440 words; the in-scope and out-of-scope service lists copied from the guide take it to about 770 words in total (lists are required by the task).
- `durationMin` 130 is the full seat time for 65 questions; unscored questions are not modelled (header comment of `blueprint.yaml`).
