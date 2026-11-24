# QZ-az-700-33-application-gateway-design — report

File: `content/az-700/quizzes/33-application-gateway-design.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

Objectives: 3.2.1 (q1, q9), 3.2.2 (q5, q10), 3.2.3 (q4, q8), 3.2.4 (q3, q6), 3.2.5 (q2, q7). Positions 6–10: yesno_statements, single ×2, dragdrop, multi.

Mock-exam questions read first (all 3.2.1–3.2.5 files, including cs3b). Avoided decisions: feature match (rewrite/draining/multisite/error pages), path + redirect, v2 facts, WAF/private/use-case picks, autoscale min 2 max 8, scaling facts, /24 for 125 instances, VMSS pool order, on-premises IP targets, portal target types, probe 401 match, probe CLI for App Service, default probe facts, host-specific custom probe.

## Pages fetched (Nov 2026)

configuration-infrastructure, application-gateway-autoscaling-zone-redundant, high-traffic-support, understanding-pricing, application-gateway-probe-overview, application-gateway-components, application-gateway-backend-health-troubleshooting, overview-v2, application-gateway-faq, tcp-tls-proxy-overview, private-link, mutual-authentication-overview, configuration-http-settings, rewrite-http-headers-url, key-vault-certs.

## Doubts / unverified

- q8: Learn is inconsistent on capacity per instance ("up to 10 capacity units" on the scaling page, "a minimum of 10 CUs" on the high-traffic page). The question uses 10 per instance, consistent with the pricing page (10 reserved CUs per minimum instance).
- q10: the infrastructure page also says not to block TCP 65502 / 54321 and UDP 12345 for platform health monitoring, without giving a source tag; the scenario keeps only the default inbound rules plus Internet 443 and AzureLoadBalancer, as the chapter's NSG list does. Check if a reviewer thinks these ports must be added.
- q6 assumes a hub without router; mixing member types in one pool wasn't verified (not used).
- Reference titles come from WebFetch output (curl to Learn blocked here).

## Chapter vs current Learn

- **TCP/TLS proxy** is listed in the chapter as a Standard_v2/WAF_v2 capability with no preview mention, but the Application Gateway FAQ says the Layer 4 TLS/TCP proxy is in **Preview** (the overview page carries no label). The chapter should flag it as preview; the quiz doesn't use it as an answer.
- Probe detection time: the chapter's trap says "about interval × unhealthy threshold"; the probe overview page gives "first detection + (threshold × interval)" (example 20 + 2 × 20 = 60 s). The chapter slightly underestimates; q7 is right under both formulas.
- FR chapter lines 47 and 107 use « réseaux (virtuels) appairés »; the glossary says « peering », avoid « appairage ».
- Learn adds that v2 unhealthy-threshold retries wait for the interval (v1 sends them in quick succession); not in the chapter (minor).
