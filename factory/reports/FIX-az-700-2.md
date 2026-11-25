# FIX-az-700-2 — chapters 21 to 25 and 31 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-700 21-site-to-site-vpn 22-point-to-site-vpn 23-expressroute-design 24-expressroute-implementation 25-virtual-wan 31-load-balancer-design` 0 problems; `content:validate --cert az-700` 0 problems, 0 warnings; `check-quiz az-700` (6 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed, and no section marker changed. The shared WebFetch budget and the hourly Learn limit were hit several times during the pass; every point below marked "Confirmed" was fetched.

## 21-site-to-site-vpn

| Finding | Learn | Change |
| --- | --- | --- |
| Policy-based traffic selectors: the chapter contradicts itself (custom policy required in 2.1.4, Default policy accepted in 2.1.6) | Both are on Learn. vpn-gateway-connect-multiple-policybased-rm-ps (PowerShell, updated 2026-06): "You need to create an IPsec/IKE policy" and "specify the complete policy". ipsec-ike-policy-howto (portal): selectors and DPD timeout "can be specified with Default policy, without the custom IPsec/IKE policy" | 2.1.4 bullet: "With PowerShell … full policy. In the portal, it can also be set with the Default policy." 2.1.6 sentence: "In the portal, …" |
| NAT limits missing | Confirmed (nat-overview, nat-howto): VpnGw2-5 / 2AZ-5AZ; not with policy-based traffic selectors or policy-based VPNs; not with APIPA BGP; one prefix per rule; 500 rules per gateway; a dynamic rule serves one connection, external mapping /26 at most; "Before you create connections, you must create and save NAT rules" | Design table, NAT row: one "Limits" sentence |
| Gen1 labels on VpnGw1AZ-3AZ | about-gateway-skus (2026-06-11) still lists Gen1 rows for 1AZ-3AZ. gateway-sku-upgrade (2026-07-01): gateways that already use a Standard IP "will be seamlessly upgraded to Gen2 during regular service updates before September 2026" | Table unchanged; one sentence after the SKU-change paragraph gives both statements. Flagged below |
| Extended network extension availability | Confirmed unchanged (azure-extended-network, 2025-05-22): not on the extension feed of WAC 2410, no later version named, no retirement notice. Requirements: Windows Server 2022 Azure Edition in Azure, 2019 or 2022 on-premises | None (the chapter already says this) |
| FR « s'appaire en APIPA », « actif-passif » next to « actif/actif », « spoke appairé » | Glossary: « peering »; harmonised with « actif/actif » | « établit sa session BGP avec des adresses APIPA », « actif/passif » (3 places), « spoke relié par peering » |

## 22-point-to-site-vpn

| Finding | Learn | Change |
| --- | --- | --- |
| Troubleshooting row "The network connection … could not be established" (IKEv2) | vpn-gateway-troubleshoot-vpn-point-to-site-connection-problems gives one cause: Windows without IKE fragmentation support; fix = KB update + `DisableCertReqPayload` = 1. The page doesn't mention ports. UDP 500 and 4500 are on the SSTP migration page (ikev2-openvpn-from-sstp, title "SSTP protocol retirement and connections migration") | Row reworded: Learn's cause first, ports given separately; fix = update + registry value, or open ports / use OpenVPN |
| Basic SKU and the 128 SSTP value | Confirmed (SSTP migration page): "Since November 2025, the Basic SKU supports IKEv2, and new Basic SKU VPN gateways use IKEv2 by default"; existing SSTP-only Basic gateways can enable IKEv2 | Basic row, Notes: one sentence |
| Authentication combinations | Confirmed (point-to-site-about table): OpenVPN = any subset; IKEv2 and OpenVPN = RADIUS / certificate / Entra ID + RADIUS / Entra ID + certificate; SSTP, IKEv2, IKEv2 and SSTP = RADIUS / certificate | 2.2.3 paragraph: one sentence |
| RADIUS client registration | Confirmed (point-to-site-how-to-radius-ps): "When adding this RADIUS client, specify the virtual network GatewaySubnet" | RADIUS requirements bullet |
| SSTP dates, app ID retirement, pool sizes, 20 roots, RADIUS not over ExpressRoute | Re-checked SSTP dates (Aug 31, 2026 / March 31, 2027) and "RADIUS not over ExpressRoute" | None |
| FR « nouvellement appairé », « route définie par l'utilisateur » | Glossary: « peering », « itinéraire défini par l'utilisateur » | Exam tip and 0x80090326 row |

## 23-expressroute-design

| Finding | Learn | Change |
| --- | --- | --- |
| ExpressRoute Metro: preview or GA | **Not confirmed**. "About ExpressRoute Metro" (2026-08-18) has no preview banner and no GA statement; the circuit quickstart's High resiliency section has no preview label either (only its "Create a connection" link is labelled Preview) | None. Flagged below |
| Global Reach connections count against the VNet link limit | Confirmed (expressroute-faqs: 10 Gbps Premium = 100 connections shared, for example 5 Global Reach + 95 gateway connections) | Sentence after the Premium limits |
| SKU change row "Local to Standard or Premium: Yes, with CLI or PowerShell" | Wrong direction. expressroute-howto-circuit-portal-resource-manager: "To downgrade the SKU to Local, you can use Azure PowerShell or Azure CLI" (not the portal); Local to Standard/Premium isn't stated on the pages fetched | Row now "Standard or Premium to Local: Yes, with Azure CLI or PowerShell (not in the portal)" |
| Unlimited to metered not allowed | Confirmed (same quickstart: "Changing the metering plan from Unlimited Data to Metered Data isn't supported") | None |
| FastPath: IPv6 to the hub, Virtual WAN gateway | Confirmed (about-fastpath): IPv6 only on Direct; Virtual WAN ExpressRoute gateway with at least 5 scale units. Private endpoints "limited general availability", enrollment | FastPath requirement row; new table row "FastPath to the hub virtual network, IPv6 / Yes / No" |
| ExpressRoute Direct 400 Gbps | Confirmed (expressroute-erdirect-about): "available in limited ExpressRoute peering locations and requires enrollment" | 400 Gbps row of the port table |
| FR « Routes définies par l'utilisateur sur FastPath » | Glossary | « Itinéraires définis par l'utilisateur sur FastPath » |

## 24-expressroute-implementation

| Finding | Learn | Change |
| --- | --- | --- |
| BFD details | Confirmed (expressroute-bfd, 2026-07-08): reset also for IPv6 peerings configured before November 2025; MSEE intervals 300 ms, "in certain scenarios" 750 ms; "recommended to disable BFD echo mode" | Two BFD bullets |
| 1,400 bytes, no fragments | Confirmed (expressroute-about-virtual-network-gateways): max TCP/UDP packet size 1,400 bytes; gateways don't support fragments; FastPath bypasses the gateway if fragmentation is needed | Frequent causes bullet |
| Route filter example "Azure Storage in West Europe" | Confirmed (expressroute-routing): the regional table has a Storage community per region (West Europe 12076:52002) | None |
| Microsoft peering ASN | Confirmed (expressroute-routing): private ASN allowed with manual validation; 64496-64511 not allowed in the path | 2.3.7: one sentence |
| Gateway table header "Circuits from different peering locations" | Learn's column is "Maximum circuit connections" (4/8/16; ErGwScale 4/8/16 at 1/2/10 units), plus the note "4 for all gateways" from the same peering location | Header renamed "Maximum circuit connections" (FR « Connexions de circuit maximales »); the same-location rule was already a bullet |
| linkvnet-arm limits | Confirmed: up to 16 circuits per VNet; 200 advertised address spaces or fewer at connection creation, up to 1,000 afterward. Same page still lists FastPath only for Ultra Performance / ErGw3AZ (about-fastpath, followed, adds ErGwScale) | 2.3.9 bullet: two sentences |
| MACsec setup | Confirmed (expressroute-howto-macsec): soft delete on the key vault, no private endpoint, CKN/CAK secrets, user-assigned managed identity, both ports or one, SCI required for Cisco devices | 2.3.11: one sentence |
| FR « route(s) définie(s) par l'utilisateur », « appairez-les » | Glossary | 3 UDR phrases; « reliez-les au hub par peering » |

## 25-virtual-wan

| Finding | Learn | Change |
| --- | --- | --- |
| ExpressRoute-to-ExpressRoute transit through a hub firewall | Confirmed (how-to-routing-policies): needs a support case and Global Reach disabled; the two configurations aren't compatible. FAQ: ER-to-ER transit "is available via Global reach" | Exam trap: one sentence |
| Site-to-site scale units (500 Mbps × 20 = 10 Gbps vs 20 Gbps) | **Ambiguous on Learn**. FAQ: "1 scale unit of VPN = 500 Mbps … 10 scale unit … = 5 Gbps" and "VPN aggregate throughput is up to 20 Gbps"; its per-instance table gives 10,000 Mbps per instance at 20 units, with 2 instances. gateway-settings: 1 unit = two instances "each having a maximum throughput of 500 Mbps" | None. Flagged below (bank questions too) |
| NVA partners | Confirmed (about-nva-hub): "Cisco SD-WAN" (Catalyst 8000V Edge Software); new VMware SD-WAN deployments blocked end of June 2026, Arista VeloCloud recommended; Fortinet dual-role SD-WAN + NGFW up to 20 scale units; 1 NVA unit = 500 Mbps, 2 to 80 | Partner sentence |
| BGP peering with a hub | Confirmed (scenario-bgp-peering-hub): no loopback; 4,000 routes from the NVA; branch-to-branch required to exchange routes with VPN/ER sites; secured hub only with routing intent | BGP paragraph: two sentences |
| Global profile | Confirmed (global-hub-profile): includes the hubs that use the same User VPN configuration; closest hub | Step 3 of point-to-site |
| Point-to-site steps | Confirmed (FAQ table, rows 1-20): 1-3 = 500, 4-6 = 1,000, 7-10 = 5,000, 11-20 = 10,000 | One sentence before the sizing paragraph |
| FR « spokes indirects appairés » | Glossary | « reliés par peering » |

## 31-load-balancer-design

| Finding | Learn | Change |
| --- | --- | --- |
| 3-tuple said to keep a client's TCP and UDP flows together | Wrong. distribution-mode-concepts: 3-tuple = "same client IP address and protocol combination"; media upload (TCP control + UDP data) is a source IP affinity case (the page doesn't name the tuple; with the protocol in the hash, only 2-tuple keeps both on one instance); RD Gateway = 3-tuple | Distribution table: media upload moved to Client IP; Client IP and protocol row says TCP and UDP flows can reach different instances. Agrees with bank question az700-3a-lb-persistence-media-upload |
| HA ports: several rules, flow symmetry | ha-ports-overview: several HA ports rules if each selects a unique frontend IP and all have Floating IP (so "one per frontend" stays right); flow symmetry isn't supported for NVAs between a public and an internal load balancer, use Gateway Load Balancer | Limits paragraph: two sentences |
| Admin state | Confirmed (admin-state-overview): Down keeps established TCP, moves existing UDP flows; per backend pool (other pool unaffected); not settable while creating a NIC-based pool | Admin state paragraph |
| Zones | Confirmed (reliability-load-balancer, "Reliability in Azure Load Balancer"): zone-redundant recommended for all workloads, including single-zone ones; to change, new frontend IP configuration, move the rules, remove the old one; clients use the new address | Zones paragraph: two sentences |
| FR « réseaux virtuels appairés » | Glossary | « reliés par peering » (2 places) |

## Mock-exam bank questions changed

- `questions/*/az700-2c-vwan-vpn-scale-units.yaml` (explanation, EN + FR): "10 units support 5,000 and 20 support 10,000, so 8,000 users require 20 units" became "7 to 10 units support 5,000 and 11 to 20 support 10,000, so 8,000 users need at least 11 units: of the values offered, 20 is the smallest that is enough" (FAQ table: 11 units = 10,000). The answer doesn't change.
- `questions/*/az700-cs4a-policy-based-sites.yaml` (explanation, EN + FR): "The option requires the complete custom policy" became "With PowerShell, … (the portal also accepts it with the Default policy)". The answer (custom policy + selectors) stays right; no option offers the Default policy with selectors.

## Checked and left unchanged

- Policy-based selectors: az700-2a-pb-multiple-firewalls, az700-cs2a-chamonix-ipsec (PowerShell script: the custom policy is required there), az700-2a-pb-selector-pairs, az700-2a-ipsec-*.
- SKUs and generations: az700-2a-sku-az-generation (Gen2 VpnGw3AZ 2.5 Gbps vs Gen1 1.25 Gbps, as in the SKU table), az700-2a-vng-cli-create.
- P2S: az700-2b-p2s-config-hotarea ("IKEv2 and OpenVPN" with Entra ID + certificate is a listed combination), az700-2a-p2s-auth-*, az700-2a-p2s-tunnel-firewall / tunnel-facts (UDP 500/4500 from the SSTP page), RADIUS questions.
- ExpressRoute: az700-2b-er-sku-changes (MeteredData from Unlimited stays "No"; Premium to Standard allowed), az700-2b-er-sku-local, az700-2b-er-sku-premium, az700-2c-er-premium-cross-geo, az700-2b-er-globalreach (no link-count dependency), az700-2c-er-bfd-statements and -old-peering (August 2018 rule, 300 ms; the 750 ms case doesn't change s2), az700-2c-er-macsec-facts (per-link setting), no Metro question.
- Virtual WAN: az700-2c-vwan-er-to-er-transit (Global Reach is still the answer; option c's explanation still holds).
- Load Balancer: az700-3a-lb-persistence-media-upload (already Client IP), az700-3a-sku-web-tier-zones, HA ports questions (az700-3a-sku-facts-yn, -pubint-internal-outbound, -lb-floating-ip-port-reuse).

## Quiz files

None changed. The six quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 21 (Branch2 with a custom policy and selectors) and quiz 31 (admin state, HA ports) don't rely on the changed wording.

## For a human decision

- **Virtual WAN site-to-site scale units.** FAQ: 1 unit = 500 Mbps aggregate (10 units = 5 Gbps) but 20 Gbps per hub, reached in its per-instance table by 2 instances × 10 Gbps at 20 units; gateway-settings: two instances "each having a maximum throughput of 500 Mbps" per unit (that is, 1 Gbps per unit). Chapter 25 (500 Mbps per unit, 20 Gbps maximum) and the bank questions `az700-2c-vwan-vpn-scale-units` (3 Gbps → 6 units) and `az700-cs1c-hub-gateways` (1.4 Gbps → 3 units) follow the FAQ's explicit definition. Under the per-instance reading, the answers would become 3 and 2 units. Not changed.
- **ExpressRoute Metro**: GA status not stated anywhere on the fetched pages (no preview banner either). Used in chapter 23 for "High" resiliency, never as a bank or quiz answer.
- **VPN Gateway Gen1 / Gen2**: the SKU table still lists Gen1 VpnGw1AZ-3AZ; gateway-sku-upgrade says Standard-IP gateways move to Gen2 before September 2026. Chapters 21 and 22 keep the table labels; chapter 21 now quotes both pages.
- **Extended network**: Learn still says the extension isn't on the WAC 2410 feed (page from 2025-05). Bank `az700-2a-aen-*` and quiz 21 q2 use it as the answer because objective 2.1.9 names Azure Extended Network.
- Not checked (fetch budget): chapter 22's "register a custom app to restrict access to some users or apply Conditional Access" (the QZ writer didn't verify it either); chapter 24's "no fallback to clear text" on a MACsec key mismatch (the MACsec how-to only says ARP/BGP don't come up).

## French terms not settled (not in the glossary, or not decided)

- « périphérique VPN » (chapters 22, 24, 25 and the mock questions) vs « appareil » (chapter 21, quiz 21). The glossary has `device` = « appareil » from the identity area only; not harmonised here.
- New in this pass, not in the glossary: « mode écho BFD », « inscription requise » (enrollment), « bouclage » (loopback), « symétrie des flux » (flow symmetry), « appliance à double rôle », « chargement multimédia » (media upload, taken from the bank question), « connexions de circuit maximales ».
- Chapter 25 FR still writes « une UDR `0.0.0.0/0` » (acronym); only the full UDR phrases were changed.
