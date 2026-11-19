# A-aws-2 — ARCHITECT CLF-C02 (2026-11-19)

## Guide version and sources
- AWS Certified Cloud Practitioner (CLF-C02) Exam Guide **v1.3, October 29, 2026** (1.0: June 24, 2026; 1.1: August 28, 2026; 1.2: September 24, 2026). `blueprint.version: '2026-10-29'`.
- The HTML guide page (`/userguide/cloud-practitioner-02.html`) failed (client error); the **PDFs** were read instead (EN `docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.pdf`, FR same path under `/fr_fr/`). curl to docs.aws.amazon.com is blocked by the session proxy (403), so every read went through WebFetch (model-summarised); bullets were requested task statement by task statement and the service lists and the 4.3 / 3.5 bullets were cross-checked in a second fetch.
- Certification page: 90 min, 65 questions, multiple choice / multiple response, 100 USD; **no successor announced**; only the Italian and German versions retire after December 31, 2026. CLF-C02 is current.
- Exam facts: 50 scored + 15 unscored; scaled 100–1,000; pass 700; compensatory scoring; the guide itself does not state the duration (90 min from the certification page).

## Counts
- 4 domains (concepts 24, security 30, technology 34, billing 12 %), 19 task statements, **135 objectives** (Knowledge then Skills bullets).
- 22 chapters: `00-getting-started` + 21 domain chapters. Split (more than 12 objectives): 3.8 (14) → `38-integration-business-support` (6: integration, business apps, customer enablement) + `39-developer-enduser-frontend-iot` (8); 4.3 (13) → `43-support-technical-resources` (8) + `44-partners-marketplace` (5: APN, partners, Marketplace, technical assistance).
- `check-cert.ts clf-c02`: `referential OK: clf-c02 v2026-10-29, 4 domains, 135 objectives`; 179 course problems, all expected (44 missing chapter files + 135 objectives not yet covered).

## Unusual points
- **French guide available** (fr_fr PDF, mostly good, no version number or change history printed, so it may lag the EN v1.3; it still says "Amazon Quick Sight" where EN says "Amazon Quick"). Edits listed in the `objectives.yaml` header; one machine-like bullet replaced (3.8.3 "émancipation du client" → "accompagnement des clients (Customer Enablement)"); AWS names put back in English (IAM, Management Console, SageMaker AI, WorkSpaces Secure Browser, purchasing options, Pricing Calculator, Cost and Usage Report, Prescriptive Guidance, Health Dashboard, Support plan names); "stratégies" (policies) → "politiques".
- **Support plans changed in 2026**: the guide (4.3.7) and the plans page list Basic Support, AWS Business Support+, AWS Enterprise Support, AWS Unified Operations; Developer, Business and Enterprise On-Ramp are no longer listed. Question and course writers must not use the old plans.
- **Renames / closures in in-scope services** (verified on docs.aws.amazon.com): Amazon AppStream 2.0 (guide name, kept in 3.8.5) is now documented as **Amazon WorkSpaces Applications**; **AWS Migration Hub** no longer open to new customers as of November 7, 2025; **AWS Application Discovery Service** no longer open to new customers (AWS Transform suggested). Amazon Glacier vaults closure taken from A-aws-1's verification (not re-fetched). Flagged in the profile.
- The guide lists eight services removed from the out-of-scope list (Elastic Transcoder, Elemental MediaStore, Lookout for Metrics, Lumberyard, Monitron, Panorama, RoboMaker, WorkDocs) — retired services, not new in-scope ones.
- Blueprint: `scoring.multi: all_or_nothing` added as in SAA-C03 (AWS rule, ignored by the loader for now); level titles rewritten for an AWS beginner.
- Profile: prose about 460 words (slightly over 450); with the in-scope and out-of-scope lists copied from the guide, about 800 words in total.
- Not verified in this task, so left out of the profile: Support plan response times and prices.
