# QZ-gcp-ace-13-billing — report

File: `content/gcp-ace/quizzes/13-billing.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 13-billing` → 0 problem(s), 0 warning(s).

Objectives: 1.2.1 (Q1, Q6), 1.2.2 (Q3, Q8), 1.2.3 (Q2, Q4, Q7, Q10), 1.2.4 (Q5, Q9). Multi: Q7, Q8 (choose two), Q10 (choose three). The 30 mock-exam questions of 1.2.1–1.2.4 were read; the quiz tests other decisions (org-level Billing Account Viewer, who can unlock a locked link, charges around a billing account change, last period's spend amount, spend cap enforcement outcomes, credit treatment and default recipients flags, Reports page vs export backfill, changing the export dataset).

Sources fetched on 2026-11-27 (docs.cloud.google.com): Cloud Billing overview, Cloud Billing access control and permissions, Create a new self-serve Cloud Billing account, Enable, disable, or change billing for a project, Secure the link between a project and its billing account, Create, edit, or delete budgets and budget alerts, Manage spend cap budgets, Set up Cloud Billing data export to BigQuery, Structure of Detailed data export, Analyze billing data and cost trends with Reports, gcloud billing budgets create (flags also checked with local `gcloud billing budgets create --help`, SDK 570.0.0). Compute Engine service ID 6F81-5844-456A checked on a cloud.google.com/skus SKU group page.

## Chapter issues (not edited)

- **Spend cap GA date.** The chapter says "generally available since October 13, 2026". The Manage spend cap budgets page shows no launch stage; the Google Cloud blog announcing GA is dated October 30, 2026. The October 13 date was not verified (release notes not fetched).
- **Spend cap details missing from the chapter**: a spend cap budget can't be edited or deleted while its cap is enforced (lift first); after a manual lift, services may take up to an hour to recover; only one spend cap per scope; moving the project to another billing account deletes its caps; notifications go to billing administrators and project owners. Q7's distractor d relies on the first point (the correct answers b and e are in the chapter).
- **New role not in the chapter's role table**: Project Billing Costs Manager (granted on the organization or billing account; gives Reports, FinOps hub, budgets and anomalies scoped to the projects whose costs the user can view). Not used in the quiz.
- **Change of billing account permissions**: the docs list, on both billing accounts, Billing Account User plus Billing Account Viewer (or Billing Account Administrator), and on the project Project Billing Manager plus Project Browser and Service Usage Viewer (or Owner). The chapter's table shows only Billing Account User / Project Billing Manager for linking; acceptable as a summary for linking, but incomplete for a change between accounts.
- **"Loading is free"** (export cost table): the setup page only says you pay BigQuery storage and query charges; it doesn't state that the export itself is free.
- **`--disable-default-iam-recipients`** (used in Q10) is not in the chapter; the chapter only says who the default recipients are. Consider adding it next to the budget command.
- "Up to 5 Cloud Monitoring notification channels": not stated on the budgets page, but confirmed by the gcloud reference (maximum of 5 channels).

## Doubts

- Q5: the Reports page keeps cost history back to January 2017 (charge period); Billing Account Viewer gives full-account Reports access (permissions listed on the Reports page).
- Q9: both datasets are placed in the US multi-region on purpose, so that one BigQuery query can read both; cross-region dataset copy (BigQuery Data Transfer Service) is Beta and was deliberately not used as an answer.
