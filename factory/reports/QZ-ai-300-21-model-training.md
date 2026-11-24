# QZ-ai-300-21-model-training — notes

Quiz `content/ai-300/quizzes/21-model-training.yaml`: 10 questions (2.1.1, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.8 × 1; 2.1.2 × 2; 2.1.7 × 2). Types: single 6, dropdown 2, yesno_statements 1, multi 1. Positions 6–10: dropdown, single, yesno_statements, multi, dropdown. Checker: `0 problem(s), 0 warning(s)`.

## Sources fetched (2026-11-24)

Hyperparameter tuning a model (v2); How to do hyperparameter sweep in pipelines; CLI (v2) pipeline job YAML schema; CLI (v2) command job YAML schema; CLI (v2) command component YAML schema; Set up AutoML with Python (v2); Set up AutoML for computer vision; Log metrics, parameters, and files with MLflow; Run Jupyter notebooks in your workspace; Administer data authentication; Query & compare experiments and runs with MLflow; Model training on serverless compute.

## Chapter vs current Learn (to fix in the chapter, not done here)

- **Default `compute` of a command job.** The chapter says "omit `compute` to run on serverless compute", which matches "Model training on serverless compute" ("When `compute` isn't specified for a job, the job runs on serverless compute"). But the command job YAML schema still lists the default of `compute` as `local`. Learn contradicts itself; the chapter follows the serverless page. Not tested in the quiz.
- **Step types in a pipeline.** The pipeline YAML schema says "Currently, only command jobs and sweep jobs can be run in a pipeline", while other Learn pages run parallel jobs (and pipeline components) as steps. The chapter says "Steps in a pipeline are command or sweep jobs". Q10 uses `pipeline` only as a distractor, explained as "runs a nested pipeline", not as an invalid type.
- **Sweep step outputs.** "How to do hyperparameter sweep in pipelines" doesn't say which trial's outputs the sweep step exposes. Q10 doesn't claim it is the best trial.
- **AutoML `max_concurrent_trials`.** Learn: match it with the number of cluster nodes (chapter agrees); for a compute instance, the number of cores; ignored in distributed classification/regression; defaults to 1 for forecasting. The chapter could add the last two points.
- **AutoML ensembles.** Learn shows `enable_stack_ensemble=False, enable_vote_ensemble=False` but doesn't say whether ensembles are on by default; it says ensembles aren't supported in distributed training mode. The chapter lists the two settings without a default (fine).
- **AutoML `trial_timeout_minutes` default** is 43,200 minutes (1 month) on Learn; the chapter doesn't give it.
- **Vision tasks.** Learn lists four tasks: image classification, multi-label classification, object detection, instance segmentation (≥ 10 images, MLTable from JSONL). The chapter lists only "image classification, object detection".
- **`delay_evaluation`.** Learn: the policy applies "every multiple of `evaluation_interval` that is greater than or equal to `delay_evaluation`" (so with 1 and 5, from interval 5). The chapter says "`delay_evaluation` skips the first intervals", which is consistent but less precise.
- **Bayesian sampling and early termination.** The tuning page no longer says whether Bayesian sampling supports early termination. Not in the chapter, not tested.
- **`search_runs` operators.** Learn's matrix: tags support `=` and `LIKE`/`ILIKE` but not `!=`; params `=`, `!=`, `like`. The chapter only gives the params rule; it could add the tag `!=` limitation.

## Facts relied on that Learn states only indirectly

- Q3: an HTML export keeps the rendered cell outputs (standard Jupyter behaviour). Learn lists the Export As formats (Python, HTML, LaTeX) without describing their content.
- Q4: `identity: type: managed` uses "the managed identity of the compute target" (command job schema); that a cluster's system-assigned identity with Storage Blob Data Reader is enough is the general RBAC rule from "Administer data authentication".
- Q6: the algorithm string `"LightGBM"` appears on Learn in an AutoML example; the full list of identifier strings isn't on the page.

## Reference titles

- The bank cites `how-to-configure-auto-train` with the H1 "Set up AutoML training for tabular data with the Azure Machine Learning CLI and Python SDK"; the page `<title>` is "Set up AutoML with Python (v2)", which this quiz uses.

## Design notes

- Bank coverage of 2.1.x is very dense (81 questions); the quiz avoids their decisions: no set_tracking_uri / plugin / env vars, no `%pip`, no idle shutdown, no data modes, no shm_size, no serverless instance_type, no nccl / LOCAL_RANK / process count per GPU, no InfiniBand size, no grid vs random, no metric-name mismatch, no bandit arithmetic, no `is_deterministic`, no `continue_on_step_failure: false` fix, no order_by workaround as the answer, no OR filter.
- New decisions: vision task (Q1), `log_dict` (Q2), HTML export (Q3), job identity `managed` (Q4), TensorFlow `worker_count` default (Q5), `allowed_training_algorithms` + stack ensemble + concurrency = nodes (Q6), intervals counted per logged metric (Q7), pipeline defaults and compute override (Q8), experiment scope + quoted status + `LIKE` on params (Q9), sweep step inside a pipeline (Q10).
- Q8: a stem sentence was added to get under the checker's similarity limit (boilerplate Yes/No wording matched a case-study question).
