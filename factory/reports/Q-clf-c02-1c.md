# Q-clf-c02-1c — report

45 questions (`clfc02-1c-*`, `content/clf-c02/questions/concepts/`): 9 each for 1.4.4–1.4.8; single 40, multi 5 (one per objective); difficulty 18/20/7. Validator: 0 problem(s). Chapter 14-cloud-economics did not exist yet, so the questions rest on AWS documentation only.

## Points to check

- **Reasoning, no direct quote**: `rightsize-before-commit` (rightsize first, then commit to a Savings Plan) follows from the Savings Plans definition ($/hour commitment for 1 or 3 years, How AWS Pricing Works) and COST06. I did not fetch a page that says "rightsize before you commit" word for word (the rightsizing whitepaper URL now redirects to Compute Optimizer).
- `onprem-hypervisor-license`: "no virtualization licence on EC2" comes from the shared responsibility model page (AWS manages the host OS and virtualization layer).
- Explanations of distractors that cite pages I did not fetch (general knowledge, kept short): Amazon Inspector finds vulnerabilities and does not install patches (`patch-automation`); AWS Outposts runs in the customer's site (`scale-shared-global`).
- `rightsizing-ongoing` and `memory-bound-family` cite the Cost Optimization Pillar page "Select the correct resource type, size, and number", which AWS marks as historical (text verified; the current Framework COST06 pages give only the titles).
- `short-project-license-included` uses the current RDS for SQL Server models: License Included and **Bring Your Own Media (BYOM)**, as the RDS page names them today.
- Migration Evaluator (`onprem-business-case`): its FAQ page is live and shows no closure notice; I could not open the user guide (fetch error). If it is closed to new customers, change this question.
- The Microsoft FAQ is at `https://aws.amazon.com/windows/faq/` (singular `faq`), with the page title "Microsoft FAQ – AWS".
- French: the names of the six advantages are the headings of the fr_fr page (« Bénéficiez d'économies d'échelle massives », « Arrêtez de deviner la capacité », etc.). I wrote « licence incluse (License Included) » at first mention. Well-Architected principle names stay in English (« Safely automate where possible », « Adopt a consumption model »).
- WebFetch hit the hourly rate limit once; every reference in the questions is a page that I fetched.
