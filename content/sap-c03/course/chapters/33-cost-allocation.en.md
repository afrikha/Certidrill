Cost allocation answers "who spent this, and on what?" across hundreds of accounts, shared platforms and AI features billed per token. The professional exam expects a complete system: an account structure and tag dictionary that carry the business dimensions, preventive and detective enforcement so tags stay correct, detailed billing data that finance can query, chargeback or showback of shared costs, and alerts that fire before the invoice does.

<!-- section: tagging-strategy | objectives: 3.3.1 -->
## Designing a tagging strategy for cost allocation

**Accounts first, tags second.** The account is the only allocation dimension that covers every charge, including untaggable ones (support, some data transfer, taxes, Marketplace). A structure with accounts per workload and environment, grouped in OUs per business unit, allocates most costs without a single tag. Tags then split shared accounts (a platform account running many tenants, a data lake used by several teams) and add dimensions that accounts do not carry (project, application, owner).

**Tag dictionary.**

| Key | Purpose | Example values |
| --- | --- | --- |
| `CostCenter` | Finance code charged | `4410`, `5120` |
| `BusinessUnit` | Organizational owner | `retail`, `payments` |
| `Project` | Initiative or product | `checkout-v2` |
| `Environment` | Lifecycle stage | `prod`, `staging`, `dev` |
| `Owner` | Accountable team or alias | `team-payments` |

Rules that make the dictionary usable:

- Keys and values are case-sensitive in billing data: `costcenter` and `CostCenter` become two columns. Fix one spelling and enforce it (next sections).
- Keep values to a closed list where possible; free text breaks grouping.
- Tag through automation, not by hand: CloudFormation and CDK stack-level tags, Auto Scaling group tags with propagate at launch, ECS tag propagation from the service or task definition, EC2 launch templates that tag volumes and network interfaces.
- A tag does not allocate costs incurred before it was applied.

**Activation.** User-defined tags must be activated as cost allocation tags in the Billing and Cost Management console of the management account (or a standalone account), one by one or in bulk with the `UpdateCostAllocationTagsStatus` API. A new key can take up to 24 hours to appear for activation, then up to 24 hours to become active. AWS-generated tags carry the `aws:` prefix and are activated separately. When an account joins another organization, its activated tags must be activated again by the new management account.

> **Exam trap.** Tagging resources is not enough for Cost Explorer or the Cost and Usage Report to show the dimension: the key must also be activated as a cost allocation tag by the management account. "Tags are applied but the report has no column" means activation is missing.

<!-- section: cost-reporting | objectives: 3.3.2 -->
## Cost reporting and analytics on detailed billing data

| Need | Tool | Facts |
| --- | --- | --- |
| Interactive analysis, grouping by account, service, tag, cost category; forecasts; commitment recommendations | AWS Cost Explorer | 13 months of history, 18-month forecast, refreshed at least every 24 hours; console free, $0.01 per paginated API request; cannot be disabled once enabled |
| Line-item data for SQL, data lakes and BI | AWS Cost and Usage Report 2.0 through AWS Data Exports | Recommended format; delivered to S3; columns selected (console) or SQL query (CLI, SDK) to keep only needed data |
| Vendor-neutral data for multi-cloud FinOps tools | FOCUS 1.2 or 1.0 export with AWS columns | Same Data Exports service |
| Exported recommendations | Cost optimization recommendations export (Cost Optimization Hub) | Joins savings opportunities to cost data |
| Ready-made executive dashboard | Cost and usage dashboard export with Amazon QuickSight (now Amazon Quick) | Deploys a prebuilt dashboard |

Typical architecture for an organization: the management account exports CUR 2.0 to an S3 bucket in a dedicated FinOps account; an AWS Glue crawler or table definition exposes it to Amazon Athena; Amazon Quick dashboards and finance tools read the Athena views. The legacy CUR uses different API actions and should not be chosen for a new design.

```text
-- Athena view over CUR 2.0: monthly cost per activated CostCenter tag
SELECT bill_billing_period_start_date AS month,
       resource_tags['user_cost_center'] AS cost_center,
       SUM(line_item_unblended_cost) AS cost
FROM cur2.anycompany_cur
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
```

> **Exam tip.** "Finance analysts need SQL over hourly, resource-level costs from all accounts" is CUR 2.0 to S3 with Athena. "A manager wants a monthly graph by business unit" is Cost Explorer grouped by a cost category.

<!-- section: tag-enforcement | objectives: 3.3.3 -->
## Policy-based tag enforcement

No single control does the whole job; combine them.

| Control | Prevents | Does not |
| --- | --- | --- |
| Tag policies (AWS Organizations) | With `enforced_for`, noncompliant tagging operations (wrong key case or value) on listed resource types | Block creating a resource without the tag; untagged resources are not evaluated |
| Tag policies with `report_required_tag_for` plus IaC enforcement (CloudFormation hook, Terraform or Pulumi integration) | Deployments missing required tags, in fail mode (warn mode only alerts) | Stop console or CLI creation outside the pipeline |
| SCP with `aws:RequestTag` and a `Null` condition | API calls that create resources without the tag; with `aws:TagKeys`, removal of the tag | Apply to the management account; work for services or actions that do not support tag-on-create |
| AWS Config `required-tags` managed rule (up to six keys), deployed by a conformance pack and aggregated | Nothing: detects noncompliant resources, then remediates through Systems Manager Automation | Block the creation |

Tag policy that fixes the spelling and values of `CostCenter` and enforces them on EC2 and RDS:

```json
{
  "tags": {
    "costcenter": {
      "tag_key": { "@@assign": "CostCenter" },
      "tag_value": { "@@assign": ["4410", "5120", "6*"] },
      "enforced_for": { "@@assign": ["ec2:instance", "rds:db"] }
    }
  }
}
```

SCP that refuses instance launches without a `CostCenter` tag and protects the tag from deletion except by a tagging role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireCostCenterOnLaunch",
      "Effect": "Deny",
      "Action": "ec2:RunInstances",
      "Resource": "arn:aws:ec2:*:*:instance/*",
      "Condition": { "Null": { "aws:RequestTag/CostCenter": "true" } }
    },
    {
      "Sid": "ProtectCostCenterTag",
      "Effect": "Deny",
      "Action": "ec2:DeleteTags",
      "Resource": "*",
      "Condition": {
        "ForAnyValue:StringEquals": { "aws:TagKeys": ["CostCenter"] },
        "ArnNotLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/TaggingAdmin" }
      }
    }
  ]
}
```

Tag policies need an organization with all features enabled, and they are attached from the management account. Compliance is reviewed with AWS Resource Groups (organization-wide from the management account), and noncompliant tags are fixed with Tag Editor or the Resource Groups Tagging API. Test a policy on one account before enforcing it on an OU.

> **Exam trap.** "Prevent resources from being created without a CostCenter tag" is not answered by a tag policy's `enforced_for` alone; it needs an SCP on `aws:RequestTag` or IaC enforcement of required tags. "Ensure CostCenter values are spelled consistently" is the tag policy.

<!-- section: chargeback-showback | objectives: 3.3.4 -->
## Chargeback and showback

**Showback** reports to each team what it consumed; **chargeback** moves that amount into the team's budget. Both need shared costs to be divided fairly.

**Cost categories** map costs to the business structure with rules on dimensions such as account, tag, service, charge type, Region, usage type or another cost category. Regular rules assign fixed values; inherited value rules take the value from a tag or account dimension automatically; a default value catches the rest. Rules are evaluated top-down, apply from the start of the current month and can take up to 24 hours to process. Only the management account (or a standalone account) creates them. A cost category appears as a dimension in Cost Explorer and AWS Budgets, as a column in CUR, and as a monitor type in Cost Anomaly Detection.

**Split charges** divide a shared cost category value (for example the shared networking or security accounts) across target values: proportional to each target's cost, fixed percentages, or even split. Up to 10 split charge rules per cost category. Split results appear only on the cost category details page (with a CSV download), not in CUR or Cost Explorer.

**Split cost allocation data** (enabled in Cost Management preferences, delivered in CUR or CUR 2.0) breaks shared infrastructure into consumer-level costs:

| Shared resource | Split by |
| --- | --- |
| ECS tasks and EKS pods on shared EC2 instances | Amortized instance cost times the share of CPU and memory used; EKS also GPUs, Trainium and Inferentia accelerators; EKS tags such as `aws:eks:namespace` enabled by default |
| NAT gateway, EC2 and VPC peering charges | Account that generated the usage, through a networking flexible cost allocation policy |
| S3 general purpose bucket shared by teams | Prefix (tags `aws:s3:PrefixLevel1` and deeper, activated manually), using an S3 Storage Lens advanced dashboard |

**Amazon Bedrock token costs.**

- **Application inference profiles**: create one per team or application, from a foundation model or a cross-Region profile, attach tags, and have the application call the profile ARN. Activated tags appear in CUR as `resourceTags/` columns.
- **IAM principal cost allocation**: CUR 2.0 records the caller ARN of each Bedrock call in `line_item_iam_principal` when the export includes caller identity data; tags on IAM users and roles appear as `iamPrincipal/` tags after activation and can be grouped in Cost Explorer. Expect larger CUR files.
- **Usage types** encode Region, model, token type (input, output, cache read, cache write), tier and cross-Region routing; sum all four token types to match the bill.
- **CloudWatch metrics** `InputTokenCount` and `OutputTokenCount` (namespace `AWS/Bedrock`) give near-real-time token usage per model for dashboards and alarms; model invocation logs give per-request detail, which CUR does not.

```bash
aws bedrock create-inference-profile --inference-profile-name claims-assistant \
  --model-source copyFrom=arn:aws:bedrock:eu-west-1::foundation-model/amazon.nova-lite-v1:0 \
  --tags key=CostCenter,value=4410 key=Project,value=claims-assistant
```

**AWS Billing Conductor** produces pro forma bills per billing group with custom pricing rules, for organizations that resell or recharge AWS at their own rates without changing the real AWS invoice.

> **Exam tip.** "Each business unit must see its share of the shared Kubernetes cluster" is split cost allocation data for EKS. "Divide the central security account's cost across business units by their spend" is a split charge rule (proportional) in a cost category.

<!-- section: budgets-anomalies | objectives: 3.3.5 -->
## Budgets, thresholds and anomaly detection

**AWS Budgets** tracks six types: cost, usage, RI utilization, RI coverage, Savings Plans utilization and Savings Plans coverage. Alerts fire on actual or forecasted values (cost and usage above the threshold, utilization or coverage below it) to email and SNS, and from SNS to chat channels. Budgets can filter on accounts, services, activated tags and cost categories, and measure unblended, net unblended, amortized or net amortized cost. Data refreshes up to three times a day. **Budget actions** respond automatically: apply an IAM policy or an SCP, or stop EC2 or RDS instances, either automatically or after approval. Member accounts can create their own budgets.

**AWS Cost Anomaly Detection** uses machine learning on net unblended cost, about three times a day (up to 24 hours after usage, because it relies on Cost Explorer data).

| Setting | Options |
| --- | --- |
| Monitor dimension | AWS services, linked account, cost allocation tag, cost category (the last three only in the management account) |
| AWS managed monitor | Tracks all values of the dimension automatically, including new accounts or tag values, up to 5,000 values, one threshold for all |
| Customer managed monitor | Up to 10 selected accounts or values, evaluated together; not available for the AWS services dimension |
| Alert frequency | Individual alerts (SNS topic required), daily summary or weekly summary (email) |
| Threshold | Absolute dollar impact, percentage impact, or both combined with AND or OR |

Root cause analysis ranks contributors by AWS service, account, Region and usage type. A new monitor needs 24 hours, and a new service needs 10 days of history before anomalies are detected for it. Third-party Marketplace charges are not monitored, except third-party foundation models on Amazon Bedrock.

| Requirement | Answer |
| --- | --- |
| Notify the payments team when forecasted monthly spend passes 80 % of $50,000 | Cost budget with a forecasted threshold |
| Stop development instances automatically when the sandbox budget is exceeded | Budget action targeting EC2 instances |
| Detect an unexpected spike in any account, including accounts created next month | AWS managed monitor on the linked account dimension |
| Alert when Savings Plans coverage drops below 70 % | Savings Plans coverage budget |
| Catch a sudden rise in Bedrock spend for one application | Anomaly monitor on the application's cost allocation tag, plus a CloudWatch alarm on token count metrics |

> **Exam trap.** Budgets alert on thresholds you set; they do not discover unknown patterns. Anomaly Detection finds unusual spend without a threshold but takes no action. A stem that needs both detection and automatic containment combines them, or uses a budget action.

<!-- section: key-points -->
## Key points

- Accounts carry every cost; tags split shared accounts. Activate user-defined tags in the management account (up to 24 h to appear, up to 24 h to activate); tags are not retroactive.
- Cost Explorer: 13 months, 18-month forecast, API $0.01 per request. CUR 2.0 or FOCUS through Data Exports to S3, queried with Athena.
- Tag policies standardize keys and values; `enforced_for` blocks noncompliant tagging, not untagged creation. SCPs with `aws:RequestTag` block untagged creation; Config `required-tags` detects and remediates.
- Cost categories map costs to the business; split charges share costs but show only on the cost category page. Split cost allocation data covers ECS, EKS (with accelerators), networking and S3 prefixes.
- Bedrock: application inference profiles with tags, IAM principal allocation in CUR 2.0, token usage types and CloudWatch token metrics.
- Budgets: six types, actual or forecasted, actions on IAM, SCP, EC2, RDS. Anomaly Detection: managed or customer monitors, individual (SNS) or summary (email) alerts, absolute or percentage thresholds.
