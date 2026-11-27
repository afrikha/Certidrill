# QZ-gcp-pca-61-operations-excellence — report

File: `content/gcp-pca/quizzes/61-operations-excellence.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 61-operations-excellence` → 0 problem(s), 0 warning(s).

Objectives tested:

| Objective | Questions |
| --- | --- |
| 6.1.1 | q1, q9 |
| 6.2.1 | q10 |
| 6.2.2 | q6 |
| 6.2.3 | q3 |
| 6.3.1 | q7 |
| 6.4.1 | q2, q8 |
| 6.5.1 | q5 |
| 6.6.1 | q4 |

Positions 6–10 include two `multi` questions (q9, q10).

The mock bank covers this chapter densely (about 70 questions). The quiz avoids their decisions. It does not test:

- burn-rate configuration, retest window, metric absence, snooze, channel redundancy, Pub/Sub channel;
- Enhanced Support, Personalized Service Health;
- Cloud Deploy approval, canary, verify and rollback; Cloud Run tags; MIG canary and surge;
- QA attestation, On-Demand Scanning;
- chaos first steps, Cloud SQL failover, penetration test notice, load testing;
- `_Default` retention, exclusion filters, org sink with log views, metrics scope, Ops Agent;
- the Profiler profile types already tested (allocated heap, Java heap, CPU, wall time).

## Chapter out of date or wrong against current docs (2026-11-27)

- **Forecasted metric-value conditions (section alerting, 6.2.3).** The chapter lists "Forecasted metric value: predicted to be crossed within 1 hour to 7 days (disk full)" as a normal condition type. The page "Create forecasted metric-value alerting policies" (docs.cloud.google.com/monitoring/alerts/metric-forecast) disagrees on two points:
  - the feature is in **Preview** ("Pre-GA Offerings Terms");
  - the forecast window is **at least 1 hour and at most 2.5 days** (216,000 s), not 7 days.

  The chapter should mark the feature as Preview, so it is never an exam answer, and correct the window. Because it is in Preview, no quiz question uses it.
- **Metric absence.** The chapter says "up to 24 hours". The "Behavior of metric-based alerting policies" page states that the alignment period plus the retest window must not exceed 25 hours. This is minor, but the wording could be aligned.
- **Deployment strategies source.** The Architecture Center page "Application deployment and testing strategies" now redirects to a generic application-development page. I found no current Google page with a recreate/rolling/blue-green/canary comparison. The strategy table in the chapter is standard knowledge but has no live Google source. The quiz tests blue-green through the GKE node upgrade strategies page instead, which is verified.
- **Cloud Profiler.** The chapter's figures were not found on the "Profiling concepts" page, which only says "low overhead": about 10 seconds of collection per minute, overhead under 0.5 %, profiles kept 30 days. They may be on another page. The quiz does not use them. The per-language profile types in the chapter match the page.

## Facts verified (pages fetched)

- **SLOs:** SLOs are typically more stringent than public or contractual commitments; a 100 % SLO leaves no error budget and is bad practice (Concepts in service monitoring).
- **Customer Care tiers:** Premium answers P1 in 15 minutes, is 24/7 and includes a Technical Account Manager; Enhanced answers P1 in 1 hour and has no TAM; Standard is 8/5 (cloud.google.com/support).
- **PromQL-based alerting policies:** no Preview label except the two-year lookback; migration from Managed Service for Prometheus alerting is documented.
- **simulate-maintenance-event:** with a live-migrate policy, the `maintenance-event` metadata goes from `NONE` to `MIGRATE_ON_HOST_MAINTENANCE` and back.
- **Binary Authorization dry run:** results go to Cloud Audit Logs; available for GKE, Cloud Run and Google Distributed Cloud. Continuous validation is in Preview according to the exam profile.
- **Cloud Profiler:** the contention profile exists for Go only; Go has no wall time profile.
- **GKE node upgrades:**
  - blue-green upgrades keep the original nodes, allow rollback while in progress, have a configurable soak and use double the resources;
  - a surge upgrade cannot be rolled back once completed;
  - autoscaled blue-green is in Preview.
- **Temporary access with IAM:**
  - Private Logs Viewer includes Logs Viewer and adds private logs (Data Access);
  - a time condition on `request.time` gives access that expires on its own;
  - conditions are not allowed on legacy basic roles.
- **Well-Architected Framework, "Manage incidents and problems":** roles (incident commanders, investigators, communicators), runbooks, blameless reviews.
- **Logging and storage:**
  - `_Required` keeps logs 400 days and this cannot be changed;
  - user-defined buckets cannot be created in folders or organizations, and their retention cannot be extended there;
  - aggregated sinks can route logs to Cloud Storage, BigQuery, Pub/Sub, a log bucket or a project;
  - Observability Analytics requires an upgraded bucket (analytics views are in Preview and are not used);
  - a locked Bucket Lock retention policy cannot be removed or reduced;
  - Archive is the lowest-cost storage class.

## Doubts

- q2: "Basic Support" (free tier) is taken from the chapter. The support page I fetched lists the three paid tiers only.
- q10 option d: I did not verify whether the `_Default` bucket can be locked. The explanation does not rely on it.
