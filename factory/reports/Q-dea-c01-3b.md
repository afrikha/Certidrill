# Q-dea-c01-3b — report

51 questions written in `content/dea-c01/questions/operations/` (prefix `deac01-3b-`), 42 single / 9 multi (8 × 2-of-5, 1 × 3-of-6), difficulty 15 easy / 26 medium / 10 hard, 6 for 3.2.1 and 5 for each of the other objectives. `factory/validate.ts` and `npm run content:validate` report 0 problems and 0 warnings.

## Notes and choices

- No NOTE sentence on multi questions: DEA-C01 `blueprint.scoring.multi` is `all_or_nothing`, so `tools/validate-questions.ts` rejects it.
- `content/_shared/glossary-aws.yaml` does not exist in this clone. I used AWS fr_fr terms from BRIEF-AWS §6: compartiment, politique, rubrique (SNS topic), journal de suivi (trail), groupe de journaux, partition (shard), tâche (Glue job), groupe de travail, bloc-notes.
- Product names: "AWS Quick Sight" (as the docs and the SAA-C03 bank write it), Amazon Data Firehose.
- 3.2.4 (Athena notebooks): the in-console notebooks exist only with **PySpark engine version 3**. Apache Spark version 3.5 has no console notebooks and no calculation APIs; it runs from SageMaker Unified Studio notebooks or Spark Connect clients. The questions name the release version every time.
- I removed or rewrote drafts that repeated existing AWS associate questions: DataBrew recipe for no-code analysts (saac03-3c-glue-databrew-analysts), OpenSearch log search and dashboards (saac03-3c-opensearch-log-search), Managed Grafana with no servers to run (saac03-3c-managed-grafana-ops), Lambda Kinesis ParallelizationFactor (dvac03-1b-lambda-kinesis-parallelization), Kinesis hot partition key (dvac03-1b-kds-hot-partition-key), metric filter error count (dvac03-4b-metric-filter-errors), and CloudWatch alarm with a KMS-encrypted SNS topic (dvac03-4b-alarm-encrypted-sns-topic).
- No answer depends on the Lambda maximum timeout, and no closed or maintenance-mode service is a correct answer.

## Facts not fully verified (kept out of the answers where possible)

- Whether a change to `enable_user_activity_logging` needs a reboot: the page does not say, so the question does not mention it.
- MSK Serverless: the question uses the published quota table (200 MBps ingress per cluster, unlimited retention, 8 MiB messages). I did not check whether these quotas can be raised.
- The DataBrew profile visuals in the console: the docs describe the profile statistics, and I took the visual display in the console from the product UI.
