# QZ-az-700-52-flow-logs-security-admin — report

Quiz: `content/az-700/quizzes/52-flow-logs-security-admin.yaml` (10 questions, objectives 5.1.6–5.1.10; positions 6–10: single, dropdown, multi, yesno_statements, single). `check-quiz` → 0 problem(s), 0 warning(s).

## Chapter issues (against Learn, Nov. 2026)

- **Unsupported services list (5.1.6)**: the chapter's "for example" list is correct but Learn's current list also includes Azure Database for MariaDB, MySQL and PostgreSQL, Azure NetApp Files and Microsoft Power Platform. Not an error (it says "for example").
- **IP flow verify "VM must be running"**: not on the overview page; confirmed only by the portal quickstart ("Stopped virtual machines aren't available to select"). Question 2 references the quickstart.
- **Bastion custom port**: Learn says that with the custom port feature (Standard SKU) the egress rule should allow the **VirtualNetwork** service tag "instead" of 3389/22 to the VM subnets; the chapter's table only gives "Any → VirtualNetwork 22, 3389" and doesn't mention the custom-port egress. Worth one sentence in the chapter. Question 8 relies on it.
- **Security admin rules exceptions**: Learn adds that security admin rules don't apply to private endpoints in a managed virtual network, and documents the `AllowRulesOnly` option for SQL MI / Databricks virtual networks (only Allow rules applied). The chapter mentions neither; question 9's explanation uses `AllowRulesOnly` only as a side note.

## Unverified / inferred

- NSG flow logs retirement date (30 Sept 2027) and the "new creation blocked" status: not present on the flow logs overview page fetched in this session (not tested in the quiz).
- Question 7: that a flow allowed by a security admin rule appears under the `aclID` of the Virtual Network Manager configuration is inferred from Learn's field definition ("aclID: identifier of the resource that's evaluating traffic, either a network security group or Virtual Network Manager"; "rule: name of the rule that allowed or denied the traffic"); no Learn sample shows an allowed admin-rule flow.
- Question 6: "one assignment per region" for the Deploy flow log policy is inferred from its parameters (Virtual Network Region, regional storage account, regional Network Watcher); Learn doesn't state it explicitly.
