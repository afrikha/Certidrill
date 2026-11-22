# Q-dea-c01-4c — report

36 questions (single 30, multi 6), prefix `deac01-4c-`, 4 per objective (4.4.4–4.5.7). Difficulty 10 easy / 18 medium / 8 hard. Validator: 0 problem(s).

## Points inferred, not stated verbatim on a fetched page
- `deac01-4c-scp-deny-s3-replication`: the claim that a Region-deny SCP (aws:RequestedRegion) does not stop replication to an external bucket because PutBucketReplication targets the source bucket's Region is an inference from how S3 regional requests work.
- `deac01-4c-backup-copy-targets`: the service authorization reference lists `backup:CopyTargets` (ArrayOfARN) on the permission-only action `backup:CopyFromBackupVault`; no AWS Backup guide page shows an SCP example. The course chapter 45 uses the same control.
- `deac01-4c-kms-replica-region`: "ReplicateKey is called in the primary key's Region" is taken from the ReplicateKey API page (permission on the primary key in its Region; CloudTrail records ReplicateKey there).
- `deac01-4c-logs-insights-glue-errors`: "metric filters only evaluate events ingested after creation" and "subscription filters stream only new events" are well-known CloudWatch Logs behaviors, not on the fetched pages.
- `deac01-4c-smus-*`: SageMaker Unified Studio pages do not detail how project members consume subscribed data; the questions only rely on documented points (members of a project request; members of the owning project approve; filtered access with row/column filters; automatic approval when approval is disabled or the requester is owner/contributor of both projects; metadata enforcement rules for publishing and subscription requests, cascade to child domain units).

## French terminology to check (no AWS glossary file in this clone: `content/_shared/glossary-aws.yaml` is absent)
- datashare: « unité de partage des données (datashare) » at first mention.
- trail / organization trail: « journal de suivi » / « journal de suivi d'organisation ».
- SageMaker Catalog asset: « ressource (asset) »; asset filters « filtres de ressource »; metadata enforcement rule « règle d'application des métadonnées »; domain unit « unité de domaine ».
- Macie findings « résultats (findings) », sensitive data discovery results « résultats de découverte de données sensibles », allow list « liste d'autorisation ».
- Control Tower landing zone « zone de destination (landing zone) »; recording mode override « substitution du mode d'enregistrement ».
