# QZ-gcp-pca-21-network-topologies — report

File: `content/gcp-pca/quizzes/21-network-topologies.yaml` (10 questions, English only; 1–5 difficulty 1,1,2,2,2; 6–10 difficulty 3 with two `multi`). Check: `npx tsx factory/check-quiz.ts gcp-pca 21-network-topologies` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q2, q5, q10), 2.1.2 (q6, q9), 2.1.3 (q3, q8), 2.1.4 (q1, q4, q7).

## Verified on docs.cloud.google.com (2026-11-27)
- Private Google Access per subnet; no effect on VMs with external IPs.
- Partner Interconnect: VLAN attachment → pairing key → provider provisions → activate (pre-activation possible for Layer 3) → BGP by you (L2) or provider (L3).
- IAP TCP forwarding: ingress from 35.235.240.0/20, role IAP-Secured Tunnel User (`roles/iap.tunnelResourceAccessor`) on project or VM, no external IP needed.
- Proxy-only subnets: required by regional/cross-region Envoy-based LBs; purposes REGIONAL_MANAGED_PROXY / GLOBAL_MANAGED_PROXY; must exist before the forwarding rule; backends need a firewall rule for its range.
- Learned routes: regional vs global dynamic routing; peers' MED ranks learned routes (lowest first); inter-region cost added in global mode. Advertised routes: base advertised priority sent as MED, lower preferred, active/passive example 100 vs 351.
- HA VPN to AWS: 99.99 % needs four tunnels, external VPN gateway with four AWS IPs, two Site-to-Site VPN connections, two customer gateways (one per HA VPN interface).
- Internal passthrough NLB: same-region clients only by default (including VPN/VLAN attachments in that region); global access opens all regions; client source IP preserved.
- Cloud NGFW tiers: FQDN objects, geolocation, Threat Intelligence = Standard; IPS, TLS inspection = Enterprise; VPC firewall rules listed under Essentials. FQDN objects: ingress source and egress destination, no wildcards.
- VPC Service Controls blocks reading/copying data to resources outside the perimeter by authorized identities.
- NCC: VPC + hybrid spokes give any-to-any; VPC spokes can be in other projects/organizations; hybrid spokes and their routing VPC network must be in the hub's project, and the routing network needn't be a VPC spoke; VPC spoke subnets reach on premises only if the hybrid spoke includes import ranges (or custom advertisement); static and peering routes aren't exported by VPC spokes.

## Doubts / not verified
- q3: the IAP page also lists Compute Instance Admin (v1) for `gcloud compute ssh`; the stem states OS Login is configured and the admins already hold the OS Login roles, to keep exactly two answers.
- q1: the stem states that no Cloud NAT gateway exists, because configuring Public NAT on a subnet is believed to enable Private Google Access for it automatically (not verified on a fetched page); Cloud NAT was therefore kept out of the options.
- q8: that VPC firewall rules can't use FQDN objects is inferred (tiers page lists VPC firewall rules under Essentials; FQDN page doesn't say it explicitly).
- q9 tests NCC like mock `gcppca-2a-ncc-vpc-spokes-mesh`, but the deciding point differs (hybrid spokes for the transit VLAN attachments vs VPC spokes only); reviewers may judge the overlap.

## Chapter issues (content/gcp-pca/course/chapters/21-network-topologies.en.md — not edited)
- NCC row "Many VPCs any-to-any, transitive, plus hybrid": the chapter should add that hybrid spokes (VLAN attachments, HA VPN, router appliances) must be in the hub's project and must include import ranges (or use custom advertisement) to advertise VPC spoke subnets to on premises.
- Load balancer checklist: the chapter doesn't say that hybrid connectivity NEGs require global dynamic routing and that Cloud Router must advertise the health check ranges (and the proxy-only range for Envoy-based LBs) to on premises.
- IAP row: the chapter names only `roles/iap.tunnelResourceAccessor`; the docs also require instance access (OS Login roles or Compute Instance Admin v1 for `gcloud compute ssh`).
- Partner Interconnect table: no mention of pre-activation for Layer 3 attachments (minor).
