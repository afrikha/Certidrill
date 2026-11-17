Training in Azure Machine Learning is a set of jobs: a script runs as a command job, a sweep job tunes it, an AutoML job searches algorithms for you, and a pipeline job chains the steps. MLflow records what each run did so you can compare runs and pick a model. Exam questions give you a job YAML or an SDK v2 snippet to complete, a constraint (lowest cost, fastest search, GPUs on several nodes) and ask which key, value or job type fits.

<!-- section: mlflow-tracking | objectives: 2.1.1 -->
## Experiment tracking with MLflow

Azure Machine Learning workspaces are MLflow tracking servers. Every workspace has a tracking URI that starts with `azureml://`.

| Where the code runs | What you configure |
| --- | --- |
| Job on a compute cluster or serverless compute, notebook on a compute instance | Nothing: the tracking URI is set automatically |
| Local machine, Azure Synapse Analytics, Azure Databricks | Install `mlflow` and `azureml-mlflow`, then `mlflow.set_tracking_uri()` with the workspace URI |
| Shared cluster outside Azure Machine Learning | The `MLFLOW_TRACKING_URI` environment variable at cluster level |

```bash
pip install mlflow azureml-mlflow
az ml workspace show --query mlflow_tracking_uri
```

Outside Azure Machine Learning, the plugin tries authentication in order: environment variables, managed identity, Azure CLI, Azure PowerShell, then interactive browser. Interactive browser blocks unattended code, so set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` for a service principal (secret kept in Azure Key Vault).

Runs go to the active experiment: `Default` unless you call `mlflow.set_experiment()` or set `experiment_name` in the job YAML.

```text
import mlflow

mlflow.set_experiment("churn-training")
mlflow.autolog()                      # params, metrics and model for supported frameworks

with mlflow.start_run(run_name="rf-baseline"):
    mlflow.log_param("n_estimators", 200)
    mlflow.log_params({"max_depth": 8, "criterion": "gini"})
    mlflow.log_metric("val_auc", 0.91)
    mlflow.log_metric("loss", 0.42, step=3)
    mlflow.log_figure(fig, "roc.png")
    mlflow.log_artifact("outputs/report.html")
    mlflow.sklearn.log_model(model, "model")
```

| Call | Logs |
| --- | --- |
| `log_metric(key, value, step=...)` | A numeric value; repeated calls build a curve (`step` defaults to 0) |
| `log_param` / `log_params` | Configuration values, one or a dictionary |
| `log_artifact` / `log_artifacts` | An existing file / the contents of a folder |
| `log_figure`, `log_image`, `log_text`, `log_dict` | A plot, an image, text, a dictionary as JSON or YAML |
| `mlflow.<flavor>.log_model` | A model in MLflow format (see the next chapter) |
| `MlflowClient().log_batch(...)` | Many metrics in one call |

`mlflow.autolog(log_models=False)` logs everything except the model. To log many values without slowing training, avoid `log_metric` in tight loops: use `log_batch` or asynchronous logging (`mlflow.config.enable_async_logging()` or `synchronous=False`, MLflow 2.8.0+ and `azureml-mlflow` 1.55+).

> **Exam trap.** A training job doesn't need `set_tracking_uri()` or credentials: Azure Machine Learning injects them. Adding a service principal to the script is the answer only when the code runs outside the workspace's compute.

<!-- section: notebooks | objectives: 2.1.3 -->
## Notebooks for experimentation

Notebooks in the studio are the interactive part of the lifecycle: explore data, try features, call MLflow by hand, then move the code into a script and a job.

| Fact | Detail |
| --- | --- |
| Compute | Editing needs no compute; **running cells needs a compute instance**. A stopped compute instance starts when you run the first cell |
| Storage | Files live in **User files** in the workspace storage account, in a folder named after your user, shared by all compute instances of the workspace |
| Sharing | Compute instances are personal: someone who opens your shared notebook runs it on their own instance. Contributor can edit it, Reader only view it |
| Kernels | Every Jupyter kernel installed on the compute instance is listed; changing kernel or compute resets variables |
| Other editors | Jupyter, JupyterLab, VS Code Desktop or VS Code for the Web connected to the same compute instance |
| Packages | `%pip install` and `%conda install` (magic commands target the running kernel), not `!pip` |
| History | Autosave every 30 seconds; named checkpoints to revert; export as Python, HTML or LaTeX |

A notebook isn't a production artifact: it depends on one person's compute instance and on cell order. For repeatable training, export or rewrite the logic as a script, then submit it as a command job or a pipeline step. The same `azure-ai-ml` client used in the notebook can submit the job.

> **Exam trap.** A compute cluster can't run notebook cells. "Interactive", "notebook" and "explore" point to a compute instance; "scheduled", "repeatable" and "scale out" point to a job on a cluster or serverless compute.

<!-- section: training-scripts | objectives: 2.1.5 -->
## Running training scripts as command jobs

A **command job** uploads a code folder, runs a command in an environment on a compute target, and records inputs, outputs, logs and metrics.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandJob.schema.json
type: command
code: ./src
command: >-
  python train.py
  --data ${{inputs.training_data}}
  --learning-rate ${{inputs.learning_rate}}
  --model-dir ${{outputs.model_dir}}
inputs:
  training_data:
    type: uri_folder
    path: azureml:churn-data@latest
    mode: ro_mount
  learning_rate: 0.01
outputs:
  model_dir:
    type: uri_folder
environment: azureml:AzureML-sklearn-1.5@latest
compute: azureml:cpu-cluster
experiment_name: churn-training
display_name: churn-train-lr001
limits:
  timeout: 3600
```

```bash
az ml job create --file job.yml --resource-group rg-ml --workspace-name mlw-contoso
az ml job stream --name <job-name>
```

| Key | Values to know |
| --- | --- |
| `environment` | `azureml:<name>:<version>`, `azureml:<name>@latest`, or inline (image + conda file, no name or version). Curated environments start with `AzureML-` |
| `compute` | `azureml:<compute-name>`; `local` isn't supported inside pipelines; **omit `compute` to run on serverless compute** |
| `inputs.<name>.mode` | `ro_mount` (default), `download`, `direct` (you handle the storage URL and credentials) |
| `outputs.<name>.mode` | `rw_mount` (default) or `upload` (files written at the end of the job) |
| `limits.timeout` | Maximum run time in seconds; the job is canceled after it |
| `identity.type` | `user_identity` (submitter), `managed` (the compute's managed identity), `aml_token` |
| `resources.shm_size` | Shared memory, `2g` by default (raise it for PyTorch data loaders) |

**Serverless compute** removes cluster management: no compute to create, you only choose `resources.instance_type` and `resources.instance_count`, and `queue_settings.job_tier` (`Spot` for low-priority VMs, `Standard` for dedicated VMs). It runs command, sweep, AutoML, parallel and pipeline jobs, uses the user's identity or the workspace's user-assigned managed identity (no system-assigned identity), works with managed network isolation, and still consumes the workspace's compute quota. Without an instance type it uses one dedicated CPU node.

> **Exam tip.** Input values in the command are `${{inputs.<name>}}` and output paths `${{outputs.<name>}}`. A local `path` is uploaded at submission; `azureml:<asset>@latest` reads a registered data asset.

<!-- section: automl | objectives: 2.1.2 -->
## Automated machine learning

AutoML trains many algorithm and featurization combinations in parallel and ranks them by a **primary metric**. It is the answer when the requirement is "find the best model with the least code" for tabular, image or text data.

| Data | Task types |
| --- | --- |
| Tabular | `classification`, `regression`, `forecasting` |
| Images | Image classification, object detection |
| Text | Text classification, named entity recognition |

Tabular training data must be an **MLTable** with the target column present.

```text
from azure.ai.ml import automl, Input
from azure.ai.ml.constants import AssetTypes

job = automl.classification(
    compute="cpu-cluster",
    experiment_name="churn-automl",
    training_data=Input(type=AssetTypes.MLTABLE, path="azureml:churn-train@latest"),
    target_column_name="churned",
    primary_metric="AUC_weighted",
    n_cross_validations=5,
    enable_model_explainability=True,
)
job.set_limits(timeout_minutes=120, trial_timeout_minutes=20,
               max_trials=40, max_concurrent_trials=4,
               enable_early_termination=True)
job.set_training(blocked_training_algorithms=["logistic_regression"])
job.set_featurization(mode="auto")
ml_client.jobs.create_or_update(job)
```

| Setting | Detail |
| --- | --- |
| Classification metrics | `accuracy`, `AUC_weighted`, `average_precision_score_weighted`, `norm_macro_recall`, `precision_score_weighted`. Prefer `AUC_weighted` on small or imbalanced data |
| Regression and forecasting metrics | `r2_score`, `normalized_mean_absolute_error`, `normalized_root_mean_squared_error`, `spearman_correlation` |
| Default validation | More than 20,000 rows: 10 % held out for validation. 20,000 rows or fewer: cross-validation (10 folds under 1,000 rows, 3 folds otherwise) |
| `timeout_minutes` | Whole job, 8,640 minutes (6 days) by default |
| `trial_timeout_minutes` | One trial |
| `max_trials` | 1,000 by default |
| `max_concurrent_trials` | Parallel trials; match it to the number of cluster nodes |
| `enable_early_termination` | Stops the job when the score stops improving |
| Algorithms | `allowed_training_algorithms` or `blocked_training_algorithms` |
| Ensembles | `enable_vote_ensemble`, `enable_stack_ensemble` |
| Featurization | `auto` (default), `off`, or `custom` (imputers, blocked transformers, column types) |

Each trial is a child job; the best one carries the model, its metrics and, with explainability enabled, feature importance.

> **Exam trap.** AutoML doesn't take a CSV path or a `uri_folder` as tabular training data: it needs an MLTable. And the metric must match the task: `r2_score` for a classification job is invalid.

<!-- section: hyperparameter-tuning | objectives: 2.1.4 -->
## Hyperparameter tuning with sweep jobs

A **sweep job** runs your command job many times with different hyperparameter values and keeps the best trial according to a metric that the script logs.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/sweepJob.schema.json
type: sweep
trial:
  code: ./src
  command: >-
    python train.py
    --data ${{inputs.training_data}}
    --learning-rate ${{search_space.learning_rate}}
    --max-depth ${{search_space.max_depth}}
  environment: azureml:AzureML-sklearn-1.5@latest
inputs:
  training_data:
    type: uri_folder
    path: azureml:churn-data@latest
compute: azureml:cpu-cluster
sampling_algorithm: random
search_space:
  learning_rate:
    type: loguniform
    min_value: -6
    max_value: -1
  max_depth:
    type: choice
    values: [4, 8, 16]
objective:
  goal: maximize
  primary_metric: val_auc
early_termination:
  type: bandit
  slack_factor: 0.1
  evaluation_interval: 1
  delay_evaluation: 5
limits:
  max_total_trials: 40
  max_concurrent_trials: 4
  timeout: 7200
  trial_timeout: 900
```

| Sampling | Supports | Use when |
| --- | --- | --- |
| `random` | Discrete and continuous; `rule: sobol` with a `seed` | Default choice; cheap broad exploration |
| `grid` | **`choice` only** | Small discrete space you want to cover exhaustively |
| `bayesian` | `choice`, `uniform`, `quniform` | Each trial uses earlier results; plan at least 20 trials per hyperparameter and fewer concurrent trials |

Search space types: `choice` and `randint` (discrete); `uniform`, `loguniform`, `normal`, `lognormal` and their `q` variants (`quniform`, `qloguniform`, `qnormal`, `qlognormal`). `loguniform` samples between `exp(min_value)` and `exp(max_value)`.

| Early termination | Rule |
| --- | --- |
| `bandit` | Cancels trials whose metric is outside `slack_factor` (ratio) or `slack_amount` (absolute) of the best trial |
| `median_stopping` | Cancels trials below the median of running averages of all trials |
| `truncation_selection` | Cancels the lowest `truncation_percentage` % of trials at each interval |
| None (default) | All trials run to completion |

`evaluation_interval` is counted in logged values of the primary metric; `delay_evaluation` skips the first intervals. In limits, `max_total_trials` and `timeout` stop the sweep at whichever comes first; `trial_timeout` caps each trial.

> **Exam trap.** `objective.primary_metric` must exactly match the name the script logs with `mlflow.log_metric()`. A sweep on `accuracy` while the script logs `val_accuracy` produces no ranking. Also, `grid` with a `uniform` parameter is invalid.

<!-- section: distributed-training | objectives: 2.1.6 -->
## Distributed training for large and deep learning models

Distributed training runs one job across several processes and nodes. Distributed data parallelism (each GPU holds a copy of the model and processes part of the data, PyTorch `DistributedDataParallel`) is the right choice in most cases. You declare the framework in `distribution` and the node count in `resources`:

```yaml
distribution:
  type: pytorch
  process_count_per_instance: 4
resources:
  instance_count: 2
compute: azureml:gpu-cluster
```

| `distribution.type` | Keys | Azure Machine Learning provides |
| --- | --- | --- |
| `pytorch` | `process_count_per_instance` (default 1) | `MASTER_ADDR`, `MASTER_PORT`, `WORLD_SIZE`, `NODE_RANK`, `RANK`, `LOCAL_RANK`; no `torch.distributed.launch` needed |
| `tensorflow` | `worker_count` (defaults to `instance_count`), `parameter_server_count` (default 0, legacy TensorFlow 1.x) | `TF_CONFIG` on each worker |
| `mpi` | `process_count_per_instance` (required) | MPI launch, used for example by DeepSpeed |

Set `process_count_per_instance` to the **number of GPUs per node**: the example above runs 8 processes (`WORLD_SIZE` 8) on two 4-GPU nodes. Without it, one process per node runs and the other GPUs stay idle. For PyTorch on GPUs, initialize the process group with the `nccl` backend. DeepSpeed runs with either PyTorch or MPI distribution.

Multi-node GPU training is limited by communication between nodes. **InfiniBand** needs RDMA-capable sizes, usually with **r** in the name (`Standard_NC24rs_v3` has it, `Standard_NC24s_v3` doesn't); compute clusters of those sizes come with the InfiniBand drivers configured.

> **Exam trap.** `resources.instance_count` is the number of **nodes**, not GPUs. Two nodes with four GPUs each need `instance_count: 2` and `process_count_per_instance: 4`, not `instance_count: 8`.

<!-- section: training-pipelines | objectives: 2.1.7 -->
## Training pipelines

A **pipeline job** chains reusable **components** (prepare, train, evaluate, register) so that each step runs on its own compute, passes data to the next step and can be reused when nothing changed.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
type: command
name: train_churn_model
version: 3
inputs:
  training_data:
    type: uri_folder
  learning_rate:
    type: number
    default: 0.01
outputs:
  model_output:
    type: uri_folder
code: ./train_src
environment: azureml:AzureML-sklearn-1.5@latest
command: >-
  python train.py --data ${{inputs.training_data}}
  --learning-rate ${{inputs.learning_rate}}
  --model-dir ${{outputs.model_output}}
```

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/pipelineJob.schema.json
type: pipeline
display_name: churn-training-pipeline
inputs:
  raw_data:
    type: uri_folder
    path: azureml:churn-raw@latest
outputs:
  trained_model:
    mode: rw_mount
settings:
  default_compute: azureml:cpu-cluster
  continue_on_step_failure: false
jobs:
  prep:
    type: command
    component: ./prep.yml
    inputs:
      raw_data: ${{parent.inputs.raw_data}}
  train:
    type: command
    component: azureml:train_churn_model:3
    compute: azureml:gpu-cluster
    inputs:
      training_data: ${{parent.jobs.prep.outputs.clean_data}}
    outputs:
      model_output: ${{parent.outputs.trained_model}}
```

| Binding | Meaning |
| --- | --- |
| `${{parent.inputs.<name>}}` | A pipeline-level input passed to a step |
| `${{parent.jobs.<step>.outputs.<name>}}` | The output of an earlier step; creates the dependency and the order |
| `${{parent.outputs.<name>}}` | Promotes a step output to a pipeline output |

| Setting | Default | Effect |
| --- | --- | --- |
| `default_compute` | none | Compute for steps without their own `compute`; `azureml:serverless` for serverless |
| `default_datastore` | Workspace blob datastore | Where outputs are written |
| `continue_on_step_failure` | `True` | `False` stops the pipeline and cancels running steps when one fails |
| `force_rerun` | `False` | `True` reruns every step instead of reusing earlier outputs |

Components are **deterministic** by default (`is_deterministic: true`): a step whose code, environment, inputs and settings didn't change reuses the previous output. Set it to `false` for a step that reads data from a URL that changes. Steps in a pipeline are command or sweep jobs. Register components with `az ml component create --file train.yml`, run the pipeline with `az ml job create --file pipeline.yml`, and schedule it with a schedule resource (see the monitoring chapter).

> **Exam trap.** A step doesn't run after another because of its position in the YAML: order comes from data bindings. A step that must wait for `prep` must consume an output of `prep`.

<!-- section: compare-jobs | objectives: 2.1.8 -->
## Comparing model performance across jobs

In the studio, **Jobs** lists every job (filter by experiment). The **Metrics** tab charts logged values; **Outputs + logs** holds `user_logs/std_log.txt`. With the preview panel feature enabled, you select several jobs and compare their parameters, metrics and tags side by side. A sweep or AutoML parent job ranks its child trials by the primary metric.

In code, `mlflow.search_runs()` returns a pandas DataFrame with `params.*` and `metrics.*` columns:

```text
import mlflow

runs = mlflow.search_runs(
    experiment_names=["churn-training"],
    filter_string="metrics.val_auc > 0.85 AND attributes.status = 'Finished'",
)
best = runs.sort_values("metrics.val_auc", ascending=False).head(1)

child_runs = mlflow.search_runs(
    filter_string=f"tags.mlflow.parentRunId = '{parent_run_id}'"
)
history = mlflow.tracking.MlflowClient().get_metric_history(run_id, "loss")
```

| Rule in Azure Machine Learning | Consequence |
| --- | --- |
| Filters join with `AND` only | No `OR`; run two queries |
| `order_by` doesn't accept `metrics.*`, `params.*` or `tags.*` | Sort with pandas `sort_values` |
| Parameters filter with `=`, `!=`, `like` | Parameters are strings: `params.num_boost_round='100'` |
| `attributes.*` values are quoted strings | `attributes.status = 'Failed'` |
| Search returns the **last** value of each metric | Use `get_metric_history` for the curve |
| No experiment given | Searches the active experiment only; `search_all_experiments=True` widens it |

> **Exam tip.** To pick the best run programmatically, filter with `search_runs` and sort the DataFrame; to compare a handful of runs visually, select them in the Jobs list and compare.

<!-- section: key-points -->
## Key points

- Jobs on Azure Machine Learning compute log to MLflow with no configuration; outside it, install `azureml-mlflow` and set the tracking URI.
- Notebooks run on a compute instance; production training runs as command or pipeline jobs, on a cluster or on serverless compute (omit `compute`).
- AutoML needs MLTable data and a primary metric that fits the task; limits cap time and trials.
- Sweep: `grid` takes `choice` only, `bayesian` uses earlier results, `primary_metric` must match the logged name exactly.
- Distributed: `instance_count` = nodes, `process_count_per_instance` = GPUs per node; InfiniBand needs an "r" size.
- Pipelines order steps by data bindings; reuse is on by default, `force_rerun` turns it off.
- `search_runs` filters with AND only and can't order by metrics: sort with pandas.
