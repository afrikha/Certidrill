# QZ-dp-420-14-change-feed — notes

`content/dp-420/quizzes/14-change-feed.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.4.1 (q1, q3, q7, q9), 1.4.2 (q2), 1.4.3 (q4, q8), 1.4.4 (q5, q10), 1.4.5 (q6). Positions 6–10: yesno_statements, single ×2, dropdown ×2 (one of them C# code).

## Preview status (affects the chapter and the mock exam)

- **Container copy jobs are still preview.** The H1 of "Container Copy Jobs - Azure Cosmos DB" reads "Copy jobs in Azure Cosmos DB (preview)", and the service is best effort with no SLA. Objective 1.4.5 is about this feature, so q6 tests its behavior with Yes/No statements and doesn't make it a chosen solution. Mock questions such as `dp420-1e-copy-change-pk` and `dp420-1e-copy-hpk-limit` make a copy job the correct answer.
- **All versions and deletes with the change feed processor is preview.** "Change Feed Processor" (2026-05-18) says: "All versions and deletes mode is in preview and is supported for the change feed processor starting with version 3.60.0". "Change Feed Modes" and "Change Feed Pull Model" give no preview label for the mode itself. Mock questions `dp420-cs1a-catalog-sync-feed` and `dp420-cs4b-hold-expiry` have `GetChangeFeedProcessorBuilderWithAllVersionsAndDeletes` as their correct option.
- **Python all versions and deletes needs `azure-cosmos` 4.9.1b1**, which is a beta package. `dp420-1d-avad-python` relies on it. The chapter gives the version without saying it is a beta.

## Chapter vs current Learn (fix in the chapter, not done here)

- "Work with the Change Feed": in accounts with **multiple write regions**, latest version mode can drop an incoming change to a document when a more recent change exists in another region. All versions and deletes mode captures all of them. The chapter doesn't mention this.
- "Change Feed Modes": TTL deletes in all versions and deletes mode are "not guaranteed to appear in the feed immediately after the item expires". They appear when the item is purged. The chapter doesn't mention this.
- "Change Feed Processor": if the **first-ever** delegate execution fails, the batch isn't retried from a lease, because there is no saved state yet; the retry uses the initial start configuration. The chapter says the batch is redelivered "until it succeeds", with no exception.
- "Container Copy Jobs" doesn't cover cross-account copies. The chapter's cross-account paragraph, and `dp420-1e-copy-cross-account`, rely on another page that I didn't fetch.
- Confirmed as written: per-key order and any order inside a transactional batch's scope, `crts` ordering, the lease defaults (17 s / 60 s / 13 s), the shared lease container rule ("different monitored container **or** different processorName"), the estimator API, the Functions trigger supporting all versions and deletes only in the .NET isolated worker model, token validity, start positions per mode, and the online copy surcharge with the 2× target throughput recommendation.

## Not verified on a fetched page / design notes

- q10, slot 1: Learn says that reading changes outside the retention window "results in an error", and that a token is valid only while its changes are within that window. The exact error for a token that is 9 days old with a 7-day window is my inference from those two sentences.
- q5 uses `ChangeFeedStartFrom.Time(...)`, which I checked on the .NET API reference page.
- The bank already has about 48 questions on these objectives. The new decisions are: the change feed is enabled by default; the Functions trigger for Python with no worker to host; poison messages sent to an errored-message container; a lease container shared across different monitored containers with the same processorName; latest version from a point in time instead of all versions and deletes; sequential copy jobs and the source surcharge; order inside a transactional batch; an estimator with unowned leases; a fire-and-forget delegate; and token expiry, deleted items and all versions and deletes support in Functions.
- No preview feature is a chosen solution. Container copy appears only in Yes/No statements (q6) and as a distractor (q2).
