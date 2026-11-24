# QZ-dp-420-33-operational-analytics — end-of-chapter quiz, DP-420, chapter 33-operational-analytics

File: `content/dp-420/quizzes/33-operational-analytics.yaml` (10 questions, EN + FR, draft).
Check: `npx tsx factory/check-quiz.ts dp-420 33-operational-analytics` → 0 problem(s), 0 warning(s).

Objectives: 3.3.1 (q3, q6), 3.3.2 (q1, q5, q8, q10), 3.3.3 (q2, q7), 3.3.4 (q4, q9). Positions 6–10: yesno, single, multi, multi, multi (choose 3).
Mock-exam questions of 3.3.x read first (about 40, case studies and series included); the quiz tests other decisions: least-privileged workspace role (Member), nested object as JSON string, item permissions scope in Fabric (workspace = boundary), connector environment setup, container added/recreated/source deleted, Fabric limits + CU billing, sharing only the SQL analytics endpoint, mirroring cost (7-day tier, same region), Spark write to Fabric (autoscale ≥ 1,000 RU/s + `id` column), private-endpoint mirroring setup.

## Pages fetched (2026-11-24)

fabric/mirroring: azure-cosmos-db, azure-cosmos-db-limitations, azure-cosmos-db-tutorial, azure-cosmos-db-faq, azure-cosmos-db-how-to-query-nested, azure-cosmos-db-private-network, monitor, monitor-logs. fabric/database/cosmos-db: limitations, faq, billing-usage, how-to-use-spark-notebooks. azure/cosmos-db: nosql/tutorial-spark-connector, nosql/throughput-control-spark, tutorial-reverse-extract-transform-load.

## Doubts / inferences

- q9: the 1,000 RU/s minimum is stated for "containers created using an SDK"; applying it to the Spark catalog `CREATE TABLE` is an inference (the connector uses the Java SDK, and the Fabric Spark page calls 1,000 RU/s "the minimum value"). That `manualThroughput` fails in Fabric follows from "must have throughput set to autoscale during container creation or an error will be thrown".
- q4 distractor `azure-cosmos-spark_3-4_2-12`: the artifact naming pattern is from the Fabric page (3-5 for Spark 3.5); the 3-4 artifact's existence isn't on a fetched Learn page.
- q1 relies on the limitations page: mirroring "requires either the admin or member role"; Contributor is therefore treated as insufficient.

## Chapter / mock-exam vs current Learn

- **Preview as correct answer (mock exam and chapter)**: the operation logs page is titled "Mirrored database operation logs (Preview)". The chapter presents `MirroredDatabaseTableExecution` without a preview mention, and `dp420-3c-mirror-latency-kql` makes it the correct answer. The quiz avoids it.
- **Spark write strategies**: Learn pages show only `ItemOverwrite` (Fabric Spark page) and `ItemPatch` (Spark tutorial). `ItemAppend`, `ItemOverwriteIfNotModified`, `ItemDelete*`, `ItemPatchIfExists` are only in the GitHub configuration reference. `dp420-3c-patch-if-exists` and `dp420-3c-spark-etag-overwrite` cite the Spark tutorial, which doesn't cover their answer.
- **Learn conflicts (unchanged since the course report)**: mirroring FAQ says private endpoints aren't supported, while the overview, limitations and private-network pages document the setup (chapter and q10 follow the latter); FAQ says the mirror reads from the region closest to the capacity when there are several read regions, overview and limitations say the write region (q8 uses a single-region account to avoid it); Cosmos DB in Fabric limitations say JSON strings over 8 KB are truncated in the SQL endpoint, mirroring limitations say `varchar(max)` up to 2 MB for tables created after 2025-11-18.
- Throughput control: `targetThroughputThreshold` requires the `.../throughputSettings/read` data action with Microsoft Entra RBAC, and server-side throughput buckets (preview) are now the page's preferred approach; neither is in the chapter (fine for the exam, noted only).
- The private-network page requires the Fabric workspace's region to match the account and `Microsoft.PowerPlatform` registered; the chapter mentions the region only.

## Other

- While grepping, two bank files from other agents didn't parse as YAML at the time: `questions/ai-analytics/dp420-3b-perf-diskann-build-policy.yaml`, `questions/ai-analytics/dp420-cs1c-chunk-vectors.yaml` (possibly being written). Not touched.
