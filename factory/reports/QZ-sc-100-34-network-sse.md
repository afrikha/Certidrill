# QZ-sc-100-34-network-sse — report

File: `content/sc-100/quizzes/34-network-sse.yaml` (10 questions; `npx tsx factory/check-quiz.ts sc-100 34-network-sse` → 0 problem(s), 0 warning(s)).

Coverage: 3.4.1 (q2, q5, q7, q9), 3.4.2 (q3), 3.4.3 (q4, q8), 3.4.4 (q1, q6, q10). Formats 6–10: single, dragdrop, single, dropdown, multi.

The mock bank has 33 questions on 3.4.x (series and case studies included) and covers most chapter decisions (Bastion, AVNM deny, private endpoint, hub firewall, edge controls, baseline profile, group exception, TLS inspection + HTTP methods, TRv2 + UTR, compliant network for token replay, source IP restoration, Quick Access first, per-app for a sensitive server, App Discovery, Kerberos SSO). The quiz tests other decisions: Private Access licensing, ASGs, threat intelligence policy, TRv2 guest exception / group granularity / roles, private subnets by default, overlapping per-app segment and assignment (no nesting, no overlap between apps), Virtual WAN routing intent + NAT gateway + WAF, tenant-specific compliant network check with B2B guests and inbound MFA trust, AVNM Allow vs Always Allow vs Deny, connector groups per isolated datacenter.

3.4.2 is tested only once (q3): almost every Internet Access decision of the chapter is already in the mock bank, and the remaining candidates were preview or ambiguous on Learn (see below).

## Facts verified on Learn (fetched 2026-11-24)
Web content filtering how-to; universal tenant restrictions; TRv2; per-app access; Global Secure Access overview (licensing table); threat intelligence how-to; default outbound access; Virtual WAN routing intent; ASGs; DDoS Protection overview; private endpoint overview; compliant network check; private network connectors; AVNM security admin rules; cross-tenant access settings (trust settings).

## Not verified on a fetched page
- q7: NAT gateway refuses connections initiated from the internet (stable knowledge; the default outbound page only calls it the recommended explicit method); Azure DDoS IP Protection as a tier name (DDoS SKU comparison page not refetched).
- q8: excluding "guest or external users" in a Conditional Access policy (standard CA condition, not refetched).

## Chapter 34 vs current Learn
- TRv2 page: **data plane protection is labeled preview** (also anonymous access protection). The chapter's TRv2 table states "data plane for Microsoft Graph" for universal tenant restrictions without a preview mention; add "(preview)".
- Web content filtering page has an internal contradiction: "after it matches on a web content filtering rule, evaluation stops" versus "when multiple policies match with conflicting actions, the most restrictive action wins (block over allow)". The chapter states only the first rule. Avoid allow-vs-block priority questions until Learn is consistent.
- Threat intelligence evaluation order on Learn: TLS inspection > web content filtering > threat intelligence > file type > DLP. The chapter lists threat intelligence filtering but not this order, nor that URL indicators on HTTPS need TLS inspection.
- Overview: Internet Access license for remote network internet traffic still "(coming soon)" next to the 50-license minimum (already noted by C-sc-100-3).
- Per-app access: segments can't overlap between Private Access apps (only with Quick Access); not in the chapter, used in q6 as a distractor. Learn says nested groups aren't supported (chapter doesn't say it; used in q6).
- Compliant network check is tenant-specific ("a user from fabrikam.com can't pass contoso.com's compliant network policy"): worth a line in the chapter (q8 relies on it).
- FR chapter still writes « Spokes appairés » (writing guide: « peering »), already reported by Q-sc-100-3c.
