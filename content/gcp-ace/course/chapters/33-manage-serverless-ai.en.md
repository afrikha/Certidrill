This chapter covers the operational side of serverless and AI workloads: rolling out new Cloud Run revisions, splitting traffic between versions (Cloud Run, Cloud Run functions and GKE), tuning Cloud Run autoscaling, attaching GPUs and TPUs, deploying agents to Agent Runtime on Gemini Enterprise Agent Platform, managing notebooks in Agent Platform Workbench and BigQuery, and running Cloud Workstations. Expect "which flag" and "which role" questions.

<!-- section: cloud-run-revisions | objectives: 3.1.10 -->
## Deploying new versions of a Cloud Run service

Every deployment or configuration change of a Cloud Run service creates a new, immutable **revision**. By default the newest healthy revision receives 100 % of the traffic.

```bash
gcloud run deploy cart --image=europe-west1-docker.pkg.dev/example-prod/shop/cart:1.5 \
  --region=europe-west1                                   # new revision, gets the traffic
gcloud run deploy cart --source . --region=europe-west1    # build with Cloud Build and buildpacks
gcloud run services update cart --update-env-vars=FEATURE_X=on --region=europe-west1   # also a new revision
gcloud run deploy cart --image=europe-west1-docker.pkg.dev/example-prod/shop/cart:1.6 \
  --no-traffic --tag=green --region=europe-west1          # deploy, serve nothing yet
gcloud run revisions list --service=cart --region=europe-west1
```

`--no-traffic` plus `--tag` gives the new revision a test URL such as `https://green---cart-abc123.a.run.app` while users stay on the current revision.

**Cloud Run functions** are deployed with the same command group: `gcloud run deploy FUNCTION --source . --function ENTRY_POINT --base-image python314 --region REGION`. Functions created through the Cloud Functions v2 API can still be updated with `gcloud functions deploy`. Deployers need Cloud Run Source Developer (`roles/run.sourceDeveloper`), Service Usage Consumer and Service Account User on the service identity.

> **Exam trap.** Once traffic has been split or pinned to a revision, later deployments keep that split: the new revision gets **no** traffic. Use `--to-latest` (or the console's "Serve this revision immediately") to send traffic to the newest revision again.

<!-- section: traffic-splitting | objectives: 3.1.11 -->
## Traffic splitting: Cloud Run, Cloud Run functions and GKE

```bash
gcloud run services update-traffic cart --region=europe-west1 \
  --to-revisions=cart-00012-abc=90,cart-00013-xyz=10       # canary: percentages total 100
gcloud run services update-traffic cart --region=europe-west1 --to-tags=green=50
gcloud run services update-traffic cart --region=europe-west1 --to-latest
gcloud run services update-traffic cart --region=europe-west1 \
  --to-revisions=cart-00012-abc=100                        # rollback, immediate
gcloud run services update-traffic cart --region=europe-west1 --remove-tags=green
```

| Need | Command |
| --- | --- |
| Test a new version privately, no user traffic | `deploy --no-traffic --tag=NAME`, then call the tagged URL |
| Gradual rollout | `--to-revisions REV=5`, then 25, 50, 100 |
| Instant rollback | `--to-revisions OLD_REV=100` (no health check is re-run) |
| Always follow the newest revision | `--to-latest` |

In `--to-revisions`, the keyword `LATEST` stands for the newest ready revision, current or future (`--to-revisions=LATEST=10` keeps 10 % floating to each new revision). If the assignments total less than 100 %, the revisions named get exactly their share and the other revisions that currently serve traffic are scaled up or down proportionally to fill the rest.

A Cloud Run function **is** a Cloud Run service, so its revisions and traffic are managed with the same `gcloud run services update-traffic` command (and the console's Manage traffic page). For functions deployed with `gcloud functions deploy`, `--serve-all-traffic-latest-revision` sends all traffic back to the latest revision.

**GKE** has no revisions: run two Deployments (for example `cart-v1` and `cart-v2`) behind two Services and split with Gateway API weights on an `HTTPRoute`. Weights are relative, are not adjusted for health or capacity, and are supported on single-cluster Gateways (not on the classic `gke-l7-gxlb` class).

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: cart
  namespace: shop
spec:
  parentRefs:
  - name: external-http
  rules:
  - backendRefs:
    - name: cart-v1
      port: 80
      weight: 90
    - name: cart-v2
      port: 80
      weight: 10
```

Without a Gateway, a rough split is possible by running both Deployments behind **one** Service selecting a shared label: the split follows the replica ratio (9 v1 Pods and 1 v2 Pod ≈ 10 %).

<!-- section: cloud-run-autoscaling | objectives: 3.1.12 -->
## Configuring Cloud Run autoscaling

Cloud Run scales on request concurrency and CPU utilization (default target 60 % each), scales from zero only when a request or event arrives, and keeps idle instances up to 15 minutes. It does not scale on memory.

```bash
gcloud run services update cart --region=europe-west1 --min=2 --max=50   # service level, no new revision
gcloud run services update cart --region=europe-west1 --concurrency=40
gcloud run deploy cart --image=IMAGE_URL --region=europe-west1 \
  --min-instances=1 --max-instances=20                                   # revision level
gcloud run services update cart --region=europe-west1 --min=default      # clear the minimum
gcloud run services update cart --region=europe-west1 --cpu-boost --no-cpu-throttling
```

| Setting | Default and rules |
| --- | --- |
| Maximum instances | 100 per revision by default; Google recommends the service-level `--max`, which applies immediately and is shared among revisions by traffic percentage; the lower of service and revision values wins |
| Minimum instances | 0 by default (scale to zero); `--min` at service level (no new revision) or `--min-instances` per revision; idle minimum instances are billed (at a lower rate with request-based billing) |
| Concurrency | Default 80 per instance (80 × vCPU when created with `gcloud` or Terraform), maximum 1,000; set 1 when each request uses most of the CPU or memory or the code is not thread-safe |
| Manual scaling | `--scaling=N` fixes the instance count; `--scaling=auto` returns to autoscaling |
| Startup CPU boost | `--cpu-boost` gives extra CPU during startup (faster cold starts) |
| Instance-based billing | `--no-cpu-throttling`: CPU stays allocated outside requests (background work) |

Use `--min` to avoid cold starts, `--max` to cap cost or protect a database's connection limit. A canary revision returning "no available instances" has hit its traffic share of the service maximum: raise `--max`.

> **Exam trap.** Service-level minimum instances are not allocated to **tagged** revisions that receive no traffic; revision-level `--min-instances` are. And a minimum above zero costs money even with no traffic.

<!-- section: gpus-tpus | objectives: 3.1.13 -->
## Attaching GPUs and TPUs

**Compute Engine GPUs**: accelerator-optimized machine types (A2, A3, A4, G2, G4...) come with their GPUs; on **N1** general-purpose VMs you attach T4, P4 or V100 GPUs yourself. GPU VMs cannot live migrate, so the host maintenance policy must be `TERMINATE`.

```bash
gcloud compute instances create train-1 --zone=us-east1-d \
  --machine-type=n1-standard-8 --accelerator=type=nvidia-tesla-t4,count=1 \
  --maintenance-policy=TERMINATE --boot-disk-size=100GB \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud
gcloud compute instances create infer-1 --zone=us-central1-a \
  --machine-type=g2-standard-8 --maintenance-policy=TERMINATE \
  --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud      # 1 L4 GPU included
gcloud compute accelerator-types list --filter="zone:us-central1-a"
```

To add a GPU to an existing N1 VM, **stop** it, edit it (console, or the API's `setMachineResources`), set the maintenance policy to terminate, then start it. Check GPU **quota** in the region first, choose a zone that offers the model, use a boot disk of at least 40 GB, and install the NVIDIA drivers (GPU-ready images or the installation script). T4 and P4 reach end of support on 2027-08-01.

**GKE GPUs**: Standard node pool with `--accelerator`; GKE installs the driver when `gpu-driver-version=default` or `latest`. Autopilot provisions GPU nodes from the Pod spec.

```bash
gcloud container node-pools create l4-pool --cluster=ml-cluster --location=us-central1 \
  --node-locations=us-central1-a --machine-type=g2-standard-8 \
  --accelerator=type=nvidia-l4,count=1,gpu-driver-version=default \
  --enable-autoscaling --min-nodes=0 --max-nodes=4
```

```yaml
spec:
  nodeSelector:
    cloud.google.com/gke-accelerator: nvidia-l4
  containers:
  - name: inference
    image: us-central1-docker.pkg.dev/example-ml/serving/llm:3
    resources:
      limits:
        nvidia.com/gpu: 1
```

**Cloud Run GPUs**: one GPU per instance (`nvidia-l4` or `nvidia-rtx-pro-6000`), instance-based billing, minimum 4 CPU and 16 GiB for L4; still scales to zero. Zonal redundancy is on by default (costs more); `--no-gpu-zonal-redundancy` is cheaper with best-effort failover. New projects automatically get an L4 quota of 3 GPUs per region at the first deployment, with zonal redundancy **off** only; GPUs with zonal redundancy need a quota request.

```bash
gcloud run deploy llm --image=us-central1-docker.pkg.dev/example-ml/serving/llm:3 \
  --region=us-central1 --gpu=1 --gpu-type=nvidia-l4 --cpu=4 --memory=16Gi \
  --no-cpu-throttling --max=3
```

**TPUs** (Google's accelerators for large TensorFlow, JAX and PyTorch training and serving):

| Where | How |
| --- | --- |
| Compute Engine | `gcloud compute instances create NAME --machine-type=ct6e-standard-8t --image-project=ubuntu-os-accelerator-images --image-family=FAMILY --maintenance-policy=TERMINATE --threads-per-core=1 --zone=ZONE` (Spot and Flex-start provisioning also available) |
| Cloud TPU API (existing workflows) | `gcloud compute tpus tpu-vm create NAME --zone=ZONE --accelerator-type=TYPE --version=RUNTIME`; this API only gets fixes and does not support TPU7x and later |
| GKE Standard | `gcloud container node-pools create` with a TPU `--machine-type` and `--tpu-topology` for multi-host slices |
| GKE Pods | Node selectors `cloud.google.com/gke-tpu-accelerator` (for example `tpu-v6e-slice`) and `cloud.google.com/gke-tpu-topology`, request `google.com/tpu` chips |

> **Exam tip.** "Add one T4 to an existing VM" means N1, stop first, `TERMINATE`. A G2 or A3 VM already has its GPUs: to change the count, move to another machine type of the same series (where allowed) or create a new VM.

<!-- section: agent-runtime | objectives: 3.1.14 -->
## Deploying an agent to Agent Runtime

**Agent Runtime** (formerly Vertex AI Agent Engine) is the managed runtime of Gemini Enterprise Agent Platform for deploying, operating and scaling agents. The API resource is still named `ReasoningEngine`: `projects/PROJECT/locations/LOCATION/reasoningEngines/ID`.

Setup:

| Item | Detail |
| --- | --- |
| APIs | `aiplatform.googleapis.com` (plus Cloud Storage, Logging, Monitoring, Cloud Trace, Telemetry, Resource Manager) |
| Role to deploy and use | Agent Platform User (`roles/aiplatform.user`) |
| Staging bucket | Required when deploying an in-memory agent object (Storage Admin on it); not needed for source-file deployments |
| Custom service account | Service Account User on it; Token Creator if it is in another project |
| Default identity | The AI Platform Reasoning Engine Service Agent (`service-PROJECT_NUMBER@gcp-sa-aiplatform-re.iam.gserviceaccount.com`), shared by all agents of the project: prefer an agent identity or a dedicated service account |
| Frameworks | Agent Development Kit (ADK), LangChain, LangGraph, AG2, LlamaIndex, custom; any language through a container |

Deployment sources: an agent object from the Agent Platform SDK (notebooks), local source files, a Dockerfile, a container image in Artifact Registry (needs Artifact Registry Reader), a public Git repository or a Developer Connect repository.

```bash
gcloud services enable aiplatform.googleapis.com storage.googleapis.com --project=example-ml
pip install "google-cloud-aiplatform[agent_engines,adk]"
```

```text
import vertexai
client = vertexai.Client(project="example-ml", location="us-central1")
remote_agent = client.agent_engines.create(
    agent=app,
    config={
        "requirements": ["google-cloud-aiplatform[agent_engines,adk]"],
        "staging_bucket": "gs://example-ml-staging",
        "display_name": "support-agent",
        "min_instances": 1,
        "max_instances": 10,
    },
)
```

Newer pages of the SDK documentation write the same calls as `client.runtimes.create`, `list`, `get`, `update` and `delete(force=True)`. Deployed agents appear on the Agent Platform **Deployments** page of the console, with metrics and API URLs; use `force=True` to delete an agent together with child resources such as sessions and memories. Secrets are passed as environment variables referencing Secret Manager (`roles/secretmanager.secretAccessor` for the agent's identity).

<!-- section: notebooks | objectives: 3.1.15 -->
## Managing notebooks in Agent Platform Workbench and BigQuery

**Agent Platform Workbench instances** (formerly Vertex AI Workbench) are JupyterLab environments on a Compute Engine VM that you manage: machine type, GPU, disks, network.

```bash
gcloud services enable notebooks.googleapis.com
gcloud workbench instances create ds-anna --location=us-central1-b \
  --machine-type=n1-standard-8 --accelerator-type=NVIDIA_TESLA_T4 \
  --accelerator-core-count=1 --install-gpu-driver
gcloud workbench instances update ds-anna --location=us-central1-b \
  --metadata=idle-timeout-seconds=7200
gcloud workbench instances stop ds-anna --location=us-central1-b
gcloud workbench instances start ds-anna --location=us-central1-b
```

| Fact | Detail |
| --- | --- |
| Role to create and manage | Notebooks Admin (`roles/notebooks.admin`) |
| Access mode | Through a service account, or **single user** (one email; groups not supported) |
| Idle shutdown | On by default after **180 minutes** without kernel activity; metadata `idle-timeout-seconds` (10 to 1,440 minutes in the console) |
| Stopped instance | No compute charges; other charges (such as disks) can remain |
| Change machine type or GPU | After creation, with `gcloud workbench instances update --machine-type` / `--accelerator-type` or in the console; the instance must be **shut down** first, and switching between G2 and non-G2 machine types isn't supported |
| Scheduled runs | Executions and schedules (`gcloud workbench schedules`) |

**BigQuery notebooks** are Colab Enterprise notebooks in BigQuery Studio, with SQL, Python and visualization cells, stored as code assets in a region you choose (not changeable afterwards). They run on Colab Enterprise runtimes (Compute Engine VMs allocated to one user) in the same region as the notebook, from a default runtime or a runtime template. Notebook features are available only in the console.

| Need | Roles |
| --- | --- |
| Create and run notebooks | BigQuery Studio User (`roles/bigquery.studioUser`) |
| Edit and run existing notebooks | BigQuery Job User, BigQuery Read Session User, Notebook Runtime User (`roles/aiplatform.notebookRuntimeUser`), Code Editor (`roles/dataform.codeEditor`) |
| View and run | Same, with Code Viewer (`roles/dataform.codeViewer`) instead of Code Editor |
| Owner of every notebook of the project | Dataform Admin |

Required APIs: BigQuery, Dataform and Compute Engine.

> **Exam tip.** "Data scientists forget to stop notebook VMs" points to Workbench idle shutdown. "Analysts want a notebook next to their BigQuery tables with no VM to manage" points to BigQuery Studio notebooks.

<!-- section: workstations | objectives: 3.1.16 -->
## Managing Cloud Workstations

Cloud Workstations provides managed development environments in your VPC, so that source code stays off laptops.

| Resource | Defines |
| --- | --- |
| Workstation cluster | One region and one VPC network/subnet (one cluster per region at least) |
| Workstation configuration | Template: machine type (default `e2-standard-4`), container image (default Code OSS base editor, or IntelliJ and other predefined IDEs, or a custom image from Artifact Registry), persistent home disk (`/home`, default 200 GB, reclaim policy Delete or Retain), idle and running timeouts, quick-start pool, GPUs, service account, public IP or not |
| Workstation | One developer's instance; the VM is deleted when it stops, the persistent disk is kept |

```bash
gcloud workstations clusters create dev-eu --region=europe-west1 \
  --network=projects/example-dev/global/networks/dev-vpc \
  --subnetwork=projects/example-dev/regions/europe-west1/subnetworks/dev-eu
gcloud workstations configs create java-ide --cluster=dev-eu --region=europe-west1 \
  --machine-type=e2-standard-8 --container-predefined-image=intellij \
  --idle-timeout=3600 --pd-disk-size=200 --disable-public-ip-addresses
gcloud workstations create anna-ws --cluster=dev-eu --config=java-ide --region=europe-west1
gcloud workstations start anna-ws --cluster=dev-eu --config=java-ide --region=europe-west1
gcloud workstations ssh anna-ws --cluster=dev-eu --config=java-ide --region=europe-west1
```

| Role | Grants |
| --- | --- |
| Cloud Workstations Admin (`roles/workstations.admin`) | Create and update clusters and configurations |
| Cloud Workstations Creator (`roles/workstations.workstationCreator`), on the project or a configuration | Create workstations from a configuration and use them |
| Cloud Workstations User (`roles/workstations.user`), on one workstation | Use an existing workstation (creators get it on their own) |
| Cloud Workstations Operation Viewer (`roles/workstations.operationViewer`) | Required together with User or Creator |

`--idle-timeout` and `--running-timeout` are in seconds (`gcloud` default 7,200 each; 0 disables).

> **Exam trap.** A developer who has Workstations User on one workstation cannot create a new one: creating requires Workstation Creator on the configuration, plus Operation Viewer.

<!-- section: key-points -->
## Key points

- Each Cloud Run deploy or config change is a new revision; `--no-traffic --tag` stages one, `update-traffic --to-revisions/--to-tags/--to-latest` moves traffic.
- Cloud Run functions are Cloud Run services; GKE splits traffic with HTTPRoute weights.
- Cloud Run scaling: `--min`/`--max` at service level, `--min-instances`/`--max-instances` per revision, concurrency 80 by default (max 1,000).
- GPUs: N1 plus `--accelerator` and `TERMINATE`, or G2/A3 machine types; GKE `nvidia.com/gpu`; Cloud Run `--gpu=1 --gpu-type`; TPUs via Compute Engine machine types or GKE TPU node pools.
- Agent Runtime deploys ADK, LangChain or container agents with `roles/aiplatform.user`; resources are `reasoningEngines`.
- Workbench: `roles/notebooks.admin`, idle shutdown 180 min; BigQuery notebooks need BigQuery Studio and Dataform roles; Workstations: cluster, configuration, workstation, Creator vs User roles.
