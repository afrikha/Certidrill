The account is the strongest isolation boundary on AWS, and an organization turns hundreds of accounts into something one security team can govern. Questions describe a company growing to many accounts, or inheriting some in an acquisition, and ask how to structure the organization, roll out Control Tower without breaking workloads, set guardrails member accounts can't remove, run security services from a dedicated account, and lock down the root user.

<!-- section: organizations-setup | objectives: 6.1.1 -->
## Deploying and configuring AWS Organizations

An organization has one **management account** (it pays, creates accounts, attaches policies) and **member accounts** grouped in organizational units (OUs) under a root, up to five OU levels deep. Security features (SCPs, RCPs, declarative policies, delegated administrators) require **all features**; an organization created for consolidated billing only must be switched with `enable-all-features`, which every invited account must approve.

Rules that shape every design:

| Fact | Consequence for security |
| --- | --- |
| SCPs and RCPs never apply to the management account | Run no workloads there; give access to very few people; protect its root user first |
| Accounts created by Organizations get the `OrganizationAccountAccessRole` role, trusted by the management account | Invited accounts don't have it: create an equivalent role, or enroll them in Control Tower |
| Trusted access lets a service act across the organization; delegated administration lets a member account manage it | Enable trusted access per service, then register the security tooling account as delegated administrator |
| An account can leave the organization unless prevented | Deny `organizations:LeaveOrganization` with an SCP |
| Policies attach to the root, OUs or accounts and are inherited downwards | Build OUs around the controls they need, not around the company chart |

A security-oriented OU structure:

| OU | Accounts | Typical controls |
| --- | --- | --- |
| Security | Log archive, security tooling (delegated administrator for GuardDuty, Security Hub, Inspector, Macie, Config) | Deny changes to log buckets and trails except by automation roles |
| Infrastructure | Networking hub, shared services | Only the network team can change routes, firewalls and DNS |
| Workloads (Prod, NonProd) | One account per application and environment | Region restriction, encryption and public access controls; stricter in Prod |
| Sandbox | Experimentation accounts | No connectivity to production, spending limits |
| Suspended | Accounts awaiting closure | Deny everything |
| Exceptions or staging | Accounts that test new policies or need a documented exception | Policies tested here before wider attachment |

```bash
aws organizations enable-all-features
aws organizations enable-aws-service-access --service-principal guardduty.amazonaws.com
aws organizations create-organizational-unit --parent-id r-a1b2 --name Security
aws organizations create-account --email aws-log-archive@example.com --account-name log-archive
```

> **Exam trap.** A company that "ran production in the management account for years" can't fix the problem by attaching an SCP to the root: SCPs skip the management account. The answer is to move the workloads to member accounts and restrict access to the management account.

<!-- section: control-tower | objectives: 6.1.2 -->
## Implementing AWS Control Tower in new and existing environments

AWS Control Tower orchestrates Organizations, IAM Identity Center, Service Catalog, CloudTrail and Config into a **landing zone**, and adds a catalog of controls, a dashboard of compliance, and Account Factory.

**Landing zone 4.0** (November 2025) made the landing zone modular: you choose which integrations to enable (AWS Config, AWS CloudTrail, Security Roles, AWS Backup), with separate S3 buckets and SNS topics per service; a Security OU is no longer mandatory, but all hub accounts must be in the same OU; and the manifest is optional. Disabling the Config integration also requires disabling Security Roles, IAM Identity Center and Backup integrations. A **controls-only** experience creates a minimal landing zone with basic Organizations integration and lets you enable controls without the `AWSControlTowerBaseline` baseline on OUs.

| Situation | Approach |
| --- | --- |
| New organization | Set up the landing zone in a new management account; Control Tower creates the shared accounts and baseline |
| Existing organization, accounts already in use | Set up the landing zone in the existing management account, then register OUs one at a time (the baseline is applied to the OU) |
| Existing accounts to bring under governance | Enroll them into a registered OU; each needs the `AWSControlTowerExecution` role trusted by the management account; resolve conflicts with existing Config recorders or trails first |
| Need only guardrails, not the full baseline | Controls-only experience, enabling controls directly on OUs |
| Accounts created with standard customizations | Account Factory (console or Service Catalog), Account Factory Customization blueprints, or Account Factory for Terraform (AFT) for a GitOps pipeline; AFT can run plan-only customization runs to preview changes |

**Controls** are grouped by behavior and by guidance (mandatory, strongly recommended, elective), and are searched in the **Control Catalog** (renamed from the Controls Library in June 2025).

| Behavior | Implemented with | Result |
| --- | --- | --- |
| Preventive | SCPs, RCPs or declarative policies | The action is denied in every account of the OU |
| Detective | AWS Config rules (service-linked Config rules deployed by Control Tower) | Noncompliant resources are reported on the dashboard |
| Proactive | CloudFormation hooks | Noncompliant resources are rejected before CloudFormation provisions them |

**Optional and custom controls.** Optional controls (strongly recommended and elective) are enabled per OU from the catalog, in the console or with the `EnableControl` API. Requirements the catalog doesn't cover are added with Customizations for AWS Control Tower (CfCT: a manifest of SCPs and CloudFormation templates deployed by a pipeline on account events), with AFT customizations, with your own SCPs or RCPs attached to OUs, or with Config rules and conformance packs deployed by StackSets or organization rules. Never edit the SCPs that Control Tower manages: changes to managed resources, or moving an account between OUs outside Control Tower, create **drift**, which you repair by re-registering the OU or updating the landing zone.

> **Exam trap.** Detective controls report; they don't stop anything. When the stem requires that the action "must not be possible" (for example disabling CloudTrail or creating unencrypted volumes through CloudFormation), choose a preventive or proactive control, not a Config rule.

<!-- section: organization-policies | objectives: 6.1.3 -->
## Organization policies that manage permissions

| | SCP | RCP | EC2 declarative policy | AI services opt-out policy |
| --- | --- | --- | --- | --- |
| Controls | Maximum permissions of IAM users and roles in member accounts, root user included | Maximum permissions on resources in member accounts, whoever the caller is, outside principals and root included | Desired configuration of EC2, VPC and EBS features, enforced by the service's control plane | Whether AWS AI services may store and use your content for service improvement |
| Grants anything | No | No | No (sets a configuration) | No |
| Not affected | Management account, service-linked roles | Management account, service-linked roles, AWS managed KMS keys, services outside the supported list | Applies to service-linked roles too | Applies in every Region, including disabled ones |
| Quotas | 10 per root, OU or account, 10,240 characters | 5 per target, 5,120 characters | Effective policy by inheritance | Effective policy by inheritance |

**SCP evaluation.** An action is allowed only if every SCP on the path from the root to the account allows it and no SCP denies it, and then an identity-based or resource-based policy must still grant it. With the default `FullAWSAccess` policy kept at every level, write **deny-list** SCPs (explicit denies with exceptions on `aws:PrincipalArn`). An **allow-list** strategy replaces `FullAWSAccess` with explicit allows, which must exist at every level.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProtectSecurityServices",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "guardduty:DeleteDetector",
        "guardduty:DisassociateFromAdministratorAccount",
        "config:StopConfigurationRecorder",
        "config:DeleteConfigurationRecorder",
        "securityhub:DisableSecurityHub",
        "organizations:LeaveOrganization"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityAutomation" }
      }
    }
  ]
}
```

**RCPs** protect the resource side: they stop an outside principal from reading a bucket, queue, secret or key even when a member account's resource policy grants access. Typical RCPs require `aws:PrincipalOrgID` (with an exception for AWS service principals) or `aws:SecureTransport`. Use SCPs for "our people must not", RCPs for "our resources must never be reached by".

**EC2 declarative policies** set seven attributes: VPC Block Public Access, VPC Encryption Controls (off, monitor, enforce), serial console access, AMI block public access, Allowed AMIs, instance metadata defaults (for example IMDSv2 required) and EBS snapshot block public access. The configuration persists when the service adds new APIs and applies to new accounts as they join; a custom error message (without PII) can point users to an internal page, and the account status report shows how many accounts already match before you attach the policy. Detaching the policy rolls the attribute back to its previous state.

**AI services opt-out policies** stop supported AWS AI services from storing and using your content for service improvement; when you opt out, the services delete the historical content they kept for that purpose. Lock the choice so that child OUs can't change it:

```json
{
  "services": {
    "default": {
      "opt_out_policy": {
        "@@assign": "optOut",
        "@@operators_allowed_for_child_policies": ["@@none"]
      }
    }
  }
}
```

Other policy types configure services rather than permissions (backup, tag, chat applications, Security Hub, Amazon Inspector, Amazon GuardDuty, Amazon Bedrock Guardrails enforcement, Amazon S3, upgrade rollout) and, unlike SCPs and RCPs, generally apply to the management account too.

> **Exam trap.** An SCP that denies `s3:GetObject` to everyone outside the organization doesn't work: SCPs only constrain your own principals. Blocking external access to member-account resources is an RCP (or a resource policy on each resource).

<!-- section: delegated-admin | objectives: 6.1.4 -->
## Centrally managing security services

The management account should do almost nothing day to day. For each security service, enable trusted access and register a **delegated administrator**, usually one security tooling account in the Security OU, and use the same account across services for consistent governance.

| Service | What the delegated administrator does | Points that are tested |
| --- | --- | --- |
| Amazon GuardDuty | Enables detectors and protection plans in member accounts, sees all findings | Regional: designate it in every Region, and it must be the same account in all of them; auto-enable `NEW` or `ALL`; up to 50,000 members; removing the administrator leaves GuardDuty enabled in members |
| AWS Security Hub CSPM and AWS Security Hub | Central configuration of standards and controls, aggregated findings and exposure analysis | The management account can be the CSPM administrator but not the Security Hub administrator; a CSPM delegated administrator automatically becomes the Security Hub one; removing it from either removes it from both |
| Amazon Inspector, Amazon Macie, Amazon Detective | Activate scanning or investigation for all accounts, auto-enable new ones | Per Region; findings stay visible to the administrator |
| AWS Config | Organization rules, conformance packs and aggregators | Recording must still be on in each account and Region |
| AWS Firewall Manager | Applies WAF, Shield Advanced, security group, Network Firewall and DNS Firewall policies | A default administrator plus additional administrators with restricted scope (chapter 62) |
| IAM Access Analyzer, Amazon Security Lake, CloudTrail, IAM Identity Center, CloudFormation StackSets, AWS Backup, IAM (root access) | Organization-wide analyzers, data lake, organization trails, permission sets, stack sets, backup monitoring, root credential tasks | StackSets allows up to five delegated administrators |

```bash
aws guardduty enable-organization-admin-account --admin-account-id 222233334444 --region eu-west-1
aws guardduty update-organization-configuration --detector-id 6ac5b1f0e3d74a1f9d1c2b3a4e5f6071 --auto-enable-organization-members ALL --region eu-west-1
```

Two closures matter here: AWS Audit Manager accepts no new accounts since April 30, 2026 (use Config conformance packs and Security Hub CSPM for evidence), and CloudTrail Lake is closed to new customers since May 31, 2026 (use organization trails to the log archive account, queried with Athena or sent to CloudWatch).

> **Exam trap.** Designating the GuardDuty delegated administrator in the primary Region only leaves every other Region unmanaged. "All accounts in all Regions with the least effort" means the same administrator account designated in each Region, with auto-enable `ALL`.

<!-- section: root-user | objectives: 6.1.5 -->
## Managing root user credentials

**Centralized root access** removes long-term root credentials from member accounts. Enable trusted access for IAM in Organizations, then turn on two features: **root credentials management** (delete or audit member accounts' root password, access keys, signing certificates and MFA) and **privileged root actions in member accounts** (short root sessions for the few tasks that need root). Optionally register a delegated administrator for IAM, such as the security account. New accounts created in the organization then have no root credentials at all, and their root user can't sign in or recover its password.

```bash
aws iam enable-organizations-root-credentials-management
aws iam enable-organizations-root-sessions
aws sts assume-root --target-principal 444455556666 --task-policy-arn arn=arn:aws:iam::aws:policy/root-task/S3UnlockBucketPolicy --duration-seconds 900 --region eu-west-1
```

`sts:AssumeRoot` is called by an IAM principal (never with root credentials) in the management or delegated administrator account, on a Regional STS endpoint, for at most 900 seconds, and always scoped by one task policy; restrict which tasks a team may run with the `sts:TaskPolicyArn` condition key.

| Task policy | Use |
| --- | --- |
| `IAMAuditRootUserCredentials` | Review whether a member account still has a root password, access keys, signing certificates or MFA |
| `IAMCreateRootUserPassword` | Allow password recovery, only when the account has no root credentials |
| `IAMDeleteRootUserCredentials` | Delete the root password, access keys and signing certificates, and deactivate MFA |
| `S3UnlockBucketPolicy` | Remove a bucket policy that denies all principals |
| `SQSUnlockQueuePolicy` | Remove a queue policy that denies all principals |

**MFA.** Every account type (management, member, standalone) must have MFA on its root user; console users must register it within 14 days of their first sign-in attempt. AWS recommends passkeys or FIDO security keys, which resist phishing; up to eight MFA devices can be registered per user, which helps custodians in different locations.

**Break-glass design** for the credentials that remain (the management account root, and emergency access when IAM Identity Center or the identity provider is down):

1. Use a monitored distribution list and a company phone number as root contact details, not a person's mailbox.
2. Register at least two hardware security keys held by different custodians; keep the password sealed under dual control.
3. Create emergency IAM principals only where Identity Center can't be used, with MFA and a narrow SCP exception.
4. Alert on every use with an EventBridge rule on root sign-in in each account.
5. Test the procedure regularly and rotate the password after each use.

```json
{
  "source": ["aws.signin"],
  "detail-type": ["AWS Console Sign In via CloudTrail"],
  "detail": { "userIdentity": { "type": ["Root"] } }
}
```

> **Exam trap.** A misconfigured bucket policy that denies everyone, including administrators, used to require signing in as the member account's root user. With centralized root access, the least-privilege answer is an `sts:AssumeRoot` session with the `S3UnlockBucketPolicy` task policy, not recovering the root password.

<!-- section: key-points -->
## Key points

- All features are required for SCPs, RCPs, declarative policies and delegated administrators; SCPs and RCPs never apply to the management account.
- OUs reflect controls: Security, Infrastructure, Workloads, Sandbox, Suspended, plus a staging OU for testing policies.
- Control Tower landing zone 4.0: optional integrations, no mandatory Security OU, controls-only experience; register OUs and enroll accounts (`AWSControlTowerExecution`) in existing environments; don't edit managed SCPs.
- Controls: preventive (SCP, RCP, declarative), detective (Config), proactive (CloudFormation hooks), browsed in the Control Catalog.
- SCPs limit your principals; RCPs limit access to your resources by anyone; neither grants; EC2 declarative policies enforce configuration, including for service-linked roles.
- AI services opt-out policies lock the choice with `@@operators_allowed_for_child_policies`.
- One security tooling account as delegated administrator; GuardDuty is per Region with the same account everywhere.
- Centralized root access: delete member root credentials, `sts:AssumeRoot` for 900 seconds with one of five task policies; root MFA required for every account type.
