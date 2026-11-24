# QZ-az-700-42-service-endpoints — report

Quiz: `content/az-700/quizzes/42-service-endpoints.yaml` (10 questions, objectives 4.2.1–4.2.4; positions 6–10: single, yesno_statements, dropdown, multi, hotarea). `check-quiz` → 0 problem(s), 0 warning(s).

The mock bank already covers this group densely (≈30 questions). The quiz tests other decisions: which resource gets the endpoint, Storage-only policies, `joinViaServiceEndpoint/action` at subnet scope, an IP rule that stops matching after the endpoint is enabled, a deleted and recreated subnet, an endpoint on the NVA subnet only, policy scope (peered VNet, Application Gateway subnet, on-premises), a cross-tenant subnet that can only be added through the CLI, App Service access restrictions behind Application Gateway, and NSG evaluation where Deny Internet blocks SQL traffic.

## Chapter issues (against Learn, Nov. 2026)

- **Storage virtual network rule limit is out of date**: the chapter (EN/FR, endpoint-access section) says 200 virtual network rules per storage account. The current Storage firewall page says **400 virtual network rules and 400 IP network rules** per account. The Key Vault, SQL and Cosmos DB figures weren't checked.
- **Region row of the comparison table (when-to-use section)**: it says service endpoints work in "Any region (Azure SQL: same region only)". Learn's Storage firewall page says `Microsoft.Storage` covers only accounts **in the same region** as the virtual network, and that `Microsoft.Storage.Global` is needed for other regions. It also says **a subnet can have only one of the two**. The table should say that.
- **Classic storage accounts**: the endpoint-policies section says classic accounts are always denied. Learn still says so, but classic storage accounts are retired, so the point is moot. Not tested.
- **Permission for a storage virtual network rule**: Learn's Storage page says Storage Account Contributor *or* `joinViaServiceEndpoint/action` through a custom role. The chapter names only the action (included in Network Contributor and Contributor). Quiz Q3 is still accurate: the role is scoped to the storage account, so it grants nothing on a subnet in another subscription.
- **French terminology**: the FR chapter writes « réseau virtuel appairé » / « réseaux virtuels appairés » (table and create section). The glossary requires « peering » (« relié par peering »).
- Learn now lists **standard service endpoints (public preview)**. That's not in the chapter and not tested, which is correct for a preview feature.

## Unverified

- `Sql.WestEurope` and `Storage.WestEurope`: the service tags page confirms that the tags are regional, but I didn't read the exact regional names (Q10).
- Q9: the App Service access-restrictions page says service endpoint rules need the endpoint enabled "both on the networking side and for the Azure service", and it mentions application gateways only in passing. The dedicated "Application Gateway integration" page describes both steps, but I couldn't read its exact title, so it isn't cited.
- Q8: the portal limitation (it shows only same-tenant virtual networks) comes from "Create a virtual network rule for Azure Storage".
