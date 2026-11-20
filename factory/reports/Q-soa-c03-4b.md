# Q-soa-c03-4b — report

54 questions in `content/soa-c03/questions/security/`, prefix `soac03-4b-`: 4.2.1 = 11, 4.2.2 = 11, 4.2.3 = 11, 4.2.4 = 11, 4.2.5 = 10.
Types: single 45, multi 9 (all "Choose two", 5 options, with the scoring NOTE as in the finished SAA/DVA banks). Difficulty: 16 easy / 27 medium / 11 hard. Single answers: a 10, b 12, c 12, d 11. Validator: 0 problem(s).

No course chapter `42-data-protection` existed when the batch was written; facts come from AWS pages fetched on 2026-11-20.

## Choices
- Security Hub is named "AWS Security Hub CSPM" (ASFF, standards, automation rules, custom actions, cross-Region aggregation with "home Region"), as in the SAA-C03 bank. The new unified AWS Security Hub (OCSF, exposure findings) is not tested.
- AWS Security Agent: its user guide is now titled "AWS Security Agent (now part of AWS Continuum)". One question (`security-agent-pentest`) makes it the answer for on-demand penetration testing + revalidation; the explanation mentions the Continuum name. Revalidation of findings comes from the guide's document history (August 13, 2026), not from the reference page.
- No question depends on the Lambda maximum timeout; OpsWorks, Cloud9, Amazon Q Developer never appear.
- Code in stems: yaml (ALB listener), json (GuardDuty event pattern, describe-remediation-execution-status excerpt). The error text in that excerpt is a realistic IAM AccessDenied message, not copied from a page.

## Facts used from general knowledge (not on a fetched page) — review
- S3 object tag conditions: a missing tag makes a StringEquals condition false (implicit deny) — IAM evaluation rule (s3-requestobjecttag-upload).
- Service-linked role permissions cannot be extended with customer policies (asg-cmk-key-policy, distractor d).
- AWS managed keys: key policy not editable, cannot be disabled (ebs-default-cmk, dynamodb-switch-key, distractors).
- A secret scheduled for deletion blocks reuse of its name (sm-restore-secret, distractor a).
- Gateway endpoints exist only for S3 and DynamoDB (sm-rotation-vpc-endpoint, distractor d).
- Security groups have allow rules only; stopping an instance loses memory (guardduty-isolate-ec2 distractors).
- Version labels available for standard parameters (ps-advanced-tier-needs, distractor e).
- Tag policy enforcement for RDS DB instances assumed supported (scp-classification-tag); the resource type list of tag policies was not fetched.
- Runbook AWS-DisableS3BucketPublicReadWrite and Config rule s3-bucket-public-read-prohibited named in a distractor (securityhub-custom-action) without fetching their pages.

## Doubts
- Inspector EC2 page is inconsistent about the default scan mode (hybrid vs agent-based); the stem says "agent-based scan mode" without "default".
- ACM managed renewal page lists eligibility (in use or exported) but not renewal timing; the question does not use timing.
