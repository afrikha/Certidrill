Most Google Cloud resources in a real company are created from code, not by clicking in the console. The exam expects you to know which infrastructure as code (IaC) tool fits a stated need (Terraform, Infrastructure Manager, Config Connector, Helm, Fabric FAST), the basic workflow and commands of each, and where Google's AI-assisted tools (Gemini Cloud Assist, Application Design Center, Gemini CLI, Google Antigravity) help you design and deploy. Questions are practical: "which tool, which command, what happens next".

<!-- section: iac-landscape | objectives: 2.4.1 -->
## Choosing an infrastructure as code tool

| Requirement | Tool |
| --- | --- |
| Declarative, multi-cloud, the Google-recommended IaC tool for Google Cloud resources | Terraform with the `google` provider |
| Run Terraform as a managed Google Cloud service (no Terraform workstation, state and logs kept by Google) | Infrastructure Manager |
| Manage Google Cloud resources (buckets, Pub/Sub topics, Cloud SQL...) as Kubernetes objects with `kubectl`, continuously reconciled | Config Connector |
| Package, version and install a Kubernetes application (Deployments, Services, ConfigMaps) with parameters | Helm |
| Build a complete, enterprise-grade organization (hierarchy, IAM, networking, security, project factory) from a Google-maintained reference design | Fabric FAST |
| Design an application visually or in natural language, then deploy it from approved templates | Application Design Center |

> **Exam trap.** Deployment Manager is not a correct answer for new work: it reached end of support on 2026-03-31 (extensions end 2027-03-31), new customers can't enable its API since 2026-06-30, and the service is turned down after 2027-06-30. Google's replacement path is Terraform, usually through Infrastructure Manager; the DM Convert tool converts Deployment Manager configurations and templates into Terraform configurations and state.

IaC is preferred over console clicks when the stem says "repeatable", "consistent across environments", "reviewed in a pull request", "recreate the environment quickly" or "avoid configuration drift".

<!-- section: terraform | objectives: 2.4.1 -->
## Terraform and Infrastructure Manager

Terraform describes resources in HCL files; the `google` provider calls the Google Cloud APIs. The workflow is always the same:

```bash
terraform init      # download the providers, configure the backend
terraform plan      # show what would change, change nothing
terraform apply     # create or update the resources
terraform destroy   # delete everything this configuration manages
```

Terraform records what it manages in a **state file**. On a team, keep it in a Cloud Storage bucket with the `gcs` backend, not on a laptop:

```text
terraform {
  backend "gcs" {
    bucket = "example-corp-tfstate"
    prefix = "prod/network"
  }
}
```

Google's recommendations for the state bucket: enable **Object Versioning** (recover an earlier state; add a lifecycle rule to delete old versions), uniform bucket-level access, public access prevention enforced, and only a few administrators with `roles/storage.admin`. When you move an existing local state to the bucket, run `terraform init -migrate-state`.

Authentication for Terraform on a workstation uses Application Default Credentials: `gcloud auth application-default login` (not needed in Cloud Shell). In pipelines, use a service account through Workload Identity Federation or service account impersonation rather than a downloaded key.

**Infrastructure Manager** is Google's managed service that runs Terraform configurations (blueprints) in an ephemeral Cloud Build environment. For each revision it stores the logs, the configuration, the list of resources and the state file, and it supports preview deployments before applying. Sources can be a Cloud Storage bucket, a Git repository or a local directory.

```bash
gcloud infra-manager deployments apply \
  projects/example-prod/locations/us-central1/deployments/web-stack \
  --service-account=projects/example-prod/serviceAccounts/infra-deployer@example-prod.iam.gserviceaccount.com \
  --local-source="./web-stack" \
  --input-values=project_id=example-prod,region=us-central1
```

> **Exam tip.** "Plan" never changes anything. If a stem asks how to see what a change would do before making it, the answer is `terraform plan` (or an Infrastructure Manager preview), not `apply` in a test project.

<!-- section: config-connector | objectives: 2.4.1 -->
## Config Connector

Config Connector is an open source Kubernetes add-on: it installs Custom Resource Definitions and controllers so that Google Cloud resources are created and managed by applying Kubernetes objects. Its controllers reconcile the declared state against the Google Cloud APIs asynchronously.

```yaml
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: orders-events
  annotations:
    cnrm.cloud.google.com/project-id: example-prod
```

```bash
kubectl apply -f pubsub-topic.yaml
kubectl wait --for=condition=READY pubsubtopics orders-events
kubectl describe pubsubtopics orders-events
```

| Fact | Detail |
| --- | --- |
| Installation | GKE add-on (Standard cluster), manual install, or Config Controller (a hosted Config Connector environment) |
| Enable on an existing cluster | `gcloud container clusters update CLUSTER --update-addons ConfigConnector=ENABLED` |
| Cluster prerequisites | Workload Identity Federation for GKE (`--workload-pool=PROJECT_ID.svc.id.goog`) and GKE system monitoring |
| Identity used to call Google Cloud | A Google service account (bound to the `cnrm-controller-manager` Kubernetes service account with `roles/iam.workloadIdentityUser`), not the user who ran `kubectl apply` |
| Existing resource with the same name | Config Connector **acquires** it and starts managing it |
| Deleting the Kubernetes object | Deletes the Google Cloud resource by default |
| Keep the resource when the object is deleted | Annotation `cnrm.cloud.google.com/deletion-policy: abandon` |
| Add-on version | Managed by GKE and often months behind the latest release; manual install gives the newest version |

> **Exam trap.** Access to Google Cloud through Config Connector is decided by who can create Kubernetes objects in the cluster, because the controller acts with its own service account. Restrict RBAC on the namespaces that hold Config Connector resources.

<!-- section: helm | objectives: 2.4.1 -->
## Helm charts and Artifact Registry

Helm packages a Kubernetes application as a **chart** (templates plus `values.yaml`); each installation is a **release** that you can upgrade or roll back. Artifact Registry stores charts as OCI artifacts in a **Docker-format** repository (Helm 3.8.0 or later); the chart name becomes the image name and the chart version becomes the tag.

```bash
gcloud artifacts repositories create charts --repository-format=docker \
  --location=europe-west1 --description="Helm charts"
helm package ./shop-chart/
gcloud auth print-access-token | helm registry login -u oauth2accesstoken \
  --password-stdin europe-west1-docker.pkg.dev
helm push shop-chart-1.2.0.tgz oci://europe-west1-docker.pkg.dev/example-prod/charts
helm install shop oci://europe-west1-docker.pkg.dev/example-prod/charts/shop-chart \
  --version 1.2.0 --set replicaCount=3
helm upgrade shop oci://europe-west1-docker.pkg.dev/example-prod/charts/shop-chart --version 1.3.0
helm rollback shop 1
```

`helm` runs against the cluster of your current `kubectl` context, so run `gcloud container clusters get-credentials` first. Container Registry is shut down: charts and images go to Artifact Registry.

| Need | Tool |
| --- | --- |
| Install the same application in dev, test and prod with different replica counts | One Helm chart, a values file per environment |
| Create the GKE cluster itself, its node pools and VPC | Terraform (or Config Connector from another cluster) |
| Create a Cloud Storage bucket from the same GitOps repository as the app manifests | Config Connector |

<!-- section: fabric-fast | objectives: 2.4.1 -->
## Fabric FAST

**Cloud Foundation Fabric** is a Google-maintained collection of Terraform modules; **Fabric FAST** is the reference design and Terraform implementation, built on those modules, that turns an empty organization into a production-ready landing zone. It is maintained by Google Cloud's Professional Services engineers.

FAST is organized in **stages**, each a separate Terraform root module, run in order, aligned with security boundaries so that each stage can be owned by a different team. Each stage exposes outputs (a "contract") consumed by the next stages:

| Stage | What it sets up |
| --- | --- |
| 0 — Organization setup | Bootstraps the organization from YAML datasets ("classic", "hardened"): organization policies and IAM, billing account IAM and billing export, folder hierarchy, default projects, CI/CD configuration |
| 1 — VPC Service Controls | Optional VPC Service Controls perimeters |
| 2 — Security | Centralized security projects (Cloud KMS keys, Certificate Authority Service) |
| 2 — Networking | Shared VPC host projects and designs such as hub-and-spoke (VPC Network Peering, VPN, NVAs, Network Connectivity Center) |
| 2 — Project factory | YAML-based creation of application and team projects (Shared VPC attachment, CMEK, service accounts) |
| 3 — Applications and operations | Specialized stages (for example a Google SecOps setup) |

FAST uses YAML **factories** (subnets, firewall rules, projects), groups and service accounts for least privilege, IAM Conditions and Tags, and Workload Identity Federation for its CI/CD pipelines (no service account keys).

> **Exam tip.** "Set up a secure, enterprise-ready organization quickly using Google's opinionated, Terraform-based reference" points to Fabric FAST. "Create one project with a VM" does not: a few Terraform resources or `gcloud` commands are enough.

<!-- section: ai-assisted | objectives: 2.4.2 -->
## AI-assisted planning and implementation

| Tool | What it does | Launch stage (2026-11-27) |
| --- | --- | --- |
| Application Design Center | Design applications on a canvas or by natural-language chat, from templates in shared catalogs; deploy them into projects | GA (since 2025-12-05); some features are Preview: "Validate application designs", composite templates, troubleshooting failed deployments, importing existing Terraform configurations, attaching Security Command Center frameworks, and many individual components |
| Gemini Cloud Assist | Multi-agent assistant in the console panel: design help, generates `gcloud`, `kubectl` and Terraform, IAM help, investigations (root-cause analysis from logs and configs), cost optimization | **Preview** |
| Gemini CLI | Open source AI agent in your local terminal or Cloud Shell (no setup in Cloud Shell); ReAct loop with built-in tools and MCP servers; quotas come with Gemini Code Assist editions or a Gemini API key | Open source tool; no Google Cloud launch stage stated |
| Google Antigravity | Agentic development platform (desktop app and Antigravity CLI) that orchestrates coding agents; Google Cloud customers can run it with their Gemini Enterprise Agent Platform project so inference stays in their cloud boundary | No launch stage stated in the docs |

**Application Design Center** concepts:

| Concept | Meaning |
| --- | --- |
| Space | A team's area for designing templates and deploying applications, isolated from other teams |
| Template | A reusable architecture: standard (components and connections) or composite (contains other templates; Preview) |
| Catalog | A collection of approved templates; each space has a default catalog and can receive shared catalogs |
| Component | A Google component or an imported component (your own Terraform module), grouped as assets, services or workloads |
| Application | A deployed instance of a template: draft, customize, preview (Terraform plan), deploy |
| App-enabled folder / management project | The application management boundary shared with App Hub |

Deploying from Application Design Center provisions the resources with Terraform, shows a preview of the planned changes, and **registers the application in App Hub** automatically. Deployers need Application Admin (`roles/designcenter.applicationAdmin`) or Application Operator (`roles/designcenter.applicationOperator`) on the app-enabled folder or management project; the deployment service account needs roles in each target project. The Terraform can also be downloaded and deployed with your own pipeline.

**Setting up Gemini Cloud Assist** for a project:

```bash
gcloud services enable geminicloudassist.googleapis.com --project=example-prod
gcloud services enable cloudasset.googleapis.com designcenter.googleapis.com \
  appoptimize.googleapis.com apphub.googleapis.com --project=example-prod
gcloud projects add-iam-policy-binding example-prod \
  --member=group:platform-team@example.com --role=roles/geminicloudassist.user
gcloud projects add-iam-policy-binding example-prod \
  --member=group:platform-team@example.com --role=roles/cloudasset.viewer
```

For a folder, enablement is done in the console (Admin for Gemini page) only, and projects added to the folder later must be enabled individually. Gemini Cloud Assist can store data in any Google Cloud location: do not enable it for projects with data residency or CMEK requirements.

> **Exam trap.** A Preview product is never the best answer to a production requirement, and AI tools generate proposals, not approvals. Review generated `gcloud` commands or Terraform (`terraform plan`) before running them, and keep the same IAM least-privilege rules for the identities these tools use.

<!-- section: key-points -->
## Key points

- Terraform: `init`, `plan` (changes nothing), `apply`, `destroy`; team state in a versioned Cloud Storage bucket (`gcs` backend).
- Infrastructure Manager runs Terraform as a managed service with stored state, logs and previews; Deployment Manager is past end of support.
- Config Connector: Google Cloud resources as Kubernetes objects, reconciled continuously; deleting the object deletes the resource unless `deletion-policy: abandon`.
- Helm charts live in Docker-format Artifact Registry repositories, pushed and installed with `oci://` URLs.
- Fabric FAST: Google's Terraform landing zone in sequential stages (organization setup, VPC-SC, security, networking, project factory).
- Application Design Center (GA) deploys templates with Terraform and registers apps in App Hub; Gemini Cloud Assist is Preview.
