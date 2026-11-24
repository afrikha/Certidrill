# QZ-dp-750-43-development-lifecycle — report

File: `content/dp-750/quizzes/43-development-lifecycle.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-750 43-development-lifecycle` → 0 problem(s), 0 warning(s).

Objectives: 4.3.1 (Q5), 4.3.2 (Q1), 4.3.3 (Q2, Q9), 4.3.4 (Q4, Q6, Q10), 4.3.5 (Q3, Q7), 4.3.6 (Q8). Formats 6–10: dropdown (YAML), yesno_statements, dropdown (text), multi, multi.

The bank already has 52 questions on 4.3.x. The quiz tests decisions they don't:

- branch naming
- the testing pyramid
- `bundle summary`
- job parameters vs deployment-time bundle variables
- the service principal's Git credential for a production Git folder
- `run_job_task` + `${resources.jobs.<key>.id}` + `pause_status: UNPAUSED` in development mode
- deployment state by ID (deleting removed resources, renames) and `run --restart`
- the production Git folder update on merge as a service principal through the Repos API
- `.py` module + pytest naming + fixtures
- production-mode validations without a service principal (user `root_path`, `run_as` + `permissions`)

## Sources fetched (2026-11-24)

dev-tools/bundles/deployment-modes, dev-tools/cli/bundle-commands, dev-tools/bundles/variables, repos/ci-cd, the Learn training module "Implement development lifecycle processes in Azure Databricks" (index, unit 3 branching, unit 4 testing).

## Chapter out of date or incomplete against current Learn

- **bundle commands**: Learn now documents `deploy --select` (deploy only some resources and their upstream dependencies; recommended for development only), `deploy --plan` (apply a JSON plan, direct engine), `plan -o json`, `run --params` (job parameters, recommended over task parameters), `run --no-wait`, and `--only` with `+` prefix/suffix for upstream/downstream tasks. There is also a `lifecycle` setting that protects resources from `bundle destroy`, and `generate --bind`. The chapter shows only `--only ingest,transform`. The bank's `dp750-4c-cli-run-subset` already uses `transform+`, which the chapter doesn't explain.
- **`deploy --force`** "overrides validations that block a deployment" in general, not only the Git branch check (chapter: "Bypass the Git branch validation"). It also overwrites dashboards modified in the workspace.
- **Production Git folder permissions**: Learn recommends **Can Run** for users *and* for service principals that run automation against the folder, and edit rights only for admins and service principals. It updates the folder with the Databricks SDK (`w.repos.update(..., branch=...)`) from a scheduled job when no external CI/CD exists. The chapter's CLI form `databricks repos update <path> --branch main` isn't shown on the fetched pages (unverified; Q8 cites the SDK call instead).
- **Development mode**: Learn adds that the deployment lock can be re-enabled with `bundle.deployment.lock.enabled: true`, concurrent runs disabled per job with `max_concurrent_runs: 1`, and a schedule unpaused with `schedule.pause_status` or `continuous.pause_status`. Presets also include `pipelines_development`. The chapter is otherwise consistent.
- **Production mode without a service principal**: Learn names `artifact_path`, `file_path`, `root_path` and `state_path` (none may be overridden to a specific user). The chapter says "paths can't point to a user folder"; correct but less precise.
- The fetched pages all say **Declarative Automation Bundles**, as the chapter notes.

## Unverified or inferred

- Q6: the `run_job_task.job_id` field and the `${resources.jobs.load_orders.name}` distractor. The variables page lists `${resources.jobs.<job-name>.id}`, and for name substitutions only those of pipelines and models. Whether `.name` resolves for jobs isn't stated. It is wrong as a `job_id` either way.
- Q10: assumes that a `root_path` under `/Workspace/Users/lena@contoso.com/` counts as "overridden to a specific user" and fails production validation, even though Lena is the `run_as` user.
- Q9: Learn's testing unit doesn't mention `%run`. The distractor relies on `%run` running the whole notebook, which is standard Databricks behavior.
