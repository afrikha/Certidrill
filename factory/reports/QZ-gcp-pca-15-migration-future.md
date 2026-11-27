# QZ-gcp-pca-15-migration-future — report

File: `content/gcp-pca/quizzes/15-migration-future.yaml` (10 questions, English only; 1–5 difficulty 1,1,2,2,2; 6–10 difficulty 3 with two `multi`). Check: `npx tsx factory/check-quiz.ts gcp-pca 15-migration-future` → 0 problem(s), 0 warning(s).

Objectives: 1.4.1 (q6, q10), 1.4.2 (q3, q7), 1.4.3 (q1), 1.4.4 (q4, q9), 1.5.1 (q5), 1.5.2 (q8), 1.5.3 (q2).

## Verified on docs.cloud.google.com (2026-11-27)
- Migrate to VMs lifecycle: Finalize deletes the replication data and its storage (stops storage charges), applies to Cut-Over state, does not delete test clones; replication every 2 h by default; rollback manual.
- RHEL BYOS images (project `rhel-byos-cloud`): pay Red Hat for subscriptions, Google only for infrastructure; Cloud Access enablement through a Google group (linking takes 3–4 h). BYOL page: Linux BYOS (RHEL/SLES) and Microsoft applications don't need sole-tenant nodes.
- Cloud Run jobs triggered by Cloud Scheduler (run endpoint, service account with invoker permission).
- Datastream: serverless CDC, minimal source impact, Oracle source, BigQuery destination, private connectivity through VPC peering also reaches sources behind VPN/Interconnect.
- DMS heterogeneous paths: Oracle and SQL Server to Cloud SQL for PostgreSQL and to AlloyDB; conversion workspaces with Gemini-assisted workflows; continuous migration = full dump + CDC, then promote. No launch-stage label on the pages (treated as GA).
- AlloyDB columnar engine (GA; only "expressions in the column store" is Preview).
- CUDs: resource-based bound to region and project, can't be cancelled; Compute flexible bound to the billing account, can't be used for Spot or preemptible VMs. Machine type recommendations use the previous 8 days of metrics.
- Hybrid connectivity NEGs: supported by global external Application LB; Cloud Router must use global dynamic routing; Google Cloud backends in a separate backend service. Serverless NEGs: global external ALB, Cloud Armor supported, URL map picks the backend service by host/path.
- Migration framework: Plan phase builds the foundation (identity, resource hierarchy, networking) and prioritizes waves.

## Doubts / not verified
- q7: that Cloud SQL for PostgreSQL has no columnar engine was checked only by search (only AlloyDB pages exist); the distractor's explanation relies on it.
- q10: Cloud Armor on a backend service whose backends are hybrid NEGs was not checked on a fetched page (well-established, but no reference fetched for it).
- q7 makes "DMS to AlloyDB" correct while mock `gcppca-cs5b-billing-database` uses it as a distractor (different requirements there: keep Oracle/RAC). Not a repeat, but reviewers may want to know.

## Chapter issues (content/gcp-pca/course/chapters/15-migration-future.en.md — not edited)
- Financial levers: the chapter does not say that Compute flexible CUDs can't be used for Spot/preemptible VMs, nor that CUDs can't be cancelled (relevant to "rightsize before committing"). The CUD page now gives Compute flexible 3-year discounts of about 17–63 % depending on series and service; the chapter gives no figures, so no error, but "resource-based is always deeper" should not be taught.
- Sustained use discount figures in the chapter ("more than 25 % of a month, up to 30 %") were not re-verified in this task.
- Strangler fig row: the chapter could add that the backend for the legacy system on premises is a hybrid connectivity NEG, which requires global dynamic routing on the Cloud Router (verified on the hybrid NEG page).
- Datastream row: correct; the overview now also lists AlloyDB, MongoDB, Spanner and Salesforce sources (Dataverse, ServiceNow, Workday in Preview).
