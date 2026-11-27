# K-gcp-pca-cs6 — report

1. 3 original case studies: gcppca-cs6a-brindlewood-hr (B2B SaaS HR and payroll vendor), gcppca-cs6b-harbourline-news (news publisher with its own ad platform), gcppca-cs6c-aldermoor-horizon (airline loyalty program).
2. 15 questions (5 per case): single=12, multi=3; difficulty 3 easy / 7 medium / 5 hard.
3. Domains: design 4, provisioning 5, security 2, processes 4 (release process 4.2.5, per-tenant GKE cost 4.2.6, shadow testing 4.1.4, Spanner PITR recovery 4.1.6); each case covers 3 or 4 domains.
4. Facts checked on docs.cloud.google.com (2026-11-27); every reference is a page that was fetched. No Preview or deprecated feature is a correct answer.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs6` → 18 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-cs6` → 0 problem(s), 0 warning(s).

## Notes and doubts

- Overlap avoided on purpose: the existing bank (577 questions, cs1–cs3) already covers Identity Platform multi-tenancy (cs3c), Spanner nam-eur-asia1 selection (cs2a), Media CDN signed cookies (cs1a), GKE Sandbox, Cloud EKM, resource-location policies, showback with resource labels. The cs6 questions test other decisions: BigQuery row-level access policies for external customers, feature flags and API versioning for SaaS releases, GKE cost allocation by namespace, AlloyDB secondary cluster promotion vs switchover, domain restricted sharing override on a project, Cloud CDN cache directives plus serve-while-stale, BigQuery data clean rooms, Gemini batch inference, load balancer request mirroring, BigQuery partition expiration, Fraud Defense account defense, Mainframe Connector, parallel-run validation, Spanner key design with interleaving, Spanner PITR stale reads.
- Renamed products: reCAPTCHA is now "part of Google Cloud Fraud Defense" and the feature page says "account defense" (URL slug still `account-defender`); the question uses "Fraud Defense account defense". Batch inference page lives under `gemini-enterprise-agent-platform/...`.
- GKE cost allocation: the how-to page lists a Standard cluster as a prerequisite and does not mention Autopilot, so the case uses GKE Standard. Allocation is based on Pod requests.
- App Lifecycle Manager feature flags exist, but the page does not state a launch stage (CLI examples use `gcloud beta`), so the release-process question names no product; its reference is the DevOps capabilities page (the former "Application deployment and testing strategies" page now redirects to an index).
- Dual Run: online transactions are Preview and no GA stage is stated for the product, so it is only cited as context in the parallel-run explanation, never as an option.
- Data clean rooms: the docs page does not state a launch stage; GA comes from the Google Cloud blog post "BigQuery data clean rooms now generally available". Request mirroring has no Preview label on the traffic management page; it is supported only with MIG, zonal NEG or hybrid NEG backends, hence standalone zonal NEGs in the case.
- Cloud CDN does not support `stale-if-error`; the serve-while-stale answer relies on the page's statement that stale serving helps when the origin is unreachable, and on cached copies existing (the case says "cached articles").
- Not verified, so left out: an AlloyDB replication lag figure, BigQuery load support for EBCDIC (the explanation only says the extracts need transcoding), capacity buffers launch stage.
