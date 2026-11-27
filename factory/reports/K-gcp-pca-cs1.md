# K-gcp-pca-cs1 — report

1. 3 original case studies: gcppca-cs1a-lumora-streaming (media streaming), gcppca-cs1b-halden-mutual (insurance), gcppca-cs1c-furrowline-agtech (agriculture IoT).
2. 18 questions (6 per case): single=15, multi=3; difficulty 3 easy / 10 medium / 5 hard.
3. Domains: design 4, provisioning 5, security 4, processes 2, implementation 1, operations 2 (each case covers 3 or more domains).
4. Facts checked on docs.cloud.google.com (2026-11-27); every reference is a page that was fetched.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs1` → 21 files, 0 problem(s); `npm run content:validate` → 0 problem(s), 0 warning(s).

## Notes and doubts

- cloud.google.com/<product>/docs URLs now redirect (302) to docs.cloud.google.com: the references use the docs.cloud.google.com URLs.
- Spot VMs: the current page says you choose a preemption notice of 120 seconds or 0 seconds (default), with a best-effort shutdown of up to 30 seconds. The profile's "30 s notice" trap should be updated. No question here depends on the notice length.
- Dedicated Interconnect: a single-metro 99.99 % topology now exists (four connections in one metro, ordered through a connection group with the PRODUCTION_CRITICAL capability). gcppca-cs1b-interconnect-topology uses it as a distractor that fails only the "loss of a whole metro" requirement. Question writers should not treat "99.99 % needs two metros" as always true.
- Renamed products seen in the docs: Dataproc appears as "Managed Service for Apache Spark", and ML Metadata lineage syncs to "Knowledge Catalog". These questions avoid both names. The Pipelines question uses "Agent Platform Pipelines" and "Agent Platform ML Metadata", as on the current page.
- CSEK: the page now calls it a Cloud Storage feature that is deprecated for Compute Engine. The CMEK question relies only on CSEK not being CMEK and not being offered by BigQuery.
- gcppca-cs1c-retraining-pipeline: the Cloud Composer distractor is judged mainly on its missing ML lineage. Its "environment to maintain" argument is weaker with Composer 3; a reviewer may want to check it.
