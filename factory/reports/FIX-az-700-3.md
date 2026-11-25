# FIX-az-700-3 — chapters 32, 33, 34, 35, 41 and 42 corrected from the quiz reports

Checked on learn.microsoft.com on 2026-11-24. Results: `check-cert az-700 32-load-balancer-traffic-manager 33-application-gateway-design 34-application-gateway-configuration 35-front-door 41-private-link 42-service-endpoints` 0 problems; `content:validate --cert az-700` 0 problems, 0 warnings; `check-quiz az-700` (same chapters) 0 problems, 0 warnings.

Every change was made in EN and FR with the same sections, tables and callouts. No code block or section marker changed.

The WebFetch budget ran out twice during the pass. One finding (Front Door edge-location selection) was settled from the source file of the Learn page in MicrosoftDocs/azure-docs, because WebFetch strips the tier pivots. Every other change was confirmed with WebFetch on learn.microsoft.com.

## 32-load-balancer-traffic-manager

| Finding | Learn | Change |
| --- | --- | --- |
| All probes down: established TCP flows continue only when the pool has more than one instance | Confirmed (load-balancer-custom-probe-overview, "Probe down behavior" table; the SKU table gives the shorter form) | Health-probe paragraph: condition added |
| Gateway Load Balancer: NVA MTU of at least 1,550 bytes is unverified | Confirmed: tutorial-create-gateway-load-balancer says the MTU must be "a minimum of 1550 bytes" for the VXLAN headers. The same page confirms ports 10800/10801 and identifiers 800/801. gateway-overview doesn't mention MTU | None |
| Traffic Manager apex: Linked Records now recommended | Confirmed (dns/dns-alias: use Traffic Manager Linked Records for new configurations, alias records still supported for backward compatibility; dns-traffic-manager-linked-records: they work at the zone apex. The page shows no preview label) | Apex sentence: "recommended for new configurations" / "still supported for backward compatibility" |
| "Multivalue" vs "MultiValue" | Learn uses both spellings | None (naming choice, see below) |

## 33-application-gateway-design

| Finding | Learn | Change |
| --- | --- | --- |
| TCP/TLS proxy listed without a preview label | **Not confirmed.** Only one FAQ sentence (application-gateway-faq, updated 2026-10-29, Exchange answer) says the Layer 4 proxy is "in Preview". The dedicated pages tcp-tls-proxy-overview (2025-11-26) and how-to-tcp-tls-proxy (2026-02-05) have no preview label, and their en-us titles no longer carry "(Preview)" (older localized copies still do). A Microsoft 365 message-center entry, not on Learn, announces "Generally Available: TLS and TCP termination". The FAQ sentence looks stale | None. Needs a human decision |
| Probe detection time | Confirmed (application-gateway-probe-overview: first detection + threshold × interval, example 20 + 2 × 20 s; v2 retries wait for the interval, v1 sends them in quick succession) | Probe trap callout: formula, Learn example, v1/v2 retry behaviour |
| FR « réseaux (virtuels) appairés », lines 47 and 107 | Glossary: « peering », avoid « appairage » | « réseaux reliés par peering », « réseaux virtuels reliés par peering » |

## 34-application-gateway-configuration

| Finding | Learn | Change |
| --- | --- | --- |
| Listener-specific TLS policies: limits missing | Confirmed (application-gateway-configure-listener-specific-ssl-policy: listeners on the same port can't have policies with different TLS protocol versions, so use separate ports; legacy and 2022/CustomV2 policies can't be mixed. application-gateway-ssl-policy-overview: old and new policies can't coexist on a gateway) | TLS policy paragraph: both restrictions added |
| `AppGwSslPolicy20150501` / `20170401` "discontinued" | Wrong: application-gateway-ssl-policy-overview still lists both, and 20150501 is still the default for API versions earlier than 2023-02-01. TLS 1.0/1.1 support ends from August 31, 2025 | Same paragraph: "still listed, but TLS 1.0 and 1.1 are no longer supported since August 31, 2025" |
| Wildcard host names | Confirmed (multiple-site-overview: `*.contoso.com` doesn't match `contoso.com`; it matches `customer1.b2b.contoso.com`; `*` matches several characters, `?` matches one; up to 5 host names) | Listener table, Type row |
| Custom error pages | Confirmed (custom-error: "404 … is currently unsupported"; global pages can't be configured in the portal; PowerShell `Add-AzApplicationGatewayCustomError`) | Listener table, Custom error pages row |
| Request timeout of external vs private backends | Matches the chapter (QZ report) | None |

## 35-front-door

| Finding | Learn | Change |
| --- | --- | --- |
| PoP selection: Anycast or Unicast? DNS resolver? | Confirmed for the chapter. front-door-traffic-acceleration has tier pivots: the Standard/Premium pivot holds the **Unicast** section and a note that PoP selection happens during DNS resolution and uses the DNS resolver's location when the user's location isn't known. Anycast is the classic pivot. Read from the page's source file, because WebFetch strips pivots | None |
| Origin weight 1 to 1,000 | Confirmed (routing-methods: "an integer between 1 and 1,000, with a default value of 50"). The default conflicts with the 1000 given on the origin how-to page; the chapter states no default | None |
| Managed certificates on wildcard and apex domains | Confirmed (domain: in the table, "Managed TLS certificates are rotated automatically" is No for wildcard domains; apex domains may need revalidation) | TLS certificate table, Renewal row |
| Stop evaluating remaining rules | front-door-rules-engine: "any remaining rule sets associated with the route don't get ran". Learn doesn't say whether later rules in the same set are skipped | Sentence rewritten to Learn's wording, without "ends the processing" |
| 7,200 RPS limit gives 429 | Confirmed (frontdoor/private-link: requests beyond 7200 RPS at a region are rate limited with "429 Too Many Requests") | Private Link design rule: 429 added |
| BYOC: app registration method being deprecated | Confirmed (standard-premium/how-to-configure-https-custom-domain: managed identity is "more secure"; app registration "is being deprecated and will be retired in the future"). The domain page lists both without this note | TLS certificate table, Prerequisites row: "recommended" / "being deprecated" |
| Origin response timeout 16-240 s | Not fetched (budget) | None |
| Limits table (endpoints, domains, origins, rules) | Not verified (limits page not fetched) | None |

## 41-private-link

| Finding | Learn | Change |
| --- | --- | --- |
| Key Vault forwarder zones | Confirmed (private-endpoint-dns: public DNS zone forwarders `vault.azure.net` and `vaultcore.azure.net`) | On-premises section: both zones named |
| NSG flow logs | Confirmed: private-endpoint-overview still says NSG flow logs don't record inbound traffic to a private endpoint. nsg-flow-logs-overview: they retire on September 30, 2027, new ones can no longer be created, and virtual network flow logs replace them | Access section bullet: retirement in parentheses. I didn't state whether VNet flow logs capture private endpoint traffic (not documented on the pages I fetched) |
| Static IP not supported for some services | Confirmed (private-endpoint-overview: AKS, Application Gateway, HDInsight, Recovery Services vaults, third-party Private Link services) | Properties table, Subnet row |
| FR « réseaux virtuels appairés » (lines 23, 25, 100) | Glossary « peering » | « reliés par peering » |
| Limits 1,000 / 4,000 / 64,000, eight PLS per load balancer, 1,000 endpoints per PLS | Not verified: private-endpoint-overview gives no numbers and points to the limits page, which I didn't fetch | None |

## 42-service-endpoints

| Finding | Learn | Change |
| --- | --- | --- |
| Storage: 200 virtual network rules | Wrong: storage-network-security says 400 virtual network rules and 400 IP network rules per account. Key Vault: 200 virtual network rules confirmed (key-vault/general/network-security, plus 1,000 IPv4 rules) | Rules bullet: 400 for storage (and 400 IP rules), 200 for Key Vault. SQL 128 and Cosmos DB 64 not re-checked |
| Region row: `Microsoft.Storage` same region, `Microsoft.Storage.Global` any region, only one per subnet | Confirmed (storage-network-security) | Comparison table, Region row |
| Permission for a storage virtual network rule | Confirmed (storage-network-security-virtual-networks: "A Storage Account Contributor or a user who has permission to … joinViaServiceEndpoint/action … can apply a rule"; the user needs permissions on the subnets being added) | Permission bullet: Storage Account Contributor named, plus a sentence that a role scoped only to the resource grants nothing on the subnet (consistent with quiz q3) |
| FR « réseau(x) virtuel(s) appairé(s) » | Glossary « peering » | « relié(s) par peering » (table and create section) |
| Classic storage accounts always denied | Still on Learn; classic accounts are retired | None |
| Standard service endpoints (public preview) | Preview: not added | None |

## Mock-exam bank questions changed

None. No bank question on my objectives (169 files in questions/, case studies and series) contradicts a confirmed fact:

- Storage regions: `az700-4b-sec-storage-global` already uses `Microsoft.Storage.Global` and the "only one of the two per subnet" rule. `az700-4b-se-sql-cross-region` already uses the same-region rule for SQL.
- Key Vault DNS: `az700-4b-hybrid-dns-statements` forwards `vaultcore.azure.net`; none of its three statements depends on `vault.azure.net`.
- TLS policies: `az700-3b-tls-facts-yn` relies on the 2022 default for API 2023-02-01 and later (confirmed). `az700-3b-tls-mtls-profile` doesn't use the same-port restriction.
- Wildcards: `az700-3b-listener-facts-multi` (`*`, `?`, five host names) is confirmed.
- TCP/TLS proxy: no question uses it as a correct answer. It appears only in distractor explanations of `az700-3b-settings-cli-https`.
- Load Balancer: `az700-3a-config-admin-state` (established flows persist on admin Down) is unaffected by the all-probes-down condition.
- Front Door: `az700-3b-config-custom-domain-order` (CNAME directly to the endpoint, so automatic rotation) is confirmed. No question uses wildcard-domain certificate rotation, the app-registration method or the stop-evaluating behaviour.
- Static IP: `az700-4a-pe-cli-static-ip` targets a web app, which isn't in the unsupported list.
- No question on these objectives uses « appairé ».

## Checked and left unchanged

Gateway Load Balancer MTU and tunnel defaults (32), Front Door Unicast/DNS-resolver PoP selection and origin weight range (35), request timeouts (34), classic storage accounts and the standard service endpoints preview (42).

## Quiz files

None changed. All six quizzes still agree with the corrected chapters (check-quiz 0/0). Quiz 42 q3 (role scoped to the storage account grants nothing on the subnet) stays consistent with the new permission sentence.

## For a human decision

- **TCP/TLS proxy status (33, and 34's protocol row).** The FAQ says Preview, but the dedicated pages have dropped the label and a non-Learn GA announcement exists. The chapter keeps it as a Standard_v2/WAF_v2 capability without a preview label. If the owner follows the FAQ, the capability table and Basic column in 33, and the listener protocol row and TLS design table in 34, would need a "(preview)" mention.
- **Traffic Manager method spelling:** "Multivalue" (routing methods page, chapter) vs "MultiValue" (FAQ, CLI value, quiz).
- **Front Door origin weight default:** 50 (routing-methods) vs 1000 (origin how-to). The chapter states none.
- **Unverified limits** (not fetched): Front Door limits table (35); private endpoint and PLS limits (41); SQL 128 and Cosmos DB 64 virtual network rules (42); Front Door origin response timeout 16-240 s (not added).
- **French terms not in the glossary**, used in my additions: « compatibilité descendante » (backward compatibility), « en cours de dépréciation » (being deprecated), « mis hors service » (retire), « inscription d'application » (app registration), « faire l'objet d'une rotation automatique ».
