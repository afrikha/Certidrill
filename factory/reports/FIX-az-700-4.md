# FIX-az-700-4 — chapters 51 to 54 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-700 51-network-security-groups 52-flow-logs-security-admin 53-azure-firewall 54-waf` 0 problems; `content:validate --cert az-700` 0 problems, 0 warnings; `check-quiz az-700` (4 chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block changed, and no section marker changed.

## 51-network-security-groups

| Finding | Learn | Change |
| --- | --- | --- |
| 168.63.129.16 trap misses Load Balancer health probes | Confirmed. NSG overview: DHCP, DNS, IMDS and health monitoring on 168.63.129.16 / 169.254.169.254 aren't subject to NSGs unless targeted by AzurePlatformDNS/IMDS/LKM. Load Balancer health probes page: "you must allow 168.63.129.16 ... in any Azure network security groups"; the `AzureLoadBalancer` tag permits it by default | create-nsg trap: new sentence (probes are the exception; a custom inbound deny-all marks the backends down) |
| Association constraints ("same region, and for a subnet the same subscription") | Subnet page: the NSG "must exist in the same subscription and location as the virtual network". No NIC page states a region or subscription rule for the NSG of a NIC (only for ASGs: same virtual network and location) | associate-nsg: the sentence now states the subnet rule only |
| ASG constraints (same virtual network, same region, 20 ASGs per IP configuration) | Confirmed (manage-network-security-group, virtual-network-network-interface; limits page: 20 ASGs per IP configuration per NIC) | None |
| Private endpoints as ASG members: 50-member limit | Not fetched (not tested, not in the chapter) | None |
| FR « réseaux appairés » (×2), « réseau virtuel appairé », « VNet2 appairé » | Glossary: « peering » | « reliés par peering », « relié par peering » (4 places) |

## 52-flow-logs-security-admin

| Finding | Learn | Change |
| --- | --- | --- |
| Unsupported services list incomplete | vnet-flow-logs-overview also lists Azure Database for MariaDB, MySQL and PostgreSQL, Azure NetApp Files and Microsoft Power Platform | None (the chapter says "for example"; every service it names is on the list) |
| NSG flow logs retirement (30 Sept 2027, creation blocked) | Confirmed (nsg-flow-logs-overview): retire September 30, 2027, "no longer supports new NSG flow logs creation"; resources deleted after retirement, records in Storage kept | None |
| Storage account rules, aclID / rule / platform rule | Confirmed (vnet-flow-logs-overview) | None |
| IP flow verify: VM must be running | Confirmed by the QZ writer on the portal quickstart; not refetched | None |
| Bastion custom port egress | Confirmed (bastion-nsg): with the custom port feature, "allow outbound traffic to the VirtualNetwork service tag instead" of 3389/22 to the VM subnets | bastion-nsg: one sentence after the VM-side paragraph |
| Security admin rules exceptions | Confirmed (concept-security-admins, no preview label): `AllowRulesOnly` applies only Allow rules to virtual networks with SQL Managed Instance or Databricks; security admin rules don't apply to private endpoints in a managed virtual network. Priority 1–4,096 and protocols confirmed | avnm-security-admin: both added to the exceptions sentence |

## 53-azure-firewall

| Finding | Learn | Change |
| --- | --- | --- |
| NAT rule collections aren't inherited | Confirmed (firewall-manager/policy-overview): "NAT rule collections are not inherited, as they are specific to individual firewalls"; inherited network and application collections come first. The same page's sentence "inherits all rule collections" contradicts it; the specific statement is followed | firewall-manager-policies: hierarchy paragraph; firewall-rules: processing step 2; key points |
| Wildcards: `*.contoso.com` vs `*contoso.com` | Confirmed (firewall-faq): `*.contoso.com` doesn't match `contoso.com` (add it to the rule); `*contoso.com` matches `contoso.com` and `example.anycontoso.com` | firewall-rules: wildcard sentence |
| Management subnet routes | Confirmed (management-nic): "The only route allowed on this subnet is a default route to the Internet and Propagate gateway routes must be disabled". Also: management NIC decoupled from forced tunneling (formerly called Forced Tunneling); always on for Basic and secured hub firewalls | Design table, management subnet row |
| DNAT with forced tunneling | Ambiguous: forced-tunneling says "DNAT isn't supported with forced tunneling enabled ... However, firewalls with a Management network interface still support DNAT", while forced tunneling itself requires the management NIC | None. For a human decision |
| Secured hub: 80 public IPs | Confirmed (secured-virtual-hub): up to 80 per firewall for standard deployments, up to 250 with BYOPIP (preview). vhubs-and-vnets: "Auto generated, or customer provided (preview)". Limits page: 250 for Azure Firewall | None |
| FR « Les spokes sont appairés au hub » | Glossary: « peering » | « reliés au hub par peering » |

## 54-waf

| Finding | Learn | Change |
| --- | --- | --- |
| Front Door association scopes on Standard | waf-front-door-policy-settings ("Applies to: Front Door Premium" only) documents profile, domain and route scopes, most specific wins (route, domain, profile). No fetched page documents route or profile scopes on Standard; the same page also covers settings that Standard has (custom block response), so the label may be page-wide | waf-association: domains for Standard or Premium; profile and route scopes as documented for Premium. Key points aligned. Flagged |
| Front Door match variables | Custom rules page lists RequestMethod, QueryString, PostArgs, RequestUri, RequestHeader, RequestBody, Cookies (IP conditions described separately); the IP restriction page (Standard and Premium) still defines `RemoteAddr` and `SocketAddr` | None (both pages are consistent with the chapter) |
| JS challenge | waf-javascript-challenge: Front Door Premium, custom rules and Bot Manager 1.x; preview on Application Gateway | None (matches the chapter) |
| Application Gateway size limits with CRS 3.1 | Confirmed (limits page): file upload V2 750 MB, 4 GB with CRS 3.2 or DRS, default 100 MB; inspection 128 KB vs 2 MB; exclusions 40 vs 200; sites 40 with CRS 3.1 or lower | waf-design limits sentence: 750 MB and 40 exclusions added |
| Rate limiting "CRS 3.2 or later" | rate-limiting-overview says "select CRS 3.2"; waf-engine lists CRS 3.2 and DRS 2.1 and later on the new engine, and rate limiting among its features. Group-by values and per-association counters confirmed | None |
| Origin lockdown | Matches the chapter per the QZ report; not refetched | None |

## Mock-exam bank questions changed

- `questions/security/az700-5b-fwm-parent-region.yaml` (EN + FR `explanation.correct`): "inherits all the rule collections of its parent" became "inherits the network and application rule collections of its parent (NAT rule collections aren't inherited)". Why: firewall-manager/policy-overview. The answer doesn't change.

## Checked and left unchanged

- `az700-cs3b-policy-inheritance` (option e false: NAT not inherited) matches Learn.
- `az700-5a-nsg-stateful-facts` s3 is about DNS to 168.63.129.16, not probes: still No.
- `az700-5a-asg-region`, the 5.1.2 association questions (`az700-5a-assoc-*`): no region/subscription claim for a NIC's NSG.
- `az700-5b-fw-deploy-mgmt-nic` (option c: management subnet route rule) matches management-nic.
- `az700-5b-fw-rules-dnat-multi` option d (forced tunneling breaks DNAT): follows the first sentence of forced-tunneling; see the human decision below.
- `az700-5b-svh-facts-multi` option d explanation (80, 250 with customer-provided preview) matches secured-virtual-hub.
- `az700-5b-waf-agw-ratelimit`, `az700-5b-waf-agw-exclusion` ("CRS 3.2 or later") match waf-engine.
- `az700-5b-waf-afd-remoteaddr`, `az700-5b-waf-afd-bots` (JS challenge on Front Door Premium), `az700-5b-waf-assoc-afd-domain` (Premium profile, domain association), `az700-cs1b-waf-policy`, `az700-cs3a-waf-rules` (domain association).
- No bank question uses the Bastion custom port, `AllowRulesOnly`, the 750 MB cap or FQDN wildcards on the bare domain.

## Quiz files

None changed. Quiz 53 q10 puts the DNAT collection in the child policy, so it stays correct with non-inherited NAT collections. check-quiz 0/0.

## For a human decision

- **DNAT with forced tunneling** (53, `az700-5b-fw-rules-dnat-multi` d): Learn's forced-tunneling page says both "DNAT isn't supported with forced tunneling enabled" and "firewalls with a Management network interface still support DNAT". Chapter and question keep "forced tunneling breaks inbound DNAT".
- **Front Door route and profile WAF scopes on Standard** (54): only a Premium-labelled page documents them. The chapter now says "documented for Premium"; `az700-5b-waf-design-afd-tier` says a policy "is associated with afd-nw" (a Standard profile), which doesn't name a scope.
- **DNAT on the firewall private IP** (53 rule table, "public (or private) IP"): the firewall FAQ calls intranet DNAT "(preview)". Not changed; decide whether to mark it.
- French terms not in the glossary: « pool principal » is in the guide for backend pool; « réseau virtuel managé » (managed virtual network), « relié par peering » (same choice as FIX-az-700-1), « marquées comme indisponibles » (probe marks down).

The shared WebFetch budget ran out several times; each fetch was retried after a wait, and every Learn fact above was fetched in this session except those marked "not fetched" or "not refetched" (none of them led to a change).
