# FIX-az-400-2 — chapters 32 to 36 and 41 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. GitHub-only behavior (concurrency, upload-artifact version) was checked on docs.github.com and github.com, because no Learn page covers it. Results: `check-cert az-400 32-testing-strategy 33-pipelines 34-deployments 35-infrastructure-as-code 36-pipeline-maintenance 41-authentication-authorization` 0 problems. `content:validate --cert az-400` 0 problems, 16 warnings. Seven of those warnings are on bank questions of my objectives, and all seven were there before this pass (see "For a human decision"). `check-quiz az-400` (6 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. One code block changed, a comment in chapter 36, in both languages.

## 32-testing-strategy

| Finding | Learn | Change |
| --- | --- | --- |
| Test taxonomy L0-L3 wrong | Confirmed (Shift testing left with unit tests): L0/L1 unit tests (assembly only); L2 functional tests that may need SQL or the file system; L3 against a testable service deployment; L4 a restricted class of integration tests against production | testing-strategy: taxonomy sentence rewritten. It now agrees with `az400-3a-test-levels` |
| Check timeouts | Confirmed (Define approvals and checks): Invoke Azure Function and Invoke REST API timeouts skip the stage and the stages that depend on it; Business hours and Azure Monitor alerts fail it | quality-release-gates: timeout sentence |
| Required template check on a service connection | Learn (approvals, Templates for security) documents the check only on a service connection. It never says that environments can't have it | Exam trap now says "on the service connection that the deployment uses". Environment support not confirmed: see below |
| Diff coverage formats | Learn contradicts itself. The body calls Cobertura/JaCoCo the "enhanced experience". The FAQ says only `.coverage` validates PR coverage. Page renamed "Review and configure code coverage results in Azure Pipelines" | Chapter now says "Learn's FAQ". Not decided further: see below |
| Known issues, multi-stage | Confirmed: policy stuck with PublishCodeCoverage v1, more than 100 files in the PR, several coverage policies, or a branch policy name that doesn't match the pipeline name; in multi-stage pipelines, results only after the whole run | code-coverage: new sentence (the first three issues and the multi-stage note) |
| `UseDotNet@2` before PublishCodeCoverageResults@2 | Confirmed (task reference: "Prerequisite", Use .NET Core task) | code-coverage: new sentence (code block unchanged) |
| Flaky tests | Confirmed (Manage flaky tests): Azure DevOps Services only; system detection by VSTest rerun or Rerun failed jobs; tracked per branch; the exclusion option works only for the VSTest and Publish Test Results tasks | tests-in-pipeline: one sentence replaces "flaky test detection" |
| Container jobs on macOS | Confirmed: see 33 | Fixed in 33 |
| `upload-artifact@v7` vs bank `@v4` | github.com/actions/upload-artifact: v7 is the current major and v4 isn't deprecated | None |

## 33-pipelines

| Finding | Learn | Change |
| --- | --- | --- |
| Free Microsoft-hosted grant not additive | Confirmed (concurrent-jobs): "The first purchase only removes the time limits on the first job" | Parallel jobs table, paid Microsoft-hosted row; Key points |
| Deployment groups, active consumption | Confirmed: approvals and manual interventions, server jobs and releases that deploy to a deployment group don't consume parallel jobs; a run consumes one only while it runs on an agent | "Not consuming" row |
| Self-hosted grant additive | concurrent-jobs only says "at least one". Managed DevOps Pools pricing confirms it: 5 concurrent jobs need "four additional" purchases | Free self-hosted row. `az400-3b-agent-mdp-jobs` (1 + 7 = 8) confirmed |
| Container jobs "on any agent" | Confirmed (Container jobs in YAML pipelines, Service containers): Windows or Ubuntu agents only, macOS doesn't support containers | complex-scenarios row |
| `timeoutInMinutes: 0` | Confirmed (Specify jobs): forever on self-hosted agents, 360 min on Microsoft-hosted agents for a public project, 60 min for a private project unless extra capacity is paid for | execution-order table row |
| Environment roles, missing environment | Confirmed (environments): Creator, User and Administrator (not Reader) manage approvals and checks; only the creator gets Administrator; a manual or CI run that references a nonexistent environment fails; an environment is created automatically only by the creation wizard or the web editor | environments-checks: two sentences |
| Classic release export, schedule time zone | Confirmed (Migrate your Classic pipeline to YAML): only classic builds export to YAML; release tasks are exported one by one; YAML schedules are in UTC, classic schedules in the organization's time zone | automation-solution: new paragraph |
| `windows-latest` (Windows Server 2025) | The hosted-agents table maps `windows-latest` to `windows-2025-vs2026`, but a note on the same page says that change comes "in the coming weeks" | None (the chapter doesn't name the VS version) |

## 34-deployments

| Finding | Learn | Change |
| --- | --- | --- |
| FR « permutation » | Glossary (confirmed on fr-fr Learn): « échange », « échange avec aperçu », « échange automatique » | Every FR occurrence in the chapter. The portal buttons are now in English (**Complete Swap**, **Cancel Swap**), following the guide's rule for portal labels |
| Slot counts 5 / 20 / 20 | Confirmed (App Service limits, "Staging slots per app": Standard 5, Premium 20, Isolated 20) | None |
| `UseFeatureFlags()` without `Select` loads only flags with no label | Confirmed (.NET configuration provider); default refresh 30 s with `SetRefreshInterval` | feature-flags: one sentence |
| Key-value `Select` label doesn't apply to flags | The page implies it (flags are loaded separately) but doesn't say so | Not stated |
| Container Apps action version | Not in the chapter | None |

## 35-infrastructure-as-code

| Finding | Learn | Change |
| --- | --- | --- |
| Complete mode deprecation | Confirmed (deployment modes): "not recommended", "will be gradually deprecated", use deployment stacks. fr-fr: « progressivement déconseillé », « Le mode Complet n'est pas recommandé » | desired-state table row |
| Project members get Contributor by default | Confirmed by the ADE overview ("Project members get contributor access to those resources by default"). The project-environment-types page gives no default | None |
| ADE retirement 22 Feb 2027 | Confirmed (overview) | None (already in the chapter) |

## 36-pipeline-maintenance

| Finding | Source | Change |
| --- | --- | --- |
| GitHub `concurrency` comment "queue deployments" misleading | docs.github.com (control workflow concurrency): one pending run per group, a newer run cancels the pending one; `queue: max` keeps up to 100 pending runs and can't be combined with `cancel-in-progress: true` | Table row; code comment (EN and FR blocks, identical); new paragraph |
| Retention: recent runs, test retention | Confirmed (Retention policies): only succeeded and partially succeeded runs are kept; test retention is under Test > Retention | retention-strategy: one sentence each |
| Deployment groups don't consume parallel jobs | Confirmed (concurrent-jobs) | pipeline-concurrency sentence |
| Classic release: export each task | Confirmed ("export each task individually") | migrate section sentence |

## 41-authentication-authorization

| Finding | Learn | Change |
| --- | --- | --- |
| Azure DevOps issuer retirement | Confirmed (Connect to Azure with an ARM service connection; Convert WIF service connections…): `https://vstoken.dev.azure.com` retires July 1, 2027; new connections use the Microsoft Entra issuer; convert with **Update** | service-connections: new sentence |
| Visual Studio subscribers | Confirmed (access levels): Enterprise → VS Enterprise; Test Professional and MSDN Platforms → Basic + Test Plans; Professional → Basic; assign Visual Studio Subscriber to avoid the Basic charge before the first sign-in | Access level table row |
| Scope levels for a manual service principal | Confirmed: Subscription or Management Group only (automatic and managed identity also offer Machine Learning Workspace) | Scope sentence |
| Global PATs "being retired" | Confirmed (Use personal access tokens), but Learn gives two dates: existing global PATs stop working January 27, 2027 (Important callout) or December 1, 2026 (best practices) | None (no date added). See below |
| FR « faire confiance aux jetons » | Guide: « approuver » | FR only |

## Mock-exam bank questions changed

- `az400-3c-gh-concurrency` (3.3.6), EN + FR explanation: "newer runs wait as pending" became "a newer run waits as pending and, by default, replaces a run that was already pending" (docs.github.com). The answer doesn't change.
- `az400-3b-cov-pr-format`, `az400-3b-cov-diff-yesno`, `az400-3b-cov-gate-order`, `az400-3b-cov-settings-file` (3.2.4): the reference title changed from "Code coverage for pull requests" to the page's current H1, "Review and configure code coverage results in Azure Pipelines" (same URL).

Checked and left unchanged: `az400-3a-test-levels` (matches Learn); the gate questions (`3a-gate-*`, `3c-check-order`, `cs1b-prod-checks`, `cs2c-prod-checks`: Required template is on a service connection or is a distractor); parallel jobs (`3b-agent-mdp-jobs`, `3f-mdp-parallel-jobs`, `3f-hosted-parallel-count`, `3f-parallel-consumption`, `3b-agent-limits`, `3c-long-test-job`); the container questions (`3c-container-job`, `3c-hybrid-onprem`: no macOS); classic export (`3f-migration-order`, `3f-deployment-group-migration`); feature flags (`3d-flag-env-labels`, `3d-flag-startup-code`); the Complete mode questions in 3.5.x (none has Complete as the answer); access levels (`4a-access-levels-dd`, `4a-access-license-cli`, `cs1b/cs2a/cs3b-*-access`); `3b-cov-publish-yaml` (hosted agent, no `UseDotNet@2` needed for the answer); `3b-test-gh-artifact` (`@v4` still valid).

## Quiz files

None changed. check-quiz reports 0/0, and no quiz answer depends on a changed sentence (quiz 32 already treats an approval timeout as skipped and Business hours as failed).

## For a human decision

- **docs.github.com references (7 warnings, pre-existing).** `content:validate` flags `az400-3c-gh-concurrency`, `-gh-env-secrets`, `-gh-job-outputs`, `-gh-needs-matrix`, `-gh-reusable-call`, `-gh-runner-group` and `-gh-team-reviewers` because they cite docs.github.com. No Learn page covers these GitHub facts. For example, the Learn unit "Control deployments with GitHub environments" doesn't cover plan limits or the `vars` context. Options: allow docs.github.com for GitHub-only facts in AZ-400, or accept the warnings. Not changed. (The other 9 warnings are on 5.x questions, which belong to other chapters.)
- **References that don't cover the point.** `az400-4a-gh-token-permissions`, `-gh-trigger-ci-token`, `-gh-token-facts`, `-gh-pat-pending` and `cs2b-manifest-token` (4.1.2) cite "Identify supported Access Tokens". That unit covers GitHub App installation tokens and PATs, not GITHUB_TOKEN. No Learn page found for GITHUB_TOKEN.
- **Diff coverage format** (`az400-3b-cov-pr-format`, chapter 32). The answer relies on the FAQ (only `.coverage` validates PR coverage), while the body suggests Cobertura gets the enhanced experience. If Microsoft fixes the FAQ, the answer becomes wrong.
- **Required template on environments.** Learn documents the check only on service connections. Do environments still offer it? Not confirmed. The chapter's table still lists environments among the protected resources (true for checks in general).
- **Global PAT end date.** Learn gives both December 1, 2026 and January 27, 2027.
- **`az400-cs4a-service-connection`** (4.1.3) reference title "Use an Azure Resource Manager service connection". The page now loads with the H1 "Connect to Azure with an Azure Resource Manager service connection". Not changed, because the title was read through a summary.
- **Azure Deployment Environments** retires February 22, 2027. Questions on 3.5.5 still use it as the answer (it's in the study guide). Revisit after that date.
- **FR « permutation » in the bank.** 16 question files of 3.3.9, 3.4.1, 3.4.3, 3.4.5, 3.4.7 and 3.4.8 (`3d-*`, `3e-db-expand-contract`, `cs3c-*`, `cs4a-db-slot-order`, `cs4b-blue-green`; about 60 occurrences) still use « permutation » / « permuter », while the glossary says « échange ». Not a Learn contradiction, so not changed here. A glossary pass should fix them, with care for gender agreement (« l'échange », « un échange »).

## French terms not settled

- « modèle requis » (chapter 32) vs « modèle obligatoire » (chapter 33 and `cs2c-prod-checks`) for Required template: not in the glossary.
- « émetteur » (issuer), « progressivement abandonné » (gradually deprecated; fr-fr Learn says « progressivement déconseillé »), « exécutions de tests » (test runs): not in the glossary.
- « travail / travaux » (job) in chapters 33 and 36 vs « job » in chapter 32 and some bank questions: existing mix, not changed.
