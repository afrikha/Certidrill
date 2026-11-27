Every Google Cloud action, whether from the console, a script, a pipeline or an application, is a call to a Google API. This chapter covers the tools an architect recommends for those calls: Cloud Shell and Cloud Code for interactive work, the Google Cloud CLI (`gcloud`, `bq`, and the legacy `gsutil`), local emulators for tests, infrastructure as code with Terraform, and the authentication, quota and retry practices that client libraries apply. Exam questions test the right tool for a task and, above all, the right way to authenticate without service account keys.

<!-- section: cloud-shell-code | objectives: 5.2.1 -->
## Cloud Shell Terminal, Cloud Shell Editor and Cloud Code

**Cloud Shell** is a browser-based terminal on an ephemeral, Google-managed Compute Engine VM (Debian-based), already authenticated as the console user, with the Google Cloud CLI, `kubectl`, Docker, Git, Helm, language runtimes and editors preinstalled.

| Fact | Value |
| --- | --- |
| Persistent storage | 5 GB `$HOME`, cannot be expanded; everything outside `$HOME` is lost when the VM is recycled |
| Inactivity | Session ends after 40 minutes of inactivity |
| Maximum session | 12 hours |
| Weekly quota | 50 hours by default |
| Unused home directory | Deleted after 120 days without access (email warning first) |
| Location | Assigned automatically; you cannot choose the region or zone |
| Ephemeral mode | No persistent disk, faster start, files lost at the end of the session |

**Cloud Shell Editor** is the IDE that opens above the terminal (Open Editor, `ide.cloud.google.com`, or `cloudshell edit FILE`). It is based on Code OSS and ships with **Cloud Code**: Kubernetes and Cloud Run tooling, debugging for Go, Node.js, Python and Java, Git integration and access to Cloud APIs and Secret Manager.

**Cloud Code** is a set of IDE extensions for VS Code, JetBrains IntelliJ and Cloud Shell Editor: sample applications, Skaffold-based run and debug on Kubernetes, Cloud Run and Cloud Run functions support, Kubernetes YAML assistance, Secret Manager and Cloud Storage browsing, Apigee API development, and the client library manager. It includes the Gemini Code Assist extension for code generation and inline suggestions.

| Need | Recommendation |
| --- | --- |
| Run a few `gcloud` commands now, from any browser, no install | Cloud Shell Terminal |
| Edit a configuration file or a small app in the browser | Cloud Shell Editor |
| Daily development of Kubernetes or Cloud Run apps in the developer's own IDE | Cloud Code in VS Code or IntelliJ |
| Managed, secure development environments inside the company VPC, no code on laptops | Cloud Workstations |
| Long-running jobs, scheduled scripts, more than 5 GB of data | A VM, Cloud Run jobs or Cloud Build, not Cloud Shell |

Cloud Shell needs bidirectional WebSocket traffic to port 443 for `*.cloudshell.dev` through corporate proxies and firewalls.

> **Exam trap.** Cloud Shell is not a place to run production automation: sessions end after inactivity or 12 hours, only `$HOME` persists, and the home directory is deleted after 120 days without use.

<!-- section: cloud-sdk | objectives: 5.2.2 -->
## Google Cloud CLI: gcloud, gcloud storage, gsutil and bq

The Google Cloud CLI installs `gcloud` (most services), `bq` (BigQuery) and, until March 2027, `gsutil`. Components are added with `gcloud components install` (for example `kubectl` or emulators); release tracks `alpha` and `beta` expose pre-GA commands (`gcloud beta ...`).

```bash
# Two kinds of credentials
gcloud auth login                         # credentials for the gcloud CLI itself
gcloud auth application-default login     # ADC file for your own code and client libraries

# Named configurations to switch between projects and accounts
gcloud config configurations create prod
gcloud config set project example-prod
gcloud config set compute/region europe-west1
gcloud config configurations activate dev

# Act as a service account without a key
gcloud storage ls gs://example-prod-reports --impersonate-service-account=reporter@example-prod.iam.gserviceaccount.com

# Scripting: machine-readable output and filters
gcloud compute instances list --filter="labels.env=prod AND status=RUNNING" \
  --format="value(name,zone)"
```

**Cloud Storage**: `gsutil` is a legacy, minimally maintained CLI; Google recommends `gcloud storage`. After March 2027 `gsutil` will no longer ship with the Google Cloud CLI (it remains available as a standalone package).

```bash
gcloud storage buckets create gs://example-media-eu --location=EU --uniform-bucket-level-access
gcloud storage cp ./exports/*.csv gs://example-media-eu/exports/
gcloud storage rsync ./site gs://example-media-eu/site --recursive
```

**BigQuery**: `bq` creates datasets and tables, loads data and runs queries.

```bash
bq mk --dataset --location=EU example-prod:sales
bq load --source_format=CSV --autodetect sales.orders gs://example-media-eu/exports/orders.csv
bq query --use_legacy_sql=false \
  'SELECT region, SUM(amount) AS total FROM `example-prod.sales.orders` GROUP BY region'
```

| Requirement | Command or flag |
| --- | --- |
| Use a different project for one command | `--project=PROJECT_ID` |
| Switch quickly between environments | `gcloud config configurations activate` |
| Temporary elevated access without a key | `--impersonate-service-account` (requires Service Account Token Creator on the target service account) |
| Parse output in a script | `--format=json`, `--format="value(...)"`, `--filter` |
| Use a command still in Preview | `gcloud beta` or `gcloud alpha` (never the decisive answer for production) |

> **Exam trap.** `gcloud auth login` does not give credentials to your application code; `gcloud auth application-default login` does. And for new scripts that copy objects, the expected tool is `gcloud storage`, not `gsutil`.

<!-- section: emulators | objectives: 5.2.3 -->
## Cloud emulators: Bigtable, Spanner, Pub/Sub and Firestore

Emulators run a local, in-memory implementation of a service so that developers and CI pipelines can test without cost, without credentials and without touching shared resources. Client libraries switch to the emulator when an environment variable is set.

| Emulator | Start | Environment variable (default address) |
| --- | --- | --- |
| Pub/Sub | `gcloud beta emulators pubsub start --project=test-project` | `PUBSUB_EMULATOR_HOST` (`localhost:8085`) |
| Spanner | `gcloud emulators spanner start` (or the emulator container image) | `SPANNER_EMULATOR_HOST` (`localhost:9010` gRPC, `9020` REST) |
| Bigtable | `gcloud beta emulators bigtable start` | `BIGTABLE_EMULATOR_HOST` (`localhost:8086`) |
| Firestore | `gcloud emulators firestore start` (also in the Firebase Local Emulator Suite) | `FIRESTORE_EMULATOR_HOST` (`127.0.0.1:8080`) |

```bash
gcloud components install pubsub-emulator
gcloud beta emulators pubsub start --project=test-project &
$(gcloud beta emulators pubsub env-init)     # exports PUBSUB_EMULATOR_HOST
pytest tests/integration
```

Limits to keep in mind:

- **Data in memory only**: restarting an emulator loses all data and schema.
- **No IAM and no authentication**: permission problems are not caught. The Pub/Sub emulator retains messages indefinitely and does not support console or `gcloud pubsub` commands; the Bigtable emulator has no admin API for instances and clusters.
- **Not representative of performance**: the Spanner emulator locks the whole database for read-write transactions and schema changes; the Firestore emulator does not track composite indexes (queries that need one succeed locally and fail in production).
- **Never for production.**

> **Exam trap.** Emulators answer "test application logic locally or in CI without cost or credentials". They do not answer "validate IAM permissions", "load-test" or "check that the required indexes exist": use a real, isolated test project for those.

<!-- section: infrastructure-as-code | objectives: 5.2.4 -->
## Infrastructure as code with Terraform

Infrastructure as code (IaC) describes resources declaratively in version-controlled files, so environments are reproducible, reviewed and auditable. **Terraform** with the Google provider is Google's recommended IaC tool.

Google's Terraform best practices:

| Topic | Recommendation |
| --- | --- |
| Layout | Reusable modules in `modules/`, one root configuration per environment in `environments/dev`, `qa`, `prod` |
| State | Remote state in a Cloud Storage bucket (`backend.tf`), one state per root module; use only the default workspace |
| Size | No more than 100 resources per state, ideally a few dozen |
| Versions | Pin provider minor versions in `versions.tf`; commit `.terraform.lock.hcl` |
| Variables | Values in `terraform.tfvars`, not on the command line; no default for environment-specific values such as `project_id` |
| Protection | `lifecycle { prevent_destroy = true }` on stateful resources such as databases |
| Execution | Always generate and review a plan, then apply the saved plan from an automated pipeline running as a service account; Workload Identity Federation for pipelines outside Google Cloud |
| Drift | Once a resource is managed by Terraform, change it only through Terraform; use `terraform state` commands, never edit state by hand |

```text
# environments/prod/backend.tf
terraform {
  backend "gcs" {
    bucket = "example-tf-state-prod"
    prefix = "network"
  }
}
```

```bash
terraform init
terraform fmt -check && terraform validate
terraform plan -out=tfplan
terraform apply tfplan
```

Related options:

| Option | What it is | Choose it when |
| --- | --- | --- |
| Infrastructure Manager | Managed service that runs Terraform for you in Cloud Build: deployments, revisions, previews, stored state and logs | You want Terraform without operating runners and state yourself |
| Config Connector | Kubernetes custom resources that create and manage Google Cloud resources | Platform teams already manage everything with Kubernetes manifests and GitOps |
| `gcloud beta terraform vet` | Validates a Terraform plan against a policy library (Preview) | Policy checks in the pipeline before apply |
| Deployment Manager | Former Google template service: end of support March 31, 2026, turned down after June 30, 2027 | Never for new work; migrate to Infrastructure Manager |

> **Exam trap.** Local Terraform state on a laptop, or an engineer running `terraform apply` with personal Owner rights, are the wrong answers. State goes in a Cloud Storage backend; changes go through a reviewed plan applied by a pipeline's service account.

<!-- section: api-access | objectives: 5.2.5 -->
## Best practices for accessing Google APIs

**Authenticate with Application Default Credentials (ADC).** Client libraries find credentials in this order:

1. The file named by `GOOGLE_APPLICATION_CREDENTIALS` (a Workload or Workforce Identity Federation configuration, or a service account key).
2. The ADC file created by `gcloud auth application-default login` (`$HOME/.config/gcloud/application_default_credentials.json` on Linux and macOS).
3. The **service account attached** to the resource (VM, Cloud Run service, GKE workload through Workload Identity Federation for GKE), obtained from the metadata server.

| Where the code runs | Recommended credential |
| --- | --- |
| On Google Cloud | Attached user-managed service account with the least-privileged roles |
| Developer workstation | The developer's own ADC; impersonate a service account when testing its permissions |
| On-premises, AWS, Azure, GitHub Actions, GitLab | Workload Identity Federation (no key) |
| Anything | Not a service account key, unless no other option exists: Google states that keys create a security risk |

**API keys** identify a project for APIs that accept them; they do not identify a user. Best practices: add **application restrictions** and **API restrictions**, delete unused keys, rotate keys, never embed them in client code or repositories, send them in the `x-goog-api-key` header rather than the URL, and prefer IAM-based authentication in production.

**Handle errors and quotas.** Retry only transient errors (HTTP 408, 429 and 5xx, timeouts) and only idempotent requests (or requests made conditional, for example with a generation precondition), using **truncated exponential backoff with jitter**. Client libraries already do this for most operations. Quotas are enforced per project (rate quotas and allocation quotas); a `429` or `RESOURCE_EXHAUSTED` means slow down or request a quota increase, not retry immediately in a tight loop.

**Reach APIs privately.** VMs without external IP addresses reach Google APIs through **Private Google Access**, enabled per subnet. Use `private.googleapis.com` (`199.36.153.8/30`) for most Google APIs, or `restricted.googleapis.com` (`199.36.153.4/30`) to allow only services supported by VPC Service Controls (exfiltration protection). Private Service Connect endpoints for Google APIs give an internal IP address of your choice, reachable from on-premises.

> **Exam trap.** Downloading a service account key for an application that runs on Compute Engine, GKE or Cloud Run is wrong: attach the service account. For an application outside Google Cloud, Workload Identity Federation replaces the key.

<!-- section: client-libraries | objectives: 5.2.6 -->
## Google API client libraries

| Library type | Use it when | Characteristics |
| --- | --- | --- |
| **Cloud Client Libraries** | Default for Cloud APIs | Recommended by Google; idiomatic per language; many use gRPC under the hood (up to 10 times more throughput per CPU than JSON REST); handle authentication through ADC, retries and pagination |
| **Google API Client Libraries** | No Cloud Client Library exists for the API and language, or an existing project already uses them | Auto-generated, REST only (no gRPC), less idiomatic |
| Firebase SDKs | Mobile and web apps built on Firebase | Client-side platform SDKs |
| Your own REST or gRPC code | Libraries do not fit | You implement authentication, retries and backoff yourself |

Best practices with the libraries:

- **Reuse client objects** across requests: the first call authenticates (can take seconds), later calls reuse the token until it expires (typically one hour) and the library refreshes it; creating many clients quickly can hit rate limits.
- **Pin library versions** in production and **keep them up to date**; most follow semantic versioning.
- Rely on ADC rather than passing credentials explicitly, so the same code runs locally (developer ADC), in CI (federation) and in production (attached service account).
- Configure timeouts and retry settings per call when the defaults do not match the latency budget.

> **Exam tip.** "Highest throughput when calling Pub/Sub or Spanner from a service" points to the Cloud Client Libraries (gRPC). "A Google API with no Cloud Client Library for your language" is the case for the Google API Client Libraries.

<!-- section: key-points -->
## Key points

- Cloud Shell: ephemeral VM, 5 GB persistent `$HOME`, 40-minute inactivity, 12-hour sessions, 50 hours a week; Cloud Shell Editor and Cloud Code for development; Cloud Workstations for VPC-hosted environments.
- `gcloud auth login` for the CLI, `gcloud auth application-default login` for code; `--impersonate-service-account` instead of keys; `gcloud storage` replaces `gsutil`; `bq` for BigQuery.
- Emulators (Pub/Sub, Spanner, Bigtable, Firestore): in-memory, no IAM, not for performance, selected with `*_EMULATOR_HOST` variables.
- Terraform: modules plus per-environment roots, remote state in Cloud Storage, reviewed plan applied by a pipeline; Infrastructure Manager to run it managed; Deployment Manager is retired.
- ADC order: environment variable, gcloud ADC file, attached service account; Workload Identity Federation outside Google Cloud; restrict API keys.
- Retry 408, 429 and 5xx with truncated exponential backoff and jitter; Private Google Access with `private` or `restricted` domains.
- Cloud Client Libraries first; Google API Client Libraries only when no Cloud library exists.
