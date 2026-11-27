# K-gcp-pca-cs3 — report

1. 3 original case studies: gcppca-cs3a-tidemark-logistics (container shipping and freight forwarding), gcppca-cs3b-norvale-revenue (public-sector tax agency), gcppca-cs3c-lanternhall-learning (online education).
2. 15 questions (5 per case): single=12, multi=3; difficulty 3 easy / 8 medium / 4 hard.
3. Domains: design 4, provisioning 5, security 4, implementation 1, operations 1 (each case covers 3 or 4 domains).
4. Facts checked on docs.cloud.google.com (2026-11-27); every reference is a page that was fetched. No Preview feature is a correct answer.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs3` → 18 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-cs3` → 0 problem(s), 0 warning(s).

## Notes and doubts

- Overlap avoided on purpose: the cs1/cs2 case studies already test VMware Engine + HCX, the two-metro Interconnect topology, Bigtable row keys, the Cloud SQL DR replica, `gcp.resourceLocations`, audit-log retention in a locked bucket, Binary Authorization attestations and Workload Identity Federation with AWS. The cs3 questions test other decisions (Pub/Sub ordering keys, Apigee products and monetization, NCC site-to-site data transfer, public access prevention + uniform bucket-level access, Database Migration Service promotion, Cloud Armor rate-based ban, Cloud EKM over VPC, Object Retention Lock, load testing, GKE Sandbox on Autopilot, Model Armor, Identity Platform multi-tenancy, BigQuery baseline reservation, Speech-to-Text batch captions). Some of these also exist as standalone questions in other prefixes, in different scenarios.
- Cloud EKM over VPC is not available in multi-regional locations (Cloud EKM page): gcppca-cs3b-external-keys uses this as a distractor.
- Speech-to-Text: caption output (WebVTT/SRT) is documented for V2 BatchRecognize only; the docs do not say whether it works with Chirp 3, so the case gives each recording's language in its metadata and the question does not name a model.
- NotebookLM Enterprise now appears in the docs as "Gemini Notebook for business"; not used here because of the naming change versus the exam guide.
- Uniform bucket-level access constraint: ID `constraints/storage.uniformBucketLevelAccess`, display name "Enforce uniform bucket-level access" (org policy constraints reference). The case limits the IAM-only requirement to new buckets, so the answer does not depend on how the constraint treats existing buckets (not verified).
- The Cloud Armor rate limiting page lists rule actions and keys but not every supported load balancer type; the question uses the global external Application Load Balancer only.
