# K-dp-750-cs3 — report

3 case studies, 17 questions (prefix `dp750-cs3`), validator: 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| dp750-cs3a-proseware | Coffee-shop chain: Genie agent on gold tables, standalone materialized view, table update trigger, external volume for vendor log files | 1.2.8 dragdrop 2, 1.2.5 dropdown 2, 4.2.2 single 3, 1.2.4 dropdown 2, 2.2.1 single 1 |
| dp750-cs3b-margies-travel | Online travel agency: batch partner loads, MERGE with dedupe, UNPIVOT, analyst all-purpose compute, job notifications and retries | 3.3.2 dropdown 2, 3.3.7 dropdown 3, 3.3.6 single 2, 1.1.2 yesno 2, 4.2.4 single 1, 4.2.5 single 2 |
| dp750-cs3c-southridge-video | Video streaming royalties: Git folders and PRs, testing strategy, wheel from a volume, For each task, billing system table, partitioned-to-liquid conversion | 1.1.4 single 2, 4.1.3 dropdown 3, 4.4.1 dropdown 2, 4.3.3 dragdrop 2, 4.3.2 single 1, 3.1.9 dropdown 3 |

## Deviations and doubts

- Naming in 2026 Learn: "Genie Agents (formerly Genie spaces)", "Declarative Automation Bundles (formerly Databricks Asset Bundles)", "OpenSharing" for Delta Sharing, "Lakeflow pipelines" / "Spark Declarative Pipelines on Lakeflow". The case texts use these Learn names; the study guide still uses the old ones.
- Overlap with the parallel agents, found mid-task and corrected: my coffee-chain case was first named Fourth Coffee (already used by cs2c and cs4b), so I renamed it Proseware. I removed a gold-schema grants question (same answer as `dp750-cs2b-gold-privileges`) and a Spark UI skew yes/no (same decision as `dp750-cs1b-feeder-skew`), and replaced the skew question with a For each configuration question. I avoided Lakeflow Connect CT/CDC, expectations, row filters/masks, sharing, bundle targets/bind and repair, which other case studies and series already cover.
- Still close to non-case bank questions (same objective, different context): `dp750-cs3c-wheel-library` vs `dp750-1a-wheel-volume-source` (volume as the library source), `dp750-cs3c-cluster-conversion` vs `dp750-3a-replace-partitioning` (mine adds OPTIMIZE FULL), `dp750-cs3a-genie-knowledge` vs `dp750-1b-genie-sql-expressions`, `dp750-cs3a-daily-sales-mv` vs `dp750-1b-mv-create-trigger`. The reviewer may want to keep only one of each pair.
- `dp750-cs3c-cluster-conversion`: Learn's conversion example runs a plain `OPTIMIZE` after `REPLACE PARTITIONED BY WITH CLUSTER BY`. The answer is `OPTIMIZE … FULL` because the case requires all existing data to be reclustered and Learn recommends FULL when clustering is enabled for the first time. Plain `OPTIMIZE` is deliberately not offered as an option.
- `dp750-cs3a-export-trigger`: Learn does not state whether table update triggers are GA or preview.
- `dp750-cs3c-job-dbus`: the filter `usage_metadata.job_id IS NOT NULL` relies on the Learn statement that job_id is populated for serverless jobs and jobs on job compute only. The case states that no prod job runs on all-purpose compute.
- `dp750-cs3c-owner-reports`: a text-layout dropdown (`language: text`) of the UI fields Inputs / Concurrency / parameter. I did not use bundle YAML keys for For each because I could not verify them on Learn.
- `dp750-cs3b-booking-types`: the TIMESTAMP behaviour (session time zone) is general Spark SQL knowledge. The fetched TIMESTAMP_NTZ page only states that NTZ ignores time zones.
- Testing types (4.3.3) are documented only in the Learn training module unit "Implement testing strategy", which is cited.
- Dropdowns use `language: sql` and `language: text`; the validator accepts them, and other DP-750 files already use sql.
