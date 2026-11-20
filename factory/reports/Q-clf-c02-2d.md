# Q-clf-c02-2d — QUESTIONS CLF-C02, domain security (2026-11-19)

36 questions in `content/clf-c02/questions/security/` (prefix `clfc02-2d-`), 6 per objective 2.4.1–2.4.6. Single 32, multi 4. Difficulty 14 easy / 17 medium / 5 hard. Single answer positions 8 a / 8 b / 8 c / 8 d. Validator: 0 problem(s).

## Sources and verification
- Every reference was fetched with WebFetch on 2026-11-19. Course chapters for 2.4 did not exist yet, so the questions were not compared with them.
- The WebFetch hourly limit was hit once at about 15:50 UTC. The vulnerability reporting page and six other pages (KMS, CloudHSM, S3 default encryption, ACM, Cognito, IAM) were fetched after the limit reset. Wording that those pages did not support was removed: CloudTrail logging of KMS keys, "dedicated" HSMs, and the claim that KMS is multi-tenant.

## Points to watch
- **Security Hub naming**: Learn now has both "AWS Security Hub" (correlation, exposure findings) and "AWS Security Hub CSPM" (standards such as FSBP, findings aggregation). The options say "AWS Security Hub", as the exam guide does, and the explanation of `security-hub-aggregate` names Security Hub CSPM.
- **Support plans**: the Trusted Advisor page lists all checks for Business Support+, Enterprise Support and Unified Operations, and selected security checks for Basic. The SRT page still says "Business Support plan or Enterprise Support plan" (old names), so no question depends on the SRT's plan requirement.
- **Trusted Advisor Basic checks**: the security checks page does not say which checks Basic customers get, so no question names them.
- "AWS Security Center" is taken to be the AWS Cloud Security site (aws.amazon.com/security), as the exam guide's example suggests. AWS Trust Center (aws.amazon.com/trust-center) is a separate page, and the two never appear together in one question.
- AWS Knowledge Center is now "re:Post Knowledge Center". The questions say "AWS Knowledge Center", as the exam guide does, and the explanation says it is part of re:Post.
- Some explanation details (Macie and Inspector are paid services; AWS Directory Service provides Microsoft AD) come from general knowledge and were not fetched. They are low risk.
