# QZ-dp-420-11-resource-models-sdk — notes

`content/dp-420/quizzes/11-resource-models-sdk.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q1, q10), 1.1.2 (q6), 1.1.3 (q3, q9), 1.1.4 (q5), 1.1.5 (q2, q8), 1.1.6 (q4, q7). Positions 6–10: yesno_statements, single ×3, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Strengthening reads per request now exists, in preview.** Manage Consistency (fetched 2026-11-24) says the traditional `ConsistencyLevel` override can only relax consistency. It also describes `ReadConsistencyStrategy` (Java SDK 4.69+, .NET SDK 3.46+, preview, Direct mode only), which can set stronger reads per request. The chapter says that a client or request can "never strengthen" consistency. Add the preview exception. q10 says that the services can only set `ConsistencyLevel` in `CosmosClientOptions`, so its answer stays unambiguous.
- Newtonsoft.Json: the .NET performance page now says SDK 3.47.0+ needs 13.0.3 and SDK 3.54.0+ needs 13.0.4, and its sample uses 13.0.4. The chapter only says "13.0.3 or later".
- The Request Units page says that R RU/s are *available* in each region (R × N in total). It doesn't say they are *billed* R × N. The chapter says "available, and billed". The choose-offer page does say to multiply the hourly cost by the number of regions, so the chapter is right, but the request-units page isn't the source for it.
- Confirmed as written: Session is the default level; Strong and Bounded staleness reads cost 2x; the bounded staleness minimums (10/5 s single region, 100,000/300 s multi-region); the 2 × RTT + 10 ms Strong write latency; restart applications after changing the default; the autoscale range of 0.1–1 × Tmax and its 10 % hourly floor; the 66 % rule; with multi-region writes and more than one region, use autoscale; dynamic scaling (after 2024-09-25, Features page); free tier only at creation (one per subscription, 1,000 RU/s + 25 GB, not serverless); priority-based execution (Features page, default High, not serverless, .NET 3.38.0 / Python 4.14.2); Direct mode needs ports 10000–20000 plus the gateway ports (0–65535 with private endpoints), with 503 when they're blocked; Direct mode only in .NET and Java; PortReuseMode / IdleTcpConnectionTimeout (20 min to 24 h); 9 retries and 30 s by default; data plane roles don't create databases or containers (pre-provision through ARM, or use Cosmos DB Operator); 1–5 % of 429 with acceptable latency needs no action.

## Not verified on a fetched page

- q6 s3: no fetched page says outright that `EnableContentResponseOnWrite = false` leaves the write RU charge unchanged. The performance page lists only memory, serialization and bandwidth savings. The statement follows the chapter's Exam trap.
- q7: the explanation of `LimitToEndpoint` (it stops the SDK from discovering the account's other regions) comes from the SDK API, not a fetched page. The 443 gateway port that Direct mode also needs is described as "the gateway ports", as on the connectivity page.
- q8: the startup calls are described as "rejected", with no status code, because the exact error code wasn't on the page.

## Design notes

- I read all 59 mock questions of 1.1.1–1.1.6 first. These quiz questions test other decisions: the default level as recall; that the partition key path is set on the container (not as the per-item value); the autoscale idle floor (the mock tests the hourly peak); PortReuseMode for sparse traffic (the mock tests singleton and Gateway); dynamic scaling, free tier and default priority on an existing account; reading normalized RU and 429 metrics; opening ports 10000–20000 instead of switching to Gateway (the mock answer is Gateway); pre-provisioning resources when the identity has data-plane access only; autoscale with multi-region writes against the 66 % rule; and the account default plus client overrides.
