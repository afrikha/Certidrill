# QZ-gcp-ace-25-tooling — notes

`content/gcp-ace/quizzes/25-tooling.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.4.1 (q1, q2, q4, q5, q6, q7, q10), 2.4.2 (q3, q8, q9). Positions 6–10: single ×2, multi ×3 (choose two).

## Chapter (or mock questions) vs current docs (fix in the chapter, not done here)

- **Application Design Center launch stage.** The release notes say the product has been GA since 2025-12-05. The "Application Design Center overview" page fetched on 2026-11-27, however, still showed a Preview / Pre-GA terms notice. The chapter (GA) follows the release notes. Several features are Preview according to the release notes: composite templates (2026-04-22), many components, Troubleshoot Deployment, Security Command Center framework enforcement, and importing existing Terraform configurations into template revisions (2026-10-13). The chapter's concept table presents composite templates without a stage.
- **Deployment Manager.** The deprecation page gives end of support on March 31, 2026 (banner) or April 1, 2026 (body), with extensions up to March 31, 2027. New users can't enable the API after June 30, 2026, and the service shuts down after June 30, 2027. Google recommends Infrastructure Manager, with the DM Convert tool. The chapter could add the shutdown date and DM Convert.
- **`roles/config.agent` title.** It is "Infra Manager Agent" on the "Configure the service account" page and "Infra Manager Service Agent" on "Access control with IAM". The quiz uses only the role ID.
- **Gemini Cloud Assist setup.** The chapter is confirmed: Preview; `geminicloudassist.googleapis.com` (it also turns on `cloudaicompanion.googleapis.com`); supporting APIs; `roles/geminicloudassist.user` and `roles/cloudasset.viewer`; folder setup in the console only; later projects not enabled; not for data residency or CMEK projects.
- Also confirmed: Config Connector acquires a resource whose name matches, and deletes the resource by default unless `deletion-policy: abandon` is set; `reconcile-interval-in-seconds: "0"` disables drift correction and can't be undone; the add-on's IAM binding uses `serviceAccount:PROJECT_ID.svc.id.goog[cnrm-system/cnrm-controller-manager]`; ADC deploys as the selected service account, which needs roles in each target project, and registers the application in App Hub; Helm 3.8.0+ uses `helm registry login -u oauth2accesstoken` (the docs pipe `gcloud auth application-default print-access-token`, the chapter uses `gcloud auth print-access-token`; both give short-lived tokens).

## Not verified on a fetched page

- q2: no fetched Google page says in so many words that `terraform plan` changes nothing. The pages describe it as the review step before apply. The meanings of `validate`, `fmt` and `init -upgrade` are on "Basic Terraform commands".
- q4: the behaviour of `terraform init -reconfigure` (it ignores the existing state and doesn't migrate) and of `terraform apply -refresh-only` is Terraform knowledge. It is not on the fetched Google page, which documents only `-migrate-state`.
- q6: the statement that the GKE service agent and the node service account are not used by the Config Connector controller is inferred from the add-on setup page, which says the controller uses the Google service account bound through Workload Identity.
- q10: the statement that Infrastructure Manager runs Terraform as the `--service-account` identity is inferred from "Configure the service account": that account needs `roles/config.agent` plus permissions for the resources.

## Design notes

- I avoided the mock decisions (ADC catalog, `--replace`, Application Editor, Antigravity, Cloud Assist tasks, Gemini CLI facts, GEMINI.md, abandon on its own, drift revert, namespace project annotation, FAST statements, Helm push to a Docker-format repository, gcs backend, pipeline practices).
- q9 makes Gemini Cloud Assist (Preview) part of the correct answer, because objective 2.4.2 names the product. The explanation states the stage. No other Preview feature is an answer.
