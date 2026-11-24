# QZ-az-120-22-networking — report

File: `content/az-120/quizzes/22-networking.yaml` (10 questions, `az120-qz-22-01` to `-10`). `npx tsx factory/check-quiz.ts az-120 22-networking` → 0 problem(s), 0 warning(s).

## Doubts and unverified facts

- **Q09 (fallback to internet for private DNS zones)**: the Learn page (`/azure/dns/private-dns-fallback`, fetched Nov 2026) has no preview banner, but it doesn't state GA explicitly either. I treated the feature as GA. Please confirm before publishing.
- **Q04 (SAProuter)**: the Learn architecture guide says Azure Firewall is the public entry point and the NSG allows SAProuter's port, typically 3299. The "DNAT rule" wording is my design inference (inbound through Azure Firewall uses DNAT); the guide doesn't use the word DNAT.
- **Q06**: French « dorsale réseau » for "network spine" isn't in the glossary; I couldn't check it on fr-fr Learn.
- **Q08**: "fail back" translated « restauration automatique » (glossary), even though here the failback is a manual decision.

## Chapter issues (22-networking, EN and FR), against current Learn

1. **Azure NetApp Files reach (section storage-endpoints)**: the chapter says volumes are reachable "from the same or peered virtual networks in the region". Current Learn (*Guidelines for Azure NetApp Files network planning*) says Standard network features also support cross-region (global) peering, with peering charges; only Basic is limited to the region. Basic network features are being retired: from July 2026, new or modified volumes use Standard only.
2. **NXDOMAIN rule (section name-resolution)**: "If a private zone exists for a service and a needed account has no private endpoint, enable fallback to internet…". This is imprecise. An account with no private endpoint anywhere has no `privatelink` CNAME and resolves publicly with no problem. The NXDOMAIN happens when the target account has a private endpoint (for example in another tenant's network) but your linked zone has no record for it. Fallback also applies only to Private Link zones.
3. **FastPath (section expressroute)**: the chapter is consistent with Learn. It could add that internal load balancers in the **hub** (the gateway's virtual network) do work with FastPath (only those in spokes don't), and that Private Link over FastPath is in limited GA for ExpressRoute Direct only.
4. **Accelerated Networking**: Learn still says hyperthreaded sizes need 4 or more vCPUs, consistent with the chapter. Confidential VM sizes don't support Accelerated Networking. This isn't in the chapter, but it matters if a confidential-VM design is ever suggested for SAP.
5. **PPG section**: the chapter says a PPG is "needed" with the ANF application volume group when it's deployed with pinned placement. The current Learn PPG page only says a PPG "might be necessary" with the application volume group. Its ANF HANA page describes the application volume group with PPGs as requiring a Microsoft pinning request and recommends it only when truly needed. The chapter also says "Azure shared disks don't require one", which the PPG page doesn't cover (not verified).
6. **French chapter**: it uses « appairé » / « réseaux appairés » (« un spoke appairé au hub », « Accessible depuis… les réseaux appairés »). The writing guide asks for « peering » / « relié par peering », never « appairé ». The quiz uses « relié par peering ».

## Mock-exam overlap

I read the 66 mock and case-study questions of 2.2.x first. The quiz tests decisions they don't test: the zonal VNet layout, virtual host name to ILB frontend, AN on the internode NIC, SAProuter entry, SBD path, PPG per system / per zone / disk placement, peered access to service endpoint vs private endpoint vs ANF, zone choice under VM-size availability with active/passive, NXDOMAIN fallback, and ErGwScale scale units with FastPath on peering vs ANF.
