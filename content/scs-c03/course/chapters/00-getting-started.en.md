SCS-C03 is the specialty exam for people who secure AWS workloads and organizations. Its questions don't ask what a service is; they give a company with several accounts, a precise security requirement and a qualifier, then four or more configurations that all look reasonable. The one that wins is decided by a condition key, a policy type, a Region, an account boundary or a status change in the AWS catalog. This chapter explains the format, a method for reading security scenarios, the evaluation rules and service statuses that decide answers in November 2026, the services the exam sets against each other and a study plan.

<!-- section: exam-format -->
## Exam format

| Item | Value |
| --- | --- |
| Certification | AWS Certified Security – Specialty |
| Exam version | SCS-C03, in use since December 2, 2025 (SCS-C02 ended on December 1, 2025); exam guide version 1.0 of March 26, 2026 |
| Duration | 170 minutes |
| Questions | 65: 50 scored and 15 unscored, which aren't identified |
| Score | Scaled from 100 to 1,000; 750 passes |
| Scoring model | Compensatory: only the total counts, no minimum per domain |
| Price and delivery | 300 USD; Pearson VUE test center or online proctored |
| Languages | English, Japanese, Korean, Portuguese (Brazil), Simplified Chinese, Spanish (Latin America); the last three retire after December 31, 2026; no French version |
| Target candidate | Three to five years of experience securing cloud workloads |

| Domain | Weight | Course chapters |
| --- | --- | --- |
| Detection | 16 % | 11 to 13 |
| Incident Response | 14 % | 21 and 22 |
| Infrastructure Security | 18 % | 31 to 33 |
| Identity and Access Management | 20 % | 41 and 42 |
| Data Protection | 18 % | 51 to 53 |
| Security Foundations and Governance | 14 % | 61 to 63 |

Compared with SCS-C02, the detection and incident response domains were rebuilt and the last domain renamed. The guide adds finding validation, OCSF and Amazon Security Lake, third-party AWS WAF rules, guardrails for generative AI (with the OWASP Top 10 for LLM applications), encryption between cluster nodes, imported versus AWS-generated key material, data masking, multi-Region keys and certificates. It drops the AWS Security Finding Format as a topic, host-based firewalls, TCP/IP basics, Reachability Analyzer, TLS concepts, Direct Connect virtual interfaces and S3 static websites. Amazon MWAA and AWS Payment Cryptography are out of scope, as are designing cryptographic algorithms, packet-level analysis and training ML models.

The guide lists four response types:

| Type | Form | Credit |
| --- | --- | --- |
| Multiple choice | Four options, one correct (about four questions in five) | One correct answer |
| Multiple response | "Choose two." with five options or "Choose three." with six | All selections correct, no partial credit |
| Ordering | Put three to five steps in sequence (an incident response or key rotation procedure) | All in the right order |
| Matching | Match three to seven prompts to services or controls | All matches correct |

The exam shows short service names ("GuardDuty", "Security Hub"); the full list is under the Help button.

> **Exam tip.** You have about 2 minutes 37 seconds per question. Answer everything on a first pass, flag doubts and keep 20 minutes for them: an unanswered question scores zero, like a wrong one. Certidrill mock exams score all 65 questions.

<!-- section: reading-questions -->
## Reading a security scenario

A stem runs three to eight sentences: a company ("AnyCompany"), its accounts and organization layout, what it already has (a trail, a key, a VPC design), a security requirement, a qualifier, then "Which solution will meet these requirements?". Options are concrete configurations: a policy with a condition, a service setting, an EventBridge rule and its target.

1. Read the question and the qualifier first.
2. Write down the scope: one account, an OU, the whole organization, existing and future accounts, one Region or all.
3. Write down who must or must not have access: a role, a service principal, another account, nobody including administrators.
4. Eliminate options that grant more than needed, act in the wrong account or Region, or protect only new resources when existing ones count.
5. For "Choose two" or "Choose three", check that the options together form a working chain (for example detection plus notification plus remediation).

| Words in the stem | What they usually select |
| --- | --- |
| "least privilege" | Specific actions and resources, condition keys (`aws:PrincipalOrgID`, `aws:SourceVpce`, `aws:SourceArn`, `kms:ViaService`), no wildcards |
| "MOST secure" | Temporary credentials, private connectivity, customer managed keys, deny guardrails, MFA |
| "LEAST operational overhead" | A managed detector or a built-in feature (GuardDuty, Security Hub controls, managed rules, automatic rotation) over custom Lambda or EC2 tooling |
| "automatically remediate" | EventBridge rule or Config remediation that starts Systems Manager Automation, Lambda or Step Functions |
| "including future accounts" | Delegated administrator with auto-enable, organization trails, SCPs or RCPs on the root or OU, organization conformance packs |
| "prove" or "audit evidence" | Immutable records: CloudTrail with integrity validation, S3 Object Lock in compliance mode, Config history |
| "no one, including the root user" | S3 Object Lock compliance mode, SCPs (which do restrict the member account root user), key material outside AWS |
| "the company must control the keys" | Customer managed KMS keys, imported key material, CloudHSM or external key stores, depending on how much control |

> **Exam trap.** A wrong security option often works. It fails a scope detail: an SCP attached to the management account (SCPs never affect it), a GuardDuty detector enabled in one Region, a key policy that allows the role but no grant for the service, a bucket policy restricted by `aws:SourceIp` when traffic arrives through a VPC endpoint (use `aws:SourceVpce`).

<!-- section: decision-rules -->
## Rules that decide answers in 2026

**Policy evaluation**, the backbone of the identity, data and governance domains:

- An explicit `Deny` in any applicable policy wins.
- SCPs cap what principals in member accounts can do; RCPs cap what can be done to resources in member accounts. Neither grants anything, and neither applies to the management account.
- Within an account, an allow in an identity-based or a resource-based policy is enough, but permissions boundaries and session policies cap the result: the effective permission is the intersection.
- Across accounts, both sides must allow: the caller's identity policy and the resource policy (or the role trust policy).
- For KMS, the key policy is the root of access: IAM policies work only if the key policy allows the account to delegate; grants give temporary, narrow use to a principal or a service.

**Key rotation**: automatic rotation (yearly by default) exists only for keys with AWS-generated material (`AWS_KMS` origin); imported material (`EXTERNAL`) supports on-demand rotation and can expire; keys in CloudHSM or external key stores rotate only manually.

**Service status in November 2026.** Certidrill never makes these a correct answer for a new deployment:

| Service | Status | What to choose instead |
| --- | --- | --- |
| Amazon CodeGuru Security | Discontinued on November 20, 2025 | Amazon Inspector code repository scanning |
| Amazon Q Developer | New sign-ups closed since May 15, 2026 | Kiro |
| Amazon SNS message data protection | Closed to new customers since April 30, 2026 | A Lambda function using Amazon Bedrock Guardrails |
| AWS Audit Manager | Closed to new customers since April 30, 2026 | Config conformance packs, Security Hub CSPM, Control Tower controls |
| AWS CloudTrail Lake | Closed to new customers since May 31, 2026 | CloudWatch (the migration AWS recommends), or trails queried with Athena |
| Amazon Q Business, AWS Directory Service Simple AD | Closed to new customers since July 30, 2026 | For directories: AWS Managed Microsoft AD or AD Connector |
| Systems Manager Incident Manager and Change Manager, ARC readiness check | Maintenance: existing customers only | Response automation with EventBridge, Systems Manager Automation or Step Functions |
| Amazon Glacier vaults and Vault Lock | Closed to new customers | S3 Glacier storage classes with S3 Object Lock |

**Two Security Hubs.** The service launched in 2018 is now **AWS Security Hub CSPM**: standards, controls, ASFF findings and partner integrations. The new **AWS Security Hub**, generally available since December 2, 2025, correlates GuardDuty, Inspector, Macie and CSPM findings into exposures with attack paths, in OCSF. When a stem asks for compliance checks against a standard, the answer is Security Hub CSPM; for prioritized risks across detectors, Security Hub. Amazon Detective, Macie, GuardDuty, Inspector and Security Lake remain fully open.

<!-- section: confusing-pairs -->
## Services the exam sets against each other

| Family | Options | What separates them |
| --- | --- | --- |
| Detection | GuardDuty, Inspector, Macie, Security Hub, Detective, Security Lake | Threats from logs and runtime; vulnerabilities in software and reachability; sensitive data in S3; posture and correlated exposures; root cause investigation graphs; normalized log storage in OCSF |
| Edge and network | AWS WAF, Shield Advanced, Network Firewall, Firewall Manager | Layer 7 rules on CloudFront, ALB, API Gateway and others; DDoS protection with response team and cost protection; stateful VPC inspection with Suricata-compatible rules; central policies for all of these across the organization |
| Packet filters | Security groups, network ACLs | Stateful, allow only, on ENIs, can reference other groups; stateless, allow and deny, on subnets, numbered rules |
| Secrets | Secrets Manager, Parameter Store | Built-in rotation, cross-Region replication and resource policies, per-secret cost; SecureString parameters encrypted with KMS, no native rotation, standard tier at no extra charge |
| Certificates | ACM, AWS Private CA | Managed certificates with automatic renewal for integrated services; your own private CA hierarchy for internal TLS, mutual TLS, devices and Roles Anywhere trust anchors |
| Identities | IAM Identity Center, Amazon Cognito, IAM Roles Anywhere | Workforce single sign-on to accounts and applications; customer sign-in for your applications, with identity pools for AWS credentials; temporary credentials for workloads outside AWS through X.509 certificates |
| Remote access | Verified Access, Client VPN, Session Manager | Per-request access to applications from identity and device posture without a VPN; network access to a VPC; shell access to instances without inbound ports or SSH keys |
| Guardrails | SCPs, RCPs, permissions boundaries | Caps on principals of member accounts; caps on resources of member accounts, including access by external principals; cap on one user or role |
| Immutability | Object Lock governance, Object Lock compliance, legal hold | Overridable with `s3:BypassGovernanceRetention`; nobody can shorten or remove retention, root included; no end date until removed |
| Key stores | KMS standard, CloudHSM key store, external key store | AWS-managed HSMs with automatic rotation; your CloudHSM cluster, manual rotation; keys outside AWS, availability and latency depend on you |

<!-- section: study-plan -->
## Study plan

1. Follow the modules in order: detection and incident response first, because later domains reuse their services (EventBridge, Systems Manager, CloudTrail).
2. Build a lab organization: a management account, a security tooling account as delegated administrator for GuardDuty, Security Hub and Config, a log archive account receiving an organization trail, and one workload account. Add an SCP, an RCP and a KMS key used across accounts. Delete it all afterwards.
3. Write policies by hand until you can predict an evaluation result: identity plus resource policy, cross-account role with external ID, key policy plus grant, bucket policy with `aws:SourceVpce`.
4. Rehearse two runbooks end to end: compromised access key (deactivate, revoke sessions, investigate in CloudTrail) and compromised instance (isolate, snapshot, investigate in a forensics account).
5. After each module, take a mock; for every question, say which requirement each wrong option fails.
6. Book the exam when three full 65-question mocks in a row reach 800 or more in 170 minutes on questions you haven't seen.
