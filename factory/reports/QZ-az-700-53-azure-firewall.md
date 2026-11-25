# QZ-az-700-53-azure-firewall — notes

`content/az-700/quizzes/53-azure-firewall.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 5.2.1 (q4), 5.2.2 (q2), 5.2.3 (q1, q8, q9), 5.2.4 (q7), 5.2.5 (q3, q10), 5.2.6 (q5), 5.2.7 (q6). Positions 6–10: dragdrop, multi, single, yesno_statements, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **NAT rule collections aren't inherited.** The Firewall Manager policy overview says that a child policy inherits the parent's network and application rule collections, but NAT rule collections aren't inherited and must be defined in the child. The chapter (section firewall-manager-policies) says the child "inherits all its rule collections", and processing step 2 suggests that parent DNAT rules come first. The mock question `az700-cs3b-policy-inheritance` (option e = false) matches Learn.
- **Wildcard `*contoso.com`.** The FAQ says `*contoso.com` matches `contoso.com` itself as well as `anycontoso.com`, and that `*.contoso.com` does **not** match the bare `contoso.com` (it must be listed separately). The chapter only gives the risky side. Worth one sentence: q3 tests it.
- **DNAT and the management NIC.** The forced tunneling page says that DNAT isn't supported once forced tunneling is enabled, but that firewalls with a management NIC still support DNAT. The chapter's sentence is right. The page also says the management NIC is now decoupled from forced tunneling (the feature used to be called Forced Tunneling).
- **Management subnet routes.** The management NIC page says the only route allowed on AzureFirewallManagementSubnet is a default route to the Internet, with *Propagate gateway routes* disabled. The chapter doesn't say this. It could go in the design table.
- **Secured hub public IPs.** The Firewall Manager architecture page now says "Auto generated, or customer provided (preview)". The chapter says this too. I didn't verify the "80 public IPs" limit: no question uses it.
- **French chapter.** Line 45 uses « Les spokes sont appairés au hub », but the glossary says to avoid « appairage » and use « peering » (« Les spokes sont reliés au hub par peering »). Line 58 says « ajoutez une route `0.0.0.0/0` (itinéraire défini par l'utilisateur, ou BGP …) ». It's acceptable because the sentence covers BGP routes as well.

## Not fully verified

- In q9 s1, the exact source address that the on-premises server sees (one of the firewall's private instance addresses in AzureFirewallSubnet) is inferred from "traffic processed by application rules is always SNAT-ed" (FAQ). The statement only says "a private IP address of FW1".
- In q10, the verdicts come from the rule processing page: threat intelligence runs before any rule, DNAT matches skip further network rule processing, and parent rule collection groups always come first. The threat intelligence feed entry 203.0.113.66 is fictional and is stated in the stem.
- In q6, the "Application Gateway WAF in the hub" row relies on the architecture table ("Currently supported in spoke network" for secured hubs). That table also says NVAs are supported only in spokes, which looks outdated (integrated NVAs exist in Virtual WAN hubs), so I didn't use the NVA row.

## Design notes

The new decisions are: the data subnet name and size, Basic chosen for a small branch, wildcard target FQDNs (bare domain + `*.`), stateful return traffic, one global policy for two regions (with a parent/child distractor across regions), the hub virtual network vs secured hub capabilities (SD-WAN, WAF in the hub, SECaaS split, NAT gateway), Basic prerequisites (two /26 subnets and a management public IP), a BGP default route on AzureFirewallSubnet overridden by a UDR to Internet, application rule SNAT vs network rule FQDN logging vs private range 0.0.0.0/0, and a combined verdict table (threat intelligence, parent application deny, child application allow, DNAT vs a parent network deny). None of them repeats a mock question's decision.
