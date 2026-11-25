# QZ-az-400-12-metrics-queries — report

Quiz: `content/az-400/quizzes/12-metrics-queries.yaml` (10 questions). `npx tsx factory/check-quiz.ts az-400 12-metrics-queries`: 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (q9, q10), 1.2.2 (q2, q5), 1.2.3 (q4), 1.2.4 (q1, q8), 1.2.5 (q7), 1.2.6 (q3), 1.2.7 (q6). Positions 6–10: dropdown (KQL), yesno_statements, single, multi, dropdown (OData).

Mock-exam questions of 1.2.1–1.2.7 were read first (flow metric definitions, Lead Time period/criteria, Cycle Time widget, CFD statements, WIQL tree, burndown prerequisites, forecast, query chart ordering, PR widget, pass rate filters, dev widgets, report sections, flaky statements/config, test widgets hot area, Test failures report, Defender console, security overview tabs/default branch/alert filters, duration report, delivery metrics match, OData pipeline outcome/PipelineId, KQL failure rate/p95, release annotations, work item template roles). The quiz tests other decisions: Chart for Test Plans, multi-team Burndown, environment deployment history, Automatically included reviewers, WIQL `ASOF`, `AppDependencies` + `top`, Coverage/export/disabled repos, flaky exclusion supported tasks, Cycle Time widget swimlane + bugs on backlog, OData `CycleTimeDays` groupby.

## Facts checked on Learn (pages fetched)

widget-catalog (Burndown/Burnup span teams; Velocity single team; Chart for Test Plans), environments (deployment history across pipelines, Changes/Work items tabs), branch-policies (Automatically included reviewers with path filter), wiql-syntax (`ASOF`, midnight when no time), AppDependencies table columns, top operator (default `desc`; `sort by x | take n` is equivalent, so `sort … asc | take 5` used only as a distractor), github-advanced-security-security-overview (coverage lights up after any successful scan on any branch, recency ignored, disabled/deleted repos excluded, Alerts export first 1,000), flaky-test-management (summary updated only for Visual Studio Test and Publish Test Results; switching detection erases history; manual marks apply to future runs), cycle-time-and-lead-time (swimlane requires a backlog level, only backlog WITs selectable), show-bugs-on-backlog, sample-boards-leadcycletime and aggregated-data-analytics (OData fields and `$apply` syntax).

## Doubts / unverified

- q10 uses `groupby((Area/AreaPath), aggregate(CycleTimeDays with average as AvgDays))`. The aggregation page shows `groupby` and `aggregate … with sum`, but no example with `average` or with a navigation property in `groupby`; both are standard OData aggregation and `average` is listed as a supported type. The endpoint version `v3.0-preview` is the one of the Learn lead/cycle time sample (the version isn't part of the answer).
- q8: "publish Jest results in JUnit format with Publish Test Results" assumes the usual JUnit reporter for Jest; not on Learn but not decisive (the decision is the supported task).
- Security overview page: "Organization-level rollup metrics on the Risk tab / Coverage tab are currently in private preview". q7 tests per-repository coverage and the Alerts export only, not the rollup metrics.

## Chapter issues against current Learn (chapter not edited)

- **DORA metrics**: no Microsoft Learn page defining the four DORA metrics was found (searches on learn.microsoft.com; "What is DevOps?" mentions only mean time to recovery; the AZ-400 training unit "Design and Implement Metrics and Queries" lists release deployment frequency, deployment success rate and deployment lead time, not change failure rate). The chapter's DORA paragraph and the "change failure rate" row of the delivery table are not backed by a Learn reference; the quiz doesn't test them.
- **Security overview**: the chapter presents Risk and Coverage as plain features; Learn now says their organization-level rollup metrics are in private preview. The chapter's exam trap "coverage turns on only after a scan result has been submitted" is right, but Learn adds that a scan on **any** branch lights up coverage and that recency isn't considered — worth adding next to "Risk counts only the default branch".
- **OData versions**: the chapter's table (latest supported `v2.0`, preview `v4.0-preview`) matches odata-api-version; the chapter's sample uses `v4.0-preview` while the Learn samples still use `v3.0-preview` (fine, both preview).
- **Flaky tests**: the chapter says excluding flaky tests means "a flaky failure no longer fails the run"; Learn says you can choose not to include them in the test summary "and suppress the test failure", without detailing the pipeline outcome. Close enough, slightly stronger than Learn.
