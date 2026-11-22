# Q-scs-c03-4b — report

51 questions in `content/scs-c03/questions/identity/` (prefix `scsc03-4b-`): 4.2.1 ×17, 4.2.2 ×17, 4.2.3 ×17.
Types: single 39, multi 8, ordering 2, dragdrop 2. Difficulty: 8 easy, 26 medium, 17 hard. Validator: 0 problem(s).

## Facts stated from general AWS knowledge, not on a fetched page (please double-check)

- `${cognito-identity.amazonaws.com:sub}` policy variable (scsc03-4b-dynamodb-leadingkeys); the fetched DynamoDB page shows only `${www.amazon.com:user_id}`-style variables.
- IAM role names cannot contain `/` (scsc03-4b-path-set-cli, option c).
- Amazon EC2 instances do not support resource-based policies (scsc03-4b-abac-ec2-project, option b).
- S3 Replication to another account's bucket needs a destination bucket policy for the source replication role (scsc03-4b-xacct-copy-resource-policy, option d).
- Secrets Manager replication targets other Regions, not other accounts (scsc03-4b-xacct-secret-cmk, option e).
- CloudFormation without a service role calls other services through forward access sessions (scsc03-4b-sourceip-viaawsservice).
- Verified Permissions API Gateway integration page could not be read (rate limit / empty page); questions rely on the what-is, identity sources, policy stores, templates and terminology pages, plus the Cedar reference for forbid-overrides-permit.

## Overlap notes

- Sibling batch 4c already had questions on role-ARN principals limited by boundaries, session-policy intersection, PassRole troubleshooting and cross-account CMK troubleshooting; this batch avoided those exact decisions (used NotPrincipal vs aws:PrincipalArn, session-ARN resource policies, Secrets Manager cross-account design instead).
