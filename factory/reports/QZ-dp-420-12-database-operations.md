# QZ-dp-420-12-database-operations — notes

`content/dp-420/quizzes/12-database-operations.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.2.1 (q2, q5), 1.2.2 (q1, q3), 1.2.3 (q7, q10), 1.2.4 (q6, q9), 1.2.5 (q4), 1.2.6 (q8). Positions 6–10: single ×2, yesno_statements, ordering, dropdown.

## Chapter vs current Learn (fix in the chapter, not done here)

- **TTL and `null` on an item.** The TTL page (fetched 2026-11-24) has example tables where an item `ttl` of null inherits the container value (container 1000 + item null = expires after 1000 s). The chapter's rules paragraph says "`null` isn't supported on an item (omit the property to use the container default)". The mock question `dp420-1b-ttl-yesno` s1 is based on the same rule. Recheck the exact page wording. No question here depends on it.
- **Learn URL moves**: several pages now live under `/en-us/cosmos-db/...`, and the query pages are titled "... Query Language for Cosmos DB (in Azure and Fabric)". The references in this quiz use the `/azure/cosmos-db/` URLs, which still resolve.
- Confirmed as written: OFFSET/LIMIT semantics; `ReadItemStreamAsync` throws only on client-side errors (API reference remarks); partition key values are immutable, and moving an item means create plus delete, which isn't atomic across partitions (Partitioning page, Important callout); `id` unique within a logical partition; patch operations, including Move with a required `from` that must exist, the 10-operation limit, path-level merge with multi-region writes, and no patching of `_etag`/`_ts`/`_rid`; `ttl` can be patched (FAQ); TTL counts from the last modification, and expired items are no longer returned by queries; batch limits (100 operations, 2 MB, 5 s) and 409/424 results; `_etag`/If-Match/412; and with multi-region writes, a local commit when the `_etag` matches locally, then merge or rollback by the conflict policy. Python `patch_item` takes `etag` + `match_condition` and raises `CosmosHttpResponseError`.

## Not verified on a fetched page

- q5: `ToList`/`AsEnumerable` run the LINQ query synchronously. The LINQ page shows only `ToFeedIterator` and doesn't mention them, so this follows the chapter. `GetItemLinqQueryable(requestOptions: ...)` is the SDK signature, not page text.
- q8 s3, q9, q10: the 412 status for a failed etag condition comes from the OCC page (replace). For patch and for a batch `ReplaceItem` with `IfMatchEtag`, it's the standard SDK behavior; no page states it for those operations. The OCC page doesn't mention session tokens.
- q9: `TransactionalBatchItemRequestOptions.IfMatchEtag` isn't on the transactional batch page; it's SDK API, also used by the mock question `dp420-cs4b-purchase-batch`.
- q10: the `MatchConditions` values (IfNotModified, IfModified, IfPresent, IfMissing) are the `azure.core` enum and weren't read on a Learn page.

## Design notes

- I read all 63 mock questions of 1.2.1–1.2.6 (bank, case studies and series) first. These quiz questions test other decisions: the same `id` in two partitions; OFFSET/LIMIT arithmetic; the stream read to avoid exceptions (the mock tests it only as "no deserialization"); a TTL countdown restarted by a patch; LINQ `ToFeedIterator`; the 100-operation batch limit met by grouping lines; moving an item to another partition key value; ETag behavior with multi-region writes; a two-item transfer with a batch plus ETags as an ordering question; patch `move`/`from` with `IfNotModified` in Python.
- No preview feature is an answer. `delete_all_items_by_partition_key` (preview, per the Q-dp-420-1b report) and Python bulk aren't used.
