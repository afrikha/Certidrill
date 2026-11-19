## saac03-3a-lambda-reserved-concurrency (type: single)

An AWS Lambda function processes incoming orders and calls a partner's HTTP API for each order. The partner's API accepts at most 50 concurrent requests and returns errors above that level. During traffic spikes, Lambda scales the function to hundreds of concurrent executions and overwhelms the partner's API. The company wants to fix this with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Increase the memory of the function so that each invocation finishes faster.

- [B] Configure provisioned concurrency of 50 for the function.

- [C] Configure reserved concurrency of 50 for the function.

- [D] Add code that counts active calls in an Amazon DynamoDB table and waits when the count reaches 50.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-local-zones-latency (type: single)

A visual effects studio in the Los Angeles area wants to run virtual workstations for its video editors on Amazon EC2. The editors need very low latency between their offices and the workstations. The company has no data center, and it wants to manage the workstations in its existing VPC in the us-west-2 Region with the same AWS APIs and tools.

Which solution will meet these requirements?


- [A] Deploy the workstations in an AWS Wavelength Zone of a 5G carrier network.

- [B] Enable the Los Angeles Local Zone and launch the workstations in a VPC subnet there.

- [C] Launch the workstations in a cluster placement group in a us-west-2 Availability Zone.

- [D] Order an AWS Outposts rack and run the workstations on that rack.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-memory-metric-scaling (type: multi)

A Java application runs on Linux Amazon EC2 instances in an Auto Scaling group. The application becomes unresponsive when memory utilization exceeds 80%, while CPU utilization stays low. The company wants the group to add instances automatically when average memory utilization across the group rises above 70%.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a target tracking scaling policy on ASGAverageNetworkIn.

- [B] Create a target tracking scaling policy that uses the custom memory metric with a target value of 70.

- [C] Create a step scaling policy on the EC2 CPUUtilization metric.

- [D] Install the CloudWatch agent through the launch template to publish mem_used_percent for the group.

- [E] Turn on detailed monitoring for the instances in the launch template.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-memory-optimized-r (type: single)

A company is moving a self-managed in-memory analytics database to Amazon EC2. The database keeps its whole 400 GiB working set in RAM and needs only a moderate number of vCPUs. The company wants the instance family that offers the most memory per vCPU for this workload at the lowest cost.

Which instance family should the company choose?


- [A] Compute optimized (C family)

- [B] Burstable general purpose (T family)

- [C] Memory optimized (R family)

- [D] Storage optimized (I family)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-rds-storage-autoscaling (type: single)

A company runs an Amazon RDS for PostgreSQL DB instance whose storage use grows unpredictably. Last quarter the instance ran out of storage and the application failed. The company wants storage to increase automatically before it runs out, without downtime and with the LEAST operational overhead. Storage must never grow beyond 2,000 GiB, and the company does not want to pay for storage before it is needed.

Which solution will meet these requirements?


- [A] Enable RDS storage autoscaling on the DB instance with a maximum storage threshold of 2,000 GiB.

- [B] Create a read replica with more storage each time space runs low and promote it to replace the primary.

- [C] Modify the DB instance now to allocate 2,000 GiB of storage.

- [D] Create a CloudWatch alarm on FreeStorageSpace that invokes a Lambda function to increase the allocated storage.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-s3-data-lake-growth (type: single)

A retail company collects clickstream data that currently totals 40 TB. The volume is expected to grow unpredictably to several petabytes over the next three years. Analysts will query the data with Amazon Athena and process it with Amazon EMR. The company does not want to plan or provision storage capacity.

Which storage service will meet these requirements?


- [A] An Amazon EFS file system

- [B] An Amazon FSx for Lustre file system

- [C] Amazon S3

- [D] Amazon EBS Throughput Optimized HDD (st1) volumes attached to an EC2 instance

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-s3-file-gateway-nfs (type: single)

A research laboratory runs Linux analysis servers on premises. The servers write instrument output files to an NFS share on a NAS that is almost full and will not be expanded. The company wants to store the files durably in Amazon S3 as individual objects so that analytics jobs in AWS can read them directly. The on-premises servers must keep low-latency access to recently written files and must continue to use NFS without application changes.

Which solution will meet these requirements?


- [A] Deploy Volume Gateway with cached volumes on premises and attach the iSCSI volumes to the analysis servers.

- [B] Create an Amazon EFS file system and mount it on the analysis servers over AWS Direct Connect.

- [C] Deploy Amazon S3 File Gateway on premises and mount its NFS file share on the analysis servers.

- [D] Use AWS DataSync to copy the NFS share on the NAS to an S3 bucket every night.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-s3-sqs-worker-decoupling (type: multi)

A photo-sharing application runs on Amazon EC2 instances that receive uploads and resize each image before responding to the user. During traffic spikes, the resizing work makes uploads time out. The company is changing the application to upload images directly to an Amazon S3 bucket and wants the image processing tier to scale independently of the upload tier. No processing job can be lost if the processing tier is unavailable for a while.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Configure S3 event notifications for object creation that send messages to an Amazon SQS standard queue.

- [B] Configure S3 event notifications for object creation that send messages directly to an Amazon SQS FIFO queue.

- [C] Run the processing workers in an Auto Scaling group that polls the queue and scales on the queue backlog.

- [D] Have the upload tier call the processing tier synchronously through an internal Application Load Balancer.

- [E] Move the upload tier to a larger instance type so that it resizes images faster.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-s3-strong-consistency (type: single)

An order processing application writes a JSON document to an Amazon S3 bucket and, a few milliseconds later, another component reads the same object or lists the bucket to find it. Sometimes the application overwrites an existing object and immediately reads it again. The developers are worried that the readers might receive stale data and want the simplest solution.

What should a solutions architect recommend?


- [A] Keep the current design, because S3 reads are already consistent after a successful write.

- [B] Track each write in an Amazon DynamoDB table and have readers wait until the item appears before reading.

- [C] Enable S3 Versioning on the bucket so that readers always retrieve the latest version of each object.

- [D] Add a delay of several seconds in the readers before each GET or LIST request.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-s3-upload-acceleration (type: multi)

A video sharing company stores uploads in a single Amazon S3 general purpose bucket in the us-east-1 Region. Users on several continents upload files of 2 GB to 5 GB over the internet. Uploads from distant users are slow, and when a connection drops, the whole upload restarts from the beginning.

Which combination of actions will improve upload speed and resilience? (Choose two.)


Choose 2.

- [A] Configure S3 Cross-Region Replication from the bucket to buckets in other Regions.

- [B] Upload the objects directly into the S3 Standard-IA storage class.

- [C] Change the clients to use multipart upload and send the parts in parallel.

- [D] Spread the object keys across many prefixes to raise the bucket's request rate.

- [E] Enable S3 Transfer Acceleration on the bucket and have clients upload to the accelerate endpoint.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-shared-file-multi-az (type: multi)

A company is designing storage for two applications. Each application runs on Amazon EC2 instances in multiple Availability Zones, and all instances of an application must access the same files at the same time. The storage must stay available, with no data loss, if one Availability Zone fails. One application runs on Linux and uses NFS; the other runs on Windows and uses SMB.

Which storage options should the company use? (Choose two.)


Choose 2.

- [A] A Single-AZ Amazon FSx for Windows File Server file system for the Windows application

- [B] An Amazon EFS Regional file system for the Linux application

- [C] An Amazon EBS io2 volume with Multi-Attach enabled for the Linux application

- [D] A Multi-AZ Amazon FSx for Windows File Server file system for the Windows application

- [E] An Amazon EFS One Zone file system for the Linux application

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-sns-sqs-fanout (type: single)

An e-commerce application emits an event each time an order is placed. Three independent services (billing, shipping and analytics) must each process every order event at their own pace. If one service is unavailable for several hours, its events must be kept until it recovers, without affecting the other services.

Which solution will meet these requirements?


- [A] Send the events to one Amazon SQS FIFO queue with a different message group ID for each service.

- [B] Publish the events to an Amazon SNS topic and subscribe a separate Amazon SQS queue for each service.

- [C] Publish the events to an Amazon SNS topic with an HTTPS subscription for each service.

- [D] Send the events to one Amazon SQS standard queue that all three services poll.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-sqs-backlog-per-instance (type: single)

Worker instances in an Auto Scaling group process messages from an Amazon SQS queue. Each message takes an average of 2 seconds to process, and the company accepts a maximum latency of 60 seconds for a message. The current target tracking policy uses the number of visible messages in the queue as its metric, and the group adds far more instances than needed while the queue drains.

How should the company configure scaling?


- [A] Keep the target tracking policy on the number of visible messages and set its target value to 30.

- [B] Use a target tracking policy on the backlog per instance (visible messages divided by InService instances) with a target value of 30.

- [C] Replace the policy with a target tracking policy on ASGAverageCPUUtilization with a target value of 70.

- [D] Use a target tracking policy on the backlog per instance (visible messages divided by InService instances) with a target value of 120.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-sqs-fifo-ordering (type: single)

A banking application sends account transactions as messages to a consumer service. For each account, the transactions must be processed in exactly the order in which they were sent, and no duplicate messages can be introduced into the queue. Transactions for different accounts can be processed in parallel.

Which solution will meet these requirements?


- [A] An Amazon SNS standard topic with one subscription per account

- [B] An Amazon SQS standard queue with long polling enabled

- [C] An Amazon SQS FIFO queue that uses the account ID as the message group ID

- [D] An Amazon SQS standard queue configured as a delay queue

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-sqs-long-polling-dlq (type: multi)

A company uses an Amazon SQS standard queue between two application tiers. The consumers poll the queue continuously, and most ReceiveMessage calls return no messages, which increases request costs. In addition, a few malformed messages fail processing every time and keep returning to the queue. The company wants to reduce the empty responses and isolate the failing messages for analysis.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Increase the message retention period of the queue to 14 days.

- [B] Set a delivery delay of 15 minutes on the queue.

- [C] Set the visibility timeout of the queue to 0 seconds.

- [D] Configure a dead-letter queue and a redrive policy with a maxReceiveCount of 5.

- [E] Set the ReceiveMessageWaitTimeSeconds attribute of the queue to 20.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-sqs-visibility-timeout (type: single)

A company's worker instances read messages from an Amazon SQS standard queue that uses the default settings. Processing a message takes up to 3 minutes, after which the worker deletes it. The company notices that many messages are processed two or three times by different workers, although the workers report no errors.

Which change will resolve the issue?


- [A] Increase the message retention period of the queue to 14 days.

- [B] Enable long polling by setting the receive message wait time of the queue to 20 seconds.

- [C] Configure a dead-letter queue with a maximum receive count of 1.

- [D] Increase the visibility timeout of the queue to longer than the maximum processing time.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-st1-sequential-logs (type: single)

A company runs a log processing application on an Amazon EC2 instance. Every day the application reads and writes about 10 TiB of large log files sequentially and needs about 400 MiB/s of throughput from a single Amazon EBS volume. Random I/O performance is not important.

Which EBS volume type will meet these requirements MOST cost-effectively?


- [A] Cold HDD (sc1)

- [B] General Purpose SSD (gp3)

- [C] Provisioned IOPS SSD (io2)

- [D] Throughput Optimized HDD (st1)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-storage-optimized-nosql (type: single)

A company runs a self-managed NoSQL database cluster on Amazon EC2. The database needs tens of thousands of low-latency random IOPS per node and the lowest possible storage latency. The database replicates every write to three nodes in different Availability Zones, so the loss of a single node's local data is acceptable.

Which instance choice will meet these requirements?


- [A] Burstable T-family instances that store the data on Amazon EBS st1 volumes

- [B] Storage optimized I-family instances that store the data on their NVMe SSD instance store volumes

- [C] Storage optimized D-family instances that store the data on their HDD instance store volumes

- [D] General purpose M-family instances that store the data on Amazon EBS gp3 volumes

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-tape-gateway-deep-archive (type: multi)

A financial services company backs up its on-premises servers to a physical tape library. The backup software uses an industry-standard iSCSI tape library interface. The company wants to stop handling physical tapes, keep its existing backup software and workflows, and keep tapes that must be retained for 10 years and are almost never read at the lowest possible storage cost.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Use AWS DataSync to copy the contents of the tape library to Amazon S3 every night.

- [B] Archive the ejected virtual tapes to S3 Glacier Flexible Retrieval.

- [C] Deploy Tape Gateway on premises and configure the backup software to use its virtual tape library.

- [D] Deploy Amazon S3 File Gateway and change the backup jobs to write to an SMB file share.

- [E] Archive the ejected virtual tapes to S3 Glacier Deep Archive.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-target-tracking-cpu (type: single)

A company runs a CPU-bound web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. Load testing shows that response times stay acceptable while average CPU utilization is around 50%. Traffic changes unpredictably during the day. The company wants the group to add and remove instances automatically to stay near that level, with the LEAST configuration effort.

Which solution will meet these requirements?


- [A] Create two CloudWatch alarms on CPU utilization and a step scaling policy for each alarm.

- [B] Create scheduled actions that change the desired capacity every hour.

- [C] Create a target tracking scaling policy on ASGAverageCPUUtilization with a target value of 50.

- [D] Create a CloudWatch alarm on CPU utilization that notifies the operations team through Amazon SNS.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-volume-gateway-cached (type: single)

A company's on-premises application stores 200 TB of data on iSCSI volumes. The storage array is reaching end of life, and the company will keep only about 20 TB of local disk capacity. About 10% of the data is accessed in any given week, and that data must be served with low latency. The application requires block storage and cannot be modified.

Which solution will meet these requirements?


- [A] Deploy Volume Gateway with cached volumes and use the local disks as the gateway cache.

- [B] Create an Amazon FSx for NetApp ONTAP file system and connect the application to iSCSI LUNs over AWS Direct Connect.

- [C] Deploy Amazon S3 File Gateway and use the local disks as the cache for an NFS file share.

- [D] Deploy Volume Gateway with stored volumes on the 20 TB of local disks.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-volume-gateway-stored (type: single)

A company runs a latency-sensitive application on premises that uses iSCSI block storage. The application reads randomly across its entire 12 TB dataset, and the company has enough local disk capacity for the full dataset. The company wants durable off-site backups in AWS that can be restored to Amazon EC2 if the data center fails. The application cannot be modified.

Which solution will meet these requirements?


- [A] Deploy Volume Gateway with cached volumes and schedule snapshots of the volumes to AWS.

- [B] Deploy Amazon S3 File Gateway and move the dataset to an SMB file share backed by Amazon S3.

- [C] Deploy Tape Gateway and have the application write its data to the virtual tape library.

- [D] Deploy Volume Gateway with stored volumes and schedule snapshots of the volumes to AWS.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-alb-path-routing (type: single)

A company is splitting a monolithic web application into microservices that run on Amazon ECS. Requests to /api/* must go to the API service, and requests to /images/* must go to the image service. Clients must keep using a single HTTPS endpoint.

Which solution will meet these requirements?


- [A] A Network Load Balancer with a TLS listener for each service on a different port

- [B] An Application Load Balancer with an HTTPS listener and rules that match path patterns

- [C] Amazon Route 53 weighted records that send a share of the traffic to each service

- [D] A Gateway Load Balancer with a target group for each service

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-apigw-stage-cache (type: single)

A company exposes product details through an Amazon API Gateway REST API backed by AWS Lambda. Most requests are identical GET requests, and the responses can be up to 5 minutes old. The company wants to reduce the number of Lambda invocations and the response latency with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Configure provisioned concurrency on the Lambda function.

- [B] Add an Amazon ElastiCache cluster that the Lambda function queries before the database.

- [C] Increase the memory setting of the Lambda function.

- [D] Enable API caching on the API Gateway stage with a TTL of 300 seconds.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-aurora-custom-endpoints (type: single)

A company runs an Amazon Aurora PostgreSQL DB cluster with a writer, three db.r6g.large Aurora Replicas that serve application reads, and two db.r6g.4xlarge Aurora Replicas added for analytical reports. Reports must run only on the two large replicas, and application reads must never reach the large replicas. Both workloads must keep working if one replica of their group fails.

Which solution will meet these requirements?


- [A] Send reports to the reader endpoint and send application reads to the cluster endpoint of the DB cluster.

- [B] Create a custom endpoint for the two large replicas (reports) and another for the three small replicas (application).

- [C] Create an Amazon RDS Proxy for the cluster and send both workloads to the read-only endpoint of the proxy.

- [D] Send reports to the instance endpoint of one large replica and send application reads to the reader endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-aurora-global-reads (type: single)

A company runs an Amazon Aurora MySQL DB cluster in us-east-1 and is opening operations in Europe. European users need low-latency reads from a database in eu-west-1, with replication lag that is typically under 1 second. If us-east-1 has an outage, the company wants to make eu-west-1 the primary with minimal data loss. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Run an AWS DMS task with ongoing replication from the us-east-1 cluster to a separate Aurora cluster in eu-west-1.

- [B] Convert the cluster to an Aurora global database and add a secondary cluster in eu-west-1.

- [C] Copy automated snapshots to eu-west-1 every hour and restore the latest snapshot into a cluster there for reads.

- [D] Add an Aurora Replica to the existing cluster and place it in an Availability Zone of eu-west-1.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-aurora-promotion-tiers (type: single)

An Amazon Aurora MySQL DB cluster has a db.r6g.2xlarge writer and three Aurora Replicas, all in promotion tier 1: R1 (db.r6g.2xlarge), R2 (db.r6g.large) and R3 (db.r6g.4xlarge, used by a reporting tool). If the writer fails, R1 must be promoted first. R3 must be promoted only if no other replica is available.

Which solution will meet these requirements?


- [A] Set R1 to tier 15 and R3 to tier 0, because Aurora promotes the replica with the highest tier number first.

- [B] Set R1 to tier 0 and R3 to tier 15, and leave R2 in tier 1.

- [C] Enable Aurora Auto Scaling so that new replicas with the writer's class become the preferred failover targets.

- [D] Keep all replicas in tier 1, because Aurora always promotes the replica whose class matches the writer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-aurora-read-autoscaling (type: multi)

A news company runs an Amazon Aurora MySQL DB cluster with one writer and two Aurora Replicas. Write traffic is stable, but read traffic spikes unpredictably when stories go viral, and the replicas reach 90% CPU. The company wants read capacity to follow demand automatically, and the application must start using new replicas without configuration changes.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create an Aurora Auto Scaling policy that tracks the average CPU utilization of the replicas.

- [B] Scale the writer DB instance up to a larger instance class.

- [C] Configure the application to send its read queries to the instance endpoint of each replica.

- [D] Configure the application to send its read queries to the cluster's reader endpoint.

- [E] Change the cluster storage configuration to Aurora I/O-Optimized.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-aurora-replica-other-az (type: single)

A company runs an Amazon Aurora MySQL DB cluster that has a single writer DB instance in one Availability Zone and no Aurora Replicas. A new requirement states that if the Availability Zone of the writer fails, the database must accept writes again in less than 1 minute. The solution must keep all resources in the current AWS Region.

Which solution will meet these requirements?


- [A] Rely on the Aurora cluster volume, which already stores six copies of the data across several Availability Zones.

- [B] Create an Aurora global database with a secondary cluster and fail over to the secondary cluster when the zone fails.

- [C] Add an Aurora Replica in the same Availability Zone as the writer so that Aurora can promote it if the writer fails.

- [D] Add an Aurora Replica in a different Availability Zone so that Aurora can promote it if the writer fails.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-aurora-serverless-zero (type: single)

A company has an internal PostgreSQL application that employees use for a few hours each week at irregular times. The rest of the time the database receives no connections. The company wants a managed relational database that scales capacity automatically, does not charge for compute capacity while it is idle, and can tolerate a short delay of about 15 seconds on the first connection after an idle period.

Which solution will meet these requirements MOST cost-effectively?


- [A] An Aurora PostgreSQL cluster with a provisioned db.r6g.large writer instance

- [B] An Amazon RDS for PostgreSQL DB instance on a burstable db.t4g.micro instance class

- [C] An Aurora PostgreSQL cluster that uses Aurora Serverless instances with a minimum capacity of 0 ACUs

- [D] An Amazon DynamoDB table in on-demand capacity mode

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-az-id-cross-account (type: single)

A company has two AWS accounts in the same AWS Region. Account A runs a latency-sensitive database in a subnet that the console of account A shows in Availability Zone us-east-1a. Account B must deploy application servers in the same physical Availability Zone as the database to minimize latency and avoid cross-AZ data transfer. An engineer plans to use us-east-1a in account B as well.

Which solution will meet these requirements?


- [A] Use the AWS Health Dashboard of account B to display the physical data center behind each Availability Zone name.

- [B] Launch the servers of account B in a spread placement group so that AWS places them next to the database of account A.

- [C] Use us-east-1a in account B, because Availability Zone names map to the same physical location in every account of an organization.

- [D] Look up the AZ ID of the database subnet in account A and deploy in the subnet of account B that has the same AZ ID.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cache-engine-leaderboard (type: single)

A gaming company needs an in-memory store for a real-time leaderboard that ranks millions of players by score. The data structure must keep players sorted by score natively. The cache must replicate data and fail over automatically if the primary node or its Availability Zone fails.

Which solution will meet these requirements?


- [A] Amazon API Gateway caching on the stage that serves the leaderboard API

- [B] DynamoDB Accelerator (DAX) in front of a DynamoDB table that stores the scores

- [C] Amazon ElastiCache for Memcached with several nodes spread across two Availability Zones

- [D] Amazon ElastiCache for Valkey with sorted sets, a replica in another Availability Zone and Multi-AZ enabled

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cache-lazy-ttl (type: single)

A company caches user profiles in Amazon ElastiCache for Valkey by using lazy loading. Keys are written without an expiration. Over time, the cache has filled with profiles that are rarely read, and some cached profiles are days out of date. The company wants to limit how stale cached data can become and stop unused keys from accumulating, without changing the database.

Which solution will meet these requirements?


- [A] Replace lazy loading with a write-through strategy that writes every profile update to the cache without an expiration.

- [B] Migrate the cache to ElastiCache for Memcached so that the cache uses multithreaded nodes.

- [C] Add more shards to the ElastiCache cluster so that the cache can hold every profile.

- [D] Set a time to live (TTL) on every key that the application writes to the cache.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cache-write-through (type: single)

An ecommerce company caches product prices from an Amazon RDS database in Amazon ElastiCache by using lazy loading with a 1-hour TTL. Prices are read thousands of times per second. After a price change, customers sometimes see the old price for up to an hour. The company requires that the cache reflects every price change as soon as the database is updated, while keeping read latency low.

Which solution will meet these requirements?


- [A] Keep lazy loading and increase the TTL so that more reads are served from the cache.

- [B] Keep lazy loading and add more nodes to the ElastiCache cluster so that the cache can hold more keys.

- [C] Keep lazy loading and remove the cache, sending all reads to an RDS read replica.

- [D] Add a write-through strategy that updates the cached price every time the application writes it to the database.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cloudfront-functions (type: single)

A media company serves a popular website through Amazon CloudFront at millions of requests per second. The company must normalize the case of query string values to improve the cache hit ratio and rewrite some URL paths for an A/B test. The logic is a few lines of code, does not call any network service, and must add as little latency and cost as possible.

Which solution will meet these requirements?


- [A] A Lambda@Edge function associated with the origin request event of the cache behavior

- [B] A Lambda function behind Amazon API Gateway placed between CloudFront and the origin

- [C] A CloudFront Functions function associated with the viewer request event of the cache behavior

- [D] An AWS WAF web ACL with rules that match the query strings, associated with the distribution

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cloudfront-two-origins (type: single)

A travel company hosts its website in a single AWS Region. Images, CSS and JavaScript files are in an Amazon S3 bucket, and dynamic pages are served by an Application Load Balancer. Users around the world report slow page loads. The company wants to reduce latency for all users and offload requests from the origins with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator accelerator with the S3 bucket and the ALB as endpoints in one endpoint group.

- [B] Create a CloudFront distribution with the S3 bucket and the ALB as origins, and a cache behavior for each path pattern.

- [C] Deploy copies of the website in four Regions and use Route 53 latency-based routing between them.

- [D] Enable S3 Transfer Acceleration on the bucket and point the website to the accelerated endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-compute-optimizer-rightsizing (type: single)

A retail company runs about 400 Amazon EC2 instances and 150 x86_64 AWS Lambda functions across several AWS accounts. Many instances were sized by guesswork, and the company suspects that some are overprovisioned while others are constrained. The company needs recommendations for instance types and Lambda memory sizes based on the actual utilization of each resource, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Install the CloudWatch agent on every instance and build dashboards that engineers review each month to choose new sizes.

- [B] Use AWS Systems Manager Inventory to collect the configuration of each instance and function and compare it with vendor sizing guides.

- [C] Opt in to AWS Compute Optimizer and use its recommendations, which analyze the CloudWatch utilization metrics of each resource.

- [D] Deploy AWS Config conformance packs that flag instances and functions whose configuration differs from a sizing standard.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-cross-region-replica-kms (type: multi)

A company runs an Amazon RDS for MySQL DB instance in us-east-1. The DB instance is encrypted with an AWS KMS key in us-east-1, and automated backups are turned off. The company needs an encrypted read replica in eu-west-1 to serve reports for European users.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Decrypt the source DB instance before creating the replica.

- [B] Specify the us-east-1 KMS key ARN for the replica.

- [C] Specify a KMS key in eu-west-1 for the replica.

- [D] Turn on Multi-AZ for the source DB instance.

- [E] Turn on automated backups for the source DB instance.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-dax-microsecond (type: single)

A sports betting company stores odds in an Amazon DynamoDB table. The same items are read thousands of times per second, and the application can use eventually consistent reads. A new feature requires read latency in microseconds instead of milliseconds. The developers want to make only minimal changes to the existing DynamoDB code.

Which solution will meet these requirements?


- [A] Create a DynamoDB Accelerator (DAX) cluster and switch the application to the DAX client.

- [B] Increase the read capacity of the table so that reads are served faster.

- [C] Convert the table to a global table with a replica in a second AWS Region.

- [D] Add an Amazon ElastiCache for Valkey cluster and implement lazy loading in the application.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-dbtype-aurora-joins (type: single)

A company is building an order management system. Analysts and the application run ad hoc SQL queries that join customers, orders, invoices and payments. Several operations must update multiple tables in a single ACID transaction, and the development team already uses MySQL tools.

Which database will meet these requirements?


- [A] Amazon DocumentDB (with MongoDB compatibility)

- [B] Amazon Aurora MySQL-Compatible Edition

- [C] Amazon DynamoDB with transactions

- [D] Amazon Keyspaces (for Apache Cassandra)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-dbtype-dynamodb-state (type: single)

A mobile game stores each player's state, such as inventory and progress, and always reads and writes it by player ID. At peak, the game serves millions of requests per second and needs consistent single-digit millisecond latency. The data model has no joins, and the company does not want to manage database servers.

Which database will meet these requirements?


- [A] Amazon Neptune

- [B] Amazon DynamoDB

- [C] Amazon Aurora MySQL

- [D] Amazon Redshift

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-dbtype-redshift (type: single)

A retail company stores 300 TB of historical sales data and wants analysts to run complex analytical SQL queries on it from business intelligence (BI) tools. The production order database runs on Amazon Aurora MySQL and must not be slowed by these queries. The company wants to avoid managing capacity for the analytics workload.

Which solution will meet these requirements?


- [A] Load the sales data into Amazon Redshift Serverless and connect the BI tools to it.

- [B] Copy the sales data into an Amazon DynamoDB table with global secondary indexes for each report.

- [C] Load the sales data into Amazon DocumentDB and run the reports with aggregation pipelines.

- [D] Add Aurora Replicas to the production cluster and point the BI tools to the reader endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-ddb-global-multi-active (type: single)

A global retailer is designing a shopping cart service for customers in North America, Europe and Asia. The service stores carts as key-value items. Customers in each geography must read and write their carts with low latency in their nearest AWS Region, and if one Region fails, the other Regions must keep accepting writes without a failover step.

Which solution will meet these requirements?


- [A] An Aurora global database with a secondary cluster in each other Region and write forwarding enabled

- [B] An Amazon DynamoDB global table with a replica in each of the three Regions

- [C] An Amazon RDS for MySQL DB instance in one Region with a cross-Region read replica in each other Region

- [D] An Amazon DynamoDB table in one Region, with AWS Global Accelerator routing all users to that Region

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-ddb-large-items-s3 (type: single)

A real estate company stores property listings in an Amazon DynamoDB table. The application now embeds each listing's high-resolution photos, about 2 MB in total, directly in the item, and these writes fail with a ValidationException. The listing metadata must remain queryable in DynamoDB.

Which solution will meet these requirements?


- [A] Store the photos as objects in Amazon S3 and save each object key in the listing item.

- [B] Switch the table to on-demand capacity mode so that large writes are not limited.

- [C] Put a DynamoDB Accelerator (DAX) cluster in front of the table to buffer the large writes.

- [D] Increase the provisioned write capacity of the table to cover 2 MB writes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-ddb-on-demand-launch (type: single)

A startup is launching a mobile app that stores user data in Amazon DynamoDB. The company cannot predict the traffic, which might be very low for weeks and then spike suddenly after marketing campaigns. The team does not want to plan or manage table capacity and wants to pay only for the requests that the app makes.

Which solution will meet these requirements?


- [A] Use provisioned capacity mode with auto scaling between a minimum and a maximum number of capacity units.

- [B] Use provisioned capacity mode with low capacity and add a DynamoDB Accelerator (DAX) cluster to absorb the spikes.

- [C] Use provisioned capacity mode and purchase reserved capacity sized for the expected peak traffic.

- [D] Use on-demand capacity mode so that the table scales with traffic and is billed per read and write request.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-ddb-rcu-strong (type: single)

A company is designing an Amazon DynamoDB table in provisioned capacity mode. Each item is 6 KB. The application must perform 120 strongly consistent reads of single items per second at peak.

How many read capacity units (RCUs) must the company provision to meet this requirement?


- [A] 120

- [B] 180

- [C] 240

- [D] 360

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-ddb-write-sharding (type: single)

A ticketing company stores sales events in an Amazon DynamoDB table whose partition key is the event date. During large on-sale events, almost all writes target the same date, and write requests are throttled even though the consumed write capacity of the table is far below its provisioned capacity. The company must sustain higher write throughput for a single date.

Which solution will meet these requirements?


- [A] Add a calculated suffix to the partition key values so that the writes for one date spread across partitions.

- [B] Increase the provisioned write capacity units of the table to absorb the write peaks.

- [C] Create a global secondary index whose partition key is the event date to take part of the writes.

- [D] Place a DynamoDB Accelerator (DAX) cluster in front of the table to absorb the write peaks.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-direct-connect-dedicated (type: single)

A company transfers several terabytes of data every day between its data center and a VPC over a Site-to-Site VPN connection. Transfers are slow, and latency varies with internet conditions. The company needs a private connection with 10 Gbps of dedicated bandwidth and consistent network performance.

Which solution will meet these requirements?


- [A] Add a second Site-to-Site VPN connection and use both tunnels of each connection.

- [B] Order a 10 Gbps AWS Direct Connect dedicated connection and create a private virtual interface.

- [C] Turn on acceleration for the existing Site-to-Site VPN connection.

- [D] Deploy an AWS Client VPN endpoint and connect the data center servers to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-dx-gateway-multi-region (type: single)

A company has an AWS Direct Connect connection at a location in the United States and uses a private virtual interface to reach a VPC in us-east-1 through its virtual private gateway. The company is deploying a new VPC with a virtual private gateway in eu-west-1. The data center must reach both VPCs privately over the existing Direct Connect connection, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Order a second Direct Connect connection at a location in Europe for the eu-west-1 VPC.

- [B] Peer the us-east-1 VPC with the eu-west-1 VPC and route data center traffic for eu-west-1 through the peering connection.

- [C] Create a second private virtual interface that connects directly to the virtual private gateway in eu-west-1.

- [D] Create a Direct Connect gateway, associate both virtual private gateways with it, and attach a private virtual interface to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-dx-ipsec-encryption (type: multi)

A bank needs connectivity between its data center and a VPC that provides the consistent low latency of a dedicated connection. A compliance rule also requires that all traffic between the data center and the VPC is encrypted end to end with IPsec.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create a Site-to-Site VPN connection that uses only the internet as its transport.

- [B] Create an AWS Client VPN endpoint for the data center servers.

- [C] Create interface VPC endpoints for every service that the data center uses.

- [D] Order an AWS Direct Connect connection and create a public virtual interface.

- [E] Create a Site-to-Site VPN connection to the virtual private gateway over the Direct Connect connection.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-elasticache-multi-az (type: multi)

An application caches session data in Amazon ElastiCache for Valkey (cluster mode disabled) that runs on a single node. If the node or its Availability Zone fails, the cache must keep serving the application within seconds, and the application must keep writing to the same primary endpoint.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Enable Multi-AZ with automatic failover on the replication group.

- [B] Schedule daily backups and restore the latest one to a new cluster after a failure.

- [C] Migrate the cache to Memcached and spread its nodes across Availability Zones.

- [D] Place a Network Load Balancer in front of the cache nodes.

- [E] Add a read replica in a different Availability Zone from the primary node.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-engine-aurora-mysql-size (type: single)

A company runs an open-source content platform that is certified only for MySQL 8.0. The database is expected to grow to about 100 TiB over the next three years. The company wants a managed database whose storage grows automatically, without moving to a different engine family.

Which solution will meet these requirements?


- [A] Amazon Aurora PostgreSQL-Compatible Edition

- [B] Amazon RDS for PostgreSQL on io2 Block Express storage

- [C] Amazon RDS for MySQL with storage autoscaling turned on

- [D] Amazon Aurora MySQL-Compatible Edition

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-engine-postgis (type: single)

A logistics company is building a route-planning application on AWS. The application must run geospatial queries such as distance calculations and polygon containment by using PostGIS functions. The company wants a managed relational database.

Which solution will meet these requirements?


- [A] Amazon DynamoDB with a global secondary index on coordinates

- [B] Amazon RDS for MySQL with a larger instance class

- [C] Amazon RDS for MariaDB

- [D] Amazon RDS for PostgreSQL with the PostGIS extension

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-engine-rds-sqlserver (type: single)

A company is migrating an in-house application that relies on Microsoft SQL Server-specific T-SQL stored procedures. The vendor of a reporting add-on supports only SQL Server. The application needs no access to the database host. The company wants a managed database with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Amazon Aurora PostgreSQL with Babelfish turned on

- [B] Amazon RDS for SQL Server

- [C] Amazon RDS Custom for SQL Server

- [D] SQL Server installed on Amazon EC2 instances

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-global-accelerator-udp (type: single)

A gaming company runs multiplayer game servers on Amazon EC2 behind Network Load Balancers in two AWS Regions. The game uses UDP. Players' corporate networks must allowlist a fixed set of IP addresses, and traffic must fail over quickly to the other Region if an endpoint becomes unhealthy. The company wants traffic to enter the AWS global network as close to players as possible.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator standard accelerator with an endpoint group in each Region.

- [B] Create an Amazon CloudFront distribution with the two Network Load Balancers as origins.

- [C] Replace the Network Load Balancers with Application Load Balancers that have Elastic IP addresses.

- [D] Create Amazon Route 53 latency-based records that point to the two Network Load Balancers.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-gwlb-appliances (type: single)

A company's security team requires all traffic entering an application VPC to be inspected by a fleet of third-party firewall appliances that run on Amazon EC2. The appliance fleet must scale horizontally, each flow must stay on the same appliance, and the inspection must be transparent to the application servers.

Which solution will meet these requirements?


- [A] Route traffic through a NAT gateway and use security group rules on the appliances to filter it.

- [B] Associate an AWS WAF web ACL with an Application Load Balancer in front of the application servers.

- [C] Register the appliances with a Gateway Load Balancer and route traffic through Gateway Load Balancer endpoints.

- [D] Place a Network Load Balancer in front of the appliances and point the application clients to its DNS name.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-keyspaces-cassandra (type: single)

A company runs a self-managed Apache Cassandra cluster on Amazon EC2 instances for a messaging application. The operations team spends a lot of time patching nodes and adding capacity. The company wants a serverless database that scales automatically and lets the application keep its existing Cassandra Query Language (CQL) code and drivers.

Which solution will meet these requirements?


- [A] Migrate the data to Amazon DocumentDB (with MongoDB compatibility).

- [B] Migrate the data to Amazon Keyspaces (for Apache Cassandra).

- [C] Migrate the data to Amazon DynamoDB and use DynamoDB on-demand capacity mode.

- [D] Move the Cassandra nodes into an EC2 Auto Scaling group that scales on CPU utilization.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-lambda-cpu-memory (type: single)

A media company runs an AWS Lambda function that resizes product images uploaded to Amazon S3. The function is configured with 512 MB of memory. Amazon CloudWatch shows that each invocation uses at most 300 MB of memory, but the processing is CPU-bound and each invocation takes several seconds. The company wants to reduce the duration of each invocation with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Increase the timeout of the function so that each invocation has more time to finish its processing.

- [B] Configure provisioned concurrency so that execution environments are initialized before the invocations arrive.

- [C] Increase the memory setting of the function so that Lambda allocates proportionally more CPU power to it.

- [D] Increase the ephemeral storage of the function so that the /tmp directory has more space for the images.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-lambda-tmp-and-cpu (type: multi)

A company uses an AWS Lambda function to process video files of up to 6 GB. The function downloads each file from Amazon S3 to the /tmp directory and then runs a CPU-intensive analysis. The function is configured with 1,024 MB of memory and 512 MB of ephemeral storage. Invocations fail with "No space left on device" errors, and the analysis step is too slow. The solution must not add any other AWS resources.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Turn on Lambda SnapStart for the function.

- [B] Increase the function's timeout to 15 minutes.

- [C] Configure reserved concurrency for the function.

- [D] Increase the function's ephemeral storage to 10,240 MB.

- [E] Increase the function's memory setting.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-multi-tier-vpc (type: multi)

A company is designing a three-tier web application in a VPC that spans two Availability Zones. Users reach the application from the internet. The application servers and the database must not have public IP addresses, each tier must accept traffic only from the tier in front of it, and every tier must survive the loss of one Availability Zone.

Which combination of steps will meet these requirements? (Choose three.)

Each correct answer presents part of the solution.


Choose 3.

- [A] Deploy an internet-facing Application Load Balancer in public subnets in both Availability Zones.

- [B] Deploy an Amazon RDS Multi-AZ database in private subnets, allowing traffic only from the application servers' security group.

- [C] Assign public IP addresses to the application servers and register them with the ALB.

- [D] Deploy all three tiers in a single Availability Zone to minimize latency between them.

- [E] Place the database in a public subnet and restrict access with a network ACL.

- [F] Run the application servers in an Auto Scaling group in private subnets of both zones, allowing traffic only from the ALB's security group.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-multiaz-plus-replica (type: multi)

A company runs an Amazon RDS for MySQL Single-AZ DB instance. The company has two new requirements: the database must fail over automatically to another Availability Zone if its zone fails, and a read-heavy dashboard must stop adding load to the primary instance. The dashboard can show data that is a few seconds old.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Create a read replica and point the dashboard queries to its endpoint.

- [B] Increase the backup retention period of the DB instance to 35 days.

- [C] Create a read replica and rely on RDS to promote it automatically if the primary fails.

- [D] Convert the DB instance to a Multi-AZ DB instance deployment.

- [E] Send the dashboard queries to the Multi-AZ standby endpoint.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-mysql-homogeneous-dms (type: single)

A company wants to move a 2 TB on-premises MySQL 8.0 database to Amazon RDS for MySQL. The application must keep writing to the on-premises database until the cutover, and the cutover window must be as short as possible.

Which solution will meet these requirements?


- [A] Take a mysqldump backup during a weekend maintenance window and restore it into the RDS DB instance.

- [B] Copy the MySQL data directory to an Amazon S3 File Gateway and attach the share to the RDS DB instance.

- [C] Run an AWS DMS task with full load and ongoing replication, and switch the application when the target is in sync.

- [D] Run DMS Schema Conversion on the MySQL schema, then run an AWS DMS full-load-only task during the cutover.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-nat-private-subnets (type: multi)

A company runs web servers on Amazon EC2 instances in private subnets of a VPC that has an internet gateway and public subnets. The servers must download operating system patches from the internet, but nobody on the internet may start connections to them. The servers have no public IP addresses.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Add a 0.0.0.0/0 route to the NAT gateway in the private subnets' route table.

- [B] Create a private NAT gateway in a private subnet.

- [C] Create a public NAT gateway in a public subnet.

- [D] Associate an Elastic IP address with each web server.

- [E] Add a 0.0.0.0/0 route to the internet gateway in the private subnets' route table.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-neptune-fraud-graph (type: single)

A payments company wants to detect fraud rings by following relationships between accounts, devices, cards and transactions. Typical queries traverse several hops of connections, for example accounts that share a device with an account that shares a card with a known fraudster. The queries must return in milliseconds over billions of relationships, and the database must be fully managed.

Which database service will meet these requirements?


- [A] Amazon Redshift

- [B] Amazon Neptune

- [C] Amazon Keyspaces (for Apache Cassandra)

- [D] Amazon DynamoDB

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-nlb-static-ip (type: single)

A trading platform receives order messages from partners over a custom TCP protocol. The partners' firewalls allow outbound traffic only to a fixed IP address in each Availability Zone. The load balancer must handle millions of requests per second with very low latency and must not terminate or inspect the application protocol.

Which solution will meet these requirements?


- [A] An internet-facing Application Load Balancer with an HTTPS listener and host-based rules

- [B] An internet-facing Network Load Balancer with a TCP listener and an Elastic IP address in each subnet

- [C] An Amazon CloudFront distribution with the order servers as a custom origin

- [D] A Gateway Load Balancer with the order servers registered as appliance targets

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-oracle-to-aurora-pg (type: multi)

A company plans to migrate an on-premises Oracle database to Amazon Aurora PostgreSQL-Compatible Edition. The database contains tables, views and PL/SQL stored procedures. The Oracle database must stay in production during the migration, and the cutover must cause minimal downtime.

Which combination of steps will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Use AWS DataSync to copy the Oracle data files to the Aurora cluster volume.

- [B] Create an Aurora Replica of the on-premises Oracle database and promote it at cutover.

- [C] Run an AWS DMS task with full load and ongoing replication (CDC).

- [D] Export the data with Oracle Data Pump and import the dump file into Aurora PostgreSQL.

- [E] Use DMS Schema Conversion to convert the schema and code objects to PostgreSQL.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-privatelink-saas (type: single)

A SaaS provider runs an API on Amazon EC2 instances in its own VPC. Hundreds of customers must reach the API privately from their own VPCs in other AWS accounts in the same Region, and many customer VPCs use CIDR blocks that overlap the provider's VPC. Only customers may initiate connections, and the API must not be exposed to the internet.

Which solution will meet these requirements?


- [A] Publish the API through an internet-facing Network Load Balancer whose security group allows only customer IP ranges.

- [B] Attach the provider VPC and every customer VPC to a shared transit gateway.

- [C] Put a Network Load Balancer in front of the API, create a VPC endpoint service, and let customers create interface endpoints.

- [D] Create a VPC peering connection between the provider VPC and each customer VPC.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-rds-custom-sqlserver (type: single)

A company is migrating a packaged application that uses Microsoft SQL Server. The vendor requires a monitoring agent to be installed on the database host and requires privileged access to the operating system for custom patches. The company wants AWS to automate backups and other database administration tasks as much as possible.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] SQL Server installed on Amazon EC2 instances with backup scripts scheduled by the operations team

- [B] Amazon RDS Custom for SQL Server, with the agent installed on the host by a privileged OS user

- [C] Amazon RDS for SQL Server with a custom option group that installs the agent

- [D] Amazon Aurora PostgreSQL with Babelfish so that the application keeps sending T-SQL queries

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-rds-io2-iops (type: single)

A financial services company runs an OLTP workload on Amazon RDS for PostgreSQL with 2 TiB of storage. Load testing shows that the database needs a sustained 100,000 IOPS with consistent sub-millisecond I/O latency. The DB instance class is already large enough.

Which storage configuration will meet these requirements?


- [A] Provisioned IOPS SSD (io2 Block Express) storage with 100,000 provisioned IOPS

- [B] General Purpose SSD (gp3) storage at its 12,000 IOPS baseline, with a memory-optimized instance class

- [C] General Purpose SSD (gp3) storage with 100,000 provisioned IOPS

- [D] General Purpose SSD (gp2) storage enlarged until its baseline reaches 100,000 IOPS

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-rds-proxy-failover (type: single)

A company runs an application on Amazon EC2 instances that connects to an Amazon RDS for PostgreSQL Multi-AZ DB instance. During failovers, the application loses its connections, and some clients keep trying the old IP address until their DNS cache expires. The company wants the application to keep its connections during failovers without changing its connection-handling code.

Which solution will meet these requirements?


- [A] Lower the DNS cache TTL in the application and add retry logic after each failover.

- [B] Put a Network Load Balancer in front of the DB instance with its IP address as the target.

- [C] Connect the application through an Amazon RDS Proxy endpoint instead of the DB instance endpoint.

- [D] Create an RDS read replica and promote it manually when the primary fails.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-rds-proxy-lambda (type: single)

A company runs an API on AWS Lambda functions that query an Amazon RDS for MySQL DB instance. During traffic bursts, thousands of concurrent function invocations open new database connections, and the database returns "too many connections" errors. The company wants to fix the errors with the fewest changes to the application code.

Which solution will meet these requirements?


- [A] Set the reserved concurrency of each function to 10 so that fewer connections are opened.

- [B] Convert the DB instance to a Multi-AZ DB instance deployment to add a standby.

- [C] Create an Amazon RDS Proxy for the DB instance and point the functions to the proxy endpoint.

- [D] Create an RDS read replica and point the functions to the replica endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-read-replica-backups (type: single)

A company wants to create a read replica of an Amazon RDS for PostgreSQL DB instance to offload reporting queries. The read replica cannot be created. The source DB instance is a Single-AZ deployment on gp3 storage, and its backup retention period is set to 0 days.

What should the company do to create the read replica?


- [A] Take a manual DB snapshot of the source and share it with the account.

- [B] Convert the source DB instance to a Multi-AZ DB instance deployment.

- [C] Turn on automated backups by setting a backup retention period greater than 0 days.

- [D] Change the storage of the source DB instance to Provisioned IOPS SSD.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-read-replica-reporting (type: single)

A company runs its order application on an Amazon RDS for PostgreSQL DB instance. Analysts run long reporting queries during business hours, and order processing slows down while the reports run. The reports can use data that is a few minutes behind production.

Which solution will meet these requirements?


- [A] Enable Multi-AZ on the DB instance and run the reports on the standby.

- [B] Restore the latest automated snapshot to a new DB instance each night and run the reports on it.

- [C] Create a read replica of the DB instance and run the reports on it.

- [D] Run the reports against the DB instance through an Amazon RDS Proxy endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-region-residency (type: single)

A healthcare company is moving its patient portal to AWS. A regulation requires that patient data is stored only in Germany. Most users are in Germany, and the database must stay available if a single data center fails.

Which solution will meet these requirements?


- [A] Deploy the application and an RDS database in the Europe (Frankfurt) Region, with a cross-Region read replica in the Europe (Paris) Region for failover.

- [B] Deploy the application and an RDS Multi-AZ database in the Europe (Ireland) Region, and serve users through Amazon CloudFront edge locations in Germany.

- [C] Deploy the application and a Single-AZ RDS database in the Europe (Frankfurt) Region, and copy daily snapshots to the Europe (Ireland) Region.

- [D] Deploy the application and an Amazon RDS Multi-AZ database in the Europe (Frankfurt) Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-replica-vs-multiaz (type: multi)

A solutions architect is reviewing a design that uses Amazon RDS for MySQL with a Multi-AZ DB instance deployment and one read replica. The team must understand how each copy of the data is replicated before it decides where to send read traffic and how to plan for a Regional outage.

Which statements are correct? (Choose two.)


Choose 2.

- [A] RDS adds read replicas automatically when the primary's CPU usage is high.

- [B] The read replica is updated asynchronously, so it can lag behind the primary.

- [C] The Multi-AZ standby can serve read-only queries to offload the primary.

- [D] The read replica can be created in a different AWS Region from the primary.

- [E] The Multi-AZ standby is updated asynchronously to avoid adding write latency.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3b-subnet-size-reserved (type: single)

A company is planning the subnets of a new VPC. Each application subnet must provide at least 27 IPv4 addresses that can be assigned to network interfaces. To conserve address space, each subnet must use the smallest CIDR block that meets this requirement.

Which subnet size should the company use?


- [A] /28

- [B] /27

- [C] /26

- [D] /25

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-transit-gateway-hub (type: single)

A company has 40 VPCs in one AWS Region and a Site-to-Site VPN connection to its data center. The VPCs are connected by a growing mesh of VPC peering connections that is hard to manage, and the data center cannot reach most VPCs. The company wants a central hub that routes traffic between all VPCs and the data center.

Which solution will meet these requirements?


- [A] Create a VPC endpoint service in each VPC and interface endpoints in the other VPCs.

- [B] Configure AWS VPN CloudHub on the virtual private gateway of one VPC.

- [C] Add the missing VPC peering connections so that every VPC is peered with every other VPC.

- [D] Create a transit gateway, attach all VPCs, and attach the VPN connection to the transit gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-vpc-secondary-cidr (type: single)

A company's VPC uses the 10.0.0.0/20 CIDR block, and all its subnets are almost out of IPv4 addresses. The company must add subnets for a new container workload. The new workload must run in the same VPC so that it can reference the existing security groups, and the existing instances must keep their IP addresses.

Which solution will meet these requirements?


- [A] Create a new VPC with a larger CIDR block and connect it to the existing VPC with VPC peering.

- [B] Modify the VPC's primary CIDR block from 10.0.0.0/20 to 10.0.0.0/16.

- [C] Create a NAT gateway so that the new containers share the addresses of the existing subnets.

- [D] Associate a secondary IPv4 CIDR block, such as 10.1.0.0/16, with the VPC and create the new subnets in it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3b-write-heavy-dynamodb (type: single)

A company collects clickstream events from its website. The workload writes about 50,000 small events per second and reads them back only by session ID, with no joins or complex queries. The current Amazon RDS for MySQL DB instance has reached its write limit. The company wants a database that scales writes horizontally without servers to manage.

Which solution will meet these requirements?


- [A] Convert the RDS DB instance to a Multi-AZ DB instance deployment.

- [B] Place an Amazon ElastiCache cluster in front of the RDS DB instance to absorb the events.

- [C] Store the events in an Amazon DynamoDB table keyed by session ID.

- [D] Add RDS read replicas and distribute the event writes across the replicas.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-appflow-saas-scheduled (type: single)

A marketing team needs opportunity records from its Salesforce organization copied to an Amazon S3 data lake every hour. The team has no developers and wants a fully managed solution that requires no code.

Which solution will meet these requirements?


- [A] Create an AWS Lambda function that calls the Salesforce API and schedule it with an Amazon EventBridge rule every hour.

- [B] Create an AWS DataSync task with Salesforce as the source location and schedule it to run every hour.

- [C] Create an Amazon AppFlow flow with Salesforce as the source, S3 as the destination, and an hourly schedule trigger.

- [D] Create an AWS DMS replication task with Salesforce as the source endpoint and S3 as the target endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-athena-adhoc-s3 (type: single)

A company exports application logs as CSV files to an Amazon S3 bucket every day. A few times each month, analysts need to run ad hoc SQL queries on the files. The company does not want to manage any infrastructure and wants to pay only for the queries that the analysts run.

Which solution will meet these requirements?


- [A] Run a long-running Amazon EMR cluster with Apache Hive and create Hive tables on the S3 data.

- [B] Define tables for the files in the AWS Glue Data Catalog and query them in place with Amazon Athena.

- [C] Load the files into a provisioned Amazon Redshift cluster and run the queries from the query editor.

- [D] Import the files into an Amazon RDS for PostgreSQL DB instance every day and query the database.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-athena-ctas-one-time (type: single)

A company has 5 TB of historical sales data in CSV files in Amazon S3. The data is cataloged as a table in the AWS Glue Data Catalog and covers the years 2016 to 2025. The company needs a one-time conversion of the data to Apache Parquet, partitioned by year, for Amazon Athena. The team knows SQL and does not want to provision or manage any infrastructure or write ETL code.

Which solution will meet these requirements?


- [A] Run an Amazon Athena CREATE TABLE AS SELECT (CTAS) query with the Parquet format and the year as the partition column.

- [B] Launch an Amazon EMR cluster with Apache Spark, convert the files, and terminate the cluster.

- [C] Replay the CSV files through an Amazon Data Firehose stream with record format conversion to Parquet.

- [D] Create an S3 Batch Operations job that copies each CSV object to a new object in Parquet format.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-cluster-placement-hpc (type: single)

A research company runs a tightly coupled computational fluid dynamics simulation on 16 Amazon EC2 instances. During each run, the instances exchange large volumes of data with each other, and the simulation time depends mostly on network latency between the nodes.

The company needs the lowest possible latency and the highest throughput between the instances.

Which solution will meet these requirements?


- [A] Launch the instances in a cluster placement group in a single Availability Zone.

- [B] Launch the instances in a partition placement group with one partition in each Availability Zone.

- [C] Launch the instances in an Auto Scaling group across three Availability Zones behind a Network Load Balancer.

- [D] Launch the instances in a spread placement group across three Availability Zones.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-data-lake-secure-foundation (type: multi)

A company is building a new data lake in Amazon S3. Data will be cataloged in the AWS Glue Data Catalog and queried with Amazon Athena, Amazon EMR and Amazon Redshift Spectrum. The security team requires central management of table-level and column-level permissions that all these engines enforce. All data must be encrypted at rest with keys whose policies the company controls and whose use it can audit.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Register the S3 locations with Lake Formation and grant table and column permissions on Data Catalog resources in Lake Formation.

- [B] Write S3 bucket policies that grant each analyst access to the objects that contain the columns they may read.

- [C] Enable S3 Versioning and MFA delete on every bucket of the data lake.

- [D] Keep the default server-side encryption with Amazon S3 managed keys (SSE-S3) on the buckets.

- [E] Configure default bucket encryption with SSE-KMS and a customer managed AWS KMS key.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-datasync-bandwidth-schedule (type: multi)

A company uses an AWS DataSync task to copy new files from an on-premises NFS server to Amazon S3. The task currently runs on demand during business hours and saturates the company's internet link, which slows down users. The company wants the task to run automatically every night and never use more than 50 MiB/s of bandwidth.

Which combination of configuration changes will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Configure a daily task schedule that starts the task at night.

- [B] Set a bandwidth limit of 50 MiB/s on the task.

- [C] Add a second DataSync agent to the task to spread the transfer across agents.

- [D] Configure the task to verify all data in the destination after each transfer.

- [E] Switch the agent to the FIPS service endpoint.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-datasync-nfs-migration (type: single)

A company must migrate 80 TB of data from an on-premises NFS file server to Amazon EFS over its existing AWS Direct Connect connection. Users keep changing files until the cutover, so the company must run incremental transfers until then and must verify the integrity of the transferred data.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Deploy Amazon S3 File Gateway, copy the files to its share, and then copy the objects from S3 to EFS.

- [B] Deploy an AWS DataSync agent on premises and create a scheduled task from the NFS location to the EFS location.

- [C] Create an AWS Transfer Family SFTP server backed by EFS and have users upload their files with SFTP clients.

- [D] Mount the NFS share on EC2 instances and run rsync scripts from cron jobs, then compare checksums with a script.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-datasync-private-dx (type: multi)

A company copies about 30 TB of new files every week from an on-premises NFS file server to Amazon S3 with AWS DataSync. The data center is connected to a VPC through an AWS Direct Connect private virtual interface. A new security policy requires that the transfer traffic between the DataSync agent and AWS never traverse the public internet.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Deploy and activate a DataSync agent that uses the VPC service endpoint, and run the task with that agent.

- [B] Keep the agent on the public service endpoint and switch it to the FIPS service endpoint.

- [C] Keep the agent on the public service endpoint and enable S3 Transfer Acceleration on the destination bucket.

- [D] Create an interface VPC endpoint for DataSync in the VPC that the Direct Connect connection reaches.

- [E] Replace DataSync with Amazon S3 File Gateway and copy the files to its NFS share.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-dms-cdc-minimal-downtime (type: single)

A company must migrate a 3 TB on-premises MySQL database to Amazon Aurora MySQL. The database must stay in use by the application during the migration, and the application can tolerate only a few minutes of downtime at cutover. Binary logging in row format is enabled on the source.

Which solution will meet these requirements?


- [A] Create an AWS DMS task of type full load plus change data capture (CDC) and cut over when the replication lag is close to zero.

- [B] Create an AWS DMS task of type full load only and run it every night until the cutover date.

- [C] Copy the MySQL data files to Amazon S3 with AWS DataSync and restore an Aurora cluster from the files.

- [D] Export the database with mysqldump, upload the dump to Amazon S3, and import it into Aurora during a maintenance window.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-emr-existing-hadoop (type: single)

A company runs an on-premises Hadoop cluster with Apache Spark and Apache Hive jobs that process several terabytes of data every night. The company wants to move the jobs to AWS with minimal changes to the code, keep the same open-source frameworks, and store the data in Amazon S3.

Which solution will meet these requirements?


- [A] Package each job as a container and run it with AWS Batch on Amazon EC2 Spot Instances.

- [B] Rewrite the jobs as SQL stored procedures in an Amazon Redshift provisioned cluster.

- [C] Run the jobs on Amazon EMR clusters that read and write the data in Amazon S3.

- [D] Rewrite the jobs as AWS Lambda functions that are triggered when files arrive in S3.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-emr-serverless-sporadic (type: single)

A data engineering team runs Apache Spark jobs a few times each week. The data volume and the duration of each job are unpredictable. The team wants to run its existing open-source Spark applications without choosing instance types, sizing clusters, or paying for idle capacity between jobs.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an Amazon EMR Serverless application for Spark and submit each job run to it.

- [B] Launch a transient Amazon EMR cluster on EC2 for each job with instance types chosen per job.

- [C] Rewrite the Spark applications as SQL and run them in an Amazon Redshift provisioned cluster.

- [D] Keep a long-running Amazon EMR cluster on EC2 sized for the largest job and submit the jobs as steps.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-emr-spot-task-nodes (type: multi)

A company runs a long-running Amazon EMR cluster for business-critical daily jobs. The jobs store intermediate data in HDFS. During peak hours the company adds processing capacity and wants to reduce the cost of that extra capacity. The solution must not risk HDFS data loss or termination of the cluster.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Add the peak capacity as a task instance group that uses Spot Instances.

- [B] Add the peak capacity as core nodes on Spot Instances.

- [C] Move every node of the cluster to Spot Instances in an instance fleet.

- [D] Run the primary node and the core nodes on On-Demand Instances.

- [E] Run the primary node on a Spot Instance.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-firehose-clickstream (type: single)

A company wants to capture clickstream events from its website continuously and deliver them to Amazon S3 within a few minutes for analysis. No application needs to read the events before they reach S3. The company does not want to write consumer code or manage capacity.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Send the events to an Amazon Kinesis data stream in provisioned mode and run a consumer application on EC2 that writes to S3.

- [B] Send the events to an Amazon SQS queue and use an AWS Lambda function to write each message to S3 as an object.

- [C] Write the events to local files on the web servers and copy them with an AWS DataSync task every hour.

- [D] Send the events to an Amazon Data Firehose stream that has the S3 bucket as its destination.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-firehose-dynamic-partitioning (type: single)

A multi-tenant SaaS company is creating a new Amazon Data Firehose stream to deliver usage events to Amazon S3. Each event contains a customer_id field. Analysts query one customer at a time with Amazon Athena and want each query to scan only that customer's data. The company has 3,000 customers and does not want to run a separate application to reorganize the data.

How should the company configure ingestion?


- [A] Create one Firehose stream per customer, each with its own S3 prefix.

- [B] Increase the buffer size of the Firehose stream so that each object contains more events.

- [C] Enable dynamic partitioning on the Firehose stream with customer_id as the partitioning key in the S3 prefix.

- [D] Run a nightly AWS Glue job that moves the delivered objects into one prefix per customer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-firehose-json-to-parquet (type: single)

A company delivers JSON events to Amazon S3 with an Amazon Data Firehose stream. The analytics team requires the data to be stored in Apache Parquet format so that Amazon Athena queries are faster and cheaper. The schema of the events is already defined in a table in the AWS Glue Data Catalog. The company wants no code and no servers to manage.

Which solution will meet these requirements?


- [A] Enable record format conversion on the Firehose stream to Apache Parquet with the schema from the Glue table.

- [B] Run an Amazon EMR cluster every night that converts the delivered JSON objects to Parquet.

- [C] Add an AWS Lambda transformation function to the stream that writes the records in Parquet format.

- [D] Configure the Firehose stream to compress the delivered objects with GZIP.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-flink-windowed-fraud (type: single)

A payment company streams card transactions into an Amazon Kinesis data stream. The company must detect suspicious patterns by computing stateful aggregations over 5-minute sliding windows per card, and must write alerts to another stream within seconds. The company does not want to provision or manage servers or clusters.

Which solution will meet these requirements?


- [A] Deliver the transactions to Amazon S3 with Amazon Data Firehose and run Amazon Athena queries every 5 minutes.

- [B] Process the stream with an Amazon Managed Service for Apache Flink application that writes alerts to the output stream.

- [C] Load the transactions into Amazon Redshift every 5 minutes and run a stored procedure that writes the alerts.

- [D] Run a Spark Streaming application on a long-running Amazon EMR cluster on EC2 that reads the stream.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-ga-alb-static-multiregion (type: single)

A company runs an HTTPS application behind Application Load Balancers (ALBs) in us-east-1 and eu-west-1. The ALBs use path-based routing rules. Corporate customers allow outbound traffic only to a short list of IP addresses in their firewalls. The company needs IP addresses that never change, must send each user to the nearest healthy Region, and must fail over automatically if a Region becomes unhealthy.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator standard accelerator with one endpoint group per Region that contains that Region's ALB.

- [B] Create Amazon Route 53 latency-based alias records with health checks for both ALBs and give customers the current ALB IP addresses.

- [C] Create an AWS Global Accelerator custom routing accelerator and add both ALBs as its endpoints.

- [D] Create a Network Load Balancer with Elastic IP addresses in us-east-1, register the us-east-1 ALB as its target, and give customers those addresses.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-glue-crawler-catalog (type: single)

A company lands JSON files in an Amazon S3 bucket every day under new prefixes such as year=2026/month=11/day=19/. Analysts query the data with Amazon Athena. New fields are occasionally added to the files. The company needs the table definitions and partitions in the AWS Glue Data Catalog to stay up to date with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an AWS Lake Formation data filter on the table that includes all columns and all rows.

- [B] Write an AWS Lambda function that parses each new file and runs ALTER TABLE statements in Athena.

- [C] Create an AWS Glue crawler on the S3 path and run it on a daily schedule after the files arrive.

- [D] Ask an analyst to run the MSCK REPAIR TABLE statement in Athena every morning.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-glue-databrew-analysts (type: single)

Business analysts at an insurance company receive CSV files in Amazon S3 every week. They must remove duplicate rows, correct invalid values and standardize date formats before they publish the cleaned files to S3 for reporting. The analysts have no programming skills and want a visual interface in which they can save the cleaning steps and reapply them to each new file.

Which solution will meet these requirements?


- [A] Load each file into Amazon Redshift and have the analysts clean the data with SQL stored procedures.

- [B] Have the analysts write PySpark scripts and run them as AWS Glue ETL jobs every week.

- [C] Use AWS Glue DataBrew projects to build a recipe of transformations and run it as a job on each new file.

- [D] Launch an Amazon EMR cluster with notebooks in which the analysts clean the data with Spark code.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-glue-job-bookmarks (type: single)

An AWS Glue ETL job runs every hour and transforms CSV files from an Amazon S3 prefix into Apache Parquet files in another prefix. Each run reads every file in the source prefix, so the target contains duplicate records and the job duration and cost grow every day. The source files must be kept.

Which solution will make each run process only the files that arrived since the previous run with the LEAST effort?


- [A] Enable job bookmarks on the job so that AWS Glue tracks the data that earlier runs already processed.

- [B] Write the list of processed file names to an Amazon DynamoDB table and filter it in the job script.

- [C] Increase the number of workers of the job so that each run finishes before the next one starts.

- [D] Add an S3 Lifecycle rule that deletes the source files one hour after they are created.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-gwlb-firewall-fleet (type: single)

A company must inspect all inbound and outbound traffic of its application VPCs with a third-party firewall appliance from AWS Marketplace that runs on Amazon EC2. The fleet of appliances must scale horizontally, and the inspection must be transparent to the applications, without any change to their configuration.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Place the appliances behind an Application Load Balancer and register them in a target group that uses the HTTP protocol.

- [B] Place the appliances behind a Gateway Load Balancer in a security VPC and route application traffic through Gateway Load Balancer endpoints.

- [C] Place the appliances behind a Network Load Balancer and configure each application to use the load balancer as its proxy.

- [D] Run one large appliance instance and point the default route of every application subnet to its network interface.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-ipam-multi-account (type: single)

A company uses AWS Organizations with 200 accounts in four AWS Regions and expects to reach 500 accounts. Application teams choose the CIDR blocks of their VPCs themselves. Several VPCs could not be connected to the corporate transit gateway because their CIDR blocks overlap with existing networks.

The network team must automatically assign non-overlapping CIDR blocks to new VPCs according to central rules and monitor IP address usage across the organization, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Deploy an AWS Config rule in every account that detects VPCs with overlapping CIDR blocks and notifies the network team.

- [B] Use Amazon VPC IP Address Manager (IPAM) integrated with AWS Organizations, with Regional pools that allocate CIDR blocks to new VPCs.

- [C] Store allocated CIDR blocks in an Amazon DynamoDB table and have teams call an AWS Lambda function that returns a free block.

- [D] Create one transit gateway route table per team so that teams can keep choosing overlapping CIDR blocks.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kds-enhanced-fanout (type: single)

A company has an Amazon Kinesis data stream with 10 shards. Producers write well below the write limits of the shards. Five consumer applications read the stream with the standard GetRecords API. The consumers receive ReadProvisionedThroughputExceeded errors, and records take about one second to reach them. Each consumer must receive records with a latency of about 70 ms, without any change to the producers.

Which solution will meet these requirements?


- [A] Register each consumer application as an enhanced fan-out consumer and read the shards with SubscribeToShard.

- [B] Increase the data retention period of the stream from 24 hours to 7 days.

- [C] Replace the consumers with one Amazon Data Firehose stream that delivers the records to all five applications.

- [D] Double the number of shards of the stream and keep the consumers on the GetRecords API.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kds-lambda-firehose-iot (type: multi)

A company collects telemetry readings from 50,000 industrial sensors every second. The readings of each sensor must be processed in order, and the latest aggregated value per sensor must be written to an Amazon DynamoDB table within seconds. All raw readings must also be archived to Amazon S3 in large batched objects for later analysis. The company wants a serverless design with the LEAST operational overhead.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Send the readings to an Amazon SQS standard queue and process them with an AWS Lambda function that writes to DynamoDB.

- [B] Send the readings to an Amazon Kinesis data stream with the sensor ID as the partition key and process them with an AWS Lambda function that writes to DynamoDB.

- [C] Have the Lambda function also write each reading to Amazon S3 as a separate object.

- [D] Run an AWS Glue crawler on the data stream every minute to copy the readings to Amazon S3.

- [E] Create an Amazon Data Firehose stream that uses the data stream as its source and delivers batched records to Amazon S3.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-kds-on-demand-mode (type: single)

A company is launching a new mobile application that sends events to an Amazon Kinesis data stream. Traffic is unpredictable: it is close to zero at night and can spike sharply after marketing campaigns. The team does not want to plan capacity or manage shards, and it does not want to pay for peak capacity that it uses only occasionally.

How should the company configure the data stream?


- [A] Use provisioned capacity mode and a scheduled AWS Lambda function that calls UpdateShardCount.

- [B] Use provisioned capacity mode with enough shards for the highest expected peak.

- [C] Use on-demand capacity mode (On-demand Standard) so that the stream scales automatically.

- [D] Use provisioned capacity mode and increase the data retention period to absorb the spikes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kds-replay-consumers (type: single)

An e-commerce company captures clickstream events from its website. Three independent applications must each process every event in real time, and the events of each user session must be processed in order. After a bug fix, an application must be able to reprocess the events of the last 3 days.

Which solution will meet these requirements?


- [A] Send the events to an Amazon SNS standard topic with an Amazon SQS standard queue subscribed for each application.

- [B] Send the events to an Amazon Data Firehose stream that delivers them to Amazon S3, where they are kept for 30 days.

- [C] Send the events to an Amazon Kinesis data stream with the session ID as the partition key and a retention period of at least 3 days.

- [D] Send the events to an Amazon SQS standard queue with a 4-day message retention period that the three applications poll.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kds-shard-count (type: single)

A company is creating an Amazon Kinesis data stream in provisioned capacity mode. Producers will write 4,000 records per second with an average record size of 3 KiB. Two consumer applications will each read all the data with the standard GetRecords API (shared throughput). The company wants the MOST cost-effective number of shards that avoids throttling.

How many shards should the stream have?


- [A] 4

- [B] 6

- [C] 12

- [D] 24

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kinesis-interface-endpoint (type: single)

A company runs data producers on Amazon EC2 instances in private subnets that have no route to the internet. The producers must send records to an Amazon Kinesis data stream in the same AWS Region. The security policy requires that this traffic never traverse the internet and that only the company's stream can be reached through the path that is used.

Which solution will meet these requirements?


- [A] Create a NAT gateway in a public subnet and add a default route to it from the private subnets.

- [B] Create an AWS Site-to-Site VPN connection from the VPC and send the records through the VPN tunnel.

- [C] Create an interface VPC endpoint for Kinesis Data Streams with an endpoint policy that allows access only to the company's stream.

- [D] Create a gateway VPC endpoint for Kinesis Data Streams with an endpoint policy that allows only the company's stream, and add it to the route tables.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-kinesis-video-cameras (type: single)

A public transport company wants to stream live video from 2,000 cameras installed in its buses to AWS. The video must be stored for 7 days, played back on demand, and analyzed frame by frame by machine learning applications.

Which AWS service should the company use to ingest the video?


- [A] Amazon Managed Streaming for Apache Kafka (Amazon MSK)

- [B] Amazon Data Firehose

- [C] Amazon Kinesis Video Streams

- [D] Amazon Kinesis Data Streams

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-lf-row-filter-country (type: single)

A company stores a sales table in an Amazon S3 data lake that is governed by AWS Lake Formation. Analysts query the table with Amazon Athena. The data is not partitioned by country. Analysts in each country must see only the rows of their own country, and the company does not want to maintain copies of the data.

Which solution will meet these requirements?


- [A] Create a Lake Formation data filter per country with a row filter expression and grant SELECT with that filter to the team.

- [B] Attach IAM policies that limit each team's s3:GetObject permission to the objects of its country.

- [C] Run a nightly AWS Glue job that writes one copy of the table per country and grant each team access to its copy.

- [D] Create one Athena workgroup per country and assign each team of analysts to its workgroup.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-lf-tag-based-access (type: single)

A company's data lake in Amazon S3 is governed by AWS Lake Formation and contains 4,000 tables in the AWS Glue Data Catalog. Teams add new tables every week. Access is granted by department and by data classification (public, internal, confidential). Administrators currently grant permissions table by table, and every new table needs new grants for many principals.

Which solution will make permission management scale with the LEAST operational overhead?


- [A] Write IAM policies that list the ARN of each table for each department and update them when tables are added.

- [B] Create a Lake Formation data filter for each table and grant each filter to the principals that need it.

- [C] Store each department's tables under a separate S3 prefix and control access with S3 bucket policies.

- [D] Create LF-Tags for department and classification, assign them to databases and tables, and grant permissions on LF-Tag expressions.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-managed-grafana-ops (type: single)

A company's site reliability engineering team wants operational dashboards that correlate Amazon CloudWatch metrics, AWS X-Ray traces and metrics stored in Amazon Managed Service for Prometheus. The team already uses Grafana dashboards on premises and wants AWS to handle provisioning, scaling and maintenance of the Grafana servers. Users must sign in through AWS IAM Identity Center.

Which solution will meet these requirements?


- [A] Install Grafana on Amazon EC2 instances in an Auto Scaling group and configure the data sources.

- [B] Export the metrics and traces to Amazon S3 every hour and build AWS Quick Sight analyses on Athena tables.

- [C] Create an Amazon Managed Grafana workspace with IAM Identity Center authentication and add the three data sources.

- [D] Build the dashboards in Amazon OpenSearch Dashboards after exporting the metrics and traces to OpenSearch Service.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-msk-kafka-migration (type: single)

A company runs a self-managed Apache Kafka cluster on premises. Dozens of producer and consumer applications use the Kafka APIs and open-source Kafka tools. The company wants to move the streaming platform to AWS without changing the application code and wants AWS to manage cluster operations such as broker replacement.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an Amazon Managed Streaming for Apache Kafka (Amazon MSK) cluster and point the applications to its brokers.

- [B] Replace Kafka with Amazon Kinesis Data Streams and update the applications to use the Kinesis Client Library.

- [C] Install Apache Kafka on Amazon EC2 instances in an Auto Scaling group spread across three Availability Zones.

- [D] Replace Kafka with Amazon MQ brokers and connect the applications to the brokers.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-nlb-udp-static-ip (type: single)

A company runs a telemetry service on Amazon EC2 instances in an Auto Scaling group across three Availability Zones. Millions of field devices send data to the service over UDP. The device firmware can be configured only with fixed IP addresses, and the service must handle millions of requests per second with very low latency.

Which solution will meet these requirements?


- [A] Deploy a Gateway Load Balancer and register the instances in its target group.

- [B] Deploy an Application Load Balancer with an HTTPS listener and give the devices its DNS name.

- [C] Deploy a Network Load Balancer with a UDP listener and associate one Elastic IP address with each of its subnets.

- [D] Use Amazon Route 53 multivalue answer routing with health checks that returns the public IP addresses of the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-opensearch-log-search (type: single)

A company runs hundreds of microservices that produce application logs. The operations team needs to run full-text keyword searches on the logs within seconds of the events, and to build interactive dashboards for troubleshooting and real-time application monitoring.

Which solution will meet these requirements?


- [A] Stream the logs to Amazon OpenSearch Service and build the dashboards in OpenSearch Dashboards.

- [B] Load the logs into Amazon Redshift every hour and build reports on the warehouse tables.

- [C] Write the logs to an Amazon DynamoDB table and run Scan operations that filter on keywords.

- [D] Store the logs in Amazon S3 every hour and query them with Amazon Athena from a reporting tool.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-parquet-partition-cost (type: multi)

A company stores 3 years of web server logs as uncompressed CSV files in a single Amazon S3 prefix. Analysts use Amazon Athena, and most queries read a few columns for a single day. Queries are slow, and the company pays for the large amount of data that each query scans.

Which actions will reduce the amount of data scanned by the queries? (Choose two.)

Each correct answer presents a complete solution.


Choose 2.

- [A] Move the files to the S3 Standard-IA storage class.

- [B] Split the files into many smaller CSV files in the same prefix.

- [C] Partition the data by date and filter on the partition column in the queries.

- [D] Convert the files to Apache Parquet.

- [E] Enable S3 Versioning on the bucket.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-partition-placement-cassandra (type: single)

A company runs a 30-node Apache Cassandra cluster on Amazon EC2 instances in one Availability Zone to keep inter-node latency low. The cluster will grow to 60 nodes. The company wants to reduce the risk that a single hardware failure affects several replicas of the same data. Cassandra is rack-aware and must know which nodes share the same underlying hardware so that it can place replicas accordingly.

Which solution will meet these requirements?


- [A] Launch the nodes as Dedicated Instances so that they run on hardware dedicated to the company's account.

- [B] Launch the nodes in a cluster placement group and enable Cassandra replication across the nodes.

- [C] Launch the nodes in a spread placement group so that each node runs on distinct hardware.

- [D] Launch the nodes in a partition placement group and map each partition to a Cassandra rack.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-quicksight-embedded (type: single)

A software-as-a-service (SaaS) company wants to show interactive analytics dashboards inside its web application to thousands of external customers. The customers sign in to the application with its own login and do not have AWS accounts or BI tool licenses. The company does not want to build a charting front end or run visualization servers.

Which solution will meet these requirements?


- [A] Create an Amazon Managed Grafana workspace and give each customer a user account in the workspace.

- [B] Create an IAM user for each customer and share Amazon CloudWatch dashboards with those users.

- [C] Run open-source charting libraries in containers on Amazon ECS and build the dashboards in the application code.

- [D] Embed AWS Quick Sight dashboards in the application and generate embed URLs for anonymous users with the embedding API.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-quicksight-spice-rls (type: multi)

A company publishes an AWS Quick Sight dashboard (Enterprise edition) to 200 regional sales managers. The dataset uses direct query against Amazon Athena, and every visual change runs new queries, so the dashboard is slow and Athena costs are rising. The data changes once a day. Each manager must see only the sales of their own region in the same dashboard.

Which combination of actions will meet these requirements with the LEAST operational overhead? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Grant each manager an IAM policy that limits s3:GetObject to the S3 prefix of the manager's region.

- [B] Create one dataset and one dashboard copy per region and share each copy with the managers of that region.

- [C] Create one Athena workgroup per region with a per-query data usage limit.

- [D] Apply row-level security to the dataset with a permissions dataset that maps each manager to a region.

- [E] Import the dataset into SPICE and schedule a daily refresh after the data changes.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-redshift-warehouse (type: single)

A retail company has 40 TB of structured sales, inventory and customer data. About 300 analysts use a business intelligence (BI) tool all day long to run complex SQL queries with joins and aggregations across these datasets. The analysts need consistently fast query performance, and the data will grow to several hundred terabytes.

Which solution will meet these requirements?


- [A] Store the data in Amazon DynamoDB tables with global secondary indexes and connect the BI tool to DynamoDB.

- [B] Load the data into an Amazon Redshift data warehouse and connect the BI tool to it.

- [C] Store the data in Amazon ElastiCache for Redis and run the queries against the cache.

- [D] Load the data into an Amazon Aurora PostgreSQL DB cluster and add read replicas for the analysts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-s3-file-gateway-smb (type: single)

A company's on-premises applications read and write files on SMB shares, and the local storage array is almost full. The company wants to store the data durably in Amazon S3 and manage it with S3 Lifecycle policies. The applications must keep using SMB without any change, with low-latency access to recently used files.

Which solution will meet these requirements?


- [A] Deploy Amazon S3 File Gateway on premises and create an SMB file share that is backed by an S3 bucket.

- [B] Deploy a Volume Gateway with stored volumes and attach the volumes to the application servers over iSCSI.

- [C] Use AWS DataSync to copy the shares to S3 every night and delete the copied files from the local array.

- [D] Create an AWS Transfer Family server that stores files in S3 and point the applications to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-s3-ingest-vpce-policy (type: multi)

A company ingests sensor files into an Amazon S3 bucket from an application that runs on Amazon EC2 instances in private subnets of a VPC. The security team requires that the upload traffic stay on the AWS network without a NAT device. The bucket must reject every request that does not arrive through the company's designated VPC endpoint.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Enable S3 Transfer Acceleration on the bucket so that the uploads use the AWS edge network.

- [B] Create a NAT gateway with an Elastic IP address and allow only that address in the bucket policy.

- [C] Add a bucket policy statement that denies all S3 actions when aws:SourceVpce does not equal the endpoint ID.

- [D] Turn on S3 Object Lock in governance mode on the bucket for all uploaded objects.

- [E] Create a gateway VPC endpoint for Amazon S3 and associate it with the route tables of the private subnets.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-s3-multipart-large-uploads (type: single)

A media company uploads video files of 2 GB to 40 GB from its studio to an Amazon S3 bucket over a high-bandwidth connection. Each file is sent in a single upload request. The uploads do not use the available bandwidth, and a network error forces the company to restart the whole file.

Which solution will increase upload throughput and reduce the impact of network errors?


- [A] Compress each file before the upload and keep sending it in a single PutObject request.

- [B] Use multipart upload to split each file into parts and upload the parts in parallel.

- [C] Enable S3 Versioning on the bucket so that interrupted uploads are kept as earlier versions.

- [D] Upload the files to the S3 One Zone-IA storage class instead of S3 Standard.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-s3-transfer-acceleration (type: single)

A company's customers in Asia, Europe and South America upload files of 1 GB to 5 GB to a central Amazon S3 bucket in us-east-1. The customers report slow uploads over long distances. The company wants to speed up the uploads with the fewest changes to its upload client, which can change only the endpoint it uses.

Which solution will meet these requirements?


- [A] Enable S3 Transfer Acceleration on the bucket and point the client to the bucket's accelerate endpoint.

- [B] Move the bucket objects to the S3 Express One Zone storage class to increase request performance.

- [C] Create a bucket in each continent's Region, have customers upload to the nearest one, and replicate the objects to us-east-1.

- [D] Create an AWS Global Accelerator standard accelerator with the S3 bucket as its endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-sqs-large-payload (type: single)

A company's ingestion pipeline sends job messages through an Amazon SQS standard queue to a fleet of Java workers. A new requirement adds a document of up to 50 MB to each job. The company wants to keep using SQS and make the fewest possible changes to the producers and workers.

Which solution will meet these requirements?


- [A] Use the Amazon SQS Extended Client Library for Java to store each document in Amazon S3 and send a reference in the message.

- [B] Send each document as an Amazon SNS message to a topic that the workers subscribe to.

- [C] Set the maximum message size attribute of the queue to 50 MB.

- [D] Replace the queue with an SQS FIFO queue, which accepts larger messages.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-tape-gateway-archive (type: single)

A company backs up its on-premises servers to a physical tape library with a backup application that writes to tape drives. The company wants to stop buying, storing and shipping tapes, and to keep backups for 10 years at the lowest storage cost. The backup jobs and the backup application must keep working with a tape interface.

Which solution will meet these requirements?


- [A] Deploy a Volume Gateway with cached volumes, back up to the volumes, and keep EBS snapshots of the volumes for 10 years.

- [B] Create an AWS DataSync task that reads the tape library and writes the backups to S3 Glacier Deep Archive.

- [C] Deploy Amazon S3 File Gateway, back up to its file share, and add an S3 Lifecycle rule that moves objects to S3 Glacier Deep Archive.

- [D] Deploy a Tape Gateway, point the backup application to its virtual tape library, and archive ejected tapes to S3 Glacier Deep Archive.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-tgw-growing-vpcs (type: single)

A company has 12 VPCs in one AWS Region. The VPCs are connected to each other by a full mesh of VPC peering connections, and each VPC has its own AWS Site-to-Site VPN connection to the on-premises data center. The company plans to add 30 more VPCs over the next year. Every VPC must be able to reach every other VPC and the data center.

The company wants a network design that scales with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Peer every VPC with a single hub VPC and route on-premises traffic through the VPN connection of the hub VPC.

- [B] Create a transit gateway, attach every VPC and one Site-to-Site VPN connection to it, and route through its route tables.

- [C] Keep the full mesh and use AWS CloudFormation to create the peering connections and routes for each new VPC.

- [D] Publish an endpoint service in each VPC with AWS PrivateLink and create interface endpoints in every other VPC.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-transfer-family-partner-sftp (type: single)

A financial services company receives nightly batch files from 40 external partners. The partners upload the files with their existing SFTP clients to an on-premises SFTP server. The company wants to retire the server and land the files directly in Amazon S3 for processing. The partners must not change their SFTP clients or transfer process.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an Amazon Data Firehose stream with an HTTP endpoint and ask the partners to send their files to it.

- [B] Run an open-source SFTP server on EC2 instances in an Auto Scaling group that copies the received files to S3.

- [C] Create an AWS Transfer Family server that uses the SFTP protocol and stores the uploaded files in the S3 bucket.

- [D] Give each partner presigned S3 URLs every night and ask them to upload the files with HTTPS requests.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-transfer-sftp-ip-allowlist (type: single)

A company uses an AWS Transfer Family SFTP server to receive files from partners into Amazon S3. The security team requires that only the partners' known public IP address ranges can connect to the server. The partners also require fixed IP addresses for the server so that they can allow them in their own outbound firewalls.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Add a bucket policy that allows s3:PutObject only when aws:SourceIp matches the partner IP address ranges.

- [B] Use a VPC hosted, internal endpoint and require each partner to connect through an AWS Client VPN endpoint.

- [C] Use an internet-facing VPC hosted endpoint with Elastic IP addresses and a security group that allows only the partner ranges.

- [D] Associate an AWS WAF web ACL with an IP set rule that allows the partner ranges with the Transfer Family server.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3c-vpc-secondary-cidr (type: multi)

A company runs a web application on Amazon EC2 instances in an Auto Scaling group. The instances use two subnets in a VPC whose only CIDR block is 10.0.0.0/24, and the whole block is already allocated to those subnets. During peak events, the Auto Scaling group fails to launch instances because the subnets have no free IP addresses. The company expects traffic to triple next year.

The company needs to let the Auto Scaling group scale out with the LEAST disruption to the running application, without migrating it to another VPC.

Which combination of actions will meet these requirements? (Choose two.)

Each correct answer presents part of the solution.


Choose 2.

- [A] Change the primary CIDR block of the VPC from 10.0.0.0/24 to 10.0.0.0/16.

- [B] Attach a second elastic network interface to each instance to give it additional IP addresses.

- [C] Create new subnets from the added CIDR block in each Availability Zone and add them to the Auto Scaling group.

- [D] Create a new VPC with a /16 CIDR block, peer it with the existing VPC, and move the Auto Scaling group.

- [E] Associate a secondary IPv4 CIDR block, such as 10.1.0.0/16, with the existing VPC.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3c-wavelength-5g (type: single)

A gaming company is building an augmented reality game for players who connect from mobile devices over a telecommunications carrier's 5G network in several cities. The game servers must provide the lowest possible latency to the mobile devices, and traffic from the devices to the game servers must not leave the carrier's network.

Which solution will meet these requirements?


- [A] Deploy the game servers in AWS Local Zones near each city and expose them through public IP addresses.

- [B] Deploy the game servers on AWS Outposts racks installed in the company's offices in each city.

- [C] Deploy the game servers in the parent Region and place an Amazon CloudFront distribution in front of them.

- [D] Deploy the game servers in the carrier's AWS Wavelength Zones and route device traffic through a carrier gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-alb-deregistration-delay (type: single)

A company runs a file upload service on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. Some uploads take up to 8 minutes. When the group scales in, users whose uploads are in progress on the terminated instances receive errors. The target group uses its default settings. The company wants in-progress uploads to finish during scale-in while keeping automatic scaling.

Which solution will meet these requirements?


- [A] Turn on duration-based stickiness on the target group so that each user stays on the same instance.

- [B] Increase the deregistration delay of the target group to a value longer than the longest upload, such as 600 seconds.

- [C] Increase the health check grace period of the Auto Scaling group to 10 minutes.

- [D] Enable instance scale-in protection on every instance in the Auto Scaling group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-alb-path-routing (type: single)

A company runs two microservices on Amazon ECS. Requests for /orders/* must go to the order microservice, and requests for /catalog/* must go to the catalog microservice. Clients must use a single HTTPS endpoint, and each microservice must scale independently.

Which solution will meet these requirements?


- [A] Create a Network Load Balancer with one TCP listener on a different port for each microservice and one target group per port.

- [B] Create a Gateway Load Balancer, and register the tasks of both microservices in one target group behind its listener.

- [C] Create an Application Load Balancer with an HTTPS listener and path-pattern rules that forward to one target group per microservice.

- [D] Create two Amazon Route 53 weighted records, one for each microservice, that point to the tasks of that microservice.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-alb-stickiness-legacy (type: single)

A company runs a vendor web application on Amazon EC2. The application keeps session state in memory, and the company cannot modify it because it has no access to the source code. To improve availability, the company now runs the application on several instances in an Auto Scaling group behind an Application Load Balancer across two Availability Zones. Users are signed out when consecutive requests reach different instances. Users must stay on the same instance during their session, and users on a failed instance can sign in again.

Which solution will meet these requirements?


- [A] Replace the load balancer with Route 53 multivalue answer records that return the IP addresses of the instances.

- [B] Turn off cross-zone load balancing on the target group so that each user stays in one Availability Zone.

- [C] Turn on duration-based stickiness on the target group so that the load balancer cookie keeps each user on one instance.

- [D] Store the session state in an Amazon ElastiCache cache that all the instances share.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-apigw-http-api-cost (type: single)

A startup is building a backend for its mobile app. Users sign in with an Amazon Cognito user pool, and the app sends stateless HTTPS requests that must be forwarded to AWS Lambda functions. The API does not need response caching, request validation, API keys or AWS WAF. The company wants the MOST cost-effective solution.

Which solution will meet these requirements?


- [A] Create an API Gateway WebSocket API with a $default route that is integrated with the Lambda functions.

- [B] Create an API Gateway REST API with a private endpoint type and a Lambda authorizer that validates the Cognito tokens.

- [C] Create an API Gateway REST API with Lambda proxy integrations and a Cognito user pool authorizer on each method.

- [D] Create an API Gateway HTTP API with Lambda proxy integrations and a JWT authorizer that uses the Cognito user pool as the token issuer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-apigw-private-api (type: single)

A financial services company runs an internal API on AWS Lambda. Only applications that run in two of the company's VPCs must be able to call the API. The traffic must not traverse the public internet, and the API must reject requests that come from any other network.

Which solution will meet these requirements?


- [A] Create an edge-optimized REST API, and attach an AWS WAF web ACL that allows only the NAT gateway IP addresses of the two VPCs.

- [B] Create a private API Gateway REST API, create an interface VPC endpoint for API Gateway in each VPC, and add a resource policy that allows only those endpoints.

- [C] Create a Regional REST API, and add a resource policy that allows only requests whose aws:SourceVpc value matches one of the two VPCs.

- [D] Create an API Gateway HTTP API, create a VPC link to each VPC, and restrict access with a JWT authorizer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-apigw-stage-cache (type: single)

A travel company runs a REST API in Amazon API Gateway. A Lambda function behind the API reads hotel availability from an Amazon RDS database. Most requests are identical GET requests, and the returned data can be up to 5 minutes old. During peaks, the database is overloaded. The company wants to reduce the number of calls that reach the backend with the LEAST development effort.

Which solution will meet these requirements?


- [A] Create an RDS read replica, and modify the Lambda function to send its queries to the replica.

- [B] Deploy an Amazon ElastiCache cluster, and modify the Lambda function to store query results in the cache.

- [C] Configure reserved concurrency on the Lambda function to limit the number of concurrent database queries.

- [D] Enable API Gateway caching on the production stage with a time-to-live (TTL) of 300 seconds.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-apigw-usage-plans (type: single)

A software company exposes a REST API through Amazon API Gateway. The company sells three subscription tiers. Each customer must receive a request rate limit and a monthly request quota that depend on its tier, and the company must be able to identify which customer sent each request.

Which solution will meet these requirements?


- [A] Create one usage plan for each tier, issue an API key to each customer, and associate each key with the usage plan of its tier.

- [B] Deploy one API stage for each tier, and configure the default stage-level throttling of each stage for that tier.

- [C] Associate an AWS WAF web ACL with the API stage, and create one rate-based rule for each subscription tier.

- [D] Create an HTTP API with a JWT authorizer, and configure route-level throttling for each subscription tier.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-apigw-websocket (type: single)

An online gaming company is building a live leaderboard. Each player's browser must keep a persistent connection, and the backend must push score updates to connected players as soon as scores change, without the browsers polling for updates. The backend logic runs on AWS Lambda, and the company wants a fully managed API service.

Which solution will meet these requirements?


- [A] Create an API Gateway HTTP API with a Lambda integration that returns the latest scores on each client request.

- [B] Create an API Gateway REST API with caching enabled, and have each browser request the leaderboard every second.

- [C] Create an Amazon SQS queue for each player, and have each browser long poll its queue for new scores.

- [D] Create an API Gateway WebSocket API whose routes invoke Lambda functions, and push updates over the open client connections.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-beanstalk-worker-tier (type: single)

A company runs a web application in an AWS Elastic Beanstalk web server environment. Generating a PDF report takes up to 2 minutes and slows down the web requests. The company wants to move report generation to a separate tier that scales independently of the web tier, with the LEAST operational overhead. The report code can be invoked through an HTTP POST request.

Which solution will meet these requirements?


- [A] Create an Elastic Beanstalk worker environment, and have the web tier send report requests to the queue of the worker environment.

- [B] Run report generation as a cron job on the instances of the web server environment during off-peak hours.

- [C] Launch EC2 instances that run a custom daemon which polls an Amazon SQS queue and generates the reports.

- [D] Change the web server environment to a larger instance type so that report generation has more resources.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-cache-write-through-ttl (type: multi)

An ecommerce company caches product prices in Amazon ElastiCache. The application uses only lazy loading. After a price changes in the database, customers sometimes see the old price for a long time. The company wants the cached price to be updated as soon as it changes, and it does not want keys that are no longer read to occupy cache memory indefinitely.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Enable Multi-AZ with automatic failover for the cache in the Region.

- [B] Set a time to live (TTL) on each key that the application writes to the cache.

- [C] Update the cache entry every time the application writes a price to the database.

- [D] Add read replicas to the cache to serve more of the price read requests.

- [E] Move the cache to a larger node type with more memory for the price keys.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-cloudfront-functions (type: single)

A media website is served through Amazon CloudFront and receives millions of requests per second. At the edge, the company must rewrite legacy URLs from /old/ paths to /new/ paths on each viewer request and add a security header to each viewer response. The logic is simple header and URL manipulation with no network calls. The company wants the lowest latency and cost.

Which solution will meet these requirements?


- [A] Add redirect rules to the origin Application Load Balancer, and add the security header in the application on the origin servers.

- [B] Write CloudFront Functions, and associate them with the viewer request and viewer response events of the cache behavior.

- [C] Configure redirection rules in the static website configuration of the origin S3 bucket, and enable compression on the distribution.

- [D] Write Lambda@Edge functions, and associate them with the viewer request and viewer response events of the cache behavior.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-cloudfront-s3-oac (type: single)

A company hosts a static website (HTML pages, scripts and images) in an Amazon S3 bucket in the us-east-1 Region. Users in Europe and Asia report slow page loads. The bucket must not be publicly accessible.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator accelerator, and add the S3 bucket as an endpoint.

- [B] Create a CloudFront distribution with the bucket as its origin and an origin access control, and allow only that distribution in the bucket policy.

- [C] Enable S3 static website hosting, and grant public read access to the objects through a bucket policy.

- [D] Replicate the bucket to Regions in Europe and Asia, and use Route 53 latency-based routing to the website endpoint of each bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-cloudfront-two-origins (type: multi)

A retail company serves static assets from an Amazon S3 bucket and dynamic pages from an Application Load Balancer in one AWS Region. Customers are located around the world. The company wants a single domain name for the website, static assets cached at edge locations, dynamic requests carried over the AWS network from edge locations close to the users, and an S3 bucket that can be read only through the website.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a CloudFront distribution with the bucket and the ALB as origins, and a /static/* cache behavior for the S3 origin.

- [B] Enable S3 Transfer Acceleration on the bucket, and link the static assets to the accelerate endpoint.

- [C] Create an AWS Global Accelerator accelerator with the ALB and the S3 bucket as its endpoints.

- [D] Enable S3 static website hosting, and add the website endpoint to the distribution as a custom origin with public read access.

- [E] Configure an origin access control for the S3 origin, and a bucket policy that allows the CloudFront service principal only for that distribution.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-dax-microsecond-reads (type: single)

A gaming company stores player profiles in an Amazon DynamoDB table. The workload is read-heavy and uses eventually consistent reads. A new feature needs microsecond read latency for these profiles. The developers want to make the fewest possible changes to the application code.

Which solution will meet these requirements?


- [A] Deploy an Amazon ElastiCache for Valkey cluster, and add cache-aside logic to every read and write path of the application.

- [B] Deploy a DynamoDB Accelerator (DAX) cluster, and configure the application to use the DAX client with the cluster endpoint.

- [C] Convert the table to a DynamoDB global table with replicas in two additional Regions.

- [D] Switch the table to provisioned capacity mode, and double its read capacity units.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-dynamodb-on-demand-spikes (type: single)

A ticketing company stores reservations in an Amazon DynamoDB table that uses provisioned capacity with auto scaling. When ticket sales open, write traffic rises within seconds from almost zero to about 3,000 writes per second, and requests are throttled before auto scaling adds capacity. Sales open at irregular times that are not announced in advance. The company wants to stop the throttling without paying for unused capacity between sales, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Switch the table to on-demand capacity mode.

- [B] Send the reservations to an Amazon SQS queue, and have a consumer write them to the table at a steady rate.

- [C] Set the provisioned write capacity permanently to the peak value, and remove the auto scaling policy.

- [D] Create scheduled scaling actions for the table that raise the write capacity at the start of each sale.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-dynamodb-streams-trigger (type: single)

A company stores orders in an Amazon DynamoDB table. Whenever the status of an order item changes to SHIPPED, a confirmation email must be sent to the customer. The company does not want to change the code of the application that writes the orders, and it does not want to run any servers or poll the table.

Which solution will meet these requirements?


- [A] Modify the order application to publish a message to an Amazon SNS topic after each status update.

- [B] Enable Time to Live (TTL) on the table, and send the email when DynamoDB deletes the expired items.

- [C] Enable DynamoDB Streams on the table, and use the stream to trigger a Lambda function that sends the email when the new status is SHIPPED.

- [D] Create a scheduled Amazon EventBridge rule that invokes a Lambda function every minute to scan the table for shipped orders.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-ebs-elastic-volumes (type: single)

A database runs on an Amazon EC2 instance and stores its data on an Amazon EBS gp3 volume. The database needs more storage, more IOPS and more throughput. The company must make the change without stopping the instance or detaching the volume.

Which solution will meet these requirements?


- [A] Stop the instance, change it to a larger instance type, and start it again.

- [B] Modify the existing gp3 volume to increase its size, IOPS and throughput, and then extend the file system.

- [C] Add an instance store volume to the instance, and move the database files to it.

- [D] Create a snapshot of the volume, create a larger volume from the snapshot, and swap the volumes on the instance.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-ecr-cross-region-replication (type: single)

A company is migrating its container applications to Amazon ECS in the us-east-1 Region and is adding a disaster recovery environment in the us-west-2 Region. A CI pipeline pushes the images to a private Amazon ECR registry in us-east-1. Every new image must be available automatically in us-west-2 without any change to the pipeline.

Which solution will meet these requirements?


- [A] Export the images as archives to an Amazon S3 bucket, and configure S3 Cross-Region Replication to a bucket in us-west-2.

- [B] Modify the pipeline so that it pushes each image to the registries of both Regions.

- [C] Create a Lambda function that runs daily to pull the new images from us-east-1 and push them to us-west-2.

- [D] Configure private image replication in the ECR registry settings with a rule that replicates images to us-west-2.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-ecr-enhanced-scanning (type: single)

A company is migrating its Java applications into containers and stores the images in Amazon ECR. The security team requires every image to be scanned automatically when it is pushed and to be rescanned when new vulnerabilities are published. The scans must cover programming language packages, such as Java libraries, in addition to operating system packages.

Which solution will meet these requirements?


- [A] Turn on enhanced scanning for the registry, with continuous scanning powered by Amazon Inspector.

- [B] Turn on tag immutability for the repositories so that scanned images cannot be overwritten.

- [C] Turn on basic scanning with scan on push for all the repositories of the registry.

- [D] Add a weekly step to the build pipeline that starts a manual basic scan of the latest images.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-ecs-awslogs (type: single)

A company is migrating a web application to containers on Amazon ECS with AWS Fargate. On premises, the application wrote its logs to local files that operators read on the servers. On Fargate, operators cannot sign in to the hosts, and the logs are lost when tasks stop. The application can be configured to write its logs to standard output. The company wants the logs centralized, searchable and retained after tasks stop, with the LEAST effort.

Which solution will meet these requirements?


- [A] Write the logs to the task's ephemeral storage, and run a cron job in the container that copies them to Amazon S3 every hour.

- [B] Configure the awslogs log driver in the container definition so that container output is sent to Amazon CloudWatch Logs.

- [C] Turn on AWS CloudTrail for the account, and search the trail for the application log entries.

- [D] Enable VPC Flow Logs on the subnets of the tasks, and publish the flow logs to Amazon CloudWatch Logs.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-ecs-secrets-injection (type: single)

A company is containerizing a legacy Java application to run on Amazon ECS with AWS Fargate. Today, the database password is hard-coded in a properties file that is copied into the image. The security team requires that the image contain no credentials and that the password be stored encrypted and managed centrally. The application can already read the password from an environment variable, and its code must not change.

Which solution will meet these requirements?


- [A] Add the password as a plaintext value in the environment section of the container definition in the task definition.

- [B] Store the password in an Amazon S3 object, and download it in the container entrypoint script at startup.

- [C] Pass the password as a Docker build argument when the image is built, and set the environment variable from it.

- [D] Store the password in AWS Secrets Manager, and reference the secret in the secrets section of the container definition.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-elasticache-lazy-loading (type: single)

A news website runs on Amazon EC2 instances and stores articles in an Amazon RDS for PostgreSQL database. The same article queries run thousands of times each minute, and the database CPU utilization is high. The company wants sub-millisecond read latency for these queries and less load on the database. Article data can be a few minutes out of date.

Which solution will meet these requirements?


- [A] Add an Amazon ElastiCache cache, and have the application cache query results with a TTL after each cache miss.

- [B] Create two RDS read replicas in the same Region, and send the article queries to the replicas through their endpoints.

- [C] Convert the database to a Multi-AZ DB instance deployment with a standby instance in a second Availability Zone.

- [D] Modify the DB instance to a larger instance class with more vCPUs and memory, and increase its allocated storage.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-elasticache-serverless (type: single)

A media company is launching an application whose traffic is unpredictable and spikes suddenly during live events. The application needs a Valkey-compatible cache in front of its Amazon Aurora database. The cache must be highly available across multiple Availability Zones. The team does not want to forecast or manage cache capacity, and the solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a node-based ElastiCache for Memcached cluster with nodes in three Availability Zones, and add nodes before each live event.

- [B] Create a node-based ElastiCache for Valkey cluster with cluster mode enabled, replicas in three Availability Zones, and auto scaling policies on CPU and memory.

- [C] Create an Amazon ElastiCache Serverless cache for Valkey, and configure the application to use the cache endpoint.

- [D] Add Aurora Replicas with Aurora Auto Scaling, and direct the cached reads to the reader endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-eventbridge-cross-account (type: single)

A company has an organization in AWS Organizations with 30 member accounts. The security team wants every EC2 instance state-change event from all the member accounts to be delivered, as it occurs, to a central event bus in a security account, where a rule invokes an AWS Lambda function. The solution must require the LEAST custom code.

Which solution will meet these requirements?


- [A] Create an Amazon SQS queue in the security account, and deploy a forwarding Lambda function in each member account that writes events to it.

- [B] Deploy a Lambda function in each member account that calls DescribeInstances every minute and sends changes to the security account.

- [C] Turn on AWS CloudTrail in each account, and have the Lambda function read the trail log files from Amazon S3 every 5 minutes.

- [D] Add a policy to the central event bus that allows the organization to put events, and create a rule in each member account that targets the central bus.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-fargate-efs-shared (type: single)

A company is moving a content management application to Amazon ECS on AWS Fargate. Several tasks that run in different Availability Zones must read and write the same set of files, and the files must persist after the tasks stop. The company does not want to manage any storage servers.

Which solution will meet these requirements?


- [A] Attach an Amazon EBS volume to each task, and write the files to that volume.

- [B] Increase the Fargate ephemeral storage of each task, and write the files to it.

- [C] Define an Amazon EFS volume in the task definition, and mount it in the application container.

- [D] Configure a bind mount to a host path in the task definition, and write the files to the host.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-gateway-endpoints-tier (type: single)

The application tier of a three-tier application runs in private subnets in two Availability Zones. It reads and writes large volumes of data in Amazon S3 and Amazon DynamoDB in the same Region through NAT gateways, and the NAT gateway data processing charges are high. The application tier still needs the NAT gateways to call a few third-party APIs on the internet. The company wants the S3 and DynamoDB traffic to stay on the AWS network in the MOST cost-effective way.

Which solution will meet these requirements?


- [A] Create gateway VPC endpoints for Amazon S3 and DynamoDB, and associate them with the route tables of the private subnets.

- [B] Move the application tier to public subnets, and assign a public IP address to each instance.

- [C] Replace the NAT gateways with NAT instances on smaller EC2 instance types in each Availability Zone.

- [D] Create interface VPC endpoints for Amazon S3 and DynamoDB in the private subnets, and enable private DNS on the endpoints.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-gwlb-inspection (type: multi)

A company must inspect all inbound internet traffic to an application VPC with a fleet of third-party firewall virtual appliances from an AWS Marketplace vendor. The appliances run in a separate inspection VPC. The fleet must scale horizontally, traffic must be spread across healthy appliances, and the inspection must be transparent to the application.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Deploy a Gateway Load Balancer in the inspection VPC, and register the appliances in its target group.

- [B] Replace the appliances with security group rules on the application instances.

- [C] Deploy a Network Load Balancer in the inspection VPC with a TCP listener in front of the appliances.

- [D] Create Gateway Load Balancer endpoints in the application VPC, and route inbound traffic through them.

- [E] Peer the two VPCs, and add routes that point to the network interface of one appliance.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-internal-alb-app-tier (type: single)

In a multi-tier application, web servers in an Auto Scaling group in private subnets call an application tier over HTTP. The application tier runs in another Auto Scaling group in private subnets of two Availability Zones, and its instance IP addresses change as it scales. The application tier must not be reachable from the internet, and requests must be spread across the healthy application instances.

Which solution will meet these requirements?


- [A] Create a second internet-facing Application Load Balancer for the application tier, and restrict it with a security group that allows only the web servers.

- [B] Create an A record for each application instance in a Route 53 public hosted zone, and have the web servers resolve the records.

- [C] Create an internal Application Load Balancer in the private subnets, attach it to the application tier's Auto Scaling group, and have the web servers call its DNS name.

- [D] Associate an Elastic IP address with each application instance, and configure the web servers with the list of addresses.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-kinesis-enhanced-fanout (type: single)

A company streams telemetry through an Amazon Kinesis data stream in provisioned mode. Three consumer applications read the stream with GetRecords. After two more consumer applications were added, the consumers receive ReadProvisionedThroughputExceeded errors and their read latency rises to about 1 second. Each of the five applications must read the whole stream with a latency of about 70 ms. The write throughput is sufficient, and the company does not want to change the number of shards.

Which solution will meet these requirements?


- [A] Have the consumers call GetRecords less often with a larger record limit on each call.

- [B] Register each application as an enhanced fan-out consumer of the stream so that it receives records through SubscribeToShard.

- [C] Have one consumer copy the records to an Amazon SQS standard queue that the other applications poll.

- [D] Increase the data retention period of the stream to 7 days so that the consumers can catch up later.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-lambda-async-destination (type: single)

Amazon S3 event notifications invoke an AWS Lambda function asynchronously to process uploaded invoices. Some invocations still fail after Lambda's automatic retries, and those events are lost. The operations team needs a record of each failed event, including the original request payload and the error details, so that it can reprocess the event later. The solution must require the LEAST effort.

Which solution will meet these requirements?


- [A] Enable S3 Versioning on the bucket so that every uploaded invoice can be processed again.

- [B] Configure an on-failure destination, such as an SQS queue, for the function's asynchronous invocations.

- [C] Increase the timeout and the memory of the function so that fewer invocations fail.

- [D] Turn on AWS CloudTrail data events for Lambda, and search the trail for failed invocations.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-lambda-global-state (type: single)

An AWS Lambda function processes orders and keeps a running count of the orders processed each day in a global variable. A second function reads the count at midnight to build a daily report. Under heavy load, the reported totals are too low, and the count sometimes starts again from zero during the day. The company needs an accurate daily count with the LEAST effort.

Which solution will meet these requirements?


- [A] Write the count to a file in the /tmp directory of the function, and read the file in each invocation.

- [B] Set the reserved concurrency of the function to 1 so that all invocations share one global variable.

- [C] Store the count in an Amazon DynamoDB item, and increment it in each invocation with an UpdateItem update expression.

- [D] Increase the memory of the function so that its execution environment is kept for the whole day.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-microservice-own-data (type: single)

A retail company has split its monolithic application into order, inventory and customer microservices that run on Amazon ECS. The three microservices still read and write the same tables in one shared Amazon RDS database. Last week, a schema change made by the inventory team broke the order microservice. The company wants each team to change and deploy its microservice independently.

Which solution will meet these requirements?


- [A] Give each microservice its own data store that only it accesses, and expose its data to the others through its API or through events.

- [B] Combine the three microservices in a single ECS task definition so that they are always deployed together.

- [C] Create a read replica of the shared database for each microservice, and keep all the writes on the primary instance.

- [D] Place an Amazon RDS Proxy in front of the shared database, and connect the three microservices through the proxy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-nlb-static-ip-tcp (type: single)

A trading company runs an application that uses a proprietary TCP protocol on Amazon EC2 instances in two Availability Zones of one AWS Region. Its clients allow outbound traffic only to a fixed list of IP addresses. The load balancer must handle millions of requests per second with very low latency, and the application must see the original client IP addresses.

Which solution will meet these requirements?


- [A] Create an Amazon CloudFront distribution with the instances as a custom origin, and publish the CloudFront IP ranges to the clients.

- [B] Create a Network Load Balancer with a TCP listener, associate an Elastic IP address with each subnet, and register the instances by instance ID.

- [C] Create an Application Load Balancer with an HTTPS listener, and read the client addresses from the X-Forwarded-For header.

- [D] Create a Gateway Load Balancer, and register the instances in a target group that uses the GENEVE protocol.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-predictive-warm-pool (type: multi)

A company runs an application on Amazon EC2 instances in an Auto Scaling group that already has a target tracking scaling policy. New instances need about 10 minutes to initialize. Every workday, traffic ramps up steeply at 8:00 AM, and the pattern has been consistent for months. Unexpected spikes also occur during the day. The company wants capacity in place before the daily ramp without maintaining a schedule, and instances added for unexpected spikes must start serving traffic quickly.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Increase the health check grace period of the group to 10 minutes.

- [B] Change the launch template to use a larger instance type.

- [C] Add a predictive scaling policy to the Auto Scaling group.

- [D] Create a recurring scheduled action that raises the desired capacity at 7:45 AM every workday.

- [E] Add a warm pool of pre-initialized instances in the Stopped state to the Auto Scaling group.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-rds-write-scale-up (type: single)

An Amazon RDS for MySQL DB instance reaches 95% CPU utilization during a nightly batch import. The import consists almost entirely of INSERT and UPDATE statements, and read traffic is low at that time. The company wants to improve the import performance without changing the application code.

Which solution will meet these requirements?


- [A] Place an Amazon ElastiCache cluster in front of the database to absorb the import traffic.

- [B] Create two read replicas, and keep the import connected to the primary DB instance.

- [C] Convert the DB instance to a Multi-AZ DB instance deployment.

- [D] Modify the DB instance to a larger DB instance class with more vCPUs and memory.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-s3-transfer-acceleration (type: single)

A research institute has laboratories on four continents. Each laboratory uploads multi-gigabyte result files over the internet to a single Amazon S3 bucket in the eu-west-1 Region by using the S3 API. Uploads from the most distant laboratories are slow. The institute wants faster uploads to the existing bucket with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Order an AWS Direct Connect connection for each laboratory, and upload through a public virtual interface.

- [B] Create an AWS Site-to-Site VPN connection from each laboratory to a VPC in eu-west-1, and upload through the VPN.

- [C] Create a bucket in the Region closest to each laboratory, and configure S3 Replication from each bucket to the bucket in eu-west-1.

- [D] Enable S3 Transfer Acceleration on the bucket, and configure the laboratories to upload through the accelerate endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-secrets-replica-region (type: single)

A company runs an application in the us-east-1 Region with a warm standby copy in the us-west-2 Region. The database credentials are stored in AWS Secrets Manager in us-east-1 and are rotated automatically every 30 days. During an outage of us-east-1, the standby application must retrieve the current credentials from within us-west-2. Rotations must reach us-west-2 without any custom code.

Which solution will meet these requirements?


- [A] Create a multi-Region AWS KMS key, and replicate the key to us-west-2 for the standby application.

- [B] Configure the standby application to call the Secrets Manager endpoint in us-east-1 to retrieve the secret.

- [C] Replicate the secret to us-west-2, and configure the standby application to read the replica secret in us-west-2.

- [D] Create a Lambda function that copies the secret value to a SecureString parameter in us-west-2 after each rotation.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-security-group-chaining (type: multi)

A three-tier application uses an internet-facing Application Load Balancer with the security group sg-alb, application instances on port 8080 with the security group sg-app, and an Amazon RDS for PostgreSQL DB instance on port 5432 with the security group sg-db. The application instances scale in and out, so their IP addresses change. The company wants least-privilege access: the application instances must accept traffic only from the load balancer, and the database must accept traffic only from the application instances.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Add an inbound rule to sg-app that allows TCP port 8080 from the source sg-alb.

- [B] Add an outbound rule to sg-db that denies all traffic to the public subnets.

- [C] Add an inbound rule to sg-app that allows TCP port 8080 from 0.0.0.0/0.

- [D] Add an inbound rule to sg-db that allows TCP port 5432 from the CIDR block of the VPC.

- [E] Add an inbound rule to sg-db that allows TCP port 5432 from the source sg-app.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-sns-filter-policies (type: multi)

An order service publishes all order events (created, paid, shipped and cancelled) to one Amazon SNS topic, with the event type in a message attribute named event_type. The shipping service must process only paid events, and the support service must process only cancelled events, each from its own Amazon SQS queue. The order service must not change, and the services must not receive events that they do not need.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Attach a filter policy to each subscription that matches the event_type value that the service needs.

- [B] Add a queue policy to each SQS queue that rejects messages with other event_type values.

- [C] Have each service receive every message and delete the messages that it does not need.

- [D] Subscribe the SQS queue of each service to the existing SNS topic.

- [E] Create one SNS topic for each event type, and update the order service to publish to the matching topic.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-sqs-delay-queue (type: single)

An online store sends each new order to an Amazon SQS standard queue that fulfillment workers consume. Customers can cancel an order free of charge during the first 5 minutes. The company wants the workers to receive every order only 5 minutes after it is sent to the queue, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Configure the queue as a delay queue by setting its delivery delay to 300 seconds.

- [B] Set the message retention period of the queue to 5 minutes so that orders are released after that time.

- [C] Set the visibility timeout of the queue to 5 minutes so that new messages stay hidden from the workers.

- [D] Have each worker wait 5 minutes after it receives a message before it starts processing the order.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-sqs-lambda-partial-batch (type: multi)

An AWS Lambda function consumes an Amazon SQS standard queue through an event source mapping with a batch size of 10. When one message in a batch fails, the whole batch returns to the queue, so messages that were already processed successfully are processed again. A few malformed messages fail every time and are retried indefinitely. The company must keep batch processing for throughput.

Which combination of actions will resolve these issues? (Choose two.)


Choose 2.

- [A] Increase the timeout of the Lambda function to the maximum value of 15 minutes.

- [B] Configure a dead-letter queue on the Lambda function to receive its failed invocations.

- [C] Set the batch size of the event source mapping to 1 so that each message is processed separately.

- [D] Turn on ReportBatchItemFailures for the event source mapping, and return the failed message IDs.

- [E] Configure a redrive policy with a dead-letter queue and a maxReceiveCount on the source SQS queue.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}
