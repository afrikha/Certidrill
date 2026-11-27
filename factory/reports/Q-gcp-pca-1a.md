# Q-gcp-pca-1a — questions GCP-PCA, domain `design`, objectives 1.1.1–1.1.11

44 files `content/gcp-pca/questions/design/gcppca-1a-*.yaml`, all `draft`, English only. Validator: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-1a-` → `44 files, 0 problem(s)`; `npm run content:validate -- --cert gcp-pca --prefix gcppca-1a-` → 0 problem(s), 0 warning(s).

- Per objective: 4 each for 1.1.1 to 1.1.11.
- Types: single 35, multi 9 (all "Choose two.", 5 options, no scoring NOTE because the blueprint scores multi all or nothing).
- Difficulty: 9 easy, 22 medium, 13 hard.
- Single answers spread: a 8, b 9, c 9, d 9.

## Sources fetched (2026-11-27, docs.cloud.google.com unless noted)

Cloud Storage availability/durability, Autoclass, storage classes, bucket locations, Bucket Lock, Requester Pays, signed URLs, public access prevention, bucket relocation; Spot VMs; CUDs; instance schedules; Asynchronous Replication; regional MIGs; Spanner instance configurations and PostgreSQL interface; Bigtable overview; Firestore offline; Cloud Run autoscaling and ingress; BigQuery overview, cost control, query computation, partitioned tables, storage overview, managed disaster recovery, cross-region dataset replication, dataset management, locations, global queries, Omni, Redshift migration, BigQuery sharing, pricing (cloud.google.com/bigquery/pricing); Pub/Sub overview, ordering, push, push authentication, exactly-once, BigQuery subscriptions; Cloud Tasks vs Pub/Sub; Memorystore for Redis; Apigee (what is Apigee, API products, portals, monetization); API Gateway; Application Integration; Integration Connectors; Workload Identity Federation with AWS; Transfer Appliance; Storage Transfer Service overview and agents; Datastream overview and MySQL source configuration; Database Migration Service overview and promotion; GKE Autopilot security and feature comparison; GKE pricing (cloud.google.com); Network Service Tiers; Application Load Balancer overview; Cloud CDN; AlloyDB columnar engine and cross-region replication; Cloud SQL overview, HA and cross-region replicas; VMware Engine; Document AI; Google Distributed Cloud connected; Cloud Marketplace SaaS; resource hierarchy; Cloud Billing export; Well-Architected cost pillar and unit economics, CloudOps readiness; DR planning guide; migration getting started; SLO concepts; VPC Service Controls; Cloud EKM; Assured Workloads; Cloud KMS destroy/restore; Sensitive Data Protection de-identification and pseudonymization; Security Health Analytics; shared responsibility; restrict service usage; restrict resource locations; domain-restricted sharing; vmExternalIpAccess; Cloud NAT; MACsec; Cloud Audit Logs.

## Deviations from the first plan (overlap with other batches)

Other agents were writing GCP-PCA questions at the same time. I replaced topics that already existed in their files with the same decision and answer: Cloud Run scale to zero, Bigtable smart meters, Firestore offline (1c); turbo replication and backup vault (4b-bc); Spot batch and flexible CUD (4b-cost, 1c); Autoclass (2a, cs1a, 1c); Transfer Appliance, STS from S3, STS agents for NFS, signed URLs, public access prevention (2a); WIF with AWS (5b); Cloud EKM, shared responsibility, pseudonymization, vmExternalIpAccess, Assured Workloads (3a/3b); VMware Engine exit (cs1b); Memorystore sessions and AlloyDB columnar (1c); BigQuery Omni (1c); labels + billing export showback (4b). Some adjacent topics remain (Datastream: mine tests the MySQL binlog setup against 1c's Oracle stream; Cloud SQL HA + cross-region replica against the cs1b DR case question; rolling SLO period against 6b's error-budget gate). A reviewer should check these against the final bank.

## Not verified on a fetched page (stable knowledge, review)

- Pub/Sub push requests do not leave from the customer's VPC, so Cloud NAT doesn't apply (gcppca-1a-pubsub-push-authenticated, distractor d).
- Customer-supplied encryption keys aren't supported by BigQuery (gcppca-1a-crypto-shredding-tenant-keys, distractor c).
- BigQuery federated queries reach Cloud SQL and Spanner, not self-managed MySQL (gcppca-1a-datastream-mysql-bigquery, distractor c).
- Cloud Monitoring SLOs offer request-based and windows-based evaluation (gcppca-1a-rolling-slo-window, distractor b).
- A HorizontalPodAutoscaler keeps at least one replica by default; stopped VMs aren't billed for vCPU/memory; VPC Flow Logs are off by default.
- Passthrough Network Load Balancers don't use serverless NEGs (gcppca-1a-tls-termination-in-region, distractor c).
- Launch stages: the fetched pages showed no Preview label, but didn't state GA, for BigQuery managed disaster recovery, cross-region dataset replication, the Redshift migration transfer, the Salesforce connection of Integration Connectors, and the AlloyDB columnar engine (no longer used). Global queries (Preview) and dataset copy (Beta) were deliberately not used as answers.

## Doubts on reference titles

- `cloud.google.com/bigquery/pricing`: the fetch tool read the title as "BigQuery | Google Cloud" with H1 "BigQuery pricing"; the reference uses "BigQuery pricing | Google Cloud". Check it.
- Google Distributed Cloud connected overview: the title came back as "Overview of connected deployments of Google Distributed Cloud | Google Distributed Cloud connected | Google Cloud Documentation"; check that it's exact.
- `storage-transfer/docs/on-prem-overview` now redirects to "Manage transfer agents" (not used in the final batch).
- Security Health Analytics is disabled for new Security Command Center activations (Compliance Manager replaces it), and Enterprise tier shuts down on 21 May 2027: worth telling the authors of the security batches.
