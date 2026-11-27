# QZ-gcp-pca-12-business-tradeoffs — notes

`content/gcp-pca/quizzes/12-business-tradeoffs.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.7 (q1, q10), 1.1.8 (q8), 1.1.9 (q4), 1.1.10 (q5), 1.1.11 (q2, q6, q9), 1.1.12 (q3, q7). Positions 6–10: single ×2, multi ×3 (q7, q8, q9).

## Chapter vs current docs (fix in the chapter, not done here)

- **Migration types**: the "Migrate to Google Cloud: Get started" page lists six types: rehost, replatform, refactor, re-architect, rebuild, repurchase. It doesn't list **retire**. The chapter's table maps "Deprecate" to a "Retire" migration type and says "Google's migration guidance names six migration types that map to these decisions". Its table has seven rows, so retire looks like a Google migration type, which it isn't. Suggest rewording: retire is a disposition decision, not one of Google's six migration types.
- **Migrate to Virtual Machines sources**: the docs page lists vSphere, AWS, Azure and Google Cloud VMware Engine as sources. Physical servers aren't mentioned. The chapter doesn't claim otherwise.
- **TCO**: the assessment page's "Calculate total cost of ownership" section names hardware, software, data center operations (power, cooling, maintenance, support services) and network usage. It doesn't name people or licenses explicitly. The chapter's TCO row ("infrastructure, licenses, people, facilities") is broader, which is acceptable.
- **ROI**: none of the Google pages I fetched defines ROI. The cost optimization pillar's "Align cloud spending with business value" page talks about unit economics and DORA metrics. No quiz question relies on the ROI formula.
- **Resource locations**: the page confirms that the constraint applies only to new resources, doesn't affect global resources, and doesn't identify or fix existing violations, and that Security Health Analytics does. This matches the chapter. I couldn't confirm on a fetched page which Security Command Center tier includes that detector, so q9 states that SCC Premium is active.
- Confirmed as written: Data Access audit logs are off except for some BigQuery services, and can be enabled at organization, folder or project level; default encryption is AES-256 for all customer content; Cloud EKM keys never leave the external manager and Key Access Justifications lets the partner allow or deny by reason code; Transfer Appliance applies when an upload would take more than a week, offline data is typically available about 10 business days after the return, and an online mode exists; Bigtable multi-cluster routing never allows single-row transactions.

## Not verified on a fetched page

- q1: Storage Transfer Service scheduling and incremental behavior for S3 sources. The overview and S3 pages only link to the schedule and filter pages. The stem only says "on a schedule", and the explanation doesn't claim incremental copies for S3.
- q6: "BigQuery doesn't support customer-supplied encryption keys" is general knowledge. CSEK applies to Cloud Storage and Compute Engine, and the profile lists CSEK for Compute Engine as deprecated.
- q5: "inbound data transfer isn't charged" comes from the chapter, not from a pricing page fetched in this session.
- q10: the Transfer Appliance timeline for 400 TB (likely two TA300s or more) and the appliance order lead time aren't on the overview page. The page gives under 25 days to receive the appliance and capture 300 TB, plus about 10 business days. The 8-week deadline leaves margin, but this wasn't checked on the Specifications page. The STS agent bandwidth limit is covered by the "Manage network bandwidth" page, which is linked but wasn't fetched.

## Design notes

- I avoided the mock-exam decisions (Redshift with BigQuery DTS, Datastream from MySQL, BigQuery replicas, Pub/Sub BigQuery subscription, Transfer Appliance for an archive alone, dual-region vs regional buckets, Standard Tier, GKE Standard for privileged agents, repurchase, retire with bucket lock, Document AI, DMS, error budget minutes, rolling SLO windows, DORA stability, unit cost KPI, crypto-shredding, Admin Activity logs, restrictServiceUsage, Cloud Run ingress, Trace, metrics scopes, org sinks, Managed Prometheus). The new decisions are: STS for S3, default encryption, Data Access logs, rehost under a deadline, TCO scope, EKM plus KAJ, SLO burn-rate alerting, Spanner plus Cloud CDN for consistency vs latency, the locations constraint plus SHA for existing resources, and a bulk appliance plus nightly STS based on a transfer-time calculation.
- No Preview or deprecated product is an answer. No scoring NOTE: `blueprint.scoring.multi` is `all_or_nothing`.
