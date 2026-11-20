# Q-clf-c02-2b — QUESTIONS CLF-C02, domain security (2026-11-19)

## Output
- 56 questions in `content/clf-c02/questions/security/`, prefix `clfc02-2b-`: 7 for each objective (2.2.3–2.2.9, 2.3.1).
- Types: single 50, multi 6 (five with 2 of 5 correct, one with 3 of 6 correct). Difficulty: 22 easy / 25 medium / 9 hard (39 / 45 / 16 %).
- Correct single answers spread evenly: a 12, b 13, c 12, d 13.
- `CERT=clf-c02 npx tsx factory/validate.ts --prefix clfc02-2b-` → 56 files, 0 problem(s).
- Generated from `/tmp/Q-clf-c02-2b/questions.py` + `gen.py` (scratch only).

## Sources
- WebFetch hit the hourly limit at the start (15:50 UTC). curl to docs.aws.amazon.com is blocked by the proxy, and the remote browser blocks the site. I wrote the drafts during the wait and then checked them with WebFetch after 16:00 UTC.
- I fetched every reference URL in the batch myself (46 distinct pages), and I took the titles from those fetches. Facts were changed to match the pages:
  - AWS GovCloud (US): "administered exclusively by AWS personnel that are U.S. citizens". The page does not say "on US soil", so I left that out.
  - ACM: automatic managed renewal applies only to DNS-validated certificates, so the stem now states DNS validation.
  - SCPs do not affect the management account, so the Region-restriction stem now says "member accounts".
  - AWS Artifact: there are offline agreements, so I removed the "sign the BAA on paper through Support" distractor. Organization agreements are accepted from the management account and need all features enabled; both are now stated. Notifications are sent by email through AWS User Notifications.
  - FIPS page: endpoints in US, GovCloud (US) and Canada Regions, FIPS 140-3.
  - IAM: "global" is not stated on the What is IAM? page, so that question now tests only "no additional charge".
  - EBS: the pages do not say "disabled by default" in those words. The question relies on "If you enable encryption by default … Otherwise, you must specify the encryption parameters", and its stem says that no encryption setting was changed.
- Shield Advanced Shield Response Team (SRT): the capabilities page still names the "Business Support plan or the Enterprise Support plan" (old plan names). I avoided SRT and kept cost protection and expanded protection.
- Security Hub: the option reads "AWS Security Hub CSPM", the name the user guide uses, as in the SAA-C03 bank. Explanations note that the exam guide says "AWS Security Hub".

## Overlap with sibling batches (checked against 2a and 2c files present at the time)
- I replaced four questions that tested the same decision as 2a/2c questions: last accessed for a role (2c lp-last-accessed), IAM group for identical permissions (2c group-same-perms), IAM role for EC2 (2c lp-ec2-role), and the customer still responsible for PCI DSS (2a gov-pci-customer-scope). Their replacements are IAM Access Analyzer external access, IAM role identity, implicit deny for a new user, and a service not listed in scope.
- Some overlap remains and is accepted:
  - `svc-hipaa-actions` (BAA in Artifact plus HIPAA eligible services) is close to 2a `gov-hipaa-baa` (what AWS provides for HIPAA).
  - `geo-scp-approved-regions` uses an SCP like 2a `gov-scp-guardrail`, but it tests a Region restriction, not the maximum-permissions concept.
- Within this batch, the organization BAA question (2.2.4) and the HIPAA multi (2.2.9) both mention the BAA. They test different decisions: an organization agreement compared with an account agreement, and the required HIPAA actions.
