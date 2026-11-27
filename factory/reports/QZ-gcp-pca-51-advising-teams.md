# QZ-gcp-pca-51-advising-teams — report

File: `content/gcp-pca/quizzes/51-advising-teams.yaml` (10 questions, English only). Check: `npx tsx factory/check-quiz.ts gcp-pca 51-advising-teams` → 0 problem(s), 0 warning(s).

Coverage: 5.1.1 (q1, q9, q10), 5.1.2 (q2, q7), 5.1.4 (q3, q6), 5.1.3 (q4, q8), 5.1.5 (q5). Multi at q8 and q9. No reuse of the 5.1.x mock-exam decisions (bank read in full). Avoided Datastream to BigQuery because quiz `15-migration-future` q6 already tests it.

## Facts verified on 2026-11-27 (pages fetched)
- Cloud Deploy strategies: standard and canary only (canary = any progression of percentages).
- API Gateway: Cloud Run / Cloud Run functions / App Engine backends, API keys and Google ID tokens.
- Transfer Appliance: recommended when an upload would take more than one week; 300 TB at 100 Mbps ≈ 9 months; data in Cloud Storage about 10 business days after capture; available in the EU.
- Pub/Sub emulator: `PUBSUB_EMULATOR_HOST`; no IAM support; "may differ from the real system".
- Gemini Cloud Assist investigations: Preview; since 2026-04-10 creating/running/editing needs Premium Support or account-team access; creating also needs `roles/geminicloudassist.investigationCreator`; `investigationOwner` is auto-granted to the creator.
- MIG updates: regional defaults = number of zones; fixed values on a regional MIG must be 0 or ≥ number of zones; surge needs quota; `maxUnavailable=0` keeps capacity; percentages need ≥ 10 instances.
- Cloud Run: `--no-traffic --tag`, tag URL, `--to-tags`, `--to-latest`. Load testing: test a deployed copy, Compute Engine harness, controlled rate/concurrency, database as scaling limit.
- Apigee ResponseCache: reduces backend requests, `TimeoutInSeconds`, `CacheKey`/`KeyFragment`, Apigee and hybrid.
- VMware Engine includes vSphere, vCenter, vSAN, NSX, HCX; HCX does bulk/vMotion migration and Layer 2 network extension. Nested virtualization: only Linux KVM as L1 hypervisor.

## Doubts / not verified
- The Pub/Sub emulator is started with `gcloud beta emulators pubsub start` (beta command group); the docs do not label the emulator Preview. q4 does not name the command.
- q5 is about Gemini Cloud Assist (Preview): the correct answer is the support contract, not a Preview feature, as the profile allows for 5.1.5.
- Google does not state on the HCX page that VMs keep their IP addresses through Layer 2 extension; q6 doesn't claim it.

## Chapter remarks (not edited)
- API Gateway row says "OpenAPI 2.0, and 3.0 since November 2025": the "About API Gateway" page fetched only mentions OpenAPI 2.0. Check the 3.0 claim on its own page.
- Gemini Cloud Assist section: creating investigations also needs the Investigation Creator role (`roles/geminicloudassist.investigationCreator`); the chapter lists only User and Cloud Asset Viewer.
- MIG section: worth adding that on a regional MIG a fixed `maxSurge`/`maxUnavailable` must be 0 or at least the number of zones (q10 can be answered without it, from the speed requirement).
- Cloud Run exam trap "rollback does not re-run health checks" not verified.
- Load testing: the Cloud Run guide recommends a Compute Engine harness (and JMeter) rather than Locust on GKE; the chapter's Locust/GKE suggestion is not wrong, but is not from the Cloud Run page.
