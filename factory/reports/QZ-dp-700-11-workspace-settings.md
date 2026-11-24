# QZ-dp-700-11-workspace-settings — report

File: `content/dp-700/quizzes/11-workspace-settings.yaml` (10 questions, `dp700-qz-11-01` to `-10`). `npx tsx factory/check-quiz.ts dp-700 11-workspace-settings` → 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (Q1, Q6, Q10), 1.1.2 (Q3, Q8), 1.1.3 (Q2, Q5, Q7), 1.1.4 (Q4, Q9). Formats 6–10: yesno, multi, single, single, multi.

## Avoiding the mock bank

The bank already has 47 questions on 1.1.x (almost every decision in the chapter is tested). The quiz tests decisions that the bank doesn't: Admin role needed for Spark settings, OneLake diagnostics vs audit log, subdomains vs new domains, Spark default pool vs Airflow pool, one diagnostics lakehouse per capacity, REPL isolation + billing + single-user boundary, combined cache conditions (gateway, 28-day max, 1 GB, ADLS), By capacity (My workspaces, later/moved workspaces), custom Airflow pool + pausing the pool on a shared capacity, custom pool through an environment with Customize compute configurations for items on.

## Facts checked on Learn (Nov. 2026)

- Workspace administration settings (updated 2026-08-10): Admin role required; starter pool Medium nodes; custom pool needs Customized workspace pools; Customize compute configurations for items: when off, default pool for all environments; session timeout 20 min; maximum job lifetime does not affect system jobs.
- Environment compute: the **Compute** section of an environment (Environment pool, driver/executor sizes) is disabled while Customize compute configurations for items is off.
- High concurrency overview: single-user boundary, same default lakehouse and compute; only the initiating notebook billed, reported against it in Capacity Metrics; one REPL core per notebook.
- Domains: subdomains (created by Fabric or domain admin, no own admins, general settings only, workspaces can be assigned to them); By capacity / By workspace admin exclude My workspaces and later workspaces.
- Shortcuts caching, OneLake diagnostics, Apache Airflow Job workspace settings (still named "Apache Airflow Job").

## Chapter remarks (no edit made)

- Chapter §Environment: it doesn't say that selecting a pool in an environment (Environment pool) and setting compute in an environment both require **Customize compute configurations for items**; Learn (environment-manage-compute) says the Compute section of environments is disabled while it is off. Q10 relies on it; worth one sentence in the chapter.
- Chapter §Airflow table: Learn now lists the starter pool node size as **Large (fixed)** and its startup latency as "Instantaneous" (resume up to 5 min); the chapter only says "Fixed". Minor.
- Domains: Learn now says overrides of existing domain assignments by Fabric/domain admins need the tenant setting **Allow tenant and domain admins to override workspace assignments (preview)**. The chapter and the bank don't mention it; no quiz question relies on overrides.
- OneLake diagnostics: Learn adds that deleting the destination lakehouse disables diagnostics for all workspaces pointing to it, and that for Fabric engine access only `FabricWorkloadAccess` (temporary access granted) is logged — the detail is in engine logs. The chapter's "who read or wrote which file ... through engines" is slightly broader than Learn for engine access.

## Doubts

- Q4 s2 (Airflow tasks don't run on the Spark default pool) is inferred from the separate Data Factory runtime settings; Learn doesn't state it in one sentence.
- Q9: "pause the custom pool" is a manual action; Learn doesn't document scheduling the pause. The option says "each evening", not "schedule".
