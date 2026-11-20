Developers choose and configure data stores every day: which service fits an access pattern, how long data is kept and how it expires, where a cache goes, and above all how a DynamoDB table is keyed, indexed, read and written. DVA-C03 questions test these settings and the capacity arithmetic behind them. This chapter covers data lifecycles, store selection, caching by data store, and DynamoDB keys, indexes, consistency and operations.

<!-- section: data-lifecycle | objectives: 1.3.1 -->
## Managing data lifecycles

Each store has its own way to keep data only as long as needed:

| Store | Lifecycle control | Facts to remember |
| --- | --- | --- |
| Amazon S3 | S3 Lifecycle rules: transition, expiration, noncurrent versions, incomplete multipart uploads | Objects must be 30 days old before moving to S3 Standard-IA or S3 One Zone-IA; in a versioned bucket, expiration only adds a delete marker |
| Amazon S3 | S3 Object Lock retention (governance or compliance mode), legal holds | Requires versioning; compliance mode can't be shortened by anyone |
| DynamoDB | Time to Live (TTL) on a Number attribute holding an epoch time in seconds | Expired items are deleted typically within a few days, without consuming write capacity |
| CloudWatch Logs | Retention per log group | Never expire by default; expired events are deleted within about 72 hours |
| Amazon SQS | Message retention period | 1 minute to 14 days, 4 days by default |
| Kinesis Data Streams / DynamoDB Streams | Stream retention | 24 hours by default up to 365 days / always 24 hours |
| DynamoDB / Amazon RDS | Point-in-time recovery / automated backups | 1 to 35 days / 0 to 35 days |
| ElastiCache | TTL on each key | The key disappears when its TTL expires |

```json
{
  "Rules": [
    {
      "ID": "exports-lifecycle",
      "Status": "Enabled",
      "Filter": { "Prefix": "exports/" },
      "Transitions": [ { "Days": 30, "StorageClass": "STANDARD_IA" } ],
      "Expiration": { "Days": 365 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 30 },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
    }
  ]
}
```

```bash
aws dynamodb update-time-to-live --table-name Sessions \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt"
aws logs put-retention-policy --log-group-name /aws/lambda/orders-api --retention-in-days 90
```

DynamoDB TTL details: an attribute that isn't a Number is ignored; expired items still appear in reads until they are deleted, so filter them out (`expiresAt > :now`); TTL deletions go to DynamoDB Streams as service deletions, which lets a Lambda function archive expired items to S3.

> **Exam trap.** TTL isn't a timer. "Sessions must be unusable exactly 30 minutes after their last activity" needs a check of `expiresAt` in the read path (or a filter expression); TTL only cleans up storage later.

<!-- section: choosing-stores | objectives: 1.3.2 -->
## Choosing a data store by access pattern

| Access pattern | Data store |
| --- | --- |
| Key-value or document access at any scale, single-digit millisecond latency, known queries | Amazon DynamoDB |
| Joins, ad hoc SQL, transactions across many tables, an existing relational schema | Amazon RDS or Amazon Aurora |
| Sub-millisecond reads of hot data, session stores, leaderboards, rate limits | Amazon ElastiCache (Valkey, Redis OSS or Memcached) |
| Objects and files (images, exports, backups), up to 5 TB each | Amazon S3 |
| Full-text search, relevance ranking, log analytics | Amazon OpenSearch Service |
| Occasional SQL queries over files already in S3 | Amazon Athena |
| A file system shared by instances, containers and Lambda functions | Amazon EFS |

- A DynamoDB item is limited to 400 KB: store large attributes (documents, images) in S3 and keep the object key in the item.
- S3 gives strong read-after-write consistency for every request and scales to at least 3,500 writes and 5,500 reads per second per prefix.
- DynamoDB on-demand capacity is the default and fits new or spiky traffic; provisioned capacity with auto scaling fits steady, predictable traffic.

> **Exam tip.** In DynamoDB you design the table from the queries ("get a customer's orders, newest first"), not from the entities. When the stem lists unknown or ad hoc queries with joins, the answer is a relational database.

<!-- section: caching | objectives: 1.3.3 -->
## Choosing a caching solution for the data store

| Data store or layer | Cache | Notes |
| --- | --- | --- |
| DynamoDB | DynamoDB Accelerator (DAX) | Same API through the DAX client, microsecond reads, write-through; item cache for `GetItem` and `BatchGetItem`, query cache for `Query` and `Scan`; eventually consistent reads only |
| RDS or Aurora | ElastiCache | Application code reads and fills the cache (lazy loading or write-through) |
| S3 objects and static or dynamic HTTP content | Amazon CloudFront | Edge caching with TTLs per cache behavior; origin access control keeps the bucket private |
| API responses | API Gateway stage cache (REST APIs) | Default TTL 300 seconds, from 0 to 3,600; cache keys can include parameters |
| Lambda | Variables in the initialization code, `/tmp`, the Parameters and Secrets extension | Lasts only while the execution environment is warm |

ElastiCache for **Valkey or Redis OSS** offers replication, Multi-AZ failover, persistence and data structures (sorted sets, hashes); **Memcached** is a simple multithreaded cache with no replication; **ElastiCache Serverless** removes node sizing.

| Strategy | How | Trade-off |
| --- | --- | --- |
| Lazy loading (cache-aside) | Read the cache; on a miss, read the database and write the result to the cache | Only requested data is cached; a miss costs three trips; data can be stale |
| Write-through | Update the cache on every database write | Data is never stale; every write costs more; unread data fills the cache |
| TTL | Expire each key after a set time | Limits staleness for lazy loading and unused data for write-through |

```text
# Python: lazy loading with a TTL in ElastiCache (Valkey or Redis OSS)
def get_product(product_id):
    key = f"product:{product_id}"
    cached = cache.get(key)
    if cached:
        return json.loads(cached)
    item = table.get_item(Key={"productId": product_id})["Item"]   # or a SQL query on RDS
    cache.setex(key, 300, json.dumps(item, default=str))
    return item
```

> **Exam trap.** DAX doesn't cache strongly consistent reads: requests with `ConsistentRead` true go straight to DynamoDB. "Microsecond reads with the least code change" on DynamoDB is DAX; "the application needs strongly consistent reads" rules DAX out as a speed-up.

<!-- section: dynamodb-keys-indexes | objectives: 1.3.4 -->
## DynamoDB keys, attributes and indexes

A table's **primary key** is either a partition key alone or a partition key plus a sort key; only the key attributes are declared, all other attributes are free per item. Key attributes are String, Number or Binary (partition key up to 2,048 bytes, sort key up to 1,024 bytes).

- **High cardinality**: DynamoDB hashes the partition key to spread items across partitions. Each partition serves up to 3,000 RCUs and 1,000 WCUs, so a key with few values (a status, today's date) creates a hot partition and throttling even when the table's total capacity is far from used. Use a key with many distinct values (`customerId`, `deviceId`) or add a calculated suffix (write sharding: `2026-11-20#7`).
- **Sort key**: groups related items under one partition key and supports range conditions (`orderDate` with `begins_with` or `BETWEEN`); composite values such as `ORDER#2026-11-20` support several access patterns.

| | Global secondary index (GSI) | Local secondary index (LSI) |
| --- | --- | --- |
| Keys | Any partition key and optional sort key | Same partition key as the table, a different sort key |
| Created | At any time | Only when the table is created |
| Read consistency | Eventually consistent only | Eventually or strongly consistent |
| Capacity | Its own (provisioned mode); a GSI short of write capacity throttles writes to the table | Shares the table's capacity |
| Limits | 20 per table by default (adjustable) | 5 per table; each partition key value limited to 10 GB of items |
| Non-projected attributes | Can't be read through the index | Fetched from the table, at extra read cost |

Indexes project `KEYS_ONLY`, `INCLUDE` (named attributes) or `ALL`. An item without the index key attributes isn't written to the index (**sparse index**), which makes "find the few open orders" cheap. GSI keys may also combine up to four attributes for the partition key and four for the sort key.

> **Exam trap.** "Query the table by a new attribute with strongly consistent reads" can't be met by a new GSI (eventually consistent) or a new LSI (only at table creation). The answer is to recreate the table with an LSI and migrate the data, or to accept eventual consistency.

<!-- section: dynamodb-operations | objectives: 1.3.4 -->
## DynamoDB consistency, capacity, Query and Scan

Reads are **eventually consistent** by default; set `ConsistentRead` to true on `GetItem`, `Query` or `Scan` against a table or an LSI for a **strongly consistent** read, at twice the cost.

| Unit | Definition |
| --- | --- |
| 1 RCU | 1 strongly consistent read per second, or 2 eventually consistent reads, of an item up to 4 KB |
| 1 WCU | 1 write per second of an item up to 1 KB |
| Transactions | 2 RCUs per 4 KB read, 2 WCUs per 1 KB written |

Sizes round up per item: 80 strongly consistent reads per second of 10 KB items need 80 × 3 = 240 RCUs (120 eventually consistent, 480 transactional); 50 writes per second of 2.5 KB items need 50 × 3 = 150 WCUs.

| | Query | Scan |
| --- | --- | --- |
| Reads | Items of one partition key value, optionally a sort key range (`=`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `begins_with`) | Every item of the table or index |
| Order | Sort key order; `ScanIndexForward` false for descending | Arbitrary across partition keys |
| Filter expression | Applied after reading: filtered items still consume capacity | Same |
| Page | Up to 1 MB per call; continue with `LastEvaluatedKey` as `ExclusiveStartKey` | Same; parallel scan with `Segment` and `TotalSegments` |

```json
{
  "TableName": "Orders",
  "KeyConditionExpression": "customerId = :c AND begins_with(orderDate, :y)",
  "FilterExpression": "orderStatus = :s",
  "ExpressionAttributeValues": { ":c": { "S": "C-123" }, ":y": { "S": "2026-" }, ":s": { "S": "SHIPPED" } },
  "ScanIndexForward": false
}
```

`Limit` caps the items evaluated per page before the filter, so a page can return fewer items than `Limit`. A `ProjectionExpression` reduces the data returned but not the capacity consumed.

Writes:

- **Conditional writes** (`ConditionExpression` on `PutItem`, `UpdateItem`, `DeleteItem`) prevent overwrites (`attribute_not_exists(orderId)`) or implement **optimistic locking** with a version attribute; a false condition raises `ConditionalCheckFailedException`.
- **Atomic counters**: `UpdateExpression` with `ADD viewCount :one` or `SET viewCount = viewCount + :one` needs no read first.
- **Batch operations**: `BatchWriteItem` takes up to 25 puts or deletes (16 MB), can't update or use conditions, isn't atomic as a whole, and returns `UnprocessedItems` to retry with backoff; `BatchGetItem` reads up to 100 items.
- **Transactions**: `TransactWriteItems` groups up to 100 actions (`Put`, `Update`, `Delete`, `ConditionCheck`, 4 MB in total) across tables, all or nothing; no two actions on the same item; `ClientRequestToken` makes a retry idempotent for 10 minutes.

```text
# Python (boto3): optimistic locking
table.update_item(
    Key={"orderId": "o-1001"},
    UpdateExpression="SET orderStatus = :s, #v = #v + :one",
    ConditionExpression="#v = :expected",
    ExpressionAttributeNames={"#v": "version"},
    ExpressionAttributeValues={":s": "SHIPPED", ":one": 1, ":expected": current_version},
)
```

> **Exam trap.** Adding a filter expression to a Scan doesn't reduce its cost: the whole table is still read. "Retrieve a customer's orders efficiently" is a Query on a key (or a GSI) that starts with `customerId`.

<!-- section: key-points -->
## Key points

- Lifecycle tools: S3 Lifecycle and Object Lock, DynamoDB TTL (epoch seconds, deletion within days, no WCU), log group retention, queue and stream retention.
- DynamoDB for known key-based access patterns, RDS or Aurora for joins and ad hoc SQL, ElastiCache for hot data, S3 for objects and items over 400 KB.
- DAX caches DynamoDB eventually consistent reads; ElastiCache needs lazy loading or write-through code; CloudFront for S3; API Gateway caches REST responses.
- High-cardinality partition keys avoid hot partitions; sort keys enable ranges.
- GSI: any key, any time, eventually consistent; LSI: same partition key, at creation, strong consistency possible.
- RCUs per 4 KB (half for eventual, double for transactions), WCUs per 1 KB, rounded up per item.
- Query over Scan; filters don't save capacity; paginate with `LastEvaluatedKey`.
- Conditional writes, optimistic locking, atomic counters, batch limits (25 writes, 100 reads) and transactions (100 actions).
