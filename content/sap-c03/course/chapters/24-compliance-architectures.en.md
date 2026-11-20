Compliance questions start from an external obligation (a privacy law, a financial regulator, a health-data rule, a sovereignty requirement) and ask for the architecture that satisfies it with evidence: data that is protected and stays where it must, audit trails nobody can alter, reports an auditor accepts, and a documented view of the risks. This chapter covers data protection architectures, sovereignty controls, audit trails for regulated and AI workloads, data residency and transfer restrictions, compliance evidence, and risk assessment through threat modeling.

<!-- section: data-protection | objectives: 2.4.1 -->
## Architectures for data protection requirements

A regulator rarely names a service; it names outcomes. Translate each outcome into a control layer:

| Outcome required | Architecture |
| --- | --- |
| Know where personal data is | Amazon Macie automated discovery on S3, results tagged and sent to Security Hub; data catalog with sensitivity tags |
| Only authorized roles read it, even inside the company | Customer managed KMS key per data domain or per tenant, key policy limited to the consuming roles; Lake Formation column and row permissions for analytics |
| Access only from the corporate network and the organization | Data perimeter: VPC endpoint policies, `aws:SourceVpce` and `aws:PrincipalOrgID` in resource policies, RCPs for the organization-wide deny |
| Every read of a regulated object is recorded | CloudTrail data events on the S3 buckets or DynamoDB tables concerned, plus KMS `Decrypt` events |
| Records can't be altered or deleted during the retention period | S3 Object Lock in compliance mode, AWS Backup Vault Lock |
| Right to erasure for one person | One key per data subject or tenant only when the scale allows it (crypto-shredding); otherwise a deletion process across stores, recorded |

A data perimeter has three sides, each with its own policy type:

| Side | Question | Typical condition keys and policies |
| --- | --- | --- |
| Identity | Is the caller one of our principals? | `aws:PrincipalOrgID` in resource policies and RCPs |
| Resource | Is the target one of our resources? | `aws:ResourceOrgID` in SCPs and VPC endpoint policies |
| Network | Does the request come from our networks? | `aws:SourceVpc`, `aws:SourceVpce`, `aws:SourceIp`, with exceptions for AWS services acting for you (`aws:PrincipalIsAWSService`, `aws:ViaAWSService`) |

> **Exam trap.** CloudTrail logs management events by default, not data events. "Record every access to patient documents in S3" requires data event selectors on those buckets; an organization trail alone is not enough.

<!-- section: sovereignty | objectives: 2.4.2 -->
## Data sovereignty and regulatory requirements

Sovereignty requirements go further than location: they ask who operates the infrastructure, who can access the data or the keys, and whether the environment depends on systems outside a jurisdiction.

| Requirement | Design |
| --- | --- |
| Data stored and processed in one country | Commercial Region in that country, other Regions denied by SCP or Control Tower Region deny |
| Keys under the customer's exclusive control | Customer managed keys with restrictive key policies; CloudHSM key store for single-tenant HSMs; external key store when material must stay outside AWS |
| Data must stay on premises or in a specific facility for latency or law | AWS Outposts in that facility, with the same APIs and controls |
| EU-only operation, EU-resident personnel, metadata kept in the EU, independence from other Regions | AWS European Sovereign Cloud: generally available since January 14, 2026, first Region `eusc-de-east-1` in Brandenburg, Germany, separate partition `aws-eusc` with its own IAM and billing |
| Show the regulator AWS's certifications for the Region | AWS Artifact reports |

Because the European Sovereign Cloud is a separate partition, accounts, IAM identities, organizations and ARNs (`arn:aws-eusc:...`) are distinct from those of commercial Regions: a design spanning both needs separate accounts and federation into each partition, and services that cross Regions (replication, multi-Region keys) don't cross partitions.

> **Exam tip.** When the stem only says "data must stay in Germany", a commercial Region plus a Region-deny SCP is the least operational overhead. The sovereign partition answers stems that add operator residency, metadata location or independence from the global AWS infrastructure.

<!-- section: audit-trails | objectives: 2.4.3 -->
## Audit trail management for regulated workloads and AI services

An audit trail must be complete, tamper-evident, retained for the mandated period and readable only by auditors:

| Property | Implementation |
| --- | --- |
| Complete | Multi-Region organization trail; data events for regulated stores; Config recording of every resource type in scope |
| Tamper-evident | CloudTrail log file integrity validation: SHA-256 hashes and an hourly digest file signed with SHA-256 with RSA, each digest chained to the previous one |
| Immutable for the retention period | Log archive bucket with Object Lock compliance mode and a lifecycle to colder storage; SSE-KMS with a customer managed key |
| Separated from operators | Log archive account where workload administrators have no write or delete permission; SCPs deny stopping trails or Config recorders |
| Searchable | Athena on the trail bucket, CloudWatch Logs, or Security Lake in OCSF |

```bash
# Prove that no log file was modified or deleted for the audit period
aws cloudtrail validate-logs --trail-arn arn:aws:cloudtrail:eu-west-1:111122223333:trail/org-trail --start-time 2026-10-01T00:00:00Z --end-time 2026-10-31T23:59:59Z
```

**AI services** need two complementary trails:

| Question an auditor asks | Source |
| --- | --- |
| Who invoked which model, from which role, when, and in which Region was it processed | CloudTrail management events for `InvokeModel` and `Converse`; `additionalEventData.inferenceRegion` for cross-Region inference |
| Which agent, knowledge base or flow was called, and what guardrail decided | CloudTrail data events (`AWS::Bedrock::AgentAlias`, `AWS::Bedrock::KnowledgeBase`, `AWS::Bedrock::FlowAlias`, `AWS::Bedrock::Guardrail`) |
| What exactly was the prompt and the answer | Model invocation logging to S3 or CloudWatch Logs, with a caller-supplied `requestMetadata` for correlation |

```bash
aws cloudtrail put-event-selectors --trail-name org-trail --advanced-event-selectors '[{"Name":"Bedrock knowledge bases","FieldSelectors":[{"Field":"eventCategory","Equals":["Data"]},{"Field":"resources.type","Equals":["AWS::Bedrock::KnowledgeBase"]}]},{"Name":"Bedrock guardrails","FieldSelectors":[{"Field":"eventCategory","Equals":["Data"]},{"Field":"resources.type","Equals":["AWS::Bedrock::Guardrail"]}]}]'
```

Invocation logs contain personal data from prompts and also the content that guardrails blocked: protect them like the regulated data itself (customer managed key, restricted readers, retention rules).

> **Exam trap.** Validation only works on log files in the location where CloudTrail delivered them. Copying logs to another store and deleting the originals breaks the native `validate-logs` check; replicate the bucket instead and keep the source protected.

<!-- section: data-residency | objectives: 2.4.4 -->
## Data residency controls and transfer restrictions

Residency is enforced at three points: where resources can be created, where data can be copied, and where managed services process it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideEURegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "sts:*", "route53:*", "cloudfront:*", "support:*", "budgets:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
        "ArnNotLike": { "aws:PrincipalARN": "arn:aws:iam::*:role/platform-break-glass" }
      }
    }
  ]
}
```

`NotAction` exempts global services whose requests resolve to US East (N. Virginia); the Control Tower Region deny control applies a managed version of the same idea.

| Transfer path | Restriction |
| --- | --- |
| S3 Cross-Region Replication to a non-approved Region | Region-deny SCP prevents the destination bucket; deny `s3:PutReplicationConfiguration` except to the platform role |
| Multi-Region KMS keys, DynamoDB global tables, Aurora global databases | These replicas are requested in the source Region: deny `kms:ReplicateKey` (or limit it with `kms:ReplicaRegion`), `dynamodb:CreateTableReplica` and `rds:CreateGlobalCluster` except for the platform role |
| Snapshot and AMI copies, AWS Backup copy rules | Copies are requested in the destination Region, which the SCP denies; organization backup policies define the approved copy targets |
| Amazon Bedrock cross-Region inference | Geographic inference profiles (US, EU, APAC) keep processing in the geography, and the SCP must allow every Region of the profile; global profiles route to any commercial Region and need `aws:RequestedRegion` "unspecified" to be allowed: deny them for residency workloads |
| Central security tooling | Security Lake rollup Region and CloudWatch Logs centralization destination inside the same jurisdiction |
| Content delivery | CloudFront caches responses at edge locations worldwide: disable caching for regulated responses or keep them out of the distribution |

> **Exam trap.** Cross-Region inference can route to Regions that aren't enabled in your account. A residency requirement for a generative AI application is met by an in-geography inference profile and SCPs, not by leaving other Regions disabled.

<!-- section: compliance-evidence | objectives: 2.4.5 -->
## Compliance evidence collection and reporting

Evidence comes from two sides of the shared responsibility model:

| Evidence | Source |
| --- | --- |
| AWS's own controls: SOC 1, SOC 2, ISO, PCI DSS reports, certifications | AWS Artifact Reports, free, downloadable on demand by authorized IAM principals |
| Agreements with AWS (for example a business associate addendum) for one account or for all accounts of the organization | AWS Artifact Agreements, accepted from the management account for the organization |
| Compliance reports of ISV software bought on AWS Marketplace | AWS Artifact third-party reports (AWS Marketplace Vendor Insights) |
| Your resources' configuration and compliance over time | AWS Config: conformance pack dashboards, advanced queries exported to CSV or JSON, `get-resource-config-history` for the timeline |
| Control scores against PCI DSS, CIS or NIST | Security Hub CSPM standards and their findings |
| Backup compliance (frequency, retention, encryption, cross-Region copies) | AWS Backup Audit Manager frameworks and reports |
| Cross-account dashboards for auditors | Athena on Config data, with Amazon Quick dashboards |

Artifact proves what AWS does; it never proves that your buckets are encrypted. A complete evidence package combines Artifact reports with your own continuous evidence from Config, Security Hub CSPM, CloudTrail and AWS Backup.

> **Exam trap.** AWS Audit Manager is in maintenance mode and can't be set up in new accounts since April 30, 2026. For a new organization, AWS points to Config conformance packs (with the caveat that some frameworks such as SOC 2 and GDPR have no pack) and partner tools for full audit workflows.

<!-- section: risk-assessment | objectives: 2.4.6 -->
## Risk assessment and threat modeling

The Well-Architected Security pillar (SEC01-BP07) treats threat modeling as a high-risk gap when missing. Start at design time and keep the model alive: revisit it at each major change, new service or change in the threat landscape. It answers four questions:

1. **What are we working on?** A data flow diagram with trust boundaries, assumptions and scope.
2. **What can go wrong?** Threats brainstormed with STRIDE and catalogs such as the OWASP Top 10.
3. **What are we going to do about it?** Mitigations with owners, limited to what you control under the shared responsibility model.
4. **Did we do a good job?** Review coverage and quality, and improve.

**Threat Composer** (AWS Labs, also in the AWS Toolkit for VS Code) writes threat statements with a threat grammar and produces a human-readable and a machine-readable model, so the threat model can live in the repository as code.

| STRIDE threat | Typical AWS mitigation |
| --- | --- |
| Spoofing | IAM Identity Center with MFA, IAM roles instead of keys, mTLS, Cognito or AgentCore Identity for application users |
| Tampering | Object Lock, signed artifacts (KMS or ML-DSA signing), CloudTrail integrity validation, least-privilege write access |
| Repudiation | Organization trail, data events, invocation logs with caller identity |
| Information disclosure | Encryption with customer managed keys, data perimeter, Macie, private endpoints |
| Denial of service | Shield, WAF rate-based rules, CloudFront, Auto Scaling, quotas and throttling in API Gateway |
| Elevation of privilege | Permissions boundaries, SCPs, IAM Access Analyzer, Verified Permissions for application authorization |

Validate the residual risk continuously: Security Hub exposure findings show chained weaknesses (for example an internet-reachable instance with an exploitable vulnerability and a powerful role), Inspector adjusts CVSS with reachability, IAM Access Analyzer finds external and unused access, and AWS Fault Injection Service tests that availability mitigations really work.

> **Exam tip.** "Identify threats before the new payment workload is built, and keep the analysis versioned with the code" is threat modeling with Threat Composer in the design phase; GuardDuty and Inspector find threats and vulnerabilities in running resources, after deployment.

<!-- section: key-points -->
## Key points

- Map each regulatory outcome to a control: Macie, customer managed keys, data perimeter, data events, Object Lock.
- Data perimeter: identity (`aws:PrincipalOrgID`), resource (`aws:ResourceOrgID`), network (`aws:SourceVpce`).
- Sovereignty beyond location: the AWS European Sovereign Cloud is a separate partition with its own IAM and billing.
- Audit trails: organization trail, integrity validation, Object Lock, separate log archive account; Bedrock needs CloudTrail plus invocation logging.
- Residency: Region-deny SCP with `NotAction` for global services, block replication paths, geographic inference profiles only.
- Artifact proves AWS's compliance; Config, Security Hub CSPM and Backup Audit Manager prove yours; Audit Manager is closed to new accounts.
- Threat modeling: four questions, STRIDE, Threat Composer, revisited at every major change.
