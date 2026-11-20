# Task F-lambda-timeout — role FIX, AWS banks (saa-c03, clf-c02, dva-c03, aif-c01)

Read `factory/BRIEF.md` and `factory/BRIEF-AWS.md`.

Fact (fetched 2026-11-20): the Lambda quotas page https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html says the maximum function timeout is **1,800 seconds (30 minutes)**, and 5,400 seconds (90 minutes) for Lambda Managed Instances functions invoked asynchronously or through most event source mappings. The API reference and the FAQ still say 900 seconds (15 minutes). Until AWS is consistent, **no question may depend on 15 vs 30 minutes**.

1. Find every question and course chapter in `content/{saa-c03,clf-c02,dva-c03,aif-c01}/` that states a Lambda maximum duration (grep `15 minutes`, `15-minute`, `900 seconds`, `900 s`, `15 min`, `quinze minutes`, `900 secondes`, together with Lambda). Ignore unrelated 15-minute values (SQS delay, S3 RTC, STS, sessions…).
2. Questions: if the right answer depends on a job lasting **less than 2 hours** (e.g. 25–40 minutes), rewrite the scenario so the job lasts at least 2 hours (EN and FR), keeping the same answer. In explanations, replace the number by a statement that stays true either way, e.g. "far longer than the maximum timeout of a Lambda function (minutes, not hours)" / « bien plus long que la durée maximale d'une fonction Lambda (des minutes, pas des heures) ». Keep EN and FR aligned.
3. Course chapters: where a maximum is given, write "30 minutes on the current Lambda quotas page (older pages and the FAQ still say 15 minutes; 90 minutes for some Lambda Managed Instances invocations)" in both languages, same structure. Exam trap callouts must not rely on the exact value.
4. Run `CERT=<cert> npx tsx factory/validate.ts --prefix <prefix>` for each cert touched and `npx tsx factory/check-cert.ts <cert>`: 0 problems.
5. Report `factory/reports/F-lambda-timeout.md`: files changed, one line each.
