# QZ-az-700-32-load-balancer-traffic-manager — report

File: `content/az-700/quizzes/32-load-balancer-traffic-manager.yaml` (10 questions; check: 0 problem(s), 0 warning(s)).

Objectives: 3.1.6 (q1, q6), 3.1.7 (q2, q10), 3.1.8 (q9), 3.1.9 (q3, q7), 3.1.10 (q4), 3.1.11 (q5, q8). Positions 6–10: yesno_statements, multi ×2, single, dropdown.

Mock-exam questions read first (all 3.1.6–3.1.11 files in `questions/delivery`, including sr1 series and cs2c/cs4a case questions). Avoided decisions: admin state Down, TCP vs HTTP probe, NSG probe hot area, TM Priority/Geographic/nested MinChildEndpoints/method matching, GWLB order/facts/insertion, Floating IP + HA ports facts, rule CLI, NAT V2 CLI/facts/VMSS, SNAT default ports, outbound rule values, add-frontend order, minimum IP count.

## Pages fetched (Nov 2026)

load-balancer-custom-probe-overview, backend-pool-management, load-balancer-tcp-reset, distribution-mode-concepts, inbound-nat-rules, manage-inbound-nat-rules, load-balancer-outbound-connections, outbound-rules, gateway-overview, network-security-groups-overview, traffic-manager-routing-methods, traffic-manager-monitoring, traffic-manager-faqs, dns/dns-alias.

## Doubts / unverified

- q4: the rule "NSG sees the backend port after translation" comes from the NSG overview ("destination port and address range are for the destination computer, not the load balancer"); the inbound NAT pages don't state it explicitly.
- q9 option e: "HA ports only on internal load balancers" is taken from the chapter and existing mock questions; the HA ports page wasn't re-fetched.
- q2 option a explanation mentions anycast for a global load balancer (not re-fetched; explanation only).
- Reference titles were taken from WebFetch output (curl to learn.microsoft.com is blocked in this container); "Azure Traffic Manager - FAQ" and "Load Balancer TCP Reset and idle timeout in Azure" may differ slightly from the exact `<title>`.

## Chapter vs current Learn

- Health probes: when all instances fail, Learn says established TCP flows continue on Standard **provided the pool has more than one instance**; the chapter omits that condition.
- Gateway Load Balancer: the chapter's "NVA MTU at least 1,550 bytes" isn't on the gateway-overview page (unverified here).
- Traffic Manager apex: Learn's alias-record page now recommends **Traffic Manager Linked Records** for new configurations and keeps alias records for backward compatibility; the chapter lists both without saying which is preferred.
- Learn writes the method both "Multivalue" (routing methods page) and "MultiValue" (FAQ, CLI value); the quiz uses MultiValue.
