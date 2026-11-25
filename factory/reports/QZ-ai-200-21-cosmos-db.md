# QZ-ai-200-21-cosmos-db — report

Quiz: `content/ai-200/quizzes/21-cosmos-db.yaml`, 10 questions (`ai200-qz-21-01` to `-10`), checker 0 problem(s), 0 warning(s).

Objectives: 2.1.1 (Q1, Q5, Q7), 2.1.2 (Q2, Q6, Q8), 2.1.3 (Q3, Q10), 2.1.4 (Q4, Q9). Positions 6–10: single, single, yesno_statements, multi, dropdown.

Mock-exam questions of 2.1.1–2.1.4 (64 files, including cs1b, cs2a, cs3a, cs4b and sr2) were read first; the quiz tests other decisions (id uniqueness per logical partition, default policy, vectors in arrays, maxItemsPerInvocation, database-scope data role, strengthening consistency through the account default, continuation-token paging, composite direction/filter rules, lease count and un-awaited async work in the processor, two vector paths with flat + diskANN).

## Chapter out of date or wrong against current Learn (not edited)

1. **Vector search enablement step is obsolete.** The chapter (section vector-search, step 1, and key points) says to enable the account capability `EnableNoSQLVectorSearch` with `az cosmosdb update --capabilities`. The current Learn pages say: "Azure Cosmos DB enables vector indexing and search by default. You don't need to register the feature or enable an account capability" (Integrated Vector Store page) and "Vector search is enabled by default" (Index and Query Vector Data in Python). The step and the "Exam trap"-adjacent text should be removed or reworded. The bank question `ai200-2a-vec-enable-feature` (answer = that command) is affected too, and the stem phrase "account where vector search is enabled" in `ai200-2a-vec-container-policy` / `cs2a` is now redundant. The quiz does not test the capability.
2. **Changing vector policies.** The chapter says to drop the vector policy/index and add it again. The vector-search page agrees ("cannot change the settings ... directly ... first drop ... then add it back"), but the Python how-to page says both policies "can't be modified later" and must be set at container creation. The two Learn pages are not fully consistent; the quiz avoids the point.
3. **`float16` "half the storage, small accuracy loss"** (chapter table) is not stated on the vector-search page I fetched (it only lists the supported types). Not tested.
4. **"More instances than leases leaves some idle"**: Learn only says "the number of instances shouldn't be greater than the number of leases" because a lease is owned by one instance at a time. Idle instances are the logical consequence; Q9 relies on it in that form.
5. **Python request charge.** The chapter shows `response.get_response_headers()["x-ms-request-charge"]`, while the bank question `ai200-2a-sdk-request-charge` answers `container.client_connection.last_response_headers[...]`. I did not verify which is current in the azure-cosmos reference (page truncated); not tested.
6. Not in the chapter but on Learn: vector search on containers with hierarchical partition keys requires contacting the Cosmos DB team. Possibly worth a line.

## Unverified / doubts

- Default consistency level "Session": the consistency-levels page I fetched doesn't name the default; the quiz does not rely on it.
- Q7 relies on `ItemPaged.by_page(continuation_token)` (azure-core reference, fetched) and on Cosmos query continuation tokens being stateless and resumable (Pagination page, fetched). The attribute that exposes the token on the page iterator (`continuation_token`) is documented only indirectly on the azure-core page ("the continuation_token field of a previous generator object").
- Q4 uses the `function.json` name `maxItemsPerInvocation`; the Python v2 decorator equivalent is not documented on the trigger page, hence the stem says settings use their `function.json` names (as in `ai200-cs4b-backfill`).
- Q10: `/textVector/?` as a wrong exclusion relies on the path syntax of the chapter (`/?` = scalar value; arrays need `/*` or `/[]/?`), consistent with Learn's examples that exclude vectors with `/<path>/*`.
- French: used « application conteneur » (49 occurrences in the AI-200 bank) for container app.
