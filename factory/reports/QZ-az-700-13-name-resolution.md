# QZ-az-700-13-name-resolution — notes

`content/az-700/quizzes/13-name-resolution.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q7), 1.2.2 (q3, q6), 1.2.3 (q4), 1.2.4 (q8), 1.2.5 (q1, q5), 1.2.6 (q2), 1.2.7 (q9, q10). Positions 6–10: yesno, single, yesno, multi, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Custom DNS server limit "up to 20 addresses"** (section vnet-dns-settings): the Learn page "Create, change, or delete an Azure virtual network" now says "up to the Azure limit" and links the limits page; the name resolution page gives no number. Not checked on the limits page; the quiz doesn't use the number.
- **Resolver subnet "/28 to /24"**: confirmed on "What is Azure DNS Private Resolver?" (minimum /28, maximum /24). The endpoints and rulesets page doesn't state it.
- **"One ruleset per virtual network"**: neither the overview nor the endpoints page states it in these words. The overview only says a virtual network link is "a one-to-one relationship". The quiz doesn't rely on it.
- **Limits missing from the chapter**: rulesets per outbound endpoint = 2, outbound endpoints per ruleset = 2, resolvers per subscription = 15, QPS per endpoint = 10,000. Cross-tenant ruleset links aren't supported, and VNets with encryption enabled don't support the resolver. q10 uses "2 rulesets per outbound endpoint", which the chapter doesn't state (it says only "attached to at most 2 outbound endpoints").
- **Traffic Manager at the apex**: the alias page now says that alias records to a Traffic Manager profile are "supported for compatibility", and it recommends **Traffic Manager Linked Records** for new configurations. The DNS FAQ describes these records too. The chapter's table (section public-zones) still gives an alias record set as the answer for a Traffic Manager profile at the apex. The quiz avoids Traffic Manager.
- **Autoregistration removal**: the autoregistration page now says records are removed when a VM is "deleted or stopped", not "deallocated". The chapter says "deallocated or deleted". The mock question `az700-1b-private-dns-link-troubleshoot` (option b) uses "stopped (deallocated)", which is fine.
- **Manual record over an autoregistered one**: the Private DNS FAQ says that a manual record with the same name overwrites the autoregistered record, and that autoregistration re-creates it after the manual one is deleted. The chapter doesn't say this.
- **New detail in the endpoints page**: don't use the inbound endpoint IP as a forwarding target for zones that aren't linked to the resolver's virtual network. The chapter doesn't have it.
- **French**: the FR chapter uses « appairé » and « Après l'appairage » (section vnet-name-resolution and its trap). The shared glossary says to avoid « appairage » and to use « peering ». The quiz uses « relié par peering ».

## Facts checked for the quiz

- Fallback to internet (q8) is **generally available**. The Learn page "Fallback to internet for Azure Private DNS zones" carries no preview label, and Azure update AZ480005 reads "Generally Available: Fallback to Internet on Private DNS Zones". The page says the policy is only for Private DNS zones of Private Link resources, that it is set on the virtual network link (`resolutionPolicy: NxDomainRedirect`), and that names with a record keep their private IP.
- q6: the restart of Application Gateways and Azure Firewalls after a DNS change comes from the "Change DNS servers" steps on "Create, change, or delete an Azure virtual network". The same section gives the DNS server order ("not round robin"), which q3 uses.
- q9: the rules come from the endpoints and rulesets page: 168.63.129.16 can't be a target, the first target is used unless it doesn't respond, a wildcard target must resolve public names, and a target is an IP address and a port. "6 targets per rule" comes from the overview.
- q10: the architecture page says "To use forwarding rules in the hub VNet, create and link another ruleset to the Hub VNet". It also warns about loops when a ruleset that targets the inbound endpoint is linked to the endpoint's virtual network.

## Doubts

- q4 option c (a CNAME to the DNS name label of the public IP dangles when the IP is deleted): this is general dangling-DNS knowledge. It isn't stated on the alias page I fetched. The page only says an alias "becomes an empty record set" when the target is deleted.
- q7: the explanation (a custom server's forwarded query sees only the zones linked to the server's own VNet) follows the chapter and the FAQ's precedence answer. No fetched page puts it in one sentence.

## Design notes

- Mock-exam decisions avoided: Azure-provided DNS across peering, NIC override, DHCP lease renewal, CNAME conflict, DC forwarder to 168.63.129.16, delegation steps, child zone, DNSSEC, wildcard, record-type dragdrop, autoregistration scope and limits, link CLI and permissions, split horizon, the resolver inbound target, outbound steps, hub-spoke centralized/distributed choice, longest suffix and region.
- New decisions: apex NS/SOA, disabling autoregistration, server order, alias to a Standard public IP against dangling, co-hosting and no zone transfers, Application Gateway restart, custom DNS servers in an unlinked VNet, fallback to internet, rule validity (port, wildcard, targets), and two rulesets to avoid the loop.
- No preview or retired feature is a correct answer.
