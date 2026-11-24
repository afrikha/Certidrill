# QZ-az-700-23-expressroute-design — report

File: `content/az-700/quizzes/23-expressroute-design.yaml` (10 questions, objectives 2.3.1–2.3.5 all tested). `npx tsx factory/check-quiz.ts az-700 23-expressroute-design` → 0 problem(s), 0 warning(s).

Positions 6–10: dragdrop, yesno_statements ×2, single, dropdown. Decisions chosen to avoid the mock bank (which already covers IPVPN model, model matching, second peering location, weight + local preference steering, FastPath spoke on provider circuit, Global Reach basics and /29, Local for egress, Premium for East US, SKU changes, VPN backup): peering location concept, DMZ recommendation, Premium VNet limit by bandwidth, bow-tie, Global Reach non-transitivity, only/only/both peering choice, ECMP + weight one direction only, FastPath eligibility on Direct, SKU with count + Global Reach + unlimited, Global Reach cross-geo + cross-subscription.

## Chapter vs current Learn (Nov. 2026)

- **ExpressRoute Metro** (section resiliency, "High" resiliency): the Learn page "About ExpressRoute Metro" has no preview banner, but its circuit-creation link uses a `expressroute-preview` pivot; GA status could not be confirmed. Not used as a correct answer. The chapter presents it without any caveat.
- **Global Reach connections count against the circuit's virtual network link limit** (FAQ: a 10 Gbps Premium circuit allows 100 connections shared between Global Reach and gateway connections). Missing from the chapter; worth adding next to the VNet-link limits.
- **FastPath gateway SKUs**: `about-fastpath` lists UltraPerformance, ErGw3AZ, ErGwScale ≥ 10 SU and the Virtual WAN ExpressRoute gateway ≥ 5 SU; `expressroute-howto-linkvnet-arm` still says only UltraPerformance or ErGw3AZ. Chapter follows about-fastpath (fine). FastPath IPv6 to the hub (Direct only) and the Virtual WAN case are not in the chapter.
- **FastPath private endpoints**: Learn says "limited GA", enrollment form, 10/100 Gbps Direct only; chapter says "Yes, limited availability" — acceptable.
- **ExpressRoute Direct 400 Gbps**: Learn says limited peering locations and enrollment required; the chapter doesn't say so.
- **Unlimited → metered not allowed** (chapter SKU table): not stated in the FAQ I fetched; the ExpressRoute Direct page says *ports* can be upgraded or downgraded between metered and unlimited billing types. Possible nuance for Direct; unverified, not used.
- **Local → Standard/Premium with CLI/PowerShell**: not covered by the pages fetched; unverified, not used.
- DR page: ECMP across up to 16 circuits; ranking of steering methods (more specific > connection weight > AS path prepend). Chapter consistent.

## Doubts

- Q4 (bow-tie): assumes Litware's on-premises WAN reaches both sites, as stated in the stem.
- Q6 target t4 (IPsec to VPN gateway public IPs over the circuit → Microsoft peering only) relies on the Learn how-to "Configure a site-to-site VPN over ExpressRoute Microsoft peering" (regional community in the route filter).
