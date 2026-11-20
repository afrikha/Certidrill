# Q-soa-c03-4a — report

55 questions in `content/soa-c03/questions/security/` (prefix `soac03-4a-`), 11 per objective 4.1.1–4.1.5; single 46 / multi 9 (one "Choose three."); difficulty 17 / 27 / 11. Validator: 0 problem(s).

## Facts used without a dedicated fetched sentence (general knowledge, low risk)
- `aws:MultiFactorAuthAge` is in seconds and absent without MFA (soac03-4a-mfa-age-terminate). The fetched condition-keys page part did not show its section.
- Organization conformance pack detailed statuses `CREATE_FAILED` / `CREATE_SUCCESSFUL` (soac03-4a-cpack-no-recorder).
- IAM policies are not shareable through AWS RAM; IAM roles not shareable through RAM (distractor explanations).
- AWS managed-key-encrypted EBS snapshots cannot be shared with another account (soac03-4a-ta-ebs-public, distractor).

## Choices / deviations
- Dropped a planned `aws:SourceIp` + `aws:ViaAWSService` question: the IAM page now says forward access sessions preserve the caller IP, so the classic trap is obsolete.
- CloudTrail Lake closed to new customers since May 31, 2026: never used as an answer or distractor; Athena / Event history used instead.
- Trusted Advisor: Developer and Business Support plans are discontinued January 1, 2027; stems that need full checks or EventBridge state "Business Support+" or "Enterprise Support". Exposed Access Keys and ELB Listener Security are not in the Basic/Developer check list.
- EventBridge Trusted Advisor rule: the exact `detail-type` string was not verified, so the stem describes "check refresh events with the ERROR status" without quoting it.
- Avoided duplicating SAA-C03 decisions (BoolIfExists MFA deny, conformance pack for org, SCP Region restriction as plain answer) by testing different decisions (Region deny control vs SCP, NotAction for global services, org packs are Regional, recorder prerequisite).
