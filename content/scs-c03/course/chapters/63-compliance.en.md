Compliance questions test whether a control objective runs on its own: a rule flags the drifting resource, a runbook fixes it, the right team is notified, and the evidence satisfies an auditor. They also check which service proves what, and which services closed to new customers in 2026. This chapter covers AWS Config, Security Hub CSPM and Security Hub, AWS Artifact, AWS Audit Manager and the AWS Well-Architected Tool.

<!-- section: config-rules | objectives: 6.3.1 -->
## Detecting noncompliant resources with AWS Config

AWS Config evaluates only what its **configuration recorder** records: turn recording on in every account and Region in scope (global resource types in one Region only). A rule returns `COMPLIANT`, `NON_COMPLIANT`, `NOT_APPLICABLE` or `ERROR` (invalid parameter).

| Rule kind | What you write | Typical use |
| --- | --- | --- |
| AWS managed rule | Nothing, only parameters | `s3-bucket-public-read-prohibited`, `cloudtrail-enabled`, `encrypted-volumes`, `cmk-backing-key-rotation-enabled` |
| Custom policy rule | A CloudFormation Guard policy | Property checks without code to maintain |
| Custom Lambda rule | A Lambda function that calls `PutEvaluations` | Logic that needs API calls or external data |
| Service-linked rule | Created by another service, for example Security Hub CSPM | Read-only in your account; you can't edit it or attach remediation |

**Triggers**: configuration changes (scoped by resource type, resource ID, or tag key and value), periodic (for example every 24 hours), or hybrid. **Evaluation modes**: detective (deployed resources) and proactive (resource properties before deployment, submitted with `StartResourceEvaluation`, for example from a pipeline). Proactive evaluation returns a result; it neither blocks the deployment nor remediates.

To deploy the same rules everywhere:

| Need | Mechanism |
| --- | --- |
| One rule in every member account, unchangeable by them | Organization Config rule (`PutOrganizationConfigRule`), API or CLI only, from the management account or a delegated administrator |
| A set of rules plus their remediation as one unit | Conformance pack: AWS managed, or custom from a YAML template |
| The same pack in every account, some accounts excluded | Organization conformance pack with `--excluded-accounts` |
| A framework-aligned starting point | Sample templates (Operational Best Practices for PCI DSS, NIST...) |
| Controls attached to OUs in a landing zone | AWS Control Tower detective controls (deployed as Config rules) |

Organization rules and conformance packs are Regional (call the API in each Region); accounts that join the organization receive them, if a recorder exists within 7 hours. Their delegated administrator uses the service principal `config-multiaccountsetup.amazonaws.com`.

```bash
aws organizations register-delegated-administrator \
  --account-id 444455556666 \
  --service-principal config-multiaccountsetup.amazonaws.com

aws configservice put-organization-conformance-pack \
  --organization-conformance-pack-name data-protection-baseline \
  --template-s3-uri s3://anycompany-config-templates/data-protection.yaml \
  --delivery-s3-bucket awsconfigconforms-anycompany \
  --excluded-accounts "777788889999"
```

A delivery bucket, if you name one, must start with `awsconfigconforms`.

> **Exam trap.** A Config rule never prevents anything, in detective or proactive mode. "Ensure that no one can create" calls for an SCP, an RCP or a declarative policy; "detect and correct within minutes" calls for a Config rule with automatic remediation.

<!-- section: remediation-notifications | objectives: 6.3.1 -->
## Remediation, aggregation and notifications

**Remediation** attaches a Systems Manager Automation runbook (`TargetType: SSM_DOCUMENT`, AWS-owned or your own) to a rule. Manual remediation waits for an operator; automatic remediation runs on each noncompliant evaluation.

| Setting | Behavior |
| --- | --- |
| `MaximumAutomaticAttempts` | 1 to 25, default 5 |
| `RetryAttemptSeconds` | Default 60; after the last failed attempt in that window, Config records a remediation exception |
| Resource ID parameter | Replaced at run time by the ID of the noncompliant resource |
| `AutomationAssumeRole` | Role the runbook assumes; give it only the permissions the fix needs |
| Turning automatic remediation on | Starts remediation for every resource already noncompliant |

Remediation works from compliance snapshots, so a recently changed resource can occasionally be remediated although compliant; each retry is a billed Automation execution.

A conformance pack carries the rule and its remediation in the same template:

```yaml
Resources:
  BucketPublicReadProhibited:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      Scope:
        ComplianceResourceTypes:
          - AWS::S3::Bucket
      Source:
        Owner: AWS
        SourceIdentifier: S3_BUCKET_PUBLIC_READ_PROHIBITED
  BucketPublicReadRemediation:
    Type: AWS::Config::RemediationConfiguration
    DependsOn: BucketPublicReadProhibited
    Properties:
      ConfigRuleName: s3-bucket-public-read-prohibited
      TargetType: SSM_DOCUMENT
      TargetId: AWS-DisableS3BucketPublicReadWrite
      Automatic: true
      MaximumAutomaticAttempts: 3
      RetryAttemptSeconds: 120
      Parameters:
        S3BucketName:
          ResourceValue:
            Value: RESOURCE_ID
        AutomationAssumeRole:
          StaticValue:
            Values:
              - arn:aws:iam::111122223333:role/ConfigS3Remediation
```

An **aggregator** replicates configuration and compliance data from many accounts and Regions into one account, at no extra charge. Its source is a list of accounts (each must authorize the aggregator account and Region) or the organization (no authorization; a role with `AWSConfigRoleForOrganizations`; delegated administrator registered with `config.amazonaws.com`). It is read-only: no rule deployment, no remediation.

**Notifications** have two paths:

| Path | Content | When to choose it |
| --- | --- | --- |
| SNS topic of the delivery channel | Every Config message: configuration item changes, snapshots, compliance changes, evaluation start, delivery failures | Rarely for alerting: very noisy |
| EventBridge rule on `aws.config` | Only the events you filter, for example compliance changes to `NON_COMPLIANT` | Alerting and event-driven remediation (SNS, Lambda, Automation, AWS User Notifications) |

```json
{
  "source": ["aws.config"],
  "detail-type": ["Config Rules Compliance Change"],
  "detail": {
    "messageType": ["ComplianceChangeNotification"],
    "configRuleName": ["s3-bucket-public-read-prohibited"],
    "newEvaluationResult": {
      "complianceType": ["NON_COMPLIANT"]
    }
  }
}
```

AWS User Notifications builds on EventBridge and delivers to the Console Notification Center, email, chat channels and the AWS Console Mobile App.

> **Exam tip.** A security account that must see every account's compliance uses an organization aggregator; fixes run from remediation in each account, deployed by an organization conformance pack.

<!-- section: security-hub-compliance | objectives: 6.3.1 -->
## Compliance standards in Security Hub CSPM and Security Hub

**AWS Security Hub CSPM** (the service formerly named Security Hub) runs security standards as controls and produces findings with a compliance status (`PASSED`, `FAILED`, `WARNING`, `NOT_AVAILABLE`):

| Standard | Use |
| --- | --- |
| AWS Foundational Security Best Practices | AWS's own baseline across services, the default choice |
| CIS AWS Foundations Benchmark v1.2.0, v1.4.0, v3.0.0, v5.0.0 | CIS alignment; v5.0.0 recommended, enable it before disabling an older version |
| NIST SP 800-53 Rev. 5, NIST SP 800-171 Rev. 2, PCI DSS, CRI Profile | Regulatory frameworks |
| AWS Resource Tagging, AI Security Best Practices | Tag governance, AI workloads |
| Service-managed standard: AWS Control Tower | Controls managed from Control Tower |

Most controls rely on AWS Config. Security Hub CSPM creates **service-linked Config rules** prefixed `securityhub-`, outside the Config rule quota, whose results appear only in Security Hub. Without recording, control `Config.1` fails and dependent controls return `WARNING`; when the new Security Hub is also enabled, a service-linked recorder (`AWSConfigurationRecorderForSecurityHubCSPM`) is managed for you. To stop a check that doesn't apply, **disable the control**: evaluations and charges stop.

**Across an organization**, a delegated administrator configures Security Hub CSPM. AWS now recommends **Security Hub CSPM declarative policies**, attached through AWS Organizations with a default configuration and Regional overrides. They exclude **central configuration** (home Region, linked Regions, up to 20 configuration policies): the first declarative policy that governs an account disables it organization-wide. The new Security Hub uses **Security Hub policies** (`enable_in_regions`, `disable_in_regions`).

**Acting on findings**:

| Requirement | Mechanism |
| --- | --- |
| Raise severity of findings on production accounts, suppress informational ones | Security Hub CSPM automation rules (ASFF criteria, up to 100 per administrator account, per Region) |
| Open a Jira Cloud or ServiceNow ITSM ticket for critical findings | New Security Hub automation rules (OCSF criteria, update `SeverityId`, `StatusId`, `Comment`, or create a ticket) |
| Fix every new failed finding of a control automatically | EventBridge rule on `Security Hub Findings - Imported` filtered on the control, target Lambda or an Automation runbook |
| Let an analyst trigger a fix on selected findings | Custom action (up to 50), EventBridge rule on `Security Hub Findings - Custom Action` matching its ARN |

With Region aggregation, new Security Hub automation rules are created in the home Region and apply to linked Regions; Security Hub CSPM rules apply only in their own Region.

> **Exam trap.** Automation rules only change finding fields or open tickets. Remediation comes from Config remediation or from an EventBridge rule that starts Lambda or Systems Manager Automation.

<!-- section: audit-evidence | objectives: 6.3.2 -->
## Collecting audit evidence with AWS Artifact and AWS Audit Manager

**AWS Artifact** is free and covers AWS's side of the shared responsibility model:

| Need | Artifact feature |
| --- | --- |
| AWS's SOC, ISO and PCI DSS reports and certifications for an auditor | Reports, downloaded on demand after accepting their terms |
| Reports of ISV software bought through AWS Marketplace | Third-party reports, for customers granted access in AWS Marketplace Vendor Insights |
| A business associate addendum (BAA) for HIPAA workloads in one account | Account agreement |
| The same agreement for every current and future account | Organization agreement, accepted or terminated only from the management account, all features enabled |
| Email when new SOC reports are published | Artifact notifications (filter by category and series, up to 20 verified addresses) |

Give each auditor separate credentials scoped to the reports they need:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AuditorReadSocPciIsoReports",
      "Effect": "Allow",
      "Action": [
        "artifact:ListReports",
        "artifact:GetReportMetadata",
        "artifact:GetReport",
        "artifact:GetTermForReport"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "artifact:ReportSeries": ["SOC", "PCI", "ISO"],
          "artifact:ReportCategory": ["Certifications and Attestations"]
        }
      }
    }
  ]
}
```

**AWS Audit Manager** maps your own evidence to frameworks. It has been in maintenance since **April 30, 2026**: it can no longer be set up in new accounts, new Regions or new organizations, and it gets no new features or frameworks. Existing customers keep using it, create assessments and add accounts of their organization.

| Data source | Evidence type | Collection |
| --- | --- | --- |
| AWS Config rules | Compliance check | When the rule evaluates |
| Security Hub CSPM controls | Compliance check | On the control's schedule |
| CloudTrail | User activity | Continuous |
| AWS API calls | Configuration data | Daily, weekly or monthly |
| Uploaded files (policies, procedures, on-premises) | Manual evidence | When uploaded |

An **assessment** applies a framework (standard, such as PCI DSS, HIPAA, SOC 2 or GDPR, or custom) to in-scope accounts and collects evidence until set inactive. **Delegations** send control sets to experts. An **assessment report** holds only the selected evidence, plus a `digest.txt` checksum checked with `ValidateAssessmentReportIntegrity`. **Evidence finder** stores evidence in a CloudTrail Lake event data store. Audit Manager collects evidence; it never certifies compliance.

For a new organization, AWS points to Config conformance packs (evidence exported with advanced queries or `get-resource-config-history`), Security Hub CSPM standards and Control Tower controls. Conformance packs cover only technical controls a Config rule can evaluate; SOC 2 and GDPR have no conformance pack equivalent.

> **Exam trap.** Artifact proves what AWS does, never that your buckets are encrypted. "AWS's PCI DSS attestation" is Artifact; "prove our resources met PCI DSS all year" is Config and Security Hub CSPM evidence (Audit Manager only where already set up).

<!-- section: well-architected-review | objectives: 6.3.3 -->
## Evaluating architectures with the AWS Well-Architected Tool

The **AWS Well-Architected Tool** (free) records a review of a **workload** against the six pillars. The Security pillar has seven areas: security foundations, identity and access management, detection, infrastructure protection, data protection, incident response, application security.

| Element | What it does |
| --- | --- |
| Workload | Name, review owner, environment (production or pre-production), Regions, up to 100 account IDs, optional AppRegistry application |
| Lenses | AWS Well-Architected Framework lens applied automatically; others from the Lens Catalog or custom lenses; up to 20 per workload |
| Custom lens | Your own pillars, questions and best practices, shareable with accounts or the organization |
| Profile | Business context that prioritizes the questions and risks of the improvement plan |
| Review template | Pre-filled answers reused across workloads, shareable in the same Region |
| High and medium risk issues | Result of your answers; accepted risks need a documented business reason |
| Improvement plan | Prioritized best practices to implement |
| Milestone | Snapshot of the workload's state to measure progress |

The **Trusted Advisor integration** (Business and Enterprise Support) is activated per workload: the tool reads checks for the workload's accounts and Regions, or its AppRegistry resources, and shows them beside the matching Framework lens best practices; other accounts of the workload need an IAM role for it. A **Jira** integration syncs improvement items.

| Requirement | Answer |
| --- | --- |
| Review a workload's design against AWS security best practices, with risks and a plan | Well-Architected Tool, Framework lens |
| Same review against the company's own security standards | Custom lens shared through Organizations |
| Continuous technical check of deployed resources | Security Hub CSPM AWS Foundational Security Best Practices |
| Config rules mapped to the Security pillar | Conformance pack Operational Best Practices for AWS Well-Architected Framework Security Pillar |
| Quick account checks (public snapshots, root MFA, open ports) | Trusted Advisor security checks |

> **Exam tip.** The Well-Architected Tool is a questionnaire, not a scanner. "Continuously evaluate" resources points to Security Hub CSPM or Config; design decisions, risk tracking and progress over time point to the tool with milestones.

<!-- section: key-points -->
## Key points

- Config rules detect what the recorder records; proactive mode blocks nothing.
- Organization rules and conformance packs are Regional and locked for member accounts.
- Remediation: Automation runbook, 1 to 25 attempts (default 5); none on service-linked rules or through an aggregator.
- Alert with EventBridge filtered on `NON_COMPLIANT`, not the delivery channel's SNS topic.
- Security Hub CSPM runs standards on Config data; declarative policies replace central configuration.
- Artifact proves AWS's controls; Audit Manager closed to new accounts since April 30, 2026.
- Well-Architected Tool: lenses, profiles, templates, risks, milestones; Trusted Advisor on the Framework lens only.
