Security questions for operators rarely ask you to design a policy model; they describe a symptom (an access denied error, a public snapshot, a red Trusted Advisor check, a noncompliant resource) or a control to put in place (MFA, Region restrictions, central sign-in), and ask for the fix with the least effort. This chapter covers IAM credentials and MFA, roles, federation and policy conditions, access troubleshooting tools, multi-account controls, Trusted Advisor security checks, and continuous compliance with AWS Config.

<!-- section: iam-credentials | objectives: 4.1.1 -->
## Root user, password policy and MFA

The **root user** has unrestricted access to its account. AWS enforces MFA for the root user of every account type; also delete any root access keys (Trusted Advisor flags them) and keep the root user for the few tasks that require it.

The **account password policy** applies to IAM users' console passwords only, never to the root user or to access keys:

| Setting | Range |
| --- | --- |
| Minimum length | 6 to 128 characters |
| Character types | Uppercase, lowercase, number, nonalphanumeric, each optional |
| Expiration | 1 to 1,095 days |
| Prevent reuse | 1 to 24 previous passwords |
| Hard expiry | After expiry, only an administrator can reset the password |
| Allow users to change their password | On or off |

Without a custom policy, the default requires 8 to 128 characters with three of the four character types, and passwords never expire. A user whose password expired can't sign in to the console but can still use access keys.

**MFA options**: passkeys and FIDO security keys (phishing-resistant, recommended), virtual authenticator apps (TOTP) and hardware TOTP tokens. A user or root user can register up to eight MFA devices. Security keys and passkeys are enabled in the console only; for CLI sessions, a TOTP device works with `aws sts get-session-token --serial-number ... --token-code ...`, and passkeys with `aws login`.

Require MFA for sensitive actions with a condition:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyStopTerminateWithoutMFA",
      "Effect": "Deny",
      "Action": ["ec2:StopInstances", "ec2:TerminateInstances"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
      }
    }
  ]
}
```

> **Exam trap.** Requests signed with long-term access keys don't carry `aws:MultiFactorAuthPresent` at all. With `Bool` the deny doesn't match them; `BoolIfExists` denies when the key is missing or false.

<!-- section: roles-policies | objectives: 4.1.1 -->
## Roles, federation, resource policies and conditions

Roles deliver temporary credentials and replace stored access keys:

| Need | Mechanism |
| --- | --- |
| Application on EC2 calls AWS APIs | Role in an instance profile; credentials come from the instance metadata |
| Operators of account A work in account B | Role in B whose trust policy names account A; users in A need `sts:AssumeRole` on the role ARN |
| A third-party vendor accesses your account | Cross-account role with an `sts:ExternalId` condition in the trust policy |
| An AWS service acts on your behalf | Service role, or a service-linked role created and managed by the service |
| Workforce sign-in with corporate identities | IAM Identity Center (recommended), or an IAM SAML 2.0 or OIDC identity provider for direct federation |
| Let a team create roles without granting more than its own rights | Permissions boundary required by `iam:PermissionsBoundary` in the team's policy |

**Resource-based policies** attach to the resource (S3 bucket policy, KMS key policy, SQS, SNS, Lambda, Secrets Manager) and name a `Principal`. Within one account, an allow in either the identity policy or the resource policy is enough; across accounts, both the caller's identity policy and the resource policy must allow the action. A KMS key always needs its key policy to allow access.

Global condition keys that appear in operations questions:

| Requirement | Condition key |
| --- | --- |
| Only from the corporate public IP range | `aws:SourceIp` |
| Only through one VPC endpoint or VPC | `aws:SourceVpce`, `aws:SourceVpc` |
| Only principals of our organization | `aws:PrincipalOrgID` |
| Only in approved Regions | `aws:RequestedRegion` |
| Only over TLS | `aws:SecureTransport` |
| Only after MFA | `aws:MultiFactorAuthPresent` |
| Access when the project tag of the principal equals the resource's (ABAC) | `aws:PrincipalTag/project` with `aws:ResourceTag/project` |

> **Exam trap.** A request that reaches S3 through a VPC endpoint carries a private source address, so a bucket policy based on `aws:SourceIp` with public ranges denies it. Use `aws:SourceVpce` or `aws:SourceVpc` for traffic from the VPC.

<!-- section: access-troubleshooting | objectives: 4.1.2 -->
## Troubleshooting and auditing access

A request is allowed only if nothing denies it explicitly and every applicable layer allows it: SCPs and RCPs of the organization, the resource policy, the permissions boundary, the session policy and the identity policy. Many access denied messages now name the policy type responsible ("with an explicit deny in a service control policy", "because no identity-based policy allows"), which points to the layer to fix.

| Question | Tool |
| --- | --- |
| Who changed or deleted a resource in the last 90 days | CloudTrail Event history (management events, per Region) |
| Keep and query API activity for months, across accounts | Organization trail to S3, queried with Athena, or sent to CloudWatch Logs with metric filters on `errorCode` |
| Object reads and writes in S3, Lambda invocations | CloudTrail data events, which trails don't record by default |
| Decode an EC2 "encoded authorization failure message" | `aws sts decode-authorization-message`, with `sts:DecodeAuthorizationMessage` |
| Would this policy allow `s3:PutObject` before we attach it | IAM policy simulator |
| Which buckets, keys or roles are shared outside the organization | IAM Access Analyzer external access analyzer with the organization as zone of trust |
| Which roles, keys and permissions are unused | IAM Access Analyzer unused access analyzer, last accessed information |
| Least-privilege policy from real activity | IAM Access Analyzer policy generation from CloudTrail |
| Block a deployment if a policy grants new access | IAM Access Analyzer policy validation and custom policy checks |

```bash
aws sts decode-authorization-message \
  --encoded-message "$ENCODED_MESSAGE" \
  --query DecodedMessage --output text
```

The **policy simulator** evaluates identity policies, one permissions boundary at a time, SCPs and resource policies that you supply; it doesn't evaluate RCPs, sends no real request and needs values for the condition keys your policies test. **External access analyzers** are Regional (create one per Region); unused access findings don't depend on the Region.

> **Exam trap.** CloudTrail Lake closed to new customers on May 31, 2026; AWS recommends CloudWatch for its capabilities. Trails, CloudTrail Insights and event history are not affected.

<!-- section: multi-account | objectives: 4.1.3 -->
## Securing multiple accounts

**AWS Organizations** groups accounts under a management account, in organizational units (OUs). With all features enabled, two authorization policy types set guardrails:

| | Service control policy (SCP) | Resource control policy (RCP) |
| --- | --- | --- |
| Limits | What principals of member accounts can do | What can be done on resources of member accounts, including by principals outside the organization |
| Grants permissions | Never | Never |
| Management account | Not affected | Not affected |
| Service-linked roles | Not affected | Not affected |
| Member account root user | Affected | Affected |

SCPs are inherited down the hierarchy: an account has only what every parent allows. The default `FullAWSAccess` SCP must stay attached unless replaced by an allow list, otherwise every action fails. Test SCPs on a test OU before attaching them to the root.

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
        "config:StopConfigurationRecorder",
        "organizations:LeaveOrganization"
      ],
      "Resource": "*",
      "Condition": {
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityBreakGlass" }
      }
    }
  ]
}
```

**IAM Identity Center** is the workforce entry point: users and groups come from its own directory, Active Directory, or an external identity provider (SAML 2.0, with SCIM provisioning). A **permission set** assigned to a group in an account becomes an IAM role named `AWSReservedSSO_...` in that account; users get temporary credentials in the access portal or with `aws sso login`.

Other multi-account controls: **AWS Control Tower** sets up a landing zone (Log Archive and Audit accounts) and applies preventive (SCP and RCP), detective (AWS Config rules) and proactive (CloudFormation hooks) controls; **delegated administrator** accounts run GuardDuty, Security Hub, Config or Access Analyzer for the organization; **centralized root access** lets the management account remove root credentials of member accounts and run privileged root tasks centrally.

> **Exam trap.** An SCP attached to the root doesn't stop users of the management account, and an SCP that allows an action doesn't let a user without an IAM policy perform it. Run workloads in member accounts and grant permissions with IAM.

<!-- section: trusted-advisor | objectives: 4.1.4 -->
## Remediating Trusted Advisor security checks

With **Basic Support** (and Developer Support, which AWS discontinues on January 1, 2027), Trusted Advisor shows all Service limits checks and six others, five of them security checks: Amazon EBS Public Snapshots, Amazon RDS Public Snapshots, Amazon S3 Bucket Permissions, MFA on root account, Security Groups – Specific Ports Unrestricted. Security checks must be refreshed manually on that plan. **Business Support+, Enterprise Support and Unified Operations** unlock all checks, the API, the CLI and EventBridge events. Statuses: ERROR (action recommended), WARN (investigate), OK, INFO (status not determined). Security Hub CSPM control findings also appear in the Trusted Advisor console.

| Check | Remediation |
| --- | --- |
| Amazon S3 Bucket Permissions | Turn on S3 Block Public Access at account level; remove public ACLs and policy statements |
| Security Groups – Specific Ports Unrestricted, Unrestricted Access | Replace `0.0.0.0/0` with known CIDRs or security group references; use Session Manager instead of SSH or RDP; runbook `AWS-DisablePublicAccessForSecurityGroup` |
| MFA on root account, Root User Access Key | Register MFA, delete root access keys; for member accounts, centralized root access |
| Amazon EBS Public Snapshots, Amazon RDS Public Snapshots | Remove the public permission, share with named accounts only |
| Exposed Access Keys | Deactivate and delete the key, review CloudTrail for its use, move the workload to a role |
| IAM Access Key Rotation | Create a second key, update the application, deactivate then delete the old key |
| IAM Password Policy | Set a policy that meets the standard |
| AWS CloudTrail Management Event Logging | Create a multi-Region or organization trail |
| ELB Listener Security | HTTPS or TLS listener with a current security policy |
| Amazon RDS storage encryption is turned off | Copy a snapshot with encryption and restore from it |

```bash
aws ec2 modify-snapshot-attribute \
  --snapshot-id snap-0abcd1234example \
  --attribute createVolumePermission \
  --operation-type remove \
  --group-names all
```

To automate, create an EventBridge rule in **US East (N. Virginia)**, where all Trusted Advisor events are emitted, filter on the status you care about, and target Lambda or an Automation runbook:

```json
{
  "source": ["aws.trustedadvisor"],
  "detail-type": ["Trusted Advisor Check Item Refresh Notification"]
}
```

> **Exam trap.** On Basic Support there are no Trusted Advisor EventBridge rules or API calls. For automated alerts without a higher support plan, use AWS Config rules or Security Hub CSPM controls instead.

<!-- section: config-compliance | objectives: 4.1.5 -->
## Continuous compliance with AWS Config

AWS Config records resource configurations (configuration recorder, delivery channel to S3 and SNS) and evaluates them with **rules**: AWS managed rules (`encrypted-volumes`, `restricted-ssh`, `s3-bucket-public-read-prohibited`, `required-tags`, `cloudtrail-enabled`, `root-account-mfa-enabled`, `access-keys-rotated`) or custom rules in Lambda or AWS CloudFormation Guard. Rules are triggered by configuration changes or periodically, in detective mode (deployed resources) or proactive mode (before provisioning).

**Remediation** runs a Systems Manager Automation runbook on noncompliant resources, manually or automatically, with retries in a time window (for example, 5 attempts in 300 seconds); the **resource ID parameter** passes the noncompliant resource's ID to the runbook. **Conformance packs** deploy rules and remediation as one unit from a YAML template, to one account and Region or across the organization; AWS provides sample packs (operational best practices for CIS, PCI DSS, NIST). An **aggregator** gives a read-only, multi-account and multi-Region compliance view.

```yaml
Resources:
  SshRestricted:
    Type: AWS::Config::ConfigRule
    Properties:
      ConfigRuleName: restricted-ssh
      Source:
        Owner: AWS
        SourceIdentifier: INCOMING_SSH_DISABLED
  SshRestrictedRemediation:
    Type: AWS::Config::RemediationConfiguration
    DependsOn: SshRestricted
    Properties:
      ConfigRuleName: restricted-ssh
      TargetType: SSM_DOCUMENT
      TargetId: AWS-DisablePublicAccessForSecurityGroup
      Automatic: true
      MaximumAutomaticAttempts: 5
      RetryAttemptSeconds: 60
      Parameters:
        GroupId:
          ResourceValue:
            Value: RESOURCE_ID
        AutomationAssumeRole:
          StaticValue:
            Values:
              - arn:aws:iam::111122223333:role/ConfigRemediationRole
```

**Region and service selection** is enforced by prevention, not detection: an SCP that denies requests outside approved Regions (global services excluded with `NotAction`), a Control Tower Region deny control, or an SCP allow list of approved services.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyOutsideApprovedRegions",
      "Effect": "Deny",
      "NotAction": [
        "iam:*",
        "organizations:*",
        "sts:*",
        "support:*",
        "cloudfront:*",
        "route53:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        }
      }
    }
  ]
}
```

| Requirement | Answer |
| --- | --- |
| Detect unencrypted EBS volumes and keep a compliance history | AWS Config rule `encrypted-volumes` |
| Fix open SSH rules automatically | Config rule with automatic remediation by an Automation runbook |
| Same PCI DSS rule set in every account | Organization conformance pack |
| Nobody may create resources outside two Regions | SCP on `aws:RequestedRegion` |
| Score accounts continuously against AWS Foundational Security Best Practices | Security Hub CSPM standard (it relies on AWS Config recording) |

> **Exam tip.** Detective controls (Config rules, conformance packs) report and remediate after the fact; preventive controls (SCPs, RCPs) stop the call. "Ensure no one can" calls for prevention; "detect and correct" calls for Config.

<!-- section: key-points -->
## Key points

- Password policy: IAM users' console passwords only; root MFA is enforced; up to eight MFA devices; `BoolIfExists` for MFA conditions.
- Roles over access keys; `sts:ExternalId` for third parties; cross-account access needs both identity and resource policies.
- `aws:SourceVpce` for VPC endpoint traffic, `aws:PrincipalOrgID` for the organization, `aws:RequestedRegion` for Regions.
- CloudTrail for who did what (data events off by default); Access Analyzer for external and unused access; simulator to test policies; CloudTrail Lake closed to new customers.
- SCPs and RCPs grant nothing and skip the management account and service-linked roles; Identity Center permission sets become roles.
- Trusted Advisor: Basic has six non-limit checks; EventBridge rules for it live in us-east-1 and need Business Support+ or higher.
- Config rules detect, Automation runbooks remediate, conformance packs package both; SCPs prevent Region and service use.
