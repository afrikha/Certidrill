# C-gcp-ace-2 — report

Chapters written (English only) in `content/gcp-ace/course/chapters/`: `21-compute-engine` (7 sections + key points, 2.1.1–2.1.7), `22-gke-serverless` (5 + key points, 2.1.8–2.1.12), `23-storage-data` (4 + key points, 2.2.1–2.2.4), `24-networking` (6 + key points, 2.3.1–2.3.6).

Checks: `npx tsx factory/check-cert.ts gcp-ace 21-compute-engine 22-gke-serverless 23-storage-data 24-networking` → 0 problems for these chapters (the remaining problems are other agents' chapters). `npm run content:validate -- --cert gcp-ace --course --chapters …` → 0 problem(s).

Every `gcloud`, `bq` and `kubectl` flag in a code block was checked against the installed Google Cloud CLI 570.0.0 (`--help`). Facts were checked on docs.cloud.google.com on 2026-11-27 (WebFetch). The docs host can't be reached with curl from this sandbox.

## Length

Prose words (code excluded): 21 = about 2,370 (7 objectives, a little above the 2,200 guideline), 22 = 1,740, 23 = 1,650, 24 = 2,230. Trim 21 in review if needed.

## Facts verified that changed recently or are easy to get wrong

- Cloud Run functions: the docs now deploy them with `gcloud run deploy --source . --function ENTRY --base-image RUNTIME`. Triggers are separate Eventarc triggers. `gcloud functions deploy` is kept only "for backward compatibility". The chapter uses `nodejs24` as the base image, taken from the docs example.
- GKE network isolation: the DNS-based endpoint (`--enable-dns-access`) is recommended. `--master-ipv4-cidr` is optional. Private nodes can be turned on after creation. `get-credentials` uses `--location` in the docs, with `--dns-endpoint` and `--internal-ip` options.
- `gcloud filestore instances create` uses legacy `BASIC_HDD` when `--tier` is left out. The chapter says so.
- Spot VMs: the preemption notice is 0 s (default) or 120 s, followed by a best-effort shutdown of up to 30 s. The launch stage of the 120 s notice isn't stated, so it is mentioned only in a table row.
- Custom machine types: series N4, N4D, N4A, N2, N2D, E2, N1 and G2; 5 % premium; `-ext` suffix for extended memory; extended memory isn't available on E2.
- Regional Persistent Disk attaches only to E2, N1, N2 and N2D. C4 and C4D don't support Persistent Disk.
- BigQuery: a multi-region dataset doesn't replicate across regions. Cross-region replication uses `ALTER SCHEMA … ADD REPLICA` and is promoted with `SET OPTIONS(primary_replica=…)` (syntax from the docs page). SQL is shown in a `text` fence.
- Spanner dual-region and multi-region configurations require Enterprise Plus.
- Managed Lustre has been GA since 2025-06-30. NetApp Volumes Flex File: no new pools after 2026-09-15, so it isn't listed.
- Network Service Tiers: the 99.99 % / 99.9 % SLA covers VMs (Premium / Standard). Cloud VPN gateways and Cloud CDN aren't supported on Standard Tier.

## Doubts / left out

- "Implied rules at priority 65535": the current firewall overview page describes the implied rules but doesn't print 65535. The value is kept because it is the long-documented value and an exam classic.
- `gcloud compute instances set-scheduling` help says the VM must be stopped. The chapter says "change the settings of a stopped VM".
- The claim that Pub/Sub push to Cloud Run with an invoker service account no longer needs the Token Creator grant applies only to projects created after 2021-04-08. It is left out of the chapter.
- Left out because not verified: whether BigQuery batch loading is free, the colocation rule between a bucket and a dataset for `bq load`, Memorystore cross-region replication, Transfer Appliance capacities, Cloud Run default maximum instances and timeouts (those belong to 3.1.x chapters), and the N4 Persistent Disk support (only C4 and C4D are named).
- Rapid storage (zonal buckets) appears in the storage classes table of the docs, but no launch stage is shown, so it isn't mentioned.
- The global external passthrough Network Load Balancer is in Preview, so it isn't mentioned.
