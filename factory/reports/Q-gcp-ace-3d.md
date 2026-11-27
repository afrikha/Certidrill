# Q-gcp-ace-3d — report

40 questions written (gcpace-3d-*), 4 per objective 3.4.5–3.4.14; single 32 / multi 8; difficulty 12 easy / 20 medium / 8 hard. Validation: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3d-` and `npm run content:validate -- --cert gcp-ace --prefix gcpace-3d-` → 0 problem(s).

Doubts and choices (all facts checked on docs.cloud.google.com on 2026-11-27):

- 3.4.12: Gemini Cloud Assist is Preview (Pre-GA terms); the objective names it, so the 4 questions use it and every explanation states the stage. Investigations: since 2026-04-10, creating them is limited to Premium Support customers or on request; gcpace-3d-gca-investigate-alert states a Premium Support contract in the stem.
- 3.4.14: Cloud Hub GA since 2025-12-16 (release notes). The Maintenance page (activity viewing) and Optimization (cost) are Preview, so they are never correct answers; the stage of the Deployments and Support pages isn't stated separately (used in gcpace-3d-cloud-hub-pages). Host-project and single-project App Hub models aren't supported by the application view (gcpace-3d-cloud-hub-app-model).
- gcpace-3d-recommender-machine-type-list: the Compute Engine page lists VM machine type recommendations with `--location=ZONE`, while the gcloud reference example uses `--location=global`; I kept the zone and didn't make the location a distractor.
- gcpace-3d-idle-disk-ip-actions: "a persistent disk can't be shrunk" comes from general knowledge (not on a fetched page).
- gcpace-3d-lb-status-details: `httpRequest.status` comes from the LogEntry reference; the load balancer page documents `jsonPayload.statusDetails`.
- gcpace-3d-psh-alert-roles: the four roles come from the Personalized Service Health alert quickstart, which lists Logs Configuration Writer among them without explaining why.
- Observability Analytics is the current name (formerly Log Analytics); the gcloud flag `--enable-analytics` still says "Log Analytics" in its help text.
- I checked the stems of the 3a/3c/4a batches: no overlap with 3.4.5–3.4.14 (3c covers 3.4.1–3.4.4 and touches Query Insights and Recommender only as distractors).
