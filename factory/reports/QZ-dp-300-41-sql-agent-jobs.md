# QZ-dp-300-41-sql-agent-jobs — report

File: `content/dp-300/quizzes/41-sql-agent-jobs.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-300 41-sql-agent-jobs` → 0 problem(s), 0 warning(s)).

Objectives: 4.1.1 (q1, q5, q9), 4.1.2 (q2, q7, q10), 4.1.3 (q3, q4, q6, q8). Formats 6–10: multi, single, yesno_statements, dropdown, single.

## Chapter vs current Learn (Nov 2026)

- **Managed Instance and CmdExec/PowerShell steps: check this.** Learn's page "Automate management tasks using SQL Agent jobs in Azure SQL Managed Instance" says OS command/PowerShell steps "can execute custom OS script". It also says that running a script stored as a file on disk, and PowerShell Core, aren't supported. The chapter table says flatly that CmdExec job steps aren't supported on Managed Instance. Its exam trap ("a job that must run a `.cmd` or PowerShell script on the host can't") may be too strong. Recheck the chapter and the mock questions that rely on it. I didn't use this point in the quiz.
- **Microsoft Entra group limitation on MI** (chapter exam trap): it isn't on the MI job-automation page I fetched. It may be on another page; not checked.
- **Agent XPs:** Learn says the Agent XPs are enabled automatically when the Agent service is started *from SSMS*. The chapter says that starting SQL Server Agent enables them, without that nuance.
- **History defaults:** "1,000 total records, max 100 per job" is confirmed on the MI job-automation page ("fixed at the default"). The SSMS "Resize the job history log" page doesn't state the defaults.

## Facts not fully verified

- **sp_add_jobserver:** "A job without `sp_add_jobserver` never runs" (q4, also in the chapter). Learn says only that `sp_add_jobserver` "sets the SQL Server instance where the job executes". It doesn't say explicitly that an untargeted job isn't run. This is well-known behavior, so I kept it.
- **Error 1105** as "filegroup out of space" (q7 distractor explanation): from memory.
- **Permissions for `RAISERROR ... WITH LOG`** (sysadmin / ALTER TRACE): not verified, so I removed it from q10.
