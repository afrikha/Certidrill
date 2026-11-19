## saac03-2a-stateless-s3-sessions (type: multi)

A photo-sharing application runs on a single Amazon EC2 instance. The application stores uploaded photos on the instance's Amazon EBS volume and keeps user sessions in local memory. The company wants to run the application on multiple instances in an Auto Scaling group across several Availability Zones so that any instance can serve any request.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Enable sticky sessions on the load balancer target group.

- [B] Use EBS Multi-Attach to share the existing volume with all the instances.

- [C] Move the application to a larger instance type.

- [D] Store the user sessions in an Amazon ElastiCache cache.

- [E] Store the uploaded photos in an Amazon S3 bucket instead of on the local EBS volume.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2a-transfer-family-as2 (type: single)

A manufacturer exchanges EDI purchase orders with large retail trading partners. The partners require the AS2 protocol with signed and encrypted messages and message disposition notifications (MDNs). The manufacturer wants the received documents stored in Amazon S3 and does not want to install or operate AS2 server software.

Which solution will meet these requirements?


- [A] Create an AWS Transfer Family server that uses the SFTP protocol, and create one SFTP user for each trading partner.

- [B] Create an AWS Transfer Family server that uses the AS2 protocol, and configure profiles, agreements and certificates for each trading partner.

- [C] Install commercial AS2 software on EC2 instances in an Auto Scaling group, and copy the received files to Amazon S3.

- [D] Create an Amazon AppFlow flow for each trading partner that copies the purchase orders to Amazon S3.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-transfer-family-sftp (type: single)

A logistics company receives daily inventory files from 40 partners. The partners send the files with their existing SFTP clients and cannot change their tools. The company wants to store the files in Amazon S3 and does not want to manage any servers.

Which solution will meet these requirements?


- [A] Create an AWS Transfer Family server that uses the SFTP protocol with Amazon S3 as its storage, and create a user for each partner.

- [B] Ask each partner to deploy an AWS DataSync agent, and create a DataSync task that copies its files to Amazon S3.

- [C] Deploy an Amazon S3 File Gateway, and give each partner access to an SMB file share on the gateway.

- [D] Run SFTP server software on EC2 instances in an Auto Scaling group, and copy the received files to Amazon S3 with a scheduled script.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-valkey-vs-memcached (type: single)

A company stores user shopping carts in a cache so that its web tier stays stateless. The cart data uses hash data structures. The cached data must survive the failure of a cache node, and the cache must fail over automatically to another Availability Zone. The company wants a node-based cluster so that it can choose the node types.

Which solution will meet these requirements?


- [A] Create a DynamoDB Accelerator (DAX) cluster with nodes in three Availability Zones, and write the carts through it.

- [B] Run open source cache software on EC2 instances in an Auto Scaling group that spans two Availability Zones.

- [C] Create an Amazon ElastiCache for Valkey replication group with a replica in a second Availability Zone and Multi-AZ enabled.

- [D] Create an Amazon ElastiCache for Memcached cluster with nodes spread across two Availability Zones in the Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2a-vertical-instance-resize (type: single)

A company runs a licensed analytics server on a single EBS-backed Amazon EC2 instance of the m6i.xlarge type. The license covers exactly one server, and the software keeps its working state on the instance, so it cannot run on several instances. During monthly reporting, users receive out-of-memory errors. A short maintenance window is acceptable.

Which solution will meet these requirements?


- [A] Create an Amazon CloudWatch alarm that recovers the instance automatically when a status check fails.

- [B] Launch the instance in a cluster placement group to increase its network performance.

- [C] Create an Auto Scaling group of three instances from an AMI of the server, and place it behind an Application Load Balancer.

- [D] Stop the instance, change its instance type to a memory optimized type such as r6i.2xlarge, and start it again.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-amazon-mq-migrate (type: single)

A company is migrating an on-premises order management system to AWS. Its applications exchange messages through an Apache ActiveMQ broker by using JMS clients. The company must not rewrite the messaging code of the applications and wants AWS to handle broker setup, maintenance, and version upgrades.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Install ActiveMQ on Amazon EC2 instances in an Auto Scaling group, and point the applications to them.

- [B] Create an Amazon Kinesis data stream, and change the applications to use the Kinesis Client Library.

- [C] Create an Amazon MQ for ActiveMQ broker, and point the applications to the broker endpoints.

- [D] Create Amazon SQS standard queues, and change the applications to use the AWS SDK.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-apigw-sqs-async (type: multi)

A company exposes a REST API on Amazon API Gateway. A POST /reports request invokes an AWS Lambda function synchronously, and the function generates a report in up to 10 minutes. Clients often receive timeout errors, and request bursts sometimes exceed what the report generator can handle. The company wants clients to receive an immediate acknowledgment, requests to be buffered during bursts, and failed report generations to be retried.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Change the POST method to an AWS service integration that sends the request body to an Amazon SQS queue.

- [B] Increase the integration timeout of the POST method and the timeout of the Lambda function to 15 minutes.

- [C] Configure an event source mapping so that the queue invokes the report-generation Lambda function.

- [D] Enable API Gateway caching on the stage for the POST /reports method.

- [E] Configure provisioned concurrency on the report-generation Lambda function.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-aurora-replica-autoscale (type: multi)

A company runs an Amazon Aurora MySQL DB cluster with one writer instance and one Aurora Replica. Read traffic from a mobile app is unpredictable and sometimes grows fivefold for a few hours. The company wants read capacity to grow and shrink automatically with demand, and new readers must start receiving read connections without application configuration changes.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Add an Aurora Auto Scaling target tracking policy for Aurora Replicas based on average reader CPU utilization.

- [B] Change the writer instance to the largest available instance class.

- [C] Configure the application to send read queries to the reader endpoint of the cluster.

- [D] Configure the application to send read queries to the instance endpoint of the existing Aurora Replica.

- [E] Configure the application to send read queries to the cluster endpoint.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-aurora-serverless-zero (type: single)

A company has dozens of development and test environments, each with its own MySQL-compatible database. The databases are used only a few hours per day at unpredictable times and are idle at night and on weekends. Developers accept a delay of about 15 seconds on the first connection after an idle period. The company wants to minimize database compute costs without writing or maintaining start and stop scripts.

Which solution will meet these requirements?


- [A] Use Amazon RDS for MySQL DB instances, and buy Reserved DB Instances for all environments.

- [B] Use Aurora Serverless v2 clusters with a minimum capacity of 0 ACUs so that idle instances pause automatically.

- [C] Use Aurora provisioned clusters, and stop them every night with a scheduled AWS Lambda function.

- [D] Use Amazon RDS for MySQL DB instances of the smallest instance class in Multi-AZ deployments.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-batch-containers (type: single)

A pharmaceutical research company runs thousands of independent simulation jobs every week. Each job is packaged as a container image, runs for 1 to 6 hours, and can be restarted if it is interrupted. The company wants a managed service that queues the jobs, provisions compute capacity (including Spot Instances) based on the queued work, and runs the jobs, without the company building or operating its own scheduler.

Which solution will meet these requirements?


- [A] Deploy the container images as AWS Lambda functions that an Amazon SQS queue invokes for each job.

- [B] Submit the jobs to an AWS Batch job queue that uses a managed compute environment with EC2 Spot Instances.

- [C] Create one Amazon ECS service for each job with a desired count of 1, and delete the service when the job ends.

- [D] Run the jobs on an Amazon EKS cluster with a custom job scheduler that the team writes and maintains.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-containers-dependencies (type: single)

A software company runs five long-running internal web applications on the same group of Amazon EC2 instances. The applications need different and conflicting versions of the same libraries and language runtimes, and a deployment of one application often breaks another. The company wants each application packaged with its own dependencies so that it runs the same way in development, test, and production, while the applications continue to share the underlying compute.

Which solution will meet these requirements?


- [A] Package each application as a container image, and run the images as Amazon ECS services on a shared cluster.

- [B] Rewrite each application as AWS Lambda functions that share a common Lambda layer.

- [C] Give each application its own dedicated EC2 instances built from a separate AMI.

- [D] Install every library version on each instance, and select versions with environment variables.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-cross-region-rr (type: single)

A company runs an Amazon RDS for MySQL DB instance in the us-east-1 Region. The company is opening an office in Europe and wants users there to run read-only queries with low latency. The company also wants a copy of the database in the eu-west-1 Region that can become a writable database if us-east-1 is unavailable. The company does not want to change its database engine.

Which solution will meet these requirements?


- [A] Copy the automated snapshots to eu-west-1 every day, and restore the latest snapshot when European users need data.

- [B] Migrate the database to Amazon Aurora MySQL, and add eu-west-1 as a secondary Region of an Aurora global database.

- [C] Convert the DB instance to a Multi-AZ deployment, and place the standby instance in eu-west-1.

- [D] Create a cross-Region read replica of the DB instance in eu-west-1, and promote it if us-east-1 becomes unavailable.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-dynamodb-keyvalue (type: single)

A gaming company needs a database for player profiles and game state. The data is always accessed by player ID, its attributes change often, and the database must deliver consistent single-digit millisecond latency for millions of players. The company does not want to manage servers or plan capacity in advance.

Which database service should the company use?


- [A] Amazon RDS for MySQL with read replicas

- [B] Amazon Neptune with Neptune Replicas

- [C] Amazon DynamoDB with on-demand capacity mode

- [D] Amazon Redshift with a provisioned cluster

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-ecs-anywhere (type: single)

A manufacturing company runs containerized data-processing workloads on Amazon ECS in AWS. Some of the same containers must also run on the company's existing Linux servers in its factories, because the data must be processed on premises. The company wants to manage both environments with the same ECS APIs, task definitions, and console, without operating a container orchestrator on premises. The on-premises tasks only send results to AWS and receive no inbound traffic.

Which solution will meet these requirements?


- [A] Install Amazon EKS Anywhere on the factory servers, and convert the ECS task definitions to Kubernetes manifests.

- [B] Run the containers with Docker on the factory servers, and start them with AWS Systems Manager Run Command.

- [C] Use Amazon ECS Anywhere to register the factory servers as external instances of an ECS cluster, and run the tasks on them.

- [D] Install AWS Outposts servers in each factory, and run the ECS tasks on the Outposts capacity.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-ecs-ec2-privileged (type: single)

A security vendor is containerizing two components on Amazon ECS. A network-monitoring agent must run in privileged mode and needs access to devices of the host. A web dashboard is a stateless container with no special requirements. The vendor wants to minimize the infrastructure that it manages.

Which solution will meet these requirements?


- [A] Run both components on AWS Fargate, and add the required Linux capabilities and devices in the task definition of the agent.

- [B] Run the monitoring agent on ECS container instances with the EC2 launch type, and run the dashboard on AWS Fargate.

- [C] Run both components on AWS Fargate, and set the privileged parameter to true in the task definition of the agent.

- [D] Run both components on ECS container instances with the EC2 launch type in one Auto Scaling group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-ecs-service-desired (type: single)

A company runs a containerized order API on Amazon ECS with AWS Fargate. Four copies of the API must always run across two Availability Zones behind an Application Load Balancer. Any copy that stops or fails the load balancer health check must be replaced automatically, without custom code.

Which solution will meet these requirements?


- [A] Create an ECS service with a desired count of 4 that is associated with the target group of the load balancer.

- [B] Create an ECS service that uses the DAEMON scheduling strategy to run one task on each Fargate node.

- [C] Start four standalone tasks with the RunTask API, and register them with the target group of the load balancer.

- [D] Create an ECS scheduled task that starts four tasks every 5 minutes and registers them with the target group.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-efs-shared-linux (type: single)

A company runs a content management system on Linux Amazon EC2 instances in an Auto Scaling group that spans three Availability Zones. All instances must read and write the same set of files concurrently through a standard POSIX file system interface. The storage must remain available if one Availability Zone fails.

Which storage solution will meet these requirements?


- [A] An Amazon EBS io2 volume with Multi-Attach enabled and attached to every instance in the Auto Scaling group.

- [B] An Amazon EBS gp3 volume attached to each instance, with the files synchronized between volumes by a scheduled script.

- [C] An Amazon EFS Regional file system mounted on every instance in the Auto Scaling group.

- [D] An Amazon S3 bucket that the application accesses through the S3 API for every file operation.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-eks-fargate-daemonset (type: single)

A company runs Amazon EKS, and all its stateless pods run on AWS Fargate. The security team now requires a monitoring agent to run as a Kubernetes DaemonSet, and a new image-processing workload needs GPUs. The company wants to keep its existing Fargate pods and minimize the infrastructure that it manages.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Add an Amazon EKS managed node group of GPU instances, and run the DaemonSet and the image-processing workload on its EC2 nodes.

- [B] Run the monitoring agent as a privileged container in every Fargate pod, and move the image-processing workload to AWS Lambda.

- [C] Migrate all workloads to a self-managed Kubernetes cluster on EC2 instances that run the DaemonSet and the GPU workload.

- [D] Add a Fargate profile for the monitoring namespace, and request GPU resources in the pod specification of the image-processing workload.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-eks-migrate-k8s (type: single)

A company runs dozens of microservices on a self-managed Kubernetes cluster in its data center. The teams deploy with Kubernetes manifests and Helm charts. The company wants to move the workloads to AWS, stop managing the Kubernetes control plane, and keep its existing Kubernetes tooling and manifests with minimal changes.

Which solution will meet these requirements?


- [A] Rewrite the microservices as AWS Lambda functions behind Amazon API Gateway.

- [B] Install Kubernetes on Amazon EC2 instances in an Auto Scaling group, and deploy the existing manifests.

- [C] Convert the manifests to Amazon ECS task definitions, and run the services on AWS Fargate.

- [D] Run the microservices on an Amazon EKS cluster, and deploy them with the existing manifests and Helm charts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-eventbridge-rule-dlq (type: multi)

A company's microservices publish events to an Amazon EventBridge custom event bus. A new billing microservice must receive only the events in which the detail.status field equals PAYMENT_FAILED, and the publishing microservices must not be changed. Events that EventBridge cannot deliver to the billing target after all retries must be kept for later reprocessing.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a rule on the custom event bus with an event pattern that matches detail.status PAYMENT_FAILED and targets the billing microservice.

- [B] Configure an Amazon SQS standard queue as the dead-letter queue of the rule target.

- [C] Change the publishing microservices to send PAYMENT_FAILED events directly to the billing microservice.

- [D] Attach an Amazon SNS subscription filter policy to the custom event bus for the billing microservice.

- [E] Configure an Amazon SQS FIFO queue as the dead-letter queue of the rule target.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-eventbridge-saas (type: single)

A company uses a third-party SaaS help desk application that is an Amazon EventBridge partner. When a ticket with urgent priority is created, the company wants to start an AWS Step Functions workflow. All other ticket events must be sent to an Amazon SQS queue for later analysis. The company does not want to write or host any polling code.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an Amazon SNS topic for the SaaS application, and subscribe the Step Functions state machine and the SQS queue with filter policies.

- [B] Configure webhooks in the SaaS application that call an Application Load Balancer in front of EC2 instances that route the tickets.

- [C] Associate the partner event source with a partner event bus, and create rules whose event patterns route urgent tickets to Step Functions and other tickets to SQS.

- [D] Write an AWS Lambda function that calls the API of the SaaS application every minute and routes each new ticket based on its priority.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-fargate-no-servers (type: single)

A startup has packaged its web API as a container image stored in Amazon ECR. The API must run continuously behind an Application Load Balancer. The team does not want to provision, patch, or scale any Amazon EC2 instances or cluster capacity for the containers.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Run the API as an Amazon ECS service that uses AWS Fargate, and register the service with the target group of the Application Load Balancer.

- [B] Create an Amazon ECS cluster that uses an Auto Scaling group of EC2 instances as a capacity provider, and run the API as an ECS service.

- [C] Create an Amazon EKS cluster with self-managed nodes, and deploy the API as a Kubernetes deployment.

- [D] Launch EC2 instances from an Amazon ECS-optimized AMI in an Auto Scaling group, and run the container with Docker on each instance.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-fsx-lustre-hpc (type: single)

An automotive company runs computational fluid dynamics simulations on hundreds of Linux Amazon EC2 instances. The input datasets are stored in Amazon S3. The simulations need a shared POSIX file system with sub-millisecond latency and very high aggregate throughput, and the results must be written back to the S3 bucket when the jobs finish.

Which storage solution will meet these requirements?


- [A] The S3 bucket itself, accessed through the S3 API by every instance during the simulation

- [B] An Amazon EFS Regional file system that AWS DataSync fills from the S3 bucket before each run

- [C] An Amazon FSx for Lustre file system linked to the S3 bucket through a data repository association

- [D] An Amazon FSx for Windows File Server file system that the instances mount over SMB

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-fsx-windows-smb (type: single)

A company is migrating Windows applications to Amazon EC2. The applications store user files on an on-premises Windows file server, access them over the SMB protocol, and rely on Microsoft Active Directory users and Windows access control lists (ACLs). The new file storage must be fully managed and must remain available if an Availability Zone fails.

Which solution will meet these requirements?


- [A] Deploy an Amazon FSx for Lustre persistent file system linked to an Amazon S3 bucket.

- [B] Deploy an Amazon FSx for Windows File Server Multi-AZ file system joined to the Active Directory domain.

- [C] Deploy an Amazon EFS Regional file system, and mount it from the Windows EC2 instances.

- [D] Attach an Amazon EBS volume to a Windows EC2 instance, and share its folders over SMB.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-ga-udp-multiregion (type: multi)

A gaming company runs multiplayer game servers that use UDP on Amazon EC2 instances in the us-east-1 and eu-west-1 Regions. Players' firewalls must allow-list a fixed set of IP addresses. Players must be routed over the AWS global network to the nearest healthy Region, and traffic must move to the other Region within about a minute if a Region becomes unhealthy, without depending on DNS caching by clients.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create Amazon Route 53 latency-based records with health checks that point to Elastic IP addresses in each Region.

- [B] Create an Amazon CloudFront distribution that uses the game servers of both Regions as origins.

- [C] Create an AWS Global Accelerator standard accelerator with an endpoint group in each Region.

- [D] Place a Network Load Balancer with UDP listeners in front of the game servers in each Region, and add the load balancers as endpoints.

- [E] Place an Application Load Balancer in front of the game servers in each Region, and add the load balancers as endpoints.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-instance-store-scratch (type: single)

A research team runs a genomics pipeline on a fleet of Amazon EC2 instances. Each job writes hundreds of gigabytes of intermediate scratch files that need the lowest possible latency and very high I/O. The scratch files can be regenerated if they are lost, and the final results are copied to Amazon S3 at the end of each job. The team wants to avoid paying for separate storage volumes for the scratch files.

Which storage option should the team use for the scratch files?


- [A] Instance store volumes on an instance type that includes local NVMe SSD storage

- [B] An Amazon S3 bucket that each instance accesses through the S3 API

- [C] An Amazon EFS file system shared by all instances of the fleet

- [D] Amazon EBS io2 Block Express volumes attached to each instance

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-kinesis-replay (type: single)

A gaming company collects player clickstream events. Several independent applications (a real-time leaderboard, a fraud detector, and an archiving job) must each read the full stream of events, and events for the same player must be read in the order in which they were produced. After deploying a new model, the fraud team must be able to reprocess the events of the last 3 days.

Which service should the company use to ingest the events?


- [A] An Amazon EventBridge custom event bus with a rule that sends the events to each application

- [B] An Amazon SNS standard topic with an Amazon SQS standard queue subscribed for each application

- [C] An Amazon SQS FIFO queue that uses the player ID as the message group ID

- [D] An Amazon Kinesis data stream that uses the player ID as the partition key and a 7-day retention period

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-lambda-container-image (type: single)

A data team builds all its software as container images with an existing CI pipeline that pushes the images to Amazon ECR. A new component must process each file uploaded to an Amazon S3 bucket. Each run lasts less than 3 minutes, uploads happen only a few times per day at random times, and the image is 3 GB because it includes machine learning libraries. The team wants to keep its container tooling and pay nothing for compute when no file is being processed.

Which solution will meet these requirements?


- [A] Create an AWS Lambda function from the image in Amazon ECR, and invoke it with an S3 event notification.

- [B] Repackage the code and libraries as a Lambda .zip deployment package with layers, and invoke it with an S3 event notification.

- [C] Run the image on an Amazon EKS cluster with a managed node group, and scale the deployment based on S3 events.

- [D] Run the image as an Amazon ECS service on AWS Fargate with a desired count of 1 that polls an Amazon SQS queue of S3 events.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-lambda-provisioned (type: single)

A company runs a customer-facing API on Amazon API Gateway and AWS Lambda. The Node.js functions load large libraries during initialization. During business hours, users report occasional slow responses when Lambda starts new execution environments. The company wants consistently low latency during business hours and accepts an additional charge for it.

Which solution will meet these requirements?


- [A] Configure reserved concurrency on each function with a value equal to the expected peak concurrency during business hours.

- [B] Configure provisioned concurrency on an alias of each function, and raise it during business hours with scheduled Application Auto Scaling actions.

- [C] Increase the timeout of each function to 15 minutes so that slow initializations complete before the request fails.

- [D] Configure API Gateway throttling to limit the number of requests per second that reach the functions during business hours.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-lambda-reserved (type: single)

A company uploads thousands of small files to an Amazon S3 bucket during a nightly batch. An S3 event notification invokes an AWS Lambda function for each new object, and the function writes data to a legacy database that accepts at most 50 concurrent connections. During the batch, the function scales out and the database rejects connections. No event can be lost, other functions in the account must not be affected, and the company does not want to add infrastructure.

Which solution will meet these requirements?


- [A] Configure reserved concurrency of 50 on the function.

- [B] Request an increase of the concurrent executions quota of the account.

- [C] Configure provisioned concurrency of 50 on the function.

- [D] Increase the memory of the function to the maximum so that each invocation finishes faster.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-lambda-timeout-fargate (type: single)

A company runs a nightly data-transformation job written in Python on an always-on Amazon EC2 instance. The job takes about 2 hours to complete and cannot be split into smaller units of work. The company wants to move to a serverless model in which it manages no servers and pays for compute only while the job runs.

Which solution will meet these requirements?


- [A] Deploy the job as an AWS Lambda function, and configure provisioned concurrency so that the function can run for the full duration of the job.

- [B] Package the job as a container image, and run it as an Amazon ECS task on AWS Fargate that an Amazon EventBridge Scheduler schedule starts every night.

- [C] Run the job on an EC2 Spot Instance that an Auto Scaling scheduled action launches every night and terminates in the morning.

- [D] Deploy the job as an AWS Lambda function with the maximum timeout, and invoke it every night with an Amazon EventBridge Scheduler schedule.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-multiaz-vs-rr (type: single)

A company runs a critical Amazon RDS for PostgreSQL DB instance in a single Availability Zone. If that Availability Zone becomes unavailable, the database must fail over automatically to another Availability Zone without losing committed transactions. The application does not need additional read capacity.

Which solution will meet these requirements?


- [A] Modify the DB instance to use a Multi-AZ DB instance deployment with a standby in another Availability Zone.

- [B] Create a read replica in another Availability Zone, and promote it to a standalone DB instance if the primary fails.

- [C] Create a cross-Region read replica, and use Amazon Route 53 failover routing to send traffic to it if the primary fails.

- [D] Set the automated backup retention period to 35 days, and restore the DB instance in another Availability Zone if needed.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-neptune-graph (type: single)

A bank wants to detect fraud rings by analyzing the relationships between customers, accounts, devices, and transactions. Queries must traverse many levels of connections, for example to find accounts that share a device with an account that received a flagged transfer, and must return results in milliseconds.

Which database service is the BEST fit for this workload?


- [A] Amazon Neptune

- [B] Amazon RDS for PostgreSQL

- [C] Amazon DynamoDB

- [D] Amazon Keyspaces (for Apache Cassandra)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-rr-reporting (type: single)

A company runs an Amazon RDS for MySQL DB instance that supports an online store. The business intelligence team runs long reporting queries during business hours, which slows down customer transactions. The reports can use data that is a few seconds behind the production data.

Which solution will improve the performance of the online store with the LEAST operational overhead?


- [A] Move the DB instance to a larger instance class, and keep running the reports against the primary instance.

- [B] Convert the DB instance to a Multi-AZ DB instance deployment, and run the reports against the standby instance.

- [C] Restore the latest automated snapshot to a new DB instance every night, and run the reports against that instance.

- [D] Create a read replica of the DB instance, and point the reporting tool to the endpoint of the read replica.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-s3-event-lambda (type: single)

A real estate company lets agents upload property photos to an Amazon S3 bucket. Each new photo must be resized into three thumbnail sizes within seconds of the upload. The upload volume varies from zero to thousands of photos per hour. The company wants an event-driven solution with no servers to manage.

Which solution will meet these requirements?


- [A] Turn on daily S3 Inventory reports, and process the listed objects with an AWS Batch job every morning.

- [B] Configure an S3 event notification for object-created events that invokes an AWS Lambda function to create the thumbnails.

- [C] Configure an S3 Lifecycle rule that transitions each new object to a thumbnails prefix after it is uploaded.

- [D] Run a cron job on an Amazon EC2 instance every minute that lists new objects in the bucket and resizes them.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-scheduled-scaling-event (type: single)

A ticketing company runs its sales website on Amazon EC2 instances in an Auto Scaling group that uses a target tracking scaling policy. Sales for a major concert will open on a known date at exactly 10:00 AM, and traffic is expected to reach 10 times the normal level within seconds. Such an event has never happened before, and new instances take several minutes to become ready. The required capacity must be in place before sales open.

Which solution will meet these requirements?


- [A] Add a predictive scaling policy that forecasts the capacity of the group from its historical load.

- [B] Create a one-time scheduled action that raises the minimum and desired capacity of the group shortly before 10:00 AM on that date.

- [C] Lower the target value of the target tracking policy so that the group scales out earlier when traffic starts to rise.

- [D] Add a step scaling policy that adds a large number of instances when CPU utilization exceeds 80%.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-scheduler-cron (type: single)

A company runs a script on a dedicated Amazon EC2 instance every night at 01:00 in the Europe/Paris time zone. The script calls several AWS APIs to clean up unused resources and finishes in about 3 minutes. The instance is idle the rest of the day. The company wants to remove the instance and reduce operational overhead, and the run time must follow daylight saving time changes in Paris.

Which solution will meet these requirements?


- [A] Use Auto Scaling scheduled actions to launch an instance from an AMI that runs the script at 01:00 and to terminate it at 01:30.

- [B] Run the script in a container as an Amazon ECS service on AWS Fargate with a desired count of 1 that sleeps until 01:00.

- [C] Convert the script to an AWS Lambda function, and invoke it with an Amazon EventBridge Scheduler cron schedule in the Europe/Paris time zone.

- [D] Store the script in an Amazon S3 bucket, and configure an S3 Lifecycle rule that runs the script every night at 01:00.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-serverless-api (type: single)

A startup is building the backend API of a mobile app. Traffic is very low most of the day, with short unpredictable bursts and long periods without any request. The company wants to pay only for actual usage, manage no servers, and have every layer of the API scale automatically.

Which architecture will meet these requirements?


- [A] An Application Load Balancer, an Auto Scaling group of Amazon EC2 instances, and an Amazon RDS for MySQL DB instance

- [B] An AWS Elastic Beanstalk web server environment with an Amazon RDS for PostgreSQL DB instance

- [C] Amazon API Gateway, AWS Lambda functions, and an Amazon DynamoDB table in on-demand capacity mode

- [D] An Application Load Balancer, an Amazon ECS service on AWS Fargate with two tasks, and an Aurora provisioned cluster

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-serverless-pipeline (type: multi)

A logistics company receives CSV files that partners upload to an Amazon S3 bucket at irregular intervals, from a few files per week to hundreds per hour. Each file must be parsed in less than 1 minute, and each row must be stored so that the tracking application can retrieve it by shipment ID with single-digit millisecond latency. The company wants no servers to manage and no charges for idle capacity.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Store the rows in an Amazon RDS for PostgreSQL DB instance with an index on the shipment ID.

- [B] Run an Auto Scaling group of Amazon EC2 instances that polls the bucket every minute for new files.

- [C] Store the rows in an Amazon DynamoDB table in on-demand capacity mode with the shipment ID as the partition key.

- [D] Load the rows into an Amazon Redshift provisioned cluster that the tracking application queries.

- [E] Configure an S3 event notification that invokes an AWS Lambda function to parse each new file.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-sfn-callback-approval (type: single)

A company automates expense reimbursements with AWS Step Functions. When an expense is above a threshold, a manager must approve or reject it by choosing a link in an email. Managers sometimes take up to 5 days to respond. The workflow must pause without running any compute while it waits, and then continue on the approved or rejected path.

Which solution will meet these requirements?


- [A] Use a Standard workflow with a .waitForTaskToken task that sends the task token in the email, and have the link call SendTaskSuccess or SendTaskFailure.

- [B] Use a Standard workflow that invokes an AWS Lambda function, which polls an Amazon DynamoDB table every minute until the decision is recorded.

- [C] Use a Standard workflow that sends the request to an Amazon SQS delay queue, and read the decision when the message becomes visible.

- [D] Use an Express workflow with a .waitForTaskToken task that sends the task token in the email, and have the link call SendTaskSuccess or SendTaskFailure.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sfn-distributed-map (type: single)

A company stores millions of scanned documents as objects in an Amazon S3 bucket. An AWS Lambda function must extract metadata from each existing document. The company wants to process the objects in parallel with thousands of concurrent invocations, track the result of each item, and stop the job automatically if more than 5% of the items fail, without writing custom orchestration code.

Which solution will meet these requirements?


- [A] Configure an S3 event notification for object-created events that invokes the Lambda function for each document in the bucket.

- [B] Use a Step Functions Standard workflow with a Distributed Map state that reads the objects from the bucket and tolerates at most 5% failed items.

- [C] Use a Step Functions Express workflow with a Distributed Map state that reads the objects from the bucket and tolerates at most 5% failed items.

- [D] Use a Step Functions Standard workflow with an inline Map state that iterates over the object keys passed in the execution input.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sfn-express (type: single)

A ride-sharing company processes vehicle location events at a rate of tens of thousands of events per second. Each event goes through a short workflow that validates it, enriches it, and stores it in Amazon DynamoDB. Each workflow completes in less than 2 seconds, and every step is idempotent. The company wants to orchestrate the steps with AWS Step Functions.

Which solution will meet these requirements MOST cost-effectively?


- [A] Use an Express workflow for each event, and send the execution logs to Amazon CloudWatch Logs.

- [B] Use a Standard workflow with a Distributed Map state that starts a child workflow execution for each event.

- [C] Use a Standard workflow in which each step waits for a callback task token before it continues.

- [D] Use a Standard workflow for each event, and retrieve the execution history through the Step Functions API.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sfn-standard-orchestration (type: single)

An insurance company processes claims through five AWS Lambda functions that run in sequence. Each function calls the next one directly, and the error handling and retry logic is duplicated in every function. The company wants a visual workflow with built-in retries, branching based on the claim type, and an execution history for audits. Some claims take up to 2 days to complete.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Chain the functions through Amazon SQS queues, and keep the retry and branching code in each function.

- [B] Create an AWS Step Functions Standard workflow that invokes the functions and uses Retry, Catch, and Choice states.

- [C] Publish an Amazon SNS message at the end of each function to invoke the next function in the sequence.

- [D] Run a scheduler on an Amazon EC2 instance that invokes each function and records the results in Amazon DynamoDB.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sns-sqs-fanout (type: single)

An e-commerce company runs an order service that must notify three independent backend applications (billing, shipping, and analytics) each time an order is placed. Each application must receive its own copy of every order message and must be able to process the messages at its own pace, even if the application is temporarily offline.

Which solution will meet these requirements?


- [A] Publish each order message to an Amazon SNS topic, and subscribe a separate Amazon SQS queue for each application to the topic.

- [B] Send each order message to a single Amazon SQS standard queue that all three applications poll.

- [C] Publish each order message to an Amazon SNS topic that has an HTTPS subscription for the endpoint of each application.

- [D] Send each order message to an Amazon SQS FIFO queue, and use a different message group ID for each application.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sqs-backlog-scaling (type: single)

A company processes messages from an Amazon SQS queue with Amazon EC2 instances in an Auto Scaling group. Each instance processes about 10 messages per second, and a message must not wait more than 60 seconds in the queue. The current scaling policy tracks the number of visible messages in the queue, and it often launches far more instances than needed while the queue is draining. The company wants the group to scale in proportion to the work per instance.

Which solution will meet these requirements?


- [A] Use a target tracking scaling policy on the ApproximateNumberOfMessagesVisible metric with a target value of 600.

- [B] Use a step scaling policy on the ApproximateAgeOfOldestMessage metric with alarms at 30 and 60 seconds.

- [C] Use a target tracking scaling policy on the ASGAverageCPUUtilization metric with a target value of 70.

- [D] Use a target tracking scaling policy on a backlog-per-instance metric (messages divided by InService instances) with a target value of 600.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sqs-buffer-tiers (type: single)

A company's web tier sends image-processing requests directly to a processing tier over HTTP. During traffic spikes, the processing tier becomes overloaded and requests are lost. The requests do not need to be processed immediately, but none of them can be lost. The company wants to decouple the two tiers.

Which solution will meet these requirements?


- [A] Have the web tier publish each request to an Amazon SNS topic with an HTTP subscription to the processing tier.

- [B] Place a Network Load Balancer in front of the processing tier, and send the requests to the load balancer.

- [C] Move the processing tier to a larger instance type so that it can handle the traffic spikes.

- [D] Have the web tier send each request to an Amazon SQS queue, and have the processing tier poll the queue.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sqs-fifo-order (type: single)

A financial services company processes account transactions that a web application submits to a message queue. Transactions for the same account must be processed in the exact order in which they were submitted. A transaction must not be processed twice when the web application retries a send request after a network error. Transactions for different accounts must be processed in parallel.

Which solution will meet these requirements?


- [A] Use an Amazon SQS FIFO queue, set the message group ID to the account ID, and send a message deduplication ID with each transaction.

- [B] Use an Amazon SNS standard topic with a subscribed Amazon SQS standard queue, and apply a subscription filter policy on the account ID.

- [C] Use an Amazon SQS standard queue with long polling enabled, and process all transactions with a single consumer instance.

- [D] Use an Amazon SQS standard queue, and set the visibility timeout to a value longer than the maximum processing time of a transaction.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-sqs-longpoll-dlq (type: multi)

A company runs consumers on Amazon EC2 instances that poll an Amazon SQS standard queue with the default settings. The queue is often empty, and the company pays for a large number of ReceiveMessage requests that return no messages. Some malformed messages fail processing every time and are retried until they expire after 4 days. The company wants to reduce the number of empty responses and to move a message aside for analysis after five failed processing attempts.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a second queue, and configure a redrive policy on the source queue that uses it as a dead-letter queue with maxReceiveCount set to 5.

- [B] Set the ReceiveMessageWaitTimeSeconds attribute of the queue to 20 seconds.

- [C] Increase the message retention period of the queue to 14 days.

- [D] Set the DelaySeconds attribute of the queue to 15 minutes.

- [E] Reduce the visibility timeout of the queue to 0 seconds.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-sqs-visibility-timeout (type: single)

A company uses an Amazon SQS standard queue to distribute video transcoding requests to a fleet of Amazon EC2 worker instances. Each request takes between 2 and 4 minutes to process, and a worker deletes the message when processing completes. The queue uses the default settings. The operations team notices that many videos are processed two or three times by different workers, although no worker fails.

Which solution will resolve this issue with the LEAST operational overhead?


- [A] Enable long polling by setting the ReceiveMessageWaitTimeSeconds attribute of the queue to 20 seconds.

- [B] Replace the queue with an Amazon SQS FIFO queue that uses content-based deduplication.

- [C] Increase the visibility timeout of the queue to a value longer than the maximum processing time, such as 5 minutes.

- [D] Configure a dead-letter queue for the queue with a redrive policy that sets maxReceiveCount to 1.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-stateless-sessions (type: multi)

A company runs a web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. The application keeps user session data in memory on each instance. When the group scales in or replaces an unhealthy instance, the users on that instance are logged out. The company wants the group to scale freely without any impact on user sessions.

Which solutions will meet these requirements? (Choose two.) Each correct answer presents a complete solution.


Choose 2.

- [A] Enable sticky sessions on the target group of the Application Load Balancer.

- [B] Store the session data on the Amazon EBS root volume of each instance.

- [C] Store the session data in an Amazon DynamoDB table that all instances use.

- [D] Enable scale-in protection on all instances in the Auto Scaling group.

- [E] Store the session data in an Amazon ElastiCache for Valkey cache that all instances use.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-storage-types-combo (type: multi)

A media company is rebuilding its photo-sharing application on AWS. Users upload photos that must be stored durably and served to browsers over HTTPS at very large scale. The application servers run on Linux Amazon EC2 instances in an Auto Scaling group across two Availability Zones and need a shared POSIX-compliant directory for working files that all instances read and write.

Which combination of storage services will meet these requirements with the LEAST operational overhead? (Choose two.)


Choose 2.

- [A] Use an Amazon EFS file system for the shared working directory.

- [B] Use the instance store volumes of the application servers for the shared working directory.

- [C] Store the uploaded photos on Amazon EBS gp3 volumes attached to the application servers.

- [D] Use an Amazon EBS io2 volume with Multi-Attach enabled for the shared working directory.

- [E] Store the uploaded photos in an Amazon S3 bucket.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2b-target-tracking-cpu (type: single)

A company runs a web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. Traffic varies throughout the day with no predictable pattern. The company wants the group to add and remove instances automatically to keep the average CPU utilization near 50%, without creating or tuning CloudWatch alarms and step adjustments itself.

Which solution will meet these requirements?


- [A] Create a simple scaling policy that adds one instance when a CloudWatch alarm detects CPU utilization above 50%.

- [B] Create scheduled actions that set the desired capacity of the group every hour based on last week's traffic.

- [C] Create a target tracking scaling policy that uses the ASGAverageCPUUtilization metric with a target value of 50.

- [D] Create a step scaling policy with CloudWatch alarms at 40%, 50%, and 60% CPU utilization and matching step adjustments.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2b-three-tier-ha (type: single)

A company is deploying a multi-tier web application in one AWS Region. Users must reach the application from the internet only through a load balancer. The application servers and the relational database must not be directly reachable from the internet. Every tier must remain available if one Availability Zone fails.

Which architecture will meet these requirements?


- [A] An internet-facing Application Load Balancer in public subnets and an Auto Scaling group in private subnets in two Availability Zones, and an Amazon RDS DB instance with a read replica in the same Availability Zone.

- [B] An internet-facing Application Load Balancer in public subnets, an Auto Scaling group of instances with public IP addresses in public subnets, and an Amazon RDS Multi-AZ DB instance in private subnets, all in two Availability Zones.

- [C] An internet-facing Application Load Balancer in public subnets, an Auto Scaling group in private subnets, and an Amazon RDS Multi-AZ DB instance in private subnets, all in two Availability Zones.

- [D] An internet-facing Application Load Balancer in public subnets and an Auto Scaling group in private subnets in two Availability Zones, and a Single-AZ Amazon RDS DB instance in a private subnet.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-active-active-global-tables (type: single)

A payments company runs its API in us-east-1 and eu-west-1. Users must read and write data in their nearest Region with low latency. If either Region becomes unavailable, the other Region must continue to accept writes with an RTO near zero, without any manual database promotion or failover operation.

Which solution will meet these requirements?


- [A] Use a DynamoDB table in us-east-1 and copy its on-demand backups to eu-west-1 every hour for restoration after a failure.

- [B] Use an Aurora global database with the primary cluster in us-east-1 and a secondary cluster in eu-west-1, and use Route 53 failover routing.

- [C] Use a DynamoDB global table with replicas in both Regions, and use Route 53 latency routing with health checks to the Regional APIs.

- [D] Use RDS for MySQL in us-east-1 with a cross-Region read replica in eu-west-1, and promote the replica if us-east-1 fails.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-alb-path-oidc-auth (type: multi)

A company runs two microservices on Amazon ECS behind one internet-facing Application Load Balancer that has an HTTPS listener. Requests to /orders/* must go to the orders service, and requests to /catalog/* must go to the catalog service. Employees must sign in through the company's OpenID Connect (OIDC) compliant identity provider before any request reaches the services. The company does not want to add authentication code to the services.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Add an authenticate-oidc action before the forward action in the HTTPS listener rules.

- [B] Place a Gateway Load Balancer in front of the Application Load Balancer to authenticate the requests.

- [C] Create listener rules with source-ip conditions that allow only the IP address range of the identity provider.

- [D] Replace the Application Load Balancer with a Network Load Balancer that has one TLS listener for each service.

- [E] Create listener rules with path-pattern conditions that forward /orders/* and /catalog/* to two separate target groups.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-alb-weighted-blue-green (type: single)

A company runs version 1 of an application on Amazon EC2 instances registered in a target group behind an Application Load Balancer. The company deploys version 2 on a separate, new set of instances and must not modify the version 1 instances during the test. The company wants to send 10 % of requests to version 2 first and then all requests. If errors appear, all traffic must return to version 1 within seconds for every client, without waiting for DNS caches to expire.

Which solution will meet these requirements?


- [A] Register version 2 in a second target group and use a listener rule forward action with weights of 90 and 10 for the two target groups.

- [B] Put version 2 behind a second load balancer and use Route 53 weighted records with weights of 90 and 10 for the two load balancers.

- [C] Update the launch template with the version 2 AMI and start an instance refresh with a minimum healthy percentage of 90 %.

- [D] Deploy version 2 to a second Elastic Beanstalk environment and swap the environment URLs when the test succeeds.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-api-gateway-usage-plans (type: single)

A software company exposes a REST API in Amazon API Gateway to partner companies. One partner's batch job sends bursts of requests that consume most of the account's throughput in the Region, and the other partners receive 429 Too Many Requests errors. The company wants to limit each partner to an agreed request rate and burst and to track each partner's usage, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an API key for each partner and a usage plan with throttling and quota settings, and associate it with the API stage.

- [B] Ask AWS Support to lower the account-level throttling limit for API Gateway in the Region.

- [C] Place an Amazon SQS queue in front of the API to buffer the requests from all partners.

- [D] Configure stage-level throttling for the API stage with the rate and burst agreed with the partners.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-asg-multi-az-elb-health (type: multi)

A company runs a web application on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. All the instances run in one Availability Zone. Sometimes the application process stops responding while the EC2 status checks still pass, and the instance stays in service until an engineer replaces it. The company wants the application to survive the loss of an Availability Zone and wants unhealthy instances to be replaced automatically.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Turn on cross-zone load balancing for the load balancer.

- [B] Turn on Elastic Load Balancing health checks for the Auto Scaling group.

- [C] Configure the Auto Scaling group to use subnets in at least two Availability Zones, and enable the same zones on the load balancer.

- [D] Increase the health check grace period of the Auto Scaling group to 30 minutes.

- [E] Create CloudWatch alarms that use the EC2 automatic recovery action on each instance.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-aurora-global-switchover (type: single)

A company uses an Amazon Aurora global database with the primary cluster in us-east-1 and a secondary cluster in eu-west-1. The applications connect through the global database writer endpoint. For a compliance exercise, the company must move the primary role to eu-west-1 for one week. The operation must lose no data, must keep us-east-1 in the global database as a secondary, and must not require changes to the application connection settings.

Which solution will meet these requirements?


- [A] Create a new Aurora cluster in eu-west-1 from a snapshot and point the applications to its cluster endpoint.

- [B] Detach the eu-west-1 cluster from the global database and promote it to a standalone cluster.

- [C] Perform a global database failover to the eu-west-1 cluster with the option that allows data loss.

- [D] Perform a global database switchover to the eu-west-1 cluster.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-az-id-cross-account (type: single)

A company has two AWS accounts. A latency-sensitive application in account B must run in the same physical Availability Zone as a database that runs in us-east-1a in account A. The account B team launched the application instances in us-east-1a in account B, but measurements show cross-zone latency between the application and the database.

Which solution will meet these requirements?


- [A] Create a VPC peering connection between the two accounts so that traffic between the instances stays inside one zone.

- [B] Relaunch the instances in us-east-1a with a cluster placement group, because zone names refer to the same location in every account.

- [C] Deploy the instances in a Local Zone of us-east-1 that is closer to the database.

- [D] Find the AZ ID of the database's zone in account A, and launch the instances in the zone that has the same AZ ID in account B.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-backup-restore-cross-region (type: single)

A company runs an internal reporting application on Amazon EC2 instances with Amazon EBS volumes and an Amazon RDS for MySQL DB instance. The application is not business critical. If the primary Region becomes unavailable, the application must be recovered in another Region with an RPO of 24 hours and an RTO of 24 hours. The infrastructure is already defined in AWS CloudFormation templates.

Which solution will meet these requirements MOST cost-effectively?


- [A] Create an AWS Backup daily backup plan with a copy rule to a backup vault in the recovery Region, and restore and redeploy with CloudFormation after a disaster.

- [B] Run a scaled-down copy of the application in an Auto Scaling group in the recovery Region and replicate the database continuously.

- [C] Convert the DB instance to Multi-AZ and run the EC2 instances in an Auto Scaling group across two Availability Zones.

- [D] Create a cross-Region read replica of the database and keep stopped copies of the EC2 instances in the recovery Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-beanstalk-immutable-policy (type: single)

A company deploys a web application with AWS Elastic Beanstalk. During a recent rolling deployment, a failed batch left the environment running a mix of old and new application versions. For future deployments, the company wants a full set of new instances to be launched in a separate Auto Scaling group. If the new instances fail health checks, they must be terminated and the original instances must remain untouched.

Which deployment policy should the company use?


- [A] Rolling with additional batch

- [B] All at once

- [C] Rolling

- [D] Immutable

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-comprehend-review-sentiment (type: single)

A retail company collects thousands of written product reviews each day in an Amazon S3 bucket. The marketing team wants each review to be classified automatically as positive, negative, neutral, or mixed. The company does not want to build or train machine learning models.

Which solution will meet these requirements?


- [A] Use Amazon Translate to analyze each review and return the sentiment of the text.

- [B] Use Amazon Comprehend to analyze each review and return the sentiment of the text.

- [C] Use Amazon Rekognition to analyze each review and return the sentiment of the text.

- [D] Use Amazon Polly to analyze each review and return the sentiment of the text.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-dr-region-ec2-quota (type: single)

A company runs an application on Amazon EC2 On-Demand Instances that use 400 vCPUs in us-east-1. The company uses a pilot light disaster recovery strategy in us-west-2, where the account runs only a small database replica. During a recovery test, the Auto Scaling group in us-west-2 failed to launch most of its instances because the account exceeded its vCPU limit. The company must ensure that a failover can scale to full production capacity.

Which solution will meet these requirements?


- [A] Request an increase of the On-Demand Instances vCPU quota in us-west-2 to cover full production capacity plus a buffer, and check quotas in each recovery test.

- [B] Purchase a Compute Savings Plan that covers 400 vCPUs so that the capacity is available in any Region.

- [C] Request an increase of the On-Demand Instances vCPU quota in us-east-1 so that it covers both Regions.

- [D] Change the launch template in us-west-2 to use larger instance types so that fewer instances are needed.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-dynamodb-elasticache-pair (type: multi)

A gaming company is building a new backend. The player profile store must handle millions of requests per second at peak with consistent single-digit millisecond latency, and the company does not want to manage servers. A separate reporting service runs the same expensive read queries against an Amazon RDS for MySQL DB instance many times each minute. The company wants to keep the results of these queries in memory so that repeated requests do not reach the database.

Which combination of solutions will meet these requirements? (Choose two.)


Choose 2.

- [A] Store the player profiles in an Amazon Redshift Serverless workgroup.

- [B] Add an Amazon ElastiCache cache in front of the RDS for MySQL DB instance and cache the reporting query results.

- [C] Store the player profiles in an Amazon Neptune DB cluster.

- [D] Store the player profiles in an Amazon DynamoDB table that uses on-demand capacity mode.

- [E] Create an RDS read replica and point the reporting service to the replica endpoint.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-ebs-snapshots-az-loss (type: single)

A company runs a legacy single-instance application on an Amazon EC2 instance in one Availability Zone. All the application data is on one gp3 Amazon EBS volume. The company wants to be able to recover the data in another Availability Zone of the same Region if the first zone is lost, with an RPO of 1 hour. The solution must be the lowest cost.

Which solution will meet these requirements?


- [A] Change the volume to io2 and enable Multi-Attach to attach it to a standby instance in a second Availability Zone.

- [B] Attach a second gp3 volume to the instance and mirror the two volumes with RAID 1 in the operating system.

- [C] Change the volume type to io2 to increase its durability and keep the volume in the same Availability Zone.

- [D] Create hourly EBS snapshots with Amazon Data Lifecycle Manager, and restore a volume from the latest snapshot in another zone if needed.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-ecr-immutable-lambda-versions (type: multi)

A company deploys container images from Amazon ECR to Amazon ECS and also runs AWS Lambda functions. In a recent incident, a team pushed a new image with the tag v1.4.2, which production was already using, and the tag silently pointed to different code. In another incident, an event source invoked a function through its unqualified ARN, and a developer had edited the function code directly. The company wants every deployed artifact reference to always point to the same code.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Turn on image scanning on push for the ECR repository.

- [B] Configure reserved concurrency on each Lambda function.

- [C] Add an ECR lifecycle policy that expires untagged images after one day.

- [D] Publish a Lambda version for each release and invoke the function through an alias that points to that version.

- [E] Set the tag mutability of the ECR repository to IMMUTABLE.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-egress-only-ipv6 (type: single)

A company has a dual-stack VPC. Amazon EC2 instances in a private subnet use their IPv6 addresses to call a partner's API on the internet over IPv6. The company must ensure at the routing level, even if a security group is misconfigured, that no host on the internet can initiate an IPv6 connection to these instances. The company wants to avoid hourly gateway charges.

Which solution will meet these requirements?


- [A] Create a NAT gateway in a public subnet and add a ::/0 route that targets it to the private subnet's route table.

- [B] Create an egress-only internet gateway and add a ::/0 route that targets it to the private subnet's route table.

- [C] Create a gateway VPC endpoint for the partner's API and add its prefix list route to the private subnet's route table.

- [D] Add a ::/0 route that targets the internet gateway to the private subnet's route table and rely on security groups to block inbound traffic.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-gwlb-firewall-appliances (type: single)

A company must inspect all traffic that enters and leaves its application VPCs with a fleet of third-party virtual firewall appliances. The appliances run in a central security VPC. The fleet must scale horizontally, traffic must bypass unhealthy appliances automatically, and each traffic flow must stay on the same appliance.

Which solution will meet these requirements?


- [A] Use Route 53 Resolver DNS Firewall rules in each application VPC and forward the matching queries to the appliances.

- [B] Deploy a Gateway Load Balancer in the security VPC with the appliances as targets, and use Gateway Load Balancer endpoints as the next hop in the application VPC route tables.

- [C] Deploy a Network Load Balancer in the security VPC with the appliances as targets, and peer each application VPC with the security VPC.

- [D] Deploy an Application Load Balancer in the security VPC with the appliances as targets, and create a listener rule for each port to inspect.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-idempotent-sqs-consumer (type: single)

An order service sends payment requests to an Amazon SQS standard queue. An AWS Lambda function consumes the messages and charges the customers' cards. Auditors found rare duplicate charges that occurred when the same message was processed twice. The company wants to keep the standard queue and must ensure that a payment is never charged twice.

Which solution will meet these requirements?


- [A] Increase the visibility timeout of the queue to 12 hours so that a message cannot be received twice.

- [B] Enable long polling on the queue by setting the receive message wait time to 20 seconds.

- [C] Make the consumer idempotent by recording each payment ID in DynamoDB with a conditional write and skipping IDs that already exist.

- [D] Configure a dead-letter queue with a maximum receive count of 1 for the payment queue.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-image-builder-instance-refresh (type: single)

A company runs a web fleet on Amazon EC2 instances in an Auto Scaling group. Each month, engineers connect to the running instances to install operating system patches, and the instances have drifted apart in configuration. The company wants to adopt immutable infrastructure: every change must be delivered as a new tested image, and running instances must never be modified.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Patch one instance by hand each month, create an AMI from it, and terminate the other instances one at a time.

- [B] Use AWS Systems Manager Run Command to run the patch script on all running instances at the same time.

- [C] Use AWS Systems Manager Patch Manager with a maintenance window to patch the running instances each month.

- [D] Use a scheduled EC2 Image Builder pipeline to build and test a patched AMI, update the launch template, and start an instance refresh.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-keyspaces-cassandra-migration (type: single)

A logistics company runs a self-managed Apache Cassandra cluster on Amazon EC2 instances to store package-tracking events. The operations team spends many hours patching nodes and adding capacity before peak seasons. The application uses Cassandra Query Language (CQL) through Cassandra drivers, and the company does not want to rewrite its data access code. The company wants a serverless database that scales automatically with traffic.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Migrate the tables to Amazon Keyspaces (for Apache Cassandra) and keep the existing CQL application code.

- [B] Migrate the data to Amazon DynamoDB and rewrite the data access layer to use the DynamoDB API.

- [C] Keep Cassandra on EC2 and run the nodes in an Auto Scaling group that uses larger instance types.

- [D] Migrate the data to Amazon DocumentDB (with MongoDB compatibility) and convert the queries to MongoDB syntax.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-lambda-reserved-concurrency (type: single)

A company has two AWS Lambda functions in the same account and Region. One is a customer-facing checkout function. The other is a nightly batch function that processes files uploaded to Amazon S3. When the batch runs, it scales up and uses most of the account's concurrency, and the checkout invocations are throttled. The checkout function must always have capacity for 300 concurrent executions, and the batch function must be capped so that it cannot starve other functions. The solution must not add cost.

Which solution will meet these requirements?


- [A] Configure provisioned concurrency of 300 on the checkout function and leave the batch function unchanged.

- [B] Increase the memory of the batch function so that each invocation finishes faster and uses less concurrency.

- [C] Request an increase of the account's concurrent executions quota and leave both functions without reserved concurrency.

- [D] Configure reserved concurrency of 300 on the checkout function and a lower reserved concurrency on the batch function.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-nat-gateway-private-route (type: multi)

A company has a VPC with an internet gateway, a public subnet, and a private subnet in one Availability Zone. Amazon EC2 instances in the private subnet have no public IP addresses and must download software updates from the internet over IPv4. Hosts on the internet must not be able to initiate connections to these instances. The company has decided to use one zonal public NAT gateway.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create the NAT gateway in the private subnet and associate an Elastic IP address with it.

- [B] Add a 0.0.0.0/0 route that targets the internet gateway to the private subnet's route table.

- [C] Add a 0.0.0.0/0 route that targets the NAT gateway to the public subnet's route table.

- [D] Create the NAT gateway in the public subnet and associate an Elastic IP address with it.

- [E] Add a 0.0.0.0/0 route that targets the NAT gateway to the private subnet's route table.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-neptune-fraud-graph (type: single)

A financial services company wants to detect fraud rings by analyzing the relationships between customer accounts, devices, payment cards, and IP addresses. Investigators run queries that follow several levels of connections, such as finding every account that shares a device with an account that was flagged. The company wants a fully managed database that is purpose-built for this type of query.

Which solution will meet these requirements?


- [A] Store the data in Amazon Neptune and query the relationships with Gremlin or openCypher.

- [B] Store the data in Amazon Redshift and run analytical SQL queries to follow the connections.

- [C] Store the data in Amazon DynamoDB tables and run Scan operations to follow the connections between items.

- [D] Store the data in Amazon RDS for PostgreSQL and use recursive SQL joins to follow the connections.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-nlb-cross-zone-uneven (type: single)

A company uses a Network Load Balancer with a TCP listener in two Availability Zones for an application that uses a custom TCP protocol. Because of capacity constraints, the target group has 2 instances in the first zone and 8 instances in the second zone. Clients connect to the IP addresses of both load balancer nodes about equally. The 2 instances in the first zone are overloaded while the other instances are underused. The company wants the load spread evenly across all 10 instances without changing the number of instances in each zone.

Which solution will meet these requirements?


- [A] Replace the Network Load Balancer with an Application Load Balancer that has an HTTPS listener.

- [B] Configure the least outstanding requests routing algorithm on the target group.

- [C] Turn on sticky sessions for the target group so that clients stay on the same instance.

- [D] Turn on cross-zone load balancing for the Network Load Balancer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-nlb-udp-static-ips (type: single)

A gaming company runs multiplayer game servers that use a custom UDP protocol on Amazon EC2 instances in two Availability Zones. The firewalls of business customers allow only a fixed set of IP addresses, so the game endpoint must have one static IP address in each Availability Zone. The load balancer must distribute the UDP traffic to healthy instances only.

Which solution will meet these requirements?


- [A] Create a Gateway Load Balancer, and register the EC2 instances in a GENEVE target group.

- [B] Create an Application Load Balancer with an HTTP listener, and associate an Elastic IP address with each of its subnets.

- [C] Create a Network Load Balancer with a UDP listener, and associate an Elastic IP address with each of its subnets.

- [D] Create an Amazon CloudFront distribution that uses the EC2 instances as custom origins.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-opensearch-product-search (type: single)

An online retailer stores 20 million product descriptions in an Amazon Aurora PostgreSQL DB cluster. Customers complain that the site search is slow and returns poor results because it runs SQL `LIKE` queries. The company needs full-text search with relevance ranking and tolerance for typing errors. The search tier must be a managed service that can run across multiple Availability Zones.

Which solution will meet these requirements?


- [A] Cache the search results in Amazon ElastiCache with a 24-hour time to live for each entry.

- [B] Export the catalog to Amazon S3 every hour and run the search queries with Amazon Athena.

- [C] Index the catalog in an Amazon OpenSearch Service domain that uses Multi-AZ and send search requests to it.

- [D] Add Aurora Replicas to the cluster and send the `LIKE` search queries to the reader endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-polly-lesson-audio (type: single)

An e-learning company publishes text-based lessons as files in an Amazon S3 bucket. The company wants to offer an audio version of each lesson in natural-sounding voices. Each audio file must be generated automatically when a lesson is published and stored for later playback, without voice actors.

Which solution will meet these requirements?


- [A] Invoke an AWS Lambda function on each upload that calls Amazon Comprehend to produce audio and saves the audio file in Amazon S3.

- [B] Invoke an AWS Lambda function on each upload that calls Amazon Lex to produce audio and saves the audio file in Amazon S3.

- [C] Invoke an AWS Lambda function on each upload that calls Amazon Polly to synthesize speech and saves the audio file in Amazon S3.

- [D] Invoke an AWS Lambda function on each upload that calls Amazon Transcribe to produce audio and saves the audio file in Amazon S3.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-public-subnet-igw-route (type: single)

A company launched Amazon EC2 web servers that have public IPv4 addresses in a new subnet of a VPC. An internet gateway is attached to the VPC. Users cannot reach the web servers from the internet. The security groups and network ACLs allow inbound HTTPS. The subnet's route table contains only the local route.

Which solution will meet these requirements?


- [A] Create an egress-only internet gateway and add a ::/0 route that targets it to the subnet's route table.

- [B] Create a NAT gateway in the subnet and add a 0.0.0.0/0 route that targets the NAT gateway to the subnet's route table.

- [C] Add a route for the VPC CIDR block that targets the internet gateway to the subnet's route table.

- [D] Add a 0.0.0.0/0 route that targets the internet gateway to the subnet's route table.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-quota-template-alarm (type: multi)

A company uses AWS Organizations with all features enabled and creates a new member account in a commercial Region for each new project. Every project needs a higher AWS Lambda concurrent executions quota than the default value. The increase must be requested automatically when each new account is created. The operations team must also be notified when an account's usage reaches 80 % of the quota.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Create a CloudWatch alarm from the Service Quotas console on the quota's usage with an 80 % threshold that notifies an SNS topic.

- [B] Attach a service control policy to the organizational unit that raises the Lambda concurrency quota of its accounts.

- [C] Create an AWS Budgets alert that triggers at 80 % of the forecasted Lambda spend in each account.

- [D] Create an AWS Config rule that marks accounts with the default quota value as noncompliant.

- [E] Add the increased quota value to a Service Quotas quota request template and enable template association with the organization.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-rds-proxy-failover (type: single)

An application on Amazon EC2 instances connects to an Amazon RDS for PostgreSQL Multi-AZ DB instance. During failover tests, the application shows errors for longer than expected, because the clients keep cached DNS entries that point to the old primary and must re-establish all their connections. The company wants the application to be more resilient to database failover and to preserve client connections where possible. The only change allowed in the application is the database endpoint.

Which solution will meet these requirements?


- [A] Create a read replica and change the application to connect to the replica endpoint.

- [B] Create an RDS Proxy for the DB instance and change the application to connect to the proxy endpoint.

- [C] Create a Route 53 private hosted zone CNAME record with a 5-second TTL that points to the DB instance endpoint.

- [D] Create a Network Load Balancer that targets the IP address of the DB instance and connect through the load balancer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-rds-proxy-iam-auth (type: single)

An application on Amazon EC2 instances uses an Amazon Aurora MySQL DB cluster. A new security policy states that the application must not store any database password in its code or configuration, and that it must authenticate to the database tier with the IAM credentials of the instance role. The application also opens many short-lived connections, so the company needs connection pooling in front of the cluster.

Which solution will meet these requirements?


- [A] Create an RDS Proxy that requires IAM authentication for client connections and uses a Secrets Manager secret to connect to the cluster.

- [B] Store the database password as a SecureString parameter in Parameter Store and have the application read it at startup.

- [C] Store the database password in the EC2 user data and pass it to the application as an environment variable.

- [D] Enable IAM database authentication on the cluster and have the application connect directly to the cluster endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-rds-proxy-lambda-connections (type: single)

A company's serverless API uses AWS Lambda functions that connect to an Amazon RDS for MySQL DB instance. During traffic spikes, thousands of concurrent invocations open new database connections, and the DB instance reaches its maximum number of connections and rejects requests. The API must keep serving every request during spikes, and the company does not want to scale up the DB instance.

Which solution will meet these requirements?


- [A] Set the reserved concurrency of the Lambda functions to 10 to limit the number of connections.

- [B] Create an RDS Proxy for the DB instance and change the Lambda connection settings to use the proxy endpoint.

- [C] Add an RDS read replica and point all the Lambda functions to the replica endpoint.

- [D] Raise the max_connections parameter in a custom DB parameter group to the highest allowed value.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-rds-proxy-reader-endpoint (type: single)

A company uses an Amazon Aurora PostgreSQL DB cluster with one writer and three Aurora Replicas. A Lambda-based application connects through an RDS Proxy. All reporting queries currently use the proxy's default endpoint, so they run on the writer and slow down transactions. The company wants the read-only reporting queries to be spread across the replicas while keeping connection pooling. When a replica becomes unavailable, connections must move to another replica without DNS caching delays.

Which solution will meet these requirements?


- [A] Create a read-only endpoint on the existing proxy and send the reporting queries to that endpoint.

- [B] Modify the proxy's default endpoint so that it becomes a read-only endpoint for the reporting queries.

- [C] Point the reporting functions directly to the Aurora cluster reader endpoint instead of the proxy.

- [D] Increase the proxy's maximum connections percentage to 100 so that the writer accepts more reporting connections.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-retry-backoff-jitter (type: single)

A fleet of worker processes calls an AWS service API. During peak periods, the API returns throttling errors. Every worker retries immediately, and the retries arrive at the same moments, which causes even more throttling. The company wants the workers to recover from these transient errors without overloading the service.

Which solution will meet these requirements?


- [A] Retry failed calls with exponential backoff and jitter, up to a maximum number of attempts.

- [B] Retry failed calls after a fixed 1-second delay on every worker, with no limit on attempts.

- [C] Retry failed calls in a loop with no delay until each call succeeds.

- [D] Disable retries and raise the client timeout to 5 minutes so that each call waits longer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-route-longest-prefix (type: single)

A subnet in a VPC is associated with the following route table.

| Destination | Target |
| --- | --- |
| 10.0.0.0/16 | local |
| 10.20.0.0/16 | pcx-0a1b2c3d (VPC peering connection) |
| 10.20.8.0/24 | tgw-0e4f5a6b (transit gateway) |
| 0.0.0.0/0 | nat-0c7d8e9f (NAT gateway) |

An instance in the subnet sends traffic to 10.20.8.25 and to 10.20.3.7.

How is this traffic routed?


- [A] Traffic to both addresses goes to the VPC peering connection, because its route covers both addresses.

- [B] Traffic to 10.20.8.25 goes to the transit gateway, and traffic to 10.20.3.7 goes to the VPC peering connection.

- [C] Traffic to 10.20.8.25 goes to the VPC peering connection, and traffic to 10.20.3.7 goes to the NAT gateway.

- [D] Traffic to both addresses goes to the transit gateway, because transit gateway routes take priority over peering routes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-route53-failover-routing (type: single)

A company runs a web application behind an Application Load Balancer in us-east-1. It also hosts a static maintenance website in an Amazon S3 bucket in us-west-2. The company wants an active-passive configuration: users must reach the application while it is healthy, and Route 53 must automatically send them to the maintenance website when the application becomes unhealthy.

Which solution will meet these requirements?


- [A] Create weighted alias records with weights of 100 and 0 for the load balancer and the website, without health checks.

- [B] Create a simple routing record that contains the addresses of both the load balancer and the website.

- [C] Create a primary failover alias record for the load balancer with Evaluate Target Health set to Yes, and a secondary record for the website.

- [D] Create latency alias records for the load balancer and the website, and enable Evaluate Target Health on both records.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-route53-geolocation-rights (type: single)

A video streaming company has distribution rights for its catalog only in Europe and North America. It runs one application stack in eu-west-1 and another in us-east-1. Users in Europe must always be served by eu-west-1, and users in North America must always be served by us-east-1. Users from any other location, including queries whose location cannot be identified, must receive a static page that explains that the service is not available. The company uses Amazon Route 53.

Which solution will meet these requirements?


- [A] Create latency records that point to the two stacks, and a third latency record that points to the static page.

- [B] Create geoproximity records for the two stacks and the static page, and set a positive bias on the two stacks.

- [C] Create weighted records that send 50 % of queries to each stack, and associate a health check with each record.

- [D] Create geolocation records for Europe and North America that point to the two stacks, and a default geolocation record that points to the static page.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-route53-latency-routing (type: single)

A media company runs identical copies of its web application behind Application Load Balancers in the us-east-1, eu-west-1, and ap-southeast-1 Regions. Users around the world must be sent to the Region that gives them the fastest response. The company uses Amazon Route 53 for DNS.

Which solution will meet these requirements?


- [A] Create failover alias records with us-east-1 as primary and the two other Regions as secondary.

- [B] Create weighted alias records with equal weights that point to the three load balancers.

- [C] Create latency alias records, one for each Region, that point to the three load balancers.

- [D] Create a multivalue answer record that returns the addresses of the three load balancers.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-route53-private-alarm-check (type: single)

A company uses a Route 53 private hosted zone with failover routing for an internal API. The primary record points to an Amazon EC2 instance in one VPC, and the secondary record points to an instance in another VPC. The instances have only private IP addresses, and security policy forbids public IP addresses on them. Route 53 must fail over when the primary instance fails its EC2 status checks.

Which solution will meet these requirements?


- [A] Leave the primary record without a health check, because Route 53 detects failed instances in private hosted zones automatically.

- [B] Create a Route 53 endpoint health check that monitors the private IP address of the primary instance, and associate it with the primary record.

- [C] Associate an Elastic IP address with the primary instance, and create an endpoint health check that monitors that address.

- [D] Create a CloudWatch alarm on the instance's StatusCheckFailed metric and a Route 53 health check that monitors the alarm, and associate it with the primary record.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-rpo-rto-definitions (type: single)

A company's business continuity plan states that, after a disruption, its order application must be available again within 2 hours. The plan also states that no more than 15 minutes of order data can be lost. A solutions architect must translate these statements into recovery objectives for the disaster recovery design.

Which statement correctly describes the objectives and their consequence?


- [A] The RTO is 2 hours and the RPO is 15 minutes, so the recovery site must run at full production capacity at all times.

- [B] The RTO is 2 hours and the RPO is 15 minutes, so recovery points must be created at least every 15 minutes.

- [C] The RTO is 2 hours and the RPO is 2 hours, so a backup taken every hour is sufficient.

- [D] The RPO is 2 hours and the RTO is 15 minutes, so the application must be restored within 15 minutes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-s3-crr-existing-objects (type: multi)

A company has an Amazon S3 bucket in eu-west-1 that already contains 50 TB of objects. S3 Versioning is not enabled on the bucket. A new compliance rule requires a copy of all existing objects and all future objects in a bucket in eu-central-1.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Run an S3 Batch Replication job to replicate the objects that existed before the replication rule was created.

- [B] Enable S3 Transfer Acceleration on the source bucket so that objects are copied to eu-central-1.

- [C] Enable S3 Object Lock in governance mode on the destination bucket.

- [D] Create an S3 Lifecycle rule on the source bucket that transitions the objects to the destination bucket.

- [E] Enable S3 Versioning on both buckets and create a replication rule from the source bucket to the destination bucket.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-s3-one-zone-ia-thumbnails (type: single)

A photo-sharing company stores original images in S3 Standard. The application also generates thumbnails, which are stored in a separate Amazon S3 bucket. The thumbnails can be regenerated from the originals if they are lost. They are accessed infrequently, but when they are requested they must be returned in milliseconds.

Which storage class for the thumbnails will meet these requirements MOST cost-effectively?


- [A] S3 Standard-IA

- [B] S3 Standard

- [C] S3 Glacier Deep Archive

- [D] S3 One Zone-IA

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-s3-replication-time-control (type: single)

A financial company replicates trading records from an Amazon S3 bucket in us-east-1 to a bucket in us-west-2 with S3 Cross-Region Replication. A new regulation requires a predictable replication time that is backed by a service level agreement. The company must also receive an alert whenever an object takes longer than 15 minutes to replicate.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Invoke an AWS Lambda function on each upload that copies the object to us-west-2 and publishes an alert if the copy takes too long.

- [B] Enable S3 Replication Time Control on the replication rule and send OperationMissedThreshold event notifications to an Amazon SNS topic.

- [C] Enable S3 Transfer Acceleration on both buckets and create a CloudWatch alarm on the bucket size metric.

- [D] Schedule an S3 Batch Replication job every 15 minutes and review the job completion reports.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-saga-step-functions (type: single)

A travel company splits its booking application into three microservices for flights, hotels, and car rentals. Each microservice has its own database. A booking must complete in all three services or, if any step fails, the steps that already completed must be reversed. The company wants a managed orchestrator with built-in retry and error handling, and it wants to write as little coordination code as possible.

Which solution will meet these requirements?


- [A] Publish each booking to an Amazon SNS topic that the three services subscribe to, and let each service process the booking independently.

- [B] Move the three databases into one Amazon Aurora cluster and run the three updates inside a single SQL transaction.

- [C] Implement saga orchestration with an AWS Step Functions Standard workflow that calls each service and runs compensating steps in Catch handlers.

- [D] Send the three booking steps to an Amazon SQS FIFO queue so that the services process them in a strict order.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-single-region-multi-az (type: single)

A healthcare company must keep all patient data inside one country, and that country has a single AWS Region. The application runs on Amazon EC2 instances in one Availability Zone and uses an Amazon RDS for PostgreSQL Single-AZ DB instance. The company needs the application and the database to keep running if a data center fails.

Which solution will meet these requirements?


- [A] Move the instances to larger instance types and enable EC2 automatic recovery in the current Availability Zone.

- [B] Run the instances in an Auto Scaling group across two Availability Zones behind a load balancer, and convert the DB instance to Multi-AZ.

- [C] Deploy a copy of the application in a second Region and replicate the database with a cross-Region read replica.

- [D] Place the application behind Amazon CloudFront and cache the application pages at edge locations in the country.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-static-stability-capacity (type: single)

A company runs a critical stateless application on Amazon EC2 instances in an Auto Scaling group across three Availability Zones behind an Application Load Balancer. The application needs 12 instances to handle peak load. If one Availability Zone fails during a peak, the application must keep serving the full peak load without depending on launching new instances during the event.

Which configuration will meet these requirements?


- [A] Set a minimum of 18 instances (6 per zone) across the three Availability Zones.

- [B] Set a minimum of 12 instances in one zone and add a warm pool of stopped instances in the two other zones.

- [C] Set a minimum of 12 instances (4 per zone) and add a target tracking policy that keeps average CPU utilization at 50 %.

- [D] Set a minimum of 12 instances (4 per zone) and rely on Auto Scaling to replace the lost instances in the remaining zones.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-textract-claim-forms (type: single)

An insurance company receives scanned claim forms as PDF and image files. The company needs to extract the printed and handwritten values from the form fields and tables and load them into a database. The company does not want to build or train machine learning models.

Which solution will meet these requirements?


- [A] Use Amazon Rekognition text detection to read the words on each page and rebuild the form structure in custom code.

- [B] Use Amazon Comprehend entity detection on each file to extract the fields and table cells.

- [C] Use Amazon SageMaker AI to train a custom document model that extracts the fields and table cells.

- [D] Use Amazon Textract document analysis with the forms and tables features to extract the fields and table cells.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2c-transcribe-comprehend-calls (type: multi)

A call center stores recordings of customer calls as audio files in an Amazon S3 bucket. The company wants a text transcript of each call. Then the company wants to identify the overall sentiment of each conversation and detect personal data, such as phone numbers and addresses, in the transcripts. The solution must use managed AI services only.

Which combination of services will meet these requirements? (Choose two.)


Choose 2.

- [A] Amazon Comprehend to detect the sentiment and personal data in the transcripts.

- [B] Amazon Transcribe to convert the recordings to text.

- [C] Amazon Lex to detect the sentiment and personal data in the transcripts.

- [D] Amazon Polly to convert the recordings to text.

- [E] Amazon Rekognition to detect the sentiment and personal data in the transcripts.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2c-warm-standby-reduced-traffic (type: single)

A company runs a web application in us-east-1 and plans disaster recovery in us-west-2. In a disaster, us-west-2 must be able to serve a reduced amount of production traffic immediately, without first launching or starting servers, and then scale to full capacity. The database must be replicated continuously to us-west-2. The company wants the lowest-cost strategy that meets these requirements.

Which disaster recovery strategy should the company use?


- [A] Multi-site active/active: run full production capacity in both Regions and serve traffic from both Regions at all times.

- [B] Warm standby: replicate the database and run a scaled-down but fully functional copy of the application that scales up after failover.

- [C] Pilot light: replicate the database, keep AMIs and launch templates ready, and keep zero application servers running until failover.

- [D] Backup and restore: copy nightly backups to us-west-2 and redeploy the stack from infrastructure as code after a disaster.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-alb-unhealthy-host-metric (type: single)

An application runs on Amazon EC2 instances that are registered in a target group behind an Application Load Balancer. The business requires the operations team to be alerted as soon as any registered target fails the load balancer health checks, so that the team can investigate before the remaining capacity is too low for users.

Which Amazon CloudWatch metric should the alarm use?


- [A] TargetResponseTime

- [B] RequestCountPerTarget

- [C] UnHealthyHostCount

- [D] HTTPCode_ELB_5XX_Count

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-amazon-mq-legacy (type: single)

A company is migrating an on-premises order processing system to AWS. The system's components exchange messages through JMS with a self-managed Apache ActiveMQ broker, which is a single point of failure.

The company wants a managed message broker that stays available if an Availability Zone fails, without rewriting the messaging code of the application.

Which solution will meet these requirements?


- [A] Replace the broker with Amazon SQS standard queues.

- [B] Install ActiveMQ on an Amazon EC2 instance with an Amazon EBS volume and enable EC2 automatic recovery.

- [C] Replace the broker with Amazon SNS topics and subscriptions.

- [D] Create an Amazon MQ for ActiveMQ broker with an active/standby deployment across two Availability Zones.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-aurora-global-db (type: single)

A financial services company runs an Amazon Aurora MySQL-Compatible Edition DB cluster in us-east-1. A new business continuity requirement states that if the whole Region becomes unavailable, the database must be recoverable in us-west-2 with an RPO of a few seconds and an RTO of minutes. Analysts in the western United States also need low-latency read access to the data.

The application must continue to use a MySQL-compatible database.

Which solution will meet these requirements?


- [A] Create an AWS Backup plan that copies cluster snapshots to us-west-2 every hour.

- [B] Add Aurora Replicas in two other Availability Zones of us-east-1 and rely on automatic failover.

- [C] Convert the cluster to an Aurora global database with a secondary cluster in us-west-2.

- [D] Migrate the data to Amazon DynamoDB global tables with replicas in us-east-1 and us-west-2.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-backup-org-policies (type: single)

A company has 60 accounts in AWS Organizations that run Amazon EC2 instances, Amazon EBS volumes, Amazon RDS databases, and Amazon DynamoDB tables. A new compliance rule requires daily backups of every resource tagged backup=daily, kept for 35 days, with a copy in a second AWS Region.

The compliance team must define this rule once for all accounts and monitor backup jobs centrally. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Use AWS CloudFormation StackSets to deploy an AWS Lambda function in each account that snapshots the tagged resources daily, copies the snapshots to the second Region, and deletes them after 35 days.

- [B] Use AWS CloudFormation StackSets to set a 35-day automated backup retention on every RDS database and to turn on point-in-time recovery for every DynamoDB table.

- [C] Enable backup policies and cross-account monitoring in AWS Backup, and attach an organization backup policy that backs up tagged resources daily for 35 days with a cross-Region copy.

- [D] Create Amazon Data Lifecycle Manager policies in each account that target the tagged resources, keep the snapshots for 35 days, and copy them to the second Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-backup-vault-lock (type: multi)

A company protects its production workloads with AWS Backup. After a ransomware attack at a partner, the company wants its recovery points to be impossible to delete before their 30-day retention ends, even by the root user of the production account or by an attacker who obtains administrator credentials in that account. A copy of each recovery point must also exist outside the production account.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Apply AWS Backup Vault Lock in compliance mode, with a 30-day minimum retention, to the backup vaults.

- [B] Apply AWS Backup Vault Lock in governance mode, with a 30-day minimum retention, to the backup vaults.

- [C] Enable S3 Versioning and MFA delete on the bucket in which AWS Backup stores the recovery points.

- [D] Add a copy action to the backup plan rules that copies each recovery point to a backup vault in another account of the organization.

- [E] Encrypt the backup vaults with a customer managed AWS KMS key that has automatic key rotation enabled.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2d-cfn-drift-detection (type: single)

A company deploys its production environment with AWS CloudFormation. An auditor suspects that administrators changed some resource properties, such as security group rules and instance types, directly in the AWS Management Console after the deployment.

A solutions architect must identify which resources of the stack no longer match the template, with the LEAST effort.

Which solution will meet these requirements?


- [A] Run drift detection on the stack and review the drift status and property differences of each resource.

- [B] Search the AWS CloudTrail event history for modification API calls on each resource of the stack.

- [C] Enable termination protection on the stack and review the stack events.

- [D] Create a change set from the original template and review the changes that the change set lists.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-cfn-protect-database (type: multi)

A company manages a production Amazon RDS for PostgreSQL DB instance and its application resources in one AWS CloudFormation stack. During a cleanup of test environments, an engineer almost deleted the production stack.

The company now requires that any attempt to delete the stack fails until someone deliberately turns the protection off. If the stack is eventually deleted, the DB instance must keep running with its data.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Enable termination protection on the stack.

- [B] Set the DeletionPolicy attribute of the DB instance resource to Snapshot.

- [C] Apply a stack policy that denies Update:Delete on the DB instance resource.

- [D] Set the DeletionPolicy attribute of the DB instance resource to Retain.

- [E] Schedule drift detection on the stack every hour.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2d-config-auto-remediation (type: single)

A company's security standard forbids security groups that allow inbound SSH (TCP port 22) from 0.0.0.0/0. Developers sometimes add such rules manually while they troubleshoot instances and forget to remove them.

The company wants these rules to be detected and removed automatically shortly after they are created, and it wants a history of the compliance status of each security group. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Attach a service control policy (SCP) that denies the ec2:AuthorizeSecurityGroupIngress action to all accounts.

- [B] Run AWS CloudFormation drift detection every day on the stacks that create the security groups.

- [C] Deploy the AWS Config managed rule that checks for unrestricted incoming SSH traffic, with automatic remediation that runs an AWS Systems Manager Automation document to remove the rule.

- [D] Create an Amazon EventBridge Scheduler schedule that runs an AWS Lambda function every hour to scan all security groups and delete the offending rules.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-container-insights (type: single)

A company runs about 30 microservices on Amazon ECS with AWS Fargate. When a service degrades, the operations team needs CPU and memory utilization at the cluster, service, and task levels, together with diagnostic information such as container restart failures, to find the failing service quickly.

The solution must not require any change to the application code.

Which solution will meet these requirements?


- [A] Enable Amazon CloudWatch Container Insights on the ECS cluster.

- [B] Instrument each microservice with the AWS X-Ray SDK and review the X-Ray service map.

- [C] Enable VPC Flow Logs on the elastic network interfaces of the tasks.

- [D] Create an AWS CloudTrail trail that records all Amazon ECS API calls in the account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-cross-account-observability (type: single)

A company uses AWS Organizations with 40 member accounts. All workloads run in a single AWS Region. Each account publishes application metrics and logs to Amazon CloudWatch and sends traces to AWS X-Ray.

The central operations team wants to search and correlate the metrics, logs, and traces of all accounts from one monitoring account. Accounts that are added to the organization later must be included automatically. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an AWS Config aggregator in the central account that collects configuration and compliance data from all accounts in the organization.

- [B] Create an IAM role in each member account that the operations team assumes to open the CloudWatch and X-Ray consoles of that account.

- [C] Set up CloudWatch cross-account observability with the central account as the monitoring account, and link the organization as the source of metrics, logs, and traces.

- [D] In each member account, create CloudWatch Logs subscription filters that stream every log group to an Amazon Data Firehose stream in the central account, which delivers the data to Amazon OpenSearch Service.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-docdb-neptune (type: multi)

A social commerce startup is building a new application on AWS. The product catalog is stored as documents whose attributes vary by product, and the developers already use MongoDB drivers. A recommendation feature must query multi-hop relationships, such as products bought by customers who follow the same creators as the current user.

The startup wants fully managed, purpose-built databases for each workload.

Which combination of services will meet these requirements? (Choose two.)


Choose 2.

- [A] Amazon RDS for MySQL with recursive SQL joins for the recommendation feature

- [B] Amazon Keyspaces (for Apache Cassandra) for the product catalog

- [C] Amazon Neptune for the recommendation feature

- [D] Amazon DocumentDB (with MongoDB compatibility) for the product catalog

- [E] Amazon Redshift for the recommendation feature

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2d-dr-active-active (type: single)

A global payments company runs a transaction API on AWS Lambda and Amazon DynamoDB in us-east-1. The company is expanding to Europe. Customers on each continent must be served from the nearest Region, and both Regions must accept writes at all times.

If one Region fails, customers must continue to work with near-zero RTO and RPO, without any failover or scale-up action.

Which solution will meet these requirements?


- [A] Keep the API in us-east-1, switch the table to on-demand capacity mode, and rely on the Multi-AZ replication of DynamoDB.

- [B] Create a DynamoDB global table with a replica in eu-west-1, deploy the full API in both Regions, and use Route 53 latency-based routing with health checks.

- [C] Turn on DynamoDB point-in-time recovery, export the table to an S3 bucket in eu-west-1 every hour, and redeploy the API there with AWS CloudFormation after a failure.

- [D] Create a DynamoDB global table with a replica in eu-west-1, deploy a scaled-down copy of the API in eu-west-1, and use Route 53 failover routing to send traffic there when us-east-1 fails.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-dr-backup-restore (type: single)

A company runs an internal reporting application on Amazon EC2 instances with an Amazon RDS database in one AWS Region. The business states that, after a Region-wide disaster, the application can be unavailable for up to 24 hours and can lose up to 12 hours of data.

The company wants the lowest-cost disaster recovery (DR) strategy that meets these objectives.

Which solution will meet these requirements?


- [A] Backup and restore: copy EC2 and RDS backups to a second Region every 6 hours with AWS Backup, and redeploy with AWS CloudFormation after a disaster.

- [B] Pilot light: run a cross-Region read replica of the database at all times, and keep copies of the AMIs and launch templates in the second Region.

- [C] Warm standby: run a scaled-down but fully functional copy of the application and a database replica in a second Region at all times.

- [D] Multi-site active/active: run the full application and database in two Regions, and route users to both Regions with Amazon Route 53.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-dr-pilot-light (type: single)

An ordering application runs on Amazon EC2 instances in an Auto Scaling group with an Amazon RDS for MySQL DB instance in us-east-1. The disaster recovery (DR) requirements for a Regional outage are an RPO of a few minutes and an RTO of 1 hour.

The application servers do not need to run in the DR Region before a disaster. The company wants to minimize the cost of the DR environment.

Which solution will meet these requirements?


- [A] Create a cross-Region read replica and copy the AMIs and launch template to us-west-2 with an Auto Scaling group at zero capacity; after a disaster, promote the replica and scale out.

- [B] Copy daily RDS snapshots and the AMIs to us-west-2 with AWS Backup, and after a disaster restore the database and launch the Auto Scaling group from the AMIs.

- [C] Migrate the database to an Aurora global database, and run the full application at production capacity in both Regions with write forwarding from us-west-2.

- [D] Run a scaled-down Auto Scaling group of two instances behind an Application Load Balancer in us-west-2, with a cross-Region read replica, and scale out after a disaster.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-dr-warm-standby (type: single)

A software as a service (SaaS) company runs its platform on Amazon EC2 instances behind an Application Load Balancer, with an Amazon Aurora PostgreSQL-Compatible Edition database, in one AWS Region. The disaster recovery (DR) requirements are an RPO of less than 1 minute and an RTO of 10 minutes.

The DR Region must be able to accept customer traffic immediately after a failover, at reduced capacity while it scales up. The budget does not allow a second full-size production environment.

Which solution will meet these requirements?


- [A] Copy Aurora snapshots and AMIs to the DR Region every hour with AWS Backup, and deploy the full environment from AWS CloudFormation templates after a disaster.

- [B] Add an Aurora global database secondary cluster and an Auto Scaling group with a desired capacity of zero in the DR Region, and scale out the group after a failover.

- [C] Run a second full-capacity copy of the platform with an Aurora global database secondary cluster in the DR Region, and route customers to both Regions with latency-based routing.

- [D] Add an Aurora global database secondary cluster and a scaled-down, fully functional application tier behind an Application Load Balancer in the DR Region, with Route 53 failover routing.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-dx-vpn-backup (type: single)

A company connects its data center to several VPCs through a transit gateway and a single 1 Gbps AWS Direct Connect connection. Traffic averages 300 Mbps.

Management wants connectivity between the data center and AWS to continue if the Direct Connect connection or the Direct Connect location fails. Reduced performance is acceptable during such a failure. The solution must be the MOST cost-effective.

Which solution will meet these requirements?


- [A] Create an AWS Site-to-Site VPN connection to the transit gateway as a backup path, with BGP preferring the Direct Connect routes.

- [B] Order a second Direct Connect connection that terminates on a different device at the same Direct Connect location.

- [C] Order a second dedicated Direct Connect connection at a different Direct Connect location, and use BGP to share the traffic.

- [D] Create a second transit virtual interface on the existing Direct Connect connection and associate it with the transit gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-ec2-recover-legacy (type: single)

A company runs a legacy license server on a single Amazon EC2 instance that uses only Amazon EBS volumes. The license file is bound to the instance ID and the private IP address of the instance. The application cannot be modified and cannot run on more than one instance.

The company wants the instance to recover automatically if the underlying host hardware fails, and the operations team must receive an email each time a recovery occurs.

Which solution will meet these requirements?


- [A] Create a CloudWatch alarm on the StatusCheckFailed_Instance metric with the EC2 reboot action and an Amazon SNS topic that has an email subscription.

- [B] Create an Amazon EventBridge rule on instance state changes that invokes an AWS Lambda function to launch a replacement instance from the latest AMI and send an email.

- [C] Place the instance in an Auto Scaling group with a minimum, maximum, and desired capacity of one, across two Availability Zones, with an Amazon SNS notification for launch events.

- [D] Create a CloudWatch alarm on the StatusCheckFailed_System metric with the EC2 recover action and an Amazon SNS topic that has an email subscription.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-efs-regional (type: single)

A company runs a content management application on Amazon EC2 Linux instances in an Auto Scaling group that spans three Availability Zones. All instances must read and write the same set of files at the same time through a shared NFS file system. The files must remain available if one Availability Zone fails.

Which storage solution will meet these requirements?


- [A] Instance store volumes on each instance, kept in sync by a scheduled rsync job.

- [B] An Amazon EFS Regional file system with a mount target in each Availability Zone.

- [C] An Amazon EBS io2 volume with Multi-Attach enabled, attached to all instances.

- [D] An Amazon EFS One Zone file system in the first Availability Zone, mounted by all instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-global-accelerator-udp (type: single)

A gaming company runs multiplayer game servers behind Network Load Balancers in us-west-2 and eu-central-1. Game clients connect over UDP. Several partner networks allow outbound traffic only to a short, fixed list of IP addresses.

If the game servers in one Region become unhealthy, new player connections must go to the healthy Region within seconds, without depending on how long clients cache DNS records.

Which solution will meet these requirements?


- [A] Create Amazon Route 53 failover records that point to the two Network Load Balancers, with health checks on each load balancer.

- [B] Create an Amazon CloudFront distribution with an origin group that contains the two Network Load Balancers.

- [C] Create an AWS Global Accelerator standard accelerator with an endpoint group in each Region that contains the Region's Network Load Balancer.

- [D] Replace the Network Load Balancers with Application Load Balancers and use Route 53 latency-based routing.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-keyspaces-cassandra (type: single)

A logistics company stores vehicle telemetry in a self-managed Apache Cassandra cluster on Amazon EC2. The operations team spends a lot of time replacing failed nodes, patching, and adding capacity.

The company wants a serverless, highly available database service that scales automatically and lets it keep its existing Cassandra application code and tools.

Which solution will meet these requirements?


- [A] Migrate the data to Amazon DynamoDB tables in on-demand capacity mode.

- [B] Migrate the data to Amazon Neptune.

- [C] Migrate the data to Amazon DocumentDB (with MongoDB compatibility).

- [D] Migrate the data to Amazon Keyspaces (for Apache Cassandra).

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-legacy-windows-ha (type: multi)

A company runs a legacy .NET application on Windows-based Amazon EC2 instances. The application stores documents on an SMB file share hosted by one Windows file server instance and uses a Microsoft SQL Server database installed on another instance. Both servers are in the same Availability Zone.

The application code cannot be changed, but the share path and the database connection string can be updated. The company wants to remove these single points of failure with the LEAST operational overhead.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Move the documents to an Amazon FSx for Windows File Server Multi-AZ file system and update the share path.

- [B] Move the documents to an Amazon EFS Regional file system and mount it on the Windows instances.

- [C] Move the documents to an Amazon FSx for Windows File Server Single-AZ file system and update the share path.

- [D] Migrate the database to an Amazon RDS for SQL Server Multi-AZ deployment and update the connection string.

- [E] Store the documents in an Amazon S3 bucket and access them through the S3 API.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2d-nat-gateway-per-az (type: single)

A VPC has private subnets in three Availability Zones. The route tables of all private subnets send 0.0.0.0/0 to one zonal NAT gateway in a public subnet in Availability Zone A. During an outage of Availability Zone A, the instances in the other two Availability Zones could not reach a third-party payment API on the internet.

The company wants outbound IPv4 internet access from the private subnets to survive the failure of any single Availability Zone.

Which solution will meet these requirements?


- [A] Create a second NAT gateway in Availability Zone A and add it as another target of the 0.0.0.0/0 route in each private route table.

- [B] Create a NAT gateway in each Availability Zone, and give each zone's private subnets a route table that sends 0.0.0.0/0 to the NAT gateway in the same zone.

- [C] Replace the NAT gateway with a NAT instance in an Auto Scaling group that keeps one instance running in Availability Zone A, with the source/destination check disabled.

- [D] Add an egress-only internet gateway to the VPC, and update every private route table to send 0.0.0.0/0 to the egress-only internet gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-opensearch-search (type: single)

A retail company stores its product catalog of several million items in an Amazon Aurora MySQL-Compatible Edition database. Customers search the catalog with free-text queries on product names and descriptions. The current SQL queries that use LIKE patterns are slow and load the database during sales events.

The company wants a purpose-built, highly available service for full-text search, and the database must remain the system of record.

Which solution will meet these requirements?


- [A] Add Aurora Replicas in other Availability Zones, and send the existing LIKE search queries to the cluster reader endpoint.

- [B] Load the catalog into an Amazon Redshift cluster every hour, and send the customer search queries to the cluster.

- [C] Cache the results of previous search queries in Amazon ElastiCache, and query the database only when the cache has no result.

- [D] Index the catalog in an Amazon OpenSearch Service domain that spans multiple Availability Zones, and send the search queries to the domain.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-r53-alarm-health-check (type: single)

A company runs an internal reporting application on one Amazon EC2 instance in a private subnet in us-east-1, and a standby instance in us-west-2. Employees resolve the application name through an Amazon Route 53 private hosted zone that contains failover records with the private IP addresses of the two instances. The instances have no public IP addresses.

The company wants DNS to fail over to us-west-2 automatically when the primary instance fails its EC2 status checks.

Which solution will meet these requirements?


- [A] Create a Route 53 endpoint health check that sends HTTP requests to the private IP address of the primary instance, and associate it with the primary failover record.

- [B] Create a CloudWatch alarm on the StatusCheckFailed metric of the primary instance, create a Route 53 health check that monitors the alarm, and associate it with the primary failover record.

- [C] Enable EC2 automatic instance recovery on the primary instance and replace the failover records with a simple record that contains its private IP address.

- [D] Create a calculated health check whose only child is an endpoint health check on the private IP address of the primary instance, and associate it with the primary failover record.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-rds-long-term-retention (type: single)

A company runs an Amazon RDS for PostgreSQL DB instance with automated backups retained for 14 days. A new regulation requires a monthly backup of the database to be kept for 7 years. The company must also keep the ability to restore the database to any point in time within the last 14 days.

The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Change the backup retention period of the automated backups to 2,555 days.

- [B] Keep the 14-day automated backups, and create an AWS Backup plan with a monthly rule and a 7-year retention period that is assigned to the DB instance.

- [C] Create a cross-Region read replica of the DB instance and keep it for 7 years.

- [D] Create an Amazon EventBridge schedule that invokes an AWS Lambda function each month to create a manual snapshot, and a second function that deletes snapshots older than 7 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-rds-proxy-legacy (type: single)

A legacy Java application on Amazon EC2 connects to an Amazon RDS for MySQL Multi-AZ DB instance. The application opens many short-lived connections during traffic peaks, which sometimes exhausts the database connection limit. During each Multi-AZ failover, the application returns errors for several minutes until its connections are re-established.

The company cannot change the application code, but it can change the database endpoint in a configuration file.

Which solution will meet these requirements?


- [A] Create a read replica of the DB instance and point the application configuration to the replica endpoint.

- [B] Create an Amazon RDS Proxy for the DB instance and point the application configuration to the proxy endpoint.

- [C] Change the DB instance to a larger instance class that supports more connections.

- [D] Place an Amazon ElastiCache cluster in front of the database to cache query results.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-rds-replica-lag (type: single)

A news website stores articles in an Amazon RDS for MySQL DB instance. Two read replicas serve the article pages. The editorial team requires that readers never see content that is more than 30 seconds older than the content on the primary DB instance.

Which Amazon CloudWatch metric should a solutions architect monitor to detect when a read replica no longer meets this requirement?


- [A] CPUUtilization

- [B] DatabaseConnections

- [C] ReadLatency

- [D] ReplicaLag

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-redshift-analytics (type: single)

A company runs complex analytical SQL queries that join several years of sales history directly on its production Amazon RDS for PostgreSQL database. The queries slow down order processing. The data volume is expected to grow to several petabytes.

The company wants a purpose-built, fully managed service for these analytical queries that works with its existing SQL-based business intelligence (BI) tools.

Which solution will meet these requirements?


- [A] Load the sales history into Amazon DynamoDB and run the reports with DynamoDB queries.

- [B] Load the sales history into Amazon Neptune and connect the BI tools to it.

- [C] Load the sales history into an Amazon Redshift data warehouse and connect the BI tools to it.

- [D] Cache the results of the analytical queries in Amazon ElastiCache for Valkey.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-s3-crr-cloudfront-failover (type: multi)

A media company serves a static website and its images from an Amazon S3 bucket in eu-west-1 through an Amazon CloudFront distribution. Editors upload new objects several times each day.

The company requires the website to keep serving all content, including recently uploaded objects, if Amazon S3 in eu-west-1 becomes unavailable. Failover must happen without manual DNS changes.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Configure S3 Cross-Region Replication from the bucket to a bucket in a second Region.

- [B] Configure S3 Same-Region Replication from the bucket to a second bucket in eu-west-1 that another account owns.

- [C] Enable S3 Transfer Acceleration on the bucket and use the accelerate endpoint for uploads.

- [D] Increase the default TTL of the CloudFront cache behavior to 30 days so that objects stay at edge locations.

- [E] Create a CloudFront origin group with the original bucket as the primary origin and the replica bucket as the secondary origin.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-2d-s3-versioning (type: single)

A design agency stores project files in an Amazon S3 bucket. Users sometimes overwrite or delete files by mistake. The agency needs to be able to recover any earlier version of a file for 90 days after it was replaced or deleted.

The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Enable server access logging on the bucket so that deleted files can be identified and uploaded again.

- [B] Enable S3 Versioning and add a lifecycle rule that expires noncurrent versions 90 days after they become noncurrent.

- [C] Create a lifecycle rule that transitions all objects to S3 Glacier Flexible Retrieval one day after they are created.

- [D] Run an S3 Batch Operations job every night that copies all objects to a second bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-session-state-elasticache (type: single)

An ecommerce application runs on Amazon EC2 instances in an Auto Scaling group across two Availability Zones behind an Application Load Balancer. The application keeps shopping cart session data in the memory of each instance, and sticky sessions are enabled on the target group. When an instance fails or is terminated during scale-in, its users lose their carts.

The developers can change the session storage settings of the application framework. The session store must keep sub-millisecond access latency and survive the failure of an Availability Zone.

Which solution will meet these requirements?


- [A] Store the session data on an Amazon EBS io2 volume with Multi-Attach enabled, attached to all instances.

- [B] Store the session data on the instance store volumes of each instance.

- [C] Increase the duration of the load balancer-generated stickiness cookie to 7 days.

- [D] Store the session data in an Amazon ElastiCache for Valkey cluster with a replica in each Availability Zone and Multi-AZ enabled.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-single-ec2-to-asg-alb (type: single)

A company runs a stateless web application on a single Amazon EC2 instance with an Elastic IP address in one Availability Zone. Last month, a failure of the instance took the website down for several hours.

The company needs the website to remain available if an instance or an entire Availability Zone fails.

Which solution will meet these requirements?


- [A] Launch a second instance in the same Availability Zone in a cluster placement group and put both instances behind an Application Load Balancer.

- [B] Run the application from an AMI in an Auto Scaling group across two or more Availability Zones behind an Application Load Balancer, with ELB health checks.

- [C] Take daily EBS snapshots with Amazon Data Lifecycle Manager and launch a new instance from the latest snapshot when the instance fails.

- [D] Move the application to a larger instance type and enable EC2 automatic instance recovery.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-sqs-backlog-per-instance (type: single)

A company processes uploaded images with Amazon EC2 instances in an Auto Scaling group. The instances poll an Amazon SQS queue. The business requires every image to be processed within 2 minutes of upload. Each instance processes one message in about 2 seconds.

The current scaling policy tracks average CPU utilization and reacts too slowly when uploads spike. A solutions architect must choose a scaling metric that reflects the business requirement without running more instances than necessary.

Which solution will meet these requirements?


- [A] Create a target tracking policy on the backlog per instance (queue messages divided by InService instances), with a target of 60.

- [B] Create a step scaling policy that adds two instances when the average CPU utilization of the group exceeds 50 percent.

- [C] Create a scheduled scaling action that doubles the capacity of the group every weekday during business hours.

- [D] Create a target tracking policy on the ApproximateNumberOfMessagesVisible metric of the queue, with a target value of 60.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-stacksets-auto-deploy (type: single)

A company uses AWS Organizations. The security team maintains an AWS CloudFormation template that creates a baseline in each account: an IAM role for incident response and a set of Amazon CloudWatch alarms. New accounts are created in the Workloads organizational unit (OU) every week.

The baseline must be deployed automatically to every existing and new account in the Workloads OU, and removed when an account leaves the OU. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Attach a service control policy (SCP) to the Workloads OU that requires the IAM role and the alarms to exist in each account.

- [B] Create a StackSet with service-managed permissions that targets the Workloads OU, with automatic deployment enabled and stacks deleted on account removal.

- [C] Create a StackSet with self-managed permissions, and add the ID of each new account to the StackSet after the account is created.

- [D] Create an Amazon EventBridge rule on account creation events that invokes an AWS Lambda function to create the stack in the new account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-synthetics-canary (type: single)

A travel company runs its booking website on Amazon EC2 instances behind an Application Load Balancer. Almost all traffic arrives during business hours. Twice last month, the sign-in and flight search workflow broke during the night, and the company learned about it only when customers complained the next morning.

The company wants to detect a broken sign-in or search workflow within minutes, at any hour, even when no customers are using the website. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create Amazon CloudWatch Synthetics canaries that run the sign-in and search steps every 5 minutes, and a CloudWatch alarm on canary failures.

- [B] Enable AWS X-Ray tracing in the application and create a CloudWatch alarm on the fault rate shown in the X-Ray traces.

- [C] Create an Amazon Route 53 health check on the website home page URL and a CloudWatch alarm on the health check status.

- [D] Store the load balancer access logs in Amazon S3 and run a scheduled Amazon Athena query every night to find HTTP 5xx responses.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-2d-xray-apigw-lambda (type: multi)

A company runs a serverless order API. An Amazon API Gateway REST API invokes AWS Lambda functions that write to an Amazon DynamoDB table. Customers report that some requests are slow, and the developers cannot tell whether the time is spent in API Gateway or in one of the functions.

A solutions architect must give the developers an end-to-end view of sampled requests, with a breakdown of the time spent in each component, with the LEAST operational overhead.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Enable AWS X-Ray tracing on the API Gateway stage and redeploy the API.

- [B] Create VPC Flow Logs for the VPC and analyze them with CloudWatch Logs Insights.

- [C] Enable API Gateway access logging to Amazon CloudWatch Logs and create a metric filter on the latency field.

- [D] Turn on AWS CloudTrail data events for the Lambda functions and query the events with Amazon Athena.

- [E] Enable active tracing on the Lambda functions so that Lambda sends trace segments to AWS X-Ray.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-abac-project-tags (type: single)

A consulting company creates several new projects every week. Each project uses Amazon EC2 instances and other resources that are tagged with the project name. Engineers who are assigned to a project must be able to start and stop only that project's instances. The company wants to avoid writing or updating IAM policies when projects are added.

Which solution will meet these requirements?


- [A] Create a separate AWS account for each project and give the engineers administrator access to their project account.

- [B] Create one IAM policy for each project that lists the instance IDs of the project, and attach it to the project's engineers.

- [C] Tag each engineer's role with the project and allow the actions when aws:ResourceTag/project matches ${aws:PrincipalTag/project}.

- [D] Allow ec2:StartInstances and ec2:StopInstances on all instances for every engineer and audit the actions with CloudTrail.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-artifact-soc-report (type: single)

A payment company hosts its platform on AWS. An external auditor asks for evidence that the physical and infrastructure security controls of the AWS data centers have been independently audited, including the latest SOC 2 and PCI DSS reports. The company must provide the documents as quickly as possible.

Which solution will meet these requirements?


- [A] Deploy AWS Config conformance packs for PCI DSS and give the auditor the compliance results.

- [B] Arrange for the auditor to inspect an AWS data center in the Region that the company uses.

- [C] Download the SOC 2 and PCI DSS reports from AWS Artifact and provide them to the auditor.

- [D] Enable the PCI DSS standard in AWS Security Hub and export the control findings for the auditor.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-az-id-cross-account (type: single)

A company has two AWS accounts that were created in 2018 and 2021. An application in the first account must run in the same physical Availability Zone as a database in the second account in the US East (N. Virginia) Region to avoid cross-AZ latency. The application team plans to use the Availability Zone that is named us-east-1a in both accounts.

What should a solutions architect recommend?


- [A] Select the Availability Zone by its AZ ID, such as use1-az1, in both accounts instead of by its name.

- [B] Move both workloads to a Local Zone, which has the same identifier in every account.

- [C] Use us-east-1a in both accounts because Availability Zone names map to the same location in every account.

- [D] Create a cluster placement group in each account with the same name to place the resources together.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-boundary-effective-perms (type: single)

An IAM role used by a developer has the AdministratorAccess policy attached. The role also has a permissions boundary that allows only Amazon S3 and Amazon CloudWatch actions. There is no SCP or resource-based policy that affects the request. The developer uses the role to call ec2:RunInstances.

What is the result of the request?


- [A] The request is allowed because the identity-based policy explicitly allows all actions.

- [B] The request is denied because ec2:RunInstances is not allowed by the permissions boundary.

- [C] The request is allowed because a permissions boundary applies only to IAM actions.

- [D] The request is allowed only if the developer also has an IAM user with EC2 permissions.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-central-root-access (type: single)

A company has 200 member accounts in an organization in AWS Organizations with all features enabled. Each member account still has a root user password and MFA device that the security team must secure and review. Occasionally, an engineer applies an Amazon S3 bucket policy that denies all principals, and the root user is needed to fix it. The company wants to reduce the effort of protecting root credentials while still being able to fix such policies.

Which solution will meet these requirements?


- [A] Centrally remove the member root credentials and run root-only fixes as privileged tasks from the management account.

- [B] Attach an SCP to all member accounts that denies every action of the root user, and review the SCP each quarter.

- [C] Create an IAM role with AdministratorAccess in each member account that engineers assume to delete the bucket policies.

- [D] Store the root password and MFA seed of each account in a vault that requires two approvers.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-cognito-mobile-upload (type: single)

A travel company is building a mobile app. Users sign in with their Google or Apple accounts and upload photos directly from the app to an Amazon S3 bucket. The app must not contain any long-term AWS credentials.

Which solution will meet these requirements?


- [A] Create an IAM user for each app user and store the user's access keys on the device after sign-in.

- [B] Use an Amazon Cognito identity pool that federates the social providers and maps signed-in users to an IAM role.

- [C] Add the app users to IAM Identity Center and assign them a permission set that allows uploads to the bucket.

- [D] Embed the access keys of one IAM user in the app and restrict that user to s3:PutObject on the photo bucket only.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-cognito-per-user-prefix (type: single)

A company has a single-page web application whose users sign in with an Amazon Cognito user pool. Users must upload and download their own documents directly from the browser to an Amazon S3 bucket. Each user must be able to access only the objects under a prefix that belongs to that user. The company does not want to deploy or maintain any backend code for file transfers, and the number of users is expected to grow to hundreds of thousands.

Which solution will meet these requirements?


- [A] Deploy an AWS Lambda function behind Amazon API Gateway that returns a presigned URL for the user's prefix on each request.

- [B] Add the user pool to an identity pool whose role allows S3 access to a prefix named with ${cognito-identity.amazonaws.com:sub}.

- [C] Configure the user pool as the identity source of IAM Identity Center and assign each user a permission set for the bucket.

- [D] Create one IAM role per user with a policy for that user's prefix, and map each user to the role in the user pool.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-cross-account-role-basic (type: single)

A company has a development account and a production account. Three operations engineers have IAM users in the development account. Occasionally, they must troubleshoot resources in the production account. The company does not want to create IAM users in the production account.

Which solution will meet these requirements?


- [A] Share the access keys of a production IAM user with the engineers through AWS Secrets Manager.

- [B] Create a VPC peering connection between the accounts so that the engineers can reach the production resources.

- [C] Add the production account ID to the policy of the engineers' IAM user group so that it applies in both accounts.

- [D] Create a role in the production account that trusts the development account, and let the engineers assume it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-cross-account-s3-both-sides (type: multi)

An application runs on Amazon EC2 instances in account A with an instance profile role named AppRole. The application must write objects to an Amazon S3 bucket in account B. The objects are encrypted with SSE-S3. The company wants the application to use the AppRole credentials directly, without assuming another role.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Add a statement to the bucket policy in account B that allows AppRole to call s3:PutObject on the bucket.

- [B] Attach an SCP to account A that allows s3:PutObject on the bucket in account B for all principals.

- [C] Add s3:PutObject on the bucket in account B to the identity-based policy of AppRole in account A.

- [D] Share the bucket with account A through a resource share in AWS Resource Access Manager (AWS RAM).

- [E] Create a role in account B whose trust policy trusts AppRole, and give that role s3:PutObject on the bucket.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-data-residency-region (type: single)

An insurance company in Germany is moving a customer database and its document archive to AWS. A regulation requires that customer data be stored only in Germany. The application must also remain available if one data center fails.

Which solution will meet these requirements?


- [A] Deploy the resources in a single Availability Zone of the Europe (Frankfurt) Region and replicate the data to the Europe (Paris) Region.

- [B] Store the data in Amazon CloudFront edge locations in Germany and run the application in any Region of the European Union.

- [C] Deploy the resources in the Europe (Frankfurt) Region across multiple Availability Zones and do not configure cross-Region replication.

- [D] Deploy the resources in the Europe (Ireland) Region across multiple Availability Zones and serve users in Germany through Amazon CloudFront.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-delegate-role-boundary (type: single)

A company's developers must be able to create IAM roles for the AWS Lambda functions that they build, without waiting for the central security team. The security team must ensure that no role created by a developer can ever have more permissions than a set that the security team defines, even if a developer attaches the AdministratorAccess policy to the role. The developers must not be able to remove this control.

Which solution will meet these requirements?


- [A] Have the developers create the roles in the security team's account and assume them from their own account when needed.

- [B] Attach an SCP to the developers' account that denies iam:CreateRole and iam:AttachRolePolicy to all principals.

- [C] Require a security-team permissions boundary on every role that developers create, and deny changes to that boundary.

- [D] Give the developers the IAMFullAccess policy and review new roles weekly with IAM Access Analyzer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-deny-without-mfa (type: single)

A company still has IAM users for a team of contractors. The users have console passwords and access keys. The security team wants a policy attached to the users' group that blocks all actions, except the actions needed to set up an MFA device, whenever a request is not MFA-authenticated. Requests made directly with the users' long-term access keys must also be blocked.

Which statement should the policy contain?


- [A] A Deny statement with NotAction for the MFA setup actions and a NumericGreaterThan condition on aws:MultiFactorAuthAge.

- [B] A Deny statement with NotAction for the MFA setup actions and a Bool condition where aws:MultiFactorAuthPresent is false.

- [C] A Deny statement with NotAction for the MFA setup actions and a BoolIfExists condition where aws:MultiFactorAuthPresent is false.

- [D] An Allow statement for all actions with a BoolIfExists condition where aws:MultiFactorAuthPresent is true.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-ecs-task-roles (type: single)

A company runs two containerized applications on the same Amazon EC2 instance. The first application reads from an Amazon SQS queue, and the second writes to an Amazon DynamoDB table. Both use the instance profile role, which allows both sets of actions. A security review requires each application to have only its own permissions, without long-term credentials, and the company wants to keep running both applications on shared EC2 capacity.

Which solution will meet these requirements?


- [A] Run the applications as Amazon ECS tasks on the instance and give each task definition its own IAM task role.

- [B] Create an IAM user for each application and store each user's access keys in the container environment variables.

- [C] Add conditions on the container name to the instance profile role so that each application gets only its actions.

- [D] Attach a second instance profile to the instance so that each application uses its own role.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-external-access-analyzer (type: single)

A company has 15 AWS accounts in an organization in AWS Organizations. The security team must continuously identify Amazon S3 buckets, IAM roles, AWS KMS keys and Amazon SQS queues that grant access to principals outside the organization.

Which solution will meet these requirements?


- [A] Enable Amazon Macie in all accounts and review its findings for the S3 buckets.

- [B] Enable Amazon GuardDuty in all accounts and review the findings about unusual API calls.

- [C] Create an IAM Access Analyzer external access analyzer with the organization as the zone of trust.

- [D] Enable Amazon Inspector in all accounts and review the findings for the listed resources.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-external-id-vendor (type: single)

A company subscribes to a third-party cost monitoring service that runs in the vendor's own AWS account. The vendor needs read access to the company's account and serves many other customers. The company wants to prevent other customers of the vendor from tricking the vendor into accessing the company's account.

Which solution will meet these requirements?


- [A] Create an IAM user with read-only permissions and send its access keys to the vendor over an encrypted channel.

- [B] Create a role that trusts the vendor's account and requires the vendor's external ID in the trust policy.

- [C] Create a role that trusts the vendor's account with no conditions, and keep the role ARN confidential.

- [D] Create a role that trusts all AWS principals, and require MFA in the trust policy of the role.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-group-managed-policy (type: single)

A research institute has 50 IAM users who work as data analysts. All analysts need the same permissions to query data with Amazon Athena and to read one Amazon S3 bucket. Analysts join and leave the team every month, and the permissions change a few times each year. The solution must minimize administrative effort.

Which solution will meet these requirements?


- [A] Create an IAM user group for each analyst and nest these groups in an Analysts group that has the policy.

- [B] Attach a customer managed policy to each analyst's IAM user and update all 50 attachments when the permissions change.

- [C] Create an Analysts IAM user group with a customer managed policy and add or remove users from the group.

- [D] Attach an inline policy with the permissions to each analyst's IAM user.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-group-not-principal (type: single)

A company has an IAM user group named Finance in the same AWS account as an Amazon S3 bucket that stores invoices. A solutions architect tries to save a bucket policy whose Principal element contains the ARN of the Finance group, and the policy is rejected. All members of the group must be able to read the invoices.

Which solution will meet these requirements?


- [A] Attach an identity-based policy to the Finance group that allows s3:GetObject on the invoice objects.

- [B] Use a wildcard in the group ARN of the bucket policy so that it matches the members of the group.

- [C] Nest the Finance group in a new parent group whose ARN the bucket policy accepts as a principal.

- [D] Add an IAM role to the Finance group and name that role as the principal in the bucket policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-idc-delegated-admin (type: single)

A company uses an organization instance of IAM Identity Center in its AWS Organizations management account. Members of the identity team sign in to the management account every day to assign users and groups to member accounts. The security team wants to reduce the number of people who have access to the management account while letting the identity team keep doing these assignments.

Which solution will meet these requirements?


- [A] Move the organization instance of IAM Identity Center from the management account to a dedicated identity member account.

- [B] Create IAM users for the identity team in the management account and attach an SCP that limits them to IAM Identity Center actions.

- [C] Enable an account instance of IAM Identity Center in a member account and let the identity team manage assignments there.

- [D] Register a member account as the delegated administrator for IAM Identity Center and give the identity team access to that account only.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-idc-external-idp-scim (type: single)

A healthcare company manages its workforce identities in Okta. The company has 30 AWS accounts in AWS Organizations. Employees must sign in to AWS with their Okta credentials, and when a user or group is created or removed in Okta, the change must appear in AWS automatically. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Connect IAM Identity Center to Okta through AD Connector and synchronize the users and groups every hour.

- [B] Set Okta as the external identity provider of IAM Identity Center and enable SCIM automatic provisioning.

- [C] Keep the Identity Center directory as the identity source and export the Okta users to it with a nightly script.

- [D] Create an IAM SAML identity provider for Okta and federated IAM roles in each of the 30 accounts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-idc-facts (type: multi)

A company plans to enable IAM Identity Center for its organization in AWS Organizations. The company has workforce users in Microsoft Entra ID and a few contractors whom it wants to create directly in AWS. A solutions architect is reviewing how IAM Identity Center works before designing the solution.

Which statements are true? (Choose two.)


Choose 2.

- [A] Assigning a permission set to an account creates IAM roles controlled by IAM Identity Center in that account.

- [B] An account instance of IAM Identity Center can assign permission sets in all member accounts of the organization.

- [C] Assigning a permission set to a user creates an IAM user with the same name in each target account.

- [D] The organization can have only one identity source at a time in IAM Identity Center.

- [E] The AWS account session duration of a permission set cannot be longer than one hour.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-idc-multi-account-sso (type: single)

A retail company manages 40 AWS accounts in AWS Organizations with all features enabled. Employees currently sign in to each account with a separate IAM user. The company wants employees to sign in once and access the accounts they need with permissions that match their job function. The solution must use temporary credentials and have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create IAM users in a central account and create a cross-account IAM role in each of the 40 accounts for each job function.

- [B] Keep one IAM user per employee in each account and enforce a strong password policy and MFA in every account.

- [C] Enable an organization instance of IAM Identity Center and assign permission sets to groups for the required accounts.

- [D] Enable an account instance of IAM Identity Center in each member account and create the users in each instance.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-kms-cross-account-read (type: single)

A company stores reports in an Amazon S3 bucket in a data account. The objects are encrypted with SSE-KMS by using a customer managed key in the data account. An analytics IAM role in a separate analytics account has an identity-based policy that allows s3:GetObject on the bucket, and the bucket policy allows the role to read the objects. Requests from the role fail with an access denied error. The data must stay encrypted with the same customer managed key.

Which solution will resolve the issue?


- [A] Add a statement that allows kms:Decrypt by the analytics role to the bucket policy in the data account.

- [B] Allow the role in the key policy, and remove the identity-based policy from the analytics role.

- [C] Add kms:Decrypt on the key to the identity-based policy of the analytics role, and change nothing else.

- [D] Allow the role in the key policy, and add kms:Decrypt on the key to the role's identity-based policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-lambda-least-privilege (type: single)

An e-commerce company has an AWS Lambda function that writes order records to an Amazon DynamoDB table named Orders. The function only adds new items; it never reads, updates or deletes items. The account contains several other DynamoDB tables. The security team requires the function's permissions to follow the principle of least privilege.

Which permissions should the function's execution role have?


- [A] Allow dynamodb:PutItem on all resources ("*").

- [B] Allow dynamodb:* on the ARN of the Orders table.

- [C] Allow dynamodb:PutItem on the ARN of the Orders table.

- [D] The AmazonDynamoDBFullAccess AWS managed policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-local-zone-latency (type: single)

A visual effects studio in Los Angeles runs its rendering pipeline in a VPC in the US West (Oregon) Region. Artists in Los Angeles need virtual workstations on Amazon EC2 with single-digit millisecond latency from the studio's broadband and AWS Direct Connect connections. The workstations must stay in the existing VPC and be managed with the same AWS APIs, and the studio does not want to host or maintain AWS hardware.

Which solution will meet these requirements?


- [A] Order an AWS Outposts rack for the studio and create a subnet on the Outpost for the workstations.

- [B] Create a subnet in an AWS Wavelength Zone and connect the workstations through a carrier gateway.

- [C] Keep the workstations in the Oregon Region and put an Amazon CloudFront distribution in front of them.

- [D] Enable the Los Angeles Local Zone and create a subnet in it in the existing VPC for the workstations.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-managed-policy-versions (type: single)

A company attaches the same set of permissions to 20 IAM roles used by different applications. Changes to the permissions are made several times each month. When a change breaks an application, administrators must be able to return all 20 roles to the previous permissions in one step.

Which solution will meet these requirements?


- [A] Attach the closest AWS managed policy to the roles and set its previous version as the default when needed.

- [B] Store the permissions as an inline policy on each role and keep a copy of each version in a Git repository.

- [C] Attach one customer managed policy to the 20 roles and set an earlier policy version as the default to roll back.

- [D] Put the permissions in an SCP attached to the account and detach the SCP when a change causes a problem.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-mfa-get-session-token (type: single)

A company stores audit evidence in an Amazon S3 bucket. The bucket policy denies s3:DeleteObject unless the request is authenticated with MFA. A small group of auditors use IAM users with virtual MFA devices and run scripts with the AWS CLI in the same account as the bucket. The auditors must be able to delete objects from their scripts when needed.

How should the auditors obtain credentials for their scripts?


- [A] Use the IAM users' access keys directly, because MFA devices are already assigned to the users.

- [B] Sign in to the console with MFA and copy the console session cookie into the CLI configuration.

- [C] Call sts:GetFederationToken with the MFA device ARN, then use the returned federated user credentials.

- [D] Call sts:GetSessionToken with the MFA device ARN and a current code, and use the temporary credentials.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-mgmt-account-practices (type: multi)

A company is creating an organization in AWS Organizations for 60 accounts. A solutions architect must define how the management account will be used so that the organization follows AWS best practices for the management account.

Which actions should the solutions architect take? (Choose two.)


Choose 2.

- [A] Host the shared application databases in the management account so that all accounts can reach them.

- [B] Register member accounts as delegated administrators for supported services such as IAM Identity Center.

- [C] Deploy workloads only in member accounts and keep in the management account only what must be managed there.

- [D] Give every developer read-only access to the management account so that they can view consolidated billing.

- [E] Attach an SCP to the management account to restrict what its administrators and roles can do.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-oidc-ci-pipeline (type: single)

A software company runs its CI/CD workflows on GitHub Actions. The workflows deploy static website files to an Amazon S3 bucket. Today, the workflows use the access keys of an IAM user that are stored as repository secrets. The security team wants to remove all long-term AWS credentials from the pipeline. The company does not operate a certificate authority.

Which solution will meet these requirements?


- [A] Configure IAM Roles Anywhere with a trust anchor and issue a certificate to each workflow runner.

- [B] Rotate the IAM user's access keys every 30 days with an AWS Lambda function that updates the repository secrets.

- [C] Create an IAM OIDC identity provider for GitHub and an IAM role that the workflows assume with their OIDC token.

- [D] Create an Amazon Cognito user pool for the workflows and grant the user pool access to the bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-opt-in-region (type: single)

A logistics company in Dubai wants to deploy a new application in the Middle East (UAE) Region to keep latency low for local users. In an existing AWS account, a solutions architect cannot launch any resources in this Region, although the same IAM permissions work in the US East (N. Virginia) Region.

What should the solutions architect do first?


- [A] Activate the AWS STS Regional endpoint for the Region in the IAM account settings.

- [B] Request a service quota increase for Amazon EC2 instances in the Middle East (UAE) Region.

- [C] Create a new AWS account in AWS GovCloud (US) and deploy the application there.

- [D] Enable the Middle East (UAE) Region for the account because it is an opt-in Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-org-trail-all-accounts (type: single)

A financial services company has 25 AWS accounts in an organization in AWS Organizations. The security team must record the API activity of every account, including accounts that are added later, in one central Amazon S3 bucket. Administrators of member accounts must not be able to stop the logging or change its configuration.

Which solution will meet these requirements?


- [A] Use the CloudTrail event history of each account and export the events to the central S3 bucket every day.

- [B] Create an AWS CloudTrail organization trail from the management account and deliver the logs to the central S3 bucket.

- [C] Create an AWS Config aggregator in the management account that collects the configuration items of all accounts.

- [D] Create a CloudTrail trail in each member account that delivers to the central S3 bucket, and attach an IAM policy that denies CloudTrail changes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-outposts-onprem (type: single)

A hospital group runs imaging systems in its own data center. A new application must process the images with very low latency to these on-premises systems, and patient data must be processed and stored on the hospital's premises. The IT team wants to run Amazon EC2 and Amazon RDS with the same AWS APIs and tools that it uses in its VPC in the Region.

Which solution will meet these requirements?


- [A] Deploy the EC2 and RDS resources in the nearest Region and connect the data center with AWS Direct Connect.

- [B] Install an AWS Outposts rack in the hospital data center and create Outpost subnets for the resources.

- [C] Deploy the EC2 and RDS resources in a Wavelength Zone of the hospital's mobile network operator.

- [D] Deploy the EC2 and RDS resources in the AWS Local Zone that is closest to the hospital's location.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-policy-evaluation-facts (type: multi)

A solutions architect is designing the authorization model for a single AWS account that uses IAM users, groups, roles, identity-based policies and Amazon S3 bucket policies. The architect needs to explain how IAM evaluates requests inside this account to the development teams.

Which statements are correct? (Choose two.)


Choose 2.

- [A] An action is allowed when an identity-based policy, a resource-based policy or both allow it, unless it is explicitly denied.

- [B] A request is allowed only if both the identity-based policy and the bucket policy allow it.

- [C] A permissions boundary attached to a user grants the permissions that it lists.

- [D] An explicit deny in any applicable policy overrides any allow.

- [E] A user's permissions are the sum of the permissions of every role that the user can assume.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-1a-policy-generation (type: single)

A development team gave a new IAM role broad AWS managed policies while it built an application. The application has now run in a test account for two months, and AWS CloudTrail has logged all its activity. The security team wants to replace the broad policies with a policy that grants only the services and actions that the application actually used, with the LEAST effort.

Which solution will meet these requirements?


- [A] Download the IAM credential report and write a policy from the services listed for the role.

- [B] Create an AWS Config rule that flags the AWS managed policies that are attached to the role.

- [C] Review the AWS Trusted Advisor security checks and remove the policies that they report as risky.

- [D] Use IAM Access Analyzer to generate a policy from the role's CloudTrail activity, and test it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-1a-principalorgid-bucket (type: single)

A company has an Amazon S3 bucket in a shared-services account that stores approved software packages. IAM roles in every account of the company's organization in AWS Organizations must be able to download the packages. The company creates new accounts every month and does not want to update the bucket policy when an account is added. Principals outside the organization must not have access.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Allow all principals in the bucket policy with a condition on the aws:SourceIp key that lists the corporate IP ranges.

- [B] Create an IAM user group in each account and name these groups as principals in the bucket policy.

- [C] List the account ID of every member account in the Principal element of the bucket policy.

- [D] Allow s3:GetObject in the bucket policy with a condition on the aws:PrincipalOrgID key set to the organization ID.

ANSWER FORMAT: {"optionId": "<letter>"}
