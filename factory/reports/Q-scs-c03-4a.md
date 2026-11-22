# Q-scs-c03-4a — report

52 questions in `content/scs-c03/questions/identity/`, prefix `scsc03-4a-`.

- Objectives: 4.1.1 = 18, 4.1.2 = 17, 4.1.3 = 17.
- Types: single 40, multi 8 (one "Choose three"), ordering 2, dragdrop 2.
- Difficulty: 8 easy / 26 medium / 18 hard.
- Validator: `CERT=scs-c03 npx tsx factory/validate.ts --prefix scsc03-4a-` → 0 problem(s).

## Sources and checks
Every fact was checked with WebFetch on docs.aws.amazon.com (IAM Identity Center, Cognito, IAM/STS, S3, CloudFront, Directory Service, Roles Anywhere, IoT Core, EC2 IMDS / Instance Connect, ECS, CLI, API Gateway, CloudTrail). Every reference title was re-read on the page (H1) on 2026-11-22.

## Overlap avoided with parallel batches
The 4b and 4c batches write to the same folder. I dropped my planned questions that duplicated theirs: Roles Anywhere setup ordering (4b-ra-setup-order), GetSessionToken with MFA for the CLI (4c-mfa-allow-access-keys), sts:TagSession for SAML session tags (4b-saml-tagsession-trust). In their place: an ordering item for revoking an Identity Center user's access, a single on a custom console identity broker, and a multi on an OIDC issuer migration.

## Doubts and points to review
- `scsc03-4a-idc-external-idp-mfa`: the explanation for option b says MFA done at an external IdP is not passed to AWS as MFA context. The docs support this only indirectly (ConsoleLogin shows MFAUsed = No for federated users, and AssumeRoleWithSAML has no MFA support).
- `scsc03-4a-multi-oidc-new-issuer`: the docs do not show the exact InvalidIdentityToken message for a token whose issuer has no IAM OIDC provider. The question gives only the error code.
- `scsc03-4a-identity-pool-group-roles`: role resolution (Deny request) is tested only for a token with ambiguous roles, as the docs describe it.
- `scsc03-4a-presigned-post-limits`, option d: the docs say expiration is checked when the HTTP request starts (their example is a download). The explanation applies the same rule to uploads.
- Reference title of `sigv4-HTTPPOSTConstructPolicy.html`: the page did not return its H1 (it is rendered client-side), so the title "Creating a POST policy" is the known title and was not re-read.
- The Lambda page's H1 really is "Defining Lambda Event Function permissions with an execution role", and the reference uses it as is.
- New STS APIs seen in the docs (GetScopedCredentials, GetDelegatedAccessToken, GetWebIdentityToken) and the Cognito GetClientToken / ALLOW_CLIENT_TOKEN_AUTH flow are not tested and are not used as distractors.
