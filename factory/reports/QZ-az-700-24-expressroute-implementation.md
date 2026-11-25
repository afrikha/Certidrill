# QZ-az-700-24-expressroute-implementation — report

File: `content/az-700/quizzes/24-expressroute-implementation.yaml` (10 questions, objectives 2.3.6–2.3.13 all tested). `npx tsx factory/check-quiz.ts az-700 24-expressroute-implementation` → 0 problem(s), 0 warning(s).

Positions 6–10: single, yesno_statements, hotarea, multi ×2. Decisions chosen to avoid the mock bank (which already covers circuit order, secondary router IP, private peering script, route filter missing/order, Microsoft peering values, gateway coexistence / script / public IP, FastPath connection script, cross-subscription order, default route, prefix limits statements, routing weight, provider-circuit encryption, MACsec facts, VPN over private peering settings, BFD old peering / failover / statements, diag cmdlets, ARP/route hotarea, private-peering test): reserved ASN 65515, provider status NotProvisioned, gateway SKU by circuit count, authorization reuse/revocation, BFD not linked to BGP, Validation needed, 4-circuits-per-location + VNet-to-VNet default, prefix limit + Use remote gateways, MACsec + IPsec together, Microsoft-peering return path (more specific / public ASN prepend).

## Chapter vs current Learn (Nov. 2026)

- **BFD** (expressroute-bfd, updated 2026-07): IPv6 peerings on circuits configured before **November 2025** also need a reset; MSEE intervals are 300 ms but "in certain scenarios 750 ms"; Learn says to **disable BFD echo mode**. None of this is in the chapter.
- **Troubleshooting, "maximum packet size 1,400 bytes, fragments not supported"** (chapter, frequent causes): not stated on the troubleshooting page I fetched; unverified, not used.
- **Route filter example "Azure Storage in West Europe"** (chapter 2.3.7): route filters list regional communities and service communities; I did not verify a per-region Azure Storage community. Quiz uses "the BGP community of West Europe" only.
- **Microsoft peering ASN**: Learn says private ASNs are allowed but need manual validation, and the documentation range 64496–64511 isn't allowed in the path. Chapter mentions only the stripping of private ASNs.
- **Gateway table**: Learn's column is "Max circuit connections" (4/8/16) plus "max 4 circuits from the same peering location"; the chapter's header "Circuits from different peering locations" is a slight reinterpretation — consistent in practice.
- **linkvnet-arm**: a virtual network can link up to 16 circuits; at connection creation the advertised address spaces must be 200 or fewer (1,000 after). Not in the chapter. Same page lists FastPath only for UltraPerformance/ErGw3AZ (no ErGwScale), inconsistent with about-fastpath.
- **MACsec how-to**: Key Vault must have soft delete and must not sit behind a private endpoint; a user-assigned managed identity reads the CKN/CAK; MACsec is set per link (Links[0]/[1]); SCI must be enabled for Cisco edge routers. The chapter only says "key in Key Vault"; the mock question `az700-2c-er-macsec-facts` option e ("encrypt one circuit and leave the other unencrypted" = false) is still right (config is per port/link, not per circuit).

## Doubts

- Q10: Learn's "Optimize routing" page mentions AS path prepending with a public ASN (private ASNs are stripped) but not more-specific prefixes for Microsoft peering; option a relies on longest-prefix match and the chapter's table, and assumes the two /25s within the validated /24 pass validation once added to the advertised public prefixes.
- Q6: assumes the support-ticket route is the only fix; the `MicrosoftConfigCustomerAsn` parameter (prefixes registered to another AS) is deliberately not offered as an option.
