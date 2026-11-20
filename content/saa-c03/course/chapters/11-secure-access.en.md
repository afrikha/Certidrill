Secure access questions describe who needs to reach which resources, in how many accounts, and with which identities: employees in a corporate directory, an application on EC2, a partner's AWS account. The answer combines IAM roles, policies, AWS IAM Identity Center and AWS Organizations guardrails. This chapter covers the global infrastructure, the shared responsibility model, root and IAM user protection, policy types, roles and cross-account access, multi-account strategy, resource-based policies and directory federation.

<!-- section: global-infrastructure | objectives: 1.1.3 -->
## AWS global infrastructure

| Component | What it is | Design use |
| --- | --- | --- |
| Region | A separate geographic area with its own endpoints, isolated from other Regions | Data residency, latency to users, disaster recovery in a second Region |
| Availability Zone | One or more data centers with independent power, cooling and networking, linked to the other zones of the Region; most Regions have three or more | High availability: spread subnets, instances and databases across two zones or more |
| Local Zone | An extension of a Region near a large city | Single-digit millisecond latency for that metro area |
| Wavelength Zone | AWS compute and storage inside a carrier's 5G network | Ultra-low latency for mobile devices |
| Edge location | Points of presence of CloudFront, Route 53 and Global Accelerator | Caching and entry points close to users |

- Data stays in its Region unless you copy or replicate it. "Data must not leave the country" means choosing the Region, then denying the others with an SCP.
- Regions launched after March 20, 2019 are **opt-in**: disabled until an administrator enables them.
- AZ names (`us-east-1a`) map to physical zones differently in each account; **AZ IDs** (`use1-az1`) are the same everywhere. Use AZ IDs to align resources between accounts.
- IAM, Organizations and IAM Identity Center are global: a policy applies in every Region unless a condition such as `aws:RequestedRegion` restricts it.

<!-- section: shared-responsibility | objectives: 1.1.5 -->
## The shared responsibility model

AWS is responsible for security **of** the cloud: facilities, hardware, network, virtualization and the software of managed services. The customer is responsible for security **in** the cloud: data, identities and permissions, network configuration, encryption choices, and whatever AWS doesn't manage for the chosen service.

| Task | Amazon EC2 | Amazon RDS | AWS Lambda, Amazon S3, DynamoDB |
| --- | --- | --- | --- |
| Physical security, hosts, hypervisor | AWS | AWS | AWS |
| Guest operating system patching | Customer | AWS | AWS |
| Database engine patching | Customer, if installed on the instance | AWS, in the maintenance window you choose | Not applicable |
| Security groups, network ACLs | Customer | Customer | Customer, for VPC-connected functions |
| IAM permissions, data classification, encryption settings | Customer | Customer | Customer |

> **Exam trap.** Moving from EC2 to a managed service shifts operating system and engine patching to AWS, never the data, IAM permissions or encryption decisions. S3 and DynamoDB encrypt data at rest automatically, but choosing a customer managed key and controlling who can use it remains the customer's job.

<!-- section: root-and-users | objectives: 1.1.4, 1.1.6 -->
## Protecting the root user and IAM users

The **root user** has unrestricted access to its account and can't be limited by IAM policies:

- Don't use it for daily work: create an administrative user in IAM Identity Center.
- Don't create root access keys; delete existing ones.
- MFA is enforced for root users; prefer a phishing-resistant passkey or security key. The root user and each IAM user can register up to eight MFA devices.
- Alert on root sign-ins (EventBridge rule on the CloudTrail sign-in event).
- Keep it for root-only tasks: enabling MFA Delete on an S3 bucket, editing a bucket or queue policy that denies all principals, changing the root email of a standalone account.

In an organization, **centralized root access management** lets the management account (or a delegated administrator for IAM) delete the root credentials of member accounts and run the privileged root tasks for them. Accounts created through Organizations then have no root credentials.

**IAM users** have long-term credentials (password, access keys). Avoid them: people sign in through IAM Identity Center or a federated identity provider and get temporary credentials; workloads use roles. When an IAM user is unavoidable (a tool that only accepts access keys), require MFA, set a password policy, rotate the keys and grant only the needed actions.

| Least privilege need | Tool |
| --- | --- |
| Generate a policy from the actions a role actually called | IAM Access Analyzer policy generation (from CloudTrail) |
| Find unused roles, access keys and permissions | IAM Access Analyzer unused access analyzer, last accessed information |
| Find resources shared outside the account or organization | IAM Access Analyzer external access analyzer |
| Check a policy before deploying it | IAM Access Analyzer policy validation |

<!-- section: authorization-model | objectives: 1.1.7, 1.1.4 -->
## A flexible authorization model

| Element | Exam facts |
| --- | --- |
| IAM user | Long-term credentials; avoid for people and workloads |
| IAM group | Shares policies among users; not a principal (can't be named in a resource policy or assume a role); no nesting |
| IAM role | Permissions without long-term credentials, assumed by trusted principals: services, applications, federated users, other accounts |
| Identity-based policy | AWS managed, customer managed (reusable, versioned) or inline (tied to one identity) |
| Resource-based policy | Attached to a resource, names a `Principal`; can grant access to other accounts |
| Permissions boundary | Sets the maximum permissions of a user or role; lets developers create roles under a ceiling; grants nothing |
| SCP, RCP | Organization ceilings on principals or resources of member accounts; grant nothing |
| Session policy | Passed when assuming a role; restricts that session |

Evaluation in one account: an **explicit deny** in any policy wins; otherwise an **allow** from an identity-based or resource-based policy is enough, provided every applicable ceiling (SCP, RCP, permissions boundary, session policy) allows it too; otherwise the request is **implicitly denied**.

Conditions let one policy serve many teams. This attribute-based access control (ABAC) policy lets a user manage only the instances tagged with their own team, with no change when a team is added:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["ec2:StartInstances", "ec2:StopInstances", "ec2:RebootInstances"],
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": {
        "StringEquals": { "aws:ResourceTag/team": "${aws:PrincipalTag/team}" }
      }
    }
  ]
}
```

> **Exam tip.** "Grant access to many users with the least administrative effort" points to groups (IAM) or permission sets assigned to groups (IAM Identity Center), never to policies attached user by user.

<!-- section: roles-sts | objectives: 1.1.8 -->
## Roles, AWS STS and cross-account access

A role has a **trust policy** (who may assume it) and a **permissions policy** (what the session may do). Assuming it calls AWS Security Token Service (AWS STS): `AssumeRole` for an IAM user or role, `AssumeRoleWithSAML` for a SAML 2.0 federated user, `AssumeRoleWithWebIdentity` for an OpenID Connect user. A role's maximum session duration is 1 to 12 hours; a request can ask for 15 minutes up to that maximum (default 1 hour). **Role chaining**, assuming a role with another role's credentials, is limited to 1 hour.

**Cross-account access**: the account that owns the resources creates a role whose trust policy names the other account or one of its roles; that other account grants `sts:AssumeRole` on the role ARN to its users or roles. In the console this is **switching roles**: the user then has the role's permissions only.

For a **third party** (SaaS vendor, auditor), require an **external ID** in the trust policy. It prevents the confused deputy problem, where another customer of the vendor makes it use your role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:root" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "sts:ExternalId": "anycompany-7f3a91" } }
    }
  ]
}
```

| Requirement | Answer |
| --- | --- |
| Application on EC2 calls S3 without stored keys | IAM role through an instance profile |
| Containers or functions need AWS permissions | ECS task role, Lambda execution role |
| Developers in account A administer resources in account B | Role in B trusting A, plus `sts:AssumeRole` granted in A |
| A vendor's account needs read access | Role trusting the vendor's account, with an external ID |
| An AWS service acts on your behalf | Service role, or a service-linked role managed by the service |

> **Exam trap.** A resource-based policy (bucket policy, queue policy) lets a principal of another account reach the resource while keeping its own permissions; assuming a role replaces them. Copying objects from a bucket in account B to a bucket in account A in one call therefore needs a bucket policy in B, not a role in B.

<!-- section: multi-account | objectives: 1.1.1, 1.1.9 -->
## Multi-account security strategy

Accounts are the strongest isolation boundary: workloads, environments and teams get their own accounts, grouped in **organizational units (OUs)**. The **management account** pays and governs and should run no workload.

**Service control policies (SCPs)** cap the permissions of every IAM user and role, root user included, in the member accounts below the point where they are attached:

- They grant nothing: an IAM or resource policy must still allow the action.
- They don't affect the management account or service-linked roles.
- The default `FullAWSAccess` policy is attached everywhere; removing it without a replacement blocks every action.
- An Allow statement accepts conditions but only `"Resource": "*"`; Deny statements can name ARNs. A deny list (keep `FullAWSAccess`, add denies) is easier to maintain.

This SCP keeps member accounts in two Regions while allowing the global services:

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
        "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] }
      }
    }
  ]
}
```

**Resource control policies (RCPs)** cap what any principal, inside or outside the organization, can do on resources of supported services (S3, KMS, SQS, Secrets Manager, AWS STS and others) in member accounts, for example denying bucket access to identities outside the organization. They grant nothing and skip the management account.

**AWS Control Tower** builds a governed **landing zone** on Organizations and IAM Identity Center: a Security OU with log archive and audit accounts, **Account Factory** to provision compliant accounts from a template, and controls that are mandatory, strongly recommended or elective:

| Control behavior | Implemented with | Effect |
| --- | --- | --- |
| Preventive | SCPs, RCPs, declarative policies | Disallows the action |
| Detective | AWS Config rules | Reports noncompliant resources |
| Proactive | AWS CloudFormation hooks | Blocks noncompliant resources before provisioning |

| Requirement | Answer |
| --- | --- |
| No account in an OU may stop CloudTrail or leave the organization | SCP denying those actions, attached to the OU |
| New multi-account environment with best-practice guardrails, least effort | AWS Control Tower |
| A security account runs GuardDuty for all accounts | Delegated administrator for GuardDuty |
| Block company buckets from identities outside the organization | RCP, or bucket policies with `aws:PrincipalOrgID` |

<!-- section: resource-policies | objectives: 1.1.10 -->
## Resource-based policies

Amazon S3 (bucket policies), AWS KMS (key policies, mandatory on every key), Amazon SQS, Amazon SNS, AWS Lambda, AWS Secrets Manager, Amazon ECR, API Gateway REST APIs and AWS Backup vaults accept a policy on the resource itself; role trust policies are resource-based too.

| Situation | Policy |
| --- | --- |
| Another account reads objects without switching roles | Bucket policy naming that account or role |
| A service delivers to your resource (SNS to SQS, S3 to Lambda, CloudFront to S3) | Resource policy with the service principal and `aws:SourceArn` or `aws:SourceAccount` |
| Only identities of your organization | Condition `aws:PrincipalOrgID` |
| Only through one VPC endpoint | Condition `aws:SourceVpce` |
| A key used from another account | KMS key policy, plus an IAM policy in that account |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOrganizationReadOnly",
      "Effect": "Allow",
      "Principal": "*",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::example-corp-reports/*",
      "Condition": { "StringEquals": { "aws:PrincipalOrgID": "o-a1b2c3d4e5" } }
    }
  ]
}
```

A cross-account request needs both allows: the identity-based policy in the caller's account and the resource-based policy in the resource's account. An explicit deny in either wins.

> **Exam trap.** `"Principal": "*"` without a restricting condition makes a bucket policy public, and S3 Block Public Access, on by default, rejects it. A fixed `aws:PrincipalOrgID` or `aws:SourceVpce` value keeps it non-public.

<!-- section: federation | objectives: 1.1.2, 1.1.11 -->
## Federation and directory services

Federation lets users keep one identity in an existing directory and receive temporary AWS credentials instead of IAM users.

**IAM Identity Center** is the recommended workforce access to many accounts and applications. Its **organization instance**, in the management account, is the only one that manages access to AWS accounts. Administrators assign **permission sets** (a job function's policies) to users or groups for chosen accounts; Identity Center creates the matching roles, and users sign in once to the **AWS access portal**. Identity source: the Identity Center directory, Active Directory (through AWS Managed Microsoft AD or AD Connector), or an external SAML 2.0 identity provider (Okta, Microsoft Entra ID) with SCIM provisioning.

**IAM SAML 2.0 federation** (`AssumeRoleWithSAML`) still works but must be configured in every account; Identity Center centralizes it.

| AWS Directory Service option | What it is | Choose it when |
| --- | --- | --- |
| AWS Managed Microsoft AD | Actual Microsoft AD run by AWS | AD-aware workloads in AWS (Windows, RDS for SQL Server, FSx for Windows File Server), trust with the on-premises forest, schema extensions |
| AD Connector | Gateway that redirects requests to on-premises domain controllers without caching any information in the cloud | Users sign in to compatible AWS applications with existing on-premises credentials |
| Simple AD | Samba 4 AD-compatible directory | Small, low-cost directory; no trusts, no MFA |

| Requirement | Answer |
| --- | --- |
| Employees reach every account with corporate credentials, managed centrally | IAM Identity Center with the corporate IdP or AD as identity source |
| Users stay in on-premises AD, no directory copy in AWS | AD Connector |
| Windows workloads need a domain trusting the corporate forest | AWS Managed Microsoft AD with a trust |
| Customers of a web or mobile app sign up and sign in | Amazon Cognito user pools, not IAM |
| A CI/CD system outside AWS deploys without long-term keys | OIDC identity provider in IAM, role assumed with web identity |

Federate a directory with IAM roles when users already exist in it and must keep its password policy, MFA and lifecycle: disabling a leaver there removes AWS access everywhere.

<!-- section: key-points -->
## Key points

- Regions isolate data and failures; Availability Zones give high availability; AZ IDs align zones across accounts.
- AWS secures the cloud, you secure what you put in it; your data and IAM always stay yours.
- No root keys, MFA, centralized root access; people use IAM Identity Center, workloads use roles.
- Explicit deny wins; an allow is required; SCPs, RCPs and boundaries only cap.
- Cross-account: trust policy plus `sts:AssumeRole`, external ID for third parties; resource policies keep the caller's permissions.
- Control Tower = landing zone, Account Factory, preventive, detective and proactive controls.
- AD Connector proxies to on-premises AD; Managed Microsoft AD is a real AD; Cognito serves application customers.
