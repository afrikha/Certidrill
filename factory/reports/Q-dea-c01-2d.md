# Q-dea-c01-2d — report

31 questions in `content/dea-c01/questions/datastore/`, prefix `deac01-2d-`: 2.4.2 ×7, 2.4.3 ×6, 2.4.4 ×6, 2.4.5 ×6, 2.4.6 ×6. single 26 / multi 5; difficulty 9 easy / 16 medium / 6 hard. Validator: 0 problem(s).

## Notes and deviations
- No course chapter `24-data-modeling` existed while writing; questions rely on AWS docs fetched on 2026-11-22/23.
- Multi stems carry no "NOTE: Each correct selection…" sentence (blueprint scores multi all_or_nothing; WRITING_GUIDE AWS §4).
- `deac01-2d-sct-teradata-redshift` makes AWS SCT the correct answer: the objective names SCT, and DMS Schema Conversion lists Oracle as its only source for a Redshift target (Teradata not supported). The SCT page shows no deprecation. The profile notes SCT left the in-scope list: review if you prefer to drop it.
- After checking parallel batches, I replaced 4 of my drafts that matched existing questions on the same decision (2b crawl-single-schema-path, 2b crawl-keep-manual-schema, 2b part-glue-job-update-catalog, 2a redshift-super-json). Their replacements cover Iceberg CHANGE COLUMN, Redshift VARCHAR widening, ResolveChoice cast and DMS HandleSourceTableAltered.
- `deac01-2d-schema-registry-forward` (FORWARD) complements 2b `tech-schema-registry-backward` (BACKWARD): same feature, opposite upgrade order.

## Facts used from general knowledge (not on a fetched page)
- CloudTrail event history keeps 90 days of management events (ml-lineage-query-datasets, distractor).
- DynamoDB LSIs can be created only at table creation (dynamodb-sparse-gsi, distractor).
- Athena VACUUM on Iceberg expires snapshots and removes orphan files (iceberg-compaction, distractor).
- Redshift federated queries target RDS/Aurora PostgreSQL and MySQL (sct-teradata-redshift, distractor).
- Athena query result reuse and per-query data usage limits (distractors).
