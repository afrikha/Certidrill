# K-az-400-sr1 — report

6 Yes/No series, 18 `series_yesno` questions, prefix `az400-sr1`. Validator: 0 problem(s).

| Series | Objective | Domain | Answers (1/2/3) | Difficulty |
| --- | --- | --- | --- | --- |
| az400-sr1-failed-run-hook | 1.3.4 | processes | N Y N | 2 1 3 |
| az400-sr1-restore-branch | 2.2.5 | source-control | N N Y | 2 3 2 |
| az400-sr1-prod-approval | 3.3.9 | pipelines | Y N N | 1 2 2 |
| az400-sr1-ci-paths | 3.3.4 | pipelines | N N Y | 1 3 2 |
| az400-sr1-kv-secrets | 4.2.1 | security | Y N N | 1 2 1 |
| az400-sr1-checkout-funnel | 5.2.2 | instrumentation | N Y N | 2 1 2 |

Mix: 6 easy / 9 medium / 3 hard. Six series over five domains, so pipelines has two (different objectives).

## Deviations

- First drafts on 1.3.5 (Boards AB#), 2.2.6 (purge secret), 4.2.2 (OIDC subject), 5.2.4 (KQL top failures) and 5.2.3 (end-to-end transaction) were deleted and replaced because the parallel series az400-sr2-* and case studies az400-cs* already test the same decisions (sr2-boards-github, sr2-kql-failures, cs2a-purge-password, cs3a-oidc-workflow, cs4b-trace-latency).
- 3.3.9 is also used by case questions cs2c-prod-checks (Branch control + Azure Monitor alerts checks) and cs3c-prod-stage (deployment job YAML); this series tests a different decision (Approvals check vs ManualValidation task vs branch policy).

## Doubts

- ManualValidation@1: Learn documents the `[org name]\group` syntax for `notifyUsers` only; the question uses `[Retail]\Release Approvers` (project-scoped group). The answer (No) does not depend on it.
- Service hook UI labels for the Run state changed filters (pipeline, state, result) are written from the event reference (`pipelineId`, `runStateId` Completed, `runResultId` Failed), not from a screenshot of the portal.
- User Retention Analysis workbook: the solution says only "filter it on the events"; the exact workbook parameter names were not verified.
- No az-400 course chapters existed when writing; all facts come from Microsoft Learn pages cited in the references.
