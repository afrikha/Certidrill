Data quality questions describe a pipeline that lets bad records through (empty customer IDs, duplicate orders, negative amounts, a feed that suddenly delivers half its usual rows) or a job that runs far longer than its data volume justifies. The answer names where to check (inside the ETL job or on the table at rest), which tool writes the rules (AWS Glue Data Quality with DQDL, or AWS Glue DataBrew rulesets), what happens to failing rows, how to look at a representative part of a large dataset, and how to remove data skew. This chapter covers in-pipeline checks, rule definition, consistency investigation, sampling and skew.

<!-- section: checks-in-pipeline | objectives: 3.4.1 -->
## Running data quality checks during processing

AWS Glue Data Quality is serverless and built on the open-source Deequ framework. It has two entry points that the exam distinguishes:

| Capability | Data Catalog-based | ETL job-based |
| --- | --- | --- |
| What it checks | Tables (and supported Athena views) already in the Glue Data Catalog: data at rest | Data flowing through a Glue job, before it reaches the target |
| Typical user | Data stewards, analysts, no code | Data engineers, in Glue Studio, notebooks or scripts |
| Rule recommendations | Yes (Glue profiles the data and proposes rules) | No |
| Identify the failing records | No | Yes: row-level results |
| Dynamic rules and labels | No | Yes |
| Incremental runs | Pushdown predicates | Glue job bookmarks |

In a Glue Studio job, the **Evaluate Data Quality** transform runs a ruleset and can output:

- the **original data** (`rowLevelOutcomes`) with added columns `DataQualityRulesPass`, `DataQualityRulesFail`, `DataQualityRulesSkip` and `DataQualityEvaluationResult` (`Passed` or `Failed` for each row);
- the **rule outcomes** (`ruleOutcomes`): each rule with its pass or fail status, to write to S3 or a database.

The action on ruleset failure is one of: **None** (default, the job continues), **Fail job after loading data to target**, or **Fail job without loading to target data**. Results and metrics are published to Amazon CloudWatch and Amazon EventBridge for alarms and automated responses.

A common pattern routes rows with `DataQualityEvaluationResult = 'Failed'` to a quarantine prefix and the rest to the curated zone, so good data keeps flowing while bad rows are fixed:

```python
from awsglue.transforms import SelectFromCollection
from awsgluedq.transforms import EvaluateDataQuality

ruleset = """Rules = [
    IsComplete "order_id",
    IsUnique "order_id",
    ColumnValues "amount" > 0
]"""

results = EvaluateDataQuality().process_rows(
    frame=orders,
    ruleset=ruleset,
    publishing_options={
        "dataQualityEvaluationContext": "orders_check",
        "enableDataQualityCloudWatchMetrics": True,
        "enableDataQualityResultsPublishing": True,
    },
)
rows = SelectFromCollection.apply(dfc=results, key="rowLevelOutcomes").toDF()
good = rows.filter(rows.DataQualityEvaluationResult == "Passed")
bad = rows.filter(rows.DataQualityEvaluationResult == "Failed")
```

| Requirement | Choice |
| --- | --- |
| Stop bad data from reaching the data lake, least code | Evaluate Data Quality transform in the Glue job, fail the job or split failing rows |
| Keep loading good rows, isolate the bad ones | Row-level outcomes, filter on `DataQualityEvaluationResult` to a quarantine location |
| Monitor tables that other teams load, no pipeline change | Data Catalog-based data quality on a schedule |
| Alert the team when a check fails | EventBridge rule on the data quality result, target Amazon SNS |
| Simple check on a small file as it lands in S3 | S3 event notification to a Lambda function that validates and moves the object |
| Checks inside Spark on Amazon EMR | The open-source Deequ (or PyDeequ) library in the Spark application |

> **Exam trap.** Data Catalog-based data quality cannot tell you which records failed and cannot block a load: it evaluates data that is already stored. "Prevent records with empty fields from being written" needs the check inside the ETL job.

<!-- section: quality-rules | objectives: 3.4.2 -->
## Defining data quality rules

**DQDL** (Data Quality Definition Language) is case sensitive. A ruleset is a `Rules` list; each rule is a rule type, its parameters and, for most types, an expression.

```text
Rules = [
    IsComplete "customer_id",
    IsPrimaryKey "order_id",
    Completeness "email" > 0.95,
    ColumnValues "status" in ["NEW", "SHIPPED", "CANCELLED"],
    ColumnValues "country" matches "[A-Z]{2}" with threshold > 0.99,
    ColumnLength "postcode" between 4 and 10,
    DataFreshness "updated_at" <= 24 hours,
    RowCount > avg(last(7)) * 0.8,
    (IsComplete "ship_date") or (ColumnValues "status" = "NEW"),
    Completeness "discount" > 0.9 where "channel = 'web'"
]
Analyzers = [
    DistinctValuesCount "product_id"
]
```

| Rule family | Examples | Checks |
| --- | --- | --- |
| Completeness | `IsComplete`, `Completeness` | No nulls, or a minimum ratio of non-null values |
| Uniqueness | `IsUnique`, `IsPrimaryKey`, `Uniqueness`, `UniqueValueRatio` | Duplicates in keys |
| Validity | `ColumnValues`, `ColumnLength`, `ColumnDataType`, `ColumnExists` | Allowed values, ranges, regex patterns, types |
| Statistics | `Mean`, `Sum`, `StandardDeviation`, `Entropy`, `DistinctValuesCount` | Distribution of a column |
| Volume and timeliness | `RowCount`, `DataFreshness`, `FileFreshness`, `FileSize` | Missing loads, stale data |
| Cross-dataset | `ReferentialIntegrity`, `DatasetMatch`, `RowCountMatch`, `AggregateMatch`, `SchemaMatch` | Consistency with another dataset |
| Free form | `CustomSql` | Any SQL condition |

- **Thresholds** (`with threshold > 0.99`) accept a share of failing rows for `ColumnValues`, `ColumnDataType` and `CustomSql`.
- **`where`** filters the rows a rule evaluates (Spark SQL predicate).
- **Dynamic rules** compare with history: `last(k)` returns the last k values of the metric and must be wrapped in `avg`, `min`, `max`, `median`, `sum` or `std` when k is above 1. They work only in ETL jobs.
- **Analyzers** gather statistics without pass or fail; with them, **anomaly detection** (machine learning on statistics over time) raises observations such as an unusual row count, and `DetectAnomalies` turns that into a rule.
- **Recommendations**: on a Data Catalog table, Glue profiles the data and proposes a starter ruleset.
- Limits: 2,000 rules and 65 KB per ruleset; nested or list columns must be flattened first.

**AWS Glue DataBrew** defines rules visually. A **ruleset** belongs to a dataset and holds rules; each rule has one or more checks combined with AND or OR, either aggregate (maximum, minimum, number of duplicates) or row level with a passing threshold ("at least 95 % of rows"). Rules apply to simple column types only. Rulesets are validated when a **profile job** runs; the validation report is written next to the profile in S3.

> **Exam tip.** "Data analysts without coding skills define and validate quality rules" points to DataBrew rulesets or Data Catalog-based Glue Data Quality with recommendations. "Fail the ETL job when the daily row count drops by more than 20 % compared with recent runs" is a DQDL dynamic rule in the job.

<!-- section: data-consistency | objectives: 3.4.3 -->
## Investigating data consistency

Consistency means the same fact has the same value and format everywhere: one date format, one country code list, no orphan foreign keys, the same totals in source and target.

A DataBrew **profile job** reveals inconsistencies before you write rules:

| Profile statistic | Inconsistency it reveals |
| --- | --- |
| `DUPLICATE_ROWS_COUNT` (dataset) | Duplicate loads, replayed messages |
| `CORRELATION` (dataset) | Columns that should move together but don't |
| `MISSING_VALUES_COUNT` (nulls and empty strings) | Sources that leave optional fields empty |
| `DISTINCT_VALUES_COUNT`, `MOST_COMMON_VALUES` | The same value spelled several ways ("FR", "France", "fr") |
| `VALUE_DISTRIBUTION`, `OUTLIER_DETECTION` (z-score, threshold 3 by default) | Wrong units, values out of range |
| Entity detection (`EMAIL`, `CREDIT_CARD`, `PERSON_NAME`...) | PII in columns where it should not be |

The fix is a DataBrew **recipe** (standardize case, change formats, fill or remove missing values, remove duplicates) run by a recipe job, then a ruleset to keep the data consistent.

When a profile job with rulesets completes, DataBrew emits one EventBridge event per ruleset (`detail-type` "DataBrew Ruleset Validation Result", `validationState` `SUCCEEDED`, `FAILED` or `ERROR`):

```json
{
  "source": ["aws.databrew"],
  "detail-type": ["DataBrew Ruleset Validation Result"],
  "detail": { "validationState": ["FAILED"] }
}
```

Consistency **between datasets** uses the cross-dataset DQDL rules:

```text
Rules = [
    ReferentialIntegrity "customer_id" "reference.customer_id" = 1.0,
    RowCountMatch "reference" >= 0.99,
    DatasetMatch "reference" "order_id" >= 0.98
]
```

After a database migration, AWS DMS **data validation** compares source and target rows. For files, `SchemaMatch` and crawler schema change settings catch drift in column names and types.

> **Exam trap.** A profile job describes the data; it does not change it. Cleaning needs a recipe job (DataBrew) or a transformation in the Glue job.

<!-- section: data-sampling | objectives: 3.4.4 -->
## Data sampling techniques

Sampling reads a representative subset to profile data, build rules or test a transformation faster and cheaper than on the full dataset.

| Technique | How it works | Risk or use |
| --- | --- | --- |
| First N rows (head) | The first rows of the files | Fast, but biased when files are sorted or partitioned by date |
| Simple random | Every row has the same probability | Representative for uniform data |
| Systematic | Every k-th row | Simple; biased if the data has a period of k |
| Stratified | Random within each group (Region, product line), in proportion or with a minimum per group | Keeps small groups visible |
| Cluster or block | Whole blocks or partitions chosen at random | Cheapest to read; rows in a block are correlated |

AWS implementations:

| Tool | Sampling |
| --- | --- |
| DataBrew project | Sample of **first n rows** or **random rows**: 500 (default, first 500 rows), 1,000, 2,500 or a custom size up to 5,000 rows |
| Athena | `TABLESAMPLE BERNOULLI (p)`: each row with probability p, all blocks are scanned; `TABLESAMPLE SYSTEM (p)`: whole segments kept or skipped, cheaper but not independent |
| Spark on Glue or EMR | `df.sample(fraction=0.01)` random; `df.sampleBy("region", fractions)` stratified |
| Glue Detect Sensitive Data | "Detect fields containing PII" mode scans a sample portion (percentage of rows) with a detection threshold |

```text
SELECT region, avg(amount)
FROM sales TABLESAMPLE BERNOULLI (5)
GROUP BY region;
```

> **Exam trap.** A DataBrew project works on a sample (5,000 rows at most); the recipe job applies the recipe to the full dataset. A rule that looks satisfied in the project session can still fail on the full data.

<!-- section: data-skew | objectives: 3.4.5 -->
## Handling data skew

Skew is an uneven distribution of data or work: one Spark task, Redshift slice, Kinesis shard or DynamoDB partition gets much more than the others, so the slowest unit sets the pace or gets throttled.

**Detect it**

| Where | Signal |
| --- | --- |
| Glue job (Glue 4.0 or later, observability metrics on) | `glue.driver.skewness.stage` (longest task compared with the median task of a stage; skewness factor 5 by default) and `glue.driver.skewness.job`; long tail of tasks in the Spark UI |
| Amazon Redshift | `skew_rows` in `SVV_TABLE_INFO`: rows in the fullest slice divided by rows in the emptiest; close to 1.00 is even |
| Kinesis Data Streams | Enhanced shard-level metrics: one shard with high `IncomingBytes` and `WriteProvisionedThroughputExceeded` |
| DynamoDB | Throttling on a few keys; CloudWatch Contributor Insights shows the most accessed keys |

```text
SELECT "table", diststyle, skew_rows
FROM svv_table_info
ORDER BY skew_rows DESC;
```

**Fix it**

| Situation | Mechanism |
| --- | --- |
| Spark join where a few keys hold most rows | Adaptive Query Execution skew join (`spark.sql.adaptive.skewJoin.enabled`, on by default in recent Spark) splits large partitions |
| One side of the join is small | Broadcast join: no shuffle of the large side |
| A hot key in an aggregation or join | Salting: add a random suffix to the key, aggregate per salted key, then aggregate again |
| Unbalanced input partitions or tiny files | `repartition(n)` or `coalesce`, group small files |
| Redshift table with a low-cardinality or skewed distribution key | Choose a high-cardinality, evenly distributed key used in joins, or `DISTSTYLE EVEN` or `AUTO` |
| Hot Kinesis shard | Higher-cardinality or random partition key; split the shard or use on-demand mode |
| Hot DynamoDB partition | High-cardinality partition key; write sharding with a calculated or random suffix |

```python
from pyspark.sql import functions as F

SALT = 16
clicks_salted = clicks.withColumn("salt", (F.rand() * SALT).cast("int"))
partial = clicks_salted.groupBy("page_id", "salt").agg(F.count("*").alias("n"))
result = partial.groupBy("page_id").agg(F.sum("n").alias("clicks"))
```

> **Exam trap.** Adding workers (DPUs or EMR nodes) does not fix skew: the single overloaded task still runs alone. Redistribute the data (salting, AQE, broadcast, a better key) instead.

<!-- section: key-points -->
## Key points

- Glue Data Quality in the ETL job blocks or isolates bad rows (row-level outcomes); Data Catalog-based checks monitor data at rest and recommend rules but cannot identify failing records.
- Evaluate Data Quality actions: None, fail after loading, fail without loading; results to CloudWatch and EventBridge.
- DQDL: `IsComplete`, `IsUnique`, `ColumnValues`, `RowCount`, `ReferentialIntegrity`, `CustomSql`; thresholds, `where`, dynamic rules with `last(k)` (ETL only), analyzers and anomaly detection.
- DataBrew rulesets are validated by profile jobs; results go to S3 and to EventBridge; recipes clean the data.
- Profiles reveal duplicates, missing values, outliers, inconsistent spellings and PII.
- Sampling: first N is biased on sorted data; stratified keeps small groups; Athena `TABLESAMPLE BERNOULLI` or `SYSTEM`; DataBrew samples up to 5,000 rows.
- Skew: detect with `glue.driver.skewness.*`, `skew_rows`, shard metrics; fix with AQE, broadcast joins, salting, better keys. More capacity is not the fix.
