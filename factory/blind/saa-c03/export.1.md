## saac03-4a-abort-mpu-expire (type: multi)

A company uses an Amazon S3 bucket without versioning as a landing zone for uploads from its mobile apps. Objects must be deleted 90 days after they are created. S3 Storage Lens shows that many multipart uploads were started but never completed, and their parts are still billed.

Which combination of S3 Lifecycle actions will meet these requirements? (Choose two.)


Choose 2.

- [A] A Transition action to S3 Glacier Flexible Retrieval after 90 days

- [B] A NoncurrentVersionExpiration action with NoncurrentDays set to 90

- [C] An Expiration action that expires objects 90 days after creation

- [D] An ExpiredObjectDeleteMarker action

- [E] An AbortIncompleteMultipartUpload action set to 7 days after initiation

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-activate-cost-tags (type: single)

A company uses AWS Organizations with consolidated billing. Developers in every member account tag their resources with a CostCenter tag. The finance team opens AWS Cost Explorer from the management account but cannot group or filter costs by CostCenter.

Which action will make the tag available for cost reporting?


- [A] Activate CostCenter as a user-defined cost allocation tag in the Billing console of the management account.

- [B] Enable hourly granularity in Cost Explorer for all member accounts of the organization.

- [C] Activate CostCenter as a cost allocation tag in the Billing console of each member account.

- [D] Create a tag policy in AWS Organizations that requires the CostCenter tag on all resources.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-aggregate-small-files (type: single)

A law firm must archive 300 million scanned document files that average 8 KB each. The files must be retained for 10 years and will be retrieved only in rare legal cases, when retrieving a whole case folder within 48 hours is acceptable. The firm wants the LOWEST total cost for uploading and storing the archive.

Which solution will meet these requirements?


- [A] Upload each file to S3 Intelligent-Tiering and activate the Deep Archive Access tier for the bucket.

- [B] Upload each file individually to S3 Glacier Deep Archive by setting the storage class in each PUT request.

- [C] Bundle the files of each case folder into compressed archives of several GB and upload the archives to S3 Glacier Deep Archive.

- [D] Upload each file to S3 Standard and add a lifecycle rule that transitions objects to S3 Glacier Deep Archive after 1 day.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-auto-growing-storage (type: multi)

A company is choosing storage for new workloads and wants to avoid capacity planning. Storage must grow automatically as data is added, with no allocated size, maximum storage threshold or scaling automation to configure.

Which two storage options meet this requirement? (Choose two.)


Choose 2.

- [A] An Amazon Aurora DB cluster volume

- [B] An Amazon EBS gp3 volume

- [C] An Amazon FSx for Windows File Server file system

- [D] An Amazon EFS file system

- [E] An Amazon RDS for MySQL DB instance

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-backup-central-org (type: single)

A company runs workloads on Amazon EC2, Amazon RDS, Amazon DynamoDB and Amazon EFS in 20 AWS accounts that belong to one organization in AWS Organizations. Each team currently maintains its own backup scripts. The company wants consistent daily backups with 35-day retention in every account and wants to manage backups from a central place with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Deploy AWS Lambda functions in each account that create snapshots daily and delete old snapshots.

- [B] Deploy AWS Config rules that detect resources without recent backups and notify each team.

- [C] Create Amazon Data Lifecycle Manager policies in each account that back up all the resources daily.

- [D] Use AWS Backup with backup policies in AWS Organizations that apply the same backup plan to all accounts.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-backup-cold-storage (type: single)

A company uses AWS Backup to protect an Amazon EFS file system. Compliance rules require daily backups kept for 30 days and monthly backups kept for 7 years. Monthly backups are rarely restored. The company wants to minimize backup storage costs.

Which backup plan configuration will meet these requirements MOST cost-effectively?


- [A] One rule that creates daily backups, moves each backup to cold storage after 1 day, and deletes it after 7 years.

- [B] A daily rule with 30-day retention in warm storage, and a monthly rule that moves backups to cold storage after 30 days and deletes them after 7 years.

- [C] A daily rule with 30-day retention, and a monthly rule that copies each backup to an S3 bucket with a lifecycle rule to S3 Glacier Deep Archive.

- [D] A daily rule that moves backups to cold storage after 7 days and deletes them after 30 days, and a monthly rule kept in warm storage for 7 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-budget-action-stop (type: single)

A startup runs its development Amazon EC2 instances in a dedicated AWS account. The monthly cost of the development environment must stay under $3,000. When the forecasted monthly cost reaches 90% of that amount, the development instances must be stopped automatically. The solution must have the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an Amazon CloudWatch billing alarm that invokes an AWS Lambda function that stops the instances.

- [B] Review the AWS Cost Explorer forecast every morning and stop the instances manually when the threshold is reached.

- [C] Configure AWS Cost Anomaly Detection to send alerts to an Amazon SNS topic that the developers subscribe to.

- [D] Create a cost budget in AWS Budgets with a budget action that automatically stops the instances at the forecasted threshold.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-cloudfront-public-downloads (type: single)

A software company distributes installer files from an Amazon S3 bucket in us-east-1 to anonymous users around the world. The same few files are downloaded millions of times each month, and S3 data transfer out and GET requests have become the largest items on the bill. The files must remain downloadable by anyone without AWS credentials.

Which solution is the MOST cost-effective?


- [A] Serve the files through an Amazon CloudFront distribution that uses the bucket as its origin with origin access control.

- [B] Change the storage class of the files to S3 Standard-IA to lower the cost of the bucket.

- [C] Enable Requester Pays on the bucket so that the users who download the files pay for the transfer.

- [D] Enable S3 Transfer Acceleration on the bucket and publish download links that use the accelerate endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-compute-optimizer-ebs (type: single)

A company has 1,500 Amazon EBS volumes in several AWS accounts. The operations team suspects that many volumes are over-provisioned in size or IOPS. The team wants recommendations for the right volume type, size and IOPS based on actual utilization, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Opt in to AWS Compute Optimizer and review its Amazon EBS volume recommendations.

- [B] Export the Amazon CloudWatch metrics of every volume and analyze them in a spreadsheet.

- [C] Create AWS Budgets usage budgets for EBS storage in each account.

- [D] Configure Amazon S3 Storage Lens to report the utilization of each EBS volume.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-consolidated-billing-benefits (type: multi)

A company has six AWS accounts that are billed separately. Each account buys its own Amazon EC2 Reserved Instances: some accounts have unused reservations, while others pay On-Demand rates for the same instance types. The company plans to create an organization in AWS Organizations and to move all six accounts into it with consolidated billing.

Which two benefits will consolidated billing provide? (Choose two.)


Choose 2.

- [A] Member accounts receive the AWS Business Support plan at no additional cost.

- [B] Usage from all accounts is combined, so volume pricing tiers are reached sooner.

- [C] The service quotas of all member accounts are pooled into one shared quota.

- [D] The resources of all member accounts are moved into the management account.

- [E] Unused Reserved Instance discounts of one account can apply to matching usage in other accounts.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-cur-athena (type: single)

The finance team of an e-commerce company needs line-item cost and usage data at hourly granularity, including resource IDs, so that analysts can run SQL queries and join the data with internal chargeback tables. The data must be delivered automatically to an Amazon S3 bucket every day.

Which solution will meet these requirements?


- [A] Create a Cost and Usage Report 2.0 export in AWS Data Exports to the S3 bucket and query it with Amazon Athena.

- [B] Configure AWS Cost Anomaly Detection with an Amazon SNS subscription that sends daily alerts.

- [C] Download monthly cost reports as CSV files from AWS Cost Explorer and upload them to the S3 bucket.

- [D] Configure AWS Budgets reports that are sent every day to the finance team by email.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-datasync-nfs-efs (type: single)

A company is migrating 150 TB of engineering data from an on-premises NFS file server to Amazon EFS. The data changes every day, so the company needs an initial full copy followed by repeated copies of only the changed data until the cutover weekend. File ownership, permissions and timestamps must be preserved, and the transfer must be encrypted. The company has a 10 Gbps AWS Direct Connect connection.

Which service should the company use?


- [A] AWS Transfer Family with an SFTP server that stores files in the EFS file system

- [B] AWS DataSync with an agent on premises and scheduled tasks to the EFS file system

- [C] AWS Database Migration Service with a full load and ongoing replication task

- [D] Amazon S3 File Gateway with an NFS share, followed by a copy from S3 to EFS

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-dlm-snapshot-archive (type: single)

A company must keep one snapshot per month of each Amazon EBS data volume for 5 years to satisfy auditors. These monthly snapshots are almost never restored, and a slow restore is acceptable. Daily snapshots, which are restored more often, must be kept for 7 days. The company wants to automate the snapshot lifecycle and minimize snapshot storage costs.

Which solution will meet these requirements?


- [A] A monthly AWS Lambda function that copies the snapshots to an S3 bucket with a lifecycle rule to S3 Glacier Deep Archive.

- [B] A Data Lifecycle Manager policy with a daily schedule retained for 7 days, and a monthly schedule that archives its snapshots to EBS Snapshots Archive for 5 years.

- [C] A Data Lifecycle Manager policy with a daily schedule retained for 5 years in the standard tier, with fast snapshot restore enabled.

- [D] A Data Lifecycle Manager policy whose daily schedule archives each snapshot to EBS Snapshots Archive for 7 days, and whose monthly schedule keeps snapshots in the standard tier for 5 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-dms-to-s3 (type: single)

A retail company wants to build a data lake in Amazon S3 from its on-premises Microsoft SQL Server sales database. After an initial load, changes must be replicated continuously so that the data lake stays current. The source database must stay online for the store applications.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Deploy Amazon S3 File Gateway and share a folder where the database writes its backup files.

- [B] Use AWS DataSync to copy the database data files to the S3 bucket every hour.

- [C] Export the tables to CSV files every night and upload them with AWS Transfer Family.

- [D] Use AWS Database Migration Service with a full load and ongoing replication task to an S3 target endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-ebs-shrink (type: single)

A company provisioned a 4 TiB Amazon EBS gp3 data volume for a file-processing application. After six months, the volume holds only 600 GiB of data, and growth is expected to stay below 100 GiB per year. The company wants to stop paying for the unused capacity.

Which solution will meet this requirement?


- [A] Create a new 1 TiB gp3 volume, copy the data with a file-level copy tool, and delete the original volume.

- [B] Use Elastic Volumes to reduce the volume size to 1 TiB while the volume stays attached.

- [C] Change the volume type to General Purpose SSD (gp2), which bills only for the data written.

- [D] Opt in to AWS Compute Optimizer so that it resizes the volume automatically to match the data.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-ebs-st1-throughput (type: single)

A company runs a log-processing application on an Amazon EC2 instance. Every night, the application reads 12 TiB of log files sequentially in large blocks and needs about 400 MiB/s of throughput. The logs are stored on a dedicated data volume, not on the boot volume. The company wants the lowest storage cost that meets the throughput requirement.

Which Amazon EBS volume type should the company use for the data volume?


- [A] General Purpose SSD (gp3) with 400 MiB/s of provisioned throughput

- [B] Cold HDD (sc1)

- [C] Throughput Optimized HDD (st1)

- [D] Provisioned IOPS SSD (io2 Block Express)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-efs-lifecycle-tiers (type: single)

A company stores engineering project files on an Amazon EFS Regional file system that uses Elastic throughput. Files are actively used for about 4 weeks, are then opened a few times a quarter for about 2 months, and after that are opened a few times a year or less. Users must keep accessing every file through the same mount path. The company wants to lower storage costs with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Run a nightly cron job on an EC2 instance that compresses files older than 90 days in place on the file system.

- [B] Use AWS DataSync to move files older than 30 days to an S3 bucket with a lifecycle rule to S3 Glacier Deep Archive.

- [C] Create an EFS One Zone file system and copy the files to it with AWS DataSync, then delete the Regional file system.

- [D] Configure EFS lifecycle management to move files to EFS Infrequent Access after 30 days and to EFS Archive after 90 days without access.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-efs-shared-posix (type: single)

A company runs a content management system on 12 Linux Amazon EC2 instances spread across three Availability Zones. All instances must read and write the same files concurrently through a POSIX-compliant file system, and the storage must grow automatically as content is added.

Which solution will meet these requirements?


- [A] Instance storage: instance store volumes synchronized every hour

- [B] Block storage: one Amazon EBS gp3 volume attached to each instance

- [C] Object storage: an Amazon S3 bucket accessed through the S3 API

- [D] File storage: an Amazon EFS file system mounted on every instance

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-explorer-and-budgets (type: multi)

The cloud center of excellence of a company has two requirements. Managers must explore the last 12 months of spend in graphs, grouped by service and by member account, without building a data pipeline. Each project owner must receive an email when the forecasted monthly cost of the project's tagged resources is going to exceed a fixed amount.

Which combination of AWS tools will meet these requirements with the LEAST operational overhead? (Choose two.)


Choose 2.

- [A] AWS Budgets

- [B] AWS CloudTrail Lake

- [C] AWS Cost and Usage Report queried with Amazon Athena

- [D] AWS Cost Anomaly Detection

- [E] AWS Cost Explorer

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-express-one-zone (type: single)

A machine learning team trains models on Amazon EC2 instances in a single Availability Zone. Each training run reads the same 30 TB dataset of small files thousands of times per second, and S3 request costs and read latency have become significant. The training dataset is a copy that can be recreated at any time from a master bucket in S3 Standard.

Which storage option for the training copy will reduce request costs and latency the MOST?


- [A] An S3 Intelligent-Tiering bucket with the optional archive access tiers activated

- [B] An S3 Standard bucket with S3 Transfer Acceleration enabled

- [C] An S3 One Zone-IA bucket in the same Region as the training instances

- [D] An S3 Express One Zone directory bucket in the same Availability Zone as the training instances

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-fsx-lustre-scratch (type: single)

A biotech company runs a weekly genome analysis job on a fleet of Linux Amazon EC2 instances. The job reads 50 TB of input data from an Amazon S3 bucket, needs a shared POSIX file system with sub-millisecond latency and very high aggregate throughput, and writes its results back to S3. The file system is needed only during the 12-hour job, and the data can be reloaded from S3 if a file server fails.

Which solution is the MOST cost-effective?


- [A] Amazon EBS io2 Block Express volumes shared by the instances with Multi-Attach

- [B] An Amazon FSx for Lustre scratch file system linked to the bucket, created for each job and deleted afterward

- [C] An Amazon EFS file system with Provisioned Throughput, kept running between jobs

- [D] An Amazon FSx for Lustre persistent file system with SSD storage, kept running between jobs

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-fsx-ontap-multiprotocol (type: single)

A media company is moving an on-premises NetApp storage array to AWS. Linux render nodes must keep accessing the project files over NFS, and Windows editing workstations must keep accessing the same files over SMB. About 70% of the data is rarely accessed after a project ends, but it must stay in the same folders and remain readable without a restore step. The company wants a fully managed service that keeps the cold data on lower-cost storage automatically.

Which solution will meet these requirements?


- [A] Amazon FSx for Windows File Server with HDD storage, mapped by the Linux render nodes over SMB

- [B] Amazon S3 File Gateway on Amazon EC2 with an S3 Lifecycle rule to S3 Glacier Deep Archive

- [C] Amazon FSx for NetApp ONTAP with automatic tiering of cold data to the capacity pool tier

- [D] Amazon EFS with lifecycle management to EFS Infrequent Access and EFS Archive

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-fsx-windows-smb (type: single)

A company is migrating a Windows-based document management application to AWS. The application servers run Windows Server, store documents in shared folders accessed over SMB, and use Microsoft Active Directory groups to control access to the folders. The company wants a fully managed file storage service.

Which storage service will meet these requirements?


- [A] Amazon S3 with a bucket policy for each Active Directory group

- [B] Amazon FSx for Windows File Server joined to the Active Directory domain

- [C] Amazon FSx for Lustre linked to an Amazon S3 bucket

- [D] Amazon EFS with an EFS access point for each application server

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-glacier-flexible-hours (type: single)

A satellite imaging company keeps raw imagery in Amazon S3 for 5 years. The imagery is retrieved once or twice a year for reprocessing, and the reprocessing pipeline needs the data to be available within 6 hours of a request. Millisecond access is not required.

Which storage class is the MOST cost-effective?


- [A] S3 Standard-IA

- [B] S3 Glacier Deep Archive

- [C] S3 Glacier Instant Retrieval

- [D] S3 Glacier Flexible Retrieval

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-glacier-instant-images (type: single)

A hospital stores medical images in Amazon S3. Images older than 1 year are accessed about once a quarter, but when a doctor requests one, it must be displayed within milliseconds. The images must be stored across multiple Availability Zones.

Which storage class is the MOST cost-effective for images older than 1 year?


- [A] S3 Glacier Flexible Retrieval

- [B] S3 Standard-IA

- [C] S3 Glacier Instant Retrieval

- [D] S3 One Zone-IA

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-gp2-to-gp3 (type: single)

A company has 200 Amazon EBS General Purpose SSD (gp2) volumes of 500 GiB attached to running Amazon EC2 instances. Monitoring shows that no volume ever exceeds 2,500 IOPS or 100 MiB/s. The company wants to reduce storage costs without downtime and without lowering performance.

Which solution will meet these requirements?


- [A] Modify the volumes to Provisioned IOPS SSD (io1) with 2,500 provisioned IOPS each.

- [B] Modify the volumes to General Purpose SSD (gp3) with Elastic Volumes, keeping the baseline gp3 performance.

- [C] Modify the volumes to Cold HDD (sc1) with Elastic Volumes while they stay attached.

- [D] Create snapshots, restore them as gp3 volumes, and swap the volumes during a maintenance window.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-instance-store-scratch (type: single)

A video transcoding fleet runs on Amazon EC2 instances. During each job, an instance writes hundreds of GB of intermediate files to local disk, needs the highest possible random I/O performance, and discards the files when the job ends. Source and output files are stored in Amazon S3, so losing the intermediate files if an instance stops is acceptable.

Which storage option is the MOST cost-effective for the intermediate files?


- [A] Amazon EBS Provisioned IOPS SSD (io2 Block Express) volumes attached to each instance

- [B] A shared Amazon EFS file system with Provisioned Throughput

- [C] An S3 Express One Zone directory bucket in the same Availability Zone

- [D] Instance store volumes on an instance type that includes local NVMe SSD storage

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-intelligent-tiering-unknown (type: single)

A media company stores 2 PB of video clips, each between 50 MB and 2 GB, in Amazon S3. Some clips become popular again months after upload, while others are never accessed, and the company cannot predict which. The company wants to reduce storage costs automatically, with no retrieval fees and no latency impact when an old clip suddenly becomes popular.

Which storage class should the company use?


- [A] S3 Glacier Instant Retrieval

- [B] S3 Standard-IA

- [C] S3 One Zone-IA

- [D] S3 Intelligent-Tiering

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-internet-upload-cost (type: single)

A company must move 8 TB of archived project files from its data center to an Amazon S3 bucket within the next 2 weeks. This is a one-time transfer. The data center has a 1 Gbps internet connection that is mostly idle, and the bucket is in the AWS Region closest to the data center.

Which solution is the MOST cost-effective?


- [A] Order an AWS Direct Connect dedicated connection and transfer the files over it.

- [B] Create an AWS Site-to-Site VPN connection and upload the files through the VPN tunnels.

- [C] Upload the files over the existing internet connection with multipart uploads to the bucket.

- [D] Enable S3 Transfer Acceleration and upload the files through the accelerate endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-io2-100k-iops (type: single)

A company runs a self-managed database on a Nitro-based Amazon EC2 instance. The database needs a single Amazon EBS volume that sustains 100,000 IOPS with consistent sub-millisecond latency. The volume must offer the highest durability of the EBS volume types.

Which volume configuration will meet these requirements?


- [A] A Provisioned IOPS SSD (io1) volume provisioned with 100,000 IOPS

- [B] A Throughput Optimized HDD (st1) volume of the maximum size

- [C] A General Purpose SSD (gp3) volume provisioned with 100,000 IOPS

- [D] A Provisioned IOPS SSD (io2 Block Express) volume provisioned with 100,000 IOPS

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-it-deep-archive-tier (type: single)

A research company stores 5 PB of experiment data in S3 Intelligent-Tiering. Many objects are not accessed for more than 6 months, but any object can be needed again without warning. The analysis application can be updated to restore objects, and it can wait up to 12 hours for an object that has not been accessed for 6 months or more. The company wants to lower costs further while keeping tiering automatic and based on actual access.

Which solution will meet these requirements?


- [A] Move the objects to S3 Standard-IA and use S3 Storage Class Analysis to find the objects to archive.

- [B] Add an S3 Lifecycle rule that transitions all objects to S3 Glacier Deep Archive 180 days after creation.

- [C] Activate the Deep Archive Access tier in the bucket's Intelligent-Tiering configuration for objects not accessed for 180 days.

- [D] Add an S3 Lifecycle rule that transitions all objects to S3 Glacier Flexible Retrieval 180 days after creation.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-multipart-abort (type: multi)

A video production company uploads raw footage files of 20 GB to 80 GB from its studio to an Amazon S3 bucket in the nearest Region over a 10 Gbps connection. Uploads are slow because each file is sent as a single stream, and when the connection drops, the whole file is sent again. The company also pays storage charges for uploads that were started but never completed. The company wants faster, more resilient uploads and wants to stop paying for abandoned uploads, at the lowest cost.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Enable S3 Transfer Acceleration on the bucket and upload through the accelerate endpoint.

- [B] Add an S3 Lifecycle rule with the AbortIncompleteMultipartUpload action.

- [C] Use multipart upload with parts sent in parallel, so that only failed parts are sent again.

- [D] Run an S3 Batch Operations copy job on each file after it is uploaded.

- [E] Add an S3 Lifecycle rule that expires objects 7 days after creation.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-noncurrent-versions (type: single)

A company stores configuration files in an Amazon S3 bucket that has versioning enabled. The files are overwritten many times each day, and noncurrent versions now account for 90% of the bucket's storage. The company must always be able to roll back a file to any of its three most recent previous versions. Other previous versions are not needed once they have been noncurrent for 30 days.

Which S3 Lifecycle configuration will meet these requirements?


- [A] An Expiration action that expires current versions 30 days after creation

- [B] A NoncurrentVersionTransition action to S3 Glacier Deep Archive after 30 days

- [C] An ExpiredObjectDeleteMarker action combined with suspending versioning on the bucket

- [D] A NoncurrentVersionExpiration action with NoncurrentDays set to 30 and NewerNoncurrentVersions set to 3

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-object-lock-deep-archive (type: multi)

A brokerage firm must retain trade confirmation records in Amazon S3 for 7 years in a write-once-read-many (WORM) form that no user, including the root user, can delete or overwrite during the retention period. The records are almost never read after 30 days, and a retrieval time of up to 48 hours is acceptable. The firm wants the MOST cost-effective solution.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Add an S3 Lifecycle rule that transitions the records to S3 Glacier Instant Retrieval after 30 days.

- [B] Enable S3 Object Lock on the bucket with a default retention of 7 years in compliance mode.

- [C] Add a bucket policy that denies the s3:DeleteObject action to every principal in the account.

- [D] Add an S3 Lifecycle rule that transitions the records to S3 Glacier Deep Archive after 30 days.

- [E] Enable S3 Object Lock on the bucket with a default retention of 7 years in governance mode.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-one-zone-ia-thumbnails (type: single)

A photo-sharing company generates thumbnails of about 500 KB from original images that are stored in S3 Standard. Thumbnails older than 60 days are accessed about once a month, must load in milliseconds, and can be regenerated from the originals if they are lost.

Which storage class is the MOST cost-effective for these thumbnails?


- [A] S3 Glacier Flexible Retrieval

- [B] S3 Express One Zone

- [C] S3 Standard-IA

- [D] S3 One Zone-IA

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-rds-pitr-cross-region (type: single)

A company runs a production database on Amazon RDS for MySQL. The company must be able to restore the database to any second within the last 14 days. In addition, one backup per month must be kept for 1 year in a second AWS Region for disaster recovery. The company wants to manage both requirements in one place with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] An Amazon Data Lifecycle Manager policy that takes monthly snapshots of the DB instance and copies them to the second Region.

- [B] An AWS Backup plan with a continuous backup rule retained for 14 days and a monthly rule that copies each backup to the second Region with 1-year retention.

- [C] An AWS Backup plan with a continuous backup rule retained for 1 year that copies the continuous backups to the second Region.

- [D] A cross-Region read replica of the DB instance in the second Region, kept for 1 year.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-rds-storage-autoscaling (type: single)

A company runs an Amazon RDS for PostgreSQL DB instance with 500 GiB of allocated gp3 storage. Data growth is unpredictable, and last month the database ran out of space during a large import, which caused an outage. The company wants storage to grow automatically when free space runs low, up to a limit of 2 TiB, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a CloudWatch alarm on FreeStorageSpace that invokes a Lambda function that modifies the allocated storage.

- [B] Enable RDS storage autoscaling on the DB instance and set the maximum storage threshold to 2 TiB.

- [C] Modify the DB instance now to allocate 2 TiB of storage so that it never runs out of space.

- [D] Create a read replica and promote it whenever the primary DB instance runs low on storage.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-requester-pays-partners (type: single)

A genomics research institute stores a 400 TB reference dataset in an Amazon S3 bucket. Partner universities download large parts of the dataset from their own AWS accounts, and the institute's request and data transfer charges have grown sharply. The institute wants each partner to pay for the requests and downloads that it generates, while the institute continues to pay only for storage.

Which solution will meet these requirements?


- [A] Enable S3 Transfer Acceleration on the bucket and have the partners download through the accelerate endpoint.

- [B] Enable Requester Pays on the bucket and have the partners send authenticated requests that acknowledge the charges.

- [C] Generate presigned URLs for the objects and send them to each partner every week.

- [D] Create an Amazon CloudFront distribution in front of the bucket and share its domain name with the partners.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-requester-pays-requirements (type: multi)

A market data provider publishes daily files in an Amazon S3 bucket that has Requester Pays enabled. A customer is building an application in its own AWS account that downloads the files every day. The downloads must succeed, and the request and transfer charges must be billed to the customer's account, not to the data provider.

Which combination of actions should the customer's application take? (Choose two.)


Choose 2.

- [A] Send the requests to the S3 Transfer Acceleration endpoint of the bucket.

- [B] Acknowledge the charges in every request with the request payer parameter (x-amz-request-payer).

- [C] Assume an IAM role in the data provider's account before downloading the files.

- [D] Sign every request with credentials of an IAM role that belongs to the customer's account.

- [E] Download the files anonymously by using their public object URLs.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-ri-sharing-off (type: single)

A holding company manages the AWS accounts of its subsidiaries in one organization in AWS Organizations with consolidated billing. One subsidiary is being prepared for sale. Its account must stop receiving Reserved Instance and Savings Plans discounts purchased by other accounts, and its own commitments must stop benefiting other accounts. The account must stay in the organization until the sale is complete.

Which solution will meet these requirements?


- [A] Remove the subsidiary's account from the organization, then invite it back after the sale is complete.

- [B] Attach a service control policy (SCP) to the subsidiary's account that denies purchasing Reserved Instances and Savings Plans.

- [C] From the management account, deactivate Reserved Instances and Savings Plans discount sharing for the subsidiary's account.

- [D] Move the subsidiary's account into a separate organizational unit (OU) that has its own cost allocation tags.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-s3-file-gateway-nfs (type: single)

A manufacturing company has on-premises applications that write quality-control images to an NFS share. The company wants the images stored as objects in Amazon S3 so that cloud analytics services can process them, while the on-premises applications keep low-latency access to recently written files. The applications must not be changed.

Which solution will meet these requirements?


- [A] Deploy Tape Gateway and configure the applications to write the images to virtual tapes.

- [B] Deploy Amazon S3 File Gateway on premises and expose an NFS file share backed by the S3 bucket.

- [C] Deploy Volume Gateway with cached volumes and mount the volumes over iSCSI on the application servers.

- [D] Create an AWS Transfer Family SFTP server and configure the applications to upload the images over SFTP.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-s3-gateway-endpoint (type: single)

A data processing application runs on Amazon EC2 instances in private subnets of a VPC. Every day, the instances write about 20 TB of output files to an Amazon S3 bucket in the same Region through a NAT gateway, and the NAT gateway data processing charges are now the largest cost of the workload. The instances must not become reachable from the internet.

Which solution will reduce this cost the MOST?


- [A] Deploy one NAT gateway in each Availability Zone so that traffic does not cross Availability Zones.

- [B] Create an interface VPC endpoint for Amazon S3 in each Availability Zone used by the private subnets.

- [C] Create a gateway VPC endpoint for Amazon S3 and associate it with the route tables of the private subnets.

- [D] Move the instances to public subnets and send the S3 traffic through an internet gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-s3-lifecycle-logs (type: single)

A company stores application log files of several megabytes each in an Amazon S3 bucket. Logs are read often during their first 30 days. From day 30 to day 90, the security team reads them a few times and needs millisecond access. After 90 days, logs are kept for compliance and are almost never read, and a retrieval time of up to 48 hours is acceptable. Logs must be deleted after 7 years.

Which S3 Lifecycle design is the MOST cost-effective?


- [A] Transition to S3 Standard-IA after 30 days and to S3 Glacier Deep Archive after 90 days, then expire after 7 years.

- [B] Transition to S3 Glacier Flexible Retrieval after 30 days and to S3 Glacier Deep Archive after 90 days, then expire after 7 years.

- [C] Transition to S3 Standard-IA after 30 days and to S3 Glacier Instant Retrieval after 90 days, then expire after 7 years.

- [D] Transition to S3 One Zone-IA after 30 days and keep the logs in that class until they expire after 7 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-small-objects-standard (type: single)

An IoT analytics company stores 800 million JSON objects in S3 Standard. The objects average 20 KB. Each object is read frequently during its first month and then only occasionally, and every read must return in milliseconds. A solutions architect must decide where to keep objects that are older than 30 days.

Which option is the MOST cost-effective for these objects?


- [A] Transition them to S3 Standard-IA with a lifecycle rule that allows objects smaller than 128 KB.

- [B] Transition them to S3 Glacier Flexible Retrieval with a lifecycle rule that allows objects smaller than 128 KB.

- [C] Transition them to S3 Glacier Instant Retrieval with a lifecycle rule that allows objects smaller than 128 KB.

- [D] Keep them in S3 Standard and do not add a lifecycle transition rule.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-tape-and-stored-volumes (type: multi)

A company is reducing its data center footprint. Its backup software writes nightly backups to a physical tape library, and the company wants to replace the tapes with durable cloud storage without changing its backup workflow. Separately, a group of application servers uses iSCSI block storage; the entire dataset must stay on premises for low-latency access, with asynchronous point-in-time backups to AWS.

Which combination of solutions will meet these requirements? (Choose two.)


Choose 2.

- [A] Deploy Volume Gateway with cached volumes for the application servers.

- [B] Deploy Tape Gateway and present its virtual tape library to the backup software.

- [C] Deploy Volume Gateway with stored volumes for the application servers.

- [D] Use AWS DataSync to copy the backup files to S3 Glacier Deep Archive every night.

- [E] Deploy Amazon S3 File Gateway and give the application servers an NFS share.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4a-transfer-family-sftp (type: single)

A logistics company receives daily shipment files from 300 external partners, who upload the files over SFTP to an on-premises Linux server. The company wants to retire the server and store the files directly in Amazon S3. Partners must keep using their existing SFTP clients, and the company wants the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Deploy Amazon S3 File Gateway and give each partner an SMB share backed by the S3 bucket.

- [B] Run an SFTP server on Amazon EC2 instances in an Auto Scaling group and copy the files to S3 with a cron job.

- [C] Install an AWS DataSync agent at each partner site and schedule tasks that copy files to the S3 bucket.

- [D] Create an AWS Transfer Family server with the SFTP protocol that stores the uploaded files in the S3 bucket.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4a-vault-lock-compliance (type: single)

A financial services company uses AWS Backup to protect its production databases. After a ransomware incident at a competitor, the security team requires that no user, including the root user of the account, can delete recovery points or shorten their retention for 1 year. Once it takes effect, the protection itself must be impossible to remove.

Which solution will meet these requirements?


- [A] Apply AWS Backup Vault Lock in governance mode to the backup vault with a minimum retention of 365 days.

- [B] Copy the recovery points to an S3 bucket that has S3 Object Lock enabled in governance mode.

- [C] Attach a service control policy that denies the deletion of recovery points to all accounts in the organization.

- [D] Apply AWS Backup Vault Lock in compliance mode to the backup vault with a minimum retention of 365 days.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-activate-cost-tags (type: single)

A company uses AWS Organizations with consolidated billing. Developers in several member accounts tag every Amazon EC2 instance with a Project tag key. The finance team signs in to the management account but cannot group EC2 costs by Project in AWS Cost Explorer.

Which action will allow the finance team to view the costs by project?


- [A] Create a tag-based resource group in AWS Resource Groups for each project in each member account.

- [B] Create an AWS Config rule in each member account that requires the Project tag on every EC2 instance.

- [C] Activate the Project tag key as a user-defined cost allocation tag in the Billing and Cost Management console of the management account.

- [D] Activate the Project tag key as a user-defined cost allocation tag in the Billing and Cost Management console of each member account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-alb-path-consolidation (type: single)

A company exposes 12 HTTP-based microservices under a single domain name, with paths such as /orders and /payments. Each microservice has its own Application Load Balancer, and the hourly load balancer charges have become significant. The company wants to reduce these costs without changing the URLs that clients use.

Which solution will meet these requirements?


- [A] Use one Network Load Balancer with a separate listener port for each microservice and a target group behind each listener.

- [B] Use one Gateway Load Balancer with rules that forward each URL path to the target group of the matching microservice.

- [C] Use one Application Load Balancer with a listener rule per microservice that matches a path pattern and forwards to that microservice's target group.

- [D] Replace each Application Load Balancer with a Network Load Balancer, keeping one load balancer for each microservice.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-anomaly-detection-dynamodb (type: single)

A company's Amazon DynamoDB costs vary by season, so a fixed monthly threshold either raises false alarms or misses real problems. The company wants to be notified automatically when DynamoDB spending deviates from its normal pattern, for example after a faulty deployment causes excessive reads. The solution must require the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a cost budget for DynamoDB in AWS Budgets with a fixed alert threshold that is adjusted each month.

- [B] Create an AWS Cost Anomaly Detection monitor for AWS services with an alert subscription for the operations team.

- [C] Create a CloudWatch alarm with a static threshold on the ConsumedReadCapacityUnits metric of each table.

- [D] Export CUR 2.0 data each day and run an Amazon Athena query that compares DynamoDB costs with the previous week.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-aurora-serverless-zero-acu (type: single)

A company runs dozens of development databases on provisioned Amazon Aurora PostgreSQL-Compatible Edition DB instances that run version 16.4. Each database is used for a few hours on some workdays and is idle the rest of the time, often for days. Developers accept a short delay when they connect to an idle database. The company wants to minimize compute costs without managing start and stop schedules.

Which solution will meet these requirements?


- [A] Add an RDS Proxy in front of each database to pool connections while the databases are idle.

- [B] Convert the DB instances to Aurora Serverless v2 with a minimum capacity of 0 ACUs so that idle instances pause automatically.

- [C] Convert the DB instances to Aurora Serverless v2 with a minimum capacity of 0.5 ACUs.

- [D] Purchase Reserved DB instances for the provisioned DB instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-bare-metal-vendor-support (type: single)

A software company must run a legacy application that its vendor supports only in a non-virtualized environment. The application also needs direct access to low-level processor features. The company wants to run the application on AWS and pay only for the hours that the application runs.

Which Amazon EC2 option will meet these requirements?


- [A] An m5.4xlarge Spot Instance

- [B] An m5.metal On-Demand Instance

- [C] A c7i.4xlarge On-Demand Instance with default tenancy

- [D] An m5.4xlarge instance launched on an EC2 Dedicated Host

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-batch-single-az-placement (type: single)

A company runs a nightly simulation on a fleet of 40 Amazon EC2 instances that are spread across three Availability Zones. During each run, the instances exchange several terabytes of data with each other, and the company pays data transfer charges for this traffic. If a run fails, it can be restarted the next night, so the workload does not need to tolerate the loss of an Availability Zone.

Which solution will reduce the cost of this workload?


- [A] Launch all the instances in one Availability Zone in a cluster placement group.

- [B] Move half of the instances to a second AWS Region and connect the two VPCs with VPC peering.

- [C] Assign an Elastic IP address to each instance and send the traffic to these public addresses.

- [D] Launch the instances in a spread placement group across the three Availability Zones.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-budget-action-stop-dev (type: single)

A company has a sandbox AWS account where developers run Amazon EC2 instances for experiments. The monthly cost of the account must not exceed $2,000. When actual costs reach 90% of that amount, a known set of development instances must be stopped automatically and the account owner must be notified by email. The solution must require the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Forecast the monthly cost in AWS Cost Explorer and create an Amazon EventBridge schedule that stops the instances every Friday.

- [B] Create a cost budget in AWS Budgets with a 90% actual-cost alert to the owner and a budget action that stops the instances.

- [C] Create a CloudWatch billing alarm at $1,800 that invokes an AWS Lambda function to stop the instances and notifies the owner through Amazon SNS.

- [D] Create an AWS Cost Anomaly Detection monitor for the account with an email alert subscription for the owner.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-cloudfront-functions-headers (type: single)

A news website serves all its traffic through an Amazon CloudFront distribution and receives millions of requests per second during breaking news. The company must add security headers to every response and redirect requests for old URLs to new paths. The logic is a few lines of JavaScript, makes no network calls, and does not read the request body.

Which solution will meet these requirements MOST cost-effectively?


- [A] Add Amazon EC2 instances behind the origin load balancer to rewrite the requests and add the headers.

- [B] Associate Lambda@Edge functions with the origin request and origin response events of the distribution.

- [C] Associate CloudFront Functions with the viewer request and viewer response events of the distribution.

- [D] Place Amazon API Gateway with AWS Lambda functions between CloudFront and the origin to rewrite the traffic.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-compute-optimizer-memory (type: single)

A company uses AWS Compute Optimizer to rightsize its Amazon EC2 instances. For a fleet of memory-intensive Java applications, Compute Optimizer recommends smaller instance types, and the operations team notices that the recommendations do not take memory use into account. The team is concerned that the applications will run out of memory after downsizing.

What should a solutions architect do so that the recommendations account for actual memory use?


- [A] Use the AWS Cost Explorer rightsizing recommendations instead of Compute Optimizer.

- [B] Activate the enhanced infrastructure metrics preference to extend the lookback period to 93 days.

- [C] Enable detailed monitoring on the instances so that metrics are published at 1-minute intervals.

- [D] Install the Amazon CloudWatch agent on the instances so that they publish memory utilization metrics.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-compute-savings-plan-flex (type: single)

A company runs a steady workload 24 hours a day on Amazon EC2 instances in the eu-west-1 Region. Over the next 3 years, the company plans to move part of the workload to Amazon ECS on AWS Fargate and might move some instances to the eu-central-1 Region. The company wants the largest discount that will keep applying after these changes, without exchanging or modifying any commitment.

Which purchasing option will meet these requirements?


- [A] A 3-year EC2 Instance Savings Plan for the current instance family in eu-west-1

- [B] Spot Instances requested through an EC2 Fleet in both Regions

- [C] 3-year Standard Reserved Instances for the current instance types in eu-west-1

- [D] A 3-year Compute Savings Plan

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-consolidated-billing-benefits (type: multi)

A company has six standalone AWS accounts that each receive a separate bill. Two of the accounts have purchased Reserved Instances and Savings Plans that are often underused, while the other accounts run similar workloads at On-Demand rates. The company plans to create an organization in AWS Organizations and invite all six accounts.

Which cost benefits will the company receive from consolidated billing? (Choose two.)


Choose 2.

- [A] Reserved Instance and Savings Plans discounts bought in one account can apply to matching usage in the other accounts.

- [B] Every account in the organization receives AWS Business Support at no additional charge.

- [C] AWS Compute Optimizer recommendations are applied automatically to the instances in the member accounts.

- [D] The usage of all the accounts is combined to reach volume pricing tiers sooner.

- [E] Service control policies automatically stop idle EC2 instances in the member accounts.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-cost-categories-bu (type: single)

A company uses AWS Organizations with 40 member accounts. Database costs for Amazon RDS and Amazon DynamoDB must be reported by business unit. Some business units own entire accounts, while shared accounts identify each business unit only through a CostCenter cost allocation tag that is already activated. The finance team wants a single business unit dimension that it can use in AWS Cost Explorer and AWS Budgets.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Activate the AWS-generated aws:createdBy cost allocation tag and group the database costs by that tag in Cost Explorer.

- [B] Create a cost category in the management account with rules that map accounts and CostCenter tag values to business units.

- [C] Create a budget for each account and each CostCenter value in AWS Budgets, and combine the results in a spreadsheet each month.

- [D] Move the resources of the shared accounts into dedicated accounts for each business unit, and group the costs by linked account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-cur-hourly-athena (type: single)

A company's FinOps team must build a chargeback model that joins AWS billing data with an internal asset inventory. The team needs hourly cost line items that include the ID of each Amazon EC2 instance, and it wants to query the data with SQL without managing any servers.

Which solution will meet these requirements?


- [A] Create a cost budget for each EC2 instance in AWS Budgets and send the budget notifications to an Amazon SNS topic.

- [B] Create a CUR 2.0 export with hourly granularity and resource IDs, deliver it to Amazon S3, and query it with Amazon Athena.

- [C] Use AWS Cost Explorer with daily granularity, group the costs by linked account, and download the results as CSV files.

- [D] Enable AWS Cost Anomaly Detection for all services and query the detected anomalies with Amazon Athena.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-data-api-no-connections (type: single)

A company is building an internal tool with AWS Lambda functions that run occasional SQL queries against an Amazon Aurora PostgreSQL-Compatible Edition cluster that runs version 16.4. The security team does not want the functions to store database credentials, and the developers do not want to configure the functions for VPC access or manage connection pools. Traffic is low and irregular, so the company wants to avoid paying for any always-on component.

Which solution will meet these requirements?


- [A] Enable the RDS Data API on the cluster, store the credentials in AWS Secrets Manager, and run the SQL through the Data API.

- [B] Store the credentials in Lambda environment variables encrypted with AWS KMS, and connect directly to the cluster endpoint.

- [C] Create an RDS Proxy that reads the credentials from AWS Secrets Manager, and attach the functions to the VPC to reach the proxy.

- [D] Deploy a PgBouncer connection pooler on an EC2 instance in the VPC and route the function connections through it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-dax-hot-reads (type: single)

A retail company stores its product catalog in an Amazon DynamoDB table in provisioned capacity mode. During flash sales, a small number of popular items are read millions of times, and the company provisions very high read capacity to avoid throttling. The application tolerates eventually consistent reads and needs microsecond read latency for these items. The company wants to reduce read capacity costs with minimal application changes.

Which solution will meet these requirements?


- [A] Switch the table to on-demand capacity mode.

- [B] Create a global secondary index that contains only the popular items, and read from the index.

- [C] Deploy an Amazon ElastiCache cluster and rewrite the data access layer to use a cache-aside pattern.

- [D] Deploy a DynamoDB Accelerator (DAX) cluster and point the application's DynamoDB client to the DAX endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-downsize-same-family (type: single)

A company runs an internal application on an m6i.4xlarge instance (16 vCPUs, 64 GiB of memory). Over the last 4 weeks, peak CPU use was the equivalent of 1.6 vCPUs and peak memory use was 8 GiB, and the workload is not expected to grow. The application needs consistent CPU performance, and peak CPU and memory utilization must stay below 70% of the instance's capacity.

Which instance type will meet these requirements MOST cost-effectively?


- [A] m6i.xlarge (4 vCPUs, 16 GiB of memory)

- [B] m6i.2xlarge (8 vCPUs, 32 GiB of memory)

- [C] m6i.large (2 vCPUs, 8 GiB of memory)

- [D] r6i.xlarge (4 vCPUs, 32 GiB of memory)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-dynamodb-rcu-calc (type: single)

A company is designing an Amazon DynamoDB table in provisioned capacity mode. Each item is 10 KB. The application will perform 50 eventually consistent reads per second at a steady rate and does not use transactions.

How many read capacity units (RCUs) must the company provision to support this read rate without overprovisioning?


- [A] 63

- [B] 75

- [C] 125

- [D] 150

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-dynamodb-ttl-archive (type: multi)

A company stores user session records in an Amazon DynamoDB table. Each record must expire 24 hours after the session ends, and removal within a few days after expiration is acceptable. An auditor requires a copy of every removed record in Amazon S3. The table receives heavy write traffic, and the company does not want the deletions to consume write capacity. The solution must require the LEAST operational overhead.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Schedule an AWS Lambda function that scans the table every hour and deletes expired records with BatchWriteItem.

- [B] Enable point-in-time recovery on the table with a recovery period of 1 day.

- [C] Enable DynamoDB Streams and use an AWS Lambda function, filtered on TTL service deletions, to write the removed records to Amazon S3.

- [D] Change the table class to DynamoDB Standard-Infrequent Access.

- [E] Enable Time to Live (TTL) on the table with an attribute that stores each record's expiration time in epoch seconds.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-ecs-anywhere-existing-servers (type: single)

A company recently bought new servers for its on-premises data center and must keep using them for several years. The company is containerizing the applications that run on these servers, and it already runs containers on Amazon ECS in an AWS Region. The company wants to manage all its containers from the same ECS control plane. The on-premises applications only make outbound calls.

Which solution will meet these requirements MOST cost-effectively?


- [A] Register the existing servers as external instances in an ECS cluster by using Amazon ECS Anywhere.

- [B] Migrate the containers to Amazon ECS on AWS Fargate in the Region and decommission the servers.

- [C] Deploy the containers in an AWS Local Zone that is connected to the data center through AWS Site-to-Site VPN.

- [D] Order an AWS Outposts rack and run the containers in an ECS cluster on the Outpost subnets.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-ecs-binpack-cluster-scaling (type: multi)

A company runs 30 containerized microservices as Amazon ECS services on a cluster of EC2 instances. Tasks are placed with the spread strategy across instances, and the Auto Scaling group of the cluster keeps a fixed number of instances. Average cluster CPU and memory utilization stay below 25%. The company wants the number of running instances to decrease automatically when demand is low, while tasks stay spread across Availability Zones.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Change the task placement strategy to random.

- [B] Change the task placement strategy to spread across Availability Zones first, then binpack on memory.

- [C] Set the minimum capacity of the Auto Scaling group to the current number of instances.

- [D] Create an Auto Scaling group capacity provider with managed scaling turned on and make it the cluster's default capacity provider strategy.

- [E] Add a distinctInstance placement constraint so that each instance runs only one task of a service.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-efs-ia-shared-files (type: single)

A research company runs a Linux-based analysis application on Amazon EC2 instances in three Availability Zones. The instances need a shared POSIX-compliant file system that grows and shrinks automatically. About 80% of the files are not accessed again after 30 days, but they must stay available in the same directory tree without any change to the application.

Which storage solution will meet these requirements MOST cost-effectively?


- [A] Create an Amazon FSx for Lustre file system and link it to an S3 bucket that stores the older files.

- [B] Create a Regional Amazon EFS file system with a lifecycle policy that moves files to EFS Infrequent Access after 30 days.

- [C] Create a Regional Amazon EFS file system and keep all the files in the EFS Standard storage class.

- [D] Attach a Provisioned IOPS SSD (io2) volume with Multi-Attach enabled to all the instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-fargate-scheduled-long-job (type: single)

A company has a containerized data export job that runs once each night and takes about 3 hours as a single process that cannot be split. The job must not be interrupted after it starts. The company currently runs the job on an Amazon EC2 instance that stays running all day. The company wants to reduce costs and stop managing servers.

Which solution will meet these requirements?


- [A] Run the job as an Amazon ECS task on AWS Fargate that an Amazon EventBridge Scheduler schedule starts each night.

- [B] Run the job as an Amazon ECS task on Fargate Spot that an Amazon EventBridge Scheduler schedule starts each night.

- [C] Run the job as an AWS Lambda function that an Amazon EventBridge Scheduler schedule invokes each night.

- [D] Run the job on an EC2 Spot Instance that an Auto Scaling scheduled action launches each night.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-fargate-spot-queue-workers (type: single)

A company runs short containerized image-processing tasks on Amazon ECS. Each task reads a message from an Amazon SQS queue and can be retried safely if it stops before it finishes. Tasks run several thousand times each day with no predictable schedule. The company does not want to manage EC2 instances and wants to minimize compute costs.

Which solution will meet these requirements?


- [A] Run the tasks on AWS Fargate with a capacity provider strategy that uses the FARGATE_SPOT capacity provider.

- [B] Run the tasks on AWS Fargate On-Demand and purchase a 3-year Compute Savings Plan sized for the peak hourly usage.

- [C] Run the tasks on AWS Fargate with the default FARGATE capacity provider at On-Demand prices.

- [D] Run the tasks on an ECS cluster of EC2 Spot Instances that an Auto Scaling group manages.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-gwlb-appliance-fleet (type: single)

A company inspects all traffic that enters its VPCs with third-party firewall appliances that run on Amazon EC2 instances. Administrators maintain custom scripts that update route tables to fail over between appliance instances, and the appliances are sized for peak traffic all the time. The company wants the appliance fleet to scale with traffic and to receive the traffic transparently, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Place the appliances behind an Application Load Balancer and send the inbound traffic to the load balancer's DNS name.

- [B] Deploy AWS Network Firewall in front of the appliances and keep the appliance instances sized for peak traffic.

- [C] Register the appliances, in an Auto Scaling group, with a Gateway Load Balancer, and route traffic through Gateway Load Balancer endpoints.

- [D] Place the appliances behind a Network Load Balancer and keep the custom scripts to update the route tables during failover.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-hibernation-prereqs (type: multi)

A company runs an analytics application on Linux On-Demand Instances that have 64 GiB of RAM and are used only during business hours. Each time the application starts, it spends 25 minutes loading reference data into memory, so the company keeps the instances running overnight. The company will launch replacement instances so that it can stop them at night and resume them in the morning with the data already in memory.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Launch the replacement instances as Dedicated Instances.

- [B] Launch the replacement instances from an AMI whose root device is an instance store volume.

- [C] Enable hibernation when launching the replacement instances.

- [D] Use an encrypted EBS root volume that is large enough for the RAM contents plus the operating system and application.

- [E] Stop the current instances and modify them to enable hibernation before using them again.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-horizontal-stateless-web (type: single)

A company runs a stateless web application on a single m5.8xlarge instance that was sized for the peak traffic of a weekly marketing event. For the rest of the week, CPU utilization stays below 10%. Session data is already stored in Amazon ElastiCache. The company wants to reduce compute costs while still handling the peak, and the application must tolerate the failure of an instance.

Which solution will meet these requirements?


- [A] Change the instance to a smaller size, and change it back to m5.8xlarge before each marketing event.

- [B] Keep the m5.8xlarge instance and purchase a 3-year Reserved Instance for it.

- [C] Run smaller instances in a Multi-AZ Auto Scaling group behind an Application Load Balancer with a target tracking scaling policy.

- [D] Enable hibernation on the instance and hibernate it outside the marketing event.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-i-family-nosql-iops (type: single)

A company runs a self-managed NoSQL database cluster on Amazon EC2. The database replicates every write to three nodes in different Availability Zones, so the loss of one node's local data is acceptable. Each node needs hundreds of thousands of low-latency random read IOPS. The company wants to meet this performance target at the lowest cost.

Which solution will meet these requirements?


- [A] Storage optimized (I family) instances that keep the database data on their NVMe instance store volumes

- [B] Compute optimized (C family) instances with General Purpose SSD (gp3) volumes for the database data

- [C] Memory optimized (R family) instances with io2 Block Express volumes provisioned with very high IOPS

- [D] General purpose (M family) instances with Throughput Optimized HDD (st1) volumes for the database data

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-lambda-s3-event-sporadic (type: single)

A company runs a PDF conversion script on an Amazon EC2 instance that runs 24 hours a day. The script polls an Amazon S3 bucket every minute and converts each new file in less than 30 seconds. About 300 files arrive each day at unpredictable times, so the instance is idle most of the time. The company wants to reduce costs and stop managing servers.

Which solution will meet these requirements?


- [A] Run the script as an AWS Lambda function that S3 event notifications invoke when new objects are created.

- [B] Move the script to an EC2 Spot Instance that keeps polling the bucket every minute.

- [C] Run the script in an Amazon ECS service on AWS Fargate with one task that runs continuously.

- [D] Move the script to a smaller EC2 instance and purchase a Reserved Instance for it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-lazy-loading-ttl (type: single)

A travel company caches the results of expensive Amazon RDS for PostgreSQL queries in Amazon ElastiCache. The database holds millions of hotel records, but users request only a small fraction of them, and the company wants to keep the cache cluster as small as possible. Prices change a few times each day, and showing a price that is up to 5 minutes old is acceptable.

Which caching strategy will meet these requirements?


- [A] Lazy loading that adds items to the cache on a cache miss, with no expiration on cached items

- [B] Write-through caching that writes every database update to the cache, with no expiration on cached items

- [C] Write-through caching that writes every database update to the cache, with a TTL of 24 hours on each cached item

- [D] Lazy loading that adds items to the cache on a cache miss, with a TTL of 300 seconds on each cached item

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-nat-per-az-s3-endpoint (type: multi)

A company runs Amazon EC2 instances in private subnets in two Availability Zones. All the private subnets route internet-bound traffic to a single NAT gateway in the first Availability Zone. The instances download several terabytes each day from an Amazon S3 bucket in the same AWS Region and also download software updates from the internet. A cost review shows high NAT gateway data processing charges and high data transfer charges between Availability Zones. The company wants to reduce these charges.

Which combination of steps will meet this requirement MOST cost-effectively? (Choose two.)


Choose 2.

- [A] Create an S3 interface endpoint in each Availability Zone and enable private DNS for it.

- [B] Replace the NAT gateway with a single new NAT gateway in a public subnet of the second Availability Zone.

- [C] Create a NAT gateway in the second Availability Zone and point that zone's private route table to it.

- [D] Create an S3 gateway endpoint and associate it with the route tables of the private subnets.

- [E] Replace the NAT gateway route in the private route tables with a route to the internet gateway.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-outposts-local-processing (type: single)

A manufacturing company runs plant-floor control systems in its own data center. A new application must process sensor data with very low latency to these systems, and the data must stay in the company's data center. The company wants to run Amazon EC2, Amazon EBS, and Amazon RDS locally with the same APIs and tools that it uses in its AWS Region, and it does not want to manage the hardware.

Which solution will meet these requirements?


- [A] Run the application in the nearest AWS Region and connect the data center with AWS Direct Connect.

- [B] Register the company's existing servers as external instances in an Amazon ECS Anywhere cluster.

- [C] Deploy the application in an AWS Local Zone in the same metropolitan area as the data center.

- [D] Install an AWS Outposts rack in the data center and run the resources in subnets on the Outpost.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-predictive-scaling-daily (type: single)

An online learning platform runs its web tier in an Amazon EC2 Auto Scaling group. Traffic follows a recurring daily pattern that rises sharply at 8:00 AM, and the pattern shifts gradually as the user base grows. New instances need 10 minutes to initialize, so the current target tracking policy adds capacity too late, and the company keeps extra instances running to compensate. The company wants capacity in place before the daily rise with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Replace the target tracking policy with a step scaling policy that adds more instances for each alarm breach.

- [B] Create scheduled actions that raise the desired capacity at 7:45 AM, and update them each month as traffic grows.

- [C] Raise the minimum capacity of the Auto Scaling group to the number of instances needed at peak.

- [D] Add a predictive scaling policy that launches instances ahead of the forecast, and keep the target tracking policy.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-r-family-in-memory (type: single)

A company is migrating a self-managed in-memory analytics engine to Amazon EC2. The engine needs much more memory per vCPU than general purpose instances provide, its entire working set must fit in RAM, and its CPU usage is moderate. The company wants to avoid paying for vCPUs that it does not need.

Which instance family should a solutions architect choose?


- [A] Storage optimized instances (I family)

- [B] Compute optimized instances (C family)

- [C] Burstable performance instances (T family)

- [D] Memory optimized instances (R family)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-rds-monthly-backup-year (type: single)

A company runs an Amazon RDS for MySQL DB instance with automated backups retained for 7 days. A new policy requires the company to keep one backup from each month for 12 months and to be able to restore the DB instance from any of these backups. The solution must require the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Export a DB snapshot to Amazon S3 each month and add an S3 Lifecycle rule that expires the exports after 12 months.

- [B] Increase the automated backup retention period of the DB instance to 365 days.

- [C] Run a monthly cron job on an EC2 instance that takes a manual DB snapshot and deletes snapshots older than 12 months.

- [D] Create an AWS Backup plan with a monthly rule that retains recovery points for 12 months, and assign the DB instance to the plan.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-rds-proxy-lambda-connections (type: single)

A company's serverless API uses AWS Lambda functions that query an Amazon RDS for MySQL DB instance. During traffic spikes, thousands of concurrent invocations open new database connections, and the DB instance reaches its maximum number of connections and rejects requests. The company wants to solve the problem without moving to a larger DB instance class.

Which solution will meet these requirements?


- [A] Create a read replica and send all the Lambda queries to the replica endpoint.

- [B] Increase the reserved concurrency of the Lambda functions so that more invocations can run at the same time.

- [C] Convert the DB instance to a Multi-AZ deployment so that the standby accepts part of the connections.

- [D] Create an RDS Proxy for the DB instance and configure the Lambda functions to connect to the proxy endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-rds-ri-size-flex (type: single)

A company bought two Reserved DB instances for db.r6i.large Single-AZ deployments of Amazon RDS for PostgreSQL in the us-east-1 Region. The company has now replaced its two db.r6i.large DB instances with one db.r6i.xlarge Single-AZ DB instance of RDS for PostgreSQL in the same Region and account.

How will the reservations apply to the new DB instance?


- [A] The reservations apply only after the new DB instance is converted to a Multi-AZ deployment.

- [B] The reservations cover half of the usage of the new DB instance, and the rest is billed at On-Demand rates.

- [C] The reservations cover all the usage of the new DB instance at the reserved rate.

- [D] The reservations do not apply, because they were bought for a different instance size.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-ri-utilization-budget (type: single)

A company purchased Reserved DB instances for its Amazon RDS fleet. After several database migrations, the company suspects that some reservations no longer match any running DB instance. The company wants an email notification whenever the utilization of its RDS reservations drops below 80%.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create an RI coverage budget for Amazon RDS in AWS Budgets with an 80% target and an email notification.

- [B] Create an AWS Cost Anomaly Detection monitor for Amazon RDS with an email alert subscription.

- [C] Write an AWS Lambda function that compares the reservations with the running DB instances each day and emails the results.

- [D] Create an RI utilization budget for Amazon RDS in AWS Budgets with an 80% target and an email notification.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-s3-lifecycle-log-tiers (type: single)

A financial services company stores application logs in an Amazon S3 bucket in the S3 Standard storage class. Analysts query the logs frequently during the first 30 days. From day 31 to day 90, the logs are read a few times each month and must be returned in milliseconds. After 90 days, the logs are kept for 7 years for compliance and are almost never read, and a retrieval time of up to 12 hours is acceptable. The logs must remain available if an Availability Zone is lost.

Which S3 Lifecycle configuration will meet these requirements MOST cost-effectively?


- [A] Transition the objects to S3 One Zone-IA after 30 days and to S3 Glacier Deep Archive after 90 days, and expire them after 7 years.

- [B] Transition the objects to S3 Standard-IA after 30 days and to S3 Glacier Deep Archive after 90 days, and expire them after 7 years.

- [C] Transition the objects to S3 Standard-IA after 30 days and to S3 Glacier Flexible Retrieval after 90 days, and expire them after 7 years.

- [D] Transition the objects to S3 Intelligent-Tiering after 30 days and expire them after 7 years.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-s3-noncurrent-multipart (type: multi)

A media company has S3 Versioning enabled on a bucket that stores video project files. Editors overwrite the files many times each day, and the storage costs of the bucket keep growing. An S3 Storage Lens report shows that most of the storage is used by noncurrent object versions and by parts of multipart uploads that were never completed. The company must be able to recover the previous version of a file for 30 days after it is overwritten.

Which combination of actions will reduce storage costs while meeting these requirements? (Choose two.)


Choose 2.

- [A] Enable S3 Object Lock in compliance mode with a default retention period of 30 days.

- [B] Add an S3 Lifecycle rule that permanently deletes noncurrent versions 30 days after they become noncurrent.

- [C] Suspend S3 Versioning on the bucket so that overwrites stop creating noncurrent versions.

- [D] Add an S3 Lifecycle rule that transitions current versions to S3 Glacier Deep Archive after 30 days.

- [E] Add an S3 Lifecycle rule that aborts incomplete multipart uploads 7 days after they are initiated.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-s3-onezone-ia-thumbnails (type: single)

An e-commerce company generates image thumbnails from original product photos that are stored in S3 Standard. The thumbnails are stored in a separate S3 bucket, are accessed a few times each month, and must be returned in milliseconds when requested. If the thumbnails are lost, the company can regenerate them from the original photos.

Which storage class should the company use for the thumbnails to meet these requirements MOST cost-effectively?


- [A] S3 Standard

- [B] S3 Standard-IA

- [C] S3 Glacier Flexible Retrieval

- [D] S3 One Zone-IA

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-spot-plus-savings-mix (type: multi)

A video platform has two workloads on Amazon EC2. A web tier runs on 10 instances of the same instance family 24 hours a day, with stable usage that is expected to continue for the next 3 years. A transcoding tier processes queued jobs that can be restarted if an instance stops, and its job volume varies widely during the day.

Which combination of purchasing options will meet these requirements MOST cost-effectively? (Choose two.)


Choose 2.

- [A] Run both tiers on Dedicated Instances to avoid capacity interruptions.

- [B] Create On-Demand Capacity Reservations for the 10 web tier instances.

- [C] Run the transcoding tier on Spot Instances in an Auto Scaling group that uses several instance types.

- [D] Purchase a 3-year EC2 Instance Savings Plan for the web tier's instance family in its Region.

- [E] Purchase 3-year Standard Reserved Instances for the peak number of transcoding instances.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-static-stability-three-az (type: single)

A production payment application needs at least 6 Amazon EC2 instances running at all times to handle its load, including while one Availability Zone is unavailable. The company does not want to depend on launching new instances during an Availability Zone failure. The AWS Region has three Availability Zones, and the application can run in any of them.

Which Auto Scaling group configuration will meet these requirements MOST cost-effectively?


- [A] Run 9 instances in three Availability Zones, with 3 instances in each zone.

- [B] Run 12 instances in two Availability Zones, with 6 instances in each zone.

- [C] Run 6 instances in three Availability Zones, with 2 instances in each zone, and let Auto Scaling replace lost capacity.

- [D] Run 6 instances in two Availability Zones, with 3 instances in each zone.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-t3-unlimited-sustained (type: single)

A company runs a reporting service on t3.xlarge instances that use the default credit configuration. Amazon CloudWatch shows that the instances have run at about 85% CPU utilization around the clock for the last 3 months, and each bill includes large charges for surplus CPU credits. The service must keep its current performance.

Which change will reduce costs MOST effectively?


- [A] Replace the instances with t3.2xlarge instances in unlimited mode.

- [B] Replace the instances with fixed-performance M family instances that have the same vCPU and memory.

- [C] Replace the instances with t3a.xlarge instances in unlimited mode.

- [D] Switch the instances to standard credit mode.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-test-env-reduce-ha (type: multi)

A company's test environment mirrors production: an Auto Scaling group with a minimum of 6 Amazon EC2 instances across three Availability Zones, and an Amazon RDS for MySQL Multi-AZ DB instance. The quality assurance team uses the environment only on weekdays from 8:00 AM to 6:00 PM. An outage of a few hours is acceptable for this environment, but its data must be kept.

Which combination of steps will reduce costs MOST effectively while meeting these requirements? (Choose two.)


Choose 2.

- [A] Modify the RDS DB instance to use a Single-AZ deployment.

- [B] Add scheduled actions that set the group's minimum and desired capacity to 0 after working hours and restore them each weekday morning.

- [C] Purchase 3-year Standard Reserved Instances for the 6 test instances.

- [D] Turn on storage autoscaling for the RDS DB instance.

- [E] Convert the DB instance to a Multi-AZ DB cluster with two readable standby instances.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4b-vertical-licensed-monthend (type: single)

A company runs a licensed accounting application on one Amazon EC2 instance. The vendor does not support running more than one copy of the application at the same time. For 3 days at the end of each month, the workload needs four times the current CPU and memory; for the rest of the month, an r6i.xlarge instance is sufficient. A short maintenance window is acceptable before and after the peak.

Which solution will meet these requirements MOST cost-effectively?


- [A] Stop the instance in the maintenance window, change its type to r6i.4xlarge for the peak, and change it back to r6i.xlarge afterward.

- [B] Move the application to a t3.xlarge instance in unlimited mode so that it can burst during the peak.

- [C] Run the application in an Auto Scaling group and scale out to four instances at the end of each month.

- [D] Run the application on an r6i.4xlarge instance all month and purchase a Reserved Instance for it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4b-wavelength-5g-game (type: single)

A gaming company is launching a multiplayer game for smartphones that connect through a telecommunications carrier's 5G network. The game servers must give these players the lowest possible latency, and player traffic must reach the servers without leaving the carrier's network. The company wants to keep using Amazon EC2 and its existing VPC in the parent AWS Region.

Which solution will meet these requirements?


- [A] Place an Amazon CloudFront distribution in front of game servers that run in the parent Region.

- [B] Use AWS Global Accelerator to route players to game servers that run in the parent Region.

- [C] Deploy the game servers in an AWS Local Zone in the players' metropolitan area.

- [D] Extend the VPC to an AWS Wavelength Zone and run the game servers in a Wavelength subnet with a carrier gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-alb-consolidate-rules (type: single)

A company runs 12 HTTP microservices on Amazon ECS. Each microservice has its own internet-facing Application Load Balancer and its own subdomain, such as orders.example.com and billing.example.com. Most microservices receive little traffic. The company wants to reduce load balancing costs without changing the subdomains.

Which solution will meet these requirements?


- [A] Replace each Application Load Balancer with a Network Load Balancer.

- [B] Turn off cross-zone load balancing on each Application Load Balancer.

- [C] Use one Application Load Balancer with a host-header listener rule for each subdomain that forwards to the target group of the matching microservice.

- [D] Use one Gateway Load Balancer with one target group for each microservice.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-alb-redirect-fixed-response (type: single)

A company's website runs behind an Application Load Balancer. A separate Auto Scaling group of EC2 instances does only two things: it redirects HTTP requests to HTTPS, and it returns a static 503 maintenance message during planned outages. The company wants to remove this fleet to cut costs and management effort.

Which solution will meet these requirements?


- [A] Move the redirect and maintenance logic to AWS Lambda functions registered as targets of a Network Load Balancer.

- [B] Configure the Application Load Balancer with a redirect action on the HTTP listener and a fixed-response rule on the HTTPS listener for maintenance.

- [C] Replace the fleet with Spot Instances in the same Auto Scaling group.

- [D] Create an Amazon Route 53 failover record that points to a static maintenance page and redirects HTTP to HTTPS.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-athena-parquet-columnar (type: single)

A marketing company stores 40 TB of clickstream data in an Amazon S3 bucket as uncompressed CSV files with 120 columns. Analysts query the data with Amazon Athena, and almost every query reads fewer than 10 columns. Athena costs are growing quickly. The company wants to reduce query costs.

Which solution is the MOST cost-effective?


- [A] Move the CSV files to the S3 Standard-IA storage class and keep querying them with Athena.

- [B] Load the data into an Amazon RDS for PostgreSQL DB instance and run the queries there.

- [C] Compress the CSV files with gzip and keep querying them with Athena.

- [D] Convert the data to compressed Apache Parquet files with an Athena CTAS query and query the Parquet table.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-aurora-replica-autoscaling (type: multi)

A media company runs an Amazon Aurora MySQL DB cluster with one writer instance. Read traffic is heavy during business hours and very low at night and on weekends. The application currently sends all reads to the writer. The company wants to scale reads and pay only for the reader capacity it needs.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Modify the writer instance to a larger instance class during business hours with a scheduled script.

- [B] Add an Aurora Replica and configure the application to send read queries to the cluster reader endpoint.

- [C] Create a cross-Region read replica cluster and send the read queries to it.

- [D] Add five Aurora Replicas sized for the peak and keep them running at all times.

- [E] Configure an Aurora Auto Scaling target tracking policy on reader average CPU utilization.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-aurora-serverless-zero (type: single)

A company runs an internal reporting tool on a MySQL-compatible database. The tool is used for a few short sessions each week, and the database is idle the rest of the time. When it is used, the load varies and is hard to predict. A wait of under a minute at the start of a session is acceptable. The company wants the MOST cost-effective managed relational database.

Which solution will meet these requirements?


- [A] An Amazon RDS for MySQL DB instance sized for the peak load and covered by a 1-year Reserved Instance

- [B] An Amazon DynamoDB table in on-demand capacity mode

- [C] An Aurora Serverless v2 DB cluster with a minimum capacity of 0 ACUs so that it pauses when idle

- [D] An Aurora MySQL provisioned DB cluster with one writer and one Aurora Replica

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-babelfish-sqlserver (type: single)

A company runs a line-of-business application on Microsoft SQL Server Enterprise edition on Amazon EC2. The application sends T-SQL queries through a SQL Server driver. License costs are the largest part of the database bill. The company wants to move to an open-source-compatible managed engine with the FEWEST changes to the application code and drivers.

Which solution will meet these requirements?


- [A] Migrate to Amazon RDS for SQL Server with the License Included model.

- [B] Convert the schema and code to Aurora MySQL with DMS Schema Conversion and switch the application to a MySQL driver.

- [C] Convert the schema and code to Aurora PostgreSQL with DMS Schema Conversion and switch the application to a PostgreSQL driver.

- [D] Migrate to Aurora PostgreSQL with Babelfish turned on and connect the application to the Babelfish TDS endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-batch-single-az (type: single)

A company runs a nightly simulation on 40 EC2 instances launched across three Availability Zones. The instances exchange several hundred terabytes with one another during each run. The job can simply be restarted the next night if it fails, and it has no availability requirement. A review shows that data transfer between zones is the largest cost of the job.

Which change will reduce the cost of the job the MOST?


- [A] Launch the instances in a spread placement group across the three Availability Zones.

- [B] Enable enhanced networking with the Elastic Network Adapter (ENA) on all the instances.

- [C] Assign Elastic IP addresses to the instances and send the traffic to the public addresses.

- [D] Launch all the instances in a cluster placement group in a single Availability Zone.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-budgets-forecast-transfer (type: single)

A video company's data transfer costs vary a lot from month to month. The operations team wants an email as soon as the data transfer costs for the current month are predicted to exceed $20,000, before the money is actually spent. The solution must require no custom code.

Which solution will meet these requirements?


- [A] Deliver the AWS Cost and Usage Report to Amazon S3 and query it daily with Amazon Athena.

- [B] Open AWS Cost Explorer each morning and check the forecast for data transfer costs.

- [C] Create an Amazon CloudWatch billing alarm on the EstimatedCharges metric with a threshold of $20,000.

- [D] Create an AWS Budgets monthly cost budget filtered on data transfer with an alert on forecasted costs above $20,000.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-cloudfront-cache-key (type: multi)

A news company serves article pages through an Amazon CloudFront distribution in front of an Application Load Balancer in one Region. The cache policy includes all query strings and the User-Agent header in the cache key, but the pages vary only by the article query string parameter. Viewers are spread worldwide, and the origin receives many requests for the same pages from different edge locations. The company wants to reduce the load and cost of the origin.

Which actions will meet this requirement? (Choose two.)


Choose 2.

- [A] Change the cache policy so that the cache key includes only the article query string and no headers.

- [B] Add the Accept-Language and Referer headers to the cache key.

- [C] Add an origin group with a second Application Load Balancer as the failover origin.

- [D] Enable CloudFront Origin Shield in the Region closest to the origin.

- [E] Set the minimum and default TTL of the cache policy to 0 seconds.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-cloudfront-s3-global (type: single)

A company serves product images and videos directly from an Amazon S3 bucket in one Region to customers on several continents. Customers far from the Region report slow downloads, and data transfer out from Amazon S3 is a large part of the bill. The company wants to improve download speed and lower delivery costs.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator accelerator with the bucket as its endpoint.

- [B] Enable S3 Transfer Acceleration on the bucket and give customers the accelerated endpoint URLs.

- [C] Create an Amazon CloudFront distribution with the bucket as its origin and an origin access control, and serve the content through CloudFront.

- [D] Replicate the bucket to a bucket in each continent with S3 Cross-Region Replication and use Route 53 latency-based routing.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-consolidated-billing-tiers (type: single)

A company has six standalone AWS accounts, each with its own payment method. Every account serves content to the internet and pays for data transfer out separately. One account also owns Reserved Instances that it does not fully use, while the other accounts run similar instances On-Demand. The company wants to lower its total bill without changing any architecture.

Which solution will meet these requirements?


- [A] Move all workloads into a single AWS account and delete the other accounts.

- [B] Invite the accounts into an organization in AWS Organizations and use consolidated billing with Reserved Instance discount sharing.

- [C] Create an AWS Budgets cost budget in each account with an alert at 80 percent of the monthly spend.

- [D] Activate cost allocation tags in each account and review the costs in AWS Cost Explorer.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-cross-region-replica-move (type: single)

A company runs an Amazon RDS for MySQL DB instance in the us-east-1 Region. To meet a data residency requirement, the database must move to the eu-west-1 Region. Writes can be stopped for only a few minutes during the cutover. The company wants the solution with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a cross-Region read replica in eu-west-1, stop writes when the replica lag is zero, promote the replica and point the application to it.

- [B] Take a DB snapshot, copy it to eu-west-1, restore a new DB instance from the copy and point the application to it.

- [C] Create an AWS DMS replication instance, source and target endpoints, and a full-load and CDC task to a new DB instance in eu-west-1.

- [D] Modify the DB instance to a Multi-AZ deployment with the standby in eu-west-1, then force a failover to the standby.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-cur-athena-transfer (type: single)

A company's network team must find which individual resources generated the regional data transfer charges of the last month, hour by hour, and join the results with an internal inventory table in SQL. The analysis must use AWS billing data at line-item level.

Which solution will meet these requirements?


- [A] Create an AWS Budgets usage budget for data transfer and review its alert history.

- [B] Configure the AWS Cost and Usage Report with hourly granularity and resource IDs, deliver it to Amazon S3 and query it with Amazon Athena.

- [C] Use the AWS Cost Explorer monthly view grouped by service.

- [D] Review the AWS Health Dashboard events for the account.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-dms-homogeneous-mysql (type: single)

A retail company runs a 2 TB MySQL 8.0 database on premises. The company wants to move the database to Amazon RDS for MySQL. The target uses the same engine, and the schema will not change. The data must be migrated with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Use AWS DataSync to copy the MySQL data files from the on-premises server to the RDS for MySQL instance.

- [B] Write an AWS Glue ETL job that reads each table over JDBC and writes the rows to the RDS for MySQL instance.

- [C] Convert the schema with DMS Schema Conversion, then run an AWS DMS full-load task to copy the data.

- [D] Use AWS DMS homogeneous data migrations, which use native MySQL tools to move the data to the RDS for MySQL instance.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-dx-heavy-egress (type: single)

A research company copies about 500 TB of processed results each month from Amazon EC2 instances in a VPC to its on-premises data center. The transfer runs at a steady rate all month over the internet, and data transfer out is now the largest item on the AWS bill. The company also wants more consistent network performance than the internet provides. The data center is near an AWS Direct Connect location.

Which solution is the MOST cost-effective?


- [A] Put the EC2 instances behind an AWS Global Accelerator accelerator and download the results through its static IP addresses.

- [B] Write the results to an Amazon S3 bucket with S3 Transfer Acceleration enabled and download them from the data center.

- [C] Order an AWS Direct Connect connection sized for the traffic, create a private virtual interface and send the results over it.

- [D] Create an AWS Site-to-Site VPN connection to the data center and send the results through the VPN tunnels.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-dx-hosted-2gbps (type: single)

A company needs a private AWS Direct Connect link between its data center and AWS. Measurements show a steady 1.5 Gbps of traffic, with modest growth expected over the next three years. The company's colocation facility is served by an AWS Direct Connect Partner that offers hosted connections from 50 Mbps to 10 Gbps. The company wants the MOST cost-effective connection that provides enough bandwidth.

Which connection should the company order?


- [A] A 10 Gbps Direct Connect dedicated connection

- [B] A 2 Gbps Direct Connect hosted connection from the Direct Connect Partner

- [C] A 1 Gbps Direct Connect dedicated connection

- [D] A 5 Gbps Direct Connect hosted connection from the Direct Connect Partner

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-dynamodb-reserved-capacity (type: single)

A gaming company stores player profiles in an Amazon DynamoDB table that uses on-demand capacity mode and the DynamoDB Standard table class. After a year in production, read and write traffic is steady around the clock and the company can forecast it for at least the next year. Throughput is by far the largest part of the table cost. The company wants to reduce the cost of the table.

Which solution is the MOST cost-effective?


- [A] Keep on-demand capacity mode and purchase DynamoDB reserved capacity for the baseline traffic.

- [B] Switch the table to the DynamoDB Standard-IA table class and purchase DynamoDB reserved capacity.

- [C] Keep on-demand capacity mode and add a DynamoDB Accelerator (DAX) cluster in front of the table.

- [D] Switch to provisioned capacity mode with auto scaling and purchase DynamoDB reserved capacity for the baseline traffic.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-ebs-snapshot-archive (type: single)

A company must keep a monthly snapshot of the Amazon EBS volumes of its accounting servers for 7 years for compliance. The snapshots are restored very rarely, and a restore that takes a few days is acceptable. The company currently keeps the monthly snapshots in the standard snapshot tier. The company wants to reduce storage costs with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create an S3 Lifecycle rule that transitions the EBS snapshots to S3 Glacier Deep Archive after 30 days.

- [B] Create an Amazon Data Lifecycle Manager policy with a daily schedule that keeps the snapshots in the standard tier for 7 years.

- [C] Create an Amazon Data Lifecycle Manager policy with a monthly schedule and an archive rule that moves each snapshot to the EBS Snapshots Archive tier.

- [D] Enable fast snapshot restore on the monthly snapshots and delete the older incremental snapshots.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-flow-logs-cross-az (type: single)

AWS Cost Explorer shows that a company's charges for data transfer between Availability Zones tripled last month. The VPC hosts more than 200 EC2 instances and containers. Before redesigning anything, the network team must find which pairs of source and destination IP addresses, and in which zones, carry the most traffic. The team wants to analyze the data with SQL.

Which solution will meet these requirements?


- [A] Group the costs by usage type in AWS Cost Explorer and filter on the regional data transfer usage types.

- [B] Enable AWS CloudTrail data events for the VPC and query the trail with Amazon Athena.

- [C] Create VPC flow logs with a custom format that includes the az-id and bytes fields, publish them to Amazon S3 and query them with Amazon Athena.

- [D] Run VPC Reachability Analyzer between every pair of instances in different zones.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-gateway-endpoints-s3-ddb (type: multi)

An analytics application runs on EC2 instances in private subnets. The instances read large objects from Amazon S3 buckets and write items to Amazon DynamoDB tables, all in the same Region. All of this traffic currently goes through NAT gateways, which generate high data processing charges. The instances must remain in private subnets.

Which combination of steps will reduce these charges MOST cost-effectively? (Choose two.)


Choose 2.

- [A] Move the instances to public subnets and assign them Elastic IP addresses.

- [B] Create a gateway VPC endpoint for Amazon S3 and associate it with the private subnet route tables.

- [C] Create a gateway VPC endpoint for Amazon DynamoDB and associate it with the private subnet route tables.

- [D] Enable S3 Transfer Acceleration on the buckets.

- [E] Create an interface VPC endpoint for Amazon S3 in each Availability Zone.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-interface-endpoint-kinesis (type: single)

A company runs data producers on EC2 instances in private subnets in two Availability Zones. The producers send about 80 TB each month to Amazon Kinesis Data Streams in the same Region through a NAT gateway in each zone, and the NAT gateway data processing charges are high. The instances must stay in private subnets, and the application code must not change.

Which solution is the MOST cost-effective?


- [A] Create a gateway VPC endpoint for Kinesis Data Streams and add it to the private route tables.

- [B] Create an interface VPC endpoint for Kinesis Data Streams in both zones with private DNS enabled.

- [C] Replace the two NAT gateways with one NAT gateway shared by both zones.

- [D] Send the records through an AWS Global Accelerator accelerator in front of the Kinesis endpoint.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-nat-instance-dev (type: single)

A startup has a development VPC with one private subnet. A few EC2 instances in the subnet download operating system updates over IPv4 a few times a day, and outbound traffic is under 1 GB per day. The developers accept occasional loss of internet access and are willing to patch one more instance. The startup wants the LOWEST monthly cost.

Which solution will meet these requirements?


- [A] Create a NAT gateway in a public subnet and route the private subnet's internet traffic to it.

- [B] Create an egress-only internet gateway and route the private subnet's internet traffic to it.

- [C] Create a private NAT gateway in the private subnet and route the subnet's internet traffic to it.

- [D] Launch a small burstable NAT instance from a current Amazon Linux AMI in a public subnet and route the private subnet's internet traffic to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-nat-instance-to-gateway (type: single)

A company runs a production VPC across two Availability Zones. Each zone has a NAT instance on a large network-optimized EC2 instance type, chosen only to get enough bandwidth for peak hours. The operations team patches the instances every month and runs scripts to replace a failed instance. The company wants to stop paying for idle peak capacity and reduce administration.

Which solution will meet these requirements?


- [A] Replace each NAT instance with a NAT gateway in the same Availability Zone and update each private route table to use the NAT gateway in its zone.

- [B] Move the NAT instances to Reserved Instances of the same instance type.

- [C] Replace the NAT instances with a single smaller NAT instance in one Availability Zone.

- [D] Place each NAT instance in an Auto Scaling group with a minimum and maximum of one instance.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-neptune-fraud-graph (type: single)

A payments company wants to detect fraud rings by following relationships between accounts, devices, cards and addresses several hops deep. The queries must return in milliseconds over billions of relationships. The company wants a fully managed database built for this access pattern.

Which AWS service will meet these requirements?


- [A] Amazon Aurora MySQL

- [B] Amazon DynamoDB

- [C] Amazon Redshift

- [D] Amazon Neptune

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-oracle-to-aurora-pg (type: single)

A financial services company runs an Oracle database on premises. The database contains tables, views and several hundred stored procedures. The company wants to stop paying for commercial database licenses and move to a managed, open-source-compatible engine on AWS.

Which solution will meet these requirements?


- [A] Migrate to Amazon RDS for Oracle with the Bring Your Own License model and copy the data with AWS DMS.

- [B] Convert the schema and stored procedures to Aurora PostgreSQL with DMS Schema Conversion, then migrate the data with AWS DMS.

- [C] Export the tables to Amazon S3 and import them into Amazon DynamoDB tables, then rewrite the stored procedures as AWS Lambda functions.

- [D] Migrate to Aurora PostgreSQL by using AWS DMS homogeneous data migrations, which convert the stored procedures automatically.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-orders-aurora-carts-dynamodb (type: multi)

An ecommerce company is redesigning two parts of its platform. The order service needs ACID transactions across several related tables and SQL reports that join them. The shopping cart service stores each cart by customer ID, must keep single-digit millisecond latency at any scale, and must store carts durably. The company wants managed services that fit each access pattern.

Which combination of services will meet these requirements? (Choose two.)


Choose 2.

- [A] Amazon Redshift for the order service

- [B] Amazon Keyspaces (for Apache Cassandra) for the order service

- [C] Amazon Aurora PostgreSQL for the order service

- [D] Amazon Neptune for the shopping cart service

- [E] Amazon DynamoDB for the shopping cart service

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-peering-three-vpcs (type: single)

A company has three VPCs in the same Region with non-overlapping CIDR blocks. Each VPC must communicate with the other two, and large volumes of data move between them every day. The company does not plan to add more VPCs and has no on-premises connectivity. The company wants the MOST cost-effective design.

Which solution will meet these requirements?


- [A] Create three VPC peering connections, one between each pair of VPCs, and update the route tables.

- [B] Create a transit gateway, attach the three VPCs and update the route tables.

- [C] Create two VPC peering connections through a central VPC and route traffic between the other two VPCs through it.

- [D] Create a Site-to-Site VPN connection between each pair of VPCs.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-postgis-engine (type: single)

A logistics company runs a route-planning application on a self-managed PostgreSQL server. The application stores delivery zones with the PostGIS extension and uses PL/pgSQL functions. The company wants to move to a managed relational database on AWS without changing the application code.

Which database engine should the company choose?


- [A] Amazon Aurora PostgreSQL-Compatible Edition

- [B] Amazon RDS for MariaDB

- [C] Amazon Aurora MySQL-Compatible Edition

- [D] Amazon DocumentDB (with MongoDB compatibility)

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-private-ip-vpn-over-dx (type: single)

A healthcare company connects its data center to several VPCs through a 1 Gbps AWS Direct Connect hosted connection, a transit virtual interface and a transit gateway. A new regulation requires all traffic to be encrypted in transit. Traffic must stay on the private Direct Connect link, and no public IP addresses can be used for the encryption endpoints. The company wants the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a Site-to-Site VPN connection to the transit gateway over the internet and remove the Direct Connect connection.

- [B] Create a Private IP Site-to-Site VPN connection on the transit gateway that runs over the Direct Connect transit virtual interface.

- [C] Deploy third-party VPN appliances on EC2 instances in each VPC and build IPsec tunnels to them over the transit virtual interface.

- [D] Enable MACsec on the existing hosted connection.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-rds-mysql-to-aurora-replica (type: single)

A company runs a 3 TB Amazon RDS for MySQL DB instance. The company wants to move the database to an Amazon Aurora MySQL DB cluster in the same Region. The application must keep accepting writes during the data copy, and the cutover must cause only a brief interruption. No extra migration service should be deployed.

Which solution will meet these requirements?


- [A] Convert the schema with DMS Schema Conversion, then export the tables with mysqldump and import them into the Aurora MySQL DB cluster.

- [B] Add an Aurora Replica to the RDS for MySQL DB instance and fail over to it.

- [C] Restore the latest automated snapshot of the DB instance as an Aurora MySQL DB cluster and point the application to the cluster.

- [D] Create an Aurora read replica of the DB instance, stop writes when the replica lag reaches zero, promote the Aurora cluster and point the application to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-rds-pitr-retention (type: single)

A company runs a production database on an Amazon RDS for PostgreSQL DB instance. A new policy requires the ability to recover the database to any point in time within the last 30 days, with an RPO of about 5 minutes. The company wants the solution with the LEAST operational overhead without running additional database instances.

Which solution will meet these requirements?


- [A] Create a read replica in another Availability Zone and promote it if the data must be recovered.

- [B] Create an Amazon EventBridge schedule that invokes an AWS Lambda function to take a manual DB snapshot every 5 minutes and delete snapshots older than 30 days.

- [C] Convert the DB instance to a Multi-AZ deployment so that the standby keeps a synchronous copy of the data.

- [D] Set the automated backup retention period to 30 days and use point-in-time restore when needed.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-read-replica-reporting (type: single)

A company runs its order application on an Amazon RDS for MySQL Multi-AZ DB instance deployment. Every night, analysts run long reporting queries that slow down the application. The queries can tolerate data that is a few seconds old. The company wants the MOST cost-effective solution that does not require a larger DB instance class.

Which solution will meet these requirements?


- [A] Point the reporting queries at the standby instance of the Multi-AZ deployment.

- [B] Add an Amazon ElastiCache cluster in front of the database to cache the reporting queries.

- [C] Create a read replica of the DB instance and point the reporting queries at the read replica endpoint.

- [D] Restore a new DB instance from the latest snapshot every night and run the reports on it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-regional-nat-gateway (type: single)

A company runs production workloads in private subnets of a VPC. The teams often move workloads into additional Availability Zones. Today the network team creates a zonal NAT gateway and a public subnet in each new zone and edits the route tables, and mistakes have caused outages. The company needs highly available outbound internet access with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a regional NAT gateway in automatic mode and point the default route of every private subnet to its NAT gateway ID.

- [B] Replace the NAT gateways with one zonal NAT gateway shared by all Availability Zones.

- [C] Replace the NAT gateways with NAT instances in an Auto Scaling group that spans all Availability Zones.

- [D] Keep one zonal NAT gateway per Availability Zone and create them with an AWS CloudFormation template each time a zone is added.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-resolver-hybrid-dns (type: multi)

A company connects its data center to a VPC through AWS Direct Connect. Servers in the data center must resolve names in a Route 53 private hosted zone associated with the VPC. EC2 instances in the VPC must resolve names in the corp.example.internal domain, which is hosted on the on-premises DNS servers. The company currently runs a pair of self-managed DNS forwarders on EC2 and wants to replace them with a managed solution.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Associate the private hosted zone with the Direct Connect gateway.

- [B] Change the VPC DHCP options set to use the on-premises DNS servers only.

- [C] Create a Route 53 VPC Resolver inbound endpoint and configure the on-premises DNS servers to forward the private hosted zone domain to its IP addresses.

- [D] Create a Route 53 VPC Resolver outbound endpoint and a forwarding rule for corp.example.internal that targets the on-premises DNS servers.

- [E] Create a public hosted zone for corp.example.internal and copy the on-premises records into it.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-route53-alias-apex (type: single)

A company hosts its public DNS zone example.com in Amazon Route 53. The website runs behind an Application Load Balancer. Users must reach the site at both example.com and www.example.com. The company wants to keep DNS query charges as low as possible.

Which solution will meet these requirements?


- [A] Create CNAME records for example.com and www.example.com that point to the load balancer DNS name.

- [B] Create alias A records for example.com and www.example.com that point to the Application Load Balancer.

- [C] Create A records for example.com and www.example.com that contain the current IP addresses of the load balancer.

- [D] Create a CNAME record for www.example.com that points to the load balancer, and an alias record for example.com that points to the CNAME record.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-single-nat-test-vpc (type: single)

A company has a test VPC with private subnets in three Availability Zones. Instances in the private subnets need outbound IPv4 internet access through a managed AWS service, and traffic volume is low. The test team accepts losing internet access if one Availability Zone fails. The company wants to minimize NAT costs.

Which solution will meet these requirements?


- [A] Create one zonal NAT gateway in a public subnet in one Availability Zone, and route all private subnets to it.

- [B] Create a regional NAT gateway in automatic mode, and route all private subnets to it.

- [C] Create one zonal NAT gateway in a public subnet in each Availability Zone, and route each private subnet to the NAT gateway in its zone.

- [D] Create one private NAT gateway in each private subnet, and route the subnet's internet traffic to it.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-sqs-buffer-writes (type: single)

A ticketing company receives orders through an API. During ticket releases, the order rate jumps to ten times the normal rate for about 15 minutes, and the Amazon RDS for PostgreSQL database that stores the orders becomes overloaded. Orders can be confirmed to customers by email within a few minutes, but no order can be lost. The company does not want to pay for a database sized for the peak.

Which solution will meet these requirements?


- [A] Scale the DB instance to a larger instance class permanently so it can absorb the peak.

- [B] Have the API send each order to an Amazon SQS queue, and have consumers write the orders to the database at a rate it can sustain.

- [C] Set a low throttling limit on the API so that excess order requests are rejected with HTTP 429 errors.

- [D] Add two read replicas to the DB instance and spread the order writes across them.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-tags-network-costs (type: multi)

A company runs workloads for three business units in one AWS account. Each business unit has its own NAT gateways, VPC interface endpoints and Application Load Balancers. The finance team wants the monthly cost of these network resources broken down by business unit in AWS Cost Explorer.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Create an AWS Budgets usage budget for each business unit.

- [B] Apply a BusinessUnit tag with the business unit name to each network resource.

- [C] Turn on AWS Config to record the configuration of every network resource.

- [D] Activate the BusinessUnit tag key as a cost allocation tag in the Billing and Cost Management console.

- [E] Create a separate VPC for each business unit and enable VPC Flow Logs.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-timestream-influxdb (type: single)

A manufacturing company collects temperature and vibration readings from factory sensors every second. The readings are written to a self-managed InfluxDB 2.x server on Amazon EC2, and dashboards query recent data in real time. The company wants a managed time series database that keeps its existing InfluxDB code and tools, with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Migrate the database to Amazon Timestream for InfluxDB.

- [B] Store the readings in an Amazon DynamoDB table with the sensor ID as partition key and the timestamp as sort key.

- [C] Load the readings into an Amazon Redshift cluster every hour with the COPY command.

- [D] Store the readings in an Aurora PostgreSQL DB cluster with one table for each sensor.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-transit-gateway-hub (type: single)

A company has 60 VPCs in one Region across many accounts, and the number grows every month. Every VPC must reach shared services and the on-premises data center through one Site-to-Site VPN. Managing a full mesh of VPC peering connections and per-VPC VPN connections has become error-prone. The company wants a design that scales with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Peer every VPC with a shared services VPC that holds the VPN connection, and route on-premises traffic through that VPC.

- [B] Keep the full mesh of VPC peering connections and automate the creation of new connections with AWS CloudFormation.

- [C] Create a virtual private gateway in every VPC and a Site-to-Site VPN connection from each one to the data center.

- [D] Create a transit gateway, attach every VPC and the Site-to-Site VPN connection to it, and manage routing in the transit gateway route tables.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-usage-plans-tiers (type: multi)

A software company sells access to a REST API built with Amazon API Gateway. Customers already authenticate with an Amazon Cognito user pool authorizer. Customers on the Basic tier must be limited to a lower request rate and a monthly request quota, and Premium customers get higher limits. One heavy customer must not consume the capacity of the others.

Which combination of steps will meet these requirements? (Choose two.)


Choose 2.

- [A] Set a single stage-level throttling limit on the API stage.

- [B] Create a Basic usage plan and a Premium usage plan with different throttling and quota limits, and associate them with the API stage.

- [C] Create an API key for each customer, require API keys on the methods, and add each key to the usage plan of the customer's tier.

- [D] Set reserved concurrency on the backend AWS Lambda functions.

- [E] Add an AWS WAF rate-based rule that limits requests from each source IP address.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-4c-vpn-backup-dx (type: single)

A company connects its data center to a VPC with a single 1 Gbps AWS Direct Connect dedicated connection and a private virtual interface. The company needs a backup path in case the Direct Connect connection fails. During a failure, reduced bandwidth and higher latency are acceptable for a few hours. The company wants the MOST cost-effective backup.

Which solution will meet these requirements?


- [A] Order a second 1 Gbps Direct Connect dedicated connection at a different Direct Connect location.

- [B] Add a second 1 Gbps dedicated connection to a link aggregation group (LAG) with the existing connection.

- [C] Create a public virtual interface on the existing connection to reach the VPC through public endpoints.

- [D] Create an AWS Site-to-Site VPN connection over the internet to the same VPC and use BGP so that traffic fails over to the VPN.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-vpn-large-bandwidth-tunnel (type: single)

A company in the eu-west-1 Region connects its data center to one VPC with an AWS Site-to-Site VPN connection on a virtual private gateway. Replication traffic now needs about 4 Gbps, but each standard tunnel supports up to 1.25 Gbps. The customer gateway has a fixed public IP address and supports BGP. The company wants to reach the bandwidth with the FEWEST VPN connections to manage and without Direct Connect.

Which solution will meet these requirements?


- [A] Modify the tunnels of the existing VPN connection on the virtual private gateway to use large bandwidth tunnels.

- [B] Attach the VPC to a transit gateway and create one VPN connection on the transit gateway with large bandwidth tunnels of up to 5 Gbps.

- [C] Create three more VPN connections with static routing on the virtual private gateway and spread the traffic with ECMP.

- [D] Turn on acceleration for the existing VPN connection so that it uses the AWS Global Accelerator network.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-4c-vpn-quick-low-cost (type: single)

A small company needs encrypted connectivity between its office network and a VPC within a few days. The office already has a firewall that supports IPsec and a stable internet connection. Traffic is low, about 50 Mbps at peak. The company wants the MOST cost-effective solution.

Which solution will meet these requirements?


- [A] Create an AWS Site-to-Site VPN connection between a virtual private gateway on the VPC and the office firewall.

- [B] Order a 50 Mbps Direct Connect hosted connection from an AWS Direct Connect Partner.

- [C] Order a 1 Gbps AWS Direct Connect dedicated connection and create a private virtual interface.

- [D] Give the EC2 instances public IP addresses and allow the office's public IP address in their security groups.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-alb-request-count-scaling (type: single)

A web application runs on Amazon EC2 instances in an Auto Scaling group behind an Application Load Balancer. Most of each request is spent waiting for an external API, so CPU utilization stays below 20% even when the instances are overloaded. Load testing shows that each instance performs well up to about 1,000 requests per minute.

Which scaling configuration will keep performance stable as traffic changes?


- [A] A target tracking policy on ALBRequestCountPerTarget with a target value of 1,000

- [B] A target tracking policy on the load balancer's total RequestCount metric with a target value of 1,000

- [C] A target tracking policy on the load balancer's TargetResponseTime metric with a target value of 1 second

- [D] A target tracking policy on ASGAverageCPUUtilization with a target value of 15

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-amazon-mq-activemq (type: single)

A company is migrating an on-premises Java application to AWS. The application's components communicate through an Apache ActiveMQ broker by using JMS and STOMP clients. The company wants a managed message broker so that it no longer maintains broker servers, and it does not want to rewrite the messaging code.

Which solution will meet these requirements?


- [A] Migrate the broker to Amazon MQ for ActiveMQ and update the connection endpoints.

- [B] Replace the broker with an Amazon Kinesis data stream.

- [C] Replace the broker with an Amazon EventBridge event bus and rules.

- [D] Replace the broker with Amazon SQS queues and Amazon SNS topics.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-apigw-lambda-sporadic (type: single)

A startup is building a REST API for a mobile app. Traffic is unpredictable: the API is idle for hours and then receives short bursts of thousands of requests. Each request runs for less than a second. The startup does not want to manage servers and wants to pay only when requests are processed.

Which solution will meet these requirements?


- [A] An Amazon ECS service on EC2 container instances behind an Application Load Balancer

- [B] An AWS Elastic Beanstalk web server environment with load balancing

- [C] An Application Load Balancer in front of an Auto Scaling group with a minimum of one EC2 instance

- [D] Amazon API Gateway with AWS Lambda functions as the backend

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-asg-predictive-dynamic (type: multi)

An e-commerce company runs its web tier on Amazon EC2 instances in an Auto Scaling group. Traffic follows a daily pattern with a large evening peak, but the timing and size of the peak shift from week to week. New instances need about 10 minutes to initialize, so capacity added after the load arrives is too late. Unplanned flash sales can also cause sudden spikes. The company has several months of traffic history.

Which combination of scaling policies will meet these requirements with the LEAST operational overhead? (Choose two.)


Choose 2.

- [A] A predictive scaling policy in forecast only mode

- [B] A longer health check grace period for the Auto Scaling group

- [C] A target tracking scaling policy on average CPU utilization

- [D] A predictive scaling policy in forecast and scale mode

- [E] A scheduled action for each evening peak, updated every week

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-asg-scheduled-scaling (type: single)

An internal HR application runs on Amazon EC2 instances in an Auto Scaling group. Every weekday, employees start using it at 8:00 AM New York time and stop at 6:00 PM. The company knows that 12 instances are needed during business hours and 2 instances at other times. Capacity must be in place before employees arrive, and the company wants to minimize cost outside business hours.

Which solution will meet these requirements?


- [A] Create recurring scheduled actions in the America/New_York time zone that set the desired capacity for each period.

- [B] Create a target tracking scaling policy that keeps the group's average CPU utilization at 50%.

- [C] Set the minimum capacity of the Auto Scaling group to 12 instances at all times.

- [D] Create a step scaling policy that adds instances when a CloudWatch alarm on CPU utilization is in the ALARM state.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-asg-warm-pool (type: single)

A company runs an application on Amazon EC2 instances in an Auto Scaling group. Each new instance takes about 15 minutes to boot because it writes a large reference dataset to its Amazon EBS root volume, so scale-out events cause high latency. The company does not want to keep extra instances running all the time and wants to keep costs as low as possible.

Which solution will meet these requirements?


- [A] Increase the minimum capacity of the Auto Scaling group to cover the peak load.

- [B] Add a warm pool to the Auto Scaling group with instances kept in the Running state.

- [C] Add a warm pool to the Auto Scaling group with instances kept in the Stopped state.

- [D] Add a launch lifecycle hook that keeps new instances in the Pending:Wait state until initialization finishes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-aurora-replica-autoscaling (type: single)

A company runs an Amazon Aurora MySQL DB cluster with one writer and two Aurora Replicas. The application sends its read queries to the reader endpoint. Read traffic varies widely and unpredictably during the day, and at peaks the replicas reach 90% CPU utilization. The company wants replicas to be added and removed automatically with the LEAST operational overhead.

Which solution will meet these requirements?


- [A] Create a CloudWatch alarm on replica CPU that invokes a Lambda function to add or remove replicas.

- [B] Add an Aurora Auto Scaling policy that tracks a target average CPU utilization of the Aurora Replicas.

- [C] Change the writer DB instance to a larger instance class.

- [D] Convert the cluster to an Aurora global database with a secondary cluster in another Region.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-batch-fargate-long-jobs (type: single)

A company runs a containerized data processing job several times a day, sometimes in bursts of dozens of submissions. Each job is a single uninterrupted computation of about 3 hours that needs 4 vCPUs and 16 GB of memory and no GPU. Jobs submitted in a burst must wait in a queue until capacity is available. The company does not want to choose, patch or scale any EC2 instances.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Run the jobs on an Auto Scaling group of EC2 instances that poll an Amazon SQS queue.

- [B] Package the job as a Lambda container image with maximum memory and invoke it asynchronously.

- [C] Submit the jobs to an AWS Batch job queue that uses an EC2 compute environment with an AMI the company maintains.

- [D] Submit the jobs to an AWS Batch job queue that uses a Fargate compute environment.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-batch-simulation-jobs (type: single)

A pharmaceutical company submits thousands of containerized simulation jobs every night. Each job runs for 1 to 4 hours, some jobs must wait for others to finish, and the company wants to use Spot Instances where possible. The company needs a managed service that queues the jobs and provisions the right amount of compute capacity for them automatically.

Which AWS service will meet these requirements?


- [A] Amazon EMR

- [B] AWS Elastic Beanstalk

- [C] AWS Lambda

- [D] AWS Batch

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-beanstalk-web-app (type: single)

A small development team has built a Java web application. The team wants to upload the application code and have AWS provision the Amazon EC2 instances, load balancing, automatic scaling and health monitoring. The team wants to keep access to the underlying resources in its account and to avoid writing infrastructure templates.

Which solution will meet these requirements with the LEAST operational overhead?


- [A] Create the load balancer, launch template and Auto Scaling group manually in the console.

- [B] Write an AWS CloudFormation template that creates an Application Load Balancer and an Auto Scaling group.

- [C] Package the application as a container and run it as an AWS Batch job.

- [D] Deploy the application to an AWS Elastic Beanstalk environment.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-cloudfront-functions-headers (type: single)

A news website is served through Amazon CloudFront and receives millions of requests per second during major events. On every viewer request, before CloudFront checks its cache, the company must normalize the query string to improve the cache hit ratio and add a header that carries the viewer's IP address. The logic is a few lines of JavaScript and needs no network calls. The company wants the lowest added latency and cost.

Which solution will meet these requirements?


- [A] Associate a CloudFront Functions function with the viewer request event of the distribution.

- [B] Associate a Lambda@Edge function with the origin request event of the distribution.

- [C] Associate a Lambda@Edge function with the viewer request event of the distribution.

- [D] Route all requests through Amazon API Gateway with a Lambda function that rewrites them before CloudFront.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-cloudfront-global-site (type: single)

A company hosts a website on Amazon EC2 instances behind an Application Load Balancer in the us-west-2 Region. The site serves images, CSS and JavaScript files as well as dynamic pages. Users in Europe and Asia report slow page loads. The company wants static files to be cached close to users and wants to reduce latency for all users without deploying the application to other Regions.

Which solution will meet these requirements?


- [A] Create an AWS Global Accelerator standard accelerator with the Application Load Balancer as the endpoint.

- [B] Create an Amazon Route 53 latency-based routing record that points to the Application Load Balancer.

- [C] Move the instances to a larger instance type and add more instances to the target group.

- [D] Create an Amazon CloudFront distribution with the Application Load Balancer as the origin.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-ebs-az-snapshot (type: single)

A company runs an application on an Amazon EC2 instance in Availability Zone A. The application data is on a 500 GiB Amazon EBS gp3 data volume. The company must move the application to a new instance in Availability Zone B in the same AWS Region and keep all the data on block storage.

Which solution will meet these requirements?


- [A] Enable Multi-Attach on the volume and attach it to both instances at the same time.

- [B] Use Elastic Volumes to change the Availability Zone of the volume to Availability Zone B.

- [C] Create a snapshot of the volume and restore it to a new volume in Availability Zone B.

- [D] Detach the volume from the instance and attach it to the new instance in Availability Zone B.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-ebs-elastic-volumes (type: single)

A production application runs on a current-generation Amazon EC2 instance. Its 500 GiB Amazon EBS gp3 data volume is almost full, and the company expects the data to quadruple this year. The company must increase the volume to 2 TiB and raise its provisioned IOPS without downtime and with the LEAST operational effort.

Which solution will meet these requirements?


- [A] Change the instance to a larger instance type so that it gets more EBS bandwidth and storage.

- [B] Attach a second 2 TiB volume and copy the data to it with rsync, then detach the old volume.

- [C] Create a snapshot, create a 2 TiB volume from it, stop the instance, and swap the volumes.

- [D] Modify the volume size and IOPS with Elastic Volumes, then extend the file system.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-ecs-anywhere-factory (type: single)

A manufacturer already runs containerized services on Amazon ECS in an AWS Region. For latency and data residency reasons, some data-processing containers must run on the company's existing Linux servers in its factories. These containers process data locally and send results to AWS; they receive no inbound traffic. The company wants to manage them with the same ECS control plane and APIs as its cloud workloads, without operating a container orchestrator on premises.

Which solution will meet these requirements?


- [A] Run the containers as ECS tasks on AWS Fargate in the Region nearest to the factories.

- [B] Order AWS Outposts racks for each factory and run the ECS tasks on them.

- [C] Install Amazon EKS Anywhere on the factory servers and deploy the containers to it.

- [D] Register the factory servers as external instances in an ECS cluster by using Amazon ECS Anywhere.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-ecs-capacity-provider-scaling (type: multi)

A company runs a web service on Amazon ECS with the EC2 launch type. The cluster's container instances belong to an Auto Scaling group. Traffic is unpredictable. The company wants the number of tasks to increase when the service's CPU utilization rises, and the cluster to add instances automatically so that new tasks are not left in the PROVISIONING state, then remove unused instances when traffic falls. The solution must have the LEAST operational overhead.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Add a target tracking policy on ASGAverageCPUUtilization directly to the Auto Scaling group of the container instances.

- [B] Increase the CPU and memory values in the task definition of the service.

- [C] Use an Auto Scaling group capacity provider with managed scaling in the cluster's capacity provider strategy.

- [D] Configure ECS Service Auto Scaling with a target tracking policy on the service's average CPU utilization.

- [E] Create scheduled actions that change the desired task count of the service each hour.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-ecs-task-iam-role (type: single)

A company runs several services in one Amazon ECS cluster on Amazon EC2 container instances. A new reporting service must read objects from one Amazon S3 bucket. The other services that run on the same instances must not be able to access that bucket. The solution must follow the principle of least privilege.

Which solution will meet these requirements?


- [A] Set an IAM role with the S3 read permissions as the task IAM role of the reporting service.

- [B] Add the S3 read permissions to the IAM role in the instance profile of the container instances.

- [C] Add the S3 read permissions to the task execution role of the reporting service.

- [D] Create an IAM user with the S3 read permissions and pass its access keys to the container as environment variables.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-efs-elastic-throughput (type: single)

A company stores 100 GiB of shared data on an Amazon EFS file system that uses Bursting throughput mode. The workload is spiky and unpredictable: it is mostly idle, but during some hours it needs several hundred MiB/s, and it then runs out of burst credits and is throttled. The company expects throughput needs to grow and wants throughput to scale automatically while paying only for the data it actually reads and writes.

Which solution will meet these requirements?


- [A] Add filler data to the file system so that its baseline throughput increases.

- [B] Switch the file system to Provisioned throughput mode set to the peak throughput.

- [C] Switch the file system to Elastic throughput mode.

- [D] Replace the file system with an EFS file system that uses Max I/O performance mode.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-efs-shared-linux (type: single)

A media company runs a content management application on Linux Amazon EC2 instances in an Auto Scaling group that spans three Availability Zones. All instances must read and write the same files at the same time by using standard POSIX file system semantics. The storage must grow automatically as editors add content, without capacity planning.

Which storage solution will meet these requirements?


- [A] An Amazon S3 bucket that the application accesses through the AWS SDK

- [B] An Amazon EBS gp3 volume with Multi-Attach enabled, attached to every instance

- [C] An Amazon EFS Regional file system mounted on every instance

- [D] An Amazon FSx for Windows File Server file system shared over SMB

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-eks-existing-kubernetes (type: single)

A company runs containerized applications on a self-managed Kubernetes cluster on premises. The teams deploy with Helm charts and kubectl and use several Kubernetes community plugins. The company is moving the applications to AWS and wants AWS to manage the Kubernetes control plane while the teams keep their existing manifests and tooling.

Which solution will meet these requirements?


- [A] Migrate the applications to an Amazon EKS cluster.

- [B] Migrate the applications to Amazon ECS and rewrite the manifests as ECS task definitions.

- [C] Deploy the applications as Docker platform environments in AWS Elastic Beanstalk.

- [D] Install Kubernetes on Amazon EC2 instances and run the control plane on those instances.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-emr-spark-processing (type: single)

A retail company has existing Apache Spark applications that process about 50 TB of sales data every night. The company is moving the data to Amazon S3 and wants to keep running the Spark applications with minimal changes. The company does not want to install, configure or tune the Spark and Hadoop software on its own servers.

Which AWS service should the company use?


- [A] Amazon Kinesis Data Streams

- [B] AWS Batch

- [C] AWS Lambda

- [D] Amazon EMR

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-eventbridge-saas-routing (type: single)

A company uses a SaaS ticketing application that is an Amazon EventBridge partner. Every new ticket must be archived by an AWS Lambda function, and tickets with a priority field of "high" must also start an AWS Step Functions workflow. The company does not want to poll the SaaS API and wants to write as little integration code as possible.

Which solution will meet these requirements?


- [A] Create an Amazon SNS topic for the tickets and subscribe both targets with a filter policy on the priority field.

- [B] Associate the partner event source with an event bus and create EventBridge rules whose event patterns route events to the targets.

- [C] Schedule a Lambda function every minute to call the SaaS API, then invoke the archive function and the workflow.

- [D] Have the SaaS application send webhooks to an Amazon SQS queue that an EC2 instance reads to route the tickets.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-fargate-long-event-task (type: single)

A media company analyzes each video that is uploaded to an Amazon S3 bucket. The analysis is packaged as a container image, needs 14 GB of memory and runs for 25 to 40 minutes per video. The company wants each upload to start the analysis automatically, by using serverless services only, with no servers or clusters of instances to manage.

Which solution will meet these requirements?


- [A] Configure an S3 event notification that sends messages to an Amazon SQS queue polled by an Auto Scaling group of EC2 instances.

- [B] Configure an S3 event notification that invokes a Lambda function built from the container image with 10,240 MB of memory.

- [C] Turn on Lambda SnapStart for a function that runs the analysis and invoke it from an S3 event notification.

- [D] Send the bucket's events to Amazon EventBridge with a rule that runs an Amazon ECS task on AWS Fargate.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-fsx-lustre-s3-hpc (type: single)

A genomics company stores raw sequencing data as objects in an Amazon S3 bucket. Several times each month, the company runs a large Linux compute cluster on Amazon EC2 that must read this data through a shared file system with sub-millisecond latency and very high aggregate throughput. The file system must present the S3 objects as files and write results back to the bucket.

Which solution will meet these requirements?


- [A] Create an Amazon FSx for Lustre file system linked to the S3 bucket and mount it on the cluster nodes.

- [B] Create an Amazon EFS file system that uses Max I/O mode and copy the data into it before each run.

- [C] Create an Amazon FSx for Windows File Server file system and copy the data into it before each run.

- [D] Deploy Amazon S3 File Gateway on an EC2 instance and mount its NFS share on the cluster nodes.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-fsx-ontap-multiprotocol (type: single)

A company runs an on-premises NetApp ONTAP storage cluster. The same volumes are accessed by Linux servers over NFS and by Windows clients over SMB, and several databases use iSCSI LUNs from the cluster. The company wants to move this storage to a fully managed AWS service, replicate the data during the migration by using NetApp SnapMirror, and keep every application on the protocol it uses today.

Which solution will meet these requirements?


- [A] Migrate the volumes to Amazon FSx for OpenZFS and replicate them with AWS DataSync.

- [B] Migrate the NFS data to Amazon EFS and the SMB data to Amazon FSx for Windows File Server.

- [C] Migrate the volumes to Amazon FSx for Windows File Server and replicate them with AWS DataSync.

- [D] Migrate the volumes to Amazon FSx for NetApp ONTAP and replicate them with SnapMirror.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-fsx-windows-smb (type: single)

A company is migrating Windows-based application servers to Amazon EC2. The applications use SMB file shares whose NTFS permissions are granted to Microsoft Active Directory groups. The company wants a fully managed file service that supports native SMB access and Active Directory authentication and that remains available if an Availability Zone fails.

Which solution will meet these requirements?


- [A] Create an Amazon FSx for Lustre file system and share it with the Windows instances.

- [B] Create an Amazon EFS file system and mount it on the Windows instances.

- [C] Create a Multi-AZ Amazon FSx for Windows File Server file system joined to the Active Directory domain.

- [D] Attach Amazon EBS volumes to a Windows EC2 instance and share its folders over SMB.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-global-accelerator-udp (type: single)

A gaming company runs its multiplayer game servers on Amazon EC2 instances behind Network Load Balancers in two AWS Regions. The game uses a custom UDP protocol. Players' networks must allow traffic to a small, fixed set of IP addresses, and player traffic should travel over the AWS global network as early as possible. If the endpoints in one Region become unhealthy, traffic must move to the other Region in less than a minute.

Which solution will meet these requirements?


- [A] Replace the Network Load Balancers with Application Load Balancers that have Elastic IP addresses.

- [B] Create Amazon Route 53 failover records that point to the two Network Load Balancers.

- [C] Create an Amazon CloudFront distribution with both Network Load Balancers as origins in an origin group.

- [D] Create an AWS Global Accelerator standard accelerator with both Network Load Balancers as endpoints.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-gp2-to-gp3-iops (type: single)

A company runs a MySQL database on an Amazon EC2 instance. The data is on a 200 GiB Amazon EBS gp2 volume, which has a baseline of 600 IOPS. During business hours the volume runs out of burst credits and query latency increases. The workload needs a sustained 5,000 IOPS and 250 MiB/s of throughput, and the data size will not grow.

Which solution will meet these requirements MOST cost-effectively?


- [A] Change the volume to st1 to get higher throughput for the database.

- [B] Increase the size of the gp2 volume to 1,700 GiB so that its baseline exceeds 5,000 IOPS.

- [C] Change the volume to gp3 and provision 5,000 IOPS and 250 MiB/s of throughput.

- [D] Change the volume to io2 and provision 5,000 IOPS.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-graviton-price-performance (type: single)

A company runs a fleet of Java microservices on general purpose x86-based Amazon EC2 instances. The services run on the JVM and do not depend on any native x86 libraries. The company wants better price performance for this general purpose workload with minimal or no changes to the application code.

Which solution will meet these requirements?


- [A] Move the services to EC2 Dedicated Hosts of the same instance family.

- [B] Move the services to Graviton-based general purpose instances, such as M7g.

- [C] Move the services to memory optimized instances of the X family.

- [D] Rewrite the services as AWS Lambda functions behind API Gateway.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-hpc-cluster-efa (type: multi)

An engineering company runs a tightly coupled computational fluid dynamics simulation that uses MPI across 64 Amazon EC2 instances. Most of the traffic flows between the instances, and the simulation needs the lowest and most consistent inter-node latency and the highest throughput that EC2 can provide.

Which combination of actions will meet these requirements? (Choose two.)


Choose 2.

- [A] Launch the instances in a spread placement group across three Availability Zones.

- [B] Launch all the instances in a cluster placement group in a single Availability Zone.

- [C] Use an EFA-supported instance type and attach an Elastic Fabric Adapter to each instance.

- [D] Launch the instances in a partition placement group with seven partitions.

- [E] Spread the instances across two AWS Regions and connect the VPCs with peering.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}

---

## saac03-3a-instance-store-scratch (type: single)

A video rendering application runs on a fleet of Amazon EC2 instances. Each instance downloads source files from Amazon S3, writes large temporary files during rendering, and uploads the result back to Amazon S3. The temporary files need the lowest possible storage latency and can be re-created if an instance fails. The company does not want to pay separately for the temporary storage.

Which storage option should the company use for the temporary files?


- [A] An Amazon EFS file system shared by all the instances

- [B] An Amazon EBS io2 Block Express volume attached to each instance

- [C] The NVMe instance store volumes of an instance type that includes them

- [D] An Amazon S3 bucket used as a scratch location through the AWS SDK

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-io2-block-express (type: single)

A company is moving a critical OLTP database to a single Amazon EC2 instance built on the Nitro System. The database vendor requires one block storage volume that sustains 150,000 IOPS with consistent sub-millisecond latency. The data must survive instance stops and failures, and the company wants the highest durability that Amazon EBS offers.

Which storage configuration will meet these requirements?


- [A] One Amazon EBS io1 volume provisioned with its maximum IOPS

- [B] One Amazon EBS io2 Block Express volume provisioned with 150,000 IOPS

- [C] One Amazon EBS gp3 volume provisioned with its maximum IOPS

- [D] One NVMe instance store volume on a storage optimized instance

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-kinesis-multi-consumer (type: single)

A media company ingests about 50,000 clickstream records per second from its websites. Three applications must each read every record independently, with sub-second latency, and records for the same user session must be processed in order. A new analytics application that the company will add later must be able to reprocess the last 7 days of records. Producers and consumers must scale independently.

Which solution will meet these requirements?


- [A] Publish the records to an Amazon SNS topic with an Amazon SQS queue subscribed for each application.

- [B] Send the records to an Amazon SQS standard queue that the three applications poll.

- [C] Send the records to an Amazon Data Firehose stream that delivers them to an Amazon S3 bucket for the applications.

- [D] Write the records to a Kinesis data stream keyed by session ID with a 7-day retention period.

ANSWER FORMAT: {"optionId": "<letter>"}

---

## saac03-3a-lambda-cold-start-java (type: multi)

A company exposes an API through Amazon API Gateway and an AWS Lambda function that uses the Java 21 managed runtime. The function's initialization takes several seconds, so users see slow responses whenever Lambda creates new execution environments during traffic increases. The company must reduce this startup latency.

Which actions will meet this requirement? (Choose two.) Each correct answer presents a complete solution.


Choose 2.

- [A] Configure provisioned concurrency on an alias of the function.

- [B] Configure reserved concurrency for the function.

- [C] Increase the function timeout to 900 seconds.

- [D] Increase the function's ephemeral storage to 10,240 MB.

- [E] Turn on Lambda SnapStart and invoke the function through a published version or an alias.

ANSWER FORMAT: {"optionIds": ["<letter>", ..]}
