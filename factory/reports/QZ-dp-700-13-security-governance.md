# QZ-dp-700-13-security-governance

File: `content/dp-700/quizzes/13-security-governance.yaml` (10 questions, `dp700-qz-13-01`..`10`). Check: 0 problem(s), 0 warning(s).

Formats: 1–5 single (d1, d1, d2, d2, d2); 6 dragdrop, 7 yesno_statements, 8 single, 9 dropdown, 10 multi (all d3). Objectives: 1.3.1 (q1), 1.3.2 (q10), 1.3.3 (q7, q8), 1.3.4 (q2), 1.3.5 (q3), 1.3.6 (q6), 1.3.7 (q5), 1.3.8 (q4, q9).

## Chapter vs current Learn (not edited)

- **Who manages OneLake security roles.** The chapter says "users with Write and Reshare, in practice Admins and Members". Learn is inconsistent: *OneLake security roles: create and manage* says "Write **or** Reshare", while *Data security overview* (get-started-security) has a table "Can edit OneLake security?": Admin Yes, Member Yes, Contributor No, Viewer No. q4 follows the table (Member is the least role). Worth a reviewer check.
- **Monitor and Audit permissions on a warehouse.** *Share your data and manage permissions* says Monitor is given by default to Admin, Member and Contributor and **can't be granted on its own**; Audit is given only to Admin and can't be granted on its own. *SQL audit logs in Fabric Data Warehouse* says Admins can grant Audit per item through the Share dialog or Manage permissions. The chapter's sentence is not wrong, but it doesn't say Monitor can't be granted alone (Viewer has no Monitor). Learn contradicts itself on Audit; not tested.
- **RLS policies per table.** The chapter says "One security policy can carry predicates for several tables". The Fabric RLS page's limitations say "Each table needs its own policy" and that a second predicate for the same operation on a table errors. To check against Learn; not tested.
- **OneLake security status.** *Lakehouse sharing and permission management* still says "OneLake security is in preview"; the Fabric blog announced GA in 2026 and the OneLake security pages carry no preview banner. Chapter treats it as GA (consistent with the blog).
- Not in the chapter, possibly useful: in the SQL analytics endpoint, CLS across OneLake roles intersects column allow lists (Spark takes the union); ReadWrite roles can't carry RLS/CLS; virtual membership (Advanced configuration) in OneLake roles; SQL audit `.XEL` files readable by Admin/Member/Contributor and Viewers with ReadAll, and deleted with the warehouse.

## Doubts / unverified

- q3: assumes a Fabric (Free) user in an F64 workspace can create lakehouses but can't label (Learn: label requires Power BI Pro or PPU + edit permission). Free-license behaviour itself not stated on the label page.
- q5: retention policy for Fabric records: the Purview record type name (PowerBIAudit) wasn't verified, so the option doesn't name it. Licensing: E5 needed on the user who generates the record (Manage audit log retention policies).
- q9 option c relies on warehouses not being listed among OneLake security items (data-access-control-model lists lakehouse, mirrored databases/catalogs only); the chapter's table implies it without saying so.
