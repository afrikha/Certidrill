SQL Server Agent runs scheduled jobs on SQL Server (including SQL Server on Azure VMs) and Azure SQL Managed Instance; Azure SQL Database has no SQL Server Agent and uses elastic jobs instead (chapter 43). Exam questions ask how to schedule maintenance, how to be notified when a job fails, and why a job didn't run or failed, often with the differences of Managed Instance as the trap.

<!-- section: agent-platforms | objectives: 4.1.1, 4.1.3 -->
## Where SQL Server Agent runs

| Platform | SQL Server Agent |
| --- | --- |
| SQL Server on Azure VMs (Windows) | Windows service; set it to start automatically; managed in SSMS under **SQL Server Agent** |
| SQL Server on Linux | Included since SQL Server 2017 CU 4 but disabled by default: `sudo /opt/mssql/bin/mssql-conf set sqlagent.enabled true`, then `sudo systemctl restart mssql-server` |
| Azure SQL Managed Instance | Always running; can't be enabled or disabled; settings are read-only (`sp_set_agent_properties` isn't supported) |
| Azure SQL Database | Not available: use elastic jobs, or Azure Automation for broader tasks |

Managed Instance limits to remember:

| Feature | Managed Instance |
| --- | --- |
| T-SQL and SSIS job steps | Supported (also transactional replication log reader, snapshot and distributor jobs) |
| Command shell (CmdExec) job steps, merge replication, Queue Reader | Not supported |
| Proxies | Not supported |
| Schedule on idle CPU | Not supported |
| Alerts | Not yet supported |
| Email notifications | Supported through Database Mail, with a profile named `AzureManagedInstance_dbmail_profile`; pager, net send and event log aren't supported |
| Multiserver administration (MSX/TSX) | Not supported |
| Permissions through a Microsoft Entra group | Not effective: the user must be mapped directly to a Microsoft Entra server login to create, modify or run jobs |

Job definitions, schedules, operators, alerts and history are stored in `msdb`.

> **Exam trap.** "Run a nightly T-SQL maintenance script on 40 Azure SQL databases" can't use SQL Server Agent: Azure SQL Database has none. On Managed Instance it can, but a job that must run a `.cmd` or PowerShell script on the host can't.

<!-- section: schedules | objectives: 4.1.1 -->
## Managing schedules for maintenance jobs

A **job** has one or more **steps** (each with a type, a command, a database and flow-control actions) and zero or more **schedules**. A schedule is a separate object: one schedule can be attached to several jobs, and a job can have several schedules.

| Schedule type | `@freq_type` | Use |
| --- | --- | --- |
| One time | 1 | A single run at a date and time |
| Recurring daily / weekly / monthly / monthly relative | 4 / 8 / 16 / 32 | Regular maintenance (for example every Sunday at 02:00, or the last Saturday of the month) |
| Start automatically when SQL Server Agent starts | 64 | Tasks needed after every restart |
| Start whenever the CPUs become idle | 128 | Low-priority work when the server is quiet (idle condition defined in the Agent properties; not on Managed Instance) |

A typical weekly maintenance job created in T-SQL:

```text
USE msdb;
EXEC sp_add_job @job_name = N'Weekly index and statistics maintenance',
     @owner_login_name = N'sa';
EXEC sp_add_jobstep @job_name = N'Weekly index and statistics maintenance',
     @step_name = N'Update statistics', @subsystem = N'TSQL',
     @database_name = N'SalesDB', @command = N'EXEC sp_updatestats;',
     @retry_attempts = 2, @retry_interval = 5,
     @on_success_action = 3, @on_fail_action = 2;
EXEC sp_add_jobstep @job_name = N'Weekly index and statistics maintenance',
     @step_name = N'Check integrity', @subsystem = N'TSQL',
     @database_name = N'SalesDB', @command = N'DBCC CHECKDB WITH NO_INFOMSGS;';
EXEC sp_add_schedule @schedule_name = N'Sunday 02:00',
     @freq_type = 8, @freq_interval = 1, @freq_recurrence_factor = 1,
     @active_start_time = 020000;
EXEC sp_attach_schedule @job_name = N'Weekly index and statistics maintenance',
     @schedule_name = N'Sunday 02:00';
EXEC sp_add_jobserver @job_name = N'Weekly index and statistics maintenance';
```

| Element | Detail |
| --- | --- |
| `@freq_interval` with weekly schedules | Bit mask of days: 1 = Sunday, 2 = Monday, 4 = Tuesday... 64 = Saturday (62 = Monday to Friday) |
| `@freq_subday_type`, `@freq_subday_interval` | Repeat within the day (every N minutes or hours) |
| `@on_success_action` / `@on_fail_action` | 1 = quit reporting success, 2 = quit reporting failure, 3 = go to the next step, 4 = go to step `@on_success_step_id` / `@on_fail_step_id` |
| `@retry_attempts`, `@retry_interval` | Automatic retries of a failed step, interval in minutes |
| `sp_add_jobserver` | Targets the job at the local server: without it, the job never runs |

In SSMS: **SQL Server Agent > Jobs > New Job**, pages **Steps**, **Schedules**, **Alerts**, **Notifications**. The **Maintenance Plan Wizard** (Management > Maintenance Plans) builds the common tasks (check integrity, rebuild or reorganize indexes, update statistics, back up, clean up history) and creates the Agent jobs that run them. Disable a schedule (`sp_update_schedule @enabled = 0`) to pause it for every job that uses it; disable a job (`sp_update_job @enabled = 0`) to stop it whatever its schedules.

> **Exam tip.** Schedule maintenance outside business hours and order it: integrity check, then index maintenance, then statistics update only for what the rebuild didn't cover, and backups so they don't overlap the heaviest tasks.

<!-- section: alerts-notifications | objectives: 4.1.2 -->
## Configuring job alerts and notifications

Notifications go to **operators**: an alias with an email address (pager and net send are deprecated). Email requires **Database Mail**.

Order of configuration:

1. Enable and configure Database Mail (SMTP account and profile), and test it.
2. In **SQL Server Agent Properties > Alert System**, enable the mail profile, then **restart SQL Server Agent** (on Managed Instance, name the profile `AzureManagedInstance_dbmail_profile`).
3. Create the operator.
4. Add a notification to the job (on failure, success or completion) or create an alert that notifies the operator.

```text
USE msdb;
EXEC sp_add_operator @name = N'DBA team', @email_address = N'dba@contoso.com';

-- Email the operator when the job fails
EXEC sp_update_job @job_name = N'Weekly index and statistics maintenance',
     @notify_level_email = 2, @notify_email_operator_name = N'DBA team';

-- Alert on severity 17 and above, then on a performance condition
EXEC sp_add_alert @name = N'Severity 17', @severity = 17,
     @include_event_description_in = 1;
EXEC sp_add_notification @alert_name = N'Severity 17',
     @operator_name = N'DBA team', @notification_method = 1;
EXEC sp_add_alert @name = N'Log almost full',
     @performance_condition = N'SQLServer:Databases|Percent Log Used|SalesDB|>|90',
     @job_name = N'Back up SalesDB log';
```

| Mechanism | Fires on | Detail |
| --- | --- | --- |
| Job notification | Job outcome | `@notify_level_email`: 0 = never, 1 = on success, 2 = on failure, 3 = on completion; can also write to the Windows event log or delete the job |
| SQL Server event alert | An error number, or a severity level, optionally filtered by database or message text | The error must be logged: SQL Server Agent reads the Windows application log (severities 19 to 25 are always logged) |
| Performance condition alert | A performance counter crossing a threshold | Example: percent of log used above 90 |
| WMI event alert | A WMI event | For example DDL or server events |

An alert can notify operators, **run a job** in response (for example a log backup when the log fills), or both. A **fail-safe operator** (Agent properties > Alert System) receives alert notifications when no other operator can be reached, for example when none is on pager duty.

On Managed Instance, use job notifications to operators; alerts aren't supported, so react to engine conditions with Azure Monitor alerts instead. For SQL Server on Azure VMs, Azure Monitor alerts on VM metrics complement Agent alerts.

> **Exam trap.** If Database Mail works from `sp_send_dbmail` but job notifications aren't sent, the mail profile isn't enabled in the SQL Server Agent **Alert System** page, or SQL Server Agent wasn't restarted after it was enabled.

<!-- section: troubleshoot-jobs | objectives: 4.1.3 -->
## Troubleshooting SQL Server Agent jobs

Start with the job history: SSMS **View History** on the job (step-level messages), **Job Activity Monitor**, or the `msdb` views.

```text
USE msdb;
EXEC sp_help_jobhistory @job_name = N'Weekly index and statistics maintenance', @mode = N'FULL';

SELECT j.name, h.step_id, h.step_name, h.run_status, h.run_date, h.run_time, h.message
FROM dbo.sysjobhistory AS h
JOIN dbo.sysjobs AS j ON h.job_id = j.job_id
WHERE h.run_status = 0
ORDER BY h.instance_id DESC;
```

`run_status`: 0 = failed, 1 = succeeded, 2 = retry, 3 = canceled, 4 = in progress. `sysjobactivity` shows current and last runs and next scheduled run.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| The job never starts | Agent service stopped (VM), job or schedule disabled, no `sp_add_jobserver`, schedule end date passed | Start the service and set it to automatic; enable the job and schedule; target the server |
| SSMS shows the Agent node empty | `Agent XPs` server option disabled | Start SQL Server Agent (it enables `Agent XPs`) or `sp_configure 'Agent XPs', 1` |
| Fails with "unable to determine if the owner has server access" | The job owner's login was disabled or deleted (for example a departed employee's domain account) | `sp_update_job @owner_login_name` to a valid login, such as a dedicated service login |
| A step can't read or write a file share or folder | The SQL Server Agent service account (or the proxy's credential) lacks permissions | Grant the account rights, or use a proxy with a credential that has them |
| A CmdExec, PowerShell or SSIS step fails for a non-sysadmin owner | No proxy for that subsystem | Create a credential and a proxy, grant the proxy to the owner, select it in the step (not on Managed Instance) |
| History is missing or very short | History log limits (default 1,000 rows in total, 100 per job) | Raise the limits in **SQL Server Agent Properties > History** or archive history |
| No email after a failure | Notification not set, operator missing, Database Mail profile not enabled for the Agent | Configure the notification chain (previous section) |
| A step "succeeded" but did nothing useful | Errors caught by `TRY...CATCH` and not raised again | Re-raise with `THROW` so the step fails; log step output to a file or table |

Security model:

| Item | Rule |
| --- | --- |
| `msdb` roles | `SQLAgentUserRole` (own jobs), `SQLAgentReaderRole` (+ view all jobs and history), `SQLAgentOperatorRole` (+ run, enable or disable any local job) |
| T-SQL steps | Run as the job owner; when the owner is `sysadmin`, they run under the SQL Server Agent service account and can specify a database user to run as |
| Other subsystems | Run under the Agent service account for `sysadmin` owners, otherwise through a **proxy** (a credential mapped to a Windows account) |

**Step output.** On the step's **Advanced** page, write output to a file, log to a table, or include step output in history: the full error message often exceeds what the history row keeps.

> **Exam trap.** On Managed Instance, a user who gets job permissions only through a Microsoft Entra group can't create, change or run jobs: create a Microsoft Entra login for that user and map it directly.

<!-- section: key-points -->
## Key points

- SQL Server Agent: SQL Server (Windows, Linux after `mssql-conf set sqlagent.enabled true`) and Managed Instance; never Azure SQL Database (elastic jobs).
- Managed Instance: Agent always on, T-SQL and SSIS steps, no proxies, no CmdExec, no alerts, no CPU-idle schedule, Database Mail profile `AzureManagedInstance_dbmail_profile`.
- Job = steps + schedules (reusable, attached with `sp_attach_schedule`) + `sp_add_jobserver`.
- Notification chain: Database Mail, profile enabled in Agent Alert System, Agent restart, operator, job notification or alert.
- Alerts fire on error numbers, severities, performance conditions or WMI events, and can start a job.
- Troubleshoot with `sp_help_jobhistory` / `sysjobhistory`; check owner, service account, proxies and history size limits.
