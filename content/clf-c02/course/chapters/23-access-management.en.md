Access management decides who can sign in to AWS and what each identity can do. The exam asks you to recognize IAM identities and policies, least privilege, root-only tasks, IAM Identity Center, credential storage and the types of identity management.

<!-- section: iam-identities | objectives: 2.3.1, 2.3.7 -->
## IAM identities and policies

**AWS Identity and Access Management (IAM)** controls authentication (who signs in) and authorization (what they can do) for AWS resources. IAM is global (not tied to a Region) and has no additional charge.

| Element | What it is | Use |
| --- | --- | --- |
| **IAM user** | An identity with long-term credentials: a console password and/or access keys | A person or application that can't use temporary credentials; avoid when possible |
| **IAM group** | A collection of IAM users; permissions attached to the group apply to every member | Same permissions for a team; a group can't sign in or contain other groups |
| **IAM role** | An identity with permissions but no long-term credentials; whoever assumes it gets **temporary credentials** | AWS services (EC2, Lambda), federated users, other accounts |
| **Policy** | A JSON document that allows or denies actions on resources | Attached to identities (identity-based) or to a resource such as an S3 bucket (resource-based) |

| Policy type | Managed by | Reuse |
| --- | --- | --- |
| **AWS managed policy** | AWS, which updates it; you can't edit it (for example, `ReadOnlyAccess`, job function policies) | Many identities; quick start |
| **Customer managed policy** | You, in your account | Many identities; tailored to your needs |
| **Inline policy** | You, embedded in one user, group or role | Only that identity; deleted with it |

A policy that allows reading the objects of one bucket only:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::example-reports/*"
    }
  ]
}
```

Everything is **denied by default**; an explicit `Allow` grants access, and an explicit `Deny` in any policy always wins over an allow.

<!-- section: least-privilege | objectives: 2.3.3, 2.3.7 -->
## The principle of least privilege

Grant only the permissions required to perform a task, on the resources it needs, and nothing more. In practice:

1. Put users in **groups** per job function instead of attaching policies to each user.
2. Start from **AWS managed policies**, then move to **customer managed policies** limited to what is really used.
3. Use **IAM Access Analyzer** to generate a policy from CloudTrail activity, and **last accessed information** to remove unused permissions.
4. Review and delete unused users, roles, credentials and policies regularly.
5. Across accounts, AWS Organizations **SCPs** set maximum permissions; they never grant any.

> **Exam trap.** `AdministratorAccess` for everyone "to save time" breaks least privilege. "Give each new developer the same permissions" is answered by an IAM **group**, not by copying an inline policy to each user.

<!-- section: root-user | objectives: 2.3.2, 2.3.8, 2.3.9 -->
## Protecting the root user

The **root user** is the identity created with the AWS account (its email address). It has **complete, unrestricted access** to every resource and to billing, and IAM policies can't limit it: a compromised root user means a compromised account.

Tasks that **only the root user** can perform include:

- change the email address or root password of a standalone account, or close it;
- restore IAM permissions when the only IAM administrator revoked its own;
- activate IAM access to the Billing and Cost Management console;
- register as a seller in the Reserved Instance Marketplace;
- enable MFA Delete on an S3 bucket;
- edit or delete an S3 bucket policy or SQS queue policy that denies all principals;
- sign up for AWS GovCloud (US).

| Protection method | Detail |
| --- | --- |
| **Multi-factor authentication (MFA)** | Required by AWS for the root user of every account; passkeys and security keys resist phishing best |
| No root access keys | Don't create them; delete existing ones |
| Strong password and recovery | Strong, unique password; group email address and recovery phone controlled by trusted people |
| Don't use it daily | Administer with a user of IAM Identity Center; root only for the tasks above |
| Monitor its use | Alert on every root sign-in (Amazon EventBridge on the CloudTrail event, Amazon GuardDuty) |
| Centralized root access | In AWS Organizations, remove member accounts' root credentials and perform root tasks centrally |

> **Exam trap.** Creating IAM users, attaching policies and launching instances do **not** require the root user. Root-only tasks concern the account, some billing settings and policies that deny everyone.

<!-- section: authentication | objectives: 2.3.6 -->
## Authentication methods

| Method | How it works |
| --- | --- |
| Password + **MFA** | A second factor: passkey or FIDO security key, virtual authenticator app or hardware TOTP token; up to eight devices per user |
| **Access keys** | Access key ID and secret access key for the AWS CLI, SDKs and APIs; long-term, a risk if leaked |
| **IAM Identity Center** | Single sign-on to assigned accounts and applications, with temporary credentials |
| **IAM roles**, including **cross-account roles** | Assuming a role gives temporary credentials; a cross-account role in account B trusts account A, so A's identities work in B without users in B |

<!-- section: identity-center | objectives: 2.3.4 -->
## AWS IAM Identity Center

IAM Identity Center (formerly AWS Single Sign-On) is the recommended way to give a workforce access to **several AWS accounts** and applications.

- **Identity source** (one at a time): the Identity Center directory (default), Active Directory (on premises or AWS Managed Microsoft AD), or an external identity provider such as Okta or Microsoft Entra ID.
- **Permission sets** define what a user or group can do; they are assigned per account and become IAM roles in those accounts.
- Users sign in to the **AWS access portal** and receive **temporary credentials**: no IAM user per account.
- Access to accounts requires an organization instance, enabled in the AWS Organizations management account.

> **Exam tip.** "Employees sign in with their existing corporate credentials to many AWS accounts" points to IAM Identity Center, not to one IAM user per employee and per account.

<!-- section: credentials | objectives: 2.3.5 -->
## Access keys, password policies and credential storage

| Topic | What to know |
| --- | --- |
| **Access keys** | Up to two per IAM user (for rotation); the secret is shown only at creation; never in code; prefer roles |
| **Password policy** | IAM user passwords: minimum length, character types, expiration, reuse prevention; not for the root user or access keys |
| **AWS Secrets Manager** | Stores secrets (database passwords, API keys), encrypts them with KMS and **rotates** them automatically; retrieved at runtime |
| **AWS Systems Manager Parameter Store** | Configuration values and SecureString parameters encrypted with KMS; standard tier free; no rotation |

> **Exam trap.** "Rotate database credentials automatically" is **Secrets Manager**. "Store configuration values such as an AMI ID, at no extra cost" is **Parameter Store**.

<!-- section: identity-types | objectives: 2.3.10 -->
## Types of identity management

| Type | Identities live in | Fits when |
| --- | --- | --- |
| **IAM users** in each account | IAM, with long-term credentials | Small, single-account use, or an application that requires access keys |
| **Federated identity** | An external identity provider (corporate directory, Okta, Microsoft Entra ID), trusted through SAML 2.0 or OpenID Connect | Employees keep one corporate identity and get temporary credentials |
| **Amazon Cognito** | User pools for the sign-up and sign-in of an application's end users, including social identity providers | Customers of a web or mobile application |
| **IAM roles** for workloads | No user: AWS services assume a role | EC2 instances, Lambda functions and other services that call AWS APIs |

Federation is the recommended practice for people: no long-term credential to distribute.

<!-- section: key-points -->
## Key points

- Users (long-term credentials), groups, roles (temporary credentials), policies (AWS managed, customer managed, inline).
- Least privilege: groups, customer managed policies, IAM Access Analyzer; default deny, explicit deny wins.
- Root user: MFA required, no access keys, not for daily use.
- IAM Identity Center: single sign-on to many accounts with permission sets and temporary credentials.
- Secrets Manager rotates secrets; Parameter Store stores configuration.
- Federation (SAML 2.0, OIDC) for employees, Cognito for application users, roles for workloads.
