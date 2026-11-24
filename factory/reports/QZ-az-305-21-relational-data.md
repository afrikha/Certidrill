# QZ-az-305-21-relational-data — report

File: `content/az-305/quizzes/21-relational-data.yaml` (10 questions, `az305-qz-21-01` to `-10`). Check: `npx tsx factory/check-quiz.ts az-305 21-relational-data` → 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (q1, q6), 2.1.2 (q2, q5, q9), 2.1.3 (q4, q8), 2.1.4 (q3, q7, q10). Positions 6–10: single, yesno_statements, dropdown, single, multi.

The mock bank has 58 questions on these objectives and already covers most single decisions. The quiz tests decisions it doesn't cover: elastic jobs instead of SQL Server Agent (q1), the 45-day reverse migration from Hyperscale (q2), Microsoft Entra-only authentication (q3), elastic pool rules (same logical server, per-database max, no per-database charge) (q4), PostgreSQL Memory Optimized (q5), SQL Managed Instance with an Azure-SSIS integration runtime (q6), geo-restore lost with LRS backups, a private endpoint that doesn't block the public endpoint, and the 35-day PITR limit (q7), a three-group tenant design (pool, single, Hyperscale) (q8), Hyperscale serverless without auto-pause (q9), and row-level security with `SESSION_CONTEXT` plus updatable ledger tables (q10).

## Out of date or imprecise in the chapter (verified on Learn, Nov. 2026)

- **Serverless auto-pause in Hyperscale is a preview feature.** The "Serverless compute tier" page says: "Serverless auto-pause and auto-resume are a preview feature of Azure SQL Database Hyperscale" (minimum and default delay 60 minutes in Hyperscale, versus a 15-minute minimum and 60-minute default in General Purpose). The chapter's compute-tier table lists "Auto-pause: Yes" and "Available in: Single databases in General Purpose and Hyperscale", and the key points say "Serverless: single databases in General Purpose or Hyperscale, billed per second, auto-pause". So a learner could think that auto-pause is GA in Hyperscale. Suggested fix: "auto-pause GA in General Purpose, preview in Hyperscale". Also from the Hyperscale page: serverless runs only on Standard-series (Gen5) hardware, not on premium-series. No mock question makes Hyperscale auto-pause a correct answer (checked).
- The PostgreSQL flexible server "overview" page says that a stopped server restarts automatically after **seven days**, and that compute billing stops immediately. The chapter says only "a server that can be stopped to pause compute billing", which is correct but leaves out the seven-day limit. This isn't used in the quiz.

## Doubts / unverified

- The page "Reverse migrate a database from Hyperscale" returned an error. The 45-day rule (q2) is taken from "What is the Hyperscale service tier?", which states it explicitly (target General Purpose). Option d of q2 ("General Purpose or Business Critical within 7 days") is wrong because of the window and the target.
- The elastic jobs overview page doesn't say explicitly whether the feature is generally available. It isn't marked as preview, and the chapter presents it as the replacement for SQL Server Agent (q1).
- q8, group A: serverless single databases aren't offered as an option. With 250 databases that receive requests all day, comparing their cost with a pool would be ambiguous, so the option was left out.
- The MySQL flexible server compute tiers are still Burstable, General Purpose and Memory-Optimized ("Service Tiers - Azure Database for MySQL"), as the chapter says.
