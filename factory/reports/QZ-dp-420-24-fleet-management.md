# QZ-dp-420-24-fleet-management — report

File: `content/dp-420/quizzes/24-fleet-management.yaml` (10 questions, `dp420-qz-24-01` to `-10`). Check: `npx tsx factory/check-quiz.ts dp-420 24-fleet-management` → 0 problem(s), 0 warning(s).

Objectives: 2.4.1 (q1, q3, q4, q6, q8, q10), 2.4.2 (q2, q5, q7, q9). Formats 6–10: single, dragdrop, single, dropdown, multi.

## Preview status (needs a decision)

- Learn labels **Create a Fleet (Preview)** and **Enable Fleet Analytics (Preview)** ("no SLA, not recommended for production"). The Fleet Pools and Fleets Overview pages carry no label. QUIZ-AGENT says never to make a preview feature the correct answer, but objectives 2.4.1 and 2.4.2 of the official study guide are only about fleets and fleet analytics, and the 26 mock-exam questions of these objectives already use them as answers. I followed the study guide. Someone should decide whether this chapter is an exception to the rule.

## Learn inconsistencies and points to check in the chapter

- **Enable Fleet Analytics**, storage destination: Learn names the role "Storage Blob Contributor", which isn't a built-in role. The chapter uses **Storage Blob Data Contributor**, which is probably the intended role. The chapter is OK; the Learn page has a typo.
- **Column names**: the Enable page's sample query selects `LastDateAnyAccountKeyRotated`, but the schema reference lists `LastDateAccountKeyRotated` (datetime). The chapter only says "last key rotation", so it's fine. I avoided the column.
- **DimResource**: the schema reference lists `ResourceId, FleetId, SubscriptionId, AccountName, Region, DatabaseName, CollectionName, ResourceType`, with no `ResourceGroup`. `ResourceGroup` is a column of `FactAccountHourly`. The Learn sample queries and the chapter (table row `DimResource` and the sample query `DR.[ResourceGroup]`) do use `DimResource.ResourceGroup`. Learn contradicts itself, so the chapter may be wrong on this point.
- The schema reference also lists tables and columns that the chapter doesn't mention: `FactFleetHourly`, `DimStatusCode`, `DimOperationName`, `DimResourceName`, and in `FactRequestHourly` the columns `StatusCode`, `OperationName` and `TotalRequestChargeInRU`. They could be useful in the chapter (mock question dp420-2d-fa-table-match already counts 429 responses from FactRequestHourly).
- **Create a Fleet**: the wording of the max RU/s rule is ambiguous. The "at most 10 × minimum" rule appears only on Fleet Pools. The rule that service tier and data regions can't change after creation appears only on Create a Fleet.
- Removing an account from a fleetspace (q4): Learn documents only `az resource delete` on the `fleetspaceAccounts` resource. Learn says an account already in a fleetspace "can't be added to another one" and must be removed first.

## Facts used that come from general knowledge (not on a fetched page)

- q4: `az resource move` moves resources across resource groups or subscriptions (distractor).
- q5: a Power BI Pro workspace on shared capacity has no Fabric capacity and can't hold a lakehouse; a warehouse and an eventhouse aren't lakehouses (Learn says only "an existing OneLake lakehouse").
- q7: resource logs hold one entry per request, with its status code and operation. Metrics are free and kept 90 days, as the Fleet Analytics comparison table says.
- q10 option c assumes a container whose two physical partitions each have 1,000 dedicated RU/s (split because of storage). The formula min(5,000 + dedicated, 10,000) is applied to each partition.
