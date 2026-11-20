# Q-saa-c03-1a — QUESTIONS SAA-C03, domain secure (2026-11-19)

## Output
- 56 questions in `content/saa-c03/questions/secure/`, prefix `saac03-1a-`: 7 per objective 1.1.1 to 1.1.8.
- Types: single 46, multi 10 (9 "Choose two" with 5 options, 1 "Choose three" with 6 options).
- Difficulty: 17 easy / 29 medium / 10 hard (30 / 52 / 18 %).
- Correct single answers: a 11, b 10, c 13, d 12. The correct option is never clearly the longest; this was checked with a script and the options were rebalanced.
- `CERT=saa-c03 npx tsx factory/validate.ts --prefix saac03-1a-` gives 56 files and 0 problems.

## Sources
- Every fact was checked with WebFetch on docs.aws.amazon.com (IAM, STS, IAM Identity Center, Organizations, RAM, VPC, CloudTrail, KMS, Cognito, Roles Anywhere, Local Zones, Wavelength, Outposts, RDS, Lambda, ECS Fargate, Artifact, global infrastructure pages). The answer was model-summarised, as noted in A-aws-1.
- References: all 46 distinct URLs were fetched. One URL is outside docs.aws.amazon.com: `https://aws.amazon.com/compliance/shared-responsibility-model/` (title "Shared Responsibility Model"). It is used in 4 questions on 1.1.5 because it is the canonical page for the model. Replace it if only docs.aws/FAQ URLs are allowed.
- The course chapter `11-secure-access` was spot-checked once it appeared. No contradictions were found: AZ IDs, opt-in Regions, session durations, external ID, centralized root access and Identity Center facts all agree.

## Points worth a reviewer's look
- 1.1.1 overlaps 1.1.9 and 1.1.10 (task Q-saa-c03-1b). To limit the overlap, no 1.1.1 question has an SCP or Control Tower as its answer. Only one question uses `aws:PrincipalOrgID` in a bucket policy, and its angle is multi-account access.
- Two recent facts that the questions rely on:
  - AZ names map identically for accounts created from November 2025 onward. Because of this, the AZ ID question gives accounts created in 2018 and 2021.
  - Centralized root access management and `sts:AssumeRoot` exist.
- `saac03-1a-local-zone-latency` says "single-digit millisecond latency". This phrase comes from AWS marketing and from our course chapter; the fetched Local Zones pages only say "low latency".
- `saac03-1a-srm-fargate-shift`: the Fargate page confirms that AWS patches the platform (kernel and OS, through platform version revisions) and removes cluster provisioning and scaling. The customer-side items (image contents, task roles, security groups) are general AWS model knowledge; the fetched page does not list them explicitly.
- IAM Access Analyzer custom policy checks are described in words. The question does not name API operations such as CheckNoNewAccess, because the operation names were not verified.
