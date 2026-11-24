# QZ-dp-420-22-availability-recovery — notes

`content/dp-420/quizzes/22-availability-recovery.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.2.1 (q1, q3, q7, q8, q10), 2.2.2 (q2, q4, q6), 2.2.3 (q5, q9). Positions 6–10: multi ×2, yesno_statements, single, ordering.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Restoring a deleted database restores its child containers.** The how-to page "Restore a deleted container or database to the same Azure Cosmos DB account" says "Child containers are also restored". The chapter only says to restore the database first and then the container, which suggests two steps are always needed. It could add that the database restore brings the containers back, and that shared-throughput containers always come back with their database.
- Same-account restore limits that the chapter omits (Learn, "Same-account (in-account) restore for continuous backup"): the resource must have existed in the **current write region** at the restore time; a restore can't run while an account-level operation (add or remove region, failover) is in progress; a restore fails if another restore of the same resource is running. These limits aren't used in the quiz.
- The Learn PPAF page ("Configure per-partition automatic failover for Azure Cosmos DB") doesn't say whether the feature is GA or preview. The chapter and the mock bank treat it as available, so no preview statement was added. The ~3 minutes figure and the two-region Strong read-region exception come from "Reliability in Azure Cosmos DB", not from the PPAF page.
- Confirmed as written: default periodic backup every 4 h with two copies; periodic snapshots of deleted resources kept 30 days; continuous tiers 7/30/35 days, 7-day tier without backup storage charge; shared-throughput databases restored whole; not restored: firewall, VNet, private endpoint, data-plane RBAC, role assignments, regions, stored procedures, triggers, UDFs; `--public-network-access Disabled` and `--disable-ttl True` (also on `az cosmosdb sql container restore`, GA); at most three active restores per account; multi-region write restore keeps only hub-confirmed writes and resets custom conflict policies to last writer wins; hub = first region, next region in order of addition when removed; forced failover brings the old write region back as a read region, Change write region for the planned move back; RPO table by consistency level.

## Not verified on a fetched page

- Periodic limits (interval 1–24 h, retention at least twice the interval, at most 720 h, "increase retention to 7 days within 8 hours") are not on the periodic introduction page; I didn't use them.
- q4 option d: "service-managed failover doesn't move the write region while every region is healthy" is inferred from Learn's description (Microsoft fails over during an outage), not a quoted sentence.

## Design notes

- New decisions compared with the mock bank: default periodic coverage, hub succession after removal, shared-throughput database restore scope, failback with Change write region, PPAF fault simulation size and delay, multi-region write antipatterns (random region order, cross-region session token writes), same-account restore order/TTL/concurrency, what a restore of a multi-region write account contains, Strong + PPAF for a two-region account with automatic recovery from either region's failure, and repair of a live container through a private, TTL-disabled restored account.
- q9 is close in spirit to `dp420-2b-mr-rpo-zero` and `dp420-cs4b-partition-failover` (Strong, single write region, PPAF), but its deciding fact is the read-region outage of a two-region Strong account, which no mock question tests.
- PyYAML can't parse `questions/ai-analytics/dp420-3b-perf-diskann-build-policy.yaml` and `dp420-cs1c-chunk-vectors.yaml` (flow mapping containing `?`). The project's own validator may accept them; worth a check by their owner.
