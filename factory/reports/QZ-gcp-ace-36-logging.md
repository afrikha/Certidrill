# QZ-gcp-ace-36-logging — report

File: `content/gcp-ace/quizzes/36-logging.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-ace 36-logging` → 0 problem(s), 0 warning(s).

Coverage: 3.4.3 (q1, q6), 3.4.4 (q5, q7), 3.4.5 (q2, q8), 3.4.6 (q3, q9), 3.4.7 (q4, q10). Multi at q8 and q10. The 19 mock-exam questions of 3.4.3–3.4.7 were read and their decisions avoided.

## Chapter gaps (current docs, checked 2026-11-27)

- **Query operator precedence** is missing from section view-filter. The "Logging query language" page says `NOT` binds tightest, then `OR`, then `AND`, so `OR` binds tighter than `AND`. The chapter only says "Uppercase only; `AND` is implicit between lines", yet the mock question `gcpace-3d-query-or-precedence` tests precedence. Suggest adding one line. The same page also says lowercase `and`/`or`/`not` are parsed as search terms; quiz q9 uses that, and it follows from the chapter's "Uppercase only".
- **Log view filters**: the chapter mentions log views and Logs View Accessor but not the `source("projects/…")` function that a view filter uses. The docs write it in lowercase. Quiz q8 shows it in a command; suggest adding a `gcloud logging views create … --log-filter='source("projects/P")'` example to section buckets-routing.
- Checked and still correct: the writer identity needs Logs Writer for every destination plus the destination role ("Route logs to supported destinations"). `_Required` keeps logs 400 days, can't be changed and isn't charged (pricing page). `_Default` and user buckets keep 30 days by default, configurable from 1 to 3,650 days. Retention beyond 30 days costs $0.01 per GiB per month.

## Doubts and facts I could not fully verify

- q5: the pricing page confirms that log retention beyond 30 days costs $0.01 per GiB per month, and the storage classes page says Archive is the lowest-cost class. I didn't fetch BigQuery storage prices, so the explanation compares BigQuery with Archive only in qualitative terms.
- q7: the "Pub/Sub to Splunk template" page doesn't state a launch stage. The template is long-established and Google-provided, and I treated it as GA.
