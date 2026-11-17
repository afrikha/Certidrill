# K-az-305-cs4 — report

## Delivered

- `az305-cs4a-relecloud` (SaaS publisher leaving a hosting provider): 6 questions — 2.1.2 single, 4.3.4 single, 4.4.5 dropdown, 3.1.3 multi, 4.3.1 dropdown, 1.3.1 dragdrop.
- `az305-cs4b-fourthcoffee` (retail chain, App Service ordering platform): 6 questions — 2.1.2 single, 2.2.2 single, 2.3.1 dropdown, 4.4.4 single, 1.1.2 yes/no, 4.2.6 single.
- Types: single 6, dropdown 3, multi 1, yes/no 1, dragdrop 1. Difficulty: 4 easy, 6 medium, 2 hard.
- Validator: `CERT=az-305 npx tsx factory/validate.ts --prefix az305-cs4` → 14 files, 0 problem(s).

## Deviations

- First draft (Blue Yonder Airlines, Humongous Insurance) was discarded: the cs1/cs2/cs3 agents published the same companies and the same decisions while I was writing (the case-studies folder was empty when I listed it). Second draft was reworked twice more for the same reason (caching, App Configuration, Application Insights, zone-spanning scale set, elastic pool, NAT gateway were taken by cs2b, cs2c, cs3b, cs3c in the meantime). Superseded drafts are in `/tmp/K-az-305-cs4/old/`, not in the repository.
- Overlap check was last run against the cs1–cs3 files present at the end of my run. Those agents were still writing: a reviewer should rerun a "same objective, same answer" comparison across all `az305-cs*` questions.
- Remaining topical proximity that I judged acceptable (different decision): `az305-cs4b-log-routing` (1.1.2) tests the region constraint of event hubs and the one-destination-per-type rule, where `az305-cs1c-log-destinations` tests which destination to choose; `az305-cs4b-release` (4.2.6) is a slot swap, where `az305-cs2b-region-deployment` is a deployment stack.

## Facts not found on a fetched page (stated from the course chapter or common knowledge)

- `az305-cs4a-load-balancing`: public and private frontend IP addresses on Application Gateway v2, client IP preserved by Azure Load Balancer (pass-through). The fetched page (Load balancing options) only gives the regional/global and HTTP/non-HTTP classification, and says Application Gateway is a terminating load balancer for TCP/TLS.
- `az305-cs4a-database-backup`: "Azure Backup does not protect SQL Managed Instance" (the fetched LTR page only says that LTR is managed by the Azure SQL service).
- `az305-cs4b-database-access`: an app with virtual network integration reaching a private endpoint (the fetched page compares private endpoints and service endpoints in general).
- `az305-cs4b-audit-database`: Basic tier capacity (5 DTUs, from course chapter 21).
- `az305-cs4a-resource-organization`: the CAF page only says that tags serve cost allocation; grouping costs by tag in Cost Management was not fetched.

## Web fetch

- The hourly WebFetch limit was hit once (about 06:39 UTC); work resumed after 07:00 UTC. All 12 questions reference pages fetched in this run, with the H1 as title.
