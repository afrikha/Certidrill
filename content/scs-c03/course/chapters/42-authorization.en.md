Once a principal is authenticated, every request is decided by policies, and the identity domain is the heaviest of the exam (20 %). Questions give you a policy or a set of policies and ask whether a request succeeds, why it fails, or which change grants exactly what is needed. You need the evaluation logic by heart, the guardrails that cap permissions without granting any, the tag-based patterns that scale, and the tools that find and remove access nobody intended.

<!-- section: authorization-design | objectives: 4.2.1 -->
## Authorization controls for humans, applications and systems

| Requirement | Control |
| --- | --- |
| Fine-grained permissions inside a custom application ("only the owner or an approver of this claim") | Amazon Verified Permissions with Cedar policies |
| Another account reads one bucket, queue, key or secret | Resource-based policy naming the account or role, plus an allow in the caller's identity policy |
| Another account operates many resources | IAM role in the resource account; its trust policy names the caller, the caller needs `sts:AssumeRole` |
| A third party assumes roles for many customers | Trust policy condition on `sts:ExternalId` (confused deputy protection) |
| An AWS service writes to your resource | Service principal in the resource policy limited with `aws:SourceArn` or `aws:SourceAccount` |
| Servers outside AWS need credentials | IAM Roles Anywhere |
| Group roles and users by team for policies | IAM paths, for example `role/payments/` |

**Amazon Verified Permissions** externalizes application authorization. A **policy store** holds Cedar policies, an optional **schema** (entity types, actions, attributes, used to validate policies) and **policy templates** (a policy with placeholders, instantiated per principal or resource, for example "share this document with this user"). An **identity source** (Cognito user pool or OIDC provider) lets the application pass a token: `IsAuthorizedWithToken` maps its claims to the principal; `IsAuthorized` takes an explicit principal, action, resource and context; `BatchIsAuthorized` evaluates several requests at once. Decisions are deny by default, and any matching `forbid` overrides every `permit`. Policy stores can be built from a Cognito user pool and an API Gateway API, with a Lambda authorizer calling Verified Permissions.

**IAM paths** appear in ARNs (`arn:aws:iam::111122223333:role/payments/batch-runner`). Policies can grant `iam:PassRole` or `sts:AssumeRole` on `role/payments/*`, and SCPs or resource policies can exempt administration roles with `aws:PrincipalArn` patterns. A role's path is set when it is created. Roles created by IAM Identity Center live under `/aws-reserved/sso.amazonaws.com/`.

**Trust policies** are the resource-based policies of roles: they decide who can assume the role, and the permissions policies decide what the session can do. Roles Anywhere example, restricted to one trust anchor and one certificate subject:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "rolesanywhere.amazonaws.com" },
      "Action": ["sts:AssumeRole", "sts:TagSession", "sts:SetSourceIdentity"],
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "arn:aws:rolesanywhere:eu-west-3:111122223333:trust-anchor/2f6a1c3e-0b4d-4e8f-9a1b-3c5d7e9f1a2b"
        },
        "StringEquals": {
          "aws:PrincipalTag/x509Subject/CN": "billing-batch-01.corp.example.com"
        }
      }
    }
  ]
}
```

> **Exam trap.** A trust policy whose principal is `arn:aws:iam::444455556666:root` does not let everyone in that account assume the role: it delegates the decision to that account, whose principals still need `sts:AssumeRole` in their own policies. To restrict it to specific roles, name their ARNs or add `aws:PrincipalArn`.

<!-- section: abac-rbac | objectives: 4.2.2 -->
## ABAC and RBAC strategies

| | RBAC | ABAC |
| --- | --- | --- |
| Unit | One role or permission set per job function | Tags on principals and resources |
| New project or team | New policies or roles | Tag the new resources and principals, no policy change |
| Granularity | Coarse unless many roles | Per project, cost center, environment, data classification |
| Main risk | Role explosion, over-broad roles | Users changing tags to grant themselves access |
| Typical source | Identity Center groups assigned to permission sets | Identity Center attributes for access control, SAML or OIDC session tags, IAM user or role tags |

Condition keys:

- `aws:PrincipalTag/key`: tag on the calling user, role or session.
- `aws:ResourceTag/key`: tag on the target resource (supported by many, not all, actions).
- `aws:RequestTag/key` and `aws:TagKeys`: tags sent in a create or tag request; use them to require tags at creation and limit which keys can be set.

**Session tags** come from the IdP (SAML attribute `https://aws.amazon.com/SAML/Attributes/PrincipalTag:CostCenter`, OIDC claims) or are passed in `AssumeRole` (`sts:TagSession` must be allowed in the trust policy). **Transitive** session tags persist through role chaining. In Identity Center, **attributes for access control** map IdP or directory attributes to session tags for every permission set.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OperateOwnProject",
      "Effect": "Allow",
      "Action": ["ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": { "aws:ResourceTag/project": "${aws:PrincipalTag/project}" }
      }
    },
    {
      "Sid": "ProtectProjectTag",
      "Effect": "Deny",
      "Action": ["ec2:CreateTags", "ec2:DeleteTags"],
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["project"] }
      }
    }
  ]
}
```

> **Exam trap.** ABAC without a deny on tagging the authorization keys lets any user who can tag a resource move it into their project. Protect the keys with a deny (or an SCP) and standardize values with tag policies.

<!-- section: least-privilege-policies | objectives: 4.2.3 -->
## Least-privilege IAM policies

Evaluation for a request:

1. An explicit `Deny` in any applicable policy ends the evaluation: denied.
2. SCPs (on the principal's account) and RCPs (on the resource's account) must allow it; they never grant.
3. A resource-based policy or an identity-based policy must allow it. Within one account either is enough; across accounts both sides are needed (the resource policy and the caller's identity policy, or the trust policy and `sts:AssumeRole`).
4. A permissions boundary and a session policy, when present, must also allow the identity-based permissions: the result is the intersection.

Same-account details tested at the specialty level: a resource-based policy that names an **IAM user ARN** or a **role session ARN** grants directly and is not limited by an implicit deny in the boundary or session policy; one that names the **role ARN** is limited by them. KMS keys and role trust are exceptions to "either policy is enough": the key policy (or the trust policy) must allow, directly or by delegating to the account.

| Guardrail | Applies to | Use |
| --- | --- | --- |
| Permissions boundary | One IAM user or role | Developers create roles that can never exceed the boundary (`iam:PermissionsBoundary` condition on `iam:CreateRole`) |
| Session policy | One session from `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` or `GetFederationToken` | A broker narrows a shared role to one tenant's prefix per request |
| SCP | Principals of member accounts (not the management account, not service-linked roles) | Deny Regions, protect security services, require encryption |
| RCP | Resources of member accounts, for supported services | Deny access by principals outside the organization |

Writing least-privilege statements: name actions instead of `*`, scope `Resource` to ARNs, add conditions (`aws:ResourceAccount`, `aws:SourceVpce`, `aws:CalledVia`, `aws:RequestedRegion`, `kms:ViaService`), and be careful with `NotAction` and `NotResource` in `Allow` statements, which grant everything not listed. Start from CloudTrail activity with IAM Access Analyzer **policy generation**, then remove services shown as unused in last accessed information.

A session policy passed by a broker, limited to one customer's prefix:

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::111122223333:role/tenant-broker/TenantData \
  --role-session-name tenant-4711 \
  --policy '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":"arn:aws:s3:::example-tenant-data/tenant-4711/*"}]}'
```

> **Exam trap.** A permissions boundary that allows `s3:*` does not give any S3 access: the identity-based policy must grant it too. Conversely, attaching `AdministratorAccess` to a role whose boundary allows only DynamoDB gives DynamoDB access only.

<!-- section: authorization-failures | objectives: 4.2.4 -->
## Analyzing authorization failures

Access denied messages name the policy type responsible:

| Message ends with | Meaning |
| --- | --- |
| "with an explicit deny in a service control policy" | An SCP `Deny` matched; fix the SCP or the request, not the IAM policy |
| "with an explicit deny in a resource control policy" | An RCP on the resource's account denied it |
| "because no identity-based policy allows the ... action" | Implicit deny: add an allow to the caller's policy |
| "because no permissions boundary allows the ... action" | The boundary lacks the action |
| "because no session policy allows the ... action" | The session was narrowed when it was created |
| "with an explicit deny in a VPC endpoint policy" | The request went through an endpoint whose policy denies it |
| "because no resource-based policy allows the ... action" | Cross-account call without a matching resource policy |

When several policy types deny, the message names only one. Some services (for example EC2) return an **encoded authorization message**: decode it with `aws sts decode-authorization-message` (needs `sts:DecodeAuthorizationMessage`) to see the matched statements and context.

**IAM policy simulator** evaluates identity-based policies, a permissions boundary, SCPs (when the account is in an organization, decision only) and resource-based policies you supply, without calling the service. It does **not** evaluate RCPs, and its results may differ for VPC endpoint policies, role chaining and several resource-based policies; context keys other than principal and organization keys must be entered by hand.

**IAM Access Analyzer policy validation** reports errors, security warnings (for example `iam:PassRole` with `*`), general warnings and suggestions while you edit, and **custom policy checks** (`check-no-new-access`, `check-access-not-granted`, `check-no-public-access`) block risky changes in CI/CD pipelines.

Common causes to check in order: explicit denies (SCP, RCP, boundary, endpoint policy), missing allow on one side of a cross-account call, KMS key policy for encrypted objects, S3 Block Public Access or bucket owner enforced settings, conditions that fail (wrong `aws:SourceVpce`, missing tag, MFA absent), wrong Region or resource ARN.

> **Exam trap.** A role in account A can read a bucket in account B (bucket policy allows it) but gets `AccessDenied` on objects encrypted with a customer managed KMS key in account B. The key policy in B must allow the role, and the role needs `kms:Decrypt` in its own policy.

<!-- section: unintended-access | objectives: 4.2.5 -->
## Investigating and correcting unintended access

**IAM Access Analyzer** analyzers are Regional, with a zone of trust that is an account or the organization (from the management account or a delegated administrator):

| Analyzer | Finds | Resources | Billing |
| --- | --- | --- | --- |
| External access | Resources shared with principals outside the zone of trust (public or cross-account), proven with automated reasoning | S3 and directory buckets, IAM roles, KMS keys, Lambda, SQS, SNS, Secrets Manager, EBS, RDS and cluster snapshots, ECR, EFS, DynamoDB tables and streams | No charge |
| Internal access | Which principals inside the organization or account can reach selected critical resources | S3 and directory buckets, RDS snapshots, DynamoDB tables and streams | Per resource monitored |
| Unused access | Unused roles, access keys, passwords, and unused services and actions of active roles and users, over a tracking period | IAM users and roles | Per role or user analyzed |

Analysis runs within about 30 minutes of a policy change; a **Rescan** (`StartResourceScan`) confirms a fix. Findings are **Active**, **Archived** (intended access, often through **archive rules** such as "trusted partner account 777788889999") or **Resolved** (access removed).

Workflow for an unintended permission:

1. Detect: Access Analyzer findings, sent to EventBridge and to Security Hub CSPM or the new Security Hub; IAM last accessed information; CloudTrail.
2. Decide: intended (archive rule with a documented reason) or not.
3. Contain and fix: remove the statement or principal, enable S3 Block Public Access, delete unused roles and access keys, replace inline wildcards with generated policies; for an active compromise, revoke role sessions first.
4. Verify: rescan, re-run the simulator or custom policy checks.
5. Prevent: SCPs and RCPs for the data perimeter, permissions boundaries for delegated administration, custom policy checks in pipelines.

```bash
aws accessanalyzer check-no-public-access \
  --policy-document file://bucket-policy.json \
  --resource-type AWS::S3::Bucket
```

> **Exam tip.** "Find which S3 buckets are shared with accounts outside the organization" is an external access analyzer with the organization as zone of trust. "Find which roles in the organization can read this sensitive bucket" is an internal access analyzer. "Find permissions granted but not used for 90 days" is an unused access analyzer.

<!-- section: key-points -->
## Key points

- Verified Permissions: Cedar, policy stores, schemas, templates, Cognito or OIDC identity sources, deny by default, `forbid` wins.
- Cross-account: resource policy plus caller allow, or role trust plus `sts:AssumeRole`; external ID for third parties; `aws:SourceArn` for service principals.
- ABAC: `aws:PrincipalTag` matched to `aws:ResourceTag`, `aws:RequestTag` and `aws:TagKeys` on creation, deny changes to authorization tags.
- Evaluation: explicit deny, SCP and RCP caps, an allow on the right side, intersection with boundaries and session policies; KMS key policies must allow.
- Error messages name the policy type; decode encoded messages with STS; the simulator ignores RCPs.
- Access Analyzer: external (free), internal and unused access analyzers, policy validation, custom policy checks, policy generation; archive intended findings, rescan after fixes.
