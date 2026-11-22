Authentication answers "who is calling?" before any policy is evaluated. Specialty questions mix three populations, each with its own answer: people of the company (workforce), users of the company's applications (customers), and code (applications, pipelines, servers). The secure design keeps one source of identity per population, adds strong MFA where humans sign in, and hands out only short-lived credentials. The last part of the chapter is the one candidates underestimate: reading CloudTrail and service errors to find why a sign-in or a role assumption failed.

<!-- section: identity-solutions | objectives: 4.1.1 -->
## Identity solutions for humans, applications and systems

| Who authenticates | Recommended mechanism |
| --- | --- |
| Employees, to many AWS accounts and business applications | IAM Identity Center organization instance, identity source = external IdP (SAML 2.0 sign-in, SCIM provisioning) or Active Directory (AWS Managed Microsoft AD, or AD Connector to a self-managed AD) |
| Customers of a web or mobile application | Amazon Cognito user pool (sign-up, sign-in, MFA, social or enterprise federation), plus an identity pool if the client calls AWS services directly |
| Code running on AWS | IAM roles delivered by the platform: EC2 instance profile, ECS task role, Lambda execution role, EKS Pod Identity |
| Machine-to-machine API calls | Cognito client credentials grant with scopes on a resource server, or SigV4 with an IAM role |
| Workloads outside AWS | IAM Roles Anywhere (X.509 certificates) or IAM OIDC federation |
| Break-glass access if the IdP is down | A small number of IAM users with hardware MFA, credentials kept offline, sign-in alarms |

**IAM Identity Center MFA** (when the identity source is the Identity Center directory or Active Directory):

- Prompt mode: **every time they sign in** (default, always-on), **only when their sign-in context changes** (context-aware: device, browser, location), or **never** (not recommended).
- If a user has no registered device: **require them to register an MFA device at sign in** (default), send a one-time password by email (better than a password alone, but not industry-standard MFA), **block their sign-in**, or allow them to sign in.
- Types: FIDO2 authenticators (security keys, built-in authenticators such as passkeys) and authenticator apps; an existing RADIUS MFA on Directory Service can be kept by leaving Identity Center MFA disabled.
- With an **external IdP**, the MFA settings are not available in Identity Center: MFA is enforced by the IdP.

**IAM users and the root user** support passkeys and security keys, virtual authenticator apps and hardware TOTP tokens, up to 8 MFA devices per user. In an organization, **centralized root access** lets the management account or a delegated administrator remove root credentials from member accounts and run privileged root tasks on demand.

Requiring MFA for API calls by IAM users uses a condition on `aws:MultiFactorAuthPresent`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyWithoutMfa",
      "Effect": "Deny",
      "NotAction": ["iam:ListMFADevices", "iam:EnableMFADevice", "iam:ResyncMFADevice", "sts:GetSessionToken"],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" }
      }
    }
  ]
}
```

> **Exam trap.** With `Bool` instead of `BoolIfExists`, the deny never applies to calls signed with long-term access keys, because the key is absent from those requests. `BoolIfExists` treats a missing key as `false` and denies.

<!-- section: customer-identity | objectives: 4.1.1 -->
## Amazon Cognito for application users

| Component | Role |
| --- | --- |
| User pool | User directory and OAuth 2.0 / OIDC authorization server; issues ID, access and refresh tokens (JWT); federates SAML, OIDC and social IdPs |
| App client | One per application; confidential clients (server side) have a client secret, public clients (mobile, single-page) do not and use PKCE |
| Identity pool | Exchanges a token (user pool, SAML, OIDC, social) or a guest identity for temporary AWS credentials of an IAM role |
| Resource server and scopes | Custom scopes checked by API Gateway or the backend; used with the client credentials grant |

User pool **MFA** configuration is off, optional or required. Factors: **SMS**, **email** (needs the Essentials or Plus feature plan and your own Amazon SES configuration) and **TOTP** authenticator apps; each user has one active MFA method. **Passkeys** with user verification can satisfy MFA as a first factor, but a passkey cannot be the second factor after a password. **Federated users** do not get Cognito MFA: their IdP authenticates them. Threat protection (adaptive authentication against risky or compromised-credential sign-ins) is in the **Plus** plan and needs MFA set to optional, so that it can require MFA only for risky sign-ins.

Identity pool roles must trust `cognito-identity.amazonaws.com` with conditions on `cognito-identity.amazonaws.com:aud` (the identity pool ID) and `cognito-identity.amazonaws.com:amr` (`authenticated` or `unauthenticated`); without them, any identity pool could use the role.

> **Exam trap.** A user pool authenticates and issues JWTs; it never returns AWS credentials. When a mobile app must upload directly to S3, the answer adds an identity pool (or a backend that issues presigned URLs), not more user pool settings.

<!-- section: temporary-credentials | objectives: 4.1.2 -->
## Issuing temporary credentials

| AWS STS operation | Caller | Duration | Notes |
| --- | --- | --- | --- |
| `AssumeRole` | IAM user or role session | 15 minutes to the role's maximum session duration (1 to 12 hours), default 1 hour | MFA (`SerialNumber`, `TokenCode`), session policies, session tags, external ID, source identity |
| `AssumeRoleWithSAML` | Anyone with a SAML assertion from a trusted IdP (unsigned call) | Same as `AssumeRole` | No MFA parameter: MFA happens at the IdP |
| `AssumeRoleWithWebIdentity` | Anyone with an OIDC token from a trusted provider (unsigned call) | Same as `AssumeRole` | CI/CD, other clouds, IRSA; trust restricted on `aud` and `sub` |
| `GetSessionToken` | IAM user or root user | IAM user 15 minutes to 36 hours (default 12 hours), root 1 hour maximum | Main use: MFA-protected API calls; no session policy |
| `GetFederationToken` | IAM user or root user | Same as `GetSessionToken` | Session policy required in practice; cannot call IAM through the API |
| `AssumeRoot` | Management account or delegated administrator principal with `sts:AssumeRoot` | Short privileged session | Task policy required (`IAMDeleteRootUserCredentials`, `S3UnlockBucketPolicy`, `SQSUnlockQueuePolicy`, `IAMAuditRootUserCredentials`, `IAMCreateRootUserPassword`); Regional STS endpoint only |

**Role chaining** (using a role session to assume another role) limits the new session to 1 hour, whatever the role's maximum. Credentials cannot be revoked one by one; to cut off sessions after a key leak, use **Revoke active sessions** on the role, which adds a deny for tokens issued before that time (`aws:TokenIssueTime`), then fix the cause.

On EC2, require **IMDSv2** (`HttpTokens` set to `required`) so instance profile credentials can only be read with a session token, which blocks most SSRF-based theft.

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::444455556666:role/audit/SecurityAudit \
  --role-session-name analyst-jdoe \
  --serial-number arn:aws:iam::111122223333:mfa/jdoe \
  --token-code 123456 \
  --duration-seconds 3600

aws s3 presign s3://example-reports/2026/q3.pdf --expires-in 900
```

**Amazon S3 presigned URLs** are bearer tokens: anyone holding one can perform the signed operation until it expires, with the signer's permissions.

| Signed with | Maximum validity |
| --- | --- |
| IAM user access keys (SigV4, CLI or SDK) | 7 days |
| S3 console | 1 minute to 12 hours |
| Temporary credentials (role session, instance profile, task role) | Until the credentials expire, even if a longer expiration is requested |

A URL stops working when the signing credentials are revoked or deactivated. Bucket policies can limit presigned use: `s3:signatureAge` (maximum age of the signature), `s3:authType` (`REST-QUERY-STRING` identifies presigned requests), and `aws:SourceIp`, `aws:SourceVpc` or `aws:SourceVpce` for the network.

> **Exam trap.** A presigned URL generated by a Lambda function lasts at most as long as the function's role session, so a requested 7-day expiry fails early. For long-lived URLs, sign with dedicated IAM user keys (stored in Secrets Manager and rotated) or, better, shorten the requirement.

<!-- section: authn-troubleshooting | objectives: 4.1.3 -->
## Troubleshooting authentication

Evidence comes from **CloudTrail**: sign-in events (`ConsoleLogin` with `responseElements.ConsoleLogin` = `Failure` and `errorMessage` "Failed authentication", `additionalEventData.MFAUsed`), STS events (`AssumeRole`, `AssumeRoleWithSAML`, `AssumeRoleWithWebIdentity` with `errorCode`), and IAM Identity Center events (`CredentialVerification`, `ExternalIdPDirectoryLogin`). CloudTrail Lake is closed to new customers since May 31, 2026; new designs query trails in S3 with Amazon Athena or send them to CloudWatch Logs (Logs Insights).

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `AccessDenied` on `sts:AssumeRole` "because no role trust policy allows" | Trust policy does not name the caller, or a condition fails (`sts:ExternalId`, MFA, `aws:PrincipalOrgID`) | Fix the trust policy; the caller also needs `sts:AssumeRole` in its own policy |
| Identity Center "An unexpected error has occurred" after IdP sign-in | SAML `NameID` does not match an existing Identity Center user name (no just-in-time creation), wrong ACS URL, encrypted assertion | Provision users with SCIM first, align `NameID`, check `CredentialVerification` failures in CloudTrail |
| User sees no account although assigned | User or group deleted and re-created in the IdP (new internal ID) | Remove and re-add the assignment |
| Permission set change has no effect | Change not pushed to the accounts | Reprovision the permission set (`provision-permission-set`) |
| Permission set assignment fails in one account | A customer managed policy or boundary referenced by name and path does not exist in that account | Create it in every target account (StackSets) |
| Editing an `AWSReservedSSO_` role fails | Protected role managed by Identity Center | Change the permission set instead |
| Cognito `NotAuthorizedException` | Wrong password, revoked or expired refresh token, missing client secret hash for a confidential client | Check app client settings and token validity |
| Cognito `UserNotConfirmedException` | Sign-up not confirmed | Confirm the user (code or admin confirmation) |
| Cognito `redirect_mismatch` | Callback URL not in the app client's allowed list | Add the exact URL |
| AD Connector sign-in fails | Service account lacks read rights or expired, ports TCP/UDP 53, 88, 389 closed to the domain controllers, Kerberos preauthentication disabled, clock skew | Fix the service account, firewall and NTP; RADIUS MFA needs UDP 1812 |

For directories, AWS Managed Microsoft AD supports trusts with on-premises domains, AD Connector only proxies requests to an existing directory, and **Simple AD is closed to new customers** since July 30, 2026, so it is not a valid answer for a new deployment.

> **Exam tip.** "Users authenticate at the IdP but land on an error page in Identity Center" is a SAML attribute or provisioning issue. "Users reach the portal but get access denied in the account" is an authorization issue (permission set or SCP), covered in chapter 42.

<!-- section: key-points -->
## Key points

- One identity source per population: Identity Center for the workforce, Cognito for customers, IAM roles for code, Roles Anywhere or OIDC outside AWS.
- Identity Center MFA: always-on by default, context-aware optional; external IdPs enforce their own MFA.
- `BoolIfExists` on `aws:MultiFactorAuthPresent` to deny long-term keys without MFA.
- Cognito: user pools issue JWTs, identity pools issue AWS credentials; email MFA needs Essentials or Plus; threat protection is in Plus; federated users get MFA from their IdP.
- STS: role sessions 15 minutes to 12 hours, role chaining 1 hour, `GetSessionToken` up to 36 hours, `AssumeRoot` with task policies; revoke sessions with `aws:TokenIssueTime`; IMDSv2.
- Presigned URLs: 7 days with IAM user keys, never longer than temporary credentials; restrict with `s3:signatureAge`, `s3:authType` and network keys.
- Troubleshoot from CloudTrail: trust policy errors, SAML `NameID`, reprovisioning permission sets, missing customer managed policies, Directory Service ports and service accounts.
