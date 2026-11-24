# QZ-dp-700-14-orchestration

File: `content/dp-700/quizzes/14-orchestration.yaml` (10 questions, `dp700-qz-14-01`..`10`). Check: 0 problem(s), 0 warning(s).

Formats: 1–5 single (d1, d1, d2, d2, d2); 6 single, 7 yesno_statements, 8 single, 9 multi, 10 dropdown (all d3). Objectives: 1.4.1 (q1, q6), 1.4.2 (q2, q4, q7), 1.4.3 (q3, q5, q8, q9, q10). Preview features (interval-based schedules, run conditions) are never a correct answer.

## Chapter vs current Learn (not edited)

- **`@pipeline().DataFactory`**: the chapter's table says "(workspace name)". *Expressions and functions for Data Factory in Microsoft Fabric* says it returns the **workspace ID** (and `@pipeline().Pipeline` the pipeline ID; `@pipeline().PipelineName` the name). Fix in both languages.
- **20 schedules per pipeline**: *Run, schedule, or use events to trigger a pipeline* states the limit inside the interval-based (preview) schedule section; unclear whether it applies to regular schedules. The *Job Scheduler* page only says "multiple schedules". q4 mentions 20 only in a distractor explanation.
- **Weekly recurrence**: Job Scheduler says "selected weekdays, up to 10 times per week" — ambiguous (per week vs per day); not tested.
- Not in the chapter, possibly useful: in `runMultiple`, an activity can read another's exit value with `"@activity('Extract').exitValue()"` in `args`; `runMultiple` can raise `RunMultipleFailedException` (partial results in `.result`); Lookup timeout max 24 hours.

## Doubts / unverified

- q9 option c (base parameter name differing from the notebook variable) is reasoned from the parameter-cell mechanism (only variables of the parameter cell are overridden, Python names case-sensitive); Learn doesn't describe the mismatch explicitly.
- q2 distractor `@triggerBody().fileName` is Azure Data Factory storage-trigger syntax, from memory (not fetched); q6 distractor relies on the Office 365 Outlook activity existing in Fabric pipelines (not fetched).
- Activity timeout/retry defaults (12 h, 7 days, 30 s) and the 120-activity limit in the chapter weren't re-verified (not used in the quiz).
