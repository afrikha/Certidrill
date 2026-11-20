Authentication and authorization questions describe who is calling (an end user of a mobile app, an employee, a CI/CD job, a Lambda function, another account) and what the code must reach (an API, an S3 object, a DynamoDB item). The answer is a mechanism that issues temporary credentials or a token, plus a policy that limits what they allow. This chapter covers identity federation, access control with tokens and MFA, programmatic access, presigned URLs, signed requests, IAM permissions and role assumption.

<!-- section: identity-federation | objectives: 2.1.1 -->
## Identity federation

Federation lets an identity managed elsewhere (a user directory, a social provider, a corporate IdP, a CI/CD platform) use AWS without an IAM user. Match the caller to the mechanism:

| Who signs in | Mechanism |
| --- | --- |
| End users of a web or mobile app: sign-up, sign-in, social or SAML/OIDC sign-in, MFA | Amazon Cognito user pool (returns JWTs) |
| The same users must call AWS services directly (upload to S3, read DynamoDB) | Amazon Cognito identity pool, which exchanges the user pool token (or a social, SAML or OIDC token) for temporary AWS credentials |
| Guest users who have not signed in | Identity pool with unauthenticated (guest) access and a minimal unauthenticated role |
| Employees signing in to the console and CLI across accounts | AWS IAM Identity Center |
| A corporate SAML 2.0 IdP mapped to IAM roles in one account | IAM SAML identity provider and `AssumeRoleWithSAML` |
| A CI/CD platform that issues OIDC tokens (GitHub Actions, GitLab) | IAM OIDC identity provider and `AssumeRoleWithWebIdentity`; no stored access keys |
| Servers outside AWS with X.509 certificates | IAM Roles Anywhere |

An identity pool gives credentials in one of two flows:

| | Enhanced (simplified) flow | Basic (classic) flow |
| --- | --- | --- |
| API calls | `GetId`, then `GetCredentialsForIdentity` | `GetId`, `GetOpenIdToken`, then STS `AssumeRoleWithWebIdentity` |
| Who chooses the IAM role | The identity pool: default role, rules or token claims | The client application |
| Credential lifetime | One hour | Custom session duration possible |
| Role mappings | Supported | Not supported |
| Recommendation | AWS recommends it | Off by default for new pools |

A user pool issues three tokens. The **ID token** carries identity claims (`email`, `cognito:groups`); the **access token** carries the OAuth `scope` claim and authorizes API calls; the **refresh token** (30 days by default, 60 minutes to 10 years) gets new ID and access tokens. With refresh token rotation, each refresh returns a new refresh token and invalidates the old one. Always verify a token's signature against the user pool's JSON Web Key Set before trusting its claims.

> **Exam trap.** A user pool authenticates users but never returns AWS credentials. "Users must upload directly to their own S3 prefix from the mobile app" needs an identity pool behind the user pool.

<!-- section: access-control | objectives: 2.1.2 -->
## Access control with tokens, fine-grained permissions and MFA

API Gateway offers several ways to authorize a caller:

| Requirement | API Gateway mechanism |
| --- | --- |
| Callers are signed-in Cognito users | Cognito user pool authorizer (REST API): send the ID token, or the access token when methods require OAuth scopes |
| Validate JWTs from any OIDC provider without code | JWT authorizer (HTTP API; also documented for REST APIs) with issuer, audience and scopes |
| Custom logic: a third-party token, a header plus a query string, a database lookup | Lambda authorizer, `TOKEN` type (one bearer token) or `REQUEST` type (headers, query strings, stage variables, context; recommended) |
| Callers are AWS principals (other services, roles in other accounts) | IAM authorization: the caller signs with SigV4 and needs `execute-api:Invoke` |
| Allow only some source IPs, VPC endpoints or accounts | Resource policy on the REST API |
| Meter and throttle each customer | Usage plans and API keys, never for authorization |

A Lambda authorizer returns a `principalId`, a policy document that allows or denies `execute-api:Invoke`, and an optional `context` map passed to the backend. A deny returns 403; a missing identity source or an `Unauthorized` error returns 401. The policy is cached per identity source when caching is on, so a cached policy must cover every method the caller may use; otherwise the caller gets 403 on other methods until the cache entry expires.

**Fine-grained permissions** use policy variables and condition keys so that one role serves every user. With an identity pool, each user can reach only the DynamoDB items whose partition key is their own identity ID:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:111122223333:table/UserNotes",
      "Condition": {
        "ForAllValues:StringEquals": {
          "dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]
        }
      }
    }
  ]
}
```

The same pattern limits S3 access to a prefix (`arn:aws:s3:::example-bucket/${cognito-identity.amazonaws.com:sub}/*`). `dynamodb:Attributes` limits which attributes can be read or written.

**MFA**: in IAM policies, require it with the `aws:MultiFactorAuthPresent` condition (and `aws:MultiFactorAuthAge` to limit its age). A developer using long-term keys calls `sts get-session-token` with `--serial-number` and `--token-code` to get MFA-authenticated temporary credentials; a CLI role profile with `mfa_serial` prompts for the code. In Cognito user pools, MFA (SMS, TOTP authenticator app, email) is set to off, optional or required.

> **Exam trap.** API keys identify and throttle clients; they don't authenticate them. A valid key for one API in a usage plan works for every API in that plan. Use IAM, a Cognito authorizer or a Lambda authorizer to control access.

<!-- section: programmatic-access | objectives: 2.1.3 -->
## Programmatic access to AWS

The SDKs and the CLI look for credentials in a chain and stop at the first source that answers: credentials set in code, environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`), web identity, console sign-in (`aws login`), IAM Identity Center, a role profile, container credentials (ECS, EKS), `credential_process`, then the EC2 instance metadata service.

| Where the code runs | Credentials to use |
| --- | --- |
| Developer laptop, workforce in IAM Identity Center | `aws configure sso`, then `aws sso login` |
| Developer laptop, console users (IAM users, root, IAM federation) | `aws login` (CLI 2.32.0 or later, managed policy `SignInLocalDevelopmentAccess`): temporary credentials refreshed for up to 12 hours |
| EC2 instance | Instance profile (role); IMDSv2 |
| Lambda function | Execution role |
| ECS task | Task role for the application's calls; the task execution role only pulls the image and writes logs |
| CodeBuild project | Service role |
| Outside AWS, no OIDC | IAM Roles Anywhere, or long-term access keys as a last resort, rotated |

A shared config file defines profiles:

```text
[profile dev]
sso_session = corp
sso_account_id = 111122223333
sso_role_name = DeveloperAccess

[sso-session corp]
sso_region = us-east-1
sso_start_url = https://example-corp.awsapps.com/start

[profile deploy]
role_arn = arn:aws:iam::444455556666:role/DeployRole
source_profile = dev
mfa_serial = arn:aws:iam::111122223333:mfa/dev-user
```

Select a profile with `--profile` or `AWS_PROFILE`. `aws sts get-caller-identity` shows which identity the chain actually picked.

> **Exam trap.** Environment variables come before the config files and the instance profile. When an EC2 application "ignores its instance role", look for leftover `AWS_ACCESS_KEY_ID` variables or a credentials file. Never embed access keys in code, an AMI or a container image.

<!-- section: presigned-urls | objectives: 2.1.4 -->
## Presigned URLs and CloudFront signed URLs

An **S3 presigned URL** grants time-limited access to one object for someone without AWS credentials. It carries the permissions of the principal that signed it, and can be used for `GET` (download) or `PUT` (upload; an existing key is replaced).

```bash
aws s3 presign s3://example-reports/2026/q3.pdf --expires-in 900
```

```python
# Python (boto3): upload URL for a browser client, valid 10 minutes
s3 = boto3.client("s3")
url = s3.generate_presigned_url(
    "put_object",
    Params={"Bucket": "example-uploads", "Key": "user-42/photo.jpg", "ContentType": "image/jpeg"},
    ExpiresIn=600,
)
```

| Credentials that sign | Maximum validity |
| --- | --- |
| IAM user access keys (SigV4, CLI or SDK) | 7 days |
| Role or STS temporary credentials (Lambda, EC2, ECS) | Until the session credentials expire, whatever `ExpiresIn` says |
| S3 console | 1 minute to 12 hours |

S3 checks expiration when the request arrives. A URL stops working early if the signing credentials are revoked or deleted, or if the signer loses the permission. A bucket policy can reject old signatures with `s3:signatureAge` or restrict callers with `aws:SourceIp`.

For content delivered through **CloudFront**, use CloudFront signed URLs or signed cookies, and an origin access control (OAC) so the S3 bucket can't be read directly:

| Requirement | Answer |
| --- | --- |
| One file (an installer), or a client that doesn't support cookies | Signed URL |
| Many files (all HLS segments of a video, a subscribers' area) without changing URLs | Signed cookies |
| Only an expiration time | Canned policy |
| Start time, IP range or wildcard resource | Custom policy |
| Who can sign | A trusted key group (public keys uploaded to CloudFront, managed with IAM); CloudFront key pairs require the root user and aren't recommended |

> **Exam trap.** A presigned URL generated by a Lambda function with `ExpiresIn` of 24 hours fails after a few hours: it is signed with the execution role's temporary credentials. For long validity, sign with credentials that last, or use CloudFront signed URLs.

<!-- section: signed-requests | objectives: 2.1.5 -->
## Making authenticated calls

Every AWS API call is signed with **Signature Version 4** (SigV4): a signature derived from the secret key, scoped to one Region, one service and one day, in the `Authorization` header or the query string. With temporary credentials the session token is sent too (`X-Amz-Security-Token`). The SDKs and the CLI sign automatically; sign yourself only from custom HTTP code, for example to call an API Gateway method with IAM authorization or a Lambda function URL with `AWS_IAM` auth. **SigV4a** uses asymmetric signatures valid across Regions, for S3 Multi-Region Access Points; SDKs switch to it automatically.

| Symptom | Likely cause |
| --- | --- |
| Request rejected because the signature has expired or the time is skewed | The client clock is off: a request must reach AWS within 5 minutes of its timestamp |
| `SignatureDoesNotMatch` | Wrong secret key, Region or service in the signature, or the request changed after signing |
| `ExpiredToken` | Temporary credentials expired and the code cached them instead of using the provider |
| `InvalidClientTokenId` | Access key deleted, wrong account, or the session token missing |
| `AccessDenied` / 403 | Authentication worked; a policy doesn't allow the action |

**Lambda function URLs** have two auth types: `AWS_IAM` (callers sign with SigV4; same-account callers need an identity-based or resource-based allow, cross-account callers need both) and `NONE` (public, but the resource-based policy must still allow it). Since October 2025, new function URLs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`.

> **Exam tip.** "Call an IAM-protected API from a Python script" means SigV4 with temporary credentials from the provider chain, not an API key and not a hard-coded secret.

<!-- section: iam-permissions | objectives: 2.1.6 -->
## Permissions for principals and resources

| Policy type | Attached to | Use |
| --- | --- | --- |
| Identity-based policy | User, group or role | What this principal may do |
| Resource-based policy | S3 bucket, SQS queue, SNS topic, KMS key, Lambda function, Secrets Manager secret, API Gateway API | Who may access this resource, including other accounts and AWS services |
| Trust policy | Role | Who may assume the role |
| Permissions boundary | User or role | The maximum permissions identity-based policies can grant |
| Session policy | An assumed-role session | Further limits one session |

Evaluation: everything starts denied, an explicit deny always wins, and an allow is needed from an identity-based or resource-based policy. Within one account either one is usually enough (a KMS key is the exception: its key policy must allow); across accounts both the caller's identity policy and the resource policy must allow.

Service integrations show the two sides:

| Integration | Permission needed |
| --- | --- |
| S3, SNS or API Gateway invokes a Lambda function (push) | Resource-based policy on the function (`aws lambda add-permission --principal s3.amazonaws.com --source-arn ...`) |
| Lambda reads from SQS, Kinesis or DynamoDB Streams (event source mapping, poll) | Execution role: `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` (or the stream equivalents) |
| Code passes a role to a service (create a Lambda function, an ECS task, a CloudFormation stack) | `iam:PassRole` on that role |

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::111122223333:role/app-lambda-execution",
  "Condition": { "StringEquals": { "iam:PassedToService": "lambda.amazonaws.com" } }
}
```

Grant least privilege: specific actions and resource ARNs, conditions (`aws:SourceArn`, `aws:PrincipalTag`, `aws:ResourceTag` for attribute-based access control). IAM Access Analyzer generates a policy from CloudTrail activity and validates policies; the IAM policy simulator tests whether an action is allowed.

> **Exam trap.** "The function times out reading from SQS" or "the event source mapping fails to be created" is the execution role, not the function's resource-based policy. Push sources need the resource-based policy; poll sources need the execution role.

<!-- section: assume-role | objectives: 2.1.7 -->
## Assuming an IAM role

To assume a role, two things must be true: the role's **trust policy** names the caller as principal, and the caller's own permissions allow `sts:AssumeRole` on the role ARN.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/ci-runner" },
      "Action": "sts:AssumeRole",
      "Condition": { "StringEquals": { "sts:ExternalId": "anycompany-7731" } }
    }
  ]
}
```

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::444455556666:role/DeployRole \
  --role-session-name build-1287 \
  --duration-seconds 3600
```

The response contains `AccessKeyId`, `SecretAccessKey`, `SessionToken` and `Expiration`; all three values must be used together.

| Item | Value or rule |
| --- | --- |
| Default session duration | 1 hour |
| Maximum session duration | The role's setting, 1 to 12 hours |
| Role chaining (a role session assumes another role) | Limited to 1 hour |
| `GetSessionToken` (IAM user, MFA) | 15 minutes to 36 hours, 12 hours by default |
| Third party assumes a role in your account | Require an external ID (`sts:ExternalId`) |
| Trace who did what | `--role-session-name`, session tags, source identity, visible in CloudTrail |

`AssumeRoleWithWebIdentity` and `AssumeRoleWithSAML` need no AWS credentials from the caller: the OIDC or SAML token is the proof, and the trust policy names the identity provider with conditions on the token's `aud` and `sub`.

> **Exam trap.** An "is not authorized to perform `sts:AssumeRole`" error can come from either side. Across accounts, check the trust policy in the target account and the caller's policy in the source account. Requesting `--duration-seconds 14400` fails if the role's maximum session duration is 1 hour or the call is role chaining.

<!-- section: key-points -->
## Key points

- User pools authenticate and issue JWTs; identity pools exchange tokens for temporary AWS credentials; the enhanced flow is recommended.
- Workforce: IAM Identity Center; CI/CD: OIDC provider and `AssumeRoleWithWebIdentity`; servers outside AWS: IAM Roles Anywhere.
- API Gateway: Cognito, JWT, Lambda or IAM authorizers; resource policies for IPs and endpoints; API keys only meter.
- `dynamodb:LeadingKeys` and policy variables give per-user access with one role; `aws:MultiFactorAuthPresent` requires MFA.
- Roles everywhere in AWS (instance profile, execution role, task role); `aws login` or `aws sso login` on laptops; no embedded keys.
- Presigned URLs carry the signer's permissions and die with temporary credentials; CloudFront signed URLs for one file, cookies for many.
- SigV4 is automatic in SDKs; a request must arrive within 5 minutes of its timestamp.
- Push integrations need resource-based policies, poll integrations need the execution role, passing a role needs `iam:PassRole`.
- AssumeRole needs the trust policy and the caller's permission; 1 hour by default, up to 12 hours, 1 hour when chaining.
