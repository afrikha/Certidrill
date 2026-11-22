# Q-scs-c03-4c — QUESTIONS SCS-C03, identity (4.2.4, 4.2.5) — 2026-11-22

34 questions, prefix `scsc03-4c-`: 4.2.4 = 17, 4.2.5 = 17. Types: single 27, multi 5, ordering 1, dragdrop 1. Difficulty: 5 easy / 17 medium / 12 hard. Validator: 0 problem(s). No SCS-C03 course chapter existed yet for 4.2.x; facts come from AWS documentation (WebFetch).

## Facts stated from general knowledge (not read verbatim on a fetched page) — check at review
- `aws-managed-key-xacct`: the key policy of an AWS managed key (aws/s3) cannot be edited (the fetched S3 page only says the requester must be in the key's account).
- `xacct-cmk-both-sides` (distractor d): S3 Bucket Keys still require KMS permissions for the requester.
- `decode-encoded-message` (distractor c): a local Base64 decode does not reveal the details (the STS page says the message is encoded because it can contain privileged information).
- `object-writer-ownership`: Bucket owner enforced makes the bucket owner own existing objects too (fetched 403 page covers ACL behaviour, not this sentence).
- `kms-analyzer-error-finding` (distractor a): service-linked role policies cannot be edited.
- `sqs-sns-confused-deputy` (distractors a, c): aws:PrincipalOrgID is absent for service-principal requests; SNS delivers as sns.amazonaws.com.
- `shared-vpce-no-trail-event`: relies on the IAM troubleshooting sentence that a missing CloudTrail denial with a VPC endpoint can mean the endpoint belongs to another account; the "endpoint policy of the owner account" reading is an inference.
- `identity-center-unused`: "roles from permission sets cannot be edited in IAM" comes from the IAM revoke-sessions page; permission-set boundaries are general knowledge.

## Overlap check
SAP-C03 already tests internal access analyzer scope, unused-access + policy generation for blast radius, CheckNoNewAccess / CheckAccessNotGranted / CheckNoPublicAccess in pipelines: these decisions were avoided here (custom policy checks not used).
