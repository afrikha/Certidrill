Identity questions at the professional level involve many accounts, several kinds of principals and at least one external party: employees signing in from a corporate identity provider, customers of a web application, pods, CI/CD pipelines, partners and servers outside AWS. The secure answer always gives each principal **temporary credentials** scoped to what it needs, keeps a single source of identities, and adds coarse guardrails (data perimeters) on top of fine-grained policies.

<!-- section: workforce-federation | objectives: 2.1.1 -->
## Workforce identity federation with standard protocols

**AWS IAM Identity Center** is the recommended entry point for employees across an organization:

- The **organization instance**, enabled from the AWS Organizations management account, is the only one that manages access to AWS accounts; an account instance only serves selected AWS managed applications in one account. Administration can be delegated to a member account (the management account's own assignments stay with the management account).
- **Identity source**: the Identity Center directory, Active Directory (AWS Managed Microsoft AD or a self-managed directory through AD Connector), or an external identity provider. With an external IdP, **SAML 2.0** handles sign-in and **SCIM 2.0** provisions users and groups automatically (bearer token valid one year, to rotate before expiry). The SAML `NameID` must match the SCIM user name.
- **Permission sets** define job-function permissions (AWS managed, customer managed, inline policies and a permissions boundary) and a session duration of up to 12 hours; assigning a permission set to a group in an account creates the corresponding IAM role in that account.
- **Attributes for access control** pass IdP attributes (department, cost center) as session tags for ABAC.
- **Trusted identity propagation** carries the user identity to services such as Redshift or S3 Access Grants, so audit logs show the person, not a shared role. Replicating the instance to additional Regions keeps the access portal available in each enabled Region.

Other federation patterns:

| Principal | Mechanism |
| --- | --- |
| Employees, existing per-account IAM SAML federation | IAM SAML identity provider and `AssumeRoleWithSAML` (still supported; harder to scale than Identity Center) |
| CI/CD system that issues OIDC tokens (for example GitHub Actions) | IAM OIDC identity provider and `AssumeRoleWithWebIdentity`, trust policy restricted on the token `sub` and `aud` claims |
| Third-party SaaS acting in your accounts | Cross-account role with an external ID |

> **Exam trap.** SCIM does not authenticate anyone: it only synchronizes users and groups. Sign-in still uses SAML 2.0. With SCIM on, users can't be edited in the Identity Center console; changes come from the IdP.

<!-- section: app-authn-authz | objectives: 2.1.2 -->
## Application authentication and authorization

| Component | Gives | Use |
| --- | --- | --- |
| Amazon Cognito user pool | A user directory and an OAuth 2.0 and OIDC authorization server issuing JWTs (ID, access, refresh tokens) | Sign-up, sign-in, MFA, social, SAML or OIDC federation for customer-facing apps |
| Amazon Cognito identity pool | Temporary AWS credentials in exchange for a token (user pool, social, SAML, OIDC) or for guests | Mobile or browser clients that call AWS services directly (S3 uploads, DynamoDB) |
| Amazon Verified Permissions | Fine-grained authorization decisions with Cedar policies, outside the application code | Per-resource permissions ("only the owner or the manager can approve") |
| API Gateway authorizers | Cognito user pool or JWT authorizer, Lambda authorizer, IAM (SigV4) | Validate callers before the backend runs |
| ALB authentication | `authenticate-cognito` or `authenticate-oidc` listener actions | Add sign-in in front of web apps without code |

OAuth 2.0 grants in Cognito: **authorization code with PKCE** for web and mobile apps (the default choice), **client credentials** for machine-to-machine calls with custom scopes defined on a resource server, implicit grant only for legacy cases. Feature plans: **Lite** (basic sign-in, classic hosted UI), **Essentials** (default: managed login, passwordless and passkeys, access token customization), **Plus** (threat protection against compromised credentials and malicious sign-ins, user activity logs).

Identity pools map users to IAM roles by rules on claims or by the role in the token, and can pass claims as principal tags for ABAC (for example each user writes only under an S3 prefix tagged with their ID).

**Kubernetes workloads on EKS**:

| | EKS Pod Identity | IAM roles for service accounts (IRSA) |
| --- | --- | --- |
| Setup | Pod Identity Agent add-on plus an association (cluster, namespace, service account, role) | One IAM OIDC provider per cluster, role trust per provider |
| Trust policy principal | `pods.eks.amazonaws.com` for every cluster | The cluster's OIDC provider |
| Reuse a role in many clusters | Same trust policy, new association | Trust policy edited for each cluster |
| Cross-account | Association with a target role: the agent chains from the Pod Identity role to the role in the other account | Trust the cluster OIDC provider in the other account |
| ABAC | Session tags such as `eks-cluster-arn`, `kubernetes-namespace`, `kubernetes-service-account` | Not automatic |
| Compute support | Not on Fargate pods or Windows EC2 nodes | Works on Fargate |

> **Exam trap.** User pools authenticate users and issue JWTs; they don't give AWS credentials. When the client must call S3 or DynamoDB directly, add an identity pool. When an API only needs to validate the user, a user pool authorizer is enough.

<!-- section: least-privilege | objectives: 2.1.3 -->
## Least-privilege access and temporary credentials

Policy evaluation for a request: an explicit deny anywhere wins; otherwise the request must be allowed by every applicable guardrail (SCPs on the principal's account, RCPs on the resource's account, permissions boundary, session policy) and by an identity-based or resource-based policy.

| Tool | Limits | Typical use |
| --- | --- | --- |
| Identity-based policy | Grants to a user, group or role | Normal permissions |
| Resource-based policy | Grants on the resource, can name other accounts | Cross-account access to S3, KMS, SQS, Lambda without switching roles |
| Permissions boundary | Maximum for one user or role's identity-based policies | Let developers create roles that can never exceed a boundary |
| Session policy | Maximum for one session, passed in `AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` (inline plus up to 10 managed policies) | A broker narrows a shared role per request or per tenant |
| SCP / RCP | Maximum for principals / resources of member accounts | Organization guardrails (not the management account) |

Cross-account access: with **role assumption**, the caller gives up its own permissions for those of the role (both the trust policy and the caller's `sts:AssumeRole` permission are needed). With a **resource-based policy**, the caller keeps its own permissions and needs an allow in its identity policy too. Role sessions last 1 hour by default and up to the role's maximum session duration (12 hours at most); **role chaining** limits a session to 1 hour.

**External ID** prevents the confused deputy problem when a third party assumes roles for many customers: the third party generates a unique value per customer, the customer requires it with `sts:ExternalId` in the trust policy. It is not a secret, only a disambiguator.

**ABAC** scales permissions with tags instead of policies per project: allow actions when `aws:ResourceTag/project` equals `aws:PrincipalTag/project`, control tagging with `aws:RequestTag` and `aws:TagKeys`, and receive principal tags from Identity Center attributes, SAML or OIDC session tags. `sts:SourceIdentity` keeps the original user visible across role chains.

Delegated role creation with a mandatory boundary:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CreateRolesOnlyWithBoundary",
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PutRolePolicy"],
      "Resource": "arn:aws:iam::111122223333:role/app/*",
      "Condition": {
        "StringEquals": {
          "iam:PermissionsBoundary": "arn:aws:iam::111122223333:policy/AppBoundary"
        }
      }
    },
    {
      "Sid": "ProtectBoundary",
      "Effect": "Deny",
      "Action": ["iam:DeleteRolePermissionsBoundary", "iam:CreatePolicyVersion", "iam:DeletePolicy"],
      "Resource": [
        "arn:aws:iam::111122223333:role/app/*",
        "arn:aws:iam::111122223333:policy/AppBoundary"
      ]
    }
  ]
}
```

> **Exam trap.** A permissions boundary never grants anything and does not limit a resource-based policy that names the user or role session. To cap what a whole account can do, use an SCP; to cap one delegated identity, use a boundary.

<!-- section: data-perimeter | objectives: 2.1.4 -->
## Data perimeters and external access validation

A data perimeter guarantees that **only trusted identities access trusted resources from expected networks**, as always-on coarse guardrails:

| Perimeter | Objective | Control and key |
| --- | --- | --- |
| Identity | Only my identities reach my resources | RCP or resource policy with `aws:PrincipalOrgID` (and `aws:PrincipalIsAWSService` with `aws:SourceOrgID` for service principals) |
| Identity | Only my identities use my network | VPC endpoint policy with `aws:PrincipalOrgID` |
| Resource | My identities reach only my resources | SCP with `aws:ResourceOrgID` |
| Resource | My network reaches only my resources | VPC endpoint policy with `aws:ResourceOrgID` |
| Network | My identities act only from my networks | SCP with `aws:SourceIp`, `aws:SourceVpc`, `aws:SourceVpce`, excluding `aws:ViaAWSService` calls |
| Network | My resources are reached only from my networks | RCP or resource policy with the same keys |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnforceOrgIdentities",
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:*", "sqs:*", "kms:*", "secretsmanager:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:PrincipalOrgID": "o-exampleorg" },
        "BoolIfExists": { "aws:PrincipalIsAWSService": "false" }
      }
    }
  ]
}
```

This RCP blocks every principal outside the organization from the listed services in member accounts, while letting AWS services act. Exceptions for trusted partners are added as extra conditions. RCPs do not apply to the management account, service-linked roles or AWS managed KMS keys, and cover only the services that support them; protect other resources with their own resource policies.

**IAM Access Analyzer** validates the perimeter:

- **External access analyzers** with a zone of trust (account or organization) report resources shared outside it (S3 buckets, IAM roles, KMS keys, Lambda, SQS, SNS, Secrets Manager, snapshots, ECR, EFS, DynamoDB).
- **Internal access analyzers** show which principals inside the organization can reach critical resources; **unused access analyzers** list unused roles, keys, passwords, services and actions (both billed).
- **Policy validation**, **custom policy checks** (no new access compared with a reference, specific actions not granted) in CI/CD pipelines, and **policy generation** from CloudTrail activity.

**AWS Verified Access** replaces VPN access to internal applications with per-request Zero Trust evaluation: one identity trust provider (IAM Identity Center organization instance or an OIDC provider) and device trust providers (for example CrowdStrike, Jamf, JumpCloud) feed Cedar policies on groups and endpoints (load balancer, network interface, network CIDR, RDS). Non-HTTP applications (SSH, RDP, databases over TCP) use the Connectivity Client. Every access attempt is logged; requests are denied until a policy allows them.

> **Exam tip.** "Prevent any principal outside the organization from accessing S3 buckets in all member accounts, including buckets with misconfigured policies" is an RCP, not an SCP: SCPs only restrict the organization's own principals.

<!-- section: workload-identity | objectives: 2.1.5 -->
## Workload identities for hybrid and multi-cloud environments

The goal is to remove long-term access keys from servers, containers and pipelines outside AWS:

| Workload | Identity mechanism |
| --- | --- |
| On-premises servers or VMs with X.509 certificates from an enterprise PKI | **IAM Roles Anywhere** |
| Workloads in another cloud with an OIDC identity token (managed identity, service account) | IAM OIDC identity provider and `AssumeRoleWithWebIdentity` |
| On-premises servers managed by Systems Manager | Hybrid activation: the SSM Agent receives rotating credentials for the instance role |
| On-premises Kubernetes nodes joined to EKS | EKS Hybrid Nodes with Systems Manager hybrid activations or IAM Roles Anywhere |
| ECS Anywhere external instances | SSM Agent credentials, task IAM roles |

IAM Roles Anywhere components:

- **Trust anchor**: AWS Private CA or an external CA certificate bundle that issues the workload certificates. Import CRLs to revoke certificates.
- **Profile**: the roles that can be assumed and an optional session policy.
- **Role trust policy**: trusts `rolesanywhere.amazonaws.com`, limited with `aws:SourceArn` to the trust anchor; certificate attributes become principal tags (for example `aws:PrincipalTag/x509Subject/CN`) to restrict which certificates map to which role.
- The **credential helper** signs with the private key and returns temporary credentials through the SDK `credential_process` setting, so applications need no code change.

```text
[profile onprem-batch]
credential_process = aws_signing_helper credential-process --certificate /etc/pki/batch.pem --private-key /etc/pki/batch.key --trust-anchor-arn arn:aws:rolesanywhere:eu-west-1:111122223333:trust-anchor/example --profile-arn arn:aws:rolesanywhere:eu-west-1:111122223333:profile/example --role-arn arn:aws:iam::111122223333:role/onprem-batch
```

Roles Anywhere resources are Regional and the trust boundary is the account: any trust anchor in the account can be used for any role that trusts the service, unless the trust policy adds conditions. Keep private keys in a TPM or HSM where possible.

> **Exam trap.** Storing an IAM user's access keys in Secrets Manager for on-premises servers still means long-term credentials. When the servers already have certificates from an enterprise CA, the answer with temporary credentials and no key rotation is IAM Roles Anywhere.

<!-- section: key-points -->
## Key points

- Workforce: Identity Center organization instance, SAML 2.0 for sign-in, SCIM for provisioning, permission sets per account, attributes for ABAC; OIDC federation for CI/CD.
- Apps: user pools issue JWTs, identity pools issue AWS credentials, Verified Permissions decides with Cedar; authorization code with PKCE for users, client credentials for machines.
- EKS Pod Identity: no OIDC provider, one service principal, target roles for cross-account, session tags for ABAC; not on Fargate.
- Least privilege: boundaries cap delegated identities, session policies cap sessions, SCPs and RCPs cap accounts; external ID against the confused deputy; role chaining limits sessions to 1 hour.
- Data perimeter: identity, resource and network perimeters with `aws:PrincipalOrgID`, `aws:ResourceOrgID` and network keys; RCPs restrict external principals; Access Analyzer validates; Verified Access replaces VPNs.
- Outside AWS: IAM Roles Anywhere with X.509 certificates, OIDC federation for other clouds, SSM hybrid activations; never long-term access keys.
