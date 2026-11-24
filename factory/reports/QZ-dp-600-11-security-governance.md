# QZ-dp-600-11-security-governance — report

File: `content/dp-600/quizzes/11-security-governance.yaml` (10 questions, `dp600-qz-11-01` to `-10`). `npx tsx factory/check-quiz.ts dp-600 11-security-governance` → 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (q1, q8), 1.1.2 (q4, q7), 1.1.3 (q5, q6, q9, q10), 1.1.4 (q3), 1.1.5 (q2). Hard formats (6–10): single ×3, ordering, multi.

## Chapter out of date or imprecise against current Learn (pages fetched 2026-11-24)

1. **Labels and access.** The chapter's exam trap says a label "doesn't hide data inside Fabric from users who already have access". *Information protection in Fabric* now says labels associated with Microsoft Purview **protection policies** control access to Fabric items in the tenant. The chapter should add that nuance. No quiz answer relies on "labels never restrict access": the distractors only say a label doesn't hide a column or filter rows.
2. **Who creates OneLake security roles.** *Data security overview* says Admin or Member, and its table shows Contributor = No. *OneLake security roles: create and manage* lists "Fabric Write or Reshare permissions (generally included for Admin or Member workspace users)". The chapter says "Write and Reshare". The two Learn pages don't fully agree, so the quiz doesn't test this.
3. **User's identity mode, missing from the chapter.** *OneLake Security for SQL analytics endpoints* says that in User's identity mode, SQL `GRANT`/`REVOKE` on tables isn't allowed (it is ignored) and RLS/CLS come from OneLake roles. *Data security overview* adds that ReadData gives SQL data access "only in Delegated mode". These facts change the chapter's "share with Read, then GRANT" recipe when OneLake security is enforced. Worth adding.
4. **"Each table needs its own policy".** Learn says "Each table must have its own row-level security defined separately". In T-SQL, one security policy can hold predicates for several tables, so the chapter's wording ("its own policy") may mislead. Suggest "its own predicate".
5. **Missing from the chapter (exam-relevant):**
   - RLS and OLS can't be combined across **different** roles; this gives a query-time error. Source: Analysis Services OLS restrictions, linked from the Fabric OLS page.
   - **Write** can be granted explicitly on a semantic model (*Semantic model permissions*).
   - A lakehouse permission named **Execute Apache Spark** (Livy endpoint) is missing from the permission table.
   - Service principals can't be RLS members, so RLS doesn't apply to them (*RLS with Power BI*).

## Mock-exam notes

- `dp600-1a-dls-defaultreader` says DefaultReader's virtual members "can't be removed one by one" and that the fix is to remove ReadAll. *Create and manage OneLake security roles* says to "remove them from the DefaultReader role, or modify or remove the DefaultReader role". These two statements are not contradictory, but they are worded differently. q10 uses "remove ReadAll", which is consistent with the bank.

## Doubts / unverified

- **q7:** Direct Lake on SQL with granular SQL permissions but no ReadAll may fall back to DirectQuery. Mia still sees the data either way: the warehouse sharing page says ReadData or granular permissions are what such a report needs.
- **q9:** the distractor `GRANT UNMASK ON dbo.FactLoans` assumes table-level UNMASK. The Fabric DDM page documents UNMASK "on the column or CONTROL on the database". It is a distractor only.
- **q9:** the assumption that `ALTER FUNCTION` fails while the schema-bound policy exists is quoted from Learn. The distractor "disable with STATE = OFF" was deliberately left out, because its effect isn't documented.
- OneLake security, its CLS/RLS and the SQL endpoint access modes show no preview marker on any fetched page.
