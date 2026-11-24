# QZ-dp-800-21-security-compliance — report

Quiz: `content/dp-800/quizzes/21-security-compliance.yaml` (10 questions, check: 0 problem(s), 0 warning(s)).

| # | Objective | Type | Difficulty | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 2.1.1 | single | 1 | TDE for files, log and backups at rest |
| 2 | 2.1.6 | single | 1 | Event Hubs destination for a SIEM stream |
| 3 | 2.1.2 | single | 2 | DDM: WHERE runs on real values (inference) |
| 4 | 2.1.5 | single | 2 | Entra users must be created from a Microsoft Entra session |
| 5 | 2.1.7 | single | 2 | Allowlist of sp_invoke_external_rest_endpoint, API Management for other hosts |
| 6 | 2.1.3 | dropdown | 3 | RLS: IS_MEMBER exemption, SCHEMABINDING = ON (no permission on lookup table), STATE = OFF |
| 7 | 2.1.4 | yesno_statements | 3 | REVOKE removes a DENY; view chain; chain broken by a different schema owner |
| 8 | 2.1.1 | multi | 3 | Least privilege for column-level decryption (VIEW DEFINITION on key, CONTROL on certificate) |
| 9 | 2.1.6 | multi | 3 | Server-level audit + immutable storage + Log Analytics |
| 10 | 2.1.8 | yesno_statements | 3 | DAB: excluded field rejected, no database policy on create, role header required |

## Doubts and unverified facts

- The Learn page "Ownership chains" (`/sql/relational-databases/security/ownership-chains`) and the ADO.NET "Ownership chaining" page returned a client error on every fetch. Q7's broken-chain statement (different owners => permission checked on the table) relies on well-established behavior; the references are the fetched training unit "Describe database and object permissions" (same-owner chain, REVOKE removes GRANT or DENY) and "Ownership and user-schema separation in SQL Server" (objects belong to the schema owner by default).
- Q6: the RLS page has no `IS_MEMBER` example; the `IS_MEMBER (Transact-SQL)` page confirms it checks database roles and Microsoft Entra groups in Azure SQL Database. `STATE = OFF` at creation is from the chapter and the CREATE SECURITY POLICY syntax (the RLS page only says STATE must be ON to enforce).
- Q9: Learn (Auditing for Azure SQL Database) adds conditions the chapter doesn't mention: with immutable blob storage, "Allow protected append writes" must be set to Append blobs or Block and append blobs, the storage retention interval must be shorter than the SQL auditing retention, and an auditing retention of 0 isn't supported. The explanation of Q9 states them.
- Q2: the auditing pages don't say "SIEM"; the Event Hubs-for-SIEM purpose comes from "Diagnostic settings in Azure Monitor" (cited).
- Q10: the DAB Authorization overview documents inheritance only for unconfigured named roles; it doesn't say whether a configured named role (here `order-admin`) also merges the `authenticated` permissions, so no statement depends on it.
- Not verified (not used): granular `UNMASK` availability by version, TDE default in SQL database in Fabric.

## Chapter vs current Learn

- Auditing section: "use immutable blob storage" is correct but incomplete; consider adding the three conditions above (protected append writes, retention interval vs auditing retention, retention 0 unsupported).
- Column-level encryption: the chapter's "VIEW DEFINITION on the symmetric key" matches OPEN SYMMETRIC KEY ("some permission on the key and not denied VIEW DEFINITION") — no change needed.
- No error found in the mock-exam questions read for these objectives.
