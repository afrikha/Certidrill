In the cloud you pay for what you use, so understanding what drives the bill, estimating it before deployment and following it afterwards are part of the fundamentals.

<!-- section: cost-factors | objectives: 3.1.1 -->
## Factors that affect costs

| Factor | Effect |
| --- | --- |
| **Resource type** | The kind of resource and its settings: a storage account's performance tier, access tier and redundancy; a virtual machine's size, operating system license, disks |
| **Consumption** | Pay-as-you-go follows usage. A **reservation** (commit for one or three years) can save up to 72 % on stable workloads |
| **Maintenance** | Resources left behind keep costing: disks or networks of deleted virtual machines, forgotten test environments |
| **Geography** | The same resource has different prices in different regions, because energy, labor, taxes and fees differ |
| **Network traffic** | Inbound data is generally free; **outbound data is billed**, with rates that depend on the billing zone. Moving data within Europe, for example, costs less than moving it from Europe to Asia or South America |
| **Subscription type** | Some subscriptions include usage allowances: the free trial gives a credit for the first 30 days and some services free for twelve months |
| **Azure Marketplace** | Third-party solutions are billed with their own conditions, in addition to the Azure resources they use |

Ways to reduce costs: choose the right size, deallocate virtual machines that aren't used, delete unused resources, buy reservations for stable workloads, reuse licenses with Azure Hybrid Benefit, move rarely read data to cooler storage tiers.

<!-- section: pricing-calculator | objectives: 3.1.2 -->
## The pricing calculator

The **pricing calculator** gives an **estimated cost for resources you plan to deploy**. You add products (compute, storage, networking), then set their options: region, tier, size, number of hours, redundancy, support plan. You can save, export and share the estimate.

- It estimates; it doesn't deploy anything and you aren't charged for using it.
- It answers "how much would this architecture cost per month?" **before** deployment.
- For what is **already** deployed and spent, the tool is Cost Management.

<!-- section: cost-management | objectives: 3.1.3 -->
## Cost management capabilities

**Microsoft Cost Management** lets you check the costs of Azure resources quickly and act on them.

| Capability | Use |
| --- | --- |
| **Cost analysis** | Explore and visualize costs: by billing cycle, region, resource, resource group or tag; shows trends and a forecast |
| **Budgets** | Set a spending limit for a subscription, a resource group, a service type...; alerts fire at thresholds of the budget. Cost data arrives within 8 to 24 hours and budgets are evaluated every 24 hours, so alerts aren't immediate. Advanced setups can trigger automation that suspends or modifies resources |
| **Cost alerts** | **Budget alerts** (spending reaches a threshold of a budget), **credit alerts** (prepaid credits are being consumed, for organizations with an enterprise agreement), **department spending quota alerts** |
| Recommendations | Suggestions from Azure Advisor to reduce spending |

> **Exam trap.** A budget warns you; by default it doesn't stop resources or block spending. And the pricing calculator never shows your actual costs: that is cost analysis.

<!-- section: tags | objectives: 3.1.4 -->
## Tags

A **tag** is a name and a value attached to a resource, such as `Department = Finance` or `Environment = Production`. Tags add information that the resource group structure can't carry.

| Purpose | Example |
| --- | --- |
| Resource management | Locate the resources of a workload, an environment or a business unit |
| Cost management and optimization | Group resources to report costs, allocate them to cost centers, track budgets |
| Operations management | Group resources by criticality, to formulate service-level agreements |
| Security | Classify data by security level, such as *public* or *confidential* |
| Governance and regulatory compliance | Identify resources subject to a standard such as ISO 27001 |
| Workload optimization and automation | Tag the resources of a deployment, for example to shut them down automatically |

- Tags are managed with the portal, Azure PowerShell, the Azure CLI, ARM templates or the REST API.
- **Azure Policy** can require tags on new resources or add them automatically.
- Resources **don't inherit** the tags of their resource group or subscription, unless a policy applies them. For cost reporting only, the **tag inheritance** setting of Cost Management applies subscription and resource group tags to the usage records of child resources, not to the resources themselves.
- A resource can carry several tags; don't put sensitive values in them.

<!-- section: key-points -->
## Key points

- Costs depend on resource type, consumption, maintenance, geography, network traffic (outbound is billed), subscription type and Marketplace purchases.
- Pricing calculator = estimate before deployment. Cost Management = analyze, budget and alert on real spending.
- Budgets alert at thresholds; they don't block spending by themselves.
- Tags = name and value metadata for organization, cost reporting, operations, security and compliance; enforced with Azure Policy; not inherited.
