# QZ-dp-300-21-authentication-authorization — notes

`content/dp-300/quizzes/21-authentication-authorization.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.1 (q1), 2.1.2 (q3), 2.1.3 (q2), 2.1.4 (q5, q6), 2.1.5 (q4), 2.1.6 (q8), 2.1.7 (q7, q10), 2.1.8 (q9). Positions 6–10: yesno, multi ×2, dropdown, single.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Who can create Microsoft Entra logins (Azure SQL Database).** The chapter says the Microsoft Entra admin or `loginmanager` / `##MS_LoginManager##`. The page "Microsoft Entra server principals" contradicts itself. Its Permissions section says "Microsoft Entra admin permission or membership in the `loginmanager` server role", and it calls loginmanager a *server* role. Its CREATE LOGIN section says "Only the Microsoft Entra admin can execute this command in the virtual master database". The server roles page says `##MS_LoginManager##` has CREATE LOGIN and ALTER ANY LOGIN, but it doesn't mention Microsoft Entra logins. No question depends on this point. I dropped a draft question about it.
- **Server roles and Microsoft Entra groups.** The Entra server principals page says "Azure SQL Database server roles aren't supported for Microsoft Entra groups". The chapter doesn't say this, and it's a classic trap.
- **Server role membership.** The server roles page also says "Each member of a fixed server role can add other logins to that same role." The chapter says that only the server admin and the Microsoft Entra admin can add logins to server roles. That needs the nuance. q2 is built so that none of its distractors is a member of the target role.
- **ALTER LOGIN ... DISABLE.** For the change to take effect at once, the authentication cache and TokenAndPermUserStore must be flushed (`DBCC FLUSHAUTHCACHE`, `DBCC FREESYSTEMCACHE('TokenAndPermUserStore')`). The chapter only mentions caching for permission changes. q6 s1 states the cache condition.
- **`##MS_...##` roles on Managed Instance.** The page "Server-level roles" says that the SQL Server 2022 `##MS_...##` roles are supported on Azure SQL Database **and Azure SQL Managed Instance**. The chapter's "Server roles by offering" table lists them for Azure SQL Database only. On MI, `##MS_DatabaseManager##` and `##MS_ServerStateReader##` would be valid alternatives, so q9 restricts the role slot to classic fixed server roles and asks for one fixed role plus one server permission.
- **dbcreator** "can create, alter, drop, and restore any database" (Server-level roles). It isn't limited to the databases the member creates. The chapter's wording and q9 don't claim otherwise, but a "no access to existing databases" requirement would make dbcreator over-privileged. `GRANT CREATE ANY DATABASE` would be the least privilege.
- **Microsoft Entra-only authentication on MI.** The chapter says it also disables Windows authentication on a managed instance. The Entra-only page doesn't mention Windows authentication.

## Not verified on a fetched page

- q7: the error that SQL logins receive when Microsoft Entra-only authentication is enabled. The Entra-only page doesn't give the error number. 18456 "Login failed" is the expected authentication failure, and the chapter's troubleshooting table lists this cause.
- q1: that Microsoft Entra Password can't satisfy an MFA requirement (it's non-interactive). The fetched overview only describes the methods.
- q4: no current Learn page for the SSMS **Database Properties > Permissions** page could be fetched (the URL failed). The reference is "Permissions or Securables Page", which describes the Grant, With Grant and Deny grid without naming the database properties dialog.
- q10: objects in a schema are owned by the schema owner unless an owner is set explicitly. This is standard behaviour, but the fetched pages ("Authorization and Permissions in SQL Server" and the DP-300 training unit) only state the same-owner and different-owner rule.
- q3 s3: that SQL logins created WITH PASSWORD are supported on MI. This is standard, but the fetched extract of the T-SQL differences page only listed the FROM CERTIFICATE, ASYMMETRIC KEY and SID variants.

## Design notes

- I avoided the decisions of the mock questions on 2.1.x. The new decisions are: the SSMS auth option for MFA on a non-joined laptop, who can add to a server role, VM and MI auth facts (no SQL-only mode, no FROM WINDOWS on MI), the database Permissions page in SSMS, ALTER ANY USER for a non-admin Entra user, the scope of ALTER LOGIN DISABLE (group logins, contained users), 18456 causes vs 40615 and 229, db_accessadmin plus db_securityadmin, an MI login with dbcreator and VIEW SERVER STATE, and a broken ownership chain (different schema owners).
