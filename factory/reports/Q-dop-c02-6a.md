# Q-dop-c02-6a — QUESTIONS DOP-C02, domain security (2026-11-23)

- 50 questions in `content/dop-c02/questions/security/dopc02-6a-*.yaml`: 6.1.1 ×7, 6.1.2 ×7, 6.1.3–6.1.8 ×6 each; single 42 / multi 8; difficulty 7 easy / 26 medium / 17 hard; English only.
- Checks: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-6a-` → 0 problem(s); `npm run content:validate -- --cert dop-c02 --prefix dopc02-6a-` → 0 problem(s), 0 warning(s).
- Correct option positions: a 9, b 11, c 11, d 11 (single); multi pairs vary.

## Deduplication with sibling batches
Read the existing stems (config 2b/2c, sdlc 1a/1b/1d, monitoring 4a/4c, security 6b/6c) before writing. Three of my first drafts tested the same decision as 6b/6c questions written in parallel, so I replaced them:
- SCP with `aws:RequestTag` Null condition + tag policy (same as `6b-classification-tag-enforcement`) → replaced by `scp-principal-element-condition`.
- Organization unused access analyzer (same as `6c-access-analyzer-unused-org`) → replaced by `org-last-accessed-scp`.
- Revoke active sessions (same as `6c-revoke-leaked-role-sessions`) → replaced by `get-session-token-mfa-cli`.
Avoided on purpose (already tested elsewhere): Identity Center + SAML/SCIM workforce, CLI SSO profiles, external ID, pipeline cross-account roles, SCP Region deny / intersection / protect role, RCP perimeter, declarative policy IMDSv2, RDS managed master password, confused deputy SourceArn/SourceAccount.

## Retired services
Only as distractor: CloudTrail Lake (closed to new customers May 31, 2026) in `policy-generation-from-trail` (stem states the company never used it).

## Facts newly verified on AWS pages (worth reusing)
- IAM rejects a GitHub OIDC trust policy without a `token.actions.githubusercontent.com:sub` condition, or with a sub that is only a wildcard (so "trust policy without sub" scenarios are no longer realistic).
- Identity Center: account instances support no permission sets (no AWS account access); delegated admin cannot alter permission sets provisioned in the management account; permission set session duration default 1 h, max 12 h; customer managed policies and customer managed boundaries must exist in each assigned account (same name, and same path for policies).
- Identity Center ABAC from SAML: attribute name `https://aws.amazon.com/SAML/Attributes/AccessControl:TagKey`; IAM SAML provider session tags use `.../PrincipalTag:TagKey`; trust policy needs `sts:TagSession`; only session tags can be transitive.
- Permissions boundaries: same-account resource policy naming an IAM **user** ARN is not limited by the boundary's implicit deny; naming a **role** ARN is limited; naming a role **session** ARN is not.
- SCP syntax page now says Condition is supported in Allow and Deny, NotResource supported; Principal/NotPrincipal unsupported; Allow statements still only `"Resource": "*"`. Quotas: 10 SCPs per target, 10,240 chars; RCP 5 per target (RCPFullAWSAccess counts).
- Access Analyzer policy generation: up to 90 days, `iam:PassRole` never included (not in CloudTrail), one generated policy at a time, viewable 7 days. Last accessed for OUs: from the management account, ≥ 400 days of service data.
- `aws:Ec2InstanceSourceVpc` + `aws:SourceVpc`; `aws:Ec2InstanceSourcePrivateIPv4` must not be used alone in Allow.
- Role chaining: DurationSeconds > 1 h fails.
- `RotationSchedule.HostedRotationLambda` requires `Transform: AWS::SecretsManager-2024-09-16`.

## Facts relied on but not shown on a fetched page (judged standard, left in)
- SDK default credential chain reads the shared credentials file before instance profile credentials (`ec2-keys-to-instance-profile`).
- Provisioning a permission set reports an error when the referenced customer managed policy is missing in an account (`permission-set-cmp-missing`; the page only says the policy must exist before assignment).
- AWS access portal session duration is a separate Identity Center setting (distractor in `permission-set-session-duration`).
- Gateway VPC endpoints exist only for S3 and DynamoDB (distractor in `rotation-function-vpc-network`).
- Parameter Store has no built-in rotation; parameter policies (Expiration) exist for advanced parameters (`third-party-key-rotation`).
- Config organization rules + aggregator for `access-keys-rotated` (the rule page itself was fetched).
- GetFederationToken takes no MFA device/code (distractor in `get-session-token-mfa-cli`).
- Policy variable `${aws:Ec2InstanceSourceVpc}` used in a Deny with `aws:SourceVpc` (the condition-keys page describes the pairing, not the exact statement).

## Doubt
- The IAM page "Secure API access with MFA" says AssumeRole credentials "do not include MFA information in the context" (in its cross-account resource-policy example), while the CLI page and condition-keys page describe MFA-protected AssumeRole. No question depends on MFA context inside an assumed-role session.
