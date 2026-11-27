# Task FIX-gcp-pca-bank — correction pass, Professional Cloud Architect question bank and quizzes

Read `factory/BRIEF.md`, `factory/BRIEF-GCP.md`, `factory/BRIEF-EN-ONLY.md` and `factory/profiles/gcp-pca.md` (last bullet: current names, Preview and deprecated products).

Scope: `content/gcp-pca/questions/**`, `content/gcp-pca/case-studies/*` and `content/gcp-pca/quizzes/*` (English only). Verify every change on docs.cloud.google.com with WebFetch.

1. **Preview or deprecated product as the correct answer.** Find and fix every question whose correct answer relies on a Preview or deprecated product. Known cases:
   - `gcppca-4a-cat-design-center`, `gcppca-1b-gca-application-design-center`, `gcppca-5a-gca-design-terraform`: Application Design Center is Preview. Rewrite so that a GA option is correct, or keep the product only as a distractor. Exception: objectives 1.2.6 and 5.1.5 test Gemini Cloud Assist directly and may keep it as the answer; state its launch stage in the explanation.
   - Grep the bank for the other products of the profile's Preview/deprecated list:
     - Video Intelligence API
     - Policy Controller
     - Deployment Manager
     - CSEK
     - Memorystore for Memcached
     - Security Command Center Enterprise
     - Binary Authorization continuous validation
     - the global external passthrough Network Load Balancer
     - forecast alerting conditions
     - Observability Analytics views
     - Security Health Analytics on new activations
   - Also grep for any option you know to be Preview.
2. **Stale names.** Use the current names, written "X (formerly Y)" once in an explanation where it helps:
   - Vertex AI → Gemini Enterprise Agent Platform. Check whether the `roles/aiplatform.user` role's title changed.
   - Dataproc → Managed Service for Apache Spark.
   - Cloud Composer → Managed Service for Apache Airflow.
   - Log Analytics → Observability Analytics.
   - IAM basic roles: Admin, Writer and Reader are current; Owner, Editor and Viewer are legacy.
3. **Facts flagged by the writers.** Read the reports `factory/reports/{Q,K,QZ}-gcp-pca-*.md` and fix every flagged doubt you can settle with the docs. If you cannot confirm a deciding fact, rewrite the question so that it no longer depends on it. Known points:
   - The Interconnect 99.99 % single-metro topology (connection groups), used as a distractor in cs1b and cs2b: is the distractor still wrong for the case's stated requirement?
   - Spot VM notice: 0 s or 120 s, then up to 30 s of shutdown.
   - Pub/Sub direct Workload Identity Federation access.
   - Cloud SQL restart and failover.
   - `gcloud deploy targets rollback` defaults.
4. **Near-duplicates.** Compare quiz stems with bank stems for the same decision. The reports point to:
   - quiz 15 q7 vs `gcppca-cs5b-billing-database`;
   - quiz 21 q9 vs `gcppca-2a-ncc-vpc-spokes-mesh`.
   Change the quiz question when it tests the same decision with the opposite answer.

Keep ids, objectives, types, difficulty and `status: draft`. Check after the edits:
- `npm run -s content:validate -- --cert gcp-pca` → 0 problem(s), 0 warning(s);
- `npx tsx factory/check-quiz.ts gcp-pca` → 0 problem(s), 0 warning(s).

Write `factory/reports/FIX-gcp-pca-bank.md`: one line per changed file (id, change, source URL), plus what you could not confirm.
