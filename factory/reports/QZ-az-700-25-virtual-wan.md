# QZ-az-700-25-virtual-wan — report

File: `content/az-700/quizzes/25-virtual-wan.yaml` (10 questions, `az700-qz-25-01` to `-10`). Check: 0 problem(s), 0 warning(s).

Objectives: 2.4.1 (q1), 2.4.2 (q6), 2.4.3 (q2), 2.4.4 (q3, q7), 2.4.5 (q4, q8), 2.4.6 (q5, q10), 2.4.7 (q9). Positions 6–10: single, dropdown, yesno_statements, multi, dropdown.

Pages fetched (Nov 2026): virtual-wan-about, virtual-wan-faq, hub-settings, gateway-settings, about-virtual-hub-routing, how-to-virtual-hub-routing, how-to-routing-policies, about-virtual-hub-routing-preference, about-nva-hub, scenario-bgp-peering-hub, scenario-shared-services-vnet, global-hub-profile.

## Chapter out of date or incomplete against Learn

- **ExpressRoute-to-ExpressRoute transit** (trap in "Designing a Virtual WAN architecture"): the chapter says to "send it through a hub firewall with a private routing policy". Learn (how-to-routing-policies) says this transit isn't on by default even with routing intent: you have to open a support case, and it requires Global Reach to be disabled. The chapter should say this.
- **Site-to-site scale units**: the chapter says 500 Mbps per unit and a 20 Gbps aggregate maximum with 20 units. These don't add up (20 × 500 Mbps = 10 Gbps). Learn (gateway-settings, FAQ) says that 1 unit = 500 Mbps per instance, with two active instances. That reading gives 1 Gbps per unit for the pair, which is how 20 units reach 20 Gbps. The mock-exam questions `az700-2c-vwan-vpn-scale-units` and `az700-cs1c-hub-gateways` treat 500 Mbps as the aggregate of one unit. Their answers may be debatable: please review. I didn't test site-to-site sizing in this quiz.
- **NVA partners**: Learn lists "Cisco SD-WAN" (the chapter says Cisco Catalyst 8000V). New VMware SD-WAN deployments in Virtual WAN are blocked from end of June 2026, and Learn recommends Arista VeloCloud. Fortinet also has a dual-role SD-WAN + NGFW NVA (up to 20 scale units).
- **BGP peering with a hub**: facts that Learn has and the chapter doesn't:
  - branch-to-branch must be enabled for the NVA to exchange routes with VPN and ExpressRoute sites (q9 relies on it, as a consequence of "the NVA connection is treated as a branch");
  - peering with a loopback address isn't supported;
  - at most 4,000 routes can come from the NVA;
  - on a secured hub, BGP peering is supported only when routing intent is configured.
- **Global profile**: Learn says the global profile includes the hubs that use the **same User VPN configuration**. The chapter doesn't say so; q6 doesn't depend on it.
- **Point-to-site table**: 1 to 3 units = 500 connections, 4 to 6 = 1,000, 7 to 10 = 5,000, 11 to 20 = 10,000. The chapter shows only the first row of each step. q3's explanation spells this out.

## Doubts

- q8: I assumed that the default-route flag on a connection ("Propagate default route" / "Enable internet security") keeps its default after routing intent is configured: on for VNet connections, off for ExpressRoute and VPN (FAQ). The stem says the connections "keep the default settings".
- q10: the AS paths shown for the Hub2 route include the 65520 65520 prepend that Learn describes for routes advertised between hubs.
