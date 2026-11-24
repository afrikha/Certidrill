# QZ-dp-300-11-deploy-azure-sql — end-of-chapter quiz

File: `content/dp-300/quizzes/11-deploy-azure-sql.yaml` (10 questions, `dp300-qz-11-01`..`10`, EN + FR, draft).
Check: `npx tsx factory/check-quiz.ts dp-300 11-deploy-azure-sql` → 0 problem(s), 0 warning(s).

Plan: 1 serverless paused billing (1.1.1) · 2 FCI patching → Update Manager (1.1.9) · 3 Fabric yes/no: ledger, Entra users, elastic pools (1.1.4) · 4 register self-installed SQL VM (1.1.7) · 5 Arc version/scope prerequisites (1.1.3) · 6 Hyperscale vs BC/MI for 6 TB + size-independent scaling (1.1.1) · 7 sharding key choice (1.1.6) · 8 partitioning column types, multi (1.1.5) · 9 Bicep elastic pool + pooled database, dropdown (1.1.2) · 10 MI link + licensing (hybrid failover benefit vs BasePrice) (1.1.8).
Bank questions of 1.1.1–1.1.9 were read first; the quiz tests other decisions (no bank decision repeated with the same answer).

## Pages fetched (2026-11-24)
Serverless overview; Fabric SQL database authorization and limitations; Arc prerequisites and best practices assessment; SQL IaaS Agent extension overview and manual registration; Automated Patching; MI link overview; Partitioned tables and indexes; ALTER PARTITION FUNCTION; templates Microsoft.Sql servers/elasticPools and servers/databases; Hyperscale service tier; elastic scale introduction. The hourly WebFetch limit was hit once at the start (waited for the next hour).

## Not verified on a fetched page
- Q9: API version `2023-08-01` for `Microsoft.Sql/servers` and `servers/databases` (listed for `servers/elasticPools`; assumed common to the provider). `perDatabaseSettings.minCapacity: 0` accepted for a vCore General Purpose pool (general knowledge).
- Q2: that Azure Update Manager handles both FCI nodes (the IaaS Agent page only says an FCI doesn't support agent features such as patching).
- Q10 distractor c: "the free DR license covers passive replicas only" (the DR license type itself is on the registration page).

## Chapter issues (11-deploy-azure-sql) against current Learn
- Arc table row "Microsoft Defender for Cloud, best practices assessment — Need Azure Monitor Agent": the assessment installs AMA itself when it's missing, requires a Log Analytics workspace in the same subscription, and is Windows-only. Worth a precise line (a first draft of Q5 tested this, replaced because the chapter doesn't teach it).
- Fabric: the chapter doesn't say that the permission to connect comes only from Fabric workspace roles or item permissions (SQL permissions then apply inside); a first draft of Q3 tested it and was replaced for that reason.
- Bicep sample uses API `2022-05-01-preview`; GA versions exist (`2023-08-01`, `2025-01-01`; latest preview `2026-08-01-preview`). A GA version would be better in a teaching sample.
- The SQL IaaS Agent extension overview now describes "Automatic patching" as including cumulative updates through the integrated Azure Update Manager experience, while the Automated Patching page still says only Important/Critical updates and retirement on 2027-09-17. The chapter matches the Automated Patching page; no change needed, but the wording on Learn is moving.
- The elasticPools template now has `autoPauseDelay` (serverless pools?); not checked, not used.
- Q9 relies on Bicep property names (`elasticPoolId`, `perDatabaseSettings.maxCapacity`) that the chapter doesn't show; they're within the study guide (automated deployment) and the exam profile's hands-on level.
