Once the database type is chosen, performance questions ask how to make it faster or bigger without rewriting it: where to place copies (Availability Zones, Regions), which kind of replica to add, which cache to put in front and with which strategy, and how to stop thousands of connections from overwhelming the engine. Each technique solves one problem; the stem's symptom tells you which.

<!-- section: global-infrastructure | objectives: 3.3.1 -->
## Databases across Availability Zones and Regions

| Scope | Option | What you get |
| --- | --- | --- |
| Several AZs, one Region | RDS Multi-AZ DB instance | Synchronous standby in another AZ, automatic failover; the standby serves no reads |
| Three AZs, one Region | RDS Multi-AZ DB cluster (MySQL, PostgreSQL) | One writer and two readable readers, semisynchronous replication, lower write latency than a Multi-AZ DB instance |
| Three AZs, one Region | Aurora cluster | Cluster volume on six storage nodes across three AZs; replicas in other AZs are failover targets |
| Several Regions, one writer | Aurora Global Database | One primary Region and up to 10 read-only secondary Regions, replication on dedicated infrastructure typically under a second |
| Several Regions, one writer | RDS cross-Region read replica | Asynchronous copy in another Region for local reads and DR |
| Several Regions, all writers | DynamoDB global tables | Multi-active replicas; every replica serves reads and writes |

- **Latency to users**: a database answers fastest from the Region where the application runs. For users on several continents, put read copies in their Regions (Aurora Global Database secondaries, cross-Region read replicas, DynamoDB global tables) and keep the application tier next to them.
- **Aurora Global Database**: a secondary cluster is read-only and can hold up to 16 reader instances. **Write forwarding** lets a secondary cluster send writes to the primary. **Switchover** moves the primary to a healthy secondary Region with no data loss (planned); **failover** recovers from an outage of the primary Region. The global database writer endpoint follows the primary after either operation.
- **DynamoDB global tables** use multi-Region eventual consistency (MREC, the default, last writer wins) or multi-Region strong consistency (MRSC, same account only). The mode is chosen at creation and can't be changed.

> **Exam trap.** Multi-AZ improves availability, not read performance: an RDS Multi-AZ DB instance's standby can't be read. If the stem needs both, choose a Multi-AZ DB cluster, Aurora replicas, or Multi-AZ plus read replicas.

<!-- section: replication-concepts | objectives: 3.3.7 -->
## Database replication: synchronous and asynchronous copies

| Copy | Replication | Readable | Main purpose | Failover |
| --- | --- | --- | --- | --- |
| Multi-AZ DB instance standby | Synchronous | No | Availability in one Region | Automatic |
| Multi-AZ DB cluster readers | Semisynchronous (one reader must acknowledge) | Yes | Availability plus read scaling | Automatic, to the reader with the most recent changes |
| RDS read replica | Asynchronous (engine-native) | Yes | Read scaling, cross-Region reads, DR | Manual promotion |
| Aurora Replica | Shared cluster volume, lag usually under 100 ms | Yes | Read scaling and availability | Automatic, by priority tier |
| Aurora Global Database secondary | Storage-level replication, typically under a second | Yes | Global reads, Regional DR | Switchover or failover |
| DynamoDB global table replica | Asynchronous (MREC) or strongly consistent (MRSC) | Yes, and writable | Multi-Region active-active | Application routes to another Region |

Consequences of asynchronous replication: a replica can return slightly old data (**replica lag**), and promoting it after the source fails can lose the last writes that hadn't arrived. Workloads that must read their own writes immediately read from the writer.

> **Exam tip.** "Offload read traffic" and "reports slow down the production database" mean read replicas. "Survive an AZ failure with automatic failover" means Multi-AZ. "Survive a Region failure with the lowest RPO and RTO for a relational database" means Aurora Global Database.

<!-- section: read-replicas-config | objectives: 3.3.9 -->
## Configuring read replicas to meet requirements

**Amazon RDS read replicas**

- Up to **15 read replicas** per source DB instance (for RDS for Oracle, AWS recommends at most 5 to limit lag). Created from a snapshot of the source, then kept up to date asynchronously.
- **Automated backups** must be enabled on the source (backup retention period greater than 0).
- Can be in the **same Region or another Region**; cross-Region replicas use a secure channel and serve local reads or DR.
- A replica can itself be **Multi-AZ** for its own availability. RDS for MySQL, MariaDB and some PostgreSQL versions support replicas of replicas; Oracle, SQL Server and Db2 don't.
- RDS for Oracle mounted replicas and RDS for Db2 standby replicas don't accept connections: they serve DR, not reads.
- **Promotion** turns a replica into a standalone writable instance: replication stops for good. Use it for DR or to split off a database.
- **No autoscaling**: RDS read replicas are created manually. Each replica is a separate endpoint; the application or a DNS layer distributes reads.

**Amazon Aurora replicas**

| Feature | Use |
| --- | --- |
| Reader endpoint | One DNS name that balances connections across all Aurora Replicas |
| Custom endpoint | A subset of instances, for example larger replicas reserved for reporting |
| Instance endpoint | One specific instance, for diagnosis or tuning |
| Aurora Auto Scaling | Target tracking on average CPU utilization (or another metric) adds and removes replicas, between 0 and 15 maximum; needs at least one reader |
| Failover priority | Tiers 0 (highest) to 15; at equal priority, the largest replica is promoted |

```bash
# Create a cross-Region read replica of an RDS for PostgreSQL instance
aws rds create-db-instance-read-replica \
  --db-instance-identifier orders-replica-eu \
  --source-db-instance-identifier arn:aws:rds:us-east-1:111122223333:db:orders \
  --region eu-west-1
```

> **Exam trap.** Read replicas only help if the application sends reads to them. "Without changing the application's connection string" rules out RDS read replicas as the whole answer; with Aurora, pointing read-only code to the single reader endpoint is the minimal change.

<!-- section: caching-services | objectives: 3.3.2 -->
## Caching services and strategies

| Service | Engine and features | Choose for |
| --- | --- | --- |
| ElastiCache for Valkey or Redis OSS | Rich data structures (sorted sets, hashes, lists), replication, Multi-AZ with automatic failover, backups, pub/sub, cluster mode for sharding | Database cache with high availability, session store, leaderboards, rate limiting |
| ElastiCache for Memcached | Simple key-value, multithreaded, nodes added for scale, no replication or persistence | Simple object cache where losing a node is acceptable |
| ElastiCache Serverless | Valkey, Redis OSS or Memcached without choosing nodes; scales memory, compute and network automatically | Unpredictable cache load, least operational overhead |
| DynamoDB Accelerator (DAX) | Write-through in-memory cache for DynamoDB, item cache and query cache, microsecond reads | Read-heavy DynamoDB tables, hot items, minimal code change (DAX client) |
| Amazon MemoryDB | Durable in-memory database, Multi-AZ transaction log | When the in-memory store must also be the primary, durable database |

Caches at other layers also relieve the database: **CloudFront** for content and API responses at the edge, **API Gateway caching** for REST API responses.

- DAX serves **eventually consistent** reads only from cache. Strongly consistent reads (`ConsistentRead` true) are passed through to DynamoDB and not cached.
- A node-based ElastiCache cluster is sized by node type and count; ElastiCache Serverless removes that choice.

> **Exam trap.** Memcached has no replication or Multi-AZ failover. "The cache must remain available if a node or an AZ fails" or "persist cached data" points to Valkey or Redis OSS, not Memcached.

<!-- section: caching-integration | objectives: 3.3.13 -->
## Integrating caching to meet business requirements

| Strategy | How it works | Strength | Weakness |
| --- | --- | --- | --- |
| Lazy loading (cache-aside) | Read the cache; on a miss, read the database and write the result to the cache | Only requested data is cached; a failed node isn't fatal | Miss penalty (three trips); data can become stale |
| Write-through | Every database write also updates the cache | Cached data is never stale | Write penalty; cache fills with data never read; a new node misses data until it is written again |
| TTL on keys | Each key expires after a set number of seconds | Limits staleness and churn | Doesn't guarantee freshness between expirations |

Combine them: write-through for data that must be fresh, lazy loading to fill gaps, and a TTL on every key.

| Requirement | Integration |
| --- | --- |
| Product pages read thousands of times per update, small staleness acceptable | Lazy loading with a TTL in ElastiCache |
| Account balance shown right after a change | Write-through, or read from the database |
| Shared user sessions for a stateless Auto Scaling web tier | ElastiCache for Valkey or Redis OSS (or DynamoDB) as the session store |
| Real-time leaderboard | ElastiCache for Valkey or Redis OSS sorted sets |
| Read-heavy DynamoDB table with the least code change | DAX in front of the table |
| Reduce repeated expensive SQL queries | Cache query results keyed by the query and its parameters |

> **Exam tip.** Moving sessions out of the instances into ElastiCache or DynamoDB makes the web tier stateless, so the Auto Scaling group can add and remove instances without sticky sessions and without logging users out.

<!-- section: connections-proxies | objectives: 3.3.5 -->
## Database connections and proxies

Every database connection uses memory on the DB instance, and engines cap the number of connections. Serverless and highly elastic clients (Lambda functions, containers scaling out quickly) open many short connections and can exhaust the database even when queries are light.

**Amazon RDS Proxy**:

- Maintains a **connection pool** and shares connections among clients, so thousands of application connections map to fewer database connections.
- Reduces failover time (by up to 66 % according to AWS) and keeps application connections open while it connects to the new primary or standby.
- Authenticates clients with **IAM**, and connects to the database with credentials in **AWS Secrets Manager** or IAM database authentication: no password in the code.
- Supports Aurora MySQL, Aurora PostgreSQL, RDS for MySQL, RDS for PostgreSQL, RDS for MariaDB and RDS for SQL Server. It must be in the **same VPC** as the database and can't be publicly accessible.
- For RDS instances in a replication configuration it attaches to the writer; extra proxy endpoints, including read-only endpoints for Aurora, spread reads.

| Symptom | Fix |
| --- | --- |
| "Too many connections" errors when Lambda scales out | RDS Proxy between Lambda and the database (optionally cap the function's reserved concurrency) |
| Failovers drop application connections for too long | RDS Proxy, or Aurora with replicas |
| Database credentials hard-coded in functions | RDS Proxy with IAM authentication and Secrets Manager |
| Connections exhausted by an EC2 fleet | Connection pooling in the application or RDS Proxy; a larger instance class raises the connection limit |

Inside Lambda, open the connection **outside the handler** so warm invocations reuse it.

> **Exam trap.** A bigger DB instance raises the connection limit but costs more and doesn't stop the next surge. "Many short-lived connections from Lambda" is answered by RDS Proxy.

<!-- section: key-points -->
## Key points

- Multi-AZ (instance) for availability only; Multi-AZ DB cluster and Aurora replicas give availability plus reads; Aurora Global Database and cross-Region replicas for global reads and DR; DynamoDB global tables for multi-Region writes.
- RDS read replicas: up to 15, asynchronous, automated backups required on the source, same or other Region, manual creation and promotion.
- Aurora: up to 15 replicas, reader and custom endpoints, Aurora Auto Scaling, failover tiers 0–15.
- ElastiCache for Valkey or Redis OSS for HA and data structures, Memcached for simple caching, Serverless for no sizing, DAX for DynamoDB, MemoryDB for a durable in-memory primary.
- Lazy loading, write-through and TTL combine; sessions in a cache make the web tier stateless.
- RDS Proxy pools connections, shortens failovers and uses IAM and Secrets Manager.
