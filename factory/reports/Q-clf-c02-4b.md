# Q-clf-c02-4b — QUESTIONS CLF-C02, billing (4.2.8, 4.3.1–4.3.13) — 2026-11-19

40 questions, prefix `clfc02-4b-`, all `status: draft`. Counts per objective as assigned. Types: single 35, multi 5. Difficulty: 16 easy / 18 medium / 6 hard. Validator: `40 files, 0 problem(s)`.

## Sources
- No CLF-C02 course chapters existed yet, so questions rely only on fetched AWS pages (WebFetch, model-summarised).
- Support plans: only Basic, Business Support+, Enterprise Support, Unified Operations are used. `awssupport/latest/user/aws-support-plans.html` says Developer, Business and Enterprise On-Ramp are discontinued on January 1, 2027 (still offered in GovCloud). Response times come from `case-management.html`. Prices are left out on purpose: the plans page gives none, and the user-guide figures ($29/month for Business Support+, $5,000 minimum for Enterprise) may change.
- Some references are outside docs.aws.amazon.com but are official AWS sites: `repost.aws` (Knowledge Center, the re:Post FAQ, the abuse report article) and `aws.amazon.com` feature and program pages (Partners, Partner training, Professional Services, Marketplace private marketplace and cost management, Whitepapers, Blogs, Skill Builder, Prescriptive Guidance).

## Reference titles not confirmed exactly (the fetch gave no clear title)
- `custom-tags.html` → "Using user-defined tags"
- `repost.aws/knowledge-center/report-aws-abuse` → "How do I report abuse of AWS resources?"
- `repost.aws/faq` → "AWS re:Post FAQs"
- `aws.amazon.com/marketplace/features/cost-management` → "AWS Marketplace: Cost Management"
- `aws-support-plans.html` → "AWS Support plans". The fetched title was "AWS Support Plans - AWS Support".

## Left out (could not verify)
- **AWS solutions architects** (4.3.13): no page I fetched describes their role. The second 4.3.13 question asks instead about a TAM versus Professional Services, a partner or re:Post.
- **Partner volume discounts** (4.3.11): none of the pages I fetched mention them. The partner-benefit questions use training and certification, partner events (Spotlight Days, PartnerCast), programs and funding, and Partner Central.
- **Marketplace entitlement / License Manager** (4.3.12): the private-marketplace doc page returned no body. The 4.3.12 questions cover governance (private marketplace) and cost management (cost allocation and vendor-metered tags).
- The AWS Trust & Safety report form and its general abuse email address: neither was in the fetched text, so the questions only say "report to the AWS Trust & Safety team".
- "Hardware partner" as an APN type is not confirmed. I replaced that distractor.

## Fetch limits
- The hourly WebFetch limit was hit once. `docs.aws.amazon.com/prescriptive-guidance/`, `aws.amazon.com/partners/benefits/` and the Well-Architected framework welcome page returned client errors.
