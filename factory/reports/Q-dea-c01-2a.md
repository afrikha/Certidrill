# Q-dea-c01-2a — report

49 questions in `content/dea-c01/questions/datastore/`, prefix `deac01-2a-`, 7 per objective (2.1.1 to 2.1.7).
Types: single 41, multi 8 (2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, and two in 2.1.7). Difficulty: 14 easy / 24 medium / 11 hard. Validator: 0 problems.

## Decisions and deviations

- Multi stems end with "(Choose two.)" and no scoring NOTE. The WRITING_GUIDE updated on 2026-11-22 says AWS `all_or_nothing` blueprints reject the NOTE, and the dea-c01 blueprint sets `scoring.multi: all_or_nothing`. Older AWS banks (saa, dva, scs...) still carry the NOTE. Align them one way or the other.
- Course chapter 21 did not exist yet, so the questions rely only on the AWS pages I fetched.
- I avoided decisions that saa-c03/dva-c03 already test (basic Transfer Family SFTP/AS2/IP allowlist, DataSync NFS, DMS to S3 basics, Neptune/Keyspaces choice, Athena ad hoc). Transfer Family questions cover managed workflows, SFTP connectors, connector EventBridge events, AD identity provider and web apps instead.
- No closed service is a correct answer. Lake Formation Governed Tables appears only as a wrong option, explained as shut down (s3-tables-managed-iceberg). ElastiCache appears only as a distractor (memorydb-durable-primary). It is not on the guide's in-scope list.
- 2.1.3 HNSW questions are about the use case (pgvector in Aurora, the Bedrock knowledge base prerequisites). HNSW versus IVF is left to 2.1.8 (another batch).
- I dropped a MemoryDB vector-search question because the fetched page gives no index or engine details.

## Facts not fully verified on a fetched page (please spot-check)

- Reference title "Choose the right mode to stream in" for `streams/latest/dev/how-do-i-size-a-stream.html`. WebFetch reported this H1. It may be "Choose the data stream capacity mode".
- GSIs support only eventually consistent reads (dynamodb-lsi-strong-read, option c). The GSI page describes only eventually consistent reads and does not state it outright.
- StartFileTransfer is asynchronous, so the API call succeeds even when the retrieval later fails (transfer-connector-failure-alert, option c).
- pg_cancel_backend does not release locks held by an idle-in-transaction session; pg_terminate_backend does (aurora-pg-idle-blocker). This is standard PostgreSQL. The AWS Lock:transactionid page only mentions pg_stat_activity and pg_locks.
- SELECT ... FOR UPDATE row locking and READ UNCOMMITTED behavior (aurora-mysql-select-for-update). This is standard InnoDB. The cited Aurora page shows FOR UPDATE only as an example of a locking read.
- rds_kill_query leaves the session's open transaction and its locks in place (rds-mysql-rds-kill, option b). This is standard MySQL behavior.
- Redshift DELETE inside a transaction does not block concurrent SELECTs (redshift-truncate-vs-delete). The concurrent-writes page says tables can be read while they are being modified.
- Firehose stages data in S3 before COPY into Redshift (redshift-streaming-ingestion, option a). This comes from general Firehose knowledge, not a page fetched here.
- On-demand Kinesis and DynamoDB per-partition limits for a single hot key (dynamodb-write-sharding, option b). The DynamoDB part comes from general DynamoDB knowledge.
- DataSync copies only changed data on later task runs (datasync-hdfs-migration).
