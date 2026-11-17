A trained model becomes a managed asset when you register it: it gets a name, a version, lineage to the job that produced it, and everything deployment needs. This chapter covers the MLflow model format, registration from a run or a job output, packaging a feature retrieval specification with the model, the Responsible AI dashboard, and the lifecycle commands (update, archive, restore, share). Exam questions ask which URI or command registers a model with lineage, what the MLflow format gives you, and what happens to an archived model.

<!-- section: feature-retrieval-spec | objectives: 2.2.1 -->
## Packaging a feature retrieval specification

When features come from an Azure Machine Learning **managed feature store**, the model must be served with exactly the features it was trained on. The **feature retrieval specification** is a portable definition of the feature list associated with a model. You create it during experimentation, it becomes an input of the training pipeline, and it is **packaged with the model**.

```text
features = [
    accounts_featureset.get_feature("accountAge"),
    transactions_featureset.get_feature("transaction_amount_7d_sum"),
]
features += featurestore.resolve_feature_uri(
    ["transactions:1:transaction_amount_3d_sum"]   # feature set:version:feature
)

featurestore.generate_feature_retrieval_spec(spec_folder, features)
```

| Phase | How the specification is used |
| --- | --- |
| Experimentation | `generate_feature_retrieval_spec(folder, features)` writes the specification for the selected features |
| Training pipeline | The built-in **feature retrieval** component takes the specification, the observation data and the **timestamp column** name, joins the features point in time and outputs the training data, as a managed Spark job |
| Registration | The model registration step of the pipeline packages the specification with the model: it is now part of the model definition |
| Batch inference | The same feature retrieval component takes the **registered model** as input and looks for the specification inside the model artifact, then joins the features to the observation data before scoring |

The file must be named **`feature_retrieval_spec.yaml`** when you package it with the model, so the system recognizes it. Using the specification and the built-in component is optional: code can also call `get_offline_features()` directly, but then nothing ties the model to its feature list.

> **Exam trap.** The specification travels **inside the model artifact**, not as a separate data asset or an environment variable. A batch inference pipeline given the registered model finds it there; given only the observation data, it has no feature list to retrieve.

<!-- section: mlflow-models | objectives: 2.2.2 -->
## The MLflow model format

An MLflow model is a folder with an **MLmodel** file, the single source of truth for loading the model, plus the serialized model and its environment (`conda.yaml`).

```yaml
artifact_path: classifier
flavors:
  fastai:
    data: model.fastai
    fastai_version: 2.4.1
  python_function:
    data: model.fastai
    env: conda.yaml
    loader_module: mlflow.fastai
    python_version: 3.8.12
model_uuid: e694c68eba484299976b06ab9058f636
run_id: e13da8ac-b1e6-45d4-a9b2-6a0a5cfac537
signature:
  inputs: '[{"type": "tensor", "tensor-spec": {"dtype": "uint8", "shape": [-1, 300, 300, 3]}}]'
  outputs: '[{"type": "tensor", "tensor-spec": {"dtype": "float32", "shape": [-1, 2]}}]'
```

| Element | Role |
| --- | --- |
| Flavor | Framework-specific way to save and load (`sklearn`, `fastai`...). The `python_function` (pyfunc) flavor gives a generic `predict` function, which no-code deployment calls |
| Signature | Data contract between the model and the server. **Column-based** (tabular, pandas DataFrame) or **tensor-based** (numpy arrays). When present, MLflow enforces input types, and Azure Machine Learning generates a swagger file for the deployment |
| Environment | `conda.yaml`, used to rebuild the runtime |

```text
import mlflow
from mlflow.models import infer_signature

signature = infer_signature(X_test, model.predict(X_test))
with mlflow.start_run() as run:
    mlflow.sklearn.log_model(model, "model", signature=signature)
```

Logging an MLflow model rather than a plain `model.pkl` artifact lets you deploy to online or batch endpoints **without a scoring script or an environment** (no-code deployment), use the **Test** tab in the studio, pass the model as a pipeline input, and build a Responsible AI dashboard. Autolog infers a signature on a best-effort basis; log it explicitly when the inferred one is wrong.

> **Exam trap.** `mlflow.log_artifact("model.pkl")` stores a file, not a model: the result can't be registered as `mlflow_model` and can't use no-code deployment. Use `mlflow.<flavor>.log_model()`.

<!-- section: register-models | objectives: 2.2.2 -->
## Registering a model

A registered model is a **name** plus immutable **versions**. Types: `mlflow_model`, `custom_model` (any file or folder), `triton_model`.

| Source | Command | Lineage to the job |
| --- | --- | --- |
| MLflow run | `az ml model create --name churn --version 1 --path runs:/<run-id>/model/ --type mlflow_model` | Yes |
| Job output | `--path azureml://jobs/<job-name>/outputs/artifacts/paths/model/` (equivalent to `runs:/` for the default artifact location; also works for named outputs) | Yes |
| Datastore | `--path azureml://datastores/<datastore>/paths/models/churn/` | No |
| Local folder | YAML with `path: ./model` and `az ml model create -f model.yml` (files are uploaded) | No |

```bash
az ml model create --name churn-classifier --version 4 \
  --path azureml://jobs/<job-name>/outputs/artifacts/paths/model/ \
  --type mlflow_model --resource-group rg-ml --workspace-name mlw-contoso
```

```text
# MLflow SDK, from the run that logged the model (same workspace)
mlflow.register_model(f"runs:/{run.info.run_id}/model", "churn-classifier")

client = mlflow.tracking.MlflowClient()
client.update_model_version("churn-classifier", version=4, description="AUC 0.91")
client.set_model_version_tag("churn-classifier", version="4", key="validated", value="true")
model = mlflow.pyfunc.load_model("models:/churn-classifier/4")
```

In a pipeline, a final **register** step registers the model only if the evaluation step passed, so every registered version has a training job, data and metrics attached. Loading URIs: `models:/<name>/<version>` and `models:/<name>/latest`.

> **Exam tip.** "Preserve lineage", "trace the model back to the job" → register from `runs:/` or `azureml://jobs/...`, or from the run itself with `mlflow.register_model`. Uploading the downloaded files from a laptop loses the link to the job.

<!-- section: responsible-ai | objectives: 2.2.3 -->
## Evaluating a model with responsible AI principles

Microsoft's responsible AI principles are fairness, reliability and safety, privacy and security, inclusiveness, transparency, and accountability. The **Responsible AI dashboard** turns them into analyses of a registered model:

| Component | Question answered | Principle |
| --- | --- | --- |
| Error analysis | Which cohorts (data subgroups) have the highest error rate? | Reliability and safety |
| Model overview and fairness metrics | Do performance metrics differ across groups (age, gender, region)? | Fairness |
| Data analysis | Is the data balanced and representative across features and cohorts? | Fairness, inclusiveness |
| Feature importances (model explanations) | Which features drive predictions, globally and for one row? | Transparency |
| Counterfactual what-if | What minimal change would flip a prediction? (at least 10 counterfactuals per data point) | Transparency, accountability |
| Causal analysis | What is the effect of changing a treatment feature on a real-world outcome? | Accountability |

Requirements and build:

- The model must be registered in **MLflow format with the `sklearn` flavor**, loadable and pickleable. Task types: `classification`, `regression` (and `forecasting`).
- Train and test data are **`mltable`** inputs. By default the test set shown in the UI is limited to 5,000 rows (`maximum_rows_for_test_dataset`).
- The dashboard is a pipeline of components from the `azureml` registry: **RAI Insights dashboard constructor** and **Gather RAI Insights dashboard** are always required, plus at least one tool component (Add Explanation, Add Causal, Add Counterfactuals, Add Error Analysis), referenced as `azureml://registries/azureml/components/microsoft_azureml_rai_tabular_insight_constructor/versions/<version>` and so on. The model is supplied by the Fetch Registered Model component. You generate the dashboard from the studio UI or with the CLI or SDK.
- A causal-only analysis still needs a model: use `DummyClassifier` or `DummyRegressor`.

To view it, open the registered model and select the **Responsible AI** tab; several dashboards can be attached to one model. Interactive features (what-if counterfactuals, ICE plots, changing error analysis cohorts) need a **running compute instance** connected to the dashboard. Least privilege to use it: Reader plus AzureML Compute Operator. The **Responsible AI scorecard** (component `rai_score_card`) exports a PDF summary with target thresholds for metrics, top features (up to 10) and fairness as `difference` or `ratio`, for stakeholders who don't use the studio.

> **Exam trap.** Overall accuracy can hide a failing subgroup. "Find the cohorts where the model fails" is error analysis; "compare results between groups" is fairness; "explain why this applicant was rejected" is feature importance for one data point.

<!-- section: model-lifecycle | objectives: 2.2.4 -->
## Managing the model lifecycle and archiving

| Operation | Command | Behavior |
| --- | --- | --- |
| Update | `az ml model update --name churn-classifier --version 4 --set tags.stage="Prod"` | Only `description` and `tags` change; anything else needs a new version |
| List | `az ml model list --name churn-classifier` | Archived versions are hidden by default; `--include-archived` or `--archived-only` |
| Archive a version | `az ml model archive --name churn-classifier --version 2` | Hidden from list queries; **still usable** by explicit reference |
| Archive the model | `az ml model archive --name churn-classifier` | No version: archives **all** versions; new versions created later are archived too |
| Restore | `az ml model restore --name churn-classifier` | If the whole container was archived, restore the container first, not single versions |
| Share | `az ml model share --name churn-classifier --version 4 --registry-name reg-contoso --share-with-name churn-classifier --share-with-version 4` | Copies the version to a registry for use from other workspaces |
| Download | `az ml model download --name churn-classifier --version 4 --download-path ./local` | All model files |
| Delete a version | `MlflowClient().delete_model_version(name, version="2")` | Deleting the whole model means deleting every version |

Models can't be renamed: create a new name and register again. A typical lifecycle uses tags for state (`stage=Staging`, `stage=Prod`, `validated=true`), registers each retrained model as a new version, keeps the previous production version available for rollback, and archives obsolete versions to declutter lists without breaking deployments or pipelines that still reference them.

MLflow **stages** (`Staging`, `Production`, `Archived`, set with `transition_model_version_stage`) exist only through the MLflow SDK in Azure Machine Learning: they aren't shown in the studio, can't be read with the Azure Machine Learning CLI or SDK, and you can't deploy "from a stage". Use tags or explicit versions instead.

> **Exam trap.** Archiving isn't deleting. An archived version disappears from list queries such as `az ml model list`, but a deployment or job that references `churn-classifier:2` keeps working. To stop it being used, update the deployments; to remove it, delete the version.

<!-- section: key-points -->
## Key points

- The feature retrieval specification is generated during experimentation, named `feature_retrieval_spec.yaml` and packaged inside the model artifact; batch inference reads it from the registered model.
- MLflow models carry an MLmodel file, flavors and a signature: no-code deployment, swagger and Responsible AI support.
- Register from `runs:/` or `azureml://jobs/...` to keep lineage; versions are immutable except description and tags.
- Responsible AI dashboard: MLflow `sklearn` model, `mltable` data, constructor + gather + at least one tool; scorecard exports a PDF.
- Archive hides, doesn't delete; restore the container if it was archived as a whole; share copies a version to a registry.
- MLflow stages aren't visible to Azure Machine Learning tools: use tags and versions.
