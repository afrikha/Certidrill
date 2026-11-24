A registered model serves predictions through an **endpoint**: a stable URI and authentication in front of one or more **deployments** that hold the model, its code, its environment and its compute. Online endpoints answer each request in real time; batch endpoints run an asynchronous scoring job over files. Exam questions ask which endpoint type fits a workload, which YAML key or CLI flag is missing, what an error code means, and how to move traffic to a new model version without downtime.

<!-- section: endpoint-types | objectives: 2.3.1 -->
## Choosing an endpoint type

| Requirement | Answer |
| --- | --- |
| Low-latency answer per request (web app, API) | **Online endpoint** |
| Score large volumes of files on a schedule or on demand; results written to storage | **Batch endpoint** |
| No infrastructure to manage, managed network isolation, cost per deployment | **Managed** online endpoint |
| Existing Kubernetes cluster (AKS or Azure Arc-enabled) managed by your team | **Kubernetes** online endpoint |
| Shadow a new model with copies of live traffic | Managed online endpoint (mirroring isn't supported on Kubernetes) |

| | Managed online endpoint | Kubernetes online endpoint |
| --- | --- | --- |
| Node provisioning, updates, removal | Managed by Azure | Your responsibility |
| Virtual network | Managed network isolation | Your responsibility |
| Mirrored traffic | Supported | Not supported |
| Cost view | Per endpoint and deployment | Per cluster |
| Authentication | `key`, `aml_token`, `aad_token` | `key`, `aml_token` |

Online endpoint authentication (`auth_mode` in the endpoint YAML):

| Mode | Lifetime | Notes |
| --- | --- | --- |
| `key` | Keys don't expire; rotate them (primary and secondary) | Simplest for an external client |
| `aml_token` | Short-lived; refresh after `refreshAfterTimeUtc` | Obtained with `az ml online-endpoint get-credentials` |
| `aad_token` | Microsoft Entra ID token lifetime | **Managed online endpoints only**; the caller needs `Microsoft.MachineLearningServices/workspaces/onlineEndpoints/score/action` (included in AzureML Data Scientist) |

**Batch endpoints** accept only Microsoft Entra authentication: a user, a service principal or a managed identity presents a token, and the batch job runs under that identity, which needs permissions to create jobs and read or write the data.

> **Exam trap.** "No keys to store or rotate, access controlled by Azure RBAC" on an online endpoint means `auth_mode: aad_token` and a role with `score/action` for the caller. It works on managed online endpoints, not on Kubernetes online endpoints.

<!-- section: online-deployment | objectives: 2.3.1 -->
## Deploying to a managed online endpoint

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineEndpoint.schema.json
name: churn-api
auth_mode: aad_token
```

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/managedOnlineDeployment.schema.json
name: blue
endpoint_name: churn-api
model: azureml:churn-classifier:4
code_configuration:
  code: ./onlinescoring
  scoring_script: score.py
environment: azureml:churn-inference-env:2
instance_type: Standard_DS3_v2
instance_count: 3
app_insights_enabled: true
request_settings:
  request_timeout_ms: 10000
  max_concurrent_requests_per_instance: 2
```

```bash
az ml online-endpoint create --file endpoint.yml
az ml online-deployment create --file blue-deployment.yml --all-traffic
```

- The **scoring script** has `init()` (runs once when the container starts or is updated: load the model) and `run()` (runs on every request).
- **MLflow models** use no-code deployment: omit `code_configuration` and `environment`; a curated environment and a generated scoring script are used, and the signature produces the swagger.
- `instance_count`: at least **3** for high availability. Quota is reserved as `ceil(1.2 × instances) × cores of the SKU`: the extra 20 % is kept for upgrades.
- `request_settings`: `request_timeout_ms` defaults to 5,000 (maximum 180,000); `max_concurrent_requests_per_instance` defaults to 1. With the Azure Machine Learning inference server or inference images, a value above 1 also needs the model to handle concurrent requests: pass `WORKER_COUNT` as an environment variable. `max_queue_wait_ms` is deprecated: raise `request_timeout_ms` to cover queue delays.
- Probes (`liveness_probe`, `readiness_probe`): `initial_delay` 10 s, `period` 10 s, `timeout` 2 s, `failure_threshold` 30 by default. Raise `initial_delay` for a model that loads slowly.
- `egress_public_network_access: disabled` (legacy network isolation method) limits the deployment to the workspace resources secured in the virtual network and downloads the model, code and images through private endpoints; it can't be changed after creation. Microsoft strongly recommends a **workspace managed virtual network** instead; with it, don't set this flag. Inbound scoring goes through the workspace private endpoint.
- **Autoscale** uses Azure Monitor autoscale rules on the deployment: metric based (CPU above 70 %) or schedule based (business hours), or both.

> **Exam tip.** `--all-traffic` on `az ml online-deployment create` sends 100 % of the endpoint's traffic to the new deployment. Without it, a new deployment gets 0 %: the endpoint keeps serving through the existing deployments.

<!-- section: batch-deployment | objectives: 2.3.1 -->
## Deploying to a batch endpoint

Batch endpoints run on **compute clusters** (or Kubernetes clusters attached with the CLI or SDK). A cluster with `--min-instances 0` costs nothing until a job is submitted. One deployment is the **default**: it runs when the endpoint is invoked without a deployment name.

```yaml
$schema: https://azuremlschemas.azureedge.net/latest/modelBatchDeployment.schema.json
name: churn-batch-v4
endpoint_name: churn-batch
type: model
model: azureml:churn-classifier:4
compute: azureml:batch-cluster
resources:
  instance_count: 2
settings:
  max_concurrency_per_instance: 2
  mini_batch_size: 10
  output_action: append_row
  output_file_name: predictions.csv
  retry_settings:
    max_retries: 3
    timeout: 30
  error_threshold: -1
  logging_level: info
```

| Setting | Default | Meaning |
| --- | --- | --- |
| `mini_batch_size` | 10 | **Files** passed to each `run()` call (work is distributed at file level) |
| `max_concurrency_per_instance` | 1 | Parallel scoring processes per node |
| `output_action` | `append_row` | `append_row` writes predictions to `output_file_name`; `summary_only` lets the scoring script write its own outputs |
| `retry_settings` | 3 retries, 30 s | Per mini-batch retries and timeout |
| `error_threshold` | -1 | Failed files tolerated before the job fails; -1 ignores failures |

```bash
az ml batch-endpoint create --file endpoint.yml --name churn-batch
az ml batch-deployment create --file deployment.yml --endpoint-name churn-batch --set-default
az ml batch-endpoint invoke --name churn-batch \
  --input azureml://datastores/workspaceblobstore/paths/churn/2026-11/ --input-type uri_folder \
  --output-path azureml://datastores/workspaceblobstore/paths/churn-scores/ \
  --set output_file_name=predictions_2026_11.csv
az ml batch-endpoint update --name churn-batch --set defaults.deployment_name=churn-batch-v5
```

- MLflow models need no scoring script or environment; custom models need `code_configuration` with a batch scoring script and an `environment`.
- Inputs: files in Azure Storage, folders, registered data assets. Outputs go only to blob-based datastores, by default the workspace blob store in a folder named after the job. An existing output file makes the job **fail**: use a unique file name.
- Per invocation you can override `--mini-batch-size`, `--instance-count`, `--deployment-name`.
- `type: pipeline` deploys a **pipeline component** (for example preprocessing then scoring) behind the same endpoint.

> **Exam trap.** A batch endpoint doesn't return predictions in the HTTP response: invoking it creates a job and returns its name. The results are files in a datastore once the job completes.

<!-- section: test-troubleshoot | objectives: 2.3.2 -->
## Testing and troubleshooting endpoints

Test a specific deployment before it receives traffic:

```bash
az ml online-endpoint invoke --name churn-api --deployment-name green \
  --request-file sample-request.json
az ml online-endpoint get-credentials --name churn-api
az ml online-deployment get-logs --name green --endpoint-name churn-api --lines 100
az ml online-deployment get-logs --name green --endpoint-name churn-api --container storage-initializer
```

REST clients reach a deployment directly with the header `azureml-model-deployment: green`, which bypasses traffic rules.

| Debug option | Use |
| --- | --- |
| Azure Machine Learning inference HTTP server (`azureml-inference-server-http`) | Runs `score.py` locally without Docker: fastest loop for script errors |
| Local endpoint: `az ml online-deployment create ... --local` | Builds and runs the container in local Docker. CLI and SDK only; one deployment per endpoint; no traffic rules, authentication or probes |
| `get-logs` | Inference server console output of a deployment; `--container storage-initializer` shows whether model and code downloaded |
| Log Analytics tables | Request, console and container event logs (see the monitoring chapter) |

| Deployment error | Typical cause | Fix |
| --- | --- | --- |
| `ImageBuildFailure` | Conda dependencies fail to resolve, ACR authorization, build timeout | Read the build log, pin package versions, `az ml workspace sync-keys` for ACR keys |
| `OutOfQuota` | Not enough cores, or no capacity for the VM size in the region | Delete unused deployments, request quota, choose another SKU or region |
| `BadArgument` | Model in another workspace, image or model can't be downloaded | Register the model in the same workspace; the identity needs Storage Blob Data Reader and AcrPull |
| `ResourceNotReady` | `score.py` crashes in `init()`, missing package, probe fails beyond its threshold | `get-logs`, test locally, raise probe delays or use a larger SKU |
| `ResourceNotFound` | Wrong name or path; private registry | Check references; grant AcrPull to the endpoint identity |
| `OperationCanceled` | Another operation took priority or held a lock | Retry after a minute |

| Scoring status | Meaning on a managed online endpoint |
| --- | --- |
| 401 | Missing, expired or wrong key or token, or no `score/action` permission |
| 404 | No deployment with positive traffic weight |
| 408 | Request exceeded `request_timeout_ms` |
| 424 | The model container returned a non-200 response: read `ms-azureml-model-error-statuscode` and `ms-azureml-model-error-reason` |
| 429 | Too many pending requests (at most `2 × max_concurrent_requests_per_instance × instance_count` process in parallel; the excess is rejected; check that `WORKER_COUNT` is passed) or requests per second over the endpoint limits: back off, scale out |
| 500 | Platform infrastructure failure |

> **Exam trap.** A 404 right after a successful deployment usually means the new deployment has 0 % traffic and no other deployment has any: set traffic or invoke with `--deployment-name`. A 424 is the model's own error, not the platform's.

<!-- section: safe-rollout | objectives: 2.3.3 -->
## Progressive rollout and safe rollback

The **blue-green** pattern keeps the current model (`blue`) serving while a new deployment (`green`) is created under the same endpoint, tested, then given traffic step by step:

```bash
az ml online-deployment create --name green --endpoint-name churn-api --file green-deployment.yml
az ml online-endpoint invoke --name churn-api --deployment-name green --request-file sample-request.json
az ml online-endpoint update --name churn-api --mirror-traffic "green=10"
az ml online-deployment get-logs --name green --endpoint-name churn-api
az ml online-endpoint update --name churn-api --mirror-traffic "green=0"
az ml online-endpoint update --name churn-api --traffic "blue=90 green=10"
az ml online-endpoint update --name churn-api --traffic "blue=0 green=100"
az ml online-deployment delete --name blue --endpoint-name churn-api --yes --no-wait
```

| Stage | Live users affected | Purpose |
| --- | --- | --- |
| Create `green` with 0 % traffic | None | Deployment succeeds and is healthy |
| Invoke `green` directly | None | Functional test of the new model |
| Mirror a percentage to `green` | None: clients still get `blue`'s answers | Validate latency and errors on real traffic; `green`'s metrics and logs are recorded |
| Split live traffic (`blue=90 green=10`) | 10 % of requests | Canary: compare metrics on real answers |
| `blue=0 green=100`, then delete `blue` | All | Complete the rollout |

Mirroring rules: managed online endpoints only; one mirrored deployment per endpoint; at most **50 %** mirrored; a deployment receives either live or mirrored traffic, not both; requests sent to a named deployment aren't mirrored. Live traffic percentages must add up to 100 % (or 0 % to disable traffic).

**Rollback** is a traffic change, not a redeployment: as long as `blue` still exists, `--traffic "blue=100 green=0"` restores the previous model immediately. Keep the old deployment (scaled down with `az ml online-deployment update --name blue --set instance_count=1` if needed) until the new one has proved itself, and keep the previous model version registered. Deleting one deployment doesn't affect the others.

> **Exam trap.** Mirroring tests the new deployment with **no** impact on responses; a 90/10 split exposes 10 % of users to the new model. "Validate with production traffic without affecting users" is mirroring; "expose a small share of users first" is a traffic split.

<!-- section: key-points -->
## Key points

- Online for per-request latency, batch for asynchronous scoring of files into storage; managed online unless the team runs its own Kubernetes.
- `aad_token` works on managed online endpoints only; batch endpoints use Microsoft Entra tokens only.
- MLflow models deploy without scoring script or environment, online and batch.
- New online deployments get 0 % traffic unless `--all-traffic`; test them with `--deployment-name` or the `azureml-model-deployment` header.
- Batch: `mini_batch_size` counts files, `error_threshold -1` ignores failures, outputs must use a unique file name.
- Debug with the inference HTTP server, then `--local`, then `get-logs`; 424 = model error, 429 = overload, 404 = no traffic.
- Blue-green: mirror (max 50 %, one deployment) then split, keep blue for an instant rollback by traffic.
