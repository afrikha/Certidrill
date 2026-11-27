A project can't use paid services, nor even free ones, until it is linked to an active Cloud Billing account. Billing questions on the Associate Cloud Engineer exam are about mechanics: who may create an account, which two roles link a project, what a budget does and doesn't do, and how to get cost data into BigQuery for analysis.

<!-- section: billing-accounts | objectives: 1.2.1 -->
## Creating billing accounts

A **Cloud Billing account** defines who pays for a set of projects. It is linked to a **Google payments profile** (name, address, payment methods, tax information). A billing account can pay for many projects; a project is linked to **exactly one** billing account at a time.

| Account type | How it pays | How you get it |
| --- | --- | --- |
| Self-serve (online) | Charged automatically to a credit or debit card, or by direct debit where available, either monthly or each time costs reach a billing threshold | Console: **Billing > Manage billing accounts > Create account** |
| Invoiced (offline) | Invoice, usually monthly, paid by check or wire transfer | Apply for monthly invoiced billing; subject to eligibility |
| Subaccount | Resellers represent their customers' charges in subaccounts of a parent account, which pays for them and must be on invoiced billing | Reseller programs |

Console steps for a self-serve account: **Create account**, enter a name (no personal or sensitive data), select the **organization**, choose the **country**, then select or create a payments profile and **Submit and enable billing**. New customers get USD 300 of free-trial credits.

| Decision | Can you change it later? |
| --- | --- |
| Country and currency | No: choose carefully; a different country means a new billing account |
| Payments profile type (individual or business) | No: the setting is permanent; choose **business** for a company with several users |
| Name | Yes |
| Projects linked | Yes, any time (with the right roles) |

There is no `gcloud` command to create a billing account: creation is done in the console. `gcloud billing accounts` lists, describes and manages access to existing accounts.

**Why several billing accounts?** One per legal entity, per currency or country, per business unit that pays separately, or to separate a reseller's customers. Otherwise one account with labels, projects and folders for cost allocation is simpler.

**Billing roles** (granted on the organization or on the billing account, except Project Billing Manager):

| Role | ID | Can do |
| --- | --- | --- |
| Billing Account Creator | `roles/billing.creator` | Create self-serve billing accounts; organization level only. Granted to the whole domain when the organization is created: restrict it |
| Billing Account Administrator | `roles/billing.admin` | Everything on the account except creating one: payment methods, exports, budgets, links, access of other users |
| Billing Account User | `roles/billing.user` | Link projects to the account; very limited, can be granted broadly |
| Billing Account Viewer | `roles/billing.viewer` | Read costs, prices and transactions; typical for finance |
| Billing Account Costs Manager | `roles/billing.costsManager` | Manage budgets, view and export cost data (not pricing data); no linking |
| Project Billing Manager | `roles/billing.projectManager` | On an organization, folder or project: link or unlink the project's billing, without access to its resources |
| Project Billing Costs Manager | `roles/billing.projectCostsManager` | On the organization or billing account: Reports, FinOps hub, budgets and anomalies scoped to the projects whose costs the user can view |

```bash
gcloud billing accounts list
gcloud billing accounts describe 01A2B3-C4D5E6-F7G8H9
gcloud billing accounts add-iam-policy-binding 01A2B3-C4D5E6-F7G8H9 \
  --member="group:finance@example.com" --role="roles/billing.viewer"
```

Give each billing account at least two administrators, preferably through a group, so that it never becomes orphaned.

> **Exam trap.** Creating a billing account inside an organization requires **Billing Account Creator** on the organization. Billing Account Administrator on an existing account doesn't allow creating a new one.

<!-- section: link-projects | objectives: 1.2.2 -->
## Linking projects to a billing account

Linking needs permissions on **both sides**:

| Side | Role | Permission |
| --- | --- | --- |
| Billing account | Billing Account User (or Billing Account Administrator) | `billing.resourceAssociations.create` |
| Project | Project Billing Manager, or the project's Owner (`roles/owner`, the legacy basic role that the Cloud Billing pages name) | `resourcemanager.projects.createBillingAssignment` |

```bash
gcloud billing projects link web-prod-1934 --billing-account=01A2B3-C4D5E6-F7G8H9
gcloud billing projects describe web-prod-1934
gcloud billing projects list --billing-account=01A2B3-C4D5E6-F7G8H9
gcloud billing projects unlink web-dev-7720
```

In the console: **Billing > Account management** (or the project's **Billing** page) > **Change billing** (or **Link a billing account**), select the account, **Set account**. Changing the link is a sensitive action and may ask you to sign in again. The full list on the docs, for linking or for **changing** a project's billing account: on the project, Project Billing Manager with Project Browser and Service Usage Viewer (or Owner); on the target account, and when changing also on the current one, Billing Account User with Billing Account Viewer (or Billing Account Administrator).

To prevent accidental changes, **lock** the link (Billing > Account management or My projects > Actions > **Lock billing**): while locked, nobody can change the project's billing account or disable its billing until someone unlocks it. Locking needs the same roles as linking; **unlocking** needs either the project-side roles (Project Billing Manager with Project Browser, or Owner) or Billing Account Administrator. A lock therefore protects against **accidental** changes, not against the people who hold those roles: a project Owner can unlock and then relink. It also doesn't help if the billing account itself is closed or suspended for nonpayment: billing is then disabled on all its projects.

What happens when billing is disabled on a project (unlinked from its account):

- All billable Google Cloud services in the project **stop**; some resources may be deleted and can't be recovered.
- Billing can't be disabled while the project has active or pending committed use discounts.
- If the project is a Shared VPC host, its service projects are affected too.
- Charges incurred before a change of account are billed to the old account; reports can take up to two days to reflect the move.

Common setups:

| Requirement | Action |
| --- | --- |
| Developers may create projects and attach them to the company account | Grant Project Creator on their folder and Billing Account User on the billing account (to a group) |
| A platform team attaches projects but must not see their resources | Project Billing Manager on the folder plus Billing Account User |
| Finance must see all costs but change nothing | Billing Account Viewer |
| A project moves to another business unit that pays separately | Relink it to that unit's billing account (Billing Account User on the new account, Project Billing Manager or Owner on the project) |

> **Exam trap.** A user who is Owner of a project still can't link it to a billing account without Billing Account User (or Administrator) on that account, and a Billing Account Administrator can't link a project on which they have no project-side permission.

<!-- section: budgets-alerts | objectives: 1.2.3 -->
## Establishing budgets and alerts

A **budget** tracks actual and forecasted spend against an amount and sends notifications at thresholds. An ordinary budget **never stops spending**.

| Setting | Options |
| --- | --- |
| Scope | Whole billing account, or filtered by projects, folders and organizations, services, subaccounts, one label; include or exclude credits and discounts |
| Amount | **Specified amount**, or **last period's spend** (monthly, quarterly or yearly only) |
| Time range | Monthly, quarterly, yearly or custom |
| Threshold rules | Percentages of the amount, on **actual** or **forecasted** spend (forecast not available for custom ranges); default 50 %, 90 % and 100 % of actual spend |
| Recipients | By default Billing Account Administrators and Billing Account Users (for single-project budgets, optionally the project's owners), which `--disable-default-iam-recipients` turns off; up to 5 Cloud Monitoring notification channels; a **Pub/Sub topic** for programmatic notifications |

```bash
gcloud billing budgets create --billing-account=01A2B3-C4D5E6-F7G8H9 \
  --display-name="web-prod monthly" --budget-amount=5000EUR \
  --calendar-period=month --filter-projects=projects/web-prod-1934 \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0,basis=forecasted-spend \
  --notifications-rule-pubsub-topic=projects/finops-prj/topics/budget-alerts
```

- Creating budgets on a billing account requires **Billing Account Administrator** or **Billing Account Costs Manager**. Up to 50,000 budgets per billing account.
- Alerts aren't instant: cost data takes time to arrive, and the first notification can take several hours after creating a budget. Pub/Sub messages are sent several times a day; emails only when a threshold is crossed.
- To **react automatically**, subscribe a Cloud Run function to the budget's Pub/Sub topic. It can, for example, unlink billing from a sandbox project at 100 %, which stops all its services and may delete resources: use it only where that is acceptable.

**Spend cap budgets** (generally available since October 13, 2026) are a different budget type that **pauses** new usage of one service in one project when estimated gross spend exceeds the target:

| | Alerts-only budget | Spend cap budget |
| --- | --- | --- |
| Effect | Notifications only | Pauses new usage of the selected service for the rest of the month; in-flight requests complete |
| Scope | Flexible (see above) | One project and one eligible service: Gemini API, Gemini Enterprise Agent Platform, Cloud Run, Cloud Run functions |
| Period | Any | Monthly only |
| Notifications | Configurable | Automatic, at 50 %, 80 % and 100 %, not customizable |
| Persistent resources | Unaffected | Keep running and billing (compute, storage); nothing is deleted |

A cap lifts automatically at the start of the next month or manually from the budget's edit page; after a manual lift, services can take up to an hour to return to normal. While a cap is enforced, the budget can't be edited or deleted: lift the cap first. Only one spend cap budget can exist per scope, and moving the project to another billing account deletes its spend cap budgets (re-create them on the new account). Notifications go to the billing account administrators and the project owners. An alerts-only budget can't be converted: create a new spend cap budget. Enforcement isn't instant, and overages are billed normally.

> **Exam trap.** "Make sure the project never spends more than X" with a regular budget is a trap: budgets alert. The options that actually limit spend are a spend cap budget (eligible services only), programmatic notifications that disable billing, or lowering quotas.

<!-- section: billing-exports | objectives: 1.2.4 -->
## Setting up billing exports

**Cloud Billing export to BigQuery** writes detailed billing data automatically throughout the day into a dataset you own, for SQL analysis, dashboards (Looker Studio) and chargeback.

| Export | Content | Table |
| --- | --- | --- |
| Standard usage cost | Account, invoice month, service, SKU, project, labels, cost, usage, credits | `gcp_billing_export_v1_BILLING_ACCOUNT_ID` |
| Detailed usage cost | Standard data plus resource-level cost (for example per VM) | `gcp_billing_export_resource_v1_BILLING_ACCOUNT_ID` |
| Pricing | The account's prices for SKUs | `cloud_pricing_export` |
| FOCUS usage cost | Data in the FinOps FOCUS format (Preview) | Linked dataset |

Setup steps:

1. Choose or create a project for the data, ideally a dedicated FinOps project, **linked to the same billing account**.
2. For the pricing export, enable the **BigQuery Data Transfer Service API** in that project.
3. Create a BigQuery dataset; Google recommends a **multi-region** location (`US` or `EU`). The location can't be changed later. Keep table expiration disabled.
4. In the console: **Billing > Billing export > BigQuery export**, edit each export type, choose the project and dataset, **Save**. The export is configured in the console, not with `gcloud`.

```bash
bq --location=EU mk --dataset finops-prj:billing_export
```

Permissions: **Billing Account Administrator** or **Billing Account Costs Manager** on the billing account plus **BigQuery User** on the project for standard and detailed exports; Billing Account Administrator plus **BigQuery Admin** for the pricing export.

| Behavior | Rule |
| --- | --- |
| Backfill, multi-region dataset | Usage cost data from the start of the previous month is added; the initial backfill can take up to five days |
| Backfill, regional dataset | None: data starts when export is enabled |
| Pricing data | Never backfilled; can take up to 48 hours to appear |
| Re-enabling or changing the dataset | No backfill of earlier data into the new dataset |
| Destinations | One dataset per export type per billing account |
| Cost | You pay BigQuery charges: storage of the exported data and compute for queries |

```bash
bq query --use_legacy_sql=false '
SELECT project.id AS project_id, service.description AS service,
       ROUND(SUM(cost), 2) AS cost
FROM `finops-prj.billing_export.gcp_billing_export_v1_01A2B3_C4D5E6_F7G8H9`
WHERE invoice.month = "202611"
GROUP BY project_id, service
ORDER BY cost DESC'
```

> **Exam tip.** Export is not retroactive beyond what the backfill rules allow: enable it **as early as possible**, on the day the billing account is created. "Analyze costs per label or per resource over the last year" is only possible if the export was enabled a year ago; the Reports page in the console covers ad hoc views without an export.

<!-- section: key-points -->
## Key points

- A project has one billing account at a time; without one, even free services stop.
- Create billing accounts in the console with Billing Account Creator on the organization; country, currency and profile type are permanent.
- Linking = Billing Account User on the account + Project Billing Manager (or Owner) on the project.
- Budgets notify (actual or forecasted, default 50/90/100 %) and never stop spend; Pub/Sub notifications enable automation.
- Spend cap budgets (GA October 2026) pause one eligible service in one project, monthly only.
- BigQuery export: standard, detailed (resource-level) and pricing; multi-region dataset for backfill; enable early.
