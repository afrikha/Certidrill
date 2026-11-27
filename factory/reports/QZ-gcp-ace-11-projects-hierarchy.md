# QZ-gcp-ace-11-projects-hierarchy — notes

`content/gcp-ace/quizzes/11-projects-hierarchy.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q1, q9), 1.1.5 (q2), 1.1.4 (q3), 1.1.12 (q4), 1.1.8 (q5, q6), 1.1.2 (q7, q10), 1.1.3 (q8). Positions 6–10: single ×3, multi ×2 (q9, q10).

## Chapter vs current docs (fix in the chapter, not done here)

- **`gcp.restrictServiceUsage`** (1.1.5 section: "To allow only approved APIs across projects"). The "Restrict service usage" page describes it as controlling runtime access to in-scope resources. It applies only to services whose resources are direct children of an organization, folder or project (Compute Engine and Cloud Storage are examples). It excludes essential dependencies such as IAM, Cloud Logging and Cloud Monitoring. The page doesn't say that it blocks *enabling* an API. "Allow only approved APIs" overstates it. The mock question `gcpace-1a-api-restrict-service-usage` is consistent with the page because it blocks use, so no change is needed there.
- **Custom constraint `methodTypes`**: the "Create custom constraints" page says only `CREATE` is allowed, but its own example also lists `UPDATE`. The chapter doesn't go into this, so it's only a doubt to keep in mind.
- **Project shutdown**: the "Delete and restore projects" page adds details that the chapter could mention. Charges can continue until the end of the billing cycle. Some data can be deleted sooner than 30 days: Cloud Storage buckets without soft delete, and Pub/Sub. Restore requires `resourcemanager.projects.undelete`.
- Confirmed as written: Project Mover on both the source and destination folders, with the `gcloud beta projects move` command. Direct allow and organization policies move with the project, and inherited ones are replaced. Folder limits (10 levels, 300 children, display name 3–30). Standalone organizations aren't available to existing Google Cloud accounts. Service accounts can't be owners, and at least one active Google Account owner is required. Claiming is irreversible. Organization Administrator can't create folders or projects.

## Doubts / not verified on a fetched page

- q8 (etag): the fetched pages say that a stale etag makes the update fail (409 ABORTED) and that the whole read-modify-write must be retried. The Policy reference says the etag is used "for optimistic concurrency control". None of them says explicitly that a policy written *without* an etag overwrites the current policy unconditionally. The question relies on the logical consequence: with no etag, the last write wins.
- q5: the "existing users" path comes from "Set up a Google Cloud organization resource": the organization is created when a Cloud Identity user creates a project or billing account. The migration step itself, from No organization into the organization, is documented on a separate page that I didn't fetch. The question only says that migration is needed.
- q10: the `container.googleapis.com/NodePool` resource type and the `resource.management.autoUpgrade` field come from the example in "Create custom constraints". The option uses `== true` with `ALLOW`, the inverse of the example's `== false`.
- The local gcloud SDK (570) has no beta component, and installing it is blocked by the proxy. `gcloud beta projects move` was checked on the "Move a project" page, not with `--help`.

## Design notes

- I avoided the decisions of the 56 mock questions on these objectives. The new decisions are: project undelete plus manual billing relink; `services list --available` versus the default `--enabled`; SSO without provisioning; a workforce principal set by custom attribute; no standalone organization for an existing account; the Google Account owner rule; a single-instance `vmExternalIpAccess` exception; etag concurrency; the effects of a project move; and a custom constraint enforced on one folder.
- No Preview or deprecated feature is a correct answer.
