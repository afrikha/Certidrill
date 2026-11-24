# QZ-az-400-32-testing-strategy — notes

`content/az-400/quizzes/32-testing-strategy.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.2.1 (q3, q6, q7), 3.2.2 (q1, q2, q8), 3.2.3 (q5, q10), 3.2.4 (q4, q9). Positions 6–10: yesno, multi, single, multi, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Test taxonomy is wrong.** The chapter says "L0 and L1 are unit tests with no deployment, L2 are functional tests against a lightweight deployment, L3 run against production". "Shift testing left with unit tests" defines five levels: L0/L1 unit tests (assembly only), **L2 functional tests that need the assembly plus dependencies such as SQL or the file system (no deployment)**, **L3 functional tests against a testable service deployment**, **L4 restricted integration tests against production**. The mock question `az400-3a-test-levels` follows Learn (L2 for SQL without deployment), so the chapter contradicts it. The quiz avoids the levels.
- **Check timeouts**: the chapter says only that an approval timeout skips the stage while Business hours / Azure Monitor alerts fail it. "Define approvals and checks" says that **Invoke Azure Function and Invoke REST API timeouts also skip the stage (and the stages that depend on it)**. Worth adding.
- **Required template**: Learn's section now says the check is configured on a **service connection**. The chapter (and its Exam trap) say "on the environment or service connection". I didn't verify whether environments still offer it; q7 doesn't depend on it.
- **Diff coverage formats**: the Learn page (now titled **"Review and configure code coverage results in Azure Pipelines"**, the old title "Code coverage for pull requests" used by the mock questions is gone) says PublishCodeCoverageResults@2 supports Cobertura/JaCoCo for diff coverage comments, while its FAQ still says that only the `.coverage` format validates coverage for pull requests. The page doesn't reconcile them. The chapter and the mock question `az400-3b-cov-pr-format` follow the FAQ. That question's answer may be fragile.
- Same page: known issues that leave the policy stuck (PublishCodeCoverageResults v1, more than 100 files in the PR, several coverage policies, policy name not matching the pipeline name). In multi-stage pipelines, results appear only after the whole run. Not in the chapter.
- PublishCodeCoverageResults@2 requires `UseDotNet@2` before it (Learn requirement). Not in the chapter.
- Service containers: Learn says the **hosted macOS pool doesn't support containers**. Chapter 33 says container jobs run "on any agent", which is too broad. q8 uses this trap; the chapter should mention it.
- Flaky test management is Azure DevOps Services only. Its system detection relies on VSTest reruns. Turning off "include flaky tests in test summary" stops flaky failures from failing the pipeline (VSTest and Publish Test Results only). The chapter just names "flaky test detection".
- `actions/upload-artifact`: the chapter says `@v7`, while the mock question `az400-3b-test-gh-artifact` uses `@v4`. Not verified (docs.github.com isn't an allowed reference host), so q9 doesn't name a version.

## Not verified on a fetched page

- That a run whose load test gets the failed status also fails the pipeline task. The fail criteria pages describe only the test status. q2 says "the release must stop", which follows the chapter.
- q9: the GitHub "Restrict code coverage" ruleset rule (public preview, per the chapter) is not an option. No Learn page documents GitHub custom deployment protection rules or admin bypass, so I didn't test them.

## Design notes

- Decisions not in the mock bank: test pyramid share, `failureCriteria` vs `autoStop`, GitHub deployment branch restriction, coverage collector per stack (JaCoCo, VSTest `codeCoverageEnabled`, Jest), flaky test system detection, approval timeout (skipped) vs business hours timeout (failed), Evaluate artifact + Invoke REST API, service containers on macOS vs Ubuntu, coverage gate in GitHub (fail step + required status check), VSTest@3 filter, batching and rerun type.
- References use the H1 titles, as the bank does.
