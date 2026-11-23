Multi-account questions describe an organization that grows by dozens of accounts a month and ask how to create each account already compliant, give engineers and pipelines access through roles instead of users, set permission limits that no member account can remove, and turn on detective and security services everywhere without touching each account. The best answers use AWS Organizations and AWS Control Tower features with delegated administrators and auto-enable settings, not scripts run account by account.

<!-- section: account-structure | objectives: 2.2.1 -->
## Account structures and best practices

An AWS account is the strongest isolation boundary: separate IAM, quotas, billing and blast radius. Workloads get **one account per application and environment**, grouped in **organizational units (OUs)** that share the same policies.

| OU | Typical accounts | Notes |
| --- | --- | --- |
| Security | Log archive, audit (security tooling) | Created by Control Tower; delegated administrator for security services |
| Infrastructure | Network hub, shared services (directory, CI/CD tooling) | Transit gateway and shared subnets through AWS RAM |
| Workloads, split Prod and NonProd | Application accounts | Strictest SCPs on Prod |
| Sandbox | Developer experiments | Budgets, no connectivity to production |
| Policy staging | Test accounts for new SCPs | Validate a policy before attaching it higher |
| Suspended | Accounts waiting for closure | Deny-all SCP |

Rules for the **management account**: no workloads, few users, MFA on the root user, billing and organization administration only. SCPs and RCPs never restrict it, so anything that runs there escapes the guardrails. Delegate each service to a member account:

| Service | Delegated administrator typically in |
| --- | --- |
| AWS Config aggregator and organization rules, Security Hub CSPM, GuardDuty, Detective, Inspector, Macie | Audit (security tooling) account |
| CloudFormation StackSets (service-managed) | Shared services or deployment account |
| IAM Identity Center, Service Catalog portfolio sharing | Shared services account |

> **Exam trap.** "Run the deployment pipeline in the management account because it already has access to every account" is wrong: use a tooling account that assumes roles in target accounts, and a delegated administrator for StackSets.

<!-- section: account-provisioning | objectives: 2.2.2 -->
## Standardizing and automating account provisioning

| Requirement | Mechanism |
| --- | --- |
| Create governed accounts from a console form or a Service Catalog product | Control Tower **Account Factory** (an account is created, enrolled and placed in an OU with its controls) |
| Each new account must contain a standard set of resources, defined once | **Account Factory Customization (AFC)**: a blueprint (CloudFormation template or Terraform, published as a Service Catalog product in a hub account) applied when the account is created or updated |
| Account requests and customizations as code, through Git and a pipeline | **Account Factory for Terraform (AFT)**: account request files in a repository, global and per-account customizations, run from an AFT management account |
| Deploy CloudFormation templates, SCPs and RCPs to accounts and OUs through a GitOps manifest | **Customizations for AWS Control Tower (CfCT)**, triggered by Control Tower lifecycle events; target OUs need `AWSControlTowerBaseline` enabled |
| Organizations without Control Tower | `CreateAccount` API, then a service-managed StackSet with automatic deployment on the target OU |
| React to account creation with custom steps | EventBridge rule on the Control Tower `CreateManagedAccount` lifecycle event, invoking Lambda or Step Functions |

```json
{
  "source": ["aws.controltower"],
  "detail-type": ["AWS Service Event via CloudTrail"],
  "detail": {
    "eventName": ["CreateManagedAccount"],
    "serviceEventDetails": {
      "createManagedAccountStatus": { "state": ["SUCCEEDED"] }
    }
  }
}
```

A lifecycle event is emitted only when the action **completes** (state `SUCCEEDED` or `FAILED`), so the automation runs against an account that already has its baseline; a retried creation is recorded as `UpdateManagedAccount`, so listen for both. Accounts created with `CreateAccount` are asynchronous too: poll `DescribeCreateAccountStatus` before using the new account ID.

```bash
aws organizations create-account --email aws-orders-prod@example.com \
  --account-name orders-prod --role-name OrganizationAccountAccessRole
aws organizations describe-create-account-status --create-account-request-id car-0123456789abcdef
aws organizations move-account --account-id 444455556666 \
  --source-parent-id r-ab12 --destination-parent-id ou-ab12-22222222
```

> **Exam tip.** "New accounts must receive a VPC, IAM roles and budgets automatically, with the least operational overhead, in an organization that already uses Control Tower" points to Account Factory with a customization blueprint (or AFT when the team wants Terraform and Git), not a Lambda function that loops over accounts.

<!-- section: organizations-control-tower | objectives: 2.2.3 -->
## Creating, consolidating and centrally managing accounts

**AWS Organizations** has two feature sets: consolidated billing only, or **all features** (required for SCPs, RCPs, tag policies, backup policies, declarative policies, trusted access and delegated administrators). Accounts join in two ways:

| | Created in the organization | Invited existing account |
| --- | --- | --- |
| `OrganizationAccountAccessRole` (administrator role trusted by the management account) | Created automatically | **Not** created: create it manually |
| Billing | Consolidated from day one | Consolidated after acceptance |
| Leaving | Possible once the account has its own payment information | Same |

Consolidation benefits: one bill, Reserved Instance and Savings Plans sharing across accounts, aggregated volume discounts.

**AWS Control Tower** sets up and governs a **landing zone**: an organization with a Security OU (log archive and audit accounts), an organization CloudTrail trail, AWS Config in governed Regions, IAM Identity Center (optional), and **controls** applied per OU:

| Control behavior | Implementation | Result |
| --- | --- | --- |
| Preventive | SCPs (and RCPs) | Blocks the action |
| Detective | AWS Config rules | Reports noncompliance |
| Proactive | CloudFormation Hooks | Blocks noncompliant resources before CloudFormation provisions them |

Existing accounts are **enrolled** into a registered OU (they need the `AWSControlTowerExecution` role). Changes made outside Control Tower (an SCP edited in Organizations, an account moved by hand) create **drift**, shown in the console and repaired by re-registering the OU or updating the landing zone. Landing zone settings include governed Regions and a Region deny control.

> **Exam trap.** Modifying the SCPs that Control Tower created, or deleting its roles, causes drift and can break enrollment. Add your own SCPs or controls instead of editing the managed ones.

<!-- section: multi-account-iam | objectives: 2.2.4 -->
## IAM for multi-account organizations: SCPs and assumed roles

**SCPs** set the **maximum** permissions of IAM users and roles (root user included) in member accounts. They grant nothing: an action needs an allow in every SCP from the root to the account **and** an identity-based or resource-based policy allow, with no explicit deny anywhere. SCPs don't affect service-linked roles or the management account.

| Strategy | How | Trade-off |
| --- | --- | --- |
| Deny list (default) | Keep `FullAWSAccess` attached, add SCPs with explicit `Deny` statements | Easy; new services are allowed automatically |
| Allow list | Replace `FullAWSAccess` with SCPs that allow only listed services, at every level | Strict; every new service must be added |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "cloudfront:*", "route53:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] },
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/PlatformAdmin" }
      }
    },
    {
      "Sid": "ProtectSecurityServices",
      "Effect": "Deny",
      "Action": ["cloudtrail:StopLogging", "cloudtrail:DeleteTrail", "guardduty:DeleteDetector", "config:StopConfigurationRecorder", "organizations:LeaveOrganization"],
      "Resource": "*"
    }
  ]
}
```

**Cross-account access** uses roles: the target account's role has a **trust policy** naming the source account or role; the caller needs `sts:AssumeRole` on that role ARN in its own policy; the temporary credentials carry only the target role's permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/pipeline-deployer" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-exampleorgid" } }
    }
  ]
}
```

| Requirement | Answer |
| --- | --- |
| Engineers sign in once and work in many accounts | IAM Identity Center permission sets assigned to groups per account (each assignment becomes a role in the account) |
| A pipeline in a tooling account deploys to test and prod accounts | Cross-account deployment roles assumed by the pipeline (CloudFormation actions take a `RoleArn` in the target account) |
| A third party (SaaS vendor) assumes a role in your account | Trust policy with an `sts:ExternalId` condition |
| Allow any principal of the organization, present and future, to read a bucket | Resource policy with `aws:PrincipalOrgID` (or `aws:PrincipalOrgPaths` for an OU) |
| Prevent member accounts from granting access outside the organization | Resource control policies (RCPs) on the resource side; SCPs only limit your own principals |
| Delegated team creates roles but can't exceed its own permissions | Permissions boundaries required by an SCP or IAM condition on `iam:CreateRole` |

> **Exam trap.** An SCP that allows an action doesn't give it to anyone; an IAM administrator in a member account still can't do what an SCP denies. When access is denied "even with AdministratorAccess", look for an SCP or RCP; when an SCP should restrict the management account, it can't.

<!-- section: governance-at-scale | objectives: 2.2.5 -->
## Governance and security controls at scale

Each service is enabled once for the organization from a delegated administrator, per Region, with new accounts covered automatically:

| Service | Organization-wide mechanism | What it gives |
| --- | --- | --- |
| AWS Config | Organization aggregator; organization Config rules and conformance packs deployed from the delegated administrator; remediation with Systems Manager Automation | Configuration history and compliance of every resource |
| AWS Control Tower | Controls per OU (preventive, detective, proactive) | Guardrails applied to every account of the OU, current and future |
| AWS Security Hub CSPM (the guide's AWS Security Hub) | Central configuration policies (service, standards and controls per OU, new accounts included), aggregation Region; requires Config | Security standards (AWS Foundational Security Best Practices, CIS, PCI DSS, NIST) and findings from other services in one place |
| Amazon GuardDuty | Delegated administrator, auto-enable `ALL` or `NEW` members, protection plans | Threat detection from CloudTrail, VPC Flow Logs, DNS logs and more |
| Amazon Detective | Delegated administrator, behavior graph across member accounts | Investigation of GuardDuty and Security Hub findings, not detection |
| AWS Service Catalog | Portfolios shared to the organization or OUs | Only approved, preconfigured products are provisioned |
| SCPs and RCPs | Attached to root, OUs or accounts | Permission ceilings no member can remove |

```bash
aws guardduty update-organization-configuration --detector-id 12abc34d567e8fa901bc2d34eexample \
  --auto-enable-organization-members ALL
aws configservice put-organization-conformance-pack --organization-conformance-pack-name baseline-pack \
  --template-s3-uri s3://example-org-templates/operational-best-practices.yaml
aws securityhub update-organization-configuration --no-auto-enable \
  --organization-configuration '{"ConfigurationType": "CENTRAL"}'
```

With **central configuration** (run from the delegated administrator in the home Region), auto-enable is turned off on purpose: **configuration policies** associated with the root or OUs decide where Security Hub CSPM, standards and controls are enabled, including in new accounts.

Findings flow to **EventBridge** in the delegated administrator account (and the aggregation Region for Security Hub CSPM), where rules route them to notification, ticketing or automated remediation (Lambda, Step Functions, Systems Manager Automation). Security Hub CSPM **automation rules** update or suppress findings by criteria.

> **Exam tip.** "Turn on threat detection in every current and future account of all Regions with the least effort" is a GuardDuty delegated administrator with auto-enable for all members, repeated in each Region (GuardDuty is Regional). "Find out what the compromised role did across accounts" is Detective, not GuardDuty.

<!-- section: key-points -->
## Key points

- One account per workload and environment, OUs by policy, no workloads in the management account, delegated administrators in security and shared services accounts.
- Account Factory, AFC blueprints, AFT (Terraform and Git), CfCT (manifest and lifecycle events); without Control Tower, `CreateAccount` plus StackSets with automatic deployment.
- Control Tower lifecycle events in EventBridge fire after completion: `CreateManagedAccount` triggers custom onboarding.
- Organizations all features for SCPs and delegated administrators; invited accounts lack `OrganizationAccountAccessRole`.
- SCPs are ceilings, never grants, not on the management account or service-linked roles; deny list with `FullAWSAccess` is the default strategy.
- Cross-account access: trust policy plus `sts:AssumeRole`; Identity Center for people; `ExternalId` for third parties; `aws:PrincipalOrgID` in resource policies.
- Config, Security Hub CSPM, GuardDuty and Detective enabled organization-wide from a delegated administrator with auto-enable, Region by Region.
