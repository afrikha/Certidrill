# Q-sap-c03-1d — QUESTIONS SAP-C03, domain architecture (1.5.1–1.5.7)

## Counts
- 35 questions in `content/sap-c03/questions/architecture/`, prefix `sapc03-1d-`, 5 per objective (1.5.1 to 1.5.7).
- Types: single 29, multi 6 (five "Choose two", one "Choose three": `sapc03-1d-lf-upgrade-from-iam`).
- Difficulty: 5 easy, 18 medium, 12 hard. Correct-option positions of singles: a 7, b 7, c 8, d 7.
- `CERT=sap-c03 npx tsx factory/validate.ts --prefix sapc03-1d-` → 35 files, 0 problem(s).

## Overlap with SAA-C03 avoided
The SAA bank already covers Neptune fraud graphs, Keyspaces for Cassandra, RDS Proxy, S3 Express One Zone, OpenSearch product search,
Timestream for InfluxDB, DocumentDB for MongoDB, cross-Region read replicas, LF-Tags in one account, basic DAX and lazy loading. These
decisions were not reused. The angles here are professional-level ones: Iceberg erasure + time travel, Lake Formation upgrade from IAM
(IAMAllowedPrincipals), S3 Tables, Firehose with an MSK source, Redshift streaming ingestion with no S3 staging, zero-ETL from Aurora
and Salesforce, EMR on EKS, pgvector for Bedrock knowledge bases, RDS for Db2/Oracle retain, DynamoDB uniqueness with transactions,
write forwarding, DynamoDB MRSC, Multi-AZ DB clusters, Aurora Limitless, global writer endpoint, Mountpoint for S3, OpenZFS clones,
SnapMirror migration, FSx for Windows for SQL Server FCI, Multi-Region Access Points, DAX query-cache TTL, Global Datastore, data
tiering, Glue Data Catalog as EMR metastore, Lake Formation external sharing with filters, resource links, Clean Rooms aggregation
rules, Redshift data sharing.

## Facts not verified on a fetched page in this session (well established; kept)
The WebFetch hourly limit was reached near the end, so these were not re-checked:
- Aurora Global Database RPO "typically measured in seconds" (the `aurora-global-database.html` page could not be fetched; reference
  removed from `sapc03-1d-aurora-global-writer-endpoint`, which cites only the connecting page).
- EBS Multi-Attach limited to instances in the same Availability Zone; CloudFront origin failover only for GET/HEAD/OPTIONS;
  ElastiCache asynchronous replication to in-Region replicas; GSIs reject ConsistentRead; Babelfish = T-SQL only; Route 53 health
  checkers cannot reach private-only endpoints; S3 Glacier Deep Archive restores take hours.

## Choices to review
- `sapc03-1d-zero-etl-two-sources`: relies on the Redshift zero-ETL page listing Salesforce as a supported application source.
- `sapc03-1d-aurora-limitless-writes`: Limitless Database used as the answer (part of Aurora, in scope).
- `sapc03-1d-ddb-mrsc-rpo-zero`: MRSC limitations (no TTL, transactions, LSIs; empty table only) are stated in the stem.
- No answer depends on closed services (Migration Hub, ADS, Snow Family, OpsWorks, Q Developer, S3 Object Lambda avoided) or on the
  Lambda maximum timeout.
