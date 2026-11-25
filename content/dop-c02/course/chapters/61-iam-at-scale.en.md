Identity questions at the DevOps professional level involve many accounts, many teams and many pipelines. The expected answers share three principles: every human and every workload uses **temporary credentials** from a role, permissions are delegated with **guardrails** that cannot be bypassed (permissions boundaries, SCPs), and least privilege is reached with data (Access Analyzer, last accessed information) rather than guesswork.

<!-- section: iam-entities | objectives: 6.1.1 -->
## IAM entities for human and machine access

| Entity | Credentials | Use it for |
| --- | --- | --- |
| Root user | Password, MFA | Only the few tasks that require it; no access keys |
| IAM user | Long-term password and access keys | Exceptions only (break-glass, a third-party tool that cannot assume roles) |
| IAM group | None (collection of users) | Attaching policies to users; a group is not a principal and cannot be named in a policy |
| IAM role | Temporary credentials from AWS STS | Everything else: federated humans, EC2, Lambda, ECS tasks, pipelines, cross-account access |
| Identity provider (SAML 2.0 or OIDC) | Tokens exchanged for role credentials | Federated workforce or workloads with an external identity |
| Service-linked role | Managed by the service | Permissions a service needs to act for you; not affected by SCPs |

Machine identities: an **instance profile** delivers a role to EC2 through the instance metadata service; Lambda uses its **execution role**; ECS separates the **task execution role** (agent: pull image, read secrets, write logs) from the **task role** (application code); EKS pods use **EKS Pod Identity** or IAM roles for service accounts; workloads outside AWS use **IAM Roles Anywhere** (X.509 certificates from a trusted CA exchanged for role credentials) instead of access keys.

| Policy type | Attached to | Effect |
| --- | --- | --- |
| Identity-based (AWS managed, customer managed, inline) | User, group, role | Grants permissions |
| Resource-based | Resource (S3 bucket, KMS key, SQS queue, Lambda function, role trust policy) | Grants access, can name other accounts |
| Permissions boundary | User or role | Maximum for identity-based permissions |
| SCP / RCP | Organization root, OU, account | Maximum for principals / resources of member accounts |
| Session policy | One role session (`AssumeRole`, federation) | Maximum for that session |

Within one account, an explicit deny anywhere wins; otherwise an allow is needed from an identity-based or resource-based policy, and every applicable guardrail (SCP, RCP, boundary, session policy) must also allow the action. Cross-account, both sides must allow: the caller's identity policy and the resource policy (or role trust policy).

<!-- section: federation | objectives: 6.1.2 -->
## Identity federation

**AWS IAM Identity Center** is the recommended way to give employees access to the accounts of an organization:

- Enabled in the management account (organization instance); administration can be delegated to a member account.
- **Identity source**: the Identity Center directory, Active Directory (AWS Managed Microsoft AD or AD Connector), or an external IdP using **SAML 2.0** for sign-in and **SCIM** for automatic provisioning of users and groups.
- **Permission sets** (AWS managed, customer managed and inline policies, optional permissions boundary, session duration up to 12 hours) are assigned to a group in one or more accounts; Identity Center creates the matching role in each account.
- **Attributes for access control** pass IdP attributes as session tags for ABAC.

**IAM identity providers** remain the tool for workloads and for per-account federation:

| Caller | Mechanism |
| --- | --- |
| CI/CD system issuing OIDC tokens (GitHub Actions, GitLab) | IAM OIDC provider, `AssumeRoleWithWebIdentity`, trust policy restricted on `aud` and `sub` |
| Corporate IdP federating into one account | IAM SAML provider, `AssumeRoleWithSAML` |
| Mobile or web app users needing AWS credentials | Amazon Cognito identity pool |
| Servers on premises | IAM Roles Anywhere |

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::111122223333:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"},
      "StringLike": {"token.actions.githubusercontent.com:sub": "repo:example-corp/payments:ref:refs/heads/main"}
    }
  }]
}
```

> **Exam trap.** A trust policy for an OIDC provider without a `sub` condition lets any repository of the provider assume the role. And storing IAM user access keys as pipeline secrets is never the best answer when the CI system supports OIDC federation.

<!-- section: permissions-boundaries | objectives: 6.1.3 -->
## Delegating permission management with permissions boundaries

Developers need to create roles for their Lambda functions without becoming administrators. The pattern:

1. An administrator creates a **boundary policy** with the maximum any delegated role may have.
2. The developers' policy allows `iam:CreateRole` and policy attachment **only if** the new role carries that boundary (`iam:PermissionsBoundary` condition), only on a path or name prefix.
3. The developers' policy denies changing or removing the boundary and editing the boundary policy itself.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CreateRolesWithBoundaryOnly",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy"],
      "Resource": "arn:aws:iam::111122223333:role/app/*",
      "Condition": {"StringEquals": {"iam:PermissionsBoundary": "arn:aws:iam::111122223333:policy/AppBoundary"}}
    },
    {
      "Sid": "ProtectBoundary",
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary", "iam:CreatePolicyVersion", "iam:DeletePolicy", "iam:SetDefaultPolicyVersion"],
      "Resource": ["arn:aws:iam::111122223333:role/app/*", "arn:aws:iam::111122223333:policy/AppBoundary"]
    }
  ]
}
```

Effective permissions of the new role = its identity policies **intersected** with the boundary. A boundary never grants anything.

> **Exam trap.** A boundary limits one user or role; an SCP limits a whole account. "Developers may create roles but never exceed X" is a boundary; "no one in these accounts may ever do X" is an SCP.

<!-- section: scps | objectives: 6.1.4 -->
## Service control policies

SCPs set the maximum permissions of principals in member accounts. Facts the exam tests:

- They require an organization with **all features** enabled. The default `FullAWSAccess` policy is attached everywhere; removing it without a replacement allow blocks every action.
- They affect all IAM users and roles of member accounts, **including the member account's root user**.
- They do **not** affect the management account or **service-linked roles**, and they do not grant anything.
- An account has only the permissions allowed by **every** SCP from the root down to the account.
- Up to 10 SCPs per root, OU or account; maximum size 10,240 characters. `Principal` and `NotPrincipal` are not supported, and an `Allow` statement can only use `"Resource": "*"`.
- **Resource control policies** (RCPs) are the resource-side counterpart: maximum permissions on resources of member accounts, whoever calls (up to 5 per target, 5,120 characters).

Strategies: **deny list** (keep `FullAWSAccess`, add deny statements; the usual choice) or **allow list** (replace `FullAWSAccess` with explicit allows).

Deny everything outside approved Regions, except global services and a platform role:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOutsideApprovedRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "sts:*", "route53:*", "cloudfront:*", "support:*"],
    "Resource": "*",
    "Condition": {
      "StringNotEquals": {"aws:RequestedRegion": ["eu-west-1", "eu-central-1"]},
      "ArnNotLike": {"aws:PrincipalARN": "arn:aws:iam::*:role/PlatformAdmin"}
    }
  }]
}
```

Other classic SCP denies: leaving the organization, disabling CloudTrail, GuardDuty or AWS Config, deleting the Control Tower roles, launching instances without IMDSv2 (`ec2:MetadataHttpTokens`).

> **Exam trap.** An SCP that "doesn't work" for actions in the management account is behaving as designed. Keep workloads out of the management account.

<!-- section: least-privilege | objectives: 6.1.5 -->
## Designing least-privilege policies

Start broad enough to work, then tighten with evidence:

| Tool | What it gives |
| --- | --- |
| IAM Access Analyzer policy generation | A policy built from the actions a role actually used, from CloudTrail logs over a date range |
| Last accessed information | Services (and actions for some services) a principal or an OU used, and when |
| Unused access analyzer | Findings for unused roles, access keys, passwords, and unused permissions of active roles (charged per role or user analyzed) |
| External access analyzer | Resources shared outside the zone of trust (account or organization) |
| Policy validation | Grammar errors, security warnings and suggestions |
| Custom policy checks | `CheckNoNewAccess` (an update grants nothing new), `CheckAccessNotGranted` (critical actions not allowed), `CheckNoPublicAccess`: run in a pipeline to block a policy change before deployment |

Design rules: scope `Resource` to ARNs, add conditions (`aws:SourceVpce`, `aws:PrincipalOrgID`, `aws:ResourceTag`, `aws:CalledVia`), prefer customer managed policies over broad AWS managed policies for production, and give each workload its own role.

> **Exam tip.** "Reduce the permissions of an existing role to what it really uses, with the least effort" is Access Analyzer policy generation. "Prevent a pull request from adding new permissions" is a custom policy check in the pipeline.

<!-- section: rbac-abac | objectives: 6.1.6 -->
## Role-based and attribute-based access control

| | RBAC | ABAC |
| --- | --- | --- |
| Basis | One role or permission set per job function | Tags on principals compared with tags on resources |
| New project or team | New policies or roles | No policy change: tag the new resources and principals |
| Number of policies | Grows with projects | Stays small |
| Fits | Stable job functions | Fast-growing environments, many teams |

ABAC compares `aws:PrincipalTag` with `aws:ResourceTag`, controls tagging at creation with `aws:RequestTag` and `aws:TagKeys`, and must forbid principals from changing their own tags or the tags of resources they do not own.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"],
    "Resource": "arn:aws:ec2:*:*:instance/*",
    "Condition": {"StringEquals": {"aws:ResourceTag/team": "${aws:PrincipalTag/team}"}}
  }]
}
```

Principal tags come from IAM role tags, Identity Center attributes for access control, or session tags passed by a SAML or OIDC IdP.

<!-- section: credential-rotation | objectives: 6.1.7 -->
## Automating credential rotation for machine identities

The best rotation is no long-term credential at all: roles for AWS access, IAM Roles Anywhere for servers outside AWS. For database passwords, API keys and third-party tokens, use **AWS Secrets Manager**:

| Rotation type | How |
| --- | --- |
| Managed rotation | The service manages rotation without a Lambda function (for example the RDS or Aurora master user password managed in Secrets Manager) |
| Rotation by Lambda function | A function (AWS templates for supported databases, or custom) runs the steps `createSecret`, `setSecret`, `testSecret`, `finishSecret` |

- Staging labels: `AWSPENDING` during rotation, `AWSCURRENT` for the active version, `AWSPREVIOUS` for the prior one.
- Schedule: as often as every **four hours**, at most every 999 days, with `rate()` or `cron()` expressions in UTC and a rotation window of at least one hour.
- **Single user** strategy: changes one user's password; a short window may reject the old credentials, so clients retry with backoff. **Alternating users**: clones the user on first rotation and alternates, which keeps a valid credential during rotation; needs a superuser secret.
- A rotation function in a VPC needs a network path to the database **and** to the Secrets Manager endpoint (interface VPC endpoint or NAT gateway).
- Applications must read the secret at run time (or cache with refresh), never copy it into configuration.

```bash
aws secretsmanager rotate-secret --secret-id prod/orders/db \
  --rotation-lambda-arn arn:aws:lambda:eu-west-1:111122223333:function:orders-db-rotation \
  --rotation-rules '{"ScheduleExpression":"rate(30 days)"}'
```

> **Exam trap.** Parameter Store `SecureString` parameters have no built-in rotation. "Rotate the database password automatically every 30 days with the least operational overhead" is Secrets Manager. Remaining IAM user access keys are tracked with the AWS Config rule `access-keys-rotated` and replaced, ideally by roles.

<!-- section: mfa-sts-profiles | objectives: 6.1.8 -->
## MFA, AWS STS and instance profiles

**MFA**: require it for sensitive actions with `aws:MultiFactorAuthPresent` (use `BoolIfExists` in deny statements so that requests without the key are denied) and `aws:MultiFactorAuthAge`. With Identity Center, MFA is enforced at sign-in for every account. An IAM user calling the CLI with MFA calls `sts:GetSessionToken` with the MFA code (session 15 minutes to 36 hours, default 12 hours; one hour maximum for the root user).

**AWS STS** operations:

| Operation | Caller |
| --- | --- |
| `AssumeRole` | IAM principal, cross-account access, role chaining |
| `AssumeRoleWithSAML` | SAML-federated users |
| `AssumeRoleWithWebIdentity` | OIDC tokens (CI/CD, EKS IRSA, Cognito) |
| `GetSessionToken` | IAM user adding MFA to CLI calls |
| `GetFederationToken` | Custom broker issuing credentials for users |

Role sessions last one hour by default, up to the role's maximum session duration (at most 12 hours); **role chaining** caps the session at one hour. `sts:ExternalId` prevents the confused deputy problem for third parties; `sts:SourceIdentity` keeps the original user visible across chained roles in CloudTrail.

**Instance profiles and IMDS**: enforce **IMDSv2** (`HttpTokens` set to `required`) on launch templates, require it with the `ec2:MetadataHttpTokens` condition key in an SCP, or set account defaults with EC2 declarative policies. If a role's temporary credentials leak, the IAM console's **Revoke active sessions** adds an inline deny on sessions issued before the current time (`aws:TokenIssueTime`), without deleting the role.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyWithoutMFA",
    "Effect": "Deny",
    "Action": ["ec2:TerminateInstances", "rds:DeleteDBInstance"],
    "Resource": "*",
    "Condition": {"BoolIfExists": {"aws:MultiFactorAuthPresent": "false"}}
  }]
}
```

<!-- section: key-points -->
## Key points

- Roles and temporary credentials for everyone; IAM users only as exceptions. Identity Center for the workforce, OIDC federation for pipelines, Roles Anywhere for servers outside AWS.
- Permissions boundary = delegation limit for one identity; SCP = account-wide maximum that never applies to the management account or service-linked roles.
- SCP quotas: 10 per target, 10,240 characters; RCPs: 5 per target, 5,120 characters.
- Least privilege from evidence: Access Analyzer policy generation, last accessed data, unused access findings, custom policy checks in pipelines.
- ABAC with `aws:PrincipalTag` and `aws:ResourceTag` scales without new policies.
- Secrets Manager rotates (managed or Lambda, every four hours at most often); Parameter Store does not.
- Role sessions default to one hour, maximum 12; chaining caps at one hour; enforce IMDSv2 and MFA with condition keys.
