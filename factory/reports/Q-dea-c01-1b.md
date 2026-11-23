# Q-dea-c01-1b report

51 questions, prefix `deac01-1b-`, `content/dea-c01/questions/ingestion/`. Per objective: 1.1.8 7, 1.1.9 7, 1.1.10 7, 1.1.11 6, 1.1.12 6, 1.2.1 6, 1.2.2 6, 1.2.3 6. Types: single 42, multi 9 (no scoring note: blueprint scores multi all or nothing). Difficulty: 15 easy / 26 medium / 10 hard. Correct single options: a 10, b 10, c 11, d 11.

Both validators: 0 problems (`factory/validate.ts` and `npm run content:validate -- --cert dea-c01 --prefix deac01-1b-`). The only warning is about `blueprint.yaml` (dragdrop scoring), which is not my file.

## Notes and doubts

- `content/_shared/glossary-aws.yaml`, which `lib/vendors.ts` names as the AWS glossary, does not exist, so the French terminology check of `content:validate` did not run. I used AWS fr_fr terms: compartiment, politique, Région, flux de données, partition (shard), rubrique (SNS and Kafka topic), signet de tâche, mappage de source d'événement, file d'attente de lettres mortes, diffusion améliorée (enhanced fan-out), unité de partage des données (datashare), intégration zéro ETL.
- From general knowledge, not checked on a fetched page: that EMR on EKS virtual clusters map to EKS namespaces (only mentioned in an option), that global secondary indexes do not support strongly consistent reads (used in a distractor explanation), and that `push_down_predicate` filters catalog partitions (also in a distractor explanation).
- Kafka consumer-group semantics (each group gets all records; members of a group split them) come from the Lambda page "Customizable consumer group ID in Lambda", which is the reference of `deac01-1b-msk-consumer-groups`.
- The Firehose to Redshift question follows the current Firehose page: a cluster or workgroup in a VPC must be publicly accessible and allow the Firehose CIDR block of its Region. The page lists no private option.
- Athena Federated Query: since April 21, 2026, some new connectors are registered as Glue Data Catalogs and run without a Lambda function. The questions say "data source connectors" and do not mention Lambda.
- I left out these facts because I could not verify them: the Redshift `jdbc:redshift:iam://` URL format, the per-destination SNS FIFO subscription matrix, Fargate Spot with ARM64, and DynamoDB warm throughput.
- Topics already covered by SAA-C03 and DVA-C03 questions (EFO latency, RDS Proxy, EventBridge archive, Kinesis Data Streams for DynamoDB) were avoided or tested from another angle, for example: shared throughput is enough, the cost question.
