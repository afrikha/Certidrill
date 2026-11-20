# Q-clf-c02-2c — QUESTIONS CLF-C02, domain security (2026-11-19)

## Output
- 57 questions in `content/clf-c02/questions/security/`, prefix `clfc02-2c-`: 2.3.2 to 2.3.4 have 7 each, 2.3.5 to 2.3.10 have 6 each.
- Types: single 50, multi 7. Six multis are "Choose two" with 5 options. One is "Choose three" with 6 options (`clfc02-2c-mfa-device-types`). Every multi ends with the scoring NOTE, as in the SAA-C03 bank.
- Difficulty: 23 easy, 26 medium, 8 hard (40 / 46 / 14 %).
- Correct single answers: a 12, b 13, c 13, d 12. A script checked option lengths, and options where the correct answer was clearly the longest were rebalanced.
- `CERT=clf-c02 npx tsx factory/validate.ts --prefix clfc02-2c-` gives 57 files and 0 problems.

## Sources
- The 16 AWS pages fetched are listed below, and each one is used as a reference:
  - IAM: id_root-user, root-user-best-practices, best-practices, id_credentials_access-keys, id_credentials_passwords_account-policy, id_credentials_mfa, access_policies_managed-vs-inline, id_groups, id_roles_providers, tutorial_cross-account-with-roles.
  - IAM Identity Center: what-is, permissionsetsconcept, manage-your-identity-source.
  - Secrets Manager: intro.
  - Systems Manager: Parameter Store.
  - root-user-tasks.html was also fetched, but it returned the "AWS account root user" content, so it is not used as a reference.
- The WebFetch hourly limit was reached after these 16 pages. The Amazon Cognito developer guide and the root user MFA page could not be fetched. The Cognito facts used (user pools for sign-up and sign-in, identity pools for temporary IAM credentials, social identity providers) come from the fetched IAM federation page.
- No course chapters for 2.3.x existed when this batch was written, so consistency with the course could not be checked.

## Points worth a reviewer's look (general AWS knowledge, not stated on a fetched page)
- AWS managed policy names used in options: `AmazonS3FullAccess`, and the `Billing` job function policy in `root-task-billing-iam`. `AdministratorAccess` and `PowerUserAccess` were verified.
- Some explanations say that IAM policies cannot be attached to the root user and that the root user cannot join a group: `root-enable-mfa`, `root-delete-keys`, `root-two-person`.
- `root-tasks-multi` writes "enable MFA delete". The fetched list says "Configure an Amazon S3 bucket to enable MFA (multi-factor authentication)".
- `root-usage-alert`: the root best-practices page lists the EventBridge + SNS notification. Whether a CloudTrail trail is a prerequisite is not stated, so the question does not mention one.
- `root-task-deny-all` and `root-task-billing-iam` say that AWS Support does not make these changes for the customer. The page only says that these are root tasks.
- `fed-oidc-workload` (GitHub Actions + OIDC) is hard for CLF-C02. It relies on the IAM federation page, which names GitHub Actions as an OIDC use case.
- Overlap with Q-clf-c02-2b (2.3.1, IAM in general) was not checked, because no `clfc02-2b-` files existed yet.
