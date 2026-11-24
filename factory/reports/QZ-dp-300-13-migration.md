# QZ-dp-300-13-migration — notes

`content/dp-300/quizzes/13-migration.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q2), 1.3.2 (q1), 1.3.3 (q4, q8), 1.3.4 (q7), 1.3.5 (q6), 1.3.6 (q3, q9), 1.3.7 (q5), 1.3.8 (q10). Positions 6–10: single ×2, dropdown, ordering, multi.

## Chapter vs current Learn (fix in the chapter, not done here)

- **SQL Server on Azure VMs target, existing availability group.** The chapter (section migrate-to-azure) says to add the virtual machine "as a replica of an existing availability group and failing over". The current migration overview ("Migration overview: SQL Server to SQL Server on Azure VMs") lists a **distributed availability group** for this case: "This method minimizes downtime. Use when you have an availability group configured on-premises." Adding an Azure replica isn't named as an option. q6 uses the distributed availability group as the answer. The same overview doesn't cover Database Migration Service online or offline for VM targets. The chapter's table and section 1.3.5 say that DMS supports both, so that claim should be rechecked.
- **Managed Instance link prerequisites.** The chapter lists network connectivity, a database mirroring endpoint and certificate trust. The current preparation page ("Prepare your environment for a link") also requires the **Always On availability groups feature** (disabled by default, so a restart is needed), **multiple-database link mode**, a **database master key** in master, the **full recovery model**, **at least one full backup**, and ports **5022 and 11000-11999**. It recommends trace flags -T1800 and -T9567. None of these is in the chapter. q4 tests ports and full recovery with a full backup.
- **Restore from Managed Instance to SQL Server.** The page "Restore a database to SQL Server from Azure SQL Managed Instance" adds two points that the chapter's 1.3.6 table leaves out. (1) A database encrypted with a **service-managed TDE key**, which is the default, can't be restored to SQL Server. Only customer-managed keys work, through the SQL Server Connector for Azure Key Vault. (2) The restore needs `WITH MOVE` with explicit file paths. The update policy page confirms that policy changes are one-way.
- **MI migration overview.** The page doesn't present Azure Database Migration Service as a general migration method. It mentions DMS offline only to migrate logins and SQL Agent jobs, and says to "Move SQL logins ... by using Database Migration Service in offline mode". The chapter's section 1.3.4 says that DMS offline to SQL Database doesn't migrate logins. That's another target, but the two statements are worth reconciling. The Q-dp-300-1b report already noted it.
- **Copy/move.** The Learn page also says that "The source or destination instance shouldn't be configured with a failover group (geo-disaster recovery) setup". The chapter limits this to the database. The page doesn't say whether the service tiers may differ, so q10 doesn't test it.
- **BACPAC.** The quickstart now says the Import/Export service doesn't support Microsoft Entra authentication when MFA is required. The chapter doesn't mention this. q7 uses it in the explanation.

## Not verified on a fetched page

- q7: the `/op` (OutputPath) switch of SqlPackage and the actions Extract (DACPAC, schema only), Script and DeployReport, which are distractors. The Export page I fetched doesn't list them. They're standard SqlPackage actions and parameters.
- q5: the distractor explanations about `sys.dm_operation_status`, `sys.dm_exec_requests` and `msdb.dbo.restorehistory` are general knowledge.
- q6: "synchronous commit at failover time, no data loss" for a distributed availability group is standard availability group behaviour. The overview page only says the method minimizes downtime.
- q3: the page doesn't document `az sql db import`. The distractor relies on that command targeting logical servers.

## Design notes

- I avoided the decisions of the 41 mock questions on 1.3.x. The new decisions are: when an online migration is down, MI for instance features without OS management, the BACPAC import tool for MI, link prerequisites, the seeding DMV, a distributed AG for a VM target, SqlPackage Export/Import switches (vs Extract/Publish), transactional replication setup order, MI to SQL Server 2022 under the 2025 update policy (BACPAC), and copy/move blockers (failover group, CMK key access, with "newer destination policy" and "queued operations" as traps).
- No preview feature is an answer. The Arc migration to SQL Database, which is in preview, isn't used.
