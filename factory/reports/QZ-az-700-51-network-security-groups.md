# QZ-az-700-51-network-security-groups — report

Quiz: `content/az-700/quizzes/51-network-security-groups.yaml` (10 questions, objectives 5.1.1–5.1.5; positions 6–10: single, multi, yesno_statements, hotarea, dropdown). `check-quiz` → 0 problem(s), 0 warning(s).

## Chapter issues (against Learn, Nov. 2026)

- **168.63.129.16 exam trap (EN/FR, section create-nsg)**: the trap says the host VIP "isn't filtered by your NSG rules unless you target them with the dedicated service tags". This is true for DHCP/DNS/IMDS/health monitoring (NSG overview), but Load Balancer health probes, which also come from 168.63.129.16, *are* filtered: "you must allow 168.63.129.16 ... in any Azure network security groups" (Azure Load Balancer health probes page). A learner may conclude that a custom Deny-All can't break probes. Suggest adding "except Load Balancer health probes (AzureLoadBalancer tag)". Quiz question 7 relies on the Learn behaviour.
- **French terminology**: the FR chapter writes « réseaux appairés » (default rules paragraph and service tag table). The glossary/guide require « peering » (« réseaux reliés par peering »), not « appairé ».
- **Association constraints**: the chapter states "same region (and, for a subnet, the same subscription)". Learn's subnet page confirms "same subscription and location as the virtual network" for subnets; the NIC page states no such constraint for an NSG on a NIC (only for ASGs: "same virtual network and location as the NIC"). Quiz question 3 tests the subnet case only.
- **Private endpoints and ASGs**: the chapter says the rules apply "only if the private endpoint network policy of their subnet is enabled" — confirmed (Configure an ASG with a private endpoint: network policies for NSGs must be enabled). Learn also limits an ASG coupled to the NSG of a private endpoint subnet to 50 members (not in the chapter; not tested).

## Unverified / inferred

- The ASG creation form fields (subscription, resource group, name, region) were not read on a fetched page; the regional nature of ASGs is inferred from the NIC page ("same virtual network and location"). Question 2.
- `Sql.WestEurope`: the service tags page confirms Sql is regional; the exact regional name comes from the downloadable JSON, not read. Question 10.
