# QZ-dp-420-13-data-models-partitioning — notes

`content/dp-420/quizzes/13-data-models-partitioning.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.3.1 (q2, q8), 1.3.2 (q4), 1.3.3 (q3), 1.3.4 (q1), 1.3.5 (q6), 1.3.6 (q7), 1.3.7 (q5, q9), 1.3.8 (q10). Positions 6–10: yesno_statements ×2, multi, single, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Global secondary indexes are missing.** "Partitioning and horizontal scaling" (updated 2026-10-05) lists GSIs as a partitioning strategy, as the alternative when changing the partition key would be disruptive, and as a fix for several independent query patterns. The "Global Secondary Indexes" page (2026-05-17) has no preview label. It describes read-only containers with their own partition key, kept in sync automatically from the change feed, using autoscale, with a 50–100 % surcharge on source replaces and deletes. The chapter's "Materialized view fed by the change feed" row and its "Changing the key later" sentence should mention GSIs. Check whether GSIs are GA before you add them. I didn't write a materialized-view question, because a GSI would be a second valid answer.
- **Multitenancy guide** ("Multitenancy and Azure Cosmos DB", Architecture Center): container-per-tenant and database-per-tenant are now marked **not recommended**. The guide recommends an account per tenant, with fleet pools, for performance isolation or customer-managed keys. It also says that hierarchical keys are "not suited to write-optimized workloads or low-cardinality tenants", and recommends synthetic keys or `/id` for write-heavy workloads. The chapter's multi-tenant table still offers container per tenant for "fewer tenants needing performance isolation", without that caveat.
- **Shared database throughput**: "Provision Throughput for Containers and Databases" now says it is "not recommended for most workloads". It also says that a shared-throughput container can't be converted to dedicated throughput, or the reverse: the data must be moved to a new container. The anti-pattern row "Shared database throughput with one busy container → Dedicated throughput for that container" should say that this means a new container plus a data move.
- **Hierarchical keys**: Learn adds that if the first level has low cardinality and you hit 20 GB, you should use a synthetic key rather than a hierarchical key. It also says that splits take 4–6 hours, and that write-heavy workloads need at least thousands of first-level values. The chapter covers only the "five tenants stay on one physical partition until 50 GB" part (q6 is built on that).

## Mock exam

- `dp420-1d-cost-estimator-tool` makes the **Azure Cosmos DB Cost Estimator** the correct answer. On "Estimate Costs using the Cost Estimator" (2026-07-01) the tool is still **public preview**, so a preview feature is the correct answer there.

## Not verified on a fetched page / design notes

- q3: "a 1.2-MB item costs far more RUs to point read than a 2-KB item" is the general rule that RU charge grows with item size. It isn't a figure from a page.
- q10: the figures come from the Learn example rates ($0.008 manual, $0.012 autoscale per 100 RU/s per hour, single write region), the 10 % autoscale minimum, and billing per region. I used 30 days per month (720 h) instead of 730 h to make the arithmetic simpler. The stem says so.
- The bank covers these objectives densely (about 70 questions). The new decisions are: the 30,000 RU/s or 100 GB threshold; separate containers for throughput and indexing isolation; references for bounded but rarely read data; the transaction scope deciding the key; uniform saturation (raise RU/s, not the key); a low-cardinality first level for hierarchical-key ingestion; a synthetic key under a batch constraint; point reads over a rare dashboard; an embedded array with a 2-MB computation; and a two-region manual vs autoscale computation.
- No preview feature is an answer.
