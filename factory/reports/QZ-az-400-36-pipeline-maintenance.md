# QZ-az-400-36-pipeline-maintenance — end-of-chapter quiz, AZ-400, chapter 36

File: `content/az-400/quizzes/36-pipeline-maintenance.yaml` (10 questions, draft). Check: `npx tsx factory/check-quiz.ts az-400 36-pipeline-maintenance` → 0 problem(s), 0 warning(s).

Positions: 1 single 3.6.4 (d1) · 2 single 3.6.5 (d1) · 3 single 3.6.2 (d2) · 4 single 3.6.3 (d2) · 5 single 3.6.1 (d2) · 6 multi 3.6.4 · 7 dropdown (YAML) 3.6.2 · 8 dropdown (text, numbers) 3.6.3 · 9 multi (choose 3) 3.6.5 · 10 yesno 3.6.1 (d3).
The 42 mock-exam questions of 3.6.x were read first; the quiz avoids their decisions (new ones: where run retention is set, release pipelines have no export, `[skip ci]`, hosted vs self-hosted parallel job type, rerun-failed-jobs detection, artifact vs run day settings, `dependsOn: []` + `parallel` slicing + versioned image label, cross-project parallel job arithmetic, single-pipeline release migration with Query Azure Monitor Alerts check, branch scope of flakiness).

## Chapter out of date or incomplete against current docs (fetched 2026-11-24)

- **GitHub `concurrency`** (section pipeline-concurrency): the comment `cancel-in-progress: false # queue deployments instead of cancelling them` is misleading. docs.github.com (control-workflow-concurrency) says that by default only one run can be pending per group and a newer run cancels the existing pending one; a new `queue: max` option keeps up to 100 pending runs (FIFO, not combinable with `cancel-in-progress: true`). The chapter should say this. No quiz question uses GitHub concurrency (no Learn page covers it, so no valid reference).
- **Retention** (Learn "Retention Policies"): only succeeded and partially succeeded runs are kept by the "recent runs" rule; test-run retention is a separate setting (Project settings > Test > Retention). Not in the chapter.
- **Parallel jobs** (Learn "Configure and pay for parallel jobs"): releases deploying to a deployment group don't consume a parallel job. Not in the chapter.
- **Classic release export** (Learn "Migrate your Classic pipeline to YAML"): the page says classic releases have no YAML export and "you'll need to export each task individually" (per-task View YAML). Chapter says "rewrite them by hand" — compatible, but could mention per-task YAML.
- **Hosted images** (Learn "Microsoft-hosted agents"): the page is self-contradictory on `windows-latest` (says it points to windows-2025-vs2026 and that it will move "in the coming weeks"). Q7 avoids depending on the current target of windows-latest.

## Doubts / not explicitly stated on a fetched page

- Q6 option a: that the run and its logs survive while artifacts are deleted after "Days to keep artifacts, symbols and attachments" is inferred from the separate settings; the page doesn't spell out "logs stay". Option e is worded to be false whether or not the UI allows artifact days > run days.
- Q10 s3: relies on reasoning — the flaky exclusion only updates the Test Summary of the Visual Studio Test and Publish Test Results tasks (page: other scenarios may need a custom script); a `dotnet test` script step still fails on its exit code.
- Q10 s2: "flaky for that branch" (page: data available for all pipelines for that branch); not flagged on another branch is the natural reading, not an explicit sentence.

No mock-exam question found wrong against the fetched pages.
