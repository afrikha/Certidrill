A data engineering project is software: notebooks, Python modules, SQL files and the definitions of the jobs and pipelines that run them. This chapter covers versioning with Git folders, branching and pull requests, a four-level testing strategy, and packaging and deploying a bundle with the Databricks CLI or through the REST APIs. Questions give a team, a repository and constraints (isolation, least privilege, no manual steps) and ask which practice, command or configuration fits.

<!-- section: git-folders | objectives: 4.3.1 -->
## Version control with Git folders

**Git folders** (formerly Repos) are a visual Git client and API in the workspace. A Git folder is connected to one remote repository (Azure DevOps, GitHub, GitLab, Bitbucket...) and mirrors it: you clone, branch, commit, push, pull and merge without leaving Azure Databricks.

To clone: **Workspace** > navigate to the target location > **Create** > **Git folder**, enter the repository URL (`https://example.com/organization/project.git`), select the provider, name the folder, then **Create Git folder**.

What Git folders put under version control and what they don't:

| Asset | Versioned in the Git folder? |
| --- | --- |
| Notebooks, Python files, SQL files, other workspace files | Yes |
| Notebook outputs, source formats (`.py`, `.sql`, `.scala`, `.r`) | No, outputs aren't committed by default |
| Notebook outputs, IPYNB format | Yes, if you need to version outputs |
| Job and pipeline configuration, dashboard publishing settings | No: use a bundle to source-control them |

Best practices the exam expects:

- **One Git folder per developer**, mapped to the shared repository: in a shared folder, one user switching branches switches it for everyone.
- **Pull regularly**, especially before new work. A pull that changes a notebook's source clears its outputs, comments and version history.
- **`.gitignore`** excludes temporary outputs, credentials and environment-specific configuration; an already tracked file must be removed from Git first.
- **Delete merged branches** on the provider; a local branch persists up to 30 days after its remote branch is deleted.
- **Store functions in `.py` files** and import them into notebooks: the code is reusable and unit-testable.

Limits: **1 GB** per working branch, fewer than **20,000** assets recommended; use **sparse checkout** for a large repository.

**Production Git folders** are created by an admin outside `/Workspace/Users/`, hold a deployment branch and are updated only by automation when a pull request is merged. Project users, and the service principals that run automation against the folder, get **Can Run** (optionally **Can View** for everyone else); only admins and service principals edit them. The service principal needs a Git credential for the repository.

> **Exam trap.** A Git folder versions code only. To version and promote the **job definition** (tasks, schedule, compute) with the code, use a bundle.

<!-- section: branching-pull-requests | objectives: 4.3.2 -->
## Branching, pull requests and conflicts

Each developer works on a **feature branch** created from `main` and named consistently:

| Pattern | Use |
| --- | --- |
| `feature/feature-name` | New functionality |
| `bugfix/issue-description` | A fix |
| `users/username/description` | Personal development work |

Create a branch from the Git dialog > **Create branch**. When you switch branches:

- **Uncommitted changes carry over** to the new branch if they don't conflict; discard them first if you don't want them there.
- Assets that don't exist on the target branch are **removed from the workspace**; check before switching, especially for shared or bookmarked notebooks.

To commit: open the Git dialog, review the visual diffs, enter a message, then **Commit & Push**. If `main` is a protected branch, push a feature branch and open a pull request.

**Pull requests are created, reviewed and merged in the Git provider**, not in Azure Databricks. The workflow:

1. Clone the repository and create a feature branch from `main`.
2. Modify notebooks and files, then commit and push.
3. Create the pull request on the provider's site; the team reviews it.
4. Merge into the deployment branch, then pull the updated branch into your Git folder.

**Conflicts** appear during a pull, a merge or a rebase when two people changed the same lines. For each conflicting file, use the kebab menu to keep all current changes or take all incoming changes, or edit the file and remove the markers:

```text
<<<<<<< HEAD
Your current changes
=======
Incoming changes
>>>>>>> branch-name
```

Then select **Mark As Resolved**, and finally **Continue Merge** or **Continue Rebase**. **Abort** cancels the operation and returns to the previous state.

> **Exam tip.** "Review the change before it reaches `main`" means a pull request in the Git provider, with branch protection on `main`. Azure Databricks has no pull request feature of its own.

<!-- section: testing-strategy | objectives: 4.3.3 -->
## Testing strategy

The strategy follows the **testing pyramid**: many fast unit tests, fewer integration tests, a few end-to-end tests and UAT scenarios.

| Test type | Verifies | Scope | Runs against | Speed |
| --- | --- | --- | --- | --- |
| Unit | One function works correctly in isolation | Function or class | Synthetic data in memory (fixtures) | Milliseconds |
| Integration | Components work together (ingestion, transformation, storage) | Several components | Real Databricks resources, dedicated test catalog or schema | Seconds |
| End-to-end | A complete workflow produces the expected result | Full pipeline | Test input files, the whole job | Minutes |
| User acceptance (UAT) | The solution meets business requirements | Business scenarios | Staging environment that mirrors production | Varies |

**Unit tests** use `pytest`. Test files start with `test_` or end with `_test.py`, typically under `tests/unit/`. A `@pytest.fixture` builds reusable synthetic test data. Design functions to return a single, predictable type: a function that returns a DataFrame or `False` is hard to test, so always return a DataFrame, even an empty one. Run the tests from a notebook:

```text
%pip install pytest

import pytest
import sys

sys.dont_write_bytecode = True
retcode = pytest.main(["tests/", "-v", "-p", "no:cacheprovider"])
assert retcode == 0, "Test suite failed"
```

`-p no:cacheprovider` and `sys.dont_write_bytecode` stop pytest from writing cache files to a read-only file system; the `assert` makes the job task fail when a test fails.

**Integration tests** use dedicated test catalogs or schemas with representative, non-sensitive data, never production tables. **End-to-end tests** are slow: run them off-peak or in the deployment pipeline, not on every change. **UAT** starts before development: acceptance criteria agreed with stakeholders, a staging environment, business scenarios with expected outcomes ("revenue matches the finance system within 1 %"), and a feedback process.

A typical layout:

```text
project/
├── src/
│   └── transforms.py
├── tests/
│   ├── unit/
│   │   └── test_transforms.py
│   ├── integration/
│   │   └── test_pipeline.py
│   └── e2e/
│       └── test_daily_workflow.py
├── notebooks/
│   └── run_tests.py
└── requirements.txt
```

Automate with a job that runs the test notebook before deploying to production.

> **Exam trap.** "Test the logic in milliseconds without a cluster" is a unit test. "Check the schema the job writes to a table" needs a Databricks resource: integration test. "Business users confirm the report" is UAT, not end-to-end.

<!-- section: bundle-configuration | objectives: 4.3.4 -->
## Configuring and packaging bundles

**Databricks Asset Bundles**, now named **Declarative Automation Bundles** on Microsoft Learn, describe a project as code in YAML: source files, resource definitions (Lakeflow Jobs, pipelines, dashboards, schemas, volumes...) and per-environment settings. Commands still start with `databricks bundle`; the CLI must be **0.218.0 or above**.

The `databricks.yml` file sits at the root of the project:

```yaml
bundle:
  name: sales-pipeline

include:
  - resources/*.yml

variables:
  catalog:
    description: Target catalog
    default: dev_sales
  warehouse_id:
    lookup:
      warehouse: 'Shared SQL warehouse'

artifacts:
  default:
    type: whl
    build: poetry build
    path: .

resources:
  jobs:
    daily_sales:
      name: daily-sales
      tasks:
        - task_key: ingest
          job_cluster_key: main
          notebook_task:
            notebook_path: ./notebooks/ingest.py
            base_parameters:
              catalog: ${var.catalog}
        - task_key: transform
          depends_on:
            - task_key: ingest
          job_cluster_key: main
          python_wheel_task:
            package_name: sales_etl
            entry_point: main
          libraries:
            - whl: ./dist/*.whl
      job_clusters:
        - job_cluster_key: main
          new_cluster:
            spark_version: 15.4.x-scala2.12
            node_type_id: Standard_DS3_v2
            num_workers: 2

targets:
  dev:
    default: true
    mode: development
    workspace:
      host: https://adb-1234567890123456.7.azuredatabricks.net
  prod:
    mode: production
    git:
      branch: main
    workspace:
      host: https://adb-9876543210987654.3.azuredatabricks.net
    variables:
      catalog: prod_sales
    run_as:
      service_principal_name: 9f2b5c1e-1111-2222-3333-444455556666
```

| Mapping | Purpose |
| --- | --- |
| `bundle` | Required; `name` is the bundle's identity |
| `include` | Other YAML files to load |
| `variables` | `${var.name}`; `lookup` resolves an object's ID by name; `type: complex` for a structured value |
| `artifacts` | What to build before deploying: `type: whl` with a `build` command (`poetry build`, setuptools, `uv`) |
| `resources` | Jobs, pipelines, dashboards... with paths **relative to the bundle root** |
| `targets` | Environments; exactly one has `default: true`; each overrides `workspace`, `variables`, `resources`, `mode`, `run_as`... |
| `workspace` | `host`, `profile`, `root_path` (default `~/.bundle/${bundle.name}/${bundle.target}`) |
| `run_as`, `permissions` | Identity that runs the jobs; permissions applied to every resource |

Omit `artifacts` if the wheel is already built: the CLI then uploads the files listed in the `whl` entries of `libraries`.

Substitutions include `${bundle.target}`, `${workspace.current_user.userName}` and `${resources.jobs.<job-key>.id}`. A variable without a default must be set at deployment time; the CLI takes the first value found:

1. `--var="catalog=qa_sales"` on the command.
2. A `BUNDLE_VAR_catalog` environment variable.
3. `.databricks/bundle/<target>/variable-overrides.json`.
4. The `variables` mapping of the target.
5. The `default` of the top-level declaration.

Bundle variables are deployment-time values: to change an input for one run, use job parameters.

**Deployment modes** apply a group of settings to a target:

| Behavior | `mode: development` | `mode: production` |
| --- | --- | --- |
| Resource names | Prefixed `[dev <short_name>]`, jobs and pipelines tagged `dev` | Unchanged |
| Schedules and triggers | Paused | As configured |
| Concurrent job runs | Enabled (`max_concurrent_runs: 1` disables them for one job) | As configured |
| Deployment lock | Disabled (`bundle.deployment.lock.enabled: true` re-enables it) | Enabled (default) |
| Pipelines | `development: true` | Must be `development: false` |
| `--cluster-id` override | Allowed | Not allowed |
| Validations | None | Current Git branch equals `git.branch`; without a service principal in `run_as`, `artifact_path`, `file_path`, `root_path` and `state_path` can't be overridden to a specific user, and `run_as` and `permissions` must be set |

**Presets** (`name_prefix`, `pipelines_development`, `trigger_pause_status`, `jobs_max_concurrent_runs`, `tags`) fine-tune a target such as staging; presets override the mode, and a resource's own setting overrides the presets.

> **Exam trap.** A schedule that never fires after deployment to the dev target isn't a bug: `mode: development` pauses every schedule. Set `pause_status: UNPAUSED` on that job's `schedule` (or `continuous`) if it must run.

<!-- section: bundle-cli-deployment | objectives: 4.3.5 -->
## Deploying a bundle with the Databricks CLI

Authenticate first: OAuth user-to-machine for a person, a **service principal** for automation.

```bash
databricks auth login --host https://adb-1234567890123456.7.azuredatabricks.net
```

The lifecycle, run from the bundle root:

```bash
databricks bundle init                      # new project from a template
databricks bundle validate                  # check the configuration
databricks bundle plan -t prod              # list planned creates, updates, deletes
databricks bundle deploy -t prod            # build, upload, create or update resources
databricks bundle summary -t prod           # deployed resources with workspace links
databricks bundle run -t prod daily_sales   # run a job by its resource key
databricks bundle destroy -t prod           # delete everything the bundle deployed
```

| Need | Command or option |
| --- | --- |
| Check syntax and resolved values before deploying | `bundle validate` (`--output json` shows resolved variables) |
| Preview changes without applying them | `bundle plan` |
| Deploy to a non-default target | `-t` / `--target` |
| Override a variable | `--var="name=value"` |
| Fail instead of disrupting running jobs | `deploy --fail-on-active-runs` |
| Clear a stale lock from an interrupted deployment | `deploy --force-lock` (only if no deployment is running) |
| Override validations that block a deployment (Git branch of production mode; also overwrites a dashboard modified in the workspace) | `deploy --force` |
| Skip prompts in a pipeline | `--auto-approve` |
| Use an existing cluster in development | `deploy --cluster-id` (development mode only) |
| Run only some tasks; restart a running job | `run --only ingest,transform` (`+key` adds its upstream tasks, `key+` its downstream tasks); `run --restart` |
| Pass job parameters to one run; don't wait for the run | `run --params run_date=2026-11-24`; `run --no-wait` |
| Deploy only some resources and their upstream dependencies (development only) | `deploy --select jobs.daily_sales` |
| Bring an existing job under the bundle | `bundle generate job --bind`, or `bundle generate job` then `bundle deployment bind` |

`bundle deploy` keeps its state in the workspace: it creates new resources, updates deployed ones and **deletes the resources removed from the configuration**. A deployment's identity is bundle name + target + deployer, so two people deploying to the same shared target conflict: let a pipeline running as a service principal deploy there. `bundle destroy` can't be undone; the `lifecycle` setting protects specific resources from it. The workspace UI (**Deployments** pane) also deploys, as the current user and within the current workspace only; the CLI is the path for CI/CD.

> **Exam trap.** A deployment from a feature branch to a production target fails the `git.branch` check: merge, then deploy from `main`. `--force` only overrides the safeguard.

<!-- section: bundle-rest-ci-cd | objectives: 4.3.6 -->
## Deploying with REST APIs and CI/CD

The Databricks CLI works through the **Azure Databricks REST APIs**. A CI/CD system can deploy in two ways:

| Approach | What it does | When to choose it |
| --- | --- | --- |
| Run the CLI in the pipeline | `bundle deploy` builds, uploads and creates or updates jobs and pipelines through the REST APIs, with deployment state | Recommended: the bundle is the single source of truth |
| Call the REST APIs directly | HTTPS requests to the Jobs API (`create`, `update`, `reset`, `run-now`) or the Repos API | A tool that only sends HTTP requests, or a single step (start a run, update a production Git folder) |

Requests carry a bearer token issued to a **service principal**, not a user's token. Use the **Jobs API 2.2**: jobs created with it **queue by default** (`queue: false` disables it), and `jobs/get` pages `tasks` and `job_clusters` beyond 100 elements with `next_page_token`.

```bash
# Start a run of a job deployed by the bundle (job ID from bundle summary)
curl -X POST "$DATABRICKS_HOST/api/2.2/jobs/run-now" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  -d '{"job_id": 123456789}'
```

A GitHub Actions workflow that deploys the bundle when a pull request targets `main`:

```yaml
name: Dev deployment
concurrency: 1
on:
  pull_request:
    types: [opened, synchronize]
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: databricks/setup-cli@main
      - run: databricks bundle deploy
        env:
          DATABRICKS_TOKEN: ${{ secrets.SP_TOKEN }}
          DATABRICKS_BUNDLE_TARGET: dev
```

`DATABRICKS_BUNDLE_TARGET` selects the target, like `-t`. With **workload identity federation** (the most secure option, no stored secret), the workflow sets `DATABRICKS_AUTH_TYPE: github-oidc`, `DATABRICKS_HOST` and `DATABRICKS_CLIENT_ID` (the service principal's UUID) and grants `id-token: write`.

To sync a **production Git folder** after a merge, the pipeline calls the Repos API, here through the CLI:

```bash
databricks repos update /Workspace/Production/sales-pipeline --branch main
```

Without external CI/CD, a scheduled job can run a notebook that calls the Databricks SDK instead (`w.repos.update(..., branch="main")`).

> **Exam tip.** "No secret stored in the CI system": workload identity federation. "Deploy jobs with their configuration": a bundle. "Only refresh code in a production folder after a merge": a Repos API update.

<!-- section: key-points -->
## Key points

- Git folders version code (notebooks, files), one folder per developer; pull requests are made in the Git provider; conflicts end with Mark As Resolved, then Continue Merge or Continue Rebase, or Abort.
- Testing pyramid: unit (pytest, synthetic fixtures, no cluster), integration (test catalog, real resources), end-to-end (whole pipeline, off-peak), UAT (business criteria, staging).
- A bundle (Databricks Asset Bundles, now Declarative Automation Bundles) versions code and resource definitions together in `databricks.yml`; targets, variables, artifacts, `run_as`.
- `mode: development` prefixes names, pauses schedules and allows concurrent runs; `mode: production` validates the Git branch and expects a service principal.
- `validate`, `plan`, `deploy -t`, `run`, `summary`, `destroy`; `--force-lock` for stale locks, `--fail-on-active-runs` to protect running jobs.
- In CI/CD, the CLI calls the REST APIs for you; direct REST calls (Jobs API 2.2, Repos API) authenticate as a service principal.
