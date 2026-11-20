# Q-soa-c03-5b — report

50 questions in `content/soa-c03/questions/networking/`, prefix `soac03-5b-`, 10 per objective (5.2.1, 5.2.2, 5.2.3, 5.3.1, 5.3.2). Types: single 42, multi 8. Difficulty: 15 easy / 25 medium / 10 hard. Validator: `50 files, 0 problem(s)`.

## Naming decisions

- **Route 53 VPC Resolver**: the Route 53 docs (`resolver.html`, checked 2026-11-20) say that Route 53 Resolver "was renamed when Route 53 Global Resolver was introduced". The stems use "Route 53 VPC Resolver", while the objective text still says "Route 53 Resolver".
- **AWS WAF**: the WAF docs now say "protection pack (web ACL)". The stems use "web ACL" (as the exam guide does). Reference titles are the current page titles.
- **French**: "route" for entries in route tables (AWS fr_fr wording). The SAA-C03 bank uses "itinéraire" in places; harmonize if needed.

## Facts not fully confirmed on the fetched pages (taken from general knowledge, low risk)

- NAT gateway: "55,000 concurrent connections **to one destination**" per IPv4 address. The page says "up to 55,000 concurrent connections" per address, without "to one destination".
- Global Accelerator health-check protocols are TCP, HTTP and HTTPS (no UDP). The page confirms that a UDP listener is checked over TCP on the listener port, and that port overrides do not apply to health-check ports.
- Route 53 does not let a simple record share a name and type with records that use another routing policy (distractor in `geolocation-default`).
- Private hosted zones cannot be shared directly through AWS RAM (distractor in `phz-cross-account`; Route 53 Profiles can be shared).
- With a traffic dial below 100, the traffic not kept by the endpoint group goes to the other endpoint groups (`ga-endpoint-weights` explanation).
- The Athena ALB page that was fetched is only a table of contents. The question relies only on the fact that Athena queries ALB logs in S3.

## Points for review outside this batch

- The Route 53 page "How Amazon Route 53 determines whether a health check is healthy" now documents **private endpoint health checks** (a health check source in the VPC, 30 s or 10 s interval). `content/saa-c03/questions/resilient/saac03-2c-route53-private-alarm-check.yaml` is built on the idea that health checkers cannot reach private IP addresses. That premise may now be outdated.
- `transit-gateway-appliance-scenario.html` returned the title "How AWS Transit Gateway works", and that title is used as the reference title.
