# QZ-gcp-pca-52-programmatic-access — report

File: `content/gcp-pca/quizzes/52-programmatic-access.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 52-programmatic-access` → 0 problem(s), 0 warning(s).

Objectives: 5.2.1 (q2), 5.2.2 (q1), 5.2.3 (q3), 5.2.4 (q4, q7), 5.2.5 (q8, q9, q10), 5.2.6 (q5, q6). Positions 6–10: three `multi` (q7, q9, q10).

The mock bank already covers this chapter densely (38 questions). The quiz avoids their decisions: no Cloud Shell limits, `.customize_environment`, named configurations, gsutil migration, rsync, bq dry run or maximum bytes billed, AWS federation, impersonation, quota project, API key restrictions, retry/backoff basics, preconditions, client reuse, Pub/Sub, Spanner and Bigtable emulators, remote state, Infrastructure Manager, Config Connector or Private Google Access on a subnet.

## Facts verified (docs.cloud.google.com, 2026-11-27)

- The gcloud CLI does not use ADC; `gcloud auth application-default login` creates the local ADC file. The ADC search order is the environment variable, then the local file, then the attached service account. A WIF credential configuration file can be the `GOOGLE_APPLICATION_CREDENTIALS` file (authentication pages).
- Cloud Workstations: managed development environments, configurations defined by administrators, clusters attached to a VPC network, browser IDE or local VS Code/JetBrains. The overview page does not show the launch stage; I know the product is GA but did not confirm it on a fetched page.
- Firestore emulator: "does not track composite indexes and will instead execute any valid query" (Firestore Native emulator page).
- Terraform best practices:
  - `prevent_destroy` for stateful resources, no default value for environment-specific variables such as `project_id` (general style page);
  - pin providers to a minor version in `versions.tf`, check in `.terraform.lock.hcl`, use `terraform.tfvars` and not `-var`, default workspace only (root modules page).
- Client libraries explained: use the Google API Client Libraries when no Cloud Client Library exists for the API and language; they are REST only.
- Cloud Storage retry strategy: Java defaults are 6 attempts and a 50-second total timeout; custom `RetrySettings` are possible.
- Quotas:
  - 429 / `RESOURCE_EXHAUSTED`, then backoff with jitter, then a quota adjustment;
  - do not create several service accounts for one workload to get around quotas, because they share project quotas;
  - quotas are shared across all applications and IP addresses of a project.
- Private Google Access for on-premises hosts: restricted VIP `199.36.153.4/30`, Cloud Router custom advertisement, DNS CNAME, a VPC route through the default internet gateway, and do not mix the private and restricted VIPs.
- Cloud Run service identity: use a user-managed service account and "never set GOOGLE_APPLICATION_CREDENTIALS" on a Cloud Run service.

## Doubts

- q1 option d (`gcloud auth activate-service-account`): I did not fetch the gcloud reference page. It is a well-known command that authorizes the CLI with a service account key.
- q6: Java RetrySettings are set on the client (`StorageOptions`), not per call. The stem and answer say "build the client once with RetrySettings", which matches the page.
- q10: the scenario says the project of the VPC network is in the perimeter, so the VPC Service Controls side of on-premises access is not tested. Whether the subnet-level Private Google Access flag is needed for on-premises hosts is not stated on the page, so no option relies on it.

## Chapter issues against current docs

- The chapter's Terraform table says to "pin provider minor versions in `versions.tf`; commit `.terraform.lock.hcl`". This is correct, and the source is the root modules page, not a general page.
- I found nothing out of date in the chapter for the points tested.
