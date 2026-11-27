# FIX-gcp-ace — course part

Checks after edits: `npm run -s content:validate -- --cert gcp-ace` → 630 files, 0 problem(s), 0 warning(s); course 18 chapters, 94/94 objectives, 0 problem(s). `npx tsx factory/check-cert.ts gcp-ace` → course problems: 0.

## Changed files

- `36-logging` (export-logs, key points): the sink writer identity needs **Logs Writer for every destination** plus the destination role, granted in the project that stores the destination. Only a sink to a log bucket in the same project has no writer identity. Updated the table header, the gcloud example (adds the `roles/logging.logWriter` grant), the writer-identity bullet, the exam trap and the key point. Source: https://docs.cloud.google.com/logging/docs/export/configure_export_v2
- `36-logging` (network logs trap): the explicit deny-all rule that logs what the implied deny blocks is now at priority 65535 instead of 65534. At 65534 it would override the `default-allow-*` rules, because deny wins at equal priority. Source: https://docs.cloud.google.com/firewall/docs/firewalls
- `24-networking` (firewall section): "implied rules at priority 65535, can't be deleted" is now "implied actions that apply only when no rule matches". The current page gives no priority and doesn't say whether they can be deleted. Added regional system firewall policies to the evaluation order. Sources: https://docs.cloud.google.com/firewall/docs/firewalls, https://docs.cloud.google.com/firewall/docs/firewall-policies-rule-eval-order
- `24-networking` (load balancing): the health check probe range is `35.191.0.0/16`, the only one the Health checks overview lists for these load balancers. Added a note that external passthrough NLBs use other ranges and that older pages also list `130.211.0.0/22`. Removed `130.211.0.0/22` from the code example. Source: https://docs.cloud.google.com/load-balancing/docs/health-check-concepts
- `35-manage-networking` (firewall rules, policies): the implied row is now "implied actions; apply only when no rule matches; can't be logged". The health check rule now uses `35.191.0.0/16` only. Added regional system firewall policies to the evaluation order. Same sources as above.
- `21-compute-engine` (MIG): the autohealing step now cites the ranges the Compute Engine autohealing page still gives (`130.211.0.0/22`, `35.191.0.0/16`). Source: https://docs.cloud.google.com/compute/docs/instance-groups/autohealing-instances-in-migs
- `12-environment-setup` (observability): `_Default` retention is configurable (1–3,650 days) only in projects. Folder and organization `_Default` buckets keep 30 days. Source: https://docs.cloud.google.com/logging/quotas
- `12-environment-setup` (quotas): removed the unverified "HTTP 429 `RESOURCE_EXHAUSTED`". The text now says the task fails with a quota error until enough quota is available. The roles that can request changes are now Quota Administrator, Service Usage Admin and the legacy Owner and Editor (permissions `serviceusage.quotas.update`, `cloudquotas.quotas.update`). Sources: https://docs.cloud.google.com/docs/quotas/overview, https://docs.cloud.google.com/docs/quotas/permissions, https://docs.cloud.google.com/iam/docs/roles-permissions/servicemanagement
- `12-environment-setup` (networking): "implied rules at the lowest priority" is now "implied actions applied when no rule matches". Source: firewalls page above.
- `13-billing` (billing accounts): the payment methods now match the overview: card or direct debit, monthly or threshold; invoiced accounts pay by check or wire transfer; the parent of a subaccount must be on invoiced billing. Source: https://docs.cloud.google.com/billing/docs/concepts
- `13-billing` (linking, lock): Owner is now labelled `roles/owner`, the legacy basic role named by the Billing pages. The lock text now says a lock protects against accidental changes, not against people who hold the roles, because a project Owner can unlock it. Source: https://docs.cloud.google.com/billing/docs/how-to/secure-project-billing-account-link
- `42-service-accounts` (lifecycle): undelete is now the GA `gcloud iam service-accounts undelete ACCOUNT_ID` (21-digit unique ID), not `gcloud beta`. Sources: https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/undelete and local SDK 570 help.
- `42-service-accounts` (attach): the Cloud Run function example now uses `gcloud run deploy --source --function --base-image --service-account`, consistent with chapters 22 and 33. Flags checked with local `gcloud run deploy --help`.
- `34-manage-storage-data` (Cloud Storage access, key points): signed URLs made through impersonation are limited to 12 hours. 7 days needs `--private-key-file` or an activated service account. Source: local `gcloud storage sign-url --help` (SDK 570), consistent with gcpace-3b-gcs-signed-url-upload.
- `37-monitoring` (alerting, key points): removed the "Preview" label on forecast conditions, which no current page confirms. The condition is now described as the docs do (forecasts over a 15-minute window). Sources: https://docs.cloud.google.com/monitoring/alerts/concepts-indepth, https://docs.cloud.google.com/monitoring/alerts/types-of-conditions
- `31-manage-vms` (snapshot schedules): marked CSEK as deprecated for Compute Engine. Source: https://docs.cloud.google.com/compute/docs/disks/customer-supplied-encryption

## Checked, no change needed

- Basic roles: the chapters already use Admin/Writer/Reader, with Owner/Editor/Viewer as legacy (Roles overview, 2026-11-17). Chapter 42's "default service accounts may get Editor" matches "Types of service accounts".
- `_Required` 400 days is confirmed (Logging quotas page).
- Spend cap budgets: list of services, scope and period are confirmed.
- Cloud SQL default of 7 retained backups is confirmed ("Manage standard backups").
- Firewall evaluation order is confirmed.
- Workload Identity Federation for GKE identity sameness is confirmed ("About Workload Identity Federation for GKE").
- `kubectl autoscale --cpu-percent` is kept: it is still the GKE how-to example.
- Workforce OIDC provider flags and values match SDK 570 help.
- `gcloud quotas preferences create` is GA on the online reference and the flags are as used.
- `gcloud projects move` is still beta only (absent from GA SDK 570).
- Metrics scope changes need Monitoring Admin (Metrics scopes overview).
- `gcloud policy-troubleshoot iam` syntax matches the help.

## Not confirmed

- The 375-project limit of a metrics scope was not re-fetched (not flagged).
- The launch stage of Gemini CLI and Antigravity is still not stated on Google Cloud docs; chapter 25 already says so.
- The `gcloud projects move` GA reference page failed to fetch; the local GA SDK has no such command.
- That snapshot schedules can't be used with CSEK disks was not re-read (the fetched page was truncated). It was kept as written by C-gcp-ace-3.
