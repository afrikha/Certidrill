# K-dp-420-sr2 — report

5 Yes/No series, 15 questions (`dp420-sr2-*`), all `status: draft`. Validator: `CERT=dp-420 npx tsx factory/validate.ts --prefix dp420-sr2` → 20 files, 0 problem(s).

| Series | Objective | Domain | Answers | Difficulty |
| --- | --- | --- | --- | --- |
| dp420-sr2-ttl-sessions | 1.2.5 TTL | develop | Yes / No / Yes | 1 / 2 / 3 |
| dp420-sr2-cfp-leases | 1.4.3 lease containers | develop | No / Yes / Yes | 1 / 2 / 3 |
| dp420-sr2-ddm-employees | 2.1.4 dynamic data masking | secure-optimize | Yes / No / No | 2 / 1 / 3 |
| dp420-sr2-alert-throttling | 2.3.5 Azure Monitor alerts | secure-optimize | No / Yes / No | 2 / 1 / 2 |
| dp420-sr2-fabric-mirror | 3.3.2 Fabric mirroring | ai-analytics | No / Yes / No | 2 / 1 / 3 |

## Deviations and doubts

- Overlap with sr1 (written in parallel): my first drafts on 2.1.2 (data plane RBAC, container vs account scope) and 3.1.1 (FullTextContainsAny vs ORDER BY RANK FullTextScore vs projected FullTextScore) tested the same decisions as `dp420-sr1-keyless-orders` and `dp420-sr1-catalog-ranking`. I deleted them and replaced them with the 2.1.4 and 3.3.2 series.
- Sharded DiskANN (3.1.3) considered but dropped: the Learn page does not document behaviour without a shard-key filter or the GA/preview status.
- Lease container partition key (`/id`) deliberately not mentioned: not stated on the fetched change feed processor page.
- DDM masking policy is shown as the policy object (`includedPaths` only); the Learn example wraps it in `dataMaskingPolicy` and uses `//` comments. GA status from the April 2026 Cosmos DB blog, not stated on the Learn page.
- Fabric mirroring: the Learn page says 7-day continuous backup is "free of cost" and, in the cost section, that "standard charges for continuous backup apply"; the series relies on the 7-day tier being the lowest-cost option, which both statements support.
