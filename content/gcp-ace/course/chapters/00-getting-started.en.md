The Associate Cloud Engineer exam checks that you can set up, deploy, operate and secure workloads on Google Cloud with your own hands. Questions are less about architecture trade-offs than about the concrete step: the right `gcloud`, `kubectl` or `bq` command and flag, the console setting, the predefined IAM role, the product that fits a simple need, or the cheapest and least-effort option. This chapter explains the format, a reading method for scenarios and commands, the current product names and the pairs of answers the exam sets against each other.

<!-- section: exam-format -->
## How the exam works

| Item | Value |
| --- | --- |
| Duration | 2 hours |
| Questions | 50 to 60, multiple choice and multiple select |
| Case studies | None |
| Result | Pass or fail; Google publishes no score and no passing score |
| Price and delivery | 125 USD; online proctored or at a Pearson VUE test center |
| Languages | English, Japanese, Spanish and Portuguese (Certidrill: English only) |
| Validity | 3 years |
| Prerequisites | None; 6+ months of hands-on Google Cloud experience recommended |

The four sections of the exam guide don't weigh the same:

| Section | Weight | Course chapters |
| --- | --- | --- |
| 1. Setting up a cloud solution environment | about 20 % | 11 to 13 |
| 2. Planning and implementing a cloud solution | about 30 % | 21 to 25 |
| 3. Ensuring the successful operation of a cloud solution | about 30 % | 31 to 37 |
| 4. Configuring access and security | about 20 % | 41 and 42 |

Two question types exist. **Multiple choice** has four options and one correct answer. **Multiple select** ends with "Choose two." or "Choose three." and offers more options than answers. Google doesn't publish partial credit, so Certidrill scores multiple select questions all or nothing. There are no labs, drag-and-drop or Yes/No series.

To renew, you can take the **renewal exam** during the renewal eligibility period (1 hour, 20 questions, 75 USD, English or Japanese, valid 3 years), or complete the renewal learning path on Google Skills in the last year of your certification (renewed for 1 year).

> **Exam tip.** Two hours for up to 60 questions gives 2 minutes each, which is generous for short stems. Answer every question on the first pass, mark the ones you doubt and come back to them: an unanswered question can't earn credit.

<!-- section: reading-questions -->
## Reading a question

A stem describes a company in two to four sentences, what it already has and one requirement, then asks "What should you do?". Read it in this order:

1. Read the last sentence and its qualifier: fewest steps, least privilege, lowest cost, least operational overhead, Google-recommended practice, without downtime.
2. Note the hard facts: which project, which region, existing network or identity provider, who must (or must not) get access.
3. Eliminate options that break a fact or don't work (wrong command group, missing prerequisite).
4. Between the survivors, apply the qualifier.

| Words in the stem | What they usually select |
| --- | --- |
| "least privilege" | A predefined role on the narrowest resource, granted to a group or service account; never a basic role |
| "fewest steps", "least effort" | The single command or managed feature that does it: an autoscaler, a lifecycle rule, a scheduled snapshot, a managed service |
| "minimize cost" | Spot VMs for fault-tolerant batch work, colder storage classes for rarely read data, scale to zero, deleting idle resources |
| "without managing infrastructure" | Cloud Run, Cloud Run functions, GKE Autopilot, BigQuery, Cloud SQL |
| "the command fails", "API has not been used" | A missing API (`gcloud services enable`), a missing role, a quota, or the wrong default project |
| "must not leave the EU", "only our domain" | An organization policy (`gcp.resourceLocations`, `iam.allowedPolicyMemberDomains`) |
| "no service account keys" | Attaching a service account, impersonation, Workload Identity Federation |
| "be notified when spend reaches" | A budget with threshold rules (alerts only) |
| "analyze costs with SQL" | Cloud Billing export to BigQuery |

> **Exam trap.** "Google-recommended practice" is the option that follows the documentation: managed features, groups instead of individuals, least privilege, no long-lived keys. A custom script on a VM or a cron job that would also work is rarely the answer.

<!-- section: reading-commands -->
## Reading command options

Many options are commands. They follow one pattern: `gcloud [release track] GROUP [SUBGROUP] VERB NAME --flags`.

```bash
gcloud compute instances create web-1 --zone=europe-west1-b --machine-type=e2-medium
gcloud container clusters get-credentials prod-cluster --region=europe-west1
kubectl scale deployment frontend --replicas=5
gcloud storage cp report.csv gs://example-reports/
bq query --use_legacy_sql=false 'SELECT COUNT(*) FROM `example-prj.sales.orders`'
gcloud config set project web-prod-1934
```

How to eliminate command options quickly:

- **Wrong tool.** `kubectl` manages objects inside a cluster (Pods, Deployments, Services); creating the cluster or its node pools is `gcloud container`. BigQuery jobs are `bq`; Cloud Storage objects are `gcloud storage` (or the legacy `gsutil`).
- **Wrong scope.** Zonal resources take `--zone`, regional ones `--region`; a project-level setting doesn't take `--zone`.
- **Wrong project.** `--project` applies to one command; `gcloud config set project` changes the default for the following commands; a named configuration (`gcloud config configurations activate`) switches project, account and region together.
- **Wrong release track.** Some commands exist only in `beta` or `alpha`; in the exam, prefer the GA command when one exists.
- **Invented flags.** Distractors often use a plausible flag that doesn't exist. Certidrill only uses flags checked on the gcloud reference.

<!-- section: renamed-products -->
## Product names in November 2026

Google renamed many products in 2025 and 2026, and older study material uses the old names. The exam guide and Certidrill use the current ones:

| Old name | Current name |
| --- | --- |
| Cloud Functions | Cloud Run functions |
| Vertex AI | Gemini Enterprise Agent Platform ("Agent Platform"); Vertex AI Agent Engine is now Agent Runtime, Vertex AI Workbench is Agent Platform Workbench |
| Container Registry | Artifact Registry (Container Registry has been shut down) |
| Dataproc | Managed Service for Apache Spark |
| Cloud Composer | Managed Service for Apache Airflow |
| Log Analytics | Observability Analytics (the exam guide still writes "log analytics") |
| Basic roles Owner, Editor, Viewer | Admin, Writer, Reader (`roles/admin`, `roles/writer`, `roles/reader`); Owner, Editor and Viewer remain as legacy basic roles |

A feature in **Preview** is never the correct answer in Certidrill questions. Gemini Cloud Assist, which the guide names, is a Preview offering in November 2026: questions on it test what it does and how it is set up. Deployment Manager reached end of support on March 31, 2026; use Terraform or Infrastructure Manager instead.

<!-- section: confusing-pairs -->
## Answers the exam sets against each other

| Don't confuse | With | Difference |
| --- | --- | --- |
| Organization policy | IAM | A policy restricts what configurations are allowed for everyone; IAM decides who may act |
| Billing Account User | Billing Account Administrator | User only links projects; Administrator manages the account, its access and exports. Linking also needs Project Billing Manager or Owner on the project |
| Budget | Spend cap budget | A budget only alerts; a spend cap budget pauses one eligible service in one project |
| Quota | System limit | A quota can be raised (Quotas & System Limits); a system limit is fixed |
| Cloud Identity with GCDS | Workforce Identity Federation | GCDS copies AD users and groups into Cloud Identity; Workforce Identity Federation uses the external IdP directly, without sync |
| `--project` | `gcloud config set project` | One command versus the default for all later commands |
| Zonal Persistent Disk | Regional Persistent Disk | One zone versus synchronous replication across two zones of a region |
| Spot VM | Standard VM | Up to 91 % cheaper but can be preempted at any time, no SLA; for fault-tolerant work only |
| HPA | Cluster autoscaler | HPA adds Pods; the cluster autoscaler adds nodes when Pods can't be scheduled. VPA changes Pod requests |
| Cloud NAT | External IP | Cloud NAT gives outbound internet access only; inbound needs an external IP or a load balancer |
| Admin Activity audit logs | Data Access audit logs | Always on, in `_Required`; versus off by default (except BigQuery), enabled per service |
| Service account key | Service account impersonation | A long-lived secret file; versus short-lived credentials, the recommended option |

<!-- section: study-plan -->
## A study plan that works

1. Read the chapters in order: module 1 sets up the projects, identities and billing that the other modules assume.
2. Open a Google Cloud project with the free trial and run the commands of each chapter in Cloud Shell: create a custom mode VPC, a VM with OS Login, a managed instance group with autoscaling, a GKE Autopilot cluster and a Deployment, a Cloud Run service with two revisions, a bucket with a lifecycle rule, a log sink, a budget. Delete everything afterwards.
3. Learn the shape of the main command groups (`gcloud compute`, `container`, `run`, `storage`, `iam`, `projects`, `billing`, `logging`) with `--help`: the exam rewards recognizing a real flag.
4. After each module, take a mock exam. For every question, including the ones you got right, say why each wrong option fails.
5. Book the exam when three full mock exams in a row reach 80 % or more within 2 hours on questions you haven't seen before.
