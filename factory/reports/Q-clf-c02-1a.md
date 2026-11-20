# Q-clf-c02-1a — QUESTIONS CLF-C02, domain concepts (2026-11-19)

## Output
- 56 questions in `content/clf-c02/questions/concepts/`, prefix `clfc02-1a-`. Per objective: 1.1.1 10, 1.1.2 10, 1.1.3 9, 1.2.1 9, 1.2.2 9, 1.2.3 9.
- Types: single 50, multi 6. There is one multi per objective, each "Choose two" with 5 options.
- Difficulty: 22 easy / 25 medium / 9 hard (39 / 45 / 16 %).
- Correct single answers: a 9, b 15, c 14, d 12. Shuffle is on.
- `CERT=clf-c02 npx tsx factory/validate.ts --prefix clfc02-1a-` gives 56 files and 0 problems.

## Sources
- Every reference was fetched with WebFetch, and the answers were model-summarised. The pages are:
  - the "Six advantages of cloud computing" whitepaper page;
  - the Well-Architected Framework pages: Definitions, the review process, the six pillar pages, the six pillar "Design principles" pages and the general design principles;
  - the Well-Architected Tool user guide pages (intro, lenses, milestones) and the Tool FAQs;
  - the Serverless Applications Lens;
  - AWS Regions, AWS Availability Zones, the Fault Isolation Boundaries "Regions" page and the whitepaper "Global infrastructure";
  - "Global Infrastructure Regions & AZs" on aws.amazon.com;
  - What is AWS Local Zones?, What is AWS Outposts?, What is Amazon CloudFront? and What is Amazon EC2 Auto Scaling?;
  - "What is Cloud Computing?", AWS pricing and Shared Responsibility Model, all on aws.amazon.com.
- `framework/welcome.html` could not be read (client error). It is not used as a reference.
- The pillar design-principle pages all have the H1 "Design principles". Several references therefore share that title but have different URLs.
- No course chapter existed for 11 or 12 while this batch was written, so the questions were not checked against the course.

## Points worth a reviewer's look
- **Scoring NOTE on multi.** I added "NOTE: Each correct selection is worth one point." to the 6 multi questions, as BRIEF.md and the writing guide require and as most SAA-C03 multi questions do. However, `blueprint.yaml` sets `scoring.multi: all_or_nothing`, and docs/SPECS-AWS.md §3.3 says a partially correct answer scores 0. If that rule becomes active, the NOTE will be false and should be removed bank-wide.
- **Operational excellence pillar.** The current page groups its practices as Prepare / Operate / Evolve, with "organize teams around business outcomes" as the foundation. It now has 8 design principles, including "Implement observability for actionable insights" and "Safely automate where possible". The questions use only the principles that were checked.
- **French "lens".** It is translated as « objectif (lens) » and « objectif personnalisé (custom lens) », and "milestone" as « jalon ». The AWS fr_fr wording for the WA Tool was not verified.
- **French "durability".** "Durability" (the 1.1.3 concept) is written « durabilité des données (durability) ». This avoids a clash with the Sustainability pillar, which is « Durabilité ».
- `clfc02-1a-gi-local-zones` says only "very low latency". The fetched docs page says "low latency", while the aws.amazon.com page says "single-digit millisecond".
- `clfc02-1a-gi-region-selection` relies on two points from the AWS Regions page: an account provides multiple Regions, and opt-in Regions (introduced after March 20, 2019) must be enabled before use.
- 1.1.1 and the "stop guessing capacity" angle of 1.1.3 are close. To keep them apart, 1.1.1 asks for the advantage names and 1.1.3 asks about the elasticity concept and its benefit.
