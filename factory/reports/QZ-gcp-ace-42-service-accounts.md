# QZ-gcp-ace-42-service-accounts — report

File: `content/gcp-ace/quizzes/42-service-accounts.yaml` (10 questions, 7 single + 3 multi; 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5 ×2, 4.2.6, 4.2.7 ×2, 4.2.8). Check: 0 problem(s), 0 warning(s).

## Decisions kept away from the mock exam
The bank has about 90 questions on 4.2.x. The quiz tests decisions the bank doesn't use as answers: a service account ID can't be changed (new account), one account per application, Service Account Key Admin, Service Account User vs Token Creator for gcloud impersonation, the minimal node service account role, the Autopilot rejection of the metadata-server nodeSelector, `serviceAccountDelegationInfo` in audit logs, MIG identity change (new template + rolling update), Workload vs Workforce Identity Federation together, and a project exception to key creation plus `iam.serviceAccountKeyExpiryHours`.

## Chapter issues against current docs (not edited)
- **Attached identity is fixed at creation**: the chapter says "Most resources fix the attached account at creation; Compute Engine instances are the exception". For Cloud Run this is misleading: `gcloud run services update --service-account` (gcloud reference, SDK 570.0.0) sets the identity of a new revision of an existing service. Suggest saying "Compute Engine: stop + `set-service-account`; Cloud Run: deploy a new revision with `--service-account`; instance templates: create a new template".
- **Service agents created on request**: "Create and grant roles to service agents" now documents only `gcloud workload-identity service-agents generate` (no mention of `gcloud beta services identity create`) and says agents created on request **don't receive their roles automatically**. The chapter does not say this (the bank does, in `gcpace-4a-service-agent-on-request-roles`).
- **Key constraints**: "Restrict IAM service account usage" recommends the managed constraints `iam.managed.disableServiceAccountKeyCreation` / `iam.managed.disableServiceAccountKeyUpload` over the legacy boolean ones. The chapter names only the legacy constraints. `iam.serviceAccountKeyExpiryHours` takes only `1h`, `8h`, `24h`, `168h`, `336h`, `720h`, `1440h`, `2160h`, affects only new keys, and can't be merged with a parent policy. The chapter says only "sets an expiry for new keys".
- **Node service account**: "About service accounts in GKE" confirms `roles/container.defaultNodeServiceAccount` as the minimum. It doesn't mention Artifact Registry Reader, which the chapter adds (still correct for private repositories).

## Doubts / unverified
- Q8 relies on instance templates being immutable. The gcloud command group has no `update` command (checked locally), and the MIG update page documents `rolling-action start-update`. I didn't fetch a page that states the immutability in so many words.
- Q7: the audit log field names come from "Example logs for service accounts". The page notes that some services (App Engine, GKE) don't log the identity that created the short-lived credentials. Compute Engine firewall changes are not among them.
