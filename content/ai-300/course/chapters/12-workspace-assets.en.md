Assets are the versioned building blocks that jobs and deployments reference by name: data assets, environments, components and models. Exam questions ask which data asset type fits the data, how to define an environment from an image, a Dockerfile or a conda file, how to write and register a component and wire it into a pipeline, and how to share all of them across workspaces with a registry.

<!-- section: data-assets | objectives: 1.2.1 -->
## Creating and managing data assets

A **data asset** is a named, versioned reference to data, like a browser bookmark: the data stays where it is (no copy, no extra storage cost) and jobs use `azureml:<name>:<version>` or `azureml:<name>@latest` instead of a long URI. A data asset isn't mandatory: a job can read a datastore URI directly.

| Type | Points to | Use it for |
| --- | --- | --- |
| `uri_file` | A single file, any format | One CSV or Parquet file |
| `uri_folder` | A folder | Parquet or CSV files read into pandas or Spark; unstructured data (images, text, audio) |
| `mltable` | A folder that contains an `MLTable` file | Tabular data with a schema that changes often, a subset of a large table, AutoML with tables, data spread across several storage locations |

The `path` can be a local path (uploaded automatically to the default datastore), `azureml://datastores/<datastore>/paths/<path>`, a public `https` URL, or a storage URI (`wasbs://`, `abfss://`).

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/data.schema.json
type: uri_folder
name: sales-transactions
version: "3"
description: Daily sales extracts, curated zone
path: azureml://datastores/lake_curated/paths/sales/2026/
tags:
  medallion: silver
```

```bash
az ml data create -f sales-transactions.yml
az ml data list --output table
az ml data update --name sales-transactions --version 3 --set tags.sensitivity=nonPII
```

An `mltable` asset is created from a folder that contains a file named exactly `MLTable` (not `MLTable.yaml`), which lists the paths and the loading steps:

```yaml
paths:
  - file: wasbs://data@stcontososales.blob.core.windows.net/churn.csv
transformations:
  - read_delimited:
      delimiter: ','
      header: all_files_same_headers
      encoding: utf8
  - drop_columns:
      - CustomerId
type: mltable
```

```bash
az ml data create --path ./churn --name churn-table --version 1 --type mltable
```

**Versions are immutable.** A data asset version can't be modified or deleted: jobs stay reproducible, lineage shows which jobs used which version, and the audit trail stays complete. Instead of deleting:

| Problem | Solution |
| --- | --- |
| Wrong name, asset no longer used, list cluttered | Archive the data asset |
| Wrong path | Create a new version of the same name with the right path |
| Wrong type | Archive it and create an asset with another name: a new version can't change the type |

```bash
az ml data archive --name sales-transactions               # all versions
az ml data archive --name sales-transactions --version 2   # one version
az ml data restore --name sales-transactions
```

An archived asset is hidden from `az ml data list` and the studio list, but jobs can still use it. If all versions were archived, you must restore all versions, not one.

A job output can become a data asset: give the output a `name`, and the job registers it when it writes the data.

```yaml
outputs:
  scored:
    type: uri_folder
    mode: rw_mount
    path: azureml://datastores/workspaceblobstore/paths/scoring/2026-11/
    name: scored-customers
```

Access modes of job inputs and outputs:

| Mode | Direction | Behavior |
| --- | --- | --- |
| `ro_mount` | Input | Read-only mount of the storage path |
| `download` | Input | Data copied to the compute disk before the job starts |
| `direct` | Input | The URI is passed as a string; your code reads it |
| `rw_mount` | Output | Read-write mount |
| `upload` | Output | Files written locally are uploaded at the end of the job |
| `eval_mount`, `eval_download` | Input, `mltable` only | The data runtime evaluates the `MLTable` file, then mounts or downloads the listed paths |

> **Exam trap.** "Create version 2 of an existing `uri_file` asset as `mltable`" isn't possible: the type is fixed for a name. And "delete the incorrect data asset" is never available: archive it.

<!-- section: environments | objectives: 1.2.2 -->
## Creating and managing environments

An **environment** defines the Docker container in which a job or deployment runs: base image, Python packages, environment variables. Azure Machine Learning builds the image, stores it in the workspace container registry and caches it: the full build time is paid once per definition.

**Curated environments** are maintained by Microsoft (popular frameworks, security patches, cached images). In the CLI and SDK their names start with `AzureML-`; the studio shows them on a separate tab without the prefix. Reference them from the `azureml` system registry:

```yaml
environment: azureml://registries/azureml/environments/sklearn-1.5/labels/latest
```

**Custom environments** come from three sources:

| Source | YAML keys | When the image is built |
| --- | --- | --- |
| Docker image | `image` | No build: the image is pulled |
| Docker build context | `build.path` (folder with a Dockerfile up to 1 MB), optional `build.dockerfile_path` (default `Dockerfile` at the root) | As soon as the environment is created |
| Conda file plus base image | `image` and `conda_file` | When the environment is first used by a job or deployment |

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/environment.schema.json
name: churn-train-env
version: "4"
image: mcr.microsoft.com/azureml/openmpi4.1.0-ubuntu20.04
conda_file: conda.yml
description: scikit-learn 1.5 and MLflow for churn training
```

```yaml
# conda.yml
name: churn-train
channels:
  - conda-forge
dependencies:
  - python=3.10
  - pip
  - pip:
      - scikit-learn==1.5.2
      - mlflow
      - azureml-mlflow
```

```bash
az ml environment create --file churn-train-env.yml
az ml environment list --name churn-train-env
az ml environment show --name churn-train-env --version 4
az ml environment update --name churn-train-env --version 4 --set description="Validated by QA"
az ml environment archive --name churn-train-env --version 3
```

Rules that decide answers:

- With a conda file, Azure Machine Learning builds a conda environment on top of the base image and runs the job in it: Python packages installed in the base image aren't available to the job.
- Only `description` and `tags` of an environment version can be updated. Any other change (a package, the image) requires a new version.
- An environment defined inline in a job, without `name` and `version`, is an unregistered (anonymous) environment: it isn't tracked as an asset.
- Reference a registered environment with `azureml:<name>:<version>` or `azureml:<name>@latest`.
- Archiving a version doesn't delete its cached image in the container registry. A new version created under an archived name is archived too.
- The image build uses a Microsoft Entra token to the workspace registry that lasts 60 to 90 minutes: a longer build fails.
- By default, images are built on serverless compute, which works only when the workspace's dependent resources (storage account, container registry) have no network restriction. Behind private endpoints, set `image_build_compute` on the workspace to a CPU compute cluster in the same virtual network; a cluster without public IP addresses needs a user-defined route to reach the internet (package repositories, Microsoft Container Registry).

> **Exam trap.** "The package is installed in the Docker base image, but the job raises `ModuleNotFoundError`" points to a conda specification on top of the image: add the package to `conda_file`, or use an image-only or Dockerfile environment.

<!-- section: components | objectives: 1.2.3 -->
## Creating and managing components

A **component** is a self-contained, versioned step of a pipeline, like a function: metadata (name, version, type), an interface (inputs and outputs) and the command, code and environment that run it. Components let teams build, test and version steps independently and reuse them across pipelines, workspaces and subscriptions.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/commandComponent.schema.json
type: command
name: train_churn_model
display_name: Train churn model
version: 2
inputs:
  training_data:
    type: uri_folder
  learning_rate:
    type: number
    default: 0.01
    min: 0.0001
    max: 1
  model_kind:
    type: string
    enum: [logistic, gradient_boosting]
    default: logistic
outputs:
  model_output:
    type: mlflow_model
code: ./train_src
environment: azureml:churn-train-env:4
command: >-
  python train.py
  --data ${{inputs.training_data}}
  --lr ${{inputs.learning_rate}}
  --kind ${{inputs.model_kind}}
  --model ${{outputs.model_output}}
```

| Key | Rule |
| --- | --- |
| `name` | Required; starts with a lowercase letter; lowercase letters, digits and underscores; up to 255 characters |
| `command`, `environment` | Required |
| `inputs` | Literal types (`string`, `number`, `integer`, `boolean`) with `default`, `min`, `max` or `enum`; object types (`uri_file`, `uri_folder`, `mltable`, `mlflow_model`) connect steps |
| `is_deterministic` | Default `true`: the step reuses the previous result when its inputs haven't changed. Set `false` to force a rerun, for example to reload data from a URL |
| `code` | Local folder uploaded when the job is submitted |

`min`, `max` and `enum` are checked when the pipeline is validated, before submission. Adding an input takes three edits: `inputs`, `command` and the script's argument parsing.

```bash
az ml component create --file train.yml
az ml component list --output table
az ml component show --name train_churn_model --version 2
az ml component archive --name train_churn_model --version 1
```

Registered components are versioned automatically; `az ml component update` only changes a few fields such as `description` and `display_name`.

A pipeline job references components by file or by registered name, and binds data between steps:

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/pipelineJob.schema.json
type: pipeline
display_name: churn-training
settings:
  default_compute: azureml:cpu-cluster
inputs:
  raw_data:
    type: uri_folder
    path: azureml:sales-transactions:3
outputs:
  trained_model:
    type: mlflow_model
jobs:
  prep:
    type: command
    component: ./prep.yml
    inputs:
      raw: ${{parent.inputs.raw_data}}
  train:
    type: command
    component: azureml:train_churn_model@latest
    inputs:
      training_data: ${{parent.jobs.prep.outputs.clean_data}}
      learning_rate: 0.05
    outputs:
      model_output: ${{parent.outputs.trained_model}}
```

| Expression | Binds |
| --- | --- |
| `${{inputs.x}}`, `${{outputs.x}}` | Inside a component `command`: the value or path of its own input or output |
| `${{parent.inputs.x}}` | A step input to a pipeline-level input |
| `${{parent.jobs.step.outputs.y}}` | A step input to another step's output (this also orders the steps) |
| `${{parent.outputs.x}}` | A step output to a pipeline-level output |

`settings.default_compute` applies to every step that doesn't set its own `compute`; use `azureml:serverless` for serverless compute.

> **Exam trap.** A step that reads fresh data from a URL but shows "reused" and finishes in seconds is reusing a previous result: set `is_deterministic: false` on that component.

<!-- section: registries | objectives: 1.2.4 -->
## Sharing assets across workspaces by using registries

An Azure Machine Learning **registry** is an organization-level catalog of **models, environments, components and data assets** that any workspace in a supported region can use. Two scenarios: cross-workspace MLOps (train in `dev`, deploy in `test` and `prod` while keeping lineage to the training job) and sharing assets between teams. Compute, jobs and endpoints stay in workspaces: a job that uses a registry component runs on the workspace's compute with the workspace's data.

```yaml
# registry.yml
name: contoso_ml_registry
location: westeurope
replication_locations:
  - location: westeurope
  - location: northeurope
  - location: eastus
```

```bash
az ml registry create --file registry.yml --resource-group rg-ml-shared
```

| Rule | Detail |
| --- | --- |
| Regions | The primary `location` is also listed in `replication_locations`. The primary region can't change; other regions can be updated |
| Workspaces | A workspace can use the registry only if its region is one of the registry's regions |
| Name | 2 to 32 characters (letters, digits, `_` and `-`, starting with a letter or digit), unique in the Microsoft Entra tenant, can't be changed |
| Resources created | One storage account per region and one container registry replicated to every region |
| Image pull | The registry's managed identity has AcrPull on its container registry; workspace computes receive a scoped token, not direct access |

The same CLI commands target a registry with `--registry-name` instead of a workspace:

```bash
az ml environment create --file churn-train-env.yml --registry-name contoso_ml_registry
az ml component create --file train.yml --registry-name contoso_ml_registry
az ml model create --name churn-model --version 1 --type mlflow_model \
  --path ./artifacts/model/ --registry-name contoso_ml_registry

# Copy a model already registered in a workspace (name and version in the registry are required)
az ml model share --name churn-model --version 7 --registry-name contoso_ml_registry \
  --share-with-name churn-model --share-with-version 7
```

Registry assets are referenced with registry URIs, for example in an online deployment:

```yaml
model: azureml://registries/contoso_ml_registry/models/churn-model/versions/7
environment: azureml://registries/contoso_ml_registry/environments/churn-train-env/versions/4
```

In the Python SDK, create a second `MLClient` with `registry_name` and `registry_location` instead of a workspace name. A registry only holds named assets, and a registry asset can only reference assets that already exist in a registry: create the environment in the registry (or use a curated one) before the component that uses it.

Permissions on registries:

| Need | Role |
| --- | --- |
| Browse and use registry assets in a workspace | Reader, or a custom role with `registries/read` and `registries/assets/read` |
| Publish and delete assets, not manage the registry | AzureML Registry User, or a custom role adding `registries/assets/write` and `registries/assets/delete` |
| Create, update or delete registries | Contributor or Owner on the resource group or subscription |

| Requirement | Answer |
| --- | --- |
| Promote the validated model from the dev workspace to prod with its lineage | Share or create the model in a registry, deploy from the registry URI in prod |
| One training component used by several teams' workspaces | Create the component and its environment in a registry |
| Users must publish assets but must not delete the registry | AzureML Registry User, not Contributor |
| A new workspace in another region can't see the registry assets | Add that region to the registry's replication locations |

> **Exam trap.** Contributor on a registry also allows deleting the registry itself. When the requirement is "manage assets only", answer AzureML Registry User or a custom role with the `registries/assets/*` permissions.

<!-- section: key-points -->
## Key points

- `uri_file` for one file, `uri_folder` for a folder, `mltable` for tables defined by an `MLTable` file; the type of a data asset name can't change.
- Data asset versions are immutable and can't be deleted: archive them, or create a new version for a wrong path.
- Environments come from an image, a build context or a conda file plus image; only `description` and `tags` can be updated.
- Curated environments: `AzureML-` prefix in the CLI, referenced from `azureml://registries/azureml/...`.
- Components: `name`, `command` and `environment` required; `is_deterministic` defaults to `true` (reuse); bind steps with `${{parent.jobs.<step>.outputs.<name>}}`.
- Registries share models, environments, components and data across workspaces in their regions; add `--registry-name` to the usual commands; primary region and name are permanent.
