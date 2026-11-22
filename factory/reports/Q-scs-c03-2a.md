# Q-scs-c03-2a — report

55 questions in `content/scs-c03/questions/incident/`, prefix `scsc03-2a-`, 11 per objective (2.1.1–2.1.4, 2.2.1).
Types: single 43, multi 8, ordering 2, dragdrop 2. Difficulty: 8 easy / 28 medium / 19 hard.
Validator: `CERT=scs-c03 npx tsx factory/validate.ts --prefix scsc03-2a-` → 0 problem(s).

## Facts taken from general knowledge (not stated on a fetched page) — please spot-check
- Step Functions Express workflows: 5-minute maximum and no `.waitForTaskToken` support; Lambda 15-minute limit; SQS delay 15-minute maximum (sfn-owner-approval).
- `aws:assertAwsResourceProperty` continues only when the value matches (page implies it; wording kept cautious) (runbook-branch-prod).
- SSM: updating a document does not change the default version; a run without a version uses the default (inferred from the UpdateDocument API example) (runbook-default-version).
- AWS Config managed rule names `restricted-ssh`, `cloudtrail-enabled`, `shield-advanced-enabled-autorenew`; Security Hub CSPM controls use service-linked Config rules.
- GuardDuty finding path `detail.resource.instanceDetails.instanceId`; finding types UnauthorizedAccess:EC2/SSHBruteForce, CryptoCurrency:EC2/BitcoinTool.B!DNS.
- AWS RAM does not share IAM roles; Cognito is not a workforce console sign-in path; Route 53 public DNS query logging covers public zones only; CloudTrail does not record Kubernetes API requests; Security Lake rollup Region.
- `aws:cloudwatch:assert-alarm-state` is a point-in-time check, not a continuous guardrail.

## References
- `JUPYTER` is an AWS Security Blog post (aws.amazon.com), title written from the post; the other references are docs.aws.amazon.com pages fetched during the task.
- Titles of the two Automation runbook reference pages follow the pattern "<runbook> - AWS Systems Manager Automation Runbook Reference".

## Deviations / choices
- Replaced two drafts that duplicated decisions of the parallel batch scsc03-2b (NAT flow log `pkt-srcaddr`, role session revocation with `aws:TokenIssueTime`) with an EKS audit-log capture question (2.2.1) and a GuardDuty Malware Protection for S3 + tag-based access question (2.1.4).
- Avoided Shield Advanced automatic application layer mitigation as an answer: the AWS page says the Anti-DDoS managed rule group supersedes it since March 26, 2026.
- Closed services (CloudTrail Lake, Change Manager, Incident Manager, ARC readiness check) appear only as distractors, with the reason given; CloudTrail Lake explanation cites the May 31, 2026 closure from the profile.
- AWSSupport-ContainEC2Instance is used for the DryRun trap; its doc page itself flags Contain/Release vs Restore naming inconsistencies (questions use `Contain` and `Restore`, the accepted values).
- Course chapters for these objectives did not exist yet, so the questions were not cross-checked against the course.
