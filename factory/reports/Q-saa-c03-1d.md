# Q-saa-c03-1d — report

42 questions in `content/saa-c03/questions/secure/` (prefix `saac03-1d-`), 6 per objective 1.3.5–1.3.11.
Types: single 35, multi 7 (one per objective; 6 with "Choose two.", 1 with "Choose three.").
Difficulty: 13 easy / 21 medium / 8 hard. Validator: 0 problem(s).

## Deviations
- Multi stems use the AWS wording ("Which combination of steps…? (Choose two.)" / "Which solutions…? (Choose two.)") plus the scoring NOTE. The Microsoft sentence "Each correct answer presents a complete solution / part of the solution" was left out, because AWS stems do not use it.
- Security Hub is named "AWS Security Hub CSPM", as the current standards reference page names it.
- The course chapter `13-data-security` did not exist yet, so I could not check that the questions agree with the course.

## Facts in distractor explanations that are not on a fetched page (from general AWS knowledge)
- GuardDuty S3 Protection (detects access activity) and Amazon Inspector (finds vulnerabilities) do not classify S3 data.
- `ec2:Encrypted` condition in an SCP (ebs-encryption-default, option d).
- SSE can be enabled on an existing SQS queue; an Aurora cluster's encryption is set at creation; an existing EBS volume cannot be encrypted in place (encrypt-requires-new).
- Gateway endpoints do not support security groups; a KMS alias cannot point to a key in another account.
- MFA delete behaviour (object-lock-legal-hold, option c); Intelligent-Tiering Archive Access tier at 90 days.
- AWS RAM cannot share an ACM certificate with CloudFront; RenewCertificate is not called for imported certificates.

## Notes
- S3 RTC: AWS pages disagree on the SLA figure (99.99 % vs 99.9 % within 15 minutes), so the question gives no percentage.
- ACM says it will deprecate email validation for public certificates during 2027 (in the explanation of saac03-1d-acm-email-to-dns).
- Batch 1c covers 1.3.4 (encryption and key management). Its questions may overlap with 1.3.6 and 1.3.8; I could not check this.
