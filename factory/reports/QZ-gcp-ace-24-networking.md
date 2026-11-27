# QZ-gcp-ace-24-networking — notes

`content/gcp-ace/quizzes/24-networking.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.3.1 (q1, q4), 2.3.2 (q2, q7), 2.3.3 (q6), 2.3.4 (q8, q9), 2.3.5 (q5, q10), 2.3.6 (q3). Positions 6–10: single ×2, multi ×3 (q7 and q9 choose two, q10 choose three).

## Chapter (or mock questions) vs current docs (fix in the chapter, not done here)

- **Health check probe ranges.** The chapter (load balancer section and the `allow-hc` example in the firewall section) gives `35.191.0.0/16` and `130.211.0.0/22`. The current "Health checks overview" page (docs.cloud.google.com/load-balancing/docs/health-check-concepts) doesn't mention `130.211.0.0/22`. It lists `35.191.0.0/16` for Application Load Balancers, proxy Network Load Balancers and internal passthrough Network Load Balancers. It lists `136.124.104.0/22` and `136.124.108.0/22` for global external passthrough Network Load Balancers, and also shows `209.85.152.0/22` and `209.85.204.0/22`. Please check the chapter and any mock question that uses `130.211.0.0/22`. q5 of this quiz uses only `35.191.0.0/16`.
- **99.99% Dedicated Interconnect.** The chapter says 99.99% means four connections, two in each of two metros. The current tutorial also documents a **single-region 99.99%** topology: at least four connections in one supported metro, ordered through a connection group with the `PRODUCTION_CRITICAL` topology capability, and four VLAN attachments in one region. In that topology, regional or global dynamic routing is allowed. The multi-region topology still requires global dynamic routing and one Cloud Router per region. The chapter should mention both.
- **Backend buckets.** "Backend buckets overview" now lists global external, classic, regional external, cross-region internal and regional internal Application Load Balancers. The older classic setup page still says global external and classic only. The chapter is not wrong, but the newer list is broader.
- Confirmed as written: four reserved addresses, `/29` minimum, expand but never shrink (no traffic interruption; auto-mode subnets limited to `/16`; proxy-only subnets can't be expanded); deny wins at equal priority; tags and service accounts can't be mixed in one VPC firewall rule; the default enforcement order is `AFTER_CLASSIC_FIREWALL` (hierarchical → regional system → VPC rules → global → regional → implied), and evaluation stops at the first `allow`/`deny`; regional dynamic routing advertises and uses routes only in the Cloud Router's region; Cloud Interconnect is not encrypted by default (HA VPN over Cloud Interconnect or MACsec); Cloud VPN alone doesn't reduce egress costs; Standard Tier doesn't support Cloud VPN, Cloud CDN or global IPs, and the VM SLA is 99.9% versus 99.99% for Premium.

## Not verified on a fetched page

- q4 option d: "a subnet that contains VMs can't be deleted". This is general knowledge and was not quoted from a fetched page.
- q9: no fetched page states that Dedicated Interconnect needs no service provider in exactly those words. The overview says "direct physical connection" for Dedicated and "through a supported service provider" for Partner.
- q10: `--enable-cdn` on `backend-buckets create` and `--backend-bucket-path-rules` / `--backend-service-path-rules` were checked with the local `gcloud ... --help` (SDK 570.0.0). The setup page shows the path matcher flags but not `--enable-cdn`.
- Every gcloud command and flag in the quiz was checked with the local `--help`.

## Design notes

- The mock bank covers this chapter densely (47 questions). New decisions here: the usable-address count, the deny-over-allow tie-break, the Standard Tier path and SLA, in-place subnet expansion, the health check firewall rule, source and target service accounts versus tags, VPC rules evaluated before the network policy (fixed by deleting the rule or by a hierarchical deny), global dynamic routing, Dedicated Interconnect with HA VPN over Cloud Interconnect, and backend bucket path rules.
- No Preview feature is an answer.
