Once the storage products are chosen, an architect must configure them: location and class, capacity units, access control and encryption, transfer paths, retention and lifecycle, growth, and backups. Exam questions give a constraint such as "keep records seven years, nobody may delete them", "RPO of 15 minutes across regions" or "no long-lived credentials for external partners", and ask which setting or feature meets it with the least cost or effort.

<!-- section: storage-allocation | objectives: 2.2.1 -->
## Data storage allocation

**Cloud Storage buckets**: the location is chosen at creation (region, dual-region, or multi-region `US`, `EU`, `ASIA`); the default storage class is Standard unless you set one. A bucket can be relocated after creation only if Storage Intelligence is configured; otherwise move the data to a new bucket in the other location.

| Class | Minimum storage duration | Retrieval fee | SLA (multi-region or dual-region / region) |
| --- | --- | --- | --- |
| Standard | None | No | 99.95 % / 99.9 % |
| Nearline | 30 days | Yes | 99.9 % / 99.0 % |
| Coldline | 90 days | Yes | 99.9 % / 99.0 % |
| Archive | 365 days | Yes | 99.9 % / 99.0 % |

All classes have the same eleven-nines durability and millisecond access: Archive is not an offline tier.

```bash
gcloud storage buckets create gs://example-media-eu \
  --location=EU --default-storage-class=STANDARD \
  --uniform-bucket-level-access --public-access-prevention \
  --enable-autoclass --autoclass-terminal-storage-class=ARCHIVE
```

**Block storage** for Compute Engine and GKE:

| Option | Use |
| --- | --- |
| Hyperdisk Balanced | Default for most boot and data disks; IOPS and throughput provisioned independently of size; up to 64 TiB |
| Hyperdisk Balanced High Availability | Synchronous replication across two zones (zero RPO for a zonal failure) |
| Hyperdisk Extreme | Highest IOPS: SAP HANA, high-end SQL Server and Oracle |
| Hyperdisk Throughput | Throughput-heavy analytics (Hadoop, Kafka), cold data; not a boot disk |
| Hyperdisk ML | Read-only model weights attached to many instances |
| Persistent Disk (balanced, SSD, standard; regional variants) | Machine series that don't support Hyperdisk |
| Local SSD | Highest performance scratch space, data lost when the VM stops |

**File storage**: Filestore Zonal (1–100 TiB) or Regional (zone-failure resilient) for NFS shares; Multishares for GKE (Enterprise) for many small Kubernetes volumes. Basic HDD and Basic SSD are legacy tiers.

> **Exam trap.** Choosing Archive for data read every week makes retrieval fees exceed the storage savings. And deleting or overwriting a Coldline object after 20 days is charged as if it had stayed 90 days.

<!-- section: processing-provisioning | objectives: 2.2.2 -->
## Data processing and compute provisioning

Each data service has its own unit of compute capacity:

| Service | Capacity unit | Provisioning choices |
| --- | --- | --- |
| BigQuery | Slots | On-demand (billed per TiB processed) or editions: Standard (autoscaling only, up to 1,600 slots), Enterprise and Enterprise Plus (baseline plus autoscaling slots, 1-year or 3-year commitments) |
| Spanner | Processing units (1,000 = 1 node, minimum 100) | Fixed size or managed autoscaler (Enterprise and Enterprise Plus editions) |
| Bigtable | Nodes per cluster | Manual or autoscaling on CPU and storage targets; one cluster per zone, several clusters for replication |
| Cloud SQL | Machine type (vCPU, memory), edition | Enterprise or Enterprise Plus (larger machines, data cache, sub-second maintenance downtime) |
| AlloyDB | Primary instance plus read pool instances | Scale reads by adding read pool nodes |
| Dataflow | Worker VMs | Autoscaling by the service |
| Managed Service for Apache Spark | Cluster (master and workers, Spot secondary workers) or serverless batches | Ephemeral cluster per job, or serverless to avoid cluster management |

```bash
gcloud spanner instances create orders-prod \
  --config=regional-europe-west1 --description="Orders" \
  --edition=ENTERPRISE \
  --autoscaling-min-processing-units=1000 --autoscaling-max-processing-units=5000 \
  --autoscaling-high-priority-cpu-target=65 --autoscaling-storage-target=90
```

BigQuery features also depend on the edition: CMEK, VPC Service Controls, BigQuery ML and fine-grained security (column-level access, row-level security, data masking) are not in Standard edition; managed disaster recovery is Enterprise Plus only.

> **Exam tip.** "Unpredictable ad hoc queries, small team" fits BigQuery on-demand; "predictable monthly cost" or "workload isolation between departments" fits edition reservations with baseline slots.

<!-- section: security-access | objectives: 2.2.3 -->
## Security and access management

Cloud Storage:

- **Uniform bucket-level access**: IAM only, ACLs disabled (can be reverted for 90 days). Required for managed folders and recommended everywhere.
- **Public access prevention**: blocks `allUsers` and `allAuthenticatedUsers` grants; enforce it with the organization policy constraint `storage.publicAccessPrevention`.
- Predefined roles: Storage Object Viewer, Storage Object Creator (write without read or overwrite, good for upload-only clients), Storage Object User, Storage Object Admin, Storage Admin.
- **Signed URLs** (V4, up to 7 days): time-limited access for users without a Google identity. No key to share, no IAM grant.
- **IAM Conditions** limit grants by name prefix or time.

Encryption choices:

| Option | Key held by | When |
| --- | --- | --- |
| Default encryption | Google | No specific requirement |
| CMEK (Cloud KMS, Cloud HSM, Cloud EKM) | You, in Cloud KMS or an external key manager | Control rotation, revoke access by disabling the key, keys outside Google (EKM) |
| CSEK | You, sent with each request | Cloud Storage (CSEK for Compute Engine is deprecated); losing the key loses the data |

For CMEK, grant the service agent of the product (for example the Cloud Storage service agent) `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the key.

Databases: Cloud SQL with private IP only and the Cloud SQL Auth Proxy or language connectors (IAM-authorized, TLS); IAM database authentication instead of passwords where supported. BigQuery: dataset and table IAM, authorized views, policy tags for column-level access, row access policies. **VPC Service Controls** perimeters protect Cloud Storage, BigQuery, Spanner and Bigtable APIs from exfiltration even with valid credentials.

> **Exam trap.** Granting a partner a service account key to download objects violates least privilege and key-management practice. Signed URLs (or Workload Identity Federation for a partner's workloads) are the expected answer. Identity federation with Cloud Storage APIs works only on buckets with uniform bucket-level access, and federated identities cannot generate signed URLs.

<!-- section: transfer-latency | objectives: 2.2.4 -->
## Configuration for data transfer and latency

| Scenario | Configuration |
| --- | --- |
| Copy a few files or directories | `gcloud storage cp` or `rsync` (parallel by default; parallel composite uploads for large files) |
| Recurring or large (more than 1 TiB) transfer from S3, Azure, URLs or another bucket | Storage Transfer Service, agentless, scheduled or event-driven |
| On-premises file systems or HDFS | Storage Transfer Service agents, with a bandwidth limit, over Interconnect |
| Petabytes with little bandwidth | Transfer Appliance |
| Operational database changes into BigQuery | Datastream |
| Repeated reads of the same objects by compute in one zone | Rapid Cache (formerly Anywhere Cache), SSD-backed zonal read cache |
| Public static content worldwide | Cloud CDN on a global external Application Load Balancer with a backend bucket |

Latency rules: place compute in the bucket's or database's region; use a **dual-region** bucket when two regions need local access with one namespace; add Cloud SQL **read replicas** (asynchronous) for read-heavy loads; Spanner read-only replicas or multi-region configurations for reads near users; Bigtable multi-cluster routing to serve from the nearest cluster. Keep BigQuery datasets that are queried together in the same location.

```bash
gcloud storage cp -r ./exports gs://example-landing-eu/exports/
gcloud storage rsync -r ./media gs://example-media-eu/media --delete-unmatched-destination-objects
```

> **Exam tip.** A Cloud SQL cross-region read replica serves reads and can be promoted for disaster recovery, but it can't take writes. Multi-region writes with strong consistency are Spanner.

<!-- section: retention-lifecycle | objectives: 2.2.5 -->
## Data retention and data lifecycle management

**Object Lifecycle Management** rules act on age, creation date, storage class, version state or name prefix and suffix. `SetStorageClass` only moves objects to a colder class; `Delete` removes them; changes can take up to 24 hours to apply.

```json
{
  "lifecycle": {
    "rule": [
      { "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" },
        "condition": { "age": 90, "matchesStorageClass": ["STANDARD", "NEARLINE"] } },
      { "action": { "type": "Delete" },
        "condition": { "age": 2555 } },
      { "action": { "type": "Delete" },
        "condition": { "isLive": false, "numNewerVersions": 3 } }
    ]
  }
}
```

```bash
gcloud storage buckets update gs://example-records --lifecycle-file=lifecycle.json
```

**Autoclass** moves each object by its own access pattern: to Nearline after 30 days without access, Coldline after 90, Archive after 365 (if the terminal class is Archive), and back to Standard on read; no retrieval or early deletion fees, a management fee instead; objects under 128 KiB stay Standard. It can't be combined with `SetStorageClass` lifecycle rules.

Retention and immutability:

| Requirement | Feature |
| --- | --- |
| Objects can't be deleted or replaced before N days (up to 100 years) | Bucket retention policy |
| The policy itself must never be shortened or removed (WORM, regulators) | **Bucket Lock**: lock the retention policy (irreversible; the period can only increase) |
| Keep specific objects until an event (litigation, contract end) | Event-based or temporary object holds |
| Different retention per object | Object Retention Lock |
| Recover from accidental deletion or overwrite | Soft delete (on by default, 7 days, 3–90 days or off) and Object Versioning |

```bash
gcloud storage buckets update gs://example-records --retention-period=P7Y
gcloud storage buckets update gs://example-records --lock-retention-period
```

BigQuery: default table and partition expiration on datasets; time travel (2–7 days, default 7) and a fixed 7-day fail-safe period; table snapshots for longer retention.

> **Exam trap.** A lifecycle rule or IAM can be changed by an administrator, so neither satisfies "no one, including administrators, can delete the records". Only a **locked** retention policy does.

<!-- section: growth | objectives: 2.2.6 -->
## Data growth planning

| Product | Growth mechanism | Watch out for |
| --- | --- | --- |
| Cloud Storage, BigQuery storage, Firestore | Scale automatically | Cost: lifecycle rules, Autoclass, partition expiration |
| Cloud SQL | Automatic storage increase | Storage can't be decreased afterward; scale up the machine or add read replicas; shard or move to Spanner or AlloyDB beyond one instance |
| Spanner | Add processing units; managed autoscaler on CPU and storage targets | Storage per compute capacity limits: storage growth can force more compute |
| Bigtable | Add nodes or clusters; autoscaling | Row key design (avoid hotspots on sequential keys such as timestamps first) |
| BigQuery queries | Partitioning (by date or ingestion time) and clustering | Queries without partition filters scan everything; `require_partition_filter` |
| Filestore Zonal, Regional | Increase capacity online | Basic tiers scale up only, never down |
| Hyperdisk | Resize online; storage pools share provisioned capacity and performance | Plan IOPS and throughput separately from size |

Plan with metrics and quotas: chart growth in Cloud Monitoring, set alerts on utilization thresholds, and request quota increases before migrations or launches. Design keys and partitions for the data volume expected in three years, not today.

> **Exam trap.** A Bigtable row key starting with a timestamp sends all new writes to one node. Put a high-cardinality field first (device ID, then reversed or bucketed timestamp).

<!-- section: data-protection | objectives: 2.2.7 -->
## Data protection: backup and recovery

| Product | Protection features |
| --- | --- |
| Cloud Storage | Soft delete, Object Versioning, dual-region with **turbo replication** (RPO 15 minutes; default replication 12 hours) or multi-region, retention policies |
| Compute Engine disks | Snapshots (incremental, scheduled with snapshot schedules, regional or multi-regional storage), machine images, Hyperdisk Balanced High Availability |
| Cloud SQL | Automated backups (1–365 retained), on-demand backups, point-in-time recovery (logs up to 7 days in Enterprise, 35 days in Enterprise Plus), HA standby in another zone, cross-region replicas, final backup at deletion |
| Spanner | Backups and backup schedules, point-in-time recovery (version retention from 1 hour default up to 7 days), database deletion protection |
| Firestore | Point-in-time recovery (7 days, per minute, disabled by default), scheduled backups |
| Bigtable | Managed backups, replication across clusters |
| BigQuery | Time travel, fail-safe, table snapshots; managed disaster recovery (Enterprise Plus) |
| Filestore | Backups, snapshots |
| Several workloads at once | **Backup and DR Service**: backup plans and **backup vaults** (immutable and indelible, enforced minimum retention up to 99 years) for Compute Engine, Persistent Disk, Filestore, VMware Engine VMs, Cloud SQL, AlloyDB and self-managed databases |

Match the design to RPO and RTO: high availability (Cloud SQL HA, regional disks, Spanner) handles zone failures with near-zero RPO; backups handle corruption, deletion and ransomware; cross-region replicas or turbo replication handle regional disasters. Store backups in a separate project or vault so that compromising the workload project doesn't delete them.

```bash
gcloud compute resource-policies create snapshot-schedule daily-7d \
  --region=europe-west1 --daily-schedule --start-time=02:00 \
  --max-retention-days=7 --on-source-disk-delete=keep-auto-snapshots
gcloud compute disks add-resource-policies db-data --zone=europe-west1-b \
  --resource-policies=daily-7d
```

> **Exam trap.** Replication is not backup: an accidental `DELETE` or ransomware encryption replicates to the replica in seconds. Protection against logical corruption needs point-in-time recovery or backups, ideally immutable ones in a Backup and DR vault.

<!-- section: key-points -->
## Key points

- Minimum durations: Nearline 30, Coldline 90, Archive 365 days; all classes have millisecond access. Autoclass for unknown access patterns.
- Hyperdisk Balanced is the default block storage; Balanced High Availability for synchronous cross-zone replication.
- Capacity units: BigQuery slots, Spanner processing units, Bigtable nodes, Cloud SQL machine type and edition.
- Uniform bucket-level access and public access prevention everywhere; signed URLs for users without Google identities; CMEK for key control.
- Storage Transfer Service for large or recurring transfers, Transfer Appliance when bandwidth is the bottleneck.
- Locked retention policy is the only control that even administrators can't bypass; soft delete keeps deleted objects 7 days by default.
- Turbo replication gives a 15-minute RPO on dual-region buckets; replication isn't backup; Backup and DR vaults are immutable.
