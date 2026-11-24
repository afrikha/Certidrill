# QZ-dp-300-51-hadr-strategy — report

File: `content/dp-300/quizzes/51-hadr-strategy.yaml` (10 questions). `npx tsx factory/check-quiz.ts dp-300 51-hadr-strategy` → 0 problem(s), 0 warning(s).

Objectives: 5.1.1 (q1, q8), 5.1.2 (q4, q6), 5.1.3 (q3, q7, q10), 5.1.4 (q2, q5, q9). Formats 6–10: single, dragdrop, hotarea, ordering, single.

The bank's 33 questions on 5.1.x were read first. The quiz tests decisions they don't cover:
- Invoke-AzSqlInstanceFailover (MI)
- Hyperscale HA replica count for zone redundancy
- a single hybrid cluster vs a distributed AG
- backup testing with restore + DBCC CHECKDB vs VERIFYONLY
- SQL Server 2016 SP3 + Azure Connect pack
- FCI / ASR / async AG / PITR on VMs
- connection strings after a regional failover
- MI failover-group drill (logins/jobs not replicated)
- standby replica vs readable secondary when reports run on the secondary

## Chapter vs current Learn (Nov 2026)

- **Hyperscale zone redundancy:** Learn says zone redundancy can only be set when the database is created. It also requires zone-redundant or geo-zone-redundant backup storage, besides at least one HA replica. The chapter has only the HA-replica rule. Worth adding. q3 mentions both points in its explanation, but they don't decide the answer.
- **Standby replica limits (SQL Database):** Learn lists these restrictions, and the chapter has none of them:
  - supported only for single databases with provisioned compute, General Purpose or Business Critical, on Standard-series or DC-series hardware;
  - not supported for Hyperscale, serverless, DTU or elastic pools;
  - only one standby per primary;
  - in failover groups, it can be set only in the portal.

  They are exam-relevant and could be added.
- **SQL MI license-free DR replica:** the portal setting is **Failover rights**. It is set on the *secondary* instance; "Hybrid failover rights" is what you see on the primary. The chapter doesn't name it.
- **Managed Instance link:** these points from Learn are missing from the chapter:
  - multiple-database mode (SQL Server 2022 CU28 / 2025 CU11, Enterprise or Developer);
  - TDE needs BYOK on the MI before the link is created;
  - service-managed-key databases can't be linked from MI to SQL Server.

  The chapter's version table and update-policy rules match Learn. The SQL Server 2025 update policy is now the default for portal deployments.
- **FCI page:** Learn's FCI overview describes instance-level protection. It doesn't list logins, jobs or linked servers explicitly; q7 (t1) relies on the instance-level definition.

## Facts not fully verified

- The cmdlet names used as distractors (`Invoke-AzSqlElasticPoolFailover`, `Invoke-AzSqlDatabaseFailover`) come from the HA page; I didn't fetch their own reference pages.
- q6 option c: "SQL MI can't be a log shipping secondary". I derived this from the MI T-SQL differences page (RESTORE supports only FROM URL with no WITH options), not from an explicit statement.
- q9: I fetched `Switch-AzSqlDatabaseInstanceFailoverGroup` (parameters refer to the secondary's region). I didn't verify the portal name "planned failover" for MI beyond the MI failover-group overview ("Failover" vs "Forced failover").
