AWS gives every customer free tools to estimate, follow, analyze and allocate spending. Exam questions describe a need ("estimate before deploying", "alert when the forecast exceeds 1,000 USD", "see last quarter's costs by service", "charge each department for its resources", "one bill for all accounts") and ask for the tool or feature that meets it.

<!-- section: billing-support | objectives: 4.2.1 -->
## Billing support and information

- The **AWS Billing and Cost Management console** shows the bills (charges by service and Region, invoices, payments), the payment methods, the credits and the cost management tools.
- **Account and billing support** is included for every customer, in every Support plan, Basic included: open a billing case in the **AWS Support Center** for a question about a charge, an invoice or a payment.
- **AWS Cost Anomaly Detection** uses machine learning to detect unusual spending and send alerts.
- Access to billing data is controlled with IAM policies; the root user can activate IAM access to the billing console.

> **Exam tip.** A billing question never requires a paid Support plan. "Get help with an unexpected charge at no cost" is account and billing support through the Support Center.

<!-- section: pricing-information | objectives: 4.2.2 -->
## Pricing information for AWS services

| Source | Use |
| --- | --- |
| **Pricing pages** of each service on aws.amazon.com | Public prices by Region, pricing dimensions, free tier details |
| **AWS Pricing Calculator** | Estimate the cost of a planned architecture (see below) |
| **AWS Price List API** | Query AWS prices programmatically, or download price lists in bulk |
| **AWS Free Tier** | Try services at no cost: credits for new customers (100 USD, up to 100 USD more by completing activities), a free account plan for up to six months, and Always Free monthly allowances on more than 30 services |

Most services bill by the second, hour, GB or request; prices **differ between Regions**.

<!-- section: organizations | objectives: 4.2.3, 4.2.7 -->
## AWS Organizations and consolidated billing

**AWS Organizations** groups several AWS accounts under one **management account**. The **member accounts** can be arranged in **organizational units (OUs)**, and **service control policies (SCPs)** set the maximum permissions available in the accounts of an OU.

**Consolidated billing** is a feature of Organizations, at no additional cost:

| Benefit | What it means |
| --- | --- |
| **One bill** | The management account receives and pays a single bill for all member accounts |
| **Easy tracking** | Charges are still shown per account, so each account's costs can be allocated |
| **Combined usage** | Usage of all accounts is added together for **volume pricing tiers** (for example S3 storage or data transfer), so the organization reaches cheaper tiers sooner |
| **Shared discounts** | Reserved Instance and Savings Plans discounts apply across accounts (chapter 41) |

> **Exam trap.** Consolidated billing combines **billing**, not permissions: a member account's users don't get access to other accounts. Controlling what accounts can do is the job of SCPs.

<!-- section: cost-allocation-tags | objectives: 4.2.4, 4.2.8 -->
## Cost allocation tags

A **tag** is a key-value label on a resource (for example `CostCenter = 1234`). A **cost allocation tag** is a tag activated for billing, so that costs can be grouped and filtered by its values.

| Type | Created by | Prefix in reports |
| --- | --- | --- |
| **AWS-generated** cost allocation tags | AWS, for example `aws:createdBy` (who created the resource) | `aws:` |
| **User-defined** cost allocation tags | You, on your resources | `user:` |

- Both types must be **activated** in the Billing and Cost Management console before they appear in billing tools; in an organization, the **management account** activates them.
- An activated tag can take **up to 24 hours** to appear.
- Activated tags appear as **filters and groupings in AWS Cost Explorer and AWS Budgets**, and as **columns in the AWS Cost and Usage Report**, so you can see each department's or project's costs.
- **Tag policies** in AWS Organizations standardize tag keys and values across accounts.

<!-- section: budgets-cost-explorer | objectives: 4.2.5 -->
## AWS Budgets and AWS Cost Explorer

| Tool | Purpose | Main capabilities |
| --- | --- | --- |
| **AWS Cost Explorer** | **Analyze** past spending and **forecast** future spending | Graphs and reports of cost and usage by service, account, Region or tag; up to 13 months of history plus the current month; forecast for the next 18 months; Reserved Instance and Savings Plans recommendations, utilization and coverage reports; rightsizing recommendations |
| **AWS Budgets** | **Alert** when spending crosses a threshold you set | Cost, usage, Reserved Instance and Savings Plans budgets; alerts on **actual or forecasted** values by email or Amazon SNS; **budget actions** that apply an IAM policy or an SCP, or stop EC2 or RDS instances |

> **Exam trap.** Cost Explorer shows and forecasts, but it doesn't alert. "Notify the finance team when monthly costs are forecast to exceed 500 USD" is AWS Budgets.

<!-- section: pricing-calculator | objectives: 4.2.6 -->
## AWS Pricing Calculator

**AWS Pricing Calculator** estimates the monthly cost of AWS services **before** you use them:

- It is free, web-based, and needs **no AWS account** (calculator.aws).
- Add services, choose a Region and enter the configuration (instance type, storage, data transfer, requests); the calculator shows the monthly and upfront cost, and the calculation behind each price.
- Organize services in **groups** (by application, cost center or Region), save a **link** to share the estimate, or **export** it as CSV or PDF.
- Prices come from the AWS Price List API; taxes and Free Tier usage are not included.

| Need | Tool |
| --- | --- |
| Estimate the cost of an architecture not yet deployed | AWS Pricing Calculator |
| See what you spent last month and forecast next month | AWS Cost Explorer |
| Be alerted when spending exceeds a threshold | AWS Budgets |
| Get the most detailed line items for analysis | AWS Cost and Usage Report |

<!-- section: cost-usage-report | objectives: 4.2.8 -->
## AWS Cost and Usage Report

The **AWS Cost and Usage Report (CUR)** is the most detailed billing data: line items by hour, day or month, by resource, with the activated cost allocation tags as columns. It is delivered as files to an **Amazon S3 bucket** (through AWS Data Exports) and analyzed with Amazon Athena, Amazon Redshift or Amazon Quick.

> **Exam tip.** "Most granular", "hourly, per resource", "load billing data into a data warehouse" point to the Cost and Usage Report, not to Cost Explorer.

<!-- section: key-points -->
## Key points

- Account and billing support is free in every plan, through the Support Center.
- Pricing pages and Price List API: prices. Pricing Calculator: estimates before deploying.
- Organizations: management account, member accounts, OUs, SCPs. Consolidated billing: one bill, combined volume tiers, shared RI and Savings Plans discounts, no extra cost.
- Cost allocation tags: AWS-generated (`aws:`) or user-defined (`user:`), activated by the management account, visible in Cost Explorer, Budgets and the CUR.
- Cost Explorer analyzes and forecasts; Budgets alerts and can act; the CUR gives the most detailed data in S3.
