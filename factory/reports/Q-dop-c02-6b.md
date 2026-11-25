# Q-dop-c02-6b — QUESTIONS DOP-C02, security 6.2.1–6.2.7 and 6.3.1 (2026-11-23)

48 questions written in `content/dop-c02/questions/security/`, prefix `dopc02-6b-`, 6 per objective: 40 single and 8 multi; difficulty 8 easy, 23 medium, 17 hard. English only. `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-6b-` gives 0 problems, and so does `npm run content:validate -- --cert dop-c02 --prefix dopc02-6b-` (0 warnings).

## Sources
Every reference is a page that I fetched with WebFetch on 2026-11-23, about 50 pages on docs.aws.amazon.com. Each title is the HTML title that WebFetch reported. The AWS WAF guide's page titles all end with " - AWS WAF, AWS Firewall Manager, AWS Shield Advanced, and AWS Shield network security director", and I copied them that way. WebFetch reached its hourly limit once, and I waited for it to reset. curl to docs.aws.amazon.com was refused by the proxy (403), so I did not use it again.

## Facts checked that affected the questions
- **AWS WAF resources**: Network Load Balancer is not in the list; App Runner is. The AWS WAF Anti-DDoS managed rule group has been the default HTTP flood protection since March 26, 2026, replacing the legacy Shield Advanced L7 automatic mitigation. Because of that, no question uses automatic L7 mitigation as the correct answer: it only appears in a distractor whose explanation does not depend on it.
- **Shield Advanced**: proactive engagement needs health-based detection (Route 53 health checks, any resource type except hosted zones). SRT access needs a Business or Enterprise Support plan. Cost protection comes as service credits.
- **Network Firewall domain lists**: HOME_NET defaults to the firewall VPC's CIDR, so spoke VPCs must be added. With strict order, the implicit deny of an allow list does not apply.
- **ACM**: Approaching Expiration events cover imported certificates (45 days before expiry for imported and private certificates, 30 days for public ones; the timing can be changed with PutAccountConfiguration). Renewal Action Required and Expired events are not sent for imported certificates. DaysToExpiry has the CertificateArn dimension. Certificates from IssueCertificate are not renewed by ACM; certificates requested through ACM from a CA shared with AWS RAM are renewed (through the recipient account's ACM service-linked role).
- **KMS**: after CancelKeyDeletion, the key is Disabled and EnableKey is needed. A single-Region key cannot be converted to multi-Region. Without the default root statement in the key policy, IAM policies do not work.
- **Macie**: sensitive data findings are not published to Security Hub CSPM by default (only policy findings are). Discovery results are kept for 90 days, and the repository needs a symmetric customer managed key in the same Region as the bucket. After the first run, a periodic job analyzes only new or changed objects. Macie needs kms:Decrypt for its service-linked role in the key policy.
- **AWS Backup Vault Lock**: a compliance-mode lock needs a grace time of at least 3 days. Without `--changeable-for-days`, the lock is created in governance mode. After a minimum retention is set, copy jobs with a shorter retention fail.
- **AWS Config advanced queries** can run against an aggregator. **Transit Gateway Flow Logs** are created by the transit gateway owner and have attachment and source and destination VPC ID fields.
- **RDS for PostgreSQL**: `rds.force_ssl` defaults to 0 up to version 14 and to 1 from version 15. The stem says version 14 for that reason.

## Doubts and choices (for review)
- **Service naming**: the AWS pages for the current service say "AWS Security Hub CSPM" (titles end with "- AWS Security Hub"). The questions use "AWS Security Hub CSPM" for findings, automation rules, custom actions and aggregation, as the other DOP-C02 batches do. They do not use the new unified AWS Security Hub.
- **`dopc02-6b-securityhub-automation-rules`**, option a: disabling a control through a "configuration policy" relies on central configuration, which the course calls legacy (Security Hub CSPM policies in Organizations are the current way). The option is wrong either way, because disabling the control breaks the auditors' requirement.
- **`dopc02-6b-ssm-dhmc-organization`**: I did not verify how SSM Agent chooses between DHMC and an existing instance profile that has no SSM permissions. The stem therefore says that most instances have no instance profile.
- **`dopc02-6b-private-ca-internal-alb`**: I could not confirm that a public certificate can never be DNS-validated through a private hosted zone (the `.internal` domain is not public). The distractor explanation relies on public DNS validation.
- **`dopc02-6b-rds-postgres-tls-verify`**: what `sslmode=require` does comes from libpq behavior (no host name check), not from the AWS page. The explanation says only that require does not check the host name.
- **`dopc02-6b-macie-custom-data-identifier`**: Macie's page says "proximity rule" (the console's term is maximum match distance). The questions use "proximity rule". The allow list behavior ("text Macie ignores") comes from my knowledge of Macie, not from a page I fetched.
- **Overlap with other batches**: the 6a and 6c batches were written at the same time as this one. I removed or replaced the questions of mine that tested the same decision as one of theirs:
  - a tag policy plus an SCP with `aws:RequestTag` (duplicate of `dopc02-6a-scp-require-tag-at-creation`), replaced by AWS Backup Vault Lock;
  - CloudTrail network activity events with VpceAccessDenied (duplicate of `dopc02-6c-network-activity-vpce-denied`), replaced by Config advanced queries;
  - Resolver query logging (duplicate of `dopc02-6c-resolver-query-logging`), replaced by Transit Gateway Flow Logs.

  I also left out two topics that 6c already covers: S3 `aws:SecureTransport` and an organization trail with a delegated administrator. The KMS questions avoid the decisions already tested in the 1a, 3a, 4a and 4b batches (cross-account keys and CloudWatch Logs keys).
- **Option length**: in 13 of the 40 single questions, the correct option is still the longest, mostly by a few characters (for example, in guardduty-isolate-instance the two EventBridge patterns are parallel on purpose).
