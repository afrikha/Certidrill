# Q-clf-c02-2a — report

56 questions in `content/clf-c02/questions/security/`, prefix `clfc02-2a-`, 7 per objective (2.1.1–2.1.6, 2.2.1, 2.2.2).
Types: single 50, multi 6. Difficulty: 22 easy / 26 medium / 8 hard. Validator: 0 problem(s).

## Sources fetched (all references point to these pages)
- Shared Responsibility Model (aws.amazon.com/compliance/shared-responsibility-model/)
- Security Pillar "Shared responsibility" and Risk and Compliance whitepaper "Shared responsibility model". Both pages are marked as historical reference by AWS; they are used only for statements that match the current Shared Responsibility Model page (abstracted services, single- vs multi-tenant patching, host-based IDS/encryption/key management, IT controls verification).
- Security in Amazon EC2, Security in Amazon RDS, Maintaining a DB instance (RDS), Security in AWS Lambda, What is AWS Lambda?, Understanding how Lambda manages runtime updates
- Compliance Programs, Cloud Security (aws.amazon.com/security/), Data Center - Our Controls, Service control policies (SCPs)

## Notes and doubts
- The WebFetch hourly limit was reached after these pages, so nothing about AWS Control Tower, AWS Config, KMS or S3 default encryption was verified: governance questions (2.2.1) use only SCPs and compliance programs, and 2.2.2 avoids S3 default encryption and RDS encryption-by-default claims.
- `shared-lambda-manual-mode`: the docs say a function in Manual mode uses the specified runtime version "indefinitely"; I did not find (or could not fetch) any exception for security updates in Manual mode. Worth a second check.
- Possible overlap with Q-clf-c02-2b (2.2.4 Artifact, 2.2.5 industry compliance): `gov-hipaa-baa` and `gov-pci-customer-scope` touch HIPAA and PCI DSS from the customer-responsibility angle, not from the "where to find reports" angle.
- The 2.1.x objectives overlap heavily by design; inside the batch each question tests a different decision (category vs concrete split vs service shift), but several questions share the same underlying facts (patch management, security groups).
