# K-gcp-pca-cs2 — report

## Summary
1. 3 original case studies (Google format, 6 tabs each): gcppca-cs2a-emberfall (online gaming), gcppca-cs2b-laurentide (regional bank, Canada), gcppca-cs2c-quillon (pharmaceutical research).
2. 18 questions, 6 per case: single=15, multi=3 (Choose two.); difficulty 4 easy / 9 medium / 5 hard.
3. Domains covered per case: cs2a design, provisioning, security, operations; cs2b provisioning, security, design, operations; cs2c design, provisioning, security, implementation.
4. Facts checked with WebFetch on docs.cloud.google.com on 2026-11-27; references point to the fetched pages with their H1 titles.
5. `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-cs2`: 21 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-cs2`: 0 problem(s), 0 warning(s).

## Notes and doubts
- cloud.google.com/<product>/docs URLs now redirect (302) to docs.cloud.google.com: all references use the docs.cloud.google.com host.
- Global external passthrough Network Load Balancer is listed as Preview: not used in options (voice relay question uses the regional external passthrough NLB).
- Dedicated Interconnect now documents a single-region 99.99 % topology (four connections in one metro, connection group with PRODUCTION_CRITICAL capability): used as a distractor that fails the case's "survive loss of one metro" requirement.
- Spot VMs now offer a configurable 120-second preemption notice (default 0 s): used only in distractors; no "30-second notice" claim anywhere.
- Pub/Sub support for Workload Identity Federation direct resource access could not be confirmed on the products-and-limitations page: the correct option uses service account impersonation (always supported).
- The org policy locations page names "Managed Service for Apache Spark" (possible Dataproc rename): Dataproc is not mentioned in these questions.
- Compute Engine CSEK is documented as deprecated; CSEK is described as a Cloud Storage feature (BigQuery CSEK distractor relies on this).
- Transfer Appliance timing relies on the overview's example (300 TB captured in under 25 days, data available ~10 business days later); the question's arithmetic (250 TB at 300 Mbps ≈ 77 days) is the deciding fact.
