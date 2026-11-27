# C-gcp-pca-2 — report

Chapters written (English only): `14-network-storage-compute-design`, `15-migration-future`, `21-network-topologies`, `22-storage-systems` (about 1,450–2,100 words each). `npx tsx factory/check-cert.ts gcp-pca …` → 0 problems; `npm run content:validate -- --cert gcp-pca --course --chapters …` → 0 problems, 101/101 objectives covered.

## Renames applied (verified on docs.cloud.google.com, 2026-11-27)

- Vertex AI → Gemini Enterprise Agent Platform / Agent Platform; Model Garden, Agent Platform Pipelines, Agent Engine → Agent Runtime, Vertex AI Search → Agent Search (official "name changes" page, updated 2026-11-20).
- Dataproc and Serverless for Apache Spark → **Managed Service for Apache Spark**; Cloud Composer → **Managed Service for Apache Airflow**. Other chapters and the question bank should follow (the exam guide may still use the old names).
- Anywhere Cache → **Rapid Cache**.
- Memorystore for Memcached is marked Deprecated.
- `gcloud compute images import` is deprecated → `gcloud migration vms image-imports create` (used in chapter 15).
- Well-Architected Framework now has six pillars (sustainability added). Chapter 13 and others should check this.

## Doubts / left out

- Launch stage not shown on the pages for Rapid Cache, Rapid storage / zonal buckets, Managed Lustre, worker pools: Rapid storage left out; Rapid Cache and Managed Lustre mentioned only as options, never as a deciding answer.
- The global external passthrough Network Load Balancer is Preview: not mentioned.
- Spot VMs: the doc now says the preemption notice is 0 s (default) or 120 s, plus a best-effort 30-second shutdown. The course says "best-effort 30-second shutdown". The exam profile's "30 s notice" wording should be read that way.
- Cross-Cloud Interconnect speeds: the doc lists 400 Gbps for AWS and OCI, but its comparison table still says "10 Gbps or 100 Gbps". The course gives both.
- Not verified, so left out: CUD percentages and whether commitments can be cancelled, Cloud SQL maximum storage, Bigtable per-node storage and SLA figures, Firestore backup retention, VMware Engine licensing (Broadcom/VCF), whether Migration Center is free.
- Resource-based CUD terms: the doc mentions terms "up to six years". The course doesn't give the term length for resource-based commitments.
