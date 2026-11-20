# Q-clf-c02-1b — QUESTIONS CLF-C02, concepts 1.3.1–1.4.3 (2026-11-19)

63 questions (`clfc02-1b-*`), 9 per objective; single 56, multi 7 (one per objective; `cost-drivers-multi` is choose 3 of 6); difficulty 25 easy / 28 medium / 10 hard; correct positions of single questions balanced 14/14/14/14. Validator: 0 problem(s). Course chapters 13/14 did not exist yet, so the facts come only from the AWS pages cited.

## Facts verified on AWS pages (and worth knowing for the course writers)
- **AWS Application Migration Service is now "AWS Transform MGN"** (What's New, June 8, 2026; the user guide title is "What Is AWS Transform MGN?"). The guide v1.3 still says "AWS Application Migration Service". Questions use "AWS Transform MGN", with "(formerly AWS Application Migration Service)" where it is the answer. It has two rehost experiences: the MGN console (direct control of replication and cutover) and the AWS Transform agentic workflow.
- **AWS Transform** (agentic AI, no extra charge) is not in the guide's service lists. It is used in 2 questions (`transform-agentic`, `mgn-console-control`).
- AWS Snowball Edge is no longer available to new customers (DataSync / Data Transfer Terminal suggested), so it is not used. AWS Migration Hub is closed to new customers since November 7, 2025, so it is not used either.
- AWS DataSync is not in the guide's (non-exhaustive) in-scope list. It is the answer of `datasync-file-migration`.
- The CAF details (4 phases, 4 domains with the value chain, 6 perspectives with stakeholders and capabilities, 4 outcomes incl. ESG) come from the CAF overview whitepaper PDF and aws.amazon.com/cloud-adoption-framework/.
- `Key principles - How AWS Pricing Works` (the source of the "three fundamental drivers of cost: compute, storage, outbound data transfer") is marked "for historical reference only". It is cited together with the current aws.amazon.com/pricing/ page (pay as you go, save when you commit, pay less by using more, data transfer in is free).

## Choices and doubts
- French names of the CAF phases, perspectives and 7 Rs: French term + English name in parentheses, for example « Envisager (Envision) », « Gouvernance (Governance) », « Réhéberger (Rehost) ». These are my own translations; AWS fr_fr was not checked for these terms.
- Objective 1.3.1 ("Cloud adoption strategies") is read as the CAF journey phases, the transformation domains, the MAP phases and "migrate first, modernize later" for large migrations.
- Three references are aws.amazon.com product or announcement pages, not FAQs: MAP, CAF and the MGN rebrand.
