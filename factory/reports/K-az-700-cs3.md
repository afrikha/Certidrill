# K-az-700-cs3 — CASES, AZ-700, three case studies

Files (all `status: draft`):

- `content/az-700/case-studies/az700-cs3a-southridge.yaml` — Southridge Video (media streaming; global web delivery with Front Door Premium, private origins, live ingest on a public load balancer). Questions: `az700-cs3a-media-caching` (3.3.6, dropdown), `az700-cs3a-private-origin` (3.3.9, ordering), `az700-cs3a-waf-rules` (5.3.4, yes/no), `az700-cs3a-zone-delegation` (1.2.3, single), `az700-cs3a-byoip` (1.1.8, ordering), `az700-cs3a-ddos` (1.4.4, single).
- `content/az-700/case-studies/az700-cs3b-bellows.yaml` — Bellows College (education; hub VNet with VPN to campuses, lab VNets managed by Azure Virtual Network Manager, Application Gateway, hierarchical firewall policies). Questions: `az700-cs3b-lab-connectivity` (1.3.3, dropdown), `az700-cs3b-admin-rules` (5.1.10, yes/no), `az700-cs3b-lms-probe` (3.2.5, single), `az700-cs3b-policy-inheritance` (5.2.6, multi), `az700-cs3b-research-vnet` (1.1.1, single).
- `content/az-700/case-studies/az700-cs3c-munsons.yaml` — Munson's Pickles and Preserves Farm (food manufacturing; ExpressRoute hybrid hub-and-spoke with a BGP NVA). Questions: `az700-cs3c-route-server` (1.3.8, yes/no), `az700-cs3c-forced-tunneling` (1.3.6, single), `az700-cs3c-backup-path` (2.3.7, multi), `az700-cs3c-expressroute-options` (2.3.4, drag and drop), `az700-cs3c-storage-exfiltration` (4.2.3, single).

Check: `CERT=az-700 npx tsx factory/validate.ts --prefix az700-cs3` → `19 files, 0 problem(s). Types: multi=2 dragdrop=1 ordering=2 single=6 dropdown=2 yesno_statements=3`.
Mix: 16 questions; difficulty 4 easy / 9 medium / 3 hard. Each case covers three domains (A: core, delivery, security; B: core, delivery, security; C: core, connectivity, private-access). No hot area question.

## Deviation: rework to avoid parallel duplicates

No file with my prefix existed when I started (the "earlier attempt" left nothing). `content/az-700/case-studies/` was empty at first; cs1, cs2 and cs4 were written at the same time. Around 08:40 UTC I compared my drafts with the cs1, cs2a and cs4 questions present then and replaced every question that tested the same decision with the same answer:

| My first version | Duplicate | Now |
| --- | --- | --- |
| Front Door tier = Premium | cs1b `front-door-tier` | Caching query string behavior (Include Specified Query Strings) |
| Alias record at the zone apex | cs1b `apex-record` | Delegation of the zone to Azure DNS at the registrar |
| WAF Detection first, then Prevention | cs1b `waf-policy` (mode slot) | Statement removed; anomaly scoring and custom-rule order kept |
| Bellows as a Virtual WAN case (Basic→Standard, User VPN with Entra ID/OpenVPN/Azure VPN Client, scale units, routing intent) | cs1c Wingtip Toys (same four decisions) | Bellows rebuilt as a hub VNet + AVNM + Application Gateway case |
| Peering settings for gateway transit | cs1a `gateway-transit` | Forced tunneling by BGP over ExpressRoute |
| DNS Private Resolver outbound endpoint + ruleset | cs1a `dns-resolver` | Microsoft peering + route filter |
| Effective routes, BGP /16 beats UDR /8 and bypasses the NVA | cs4b `etl-routes` | Removed |
| FastPath for hub VMs | cs4b `feed-fastpath` | ExpressRoute Direct (FastPath stays as a distractor) |
| Route Server branch-to-branch statement | cs2a `route-server` | Peering with both Route Server instance IPs |

Not rechecked after that time; a reviewer should compare the final cs1, cs2 and cs4 files once more. Overlaps with series and regular questions that I kept: `az700-cs3c-storage-exfiltration` takes the same decision as series `az700-sr2-sep` (service endpoint policy); `az700-cs3c-backup-path` touches the same facts as the `az700-2b-er-*` route filter questions; `az700-cs3a-byoip` overlaps the `az700-1a-36..40` BYOIP questions; `az700-cs3a-ddos` overlaps `az700-1c-ddos-tier-choice` (not read).

## Sources

Every reference is a Learn page fetched on 2026-11-17; titles are the H1 returned by the fetch.

## Facts stated without a fetched page (general knowledge or deduction)

- `az700-cs3a-ddos`: DDoS Network Protection is enabled by associating a protection plan with the virtual network (the fetched pages say "enable on a virtual network" and "protection plan" without describing the association); the infrastructure protection included by default; Azure Firewall IDPS isn't a volumetric DDoS mitigation.
- `az700-cs3a-zone-delegation`: wrong-option explanations on NS records inside the zone and on the SOA record.
- `az700-cs3a-private-origin`: Front Door creating a managed private endpoint (the fetched how-to describes the pending request to approve); no private DNS zone needed.
- `az700-cs3a-media-caching`: the wrong-option explanation for an origin group mixing web VMs and storage.
- `az700-cs3b-lms-probe`: GatewayManager ports 65200-65535 for Application Gateway v2; "listener doesn't affect the probe".
- `az700-cs3b-admin-rules`: Bastion reaches VMs from its private address in AzureBastionSubnet, which the Internet service tag doesn't match; security admin rules accept a service tag as source.
- `az700-cs3b-lab-connectivity`: a mesh provides no gateway transit through the hub.
- `az700-cs3c-forced-tunneling`: propagation of the BGP default route to the spokes through gateway transit; the "Microsoft peering must filter default routes" explanation comes from the routing requirements page (fetched).
- `az700-cs3c-route-server`: "two instances" is inferred from the quickstart's "both route server instance IPs".
- `az700-cs3c-expressroute-options`: "Local doesn't support Global Reach" comes from AZ-700 course chapter 23; BFD description.

## French

Terms follow the AZ-700 course chapters and the AZ-104 glossary: « groupe d'origines », « jeu d'enregistrements », « préfixe d'adresse IP personnalisé », « mise en service (Commission) », « module complémentaire Premium », « peering privé / Microsoft », « filtre de routage », « tunnel forcé », « serveur de routes », « stratégie de point de terminaison de service », « groupe réseau », « règles d'administrateur de sécurité », « sonde personnalisée », « paramètres de back-end », « renseignement sur les menaces (Threat Intelligence) ». Kept in English: SKU and tier names, portal setting names (Use hub as a gateway, Include Specified Query Strings, Private link), rule actions (Allow, Always allow, Deny), DRS severity names, states (Provisioned).
Not checked on a fr-fr page: « pulvérisation de mots de passe », « historiens », « mode de prévention » for the WAF.

## Housekeeping

Scratch files in `/tmp/K-az-700-cs3` (an old version of the WAF question). I deleted my own superseded question files with `rm`. I ran one read-only `git status` by mistake; no other git command.
