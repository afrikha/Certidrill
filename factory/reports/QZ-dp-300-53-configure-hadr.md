# QZ-dp-300-53-configure-hadr — report

File: `content/dp-300/quizzes/53-configure-hadr.yaml` (10 questions, `dp300-qz-53-01` to `-10`). Check: `npx tsx factory/check-quiz.ts dp-300 53-configure-hadr` gives 0 problems and 0 warnings.

## Coverage

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 5.3.2 | 1 | single | Availability group quorum without shared storage: cloud witness |
| 2 | 5.3.4 | 1 | single | Instance-level objects without synchronization: FCI |
| 3 | 5.3.1 | 2 | single | DR-only geo-secondary at the lowest cost: license-free standby replica |
| 4 | 5.3.3 | 2 | single | Read-only listener failover to the primary (`-AllowReadOnlyFailoverToPrimary Enabled`) |
| 5 | 5.3.6 | 2 | single | History of an automatic failover: `AlwaysOn_health` XE session |
| 6 | 5.3.1 | 3 | yesno_statements | Four secondaries maximum, chaining done only programmatically, same service tier for chained replicas |
| 7 | 5.3.7 | 3 | single | Failover refused: "Maximum failures in the specified period" (default 2) |
| 8 | 5.3.5 | 3 | ordering | Unplanned log shipping failover with the primary lost (copy, restore NORECOVERY, RECOVERY, redirect) |
| 9 | 5.3.2 | 3 | multi | Managed Instance link prerequisites on a stand-alone SQL Server 2022 (no WSFC) |
| 10 | 5.3.2 | 3 | dropdown | Multi-subnet listener T-SQL across 3 subnets, port 1433, run on the primary, `MultiSubnetFailover=True` |

I read the 51 mock questions of 5.3.x first. The quiz avoids their decisions: the disk witness for an FCI, the forced CLI failover, the planned log shipping failover with a tail-log backup, the login SIDs, and so on.

## Verified on Learn (Nov. 2026)

I fetched: the active geo-replication overview, the license-free standby replica page, the SQL Database failover groups overview, `Set-AzSqlDatabaseFailoverGroup`, the AlwaysOn_health XE page, the HADR cluster best practices, the FCI overview, Create an FCI with Azure shared disks, the shared disks doc, `az disk` and `az vm disk`, the log shipping failover page, the MI link preparation page, the MI link SSMS page, ALTER AVAILABILITY GROUP, the listener client connectivity page, and the AG on Azure VMs overview.

## Chapter vs current Learn (chapter not edited)

- **Failover groups (SQL Database):** Learn now says a failover group can have **up to four secondary servers**. The chapter (5.3.3) describes only one secondary server.
- **Active geo-replication:** Learn states that a database that is a member of a failover group can't be failed over with the geo-replication failover command; you must use the group's command. The chapter doesn't say this. It is a good exam trap to add.
- **License-free standby:** The chapter mentions it in one line. Learn adds these limits: General Purpose and Business Critical only, vCore provisioned, standard-series or DC-series hardware, not Hyperscale, serverless, DTU or elastic pool, only one standby secondary, no chaining. Light reads such as DMVs, DBCC and backups are still allowed.
- **MI link:** Learn now documents a "multiple-database link mode" (to enable on each replica, SSMS 22.12.1+), links from MI to SQL Server 2025 or 2022 (CU10+, with an update policy), and trace flags 1800, 9567 and 12381. The chapter's 4-step list is simplified. It doesn't say that a WSFC isn't required from SQL Server 2017 (Q9 relies on this; Learn says that only SQL Server 2016 needs the WSFC steps).
- **Relaxed monitoring:** Learn recommends a relaxed "Max failures in specified period" of **6** (default 2). The chapter only says "increase it". Learn also lists the session timeout (10 s to 20 s) and the failure-condition level (3 to 2), which the chapter doesn't mention.
- **Chapter wording, log shipping:** The chapter's sentence "the RPO is the backup plus copy plus restore interval" is imprecise. Data loss depends on the log backups not yet taken or not reachable; the restore interval affects RTO more than RPO. I avoided it in the quiz.

## Doubts

- Q6 s2: chaining "only programmatically" comes from Learn. That it works with Azure PowerShell in particular (`New-AzSqlDatabaseSecondary` on a secondary) is an inference from "programmatically", not an explicit Learn sentence.
- Q9: the SSMS page doesn't say explicitly that the wizard creates the availability group itself. The stem doesn't depend on it, because the wrong option is about a listener, which the link never needs.
- Q7 FR: I kept the Failover Cluster Manager UI names in English ("Maximum failures in the specified period", "Failover" tab), as the rule for portal names says. The chapter FR uses the translated label instead.
