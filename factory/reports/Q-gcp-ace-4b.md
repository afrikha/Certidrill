# Q-gcp-ace-4b — report

45 questions in `content/gcp-ace/questions/security/` (prefix `gcpace-4b-`): 4.2.2 ×12, 4.2.3 ×11, 4.2.4 ×11, 4.2.5 ×11. Types: single 36 / multi 9 (eight "Choose two.", one "Choose three."; no per-selection NOTE, because multi is scored all or nothing). Difficulty: 14 easy / 22 medium / 9 hard. Correct options for singles: a 9, b 9, c 9, d 9.
Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-4b-` → 45 files, 0 problem(s). `npm run content:validate -- --cert gcp-ace --prefix gcpace-4b-` → 0 problem(s), 0 warning(s).

## Overlap avoided with parallel batches

I compared my stems with the gcpace-4a, 4c, 3a, 3d and 2a questions that already existed and replaced 8 planned questions that tested the same decision with the same answer:
- disable before delete (4a-sa-disable-before-delete)
- undelete after recreate (4a-sa-undelete-after-recreate)
- Ops Agent roles (3d-ops-agent-sa-roles)
- enabling iamcredentials (4c-enable-iamcredentials-api)
- Token Creator vs Service Account User (4c-token-creator-role)
- role recommendations for Editor (4a-role-recommendations-basic)
- `--scopes=cloud-platform` vs `--no-scopes` (2a-vm-no-external-ip-sa)
- Policy Analyzer with `--expand-groups` (4a-analyze-bucket-delete-access)

Remaining close neighbours, each testing a different decision:
- `gke-node-pool-sa` (new node pool to change the service account) vs 3a-ar-node-scopes (new node pool to change scopes).
- `imp-delegation-chain` (order of the gcloud `--impersonate-service-account` list) vs 4c-delegation-chain-roles (which role grants a delegated request needs).
- `revoke-token-creator` (binding on the service account) vs 4a-revoke-project-binding (binding on the project).

## Facts checked (docs.cloud.google.com and the local gcloud 570.0.0 / bq 2.1.32 `--help`, 2026-11-27)

All commands and flags were checked:
- `instances create`/`set-service-account` with `--service-account`, `--scopes`, `--no-service-account`, `--no-scopes`; the VM must be stopped to change them.
- `instance-templates create --service-account`, `container node-pools create --service-account`. `node-pools update` has no service account flag.
- `functions deploy`: `--service-account`, `--run-service-account`, `--build-service-account`, `--trigger-service-account`.
- `run deploy`/`services update --service-account`.
- `scheduler jobs create http --oidc-service-account-email`/`--oauth-service-account-email`.
- `pubsub subscriptions create --push-auth-service-account`.
- `iam service-accounts` subcommands (`disable`, `undelete`) and `keys list --managed-by --created-before`/`delete`/`disable`.
- `add-iam-policy-binding --condition` syntax.
- `config set`/`unset`/`get auth/impersonate_service_account`, `auth application-default login --impersonate-service-account`.
- `asset analyze-iam-policy`, `policy-intelligence troubleshoot-policy iam`, `storage service-agent --authorize-cmek`.

## Doubts

1. **Basic roles renamed.** The roles overview now names the basic roles Admin/Writer/Reader and calls Owner/Editor/Viewer "legacy basic roles". The service account, Compute Engine and Cloud Run pages still say that default service accounts get "Editor". Only `default-sa-editor-existing` and `gke-node-pool-sa` mention Editor; both follow the service account pages and say "Editor role (`roles/editor`)". Review this wording when the docs settle.
2. **Delegation chain direction** (`imp-delegation-chain`). gcloud help says the active account needs Token Creator on SERVICE_ACCOUNT_1, and SERVICE_ACCOUNT_1 on SERVICE_ACCOUNT_2. It also says, confusingly, "SERVICE_ACCOUNT_1 is the impersonated account and SERVICE_ACCOUNT_2 is the delegate". The question follows the permission rule and the flag's "target service account" wording: the requests are made as the last account. A reviewer may want to confirm this.
3. **Terraform and gcloud config** (`imp-terraform-provider`, distractor d). The claim that Terraform does not read the gcloud `auth/impersonate_service_account` property comes from my own knowledge: Terraform uses ADC and its own provider settings. The Terraform authentication page documents only the provider argument and ADC impersonation.
4. **Cross-project role grant** (`cross-project-topic-grant`). The docs describe `iam.disableCrossProjectServiceAccountUsage` only in terms of attaching service accounts. That the constraint does not affect granting roles on another project's resources to a service account is my inference.
5. **Pub/Sub service agent.** The push-auth page says the agent needs Token Creator (or `getOpenIdToken`). The stem of `pubsub-push-auth` states that it already has it, so the answer does not depend on project age.
6. **Activity Analyzer is Preview.** It appears only as a wrong option, and the explanations say it is Preview.
7. **`gcloud iam service-accounts undelete`** is GA in gcloud 570, but the docs page still shows `gcloud beta`. No option uses the command.
8. **Custom role grantable on a service account** (`custom-role-no-setiampolicy`). The four permissions appear in Service Account Admin. I did not check their custom-role support level on the testable-permissions list.
9. Reference titles are the H1s of the pages I fetched. The Cloud SQL roles reference is the MySQL page ("Roles and permissions"); the PostgreSQL equivalent was not fetched.
