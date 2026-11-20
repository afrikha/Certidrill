Governance questions describe an organization with dozens or hundreds of accounts, several business units and a central security team, and ask how to create accounts that are compliant from their first minute, collect every log and finding in one place, share network and security resources, set permission ceilings that nobody in a member account can remove, and keep resources compliant and patched. This chapter covers landing zones and account provisioning, centralized logging (including AI invocations), cross-account sharing, SCPs and RCPs, automated compliance monitoring, and vulnerability and patch management.

<!-- section: landing-zone | objectives: 2.3.1 -->
## Organizational structure, landing zones and account provisioning

Design OUs around **policy and lifecycle**, not the company chart: accounts in one OU share the same controls. A common baseline:

| OU | Accounts and purpose |
| --- | --- |
| Security | Log archive (immutable logs) and audit or security tooling (delegated administrator for GuardDuty, Security Hub, Inspector, Config) |
| Infrastructure | Network hub (Transit Gateway, inspection, DNS), shared services |
| Workloads, split into Prod and NonProd | One account per application and environment; production gets the strictest controls |
| Sandbox | Experimentation with spending limits, no connectivity to production |
| Policy staging | Test SCPs and RCPs before attaching them higher in the tree |
| Suspended | Accounts waiting for closure, with a deny-all SCP |

AWS Organizations allows five levels of OUs under the root; keep the tree shallow because policies are evaluated through every level.

**AWS Control Tower** builds the landing zone: an organization with Security OU accounts, centralized CloudTrail and Config logging, IAM Identity Center, and a catalog of controls applied per OU.

| Control behavior | Implemented with | Effect |
| --- | --- | --- |
| Preventive | SCPs, RCPs or declarative policies | The action is denied; status enforced or not enabled |
| Detective | AWS Config rules | Noncompliance is reported (clear or in violation); nothing is blocked |
| Proactive | AWS CloudFormation hooks | Noncompliant resources are not provisioned by CloudFormation (PASS, FAIL or SKIP) |

Guidance is independent of behavior: mandatory, strongly recommended, elective. Since landing zone version 4.0, mandatory controls are no longer applied by default. The **Region deny** control (`AWS-GR_REGION_DENY`) applies to the whole landing zone and can't deny the home Region; `CT.MULTISERVICE.PV.1` restricts Regions for chosen OUs only. Control Tower also offers a controls-only experience for organizations that don't run a full landing zone.

**Provisioning accounts**

| Requirement | Mechanism |
| --- | --- |
| Self-service account creation into a governed OU, from the console | Account Factory (users in the `AWSAccountFactory` group or administrators) |
| Each new account must contain a standard set of resources (VPC, roles, budgets) | Account Factory Customization: one blueprint (CloudFormation or Terraform, a Service Catalog product in a hub account) per account, deployed to the home Region or to all governed Regions |
| Accounts requested and customized as code through a GitOps pipeline | Account Factory for Terraform (AFT), deployed in its own AFT management account, with customizations for all accounts, a group of accounts or one account |
| Bring existing accounts under governance | Enroll them; they need the `AWSControlTowerExecution` role, and the target OU must have the `AWSControlTowerBaseline` enabled |

> **Exam trap.** Controls don't restrict the management account, and SCPs never apply to it. Keep workloads out of the management account; a stem that runs production there can't be fixed with an SCP.

<!-- section: centralized-logging | objectives: 2.3.2 -->
## Centralized logging and configuration management

| Data | Organization-wide mechanism |
| --- | --- |
| API activity | CloudTrail organization trail created by the management account or a delegated administrator; member accounts can see it but not stop or change it; logs land under `AWSLogs/<org-id>/<account-id>/` in the log archive bucket |
| Resource configuration and compliance history | AWS Config recording in every account and Region, plus an organization aggregator (read-only view) in the audit account |
| Threat detection | Amazon GuardDuty with a delegated administrator and auto-enable for new accounts, in every Region |
| Posture and correlated risk | AWS Security Hub CSPM (formerly Security Hub: control checks, ASFF findings, requires Config) and AWS Security Hub (OCSF, correlation of CSPM, Inspector, Macie and GuardDuty signals into exposure findings and attack paths); one delegated administrator for both, an aggregation Region for findings |
| Long-term security analytics in open format | Amazon Security Lake: CloudTrail, VPC Flow Logs, Route 53 Resolver query logs, EKS audit logs, WAF logs and Security Hub CSPM findings normalized to OCSF in Parquet, in S3 buckets you own, with rollup Regions and subscribers through Lake Formation |
| Application and service logs | CloudWatch Logs centralization rules: replicate new log events from chosen accounts, OUs and Regions to a destination account and Region, with an optional backup Region |

**AI model invocations.** CloudTrail records Bedrock `InvokeModel` and `Converse` calls as management events (who called which model), without prompt or response bodies; `InvokeAgent`, `Retrieve`, `RetrieveAndGenerate` and `ApplyGuardrail` are data events you must select. The prompts and completions come from **model invocation logging**, disabled by default and configured per account and Region, with a destination (CloudWatch Logs, S3 or both) in the same account and Region; bodies over 100 KB go only to S3. To centralize, combine invocation logging in each account with CloudWatch Logs centralization rules or S3 replication to the log archive account, and encrypt with customer managed keys whose policy allows the service.

> **Exam trap.** CloudTrail Lake is no longer open to new customers since May 31, 2026, and AWS recommends CloudWatch for new designs. A new organization that needs SQL queries on its trail uses an organization trail with Athena, CloudWatch or Security Lake, not a new CloudTrail Lake event data store.

<!-- section: resource-sharing | objectives: 2.3.3 -->
## Cross-account resource sharing

AWS RAM shares resources you own with the organization, OUs, accounts, or IAM roles and users for some resource types. Enable it once from the management account:

```bash
aws ram enable-sharing-with-aws-organization
aws ram create-resource-share --name network-hub-tgw --resource-arns arn:aws:ec2:eu-west-1:111122223333:transit-gateway/tgw-0abc1234def567890 --principals arn:aws:organizations::999988887777:ou/o-exampleorgid/ou-ab12-workloads --no-allow-external-principals
```

| RAM fact | Consequence |
| --- | --- |
| Sharing enabled with Organizations | No invitation inside the organization; accounts added to the OU get access automatically, removed accounts lose it |
| Enabling trusted access from the Organizations console only | Doesn't create the RAM service-linked role: sharing within the organization doesn't work |
| Principals outside the organization | Invitation to accept (7 days for subnets, transit gateways, prefix lists, Resolver rules; 12 hours for other types) |
| Shares are Regional | Share the resource in each Region where it exists |
| Managed permissions | Limit what consumers can do; consumers still need IAM policies, which can't exceed the permission |

| Shared resource | Typical design |
| --- | --- |
| Transit gateway | A network account owns it and its route tables; workload accounts create attachments (auto-accept or manual acceptance), routing stays central |
| VPC subnets (VPC sharing, organization only) | Participants launch resources in central subnets; the owner manages VPC, routes, NAT and endpoints; participants manage their own resources and security groups |
| Route 53 Resolver forwarding rules | One set of conditional forwarding rules to on-premises DNS, associated with VPCs in every account |
| AWS Private CA, prefix lists, IPAM pools, License Manager configurations | One authority, one list of CIDRs, one address plan, one license count for all accounts |

> **Exam tip.** "Every application team needs its own account, but the network team must keep control of routing and egress at the lowest cost" points to VPC sharing or a RAM-shared transit gateway from a network account, not one NAT gateway and VPC per account peered with each other.

<!-- section: scps-rcps | objectives: 2.3.4 -->
## Policy enforcement with SCPs and RCPs

| | SCP | RCP | Declarative policy | Permissions boundary |
| --- | --- | --- | --- | --- |
| Limits | Principals of member accounts | Resources of member accounts, whoever calls, external principals and root users included | Service configuration: VPC Block Public Access, VPC Encryption Controls, serial console, AMI public sharing, Allowed AMIs, IMDS defaults, EBS snapshot public access | One IAM user or role |
| Grants permissions | Never | Never | Not applicable | Never |
| Service-linked roles | Not affected | Not affected | Governed | Not applicable |
| Quotas | 10 per root, OU or account (since May 2026), 10,240 characters | 5 per root, OU or account (`RCPFullAWSAccess` included), 5,120 characters | Effective policy by inheritance | One per principal |

Neither SCPs nor RCPs affect the management account. SCPs and RCPs are filters: an action succeeds only if every SCP from the root to the account, every RCP above the resource, and an identity-based or resource-based policy all allow it, with no explicit deny. RCPs cover about 90 services, including S3, KMS, STS, SQS, Secrets Manager, DynamoDB, ECR and CloudWatch Logs, but not AWS managed KMS keys.

Use **SCPs** to stop your own principals: deny leaving the organization, disabling CloudTrail, GuardDuty or Config, using unapproved Regions, or creating IAM users. Use **RCPs** for the resource side of a data perimeter: even if a developer writes a bucket policy granting access to an outside account, the RCP denies it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceOrgIdentitiesOnS3",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-exampleorgid" },
        "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
      }
    }
  ]
}
```

Roll out through the policy staging OU, then lower OUs, then upward, and watch CloudTrail for `AccessDenied` before touching the root.

> **Exam trap.** An SCP can't stop a partner account outside the organization from reading a bucket that a bucket policy shared with it: SCPs apply only to principals in your member accounts. Blocking external access organization-wide is an RCP.

<!-- section: compliance-monitoring | objectives: 2.3.5 -->
## Automated compliance monitoring

| Requirement | Answer |
| --- | --- |
| Evaluate every resource against a rule as it changes or periodically | AWS Config rules: managed rules, custom rules in Lambda or in Guard |
| Deploy the same rules, or a whole framework, to all accounts | Organization Config rules or organization conformance packs (templates for PCI DSS, HIPAA, NIST and others) from the management or delegated administrator account |
| Fix noncompliant resources automatically | Config remediation with Systems Manager Automation documents |
| Score accounts against FSBP, CIS, PCI DSS or NIST SP 800-53 with severity | AWS Security Hub CSPM standards, configured across accounts, Regions and OUs with central configuration |
| Guarantee a control on every account of an OU | Control Tower detective controls (Config rules), or preventive controls to block the change instead of detecting it |
| Act on a finding in near real time | EventBridge rule on the Config or Security Hub event, Security Hub automation rules to update findings |

> **Exam trap.** AWS Audit Manager can no longer be set up in new accounts since April 30, 2026 (maintenance mode). A new organization collects compliance evidence with Config conformance packs and Security Hub CSPM, not by creating Audit Manager assessments.

<!-- section: vulnerability-patching | objectives: 2.3.6 -->
## Vulnerability scanning and patch management

**Amazon Inspector** scans continuously, rescans when a package changes or a new CVE is published, and adjusts the CVSS score with network reachability:

| Scan | Coverage |
| --- | --- |
| EC2 scanning | Hybrid mode by default: agent-based through the SSM Agent, agentless through EBS snapshots for instances without the agent |
| ECR scanning | Converts the private registry to enhanced scanning, continuous or on push, with a configurable rescan duration |
| Lambda standard and Lambda code scanning | Package dependencies; code scanning adds the function's own code |
| Code Security | First-party code, dependencies and infrastructure as code in repositories |
| Machine image scanning | AMIs you own, without launching instances |

Activate it organization-wide from a delegated administrator, with auto-enable for new accounts; findings go to EventBridge and Security Hub.

**Systems Manager Patch Manager** applies **patch baselines** (AWS managed or custom, with approval rules and auto-approval delays) through `AWS-RunPatchBaseline`. A **Quick Setup patch policy** covers all accounts and Regions of the organization or selected OUs, with separate schedules for scanning and installing; maintenance windows and "Patch now" work on one account and Region at a time. Compliance is reported per account and Region.

> **Exam tip.** "Scan daily, install weekly in a maintenance slot, across 200 accounts with the least operational overhead" is one Quick Setup patch policy targeting the organization, not maintenance windows created by a script in every account and Region.

<!-- section: key-points -->
## Key points

- OUs group accounts by controls; Control Tower controls are preventive (SCP, RCP, declarative), detective (Config) or proactive (CloudFormation hooks).
- Account Factory, Account Factory Customization blueprints, or AFT for GitOps provisioning; enrolling needs `AWSControlTowerExecution`.
- Organization trail, Config aggregator, GuardDuty and Security Hub delegated administrator, Security Lake in OCSF, CloudWatch Logs centralization rules.
- Bedrock prompts and responses come from model invocation logging (per account and Region), not from CloudTrail.
- CloudTrail Lake and Audit Manager are closed to new customers in 2026.
- RAM inside the organization needs `enable-sharing-with-aws-organization`; shares are Regional.
- SCPs: 10 per target, 10,240 characters, principals only; RCPs: 5 per target, resources and external principals; neither affects the management account or service-linked roles.
- Inspector for continuous CVE scanning, Quick Setup patch policies for organization-wide patching.
