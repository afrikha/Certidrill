A pipeline that works today still needs care: it slows down, tests start failing at random, parallel jobs run short and storage fills up. This chapter covers how to measure pipeline health, make runs faster and cheaper, size concurrency, decide what is kept and for how long, and move classic pipelines to YAML.

<!-- section: pipeline-health | objectives: 3.6.1 -->
## Monitoring pipeline health

The **Analytics** tab of an Azure Pipelines pipeline has three reports, over the last 14 days by default, filterable by branch:

| Report | Shows | Answers |
| --- | --- | --- |
| Pipeline pass rate | Pass rate and trend, failures per day (split by stage), **top failing tasks** with their failed runs | "Which task causes most failures?" |
| Pipeline duration | Typical duration of successful runs, trend, **top tasks by duration** | "Which step should we optimize?" |
| Test failures | Top failing tests and failure details (test analytics) | "Which tests fail most often?" |

For cross-pipeline views, use dashboard widgets or the Analytics service (OData queries, Power BI). In GitHub, use the workflow run history of the Actions tab, job summaries and the REST API for runs and jobs.

A **flaky test** passes and fails without any change to the code or the environment. In Azure DevOps Services, flaky test management is turned on in **Project settings > Pipelines > Test management**:

| Detection | How |
| --- | --- |
| System detection | The Visual Studio Test task reruns a failed test in the same task, or someone reruns failed jobs: a test that fails then passes is marked flaky for that branch |
| Custom detection | An external system marks the result through the Result Meta Data - Update REST API |
| Manual | Mark a test **Flaky** or **UnFlaky**; applies to future runs only |

An option excludes flaky tests from the Test Summary and the pass percentage, so their failures don't fail the pipeline; this works with the Visual Studio Test and Publish Test Results tasks. Changing the detection system erases the flakiness history.

> **Exam trap.** Excluding flaky tests from the pass rate keeps the pipeline green, but it doesn't fix them. The expected answer often combines detection (to find and quarantine them) with a work item to fix the test.

<!-- section: pipeline-optimization | objectives: 3.6.2 -->
## Optimizing for cost, time, performance and reliability

| Goal | Technique |
| --- | --- |
| Faster dependency restore | `Cache@2` (key built from a lock file) or `actions/cache` |
| Faster checkout | Shallow fetch: `fetchDepth: 1` on `checkout` (0 = full history) |
| Fewer useless runs | Path filters, `batch: true`, PR `autoCancel` (default true), `[skip ci]`, `concurrency` with `cancel-in-progress: true` in GitHub Actions |
| Shorter wall-clock time | Parallel jobs or matrix, test slicing (`parallel: N`), independent stages with `dependsOn: []` |
| Faster file transfer between jobs | Pipeline artifacts (`publish`, `download`, `PublishPipelineArtifact@1`) rather than build artifacts |
| Incremental builds, preinstalled tools | Self-hosted agents or Managed DevOps Pools with stateful agents |
| Lower cost | Microsoft-hosted for occasional builds; Managed DevOps Pools or scale set agents with standby agents set to 0 for bursty load |
| Reliability | `retryCountOnTaskFailure`, `timeoutInMinutes`, pinned image versions (`ubuntu-24.04` instead of `ubuntu-latest`), pinned task major versions, actions pinned to a full commit SHA |

```yaml
variables:
  npm_config_cache: $(Pipeline.Workspace)/.npm
steps:
- checkout: self
  fetchDepth: 1
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | package-lock.json'
    restoreKeys: |
      npm | "$(Agent.OS)"
    path: $(npm_config_cache)
    cacheHitVar: NPM_CACHE_RESTORED
- script: npm ci
- task: PublishPipelineArtifact@1
  inputs:
    targetPath: dist
    artifact: web
```

Azure Pipelines caching facts: caches are scoped to the pipeline and branch, immutable once created (change the key to refresh), can't be cleared, expire after seven days without use, and are free. A PR run reads the caches of its source, target and default branches but writes only to its merge branch. In GitHub, cache entries not accessed for seven days are removed and a repository has 10 GB by default.

> **Exam trap.** Caching speeds up runs with files that are nice to have (packages); pipeline artifacts pass files that a later job **needs** (build output). A cache miss must never break the build.

<!-- section: pipeline-concurrency | objectives: 3.6.3 -->
## Optimizing pipeline concurrency

| Lever | Effect |
| --- | --- |
| Purchased parallel jobs (Microsoft-hosted or self-hosted) | Maximum number of jobs running at once across the organization; rule of thumb: one parallel job per four to five users |
| Number of agents in self-hosted pools, Maximum agents in Managed DevOps Pools | Capacity per pool, still capped by the self-hosted parallel jobs |
| `maxParallel` on a matrix, `max-parallel` in GitHub | Leave capacity for other pipelines |
| Exclusive lock check, `lockBehavior: sequential` or `runLatest` | Serialize deployments to a shared environment |
| GitHub `concurrency` group | One running and one pending run per group: a new run cancels the pending one; `cancel-in-progress: true` also cancels the running one |
| `batch: true` on CI | Group pushes during a run into one run |

Parallel jobs can't be dedicated to a project or a pool, and runs waiting for approval or a check don't consume one, nor do server jobs and releases that deploy to a deployment group. GitHub-hosted runners have concurrency limits per plan: 20 jobs on Free, 40 on Pro, 60 on Team and 500 on Enterprise for standard runners, with a macOS limit of 5 (50 on Enterprise).

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false      # don't cancel the deployment in progress
```

Without a `queue` setting, a group keeps one pending run, and a newer run cancels it. `queue: max` keeps up to 100 pending runs, processed in order, and can't be combined with `cancel-in-progress: true`.

> **Exam tip.** Pipelines queue for a long time while agents are idle on a self-hosted pool? The limit is the number of self-hosted parallel jobs, not the agents: buy more parallel jobs.

<!-- section: retention-strategy | objectives: 3.6.4 -->
## Retention strategy for artifacts and dependencies

**Pipeline runs.** Retention is set at project level in **Project settings > Pipelines > Settings**; per-pipeline retention policies are no longer supported.

| Setting | Meaning |
| --- | --- |
| Days to keep artifacts, symbols and attachments | Age after which they are deleted |
| Days to keep runs | Age after which a run is deleted |
| Days to keep pull request runs | Same, for PR runs |
| Number of recent runs to retain per pipeline | Always kept: for Azure Repos, per pipeline, default branch and each protected branch |

A run is deleted only when it is older than the configured days, isn't among the recent runs to keep, isn't retained indefinitely and isn't retained by a release. The recent-runs rule keeps only succeeded and partially succeeded runs. Deleting a run removes logs, artifacts, symbols, test results and metadata; test run retention is a separate setting (**Project settings > Test > Retention**). To keep a production run longer, add a **retention lease** (Leases REST API from a script, with `$(System.DefinitionId)` and `$(Build.BuildId)`) or retain it from the run's menu. Policies run once a day.

**Packages.** Packages in Azure Artifacts aren't governed by run retention. A Feed Owner enables **package retention** on the feed:

| Setting | Effect |
| --- | --- |
| Maximum number of versions per package | Versions beyond this count become candidates for deletion |
| Days to keep recently downloaded packages | A version downloaded within this period is kept |

A version is deleted only when both conditions are met. **Packages promoted to a view are exempt.** Deleted versions go to the Recycle Bin for 30 days and still count toward storage; a deleted version number can't be reused.

**GitHub.** Artifacts and logs are kept 90 days by default, configurable from 1 to 90 days for public repositories and 1 to 400 days for private repositories, at organization or repository level, and per artifact with `retention-days` on `actions/upload-artifact`.

> **Exam trap.** To keep a released package forever without disabling feed retention, promote it to a view such as `@release`. To keep a pipeline run forever, use a retention lease, not a higher "days to keep" value.

<!-- section: classic-to-yaml | objectives: 3.6.5 -->
## Migrating a classic pipeline to YAML

**Classic build pipelines** can be exported: open the pipeline definition (not a run), select the three-dot menu, then **Export to YAML**. Then create a YAML pipeline, paste the file, fix what didn't convert and run it. **Classic release pipelines** have no YAML export: export each task individually and rebuild the stages as deployment jobs.

| Classic element | YAML equivalent |
| --- | --- |
| Build pipeline | Build stage, exported with Export to YAML |
| Release pipeline with stages | Stages with deployment jobs targeting environments |
| Pre-deployment approvals and gates | Approvals and checks on the environment |
| Deployment group | Environment with virtual machine resources |
| Task group | Step or job template |
| Variables defined in the UI | `variables` in the YAML or pipeline settings; variable groups are reused as is |
| Release artifact and continuous deployment trigger | Single multi-stage pipeline, or `resources.pipelines` with a trigger |
| Scheduled release, local time zone | `schedules` cron in **UTC** |
| Release retention | Project retention settings and retention leases |

Recommended order: inventory pipelines, task groups and variable groups; export and commit the build YAML; convert task groups to templates; recreate environments and their approvals and checks; run the YAML pipeline alongside the classic one until results match; then disable the classic pipeline and keep it for history. The organization and project settings **Disable creation of classic build pipelines** and **Disable creation of classic release pipelines** prevent new classic pipelines.

> **Exam trap.** Environments and deployment jobs don't exist in classic pipelines, and task groups don't exist in YAML: a migration replaces them, it doesn't import them.

<!-- section: key-points -->
## Key points

- Analytics tab: pass rate (top failing tasks), duration (top tasks by duration), test failures; 14 days by default.
- Flaky test management in Project settings > Test management; system, custom or manual detection.
- Cache dependencies, shallow fetch, path filters and auto-cancel; pass build output with pipeline artifacts.
- Concurrency = purchased parallel jobs; agents beyond that number wait.
- Run retention is per project, leases keep specific runs; feed retention keeps versions in views.
- Export to YAML exists for classic builds only; releases become deployment jobs, environments and checks.
