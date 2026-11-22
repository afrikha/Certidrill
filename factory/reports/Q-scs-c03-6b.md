# Q-scs-c03-6b — report

48 questions in `content/scs-c03/questions/governance/`, prefix `scsc03-6b-`, 8 per objective (6.2.2, 6.2.3, 6.2.4, 6.3.1, 6.3.2, 6.3.3).
Types: single 37, multi 7, ordering 2 (6.2.3 Firewall Manager prerequisites, 6.3.3 milestone cycle), dragdrop 2 (6.2.2 tag condition keys, 6.3.1 remediation mechanisms).
Difficulty: 8 easy / 25 medium / 15 hard. Validator: 0 problems.

## Decisions and deviations

- Audit Manager (closed to new customers on April 30, 2026): three 6.3.2 questions (report integrity, delegation, data sources) say that the company is an existing customer. Where the company is new, Audit Manager is a wrong option, and the answer is AWS Config conformance packs or Security Hub CSPM, which is what AWS's availability-change page recommends.
- 6.3.2 also uses AWS Artifact Assurance Assistant (launched July 2026, checked on the Artifact user guide). It is newer than guide v1.0, but it is part of Artifact, which the objective names.
- I did not use the AWS Well-Architected Agent (preview) as a correct answer.
- Multi and dragdrop stems end with the scoring NOTE and ordering stems do not, following the existing scs-c03 and aif-c01 files. The profile says these types are all or nothing on the real exam.
- I avoided the decisions already tested in sap-c03 (Artifact ISV reports, notifications, organization BAA, report-access policy, custom lens sharing, RAM external principals, RAM retain-on-leave, tag policy values).

## Facts not fully verified on a fetched page (please spot-check)

- That Lambda function actions (UpdateFunctionCode, UpdateFunctionConfiguration, DeleteFunction, TagResource, UntagResource) support `aws:ResourceTag` (scsc03-6b-tag-scp-protect-security). The Lambda ABAC page sends readers to the Service Authorization Reference, which I did not open for Lambda.
- Control IDs EC2.7 (EBS default encryption) and the Macie-enabled control in FSBP, and the service-linked rule prefix `securityhub-ec2-ebs-encryption-by-default`.
- That `ec2-instance-no-public-ip` is triggered by configuration changes.
- Audit Manager API-call evidence frequency (daily, weekly, monthly): this comes from chapter 63, not from a fetched page.
- Some reference titles were rebuilt from the H1 that WebFetch reported plus the guide suffix, for example "Using security group policies in Firewall Manager to manage Amazon VPC security groups - AWS WAF, ...", "Using AWS Firewall Manager administrators - ...", "AWS Audit Manager availability change - AWS Audit Manager", "What is AWS Artifact? - AWS Artifact" and "Using Assurance Assistant in AWS Artifact - AWS Artifact". I checked the exact titles of the other pages.
