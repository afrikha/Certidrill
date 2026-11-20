# C-soa-c03-4 — report

Chapters written (EN + FR): `52-dns-content-delivery` (5.2.1–5.2.3), `53-network-troubleshooting` (5.3.1–5.3.5). `check-cert`: 0 problems for these chapters.

## Notes and deviations

- Length: 52 ≈ 2,085 prose words (2,459 with code/tables by `wc`); 53 ≈ 2,390 prose words (2,766 by `wc`), slightly above the 2,200 target because it covers five objectives. Same order of size as saa-c03 35 and dva-c03 43.
- Route 53 docs now name the in-VPC resolver "Route 53 VPC Resolver" (fetched 2026-11-20); chapter 52 uses the exam guide name and mentions the new one. Route 53 Global Resolver (preview) left out.
- New features found in docs and mentioned briefly: Route 53 private endpoint health checks (health check source in a VPC), CloudFront VPC origins, CloudFront standard logging v2, Network Flow Monitor. Regional NAT gateways and CloudFront cache-tag invalidation exist but were left out (not exam-relevant / details not verified).

## Facts used from memory (not confirmed on a fetched page)

- Reachability Analyzer sends no packets; Network Access Analyzer purpose.
- AWS WAF: `aws-waf-logs-` prefix also for S3 bucket and Firehose stream names (confirmed only for log groups); one logging destination per web ACL.
- NAT gateway 55,000 connections "to one destination" (troubleshooting page says per IPv4 address).
- Flow logs default aggregation interval 10 minutes; `pkt-srcaddr`, `tcp-flags`, `flow-direction` custom fields.
- CloudFront `X-Cache` header values (`Hit/Miss/RefreshHit from cloudfront`); managed policy names `CachingOptimized`, `CachingDisabled`.
- Global Accelerator client affinity `NONE`/`SOURCE_IP`, traffic dial 0–100 %, endpoint weight 0–255 (weight also in saa-c03 chapter 35).
- ALB access-log bucket must be in the same Region; Site-to-Site VPN inside tunnel CIDR `169.254.x.x/30`; DNSSEC DS record at parent after signing.
