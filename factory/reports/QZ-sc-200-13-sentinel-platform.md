# QZ-sc-200-13-sentinel-platform — report

Quiz: `content/sc-200/quizzes/13-sentinel-platform.yaml`, 10 questions (1.2.1 ×3, 1.2.2 ×3, 1.2.3 ×2, 1.2.4 ×2). Check: 0 problem(s), 0 warning(s).

The 40 mock-exam questions of 1.2.x cover almost every decision of the chapter (personas, Playbook Operator, SecurityInsights scope, lake read / KQL job roles, SecurityEvent / DNS / firewall retention, XDR 90 days / 1 year, Usage KQL, workbook roles, required data types, toolbar, coverage levels, similar organizations, unused table, status). The quiz tests the remaining ones: write permission to connect a data source, reactivation of a dismissed recommendation, templates from the Content hub, stopping XDR ingestion (both retentions back to 30 days), resource-context RBAC, workbook data access (JSON only, viewer's permissions, per-workbook scope), "table not used at all" + compliance → Data lake tier, KQL job to promote lake data to an analytics rule, XDR 180 days / 1 year cost arithmetic (Learn's own example: 90 billed analytics storage days, 185 lake days), unified RBAC Data (manage) / notebooks / one-workspace lake read.

## Chapter points to check against current Learn (chapter not edited)

- **Table-level RBAC**: "Manage access to Log Analytics workspaces" now says granular RBAC (Log Analytics Data Reader with conditions) has all the capabilities of table-level read access and is the best practice for new configurations; the per-table permission strings are labeled "legacy". The chapter's "Table-level RBAC" row should mention granular RBAC. The quiz doesn't make table-level RBAC a correct answer.
- **Workbook permissions**: the roles page now says "Create/delete workbooks: Microsoft Sentinel Contributor or a lesser Microsoft Sentinel role AND Workbook Contributor", while its task matrix says Contributor can create/edit workbooks. The chapter says "Workbook Contributor (or Microsoft Sentinel Contributor)". Learn is self-contradictory; the quiz only relies on "Reader can't save" and "Workbook Reader alone shows no data".
- **Analytics retention default**: "Manage data tiers and retention" says in one place 30 days default for Sentinel and XDR, and in its comparison table "90 days for Microsoft Sentinel, 30 days for Defender XDR". Not used.
- **Tables that can't be managed in the Defender portal**: Learn adds that Basic Logs tables can be viewed but only managed from the Log Analytics workspace (change the plan to Analytics to manage them in Defender). Not in the chapter.
- **French terminology**: the chapter's French uses « règles d'analyse », the chapter 14 French and most of the bank use « règles d'analytique ». The quiz uses « règle d'analytique »; to harmonise (glossary has no entry).
- **Data (manage) for table settings**: "Configure table settings" lists Data (manage) (Data operations) or workspace write permissions; for Table insights it says the minimum is Microsoft Sentinel Contributor + Log Analytics Contributor. The chapter only gives the first.

## Doubts

- Question 10: the roles page also lists a unified RBAC Data (manage) role for "Update system tables in the data lake". A candidate could argue it lets Omar write notebook output; with reuse false, Ines (no Azure role) needs that item, so the unique least-privilege mapping stays Ines = Data (manage), Omar = Security Operator, Lena = Log Analytics Reader.
- Question 6, statement 1: "Workbook permissions are based on the permissions the user has for the resources included in the workbooks" (Azure Workbooks overview) — Workbook Reader alone shows no data. Reasonable reading, not stated in those exact words for Sentinel.
- Question 4: whether an XDR table can be moved to the Basic plan at all is not documented; the option is wrong in any case (it keeps ingestion billed).
