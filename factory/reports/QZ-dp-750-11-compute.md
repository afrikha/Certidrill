# QZ-dp-750-11-compute — report

File: `content/dp-750/quizzes/11-compute.yaml` (10 questions, ids dp750-qz-11-01..10). Check: `npx tsx factory/check-quiz.ts dp-750 11-compute` → 0 problem(s), 0 warning(s).

Objectives: 1.1.1 (q1, q6, q10), 1.1.2 (q4, q7), 1.1.3 (q5), 1.1.4 (q3, q8), 1.1.5 (q2, q9). Positions 6–10: dropdown, multi, single, yes/no, multi.

## Chapter / mock exam vs current Learn (Nov 2026)

- **Dedicated compute assigned to a group is Public Preview.** The Learn page "Dedicated compute overview" says group access is "(Public Preview)". The chapter (access-modes table: "A team shares a cluster that needs dedicated-only features → Dedicated access mode assigned to a group") presents it as a normal answer. The mock question `dp750-1a-ml-group-dedicated` makes it the **correct answer**, which goes against the rule "never make a preview feature the correct answer".
- **Pools and autoscaling.** The chapter says "the cluster minimum should not exceed the pool's minimum idle instances, and a maximum above the pool capacity makes cluster creation fail". Learn ("Pool best practices") only says that when a pool is at max capacity, an instance request fails and the cluster doesn't acquire more instances. I found nothing about the min-vs-Min-Idle rule, or about cluster *creation* failing because the max is above the capacity.
- **Materialized views and compute.** The chapter trap says that materialized views need a pro or serverless SQL warehouse. The Learn page "Use standalone materialized views" now says they can be created and refreshed "from a Databricks SQL warehouse, or from a notebook running on serverless general compute". This is still true for warehouse types (a classic warehouse is wrong), but the list is out of date.
- **Driver logs.** Learn says that by default, driver logs are visible only to CAN MANAGE "on job compute and all-purpose compute on dedicated or standard access mode", and that the rule is reversed on No isolation shared. This matches the chapter.

## Unverified points / doubts

- q5: Learn ("What is Photon?") says that dynamic file pruning in MERGE requires Photon. I didn't find a page saying that the distractors (adaptive query execution, data skipping with Delta statistics, predictive optimization) don't depend on Photon. This comes from general knowledge.
- q6: the values `"warehouse_type": "pro"` and `"classic"` are written in lowercase as in the Learn example on "SQL warehouse types". The API reference (docs.databricks.com, not fetched) may show the enum in uppercase (`PRO`, `CLASSIC`). wh-fed = pro rests on the Learn recommendation to use pro for federation through your own network.
- q9 s3: the Learn ACL page doesn't say in so many words that compute ACLs and Unity Catalog privileges are separate. The answer rests on the "Unity Catalog privileges reference" (SELECT + USE CATALOG + USE SCHEMA are needed to read a table) and on the chapter.
- The former names "shared" / "single user" are confirmed on the "What is a view?" and allowlist pages, but not on "Compute configuration reference".
