# FIX-gcp-pca-bank, item 3, part A (reports Q-gcp-pca-1a/1b/1c/2a/2b, K-gcp-pca-cs1 to cs7)

Scope: the doubts flagged in these reports, for questions `gcppca-1*`, `gcppca-2*` and `gcppca-cs*` and the case-study files. Items 1, 2 and 4 of the task belong to the other agents (for example Gemini Cloud Assist launch stage, Observability Analytics name, Security Health Analytics). All facts were checked on docs.cloud.google.com with WebFetch on 2026-11-27.

Checks: `npm run -s content:validate -- --cert gcp-pca` reports 659 files, 0 problem(s), 0 warning(s). `npx tsx factory/check-quiz.ts gcp-pca` reports 16 quiz files, 0 problem(s), 0 warning(s).

## Changed files

| Id | Change | Source |
| --- | --- | --- |
| gcppca-1a-crypto-shredding-tenant-keys | Option c explanation: CSEK is a Cloud Storage feature, so it can't protect the BigQuery metadata. The old text said "not supported by BigQuery", which the page does not state. | https://docs.cloud.google.com/docs/security/encryption/customer-supplied-encryption-keys |
| gcppca-cs2b-exfiltration-keys | Option b explanation: same CSEK rewording. | same |
| gcppca-1a-datastream-mysql-bigquery | Option c explanation: federated queries read at query time and don't replicate. They are GA for Cloud SQL, AlloyDB and Spanner, and MySQL/PostgreSQL/Oracle connections are now Preview. The old text said they can't reach a self-managed MySQL server, which is no longer true. | https://docs.cloud.google.com/bigquery/docs/federated-queries-intro |
| gcppca-1a-admin-activity-audit | Option c explanation: "aren't enabled by default" (not on the Flow Logs page) is now "nobody enabled them in this project". The stem already states this. | https://docs.cloud.google.com/vpc/docs/flow-logs |
| gcppca-1a-bigquery-long-term-storage | Reference title "BigQuery pricing \| Google Cloud" changed to the page H1 "BigQuery pricing". | https://cloud.google.com/bigquery/pricing |
| gcppca-1b-global-alb-multi-region-failover | The "Choose a load balancer" reference is replaced by the page that states the cross-region behavior: the second-layer GFE sends requests to another region when it has no healthy backends. | https://docs.cloud.google.com/load-balancing/docs/https/request-distribution |
| gcppca-cs1c-retraining-pipeline | Option d explanation (Managed Airflow) now rests on the missing lineage, which the case's business requirement needs. It no longer rests on "an environment to size and maintain", which the overview does not support. | https://docs.cloud.google.com/composer/docs/composer-3/composer-overview |
| gcppca-cs5b-billing-dr | Option d explanation: an Exadata VM cluster (which runs the RAC nodes) is created in the region and zone of its Exadata infrastructure, so it can't have nodes in the secondary region. Second reference added. | https://docs.cloud.google.com/oracle/database/docs/create-clusters |
| gcppca-cs7c-open-data-bucket | Option b explanation: "inherited is already the default" (not on the page) is replaced by the documented evaluation order (project, folder, organization, first explicit value). | https://docs.cloud.google.com/storage/docs/public-access-prevention |
| gcppca-2b-gke-spot-node-pools | Option e explanation now gives the documented figures: 30 s by default, 120 s at most, and `terminationGracePeriodSeconds` does not extend it. | https://docs.cloud.google.com/kubernetes-engine/docs/concepts/spot-vms |

## Known points of item 3

- **Interconnect single-metro 99.99 % (cs1b, cs2b, and 2a-dedicated-interconnect-9999)**: the docs now describe a single-region topology. It uses a connection group with `PRODUCTION_CRITICAL`, at least four connections in one metro, attachments in one region, and only in certain supported metros. All its connections sit in one metro. Both cases require connectivity after the loss of every connection in one metro, so the distractor stays wrong and its explanations are correct. No change.
- **Spot VM notice**: confirmed. The notice is 0 s by default, and Google recommends setting it to 120 s. Then comes a best-effort shutdown of up to 30 s. No question in scope claims a 30 s notice. `gcppca-cs2c-simulation-spot` uses the 120 s notice only in distractors, which is valid. GKE wording fixed (see above).
- **Pub/Sub and direct Workload Identity Federation**: on "Identity federation: products and limitations", Pub/Sub is GA, and the only API limitation is for Pub/Sub Lite. So direct resource access is available. `gcppca-cs2a-vendor-federation` and `gcppca-cs4b-gateway-identity` use service account impersonation, which stays correct, and no wrong option depends on the point. No change.
- **Cloud SQL restart and failover, `gcloud deploy targets rollback` defaults**: these questions are outside my prefixes (`gcppca-6b-cloudsql-failover-drill`, `gcppca-5a-deploy-targets-rollback`, `gcppca-6b-deploy-targets-rollback`). I left them to the other agent, with these findings:
  - The gcloud reference says that without `--release` the command rolls back to "the last successful deployed release". This is correct for 5a, where rel-118 failed, and for 6b, which passes `--release` explicitly.
  - The Cloud SQL HA page says "Cloud SQL issues a restart instead of a failover" in some cases, logs restarts and failovers under different methods, and gives about 60 s of unavailability for a failover.

## Flagged doubts confirmed, no change

- Pub/Sub push requests come from the Pub/Sub server (1a-pubsub-push-authenticated d).
- SLO request-based vs windows-based, and rolling period 1–30 days (1a-rolling-slo-window).
- Serverless NEGs are not supported by passthrough or proxy NLBs (1a-tls-termination-in-region c).
- BigQuery managed DR: RTO 5 min, RPO aims at 15 min, hard failover proceeds with the primary offline. Its REST configuration is GA (release note 2026-11-17).
- Datastream Salesforce source is not Preview.
- The Google Distributed Cloud connected reference title is exact.
- A stopped VM still bills only disks, snapshots and attached external IPs (1a-dev-vms-instance-schedule).
- Auto mode ranges are in 10.128.0.0/9, and converting to custom mode keeps the subnets and their ranges (1c-ip-plan-overlap).
- Bigtable replication is eventually consistent by default, with a full copy per cluster (1c-global-relational-writes, 2a-bigtable-storage-autoscaling).
- License Mobility is a Software Assurance benefit, Windows Server is typically not eligible, and Outsourcing Software Management Rights need dedicated servers (1c-windows-byol-sole-tenant).
- C3 supports Hyperdisk Balanced, and its performance can be changed in use (1c-hyperdisk-iops).
- Spanner: 99.999 % for dual- and multi-region configurations, 99.99 % regional.
- Cloud Storage FUSE is not POSIX compliant and not like NFS (2a-filestore-regional-tier).
- Reservations need quota and also check zone capacity (2a-reservation-guaranteed-capacity).
- Cloud SQL Enterprise: PITR and automated backups are on by default only when the instance is created in the console, with 1–7 days of logs (2a-cloudsql-pitr-gcloud).
- `constraints/storage.uniformBucketLevelAccess` exists and is not retroactive, which matches the cs3 new-bucket framing. `storage.publicAccessPrevention` is retroactive.
- Cloud Run worker pools: GA on 2026-04-14, and CPU autoscaling for them entered Preview on 2026-11-18 (2b-cloud-run-worker-pool-kafka uses a fixed count).
- Feature Store optimized online serving: deprecated (2026-05-17 / sunset 2027-02-17). Bigtable online serving doesn't support embeddings (2b-feature-store-bigtable-serving).
- Transfer Appliance: recommended when a network upload takes more than one week, TA300 holds 300 TB, about 25 days of capture plus about 10 business days, which fits the cs2c six-week window.
- Cloud EKM over VPC is not available in multi-regional locations (cs3b-external-keys).
- Valkey expired keys are deleted on access. Firestore TTL deletes typically within 24 h, and expired documents still appear in queries (cs4c-search-cache).
- GKE placeholder Pods: priority -10 with `preemptionPolicy: Never`, and no node auto-provisioning below -10 (cs5a-slot-release-capacity).
- Cloud CDN serves stale content when the origin is unreachable, and does not support `stale-if-error` (cs6b-article-caching).
- Spend cap budgets: four services, one project and one service per budget, no launch stage stated (cs7b-grant-budget, distractor only).
- Cloud Storage: a public object without a cache lifetime can be cached up to 60 min (cs7c-stale-feed).
- Cloud HSM is still stated as FIPS 140-2 Level 3 (cs2b-exfiltration-keys).

## Not confirmed (left as is; no question decides on them alone)

- Launch stage of the Integration Connectors Salesforce connector, Redshift migration transfer, BigQuery Omni and Infrastructure Manager: no Preview label is shown on the fetched pages, but GA is not printed either.
- HDFS data lost on cluster deletion (2a-spark-clusters-hive-migration c): the main reason given is the 21 idle billed hours.
- IAM conditions cannot target BigQuery columns (2a-bq-policy-tags-ssn d).
- Supported load balancer types for Cloud Armor bot management and rate limiting: the cases use the global external Application Load Balancer only.
- Speech-to-Text caption output with specific models (cs3c names no model).
