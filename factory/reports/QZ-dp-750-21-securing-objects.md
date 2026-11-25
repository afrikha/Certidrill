# QZ-dp-750-21-securing-objects — report

File: `content/dp-750/quizzes/21-securing-objects.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-750 21-securing-objects` → 0 problem(s), 0 warning(s)).

Objectives: 2.1.1 (Q1, Q7), 2.1.2 (Q4, Q10), 2.1.3 (Q2, Q6), 2.1.4 (Q3, Q8), 2.1.5 (Q5, Q9). Formats 6–10: single, yesno_statements, dragdrop, dropdown, multi.

## Chapter out of date or incomplete against current Learn (Nov 2026)

- **ALL PRIVILEGES**: the privileges reference now says it excludes `EXTERNAL USE SCHEMA`, `EXTERNAL USE LOCATION`, `MANAGE` and `READ METADATA`; the chapter lists only `MANAGE` and `EXTERNAL USE SCHEMA`. `READ METADATA` (inherits from the metastore, needs no usage privileges) is not in the chapter.
- **Deny / ABAC grant policies**: "Unity Catalog permissions model concepts" says denials inherit downward and that ABAC policies can grant or deny privileges (ABAC GRANT policies; DENY policies are Beta). The chapter presents privileges as grant-only.
- **Owner of a parent object** automatically gets `MANAGE` on all new and existing child objects (permissions concepts page); not in the chapter.
- **Unity Catalog secrets**: the "Secret management" page now offers secrets as Unity Catalog securables (`catalog.schema.secret`, per-secret privileges, available in every workspace of the metastore), Azure Databricks-managed or Azure Key Vault-backed (the latter marked **Beta**). The chapter covers workspace secret scopes only. The status of Azure Databricks-managed UC secrets isn't stated on the page. The quiz uses workspace scopes only.
- **Secret scope ACLs need the Premium plan** (workspace secret scopes page: "Granting permissions on a secret scope also requires the Premium plan"); the chapter only says that Manage Principal = Creator needs Premium.
- **Dedicated access mode with filters/masks**: Learn adds that only reads are supported on DBR 15.4–16.2; writes need DBR 16.3+ with supported patterns such as `MERGE INTO`. Missing from the chapter.
- **OAuth secrets**: Learn adds that a secret unused for 90 days is deleted automatically, and that secrets carry scopes fixed at creation. Missing from the chapter.
- **External locations**: Learn says metastore admins *and workspace admins* hold `CREATE EXTERNAL LOCATION` by default; the chapter mentions metastore admins only.

## Doubts / facts not stated verbatim on Learn

- Q1: no Learn page says explicitly that `REVOKE` on a table leaves a schema-level `SELECT` in effect. The answer follows from the inheritance definition (a schema grant applies to all its tables) and from "REVOKE succeeds even if the privilege was never granted" (both quoted from fetched pages).
- Q5: the managed identity page lists the three file-event roles but gives no scope for them; the stem therefore asks for the roles only. Storage Queue Data Message Processor is wrong because it isn't the documented role, not because it was tested.
- Q6: Learn doesn't say what happens to existing access when a vault's permission model is switched; the stem avoids the question by forbidding the change.
- Q9: `managed_identity_id` comes from the CLI example of the managed identity page; `GRANT ... ON METASTORE` and `ON STORAGE CREDENTIAL` come from the `securable_object` grammar (`[ STORAGE | SERVICE ] CREDENTIAL`), with no explicit example on Learn.

## Mock-exam bank

- Several bank questions reference `https://learn.microsoft.com/en-us/azure/databricks/tables/row-and-column-filters`; the page fetched today is `.../data-governance/unity-catalog/filters-and-masks/` (title "Row filters and column masks"). I didn't check whether the old URL redirects.
- `dp750-2a-kv-scope-isolation` (answer: separate key vault and scope) is still right for workspace scopes. Unity Catalog secrets, with access granted per secret, are now another option (Key Vault-backed in Beta).
