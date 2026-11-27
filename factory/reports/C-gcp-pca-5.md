# C-gcp-pca-5 — course chapter 61-operations-excellence (GCP-PCA, English only)

File written: `content/gcp-pca/course/chapters/61-operations-excellence.en.md` (8 sections + key points, objectives 6.1.1, 6.2.1, 6.2.2, 6.2.3, 6.3.1, 6.4.1, 6.5.1, 6.6.1; about 2,190 words outside code blocks).
Check: `npx tsx factory/check-cert.ts gcp-pca 61-operations-excellence` → 0 problems for this chapter; `npm run content:validate -- --cert gcp-pca --course --chapters 61-operations-excellence` → 0 problem(s).

## Verified on docs.cloud.google.com / cloud.google.com (2026-11-27)
- Operational excellence pillar: five principles and their recommendations (CloudOps readiness, incidents and problems, manage and optimize resources, automate and manage change, continuously improve).
- Reliability pillar principles; "Perform testing for recovery from failures" (fault injection, staging preferred, quarterly failover tests, RTO/RPO).
- Logging: `_Required` 400 days fixed; `_Default` and user-defined 30 days, 1–3,650 days in projects; folders/organizations cannot extend retention; sink destinations; aggregated sinks; Data Access logs off by default except BigQuery; Private Logs Viewer.
- "Log Analytics" is now presented as **Observability Analytics** (analytics views in Public Preview); linked BigQuery dataset needed for joins and SQL alerting.
- Ops Agent (Fluent Bit + OpenTelemetry Collector); memory metrics only with the Ops Agent.
- Cloud Profiler active (page updated 2026-11-10), overhead, profile types per language, 30-day retention.
- Alerting condition types, forecast window 1 h–7 d, absence up to 24 h, notification channels and their reliability notes; burn-rate fast/slow values.
- Cloud Deploy concepts, targets (GKE, GKE attached, Cloud Run), standard and canary strategies, YAML schema keys, `requireApproval`, rollback.
- Customer Care tiers and response times (Standard/Enhanced/Premium).
- Gemini Cloud Assist and its investigations are **Preview** (investigations need Premium Support since 2026-04-10). Binary Authorization continuous validation is Preview.
- Personalized Service Health; Web Security Scanner (public URLs only, App Engine/GKE/Compute Engine); penetration testing needs no notification to Google (Cloud Security FAQ, support.google.com).
- DORA metrics (dora.dev): five current metric names, including deployment rework rate.

## Doubts / not verified (kept generic or left out)
- Cloud Deploy `verify` appears in the current schema as `verify: tasks: []` (older docs used `verify: true`): left out of the YAML example, mentioned only in prose.
- `gcloud` commands (`run services update-traffic --to-tags`, MIG `--canary-version`, `deploy rollouts advance`, `deploy targets rollback`, `compute instances simulate-maintenance-event`, `sql instances failover`, `logging sinks create`, `logging buckets update`) written from known syntax, not re-fetched page by page.
- PerfKit Benchmarker, Locust/JMeter/k6, Cloud Service Mesh fault injection: named generically; the Architecture Center "distributed load testing using GKE" guide now redirects to a landing page, so it is not cited.
- Metrics-scope project limit not stated (not shown on the page fetched).
- Gemini Cloud Assist is listed in the exam guide (1.2.6, 5.1.5) but is Preview: question writers should not make it a correct answer.
