# QZ-az-700-41-private-link — report

Quiz: `content/az-700/quizzes/41-private-link.yaml` (10 questions, objectives 4.1.1–4.1.6; positions 6–10: single, single, dropdown, yesno_statements, multi). `check-quiz` → 0 problem(s), 0 warning(s).

The mock bank already covers this objective group densely (≈45 questions). The quiz tests other decisions: Disconnected state, one endpoint per resource with shared DNS, owner-side `private-endpoint-connection approve`, 0.0.0.0/0 and /8 routes that don't override the /32 endpoint route, backend NSG that must allow the PLS NAT subnet, a three-client DNS outcome table, visibility vs auto-approval with TCP proxy v2, gateway transit for an endpoint in a spoke.

## Chapter issues (against Learn, Nov. 2026)

- **Key Vault forwarder zones (4.1.5/4.1.6)**: the chapter tells the on-premises forwarder to target `vaultcore.azure.net`. The "private DNS zone values" page lists two public zones for Key Vault: `vault.azure.net` and `vaultcore.azure.net`. Applications use `<name>.vault.azure.net`, so the chapter should name both. Quiz Q10 says "the Key Vault public zones" so it doesn't depend on this.
- **NSG flow logs**: the access section says "NSG flow logs don't record inbound traffic" to a private endpoint. Learn still says so, but NSG flow logs can no longer be created (VNet flow logs replace them). The sentence could mention that.
- **French terminology**: the FR chapter writes « réseaux virtuels appairés » (sections plan-private-endpoints and access-private-endpoints). The glossary and writing guide require « peering » (« reliés par peering »), not « appairé ».
- **Static IP**: Learn lists services where a static IP isn't supported for a private endpoint (AKS, Application Gateway, HDInsight, Recovery Services vaults, third-party Private Link services). The chapter says "static optional" without that caveat. Not tested.

## Unverified

- Chapter limits I didn't find on the pages I fetched: 1,000 / 4,000 / 64,000 private endpoints, eight PLS per load balancer, 1,000 private endpoints per PLS (the PLS overview points to the Azure limits page, which I didn't fetch). The quiz doesn't use these numbers.
- Q10: the portal now labels the peering settings "Allow gateway or route server … to forward traffic" and "Enable … to use … remote gateway or route server". The quiz uses the short names "allow gateway transit" and "use the remote gateways", as the bank and glossary do.
- Q9 s2 assumes that a consumer network that overlaps the provider VNet works with auto-approval, as the chapter and PLS overview state (destination NAT).
