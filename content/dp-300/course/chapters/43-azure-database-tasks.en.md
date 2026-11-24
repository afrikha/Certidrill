Azure SQL Database has no SQL Server Agent, so recurring T-SQL work is run by elastic jobs, and broader operations (scaling, exports, starting and stopping resources) by Azure Automation or other Azure services. Exam questions ask which tool fits a target set, how to authenticate it, how to be told when it fails and how to read its execution history.

<!-- section: elastic-jobs | objectives: 4.3.1 -->
## Elastic jobs

An elastic job runs T-SQL scripts on a schedule or on demand against one or many databases of Azure SQL Database, across logical servers, elastic pools, subscriptions and regions.

| Component | What it is | Rules to remember |
| --- | --- | --- |
| Elastic job agent | The Azure resource that creates, runs and manages jobs | One agent tier: JA100 (default), JA200, JA400 or JA800 = 100, 200, 400 or 800 concurrent target connections |
| Job database | An Azure SQL Database that stores job definitions, state and history | A new, empty database; S1 or higher recommended. Not Hyperscale, not serverless with auto-pause |
| Target group | The set of databases a job step runs against | Members: logical server, elastic pool or single database; include or exclude |
| Job / job step | A job holds ordered steps; each step has a T-SQL command, a target group, a timeout and a retry policy | Optional output of a step's result set to a table |

Servers and elastic pools in a target group are **enumerated at run time**: a database added to the pool or server after the job was created is included in the next run. That dynamic enumeration is the main reason to prefer elastic jobs for SaaS fleets where databases come and go.

> **Exam trap.** If 110 targets start on a JA100 agent, 10 targets wait until others finish: the job doesn't fail. Raise the agent tier to get more concurrent connections.

**Authentication.** One method per agent, for all targets:

| Method | Setup |
| --- | --- |
| Microsoft Entra ID with a user-assigned managed identity (recommended) | Assign one UMI to the agent; create a user for it in every target database (and a login plus user in `master` of servers or pools to enumerate). System-assigned identity isn't supported |
| Database-scoped credentials | Create the credential in the job database; create a matching login and user with the same name and password on each target; pass `@credential_name` to the job steps |

The job definition is written in the job database with the `jobs` stored procedures:

```text
-- Target group: every database of a server except one
EXEC jobs.sp_add_target_group @target_group_name = N'AllTenants';
EXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',
     @target_type = N'SqlServer', @server_name = N'srv-tenants.database.windows.net';
EXEC jobs.sp_add_target_group_member @target_group_name = N'AllTenants',
     @membership_type = N'Exclude', @target_type = N'SqlDatabase',
     @server_name = N'srv-tenants.database.windows.net', @database_name = N'TenantCatalog';

-- Job, step and schedule (all times are UTC)
EXEC jobs.sp_add_job @job_name = N'RebuildStats', @description = N'Nightly statistics update';
EXEC jobs.sp_add_jobstep @job_name = N'RebuildStats',
     @command = N'EXEC sp_updatestats;', @target_group_name = N'AllTenants',
     @retry_attempts = 3, @step_timeout_seconds = 3600;
EXEC jobs.sp_update_job @job_name = N'RebuildStats', @enabled = 1,
     @schedule_interval_type = N'Days', @schedule_interval_count = 1,
     @schedule_start_time = N'2026-12-01 02:00:00';

-- Run now
EXEC jobs.sp_start_job @job_name = N'RebuildStats';
```

Useful defaults: a new job is **disabled** (`@enabled = 0`) and runs `Once` unless you set `@schedule_interval_type` (`Once`, `Minutes`, `Hours`, `Days`, `Weeks`, `Months`). A step retries 10 times by default with exponential backoff (1 second initial interval, multiplier 2.0, at most 120 seconds) and times out after 43,200 seconds (12 hours).

The same objects can be managed from the portal (Elastic Job agents > Create), PowerShell or the REST API:

```powershell
$agent = $jobDatabase | New-AzSqlElasticJobAgent -Name "agent-ops"
$group = $agent | New-AzSqlElasticJobTargetGroup -Name "AllTenants"
$group | Add-AzSqlElasticJobTarget -ServerName "srv-tenants"
$job = $agent | New-AzSqlElasticJob -Name "RebuildStats"
$job | Add-AzSqlElasticJobStep -Name "step1" -TargetGroupName "AllTenants" -CommandText "EXEC sp_updatestats;"
$job | Set-AzSqlElasticJob -IntervalType Day -IntervalCount 1 -StartTime (Get-Date).AddDays(1) -Enable
```

> **Exam tip.** Scripts must be **idempotent** (`IF NOT EXISTS ... CREATE`): a retry or a rerun on a target where the step half-succeeded must not fail or duplicate work.

<!-- section: automation-options | objectives: 4.3.2 -->
## Choosing an automation tool

| Requirement | Tool |
| --- | --- |
| Run T-SQL on many Azure SQL databases, including databases added later | Elastic jobs |
| Run T-SQL, SSIS, PowerShell or OS command steps inside one SQL managed instance | SQL Server Agent (always running on SQL Managed Instance) |
| Scheduled jobs on SQL Server on Azure Virtual Machines | SQL Server Agent on the VM |
| Control-plane tasks: scale a database, export a BACPAC, rotate a setting, start or stop resources | Azure Automation runbook (PowerShell with the Az modules) |
| Event-driven or low-code workflow that calls SQL and other services | Azure Logic Apps or Azure Functions |
| Orchestrate T-SQL tasks for SQL database in Microsoft Fabric (no SQL Server Agent, no elastic jobs) | Scheduled Data Factory pipelines or Apache Airflow jobs |

> **Exam trap.** SQL Server Agent doesn't exist in Azure SQL Database, and multiserver administration (MSX/TSX) isn't available on SQL Managed Instance. "Run the same script on all databases of three logical servers" = elastic jobs.

**Azure Automation** runs runbooks on a schedule, from a webhook or from an alert. A runbook can call Az PowerShell cmdlets for management operations, and can also connect to the database to issue T-SQL. Authenticate with the Automation account's **managed identity** (Run As accounts are retired): grant it an Azure role for control-plane work, and a database user created `FROM EXTERNAL PROVIDER` for data-plane work.

```powershell
# Runbook: scale a database to a larger service objective
Connect-AzAccount -Identity
Set-AzSqlDatabase -ResourceGroupName "rg-data" -ServerName "srv-sales" `
  -DatabaseName "SalesDb" -RequestedServiceObjectiveName "S3"
```

Least privilege for that runbook: SQL DB Contributor on the database or server rather than Contributor on the resource group.

<!-- section: alerts-notifications | objectives: 4.3.3 -->
## Alerts and notifications

Each tool exposes its failures differently:

| Tool | Signal | How to be notified |
| --- | --- | --- |
| Elastic jobs | Agent metrics: Elastic Jobs Executions Failed / Successful / Timed Out | Metric alert rule on the job agent (threshold above 0) with an action group |
| Azure Automation | Metric **Total Jobs** with dimensions Runbook Name and Status | Metric alert where Status = Failed, with an action group |
| Azure Automation (history and correlation) | Job Logs and Job Streams sent by a diagnostic setting to Log Analytics (`AzureDiagnostics` table) | Log search alert on a KQL query |
| SQL Server Agent on SQL Managed Instance | Job outcome | Database Mail plus an operator; job notification on failure |

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.AUTOMATION" and Category == "JobLogs"
| where ResultType in ("Failed", "Stopped", "Suspended")
| project TimeGenerated, RunbookName_s, ResultType, JobId_g
```

On SQL Managed Instance, SQL Server Agent sends e-mail only through a Database Mail profile named exactly `AzureManagedInstance_dbmail_profile`:

```text
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'Database Mail XPs', 1; RECONFIGURE;
-- create the Database Mail account and the profile AzureManagedInstance_dbmail_profile, then:
EXEC msdb.dbo.sp_add_operator @name = N'DbaTeam', @enabled = 1,
     @email_address = N'dba-team@contoso.com';
EXEC msdb.dbo.sp_update_job @job_name = N'NightlyLoad',
     @notify_level_email = 2,            -- 1 = on success, 2 = on failure, 3 = on completion
     @notify_email_operator_name = N'DbaTeam';
```

> **Exam trap.** SQL Server Agent **alerts**, pager and net send notifications aren't supported on SQL Managed Instance: only e-mail notifications to operators. For a metric threshold, use an Azure Monitor alert.

Use a distribution list as the operator or in the action group, so notifications survive staff changes.

<!-- section: troubleshoot-tasks | objectives: 4.3.4 -->
## Troubleshooting automated tasks

Elastic job history lives in the job database, in `jobs.job_executions`: one parent row per job execution (`step_id IS NULL`) and child rows per step and target, with `lifecycle`, `current_attempts`, `last_message` and the target names. History older than 45 days is purged automatically; `jobs.sp_purge_jobhistory` purges it on demand.

```text
SELECT job_name, step_id, target_server_name, target_database_name,
       lifecycle, current_attempts, last_message
FROM jobs.job_executions
WHERE is_active = 0 AND lifecycle IN (N'Failed', N'TimedOut')
ORDER BY start_time DESC;
```

| `lifecycle` | Meaning |
| --- | --- |
| WaitingForRetry | The step failed on a target and waits for its next attempt |
| Failed | The step failed and exhausted its retries |
| TimedOut | The step exceeded `step_timeout_seconds` |
| Skipped | Another execution of the same step was still running on that target |
| SucceededWithSkipped | The job succeeded but some child executions were skipped |

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Login failed on some targets | No user for the UMI or credential in those databases | Create the user (`CREATE USER [umi-jobs] FROM EXTERNAL PROVIDER`) and grant the needed permissions |
| Server or pool target runs on no database | The agent can't enumerate databases | Create the login and user in `master` of that server (or set the refresh credential) |
| Connections refused | Firewall blocks the agent | Allow Azure services on the target server, or create and **approve** service-managed private endpoints |
| Executions Skipped | The schedule is shorter than the step's run time | Lengthen the interval or speed up the script |
| A job runs immediately when enabled | Schedule start time in the past: missed events run at once | Set the start time in the future (UTC) |
| Jobs stop after a regional failover | The agent stays in the old region | Re-create and start the agent in the new region |

For Azure Automation, open the job and read its streams (Output, Warning, Error, Verbose) or query `AzureDiagnostics`. Typical failures: the managed identity lacks the Azure role or the database user, the Az module call targets the wrong subscription, or the server firewall rejects the runbook (it can run from a range of IP addresses of the region's datacenters). For SQL Server Agent on SQL Managed Instance, read the job history in SSMS or `msdb.dbo.sysjobhistory`; history is fixed at 1,000 rows in total and 100 per job.

<!-- section: key-points -->
## Key points

- Elastic jobs = scheduled T-SQL across many Azure SQL databases, with targets enumerated at run time; SQL Server Agent covers SQL Managed Instance and SQL Server on VMs.
- Job agent tiers JA100 to JA800 set concurrent target connections; the job database is an empty S1 or higher database, not Hyperscale nor auto-pausing serverless.
- Prefer a user-assigned managed identity; one authentication method per agent; users in every target, and in `master` for server or pool targets.
- New jobs are disabled; schedules are in UTC; steps retry 10 times and time out after 12 hours by default; scripts must be idempotent.
- Alert on job agent metrics or on the Automation Total Jobs metric with Status = Failed; SQL Managed Instance e-mails only through `AzureManagedInstance_dbmail_profile`.
- Troubleshoot elastic jobs with `jobs.job_executions` (`lifecycle`, `last_message`), history kept 45 days.
