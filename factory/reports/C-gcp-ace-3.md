# C-gcp-ace-3 — course chapters 25, 31, 32, 33 (GCP-ACE, English only)

Files written:
- `content/gcp-ace/course/chapters/25-tooling.en.md` (2.4.1, 2.4.2; about 1,980 words, 1,810 outside code)
- `content/gcp-ace/course/chapters/31-manage-vms.en.md` (3.1.1, 3.1.2, 3.1.3; about 1,970 / 1,720)
- `content/gcp-ace/course/chapters/32-manage-gke.en.md` (3.1.4–3.1.9; about 2,200 / 1,770)
- `content/gcp-ace/course/chapters/33-manage-serverless-ai.en.md` (3.1.10–3.1.16; about 2,400 / 2,000; 7 objectives, so slightly over 2,200 counting code blocks)

Check: `npx tsx factory/check-cert.ts gcp-ace 25-tooling 31-manage-vms 32-manage-gke 33-manage-serverless-ai` → 0 problems for these chapters.

## How facts were checked (2026-11-27)
- Pages fetched on docs.cloud.google.com: IAP TCP forwarding, OS Login setup, standard SSH, snapshots, scheduled snapshots, custom images, Artifact Registry–GKE integration, GKE node service accounts, node pools, cluster autoscaler, VPA, HPA, multidimensional Pod autoscaling (Beta), Autopilot resource requests, Pod bursting, Gateway traffic management, Cloud Run rollouts/rollbacks, min/max instances, concurrency, autoscaling, Cloud Run GPUs, Cloud Run functions deployment, Compute Engine GPU creation and add/remove, TPU on Compute Engine and the Cloud TPU API page, GKE GPUs and TPUs, Agent Runtime (overview, setup, deploy, manage, ADK quickstart), Workbench create and idle shutdown, BigQuery notebooks, Cloud Workstations architecture, configuration and IAM, Config Connector (overview, getting started, deletion, install), Terraform state in Cloud Storage, Infrastructure Manager, Helm charts in Artifact Registry, Gemini Cloud Assist overview and setup, Gemini CLI, Application Design Center overview, key concepts and deploy pages. Fabric FAST from the repository README files (raw.githubusercontent.com).
- Every `gcloud` command group and flag was checked against the installed Google Cloud CLI 570.0.0 help (`gcloud ... --help`), which matches the gcloud reference.

## Doubts
- Agent Runtime SDK: the setup and ADK quickstart pages use `vertexai.Client(...)` and `client.agent_engines.create(...)`, while the deploy and manage pages use `client.runtimes.create/list/get/update/delete`. The chapter shows the first form and names the second.
- Gemini CLI and Google Antigravity: no launch stage stated on Google Cloud docs; the Gemini CLI page says it is not optimized for the latest Gemini models and recommends the Antigravity CLI. Presented as tools without a stated stage; questions should not make them the answer to a production requirement. Gemini Cloud Assist is Preview (stated). Application Design Center GA date taken from the profile (overview page shows no stage; only "Validate application designs" is Preview).
- Cloud Run: the docs now say revision-level `--min-instances`/`--max-instances` are "only available for services that previously had the feature configured" and recommend service-level `--min`/`--max`; gcloud 570 still accepts both. The chapter presents service level first and mentions revision level.
- VPA docs are ambiguous on `Auto` vs `Recreate` (default "also referred to as Auto"); written as "Recreate (default, also called Auto)". `InPlaceOrRecreate` is Preview.
- Cloud Workstations: console default auto-sleep is 2 hours; gcloud defaults `--idle-timeout` and `--running-timeout` to 7,200 s. A 12-hour running-timeout default was not confirmed, so not stated.
- Cloud TPU API page: "no longer under active development", not supported on TPU7x and later; the chapter shows TPU creation through Compute Engine machine types (`ct6e-standard-8t`, `--threads-per-core=1`) and keeps `gcloud compute tpus tpu-vm create` for existing workflows. The ACE exam may still expect the `tpu-vm` command.
- `--guest-flush`: gcloud help says it is currently supported only for Windows disks; written that way.
- Infrastructure Manager launch stage not stated on its overview page (presented as Google's managed Terraform service, as the docs describe it).
