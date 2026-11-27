# Task FIX-gcp-pca-course — correction pass, Professional Cloud Architect course

Read `factory/FIX-AGENT.md` if present for the general method, `factory/BRIEF-GCP.md`, `factory/BRIEF-EN-ONLY.md` and `factory/profiles/gcp-pca.md` (last bullet: current names, Preview and deprecated products).

Fix the chapters of `content/gcp-pca/course/chapters/` (English only) for the issues below, after checking each one on docs.cloud.google.com with WebFetch. Fix only what the docs confirm; if a point cannot be confirmed, remove the claim rather than guess. Keep section markers and objectives unchanged. Also read the `factory/reports/*gcp-pca*.md` reports for any other chapter error they flag and fix it the same way.

1. `61-operations-excellence`: forecasted metric-value alerting conditions are Preview (say so, never as a recommended default) and their forecast window is 1 hour to 2.5 days; metric-absence: alignment period + retest window ≤ 25 hours.
2. `24-ai-ml-platform`: Video Intelligence API deprecated since 2026-09-14, shutdown 2027-09-14, Gemini models are the replacement — do not present it as the answer for stored video; NotebookLM Enterprise is "Gemini Notebook for business" (check the exact name).
3. `31-security-design`: "Key rings cannot be deleted" — correct it to what the Cloud KMS docs say today; IAP directly on Cloud Run (GA date if confirmed); Secret Manager env vars resolved at startup vs volumes at each read.
4. `14-network-storage-compute-design` (and `21-network-topologies` if it states the same): Interconnect 99.99 % now also possible with four connections in one qualifying metro ordered as a connection group (`PRODUCTION_CRITICAL`); Memorystore for Memcached deprecation dates; VPC firewall rules vs FQDN objects (only firewall policies support FQDN).
5. `22-storage-systems`: bucket relocation now exists (with its condition); CSEK for Compute Engine deprecated; Workload Identity Federation with Cloud Storage needs uniform bucket-level access.
6. `12-business-tradeoffs`: the disposition table must not list "Retire" as one of Google's migration types if Google's page lists six without it (keep "retire" as a general strategy if useful, clearly not Google's list).
7. `51-advising-teams`: API Gateway OpenAPI 3.0 support (keep only if confirmed); Gemini Cloud Assist investigations need the Investigation Creator role; regional MIG maxSurge/maxUnavailable rule.
8. `42-business-processes`: spend cap budgets (GA 2026-10-13 if confirmed); sustained use discounts eligible families.
9. `41-technical-processes`: instance templates are regional or global.
10. `13-technical-requirements`: Gemini Cloud Assist data residency / CMEK warning only if the data governance page says it; Cloud Run maximum instances can be exceeded briefly.
11. `23-compute-systems`: predictive autoscaling only with CPU utilization; VPA and HPA on the same metric.

Check after the edits: `npx tsx factory/check-cert.ts gcp-pca` → 0 problems, `npm run -s content:validate -- --cert gcp-pca --course` → 0 problem(s). Write `factory/reports/FIX-gcp-pca-course.md`: one line per fix (chapter, change, source URL) and what you could not confirm.
