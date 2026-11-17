# K-az-305-sr2 — report

5 Yes/No series, 15 questions (`az305-sr2a` … `az305-sr2e`), all `status: draft`. Validator: `20 files, 0 problem(s)`.

| Series | Objective | Domain | Answers (q1, q2, q3) | Difficulty |
| --- | --- | --- | --- | --- |
| az305-sr2a-partner-consultants | 1.3.3 | identity | Yes, No, No | 1, 2, 2 |
| az305-sr2b-cart-store | 2.2.1 | data | No, No, Yes | 2, 2, 1 |
| az305-sr2c-blob-rollback | 3.1.4 | continuity | No, Yes, No | 1, 2, 3 |
| az305-sr2d-datacenter-link | 4.4.2 | infrastructure | Yes, No, Yes | 3, 2, 2 |
| az305-sr2e-queue-functions | 4.1.4 | infrastructure | No, Yes, No | 1, 2, 3 |

## Deviations

- "Each on a different objective and domain": 5 series for 4 domains, so two series are in `infrastructure`, in two different groups (4.1 compute, 4.4 network).
- Two first drafts were discarded because the parallel task K-az-305-sr1 had just written the same decisions: an application proxy series (1.2.4, same scenario as `az305-sr1-intranet-remote`) and an Azure SQL read scale-out / Hyperscale series (too close to `az305-sr1-sql-reporting`). They were replaced by 1.3.3 (entitlement management) and 2.2.1 (Cosmos DB write regions and consistency). No overlap remains with the six `az305-sr1-*` series (1.2.4, 1.3.2, 2.1.2, VM regional DR, global web entry, order messages).

## Facts not confirmed on a fetched page (web-fetch hourly limit reached once)

- `az305-sr2d-q1`: "a site-to-site VPN is an IPsec tunnel over the internet" comes from the course chapter 44 and general knowledge; the VPN Gateway overview page could not be fetched. The two cited ExpressRoute pages confirm coexistence, route preference and the use of the VPN only when the circuit fails.
- Gateway SKU names `ErGw2AZ` (sr2d-q2) and `VpnGw2AZ` (sr2d-q1) were not checked on a SKU page (the course cites ErGw3AZ and VpnGw1AZ–VpnGw5AZ).
- `az305-sr2a-q3`: "PIM for Groups doesn't remove the guest account" is a negative fact; the cited page simply never mentions any guest lifecycle.
- `az305-sr2b-*`: the reference "Reliability in Azure Cosmos DB" was fetched at `/azure/cosmos-db/high-availability`; check that this URL is still the canonical one.
- `az305-sr2c-q2`: the overview page of blob backup says operational backup cannot restore deleted containers; the scenario only covers overwritten and deleted blobs, restored for the account or for selected containers (up to 10 per restore).

## To review

- `az305-sr2d-q1` (ExpressRoute + VPN backup = Yes) relies on the stem sentence "reduced bandwidth and higher latency are acceptable during the failure", because Microsoft does not recommend a VPN backup for latency-sensitive or bandwidth-intensive workloads.
- `az305-sr2b-q2` is "No" because the configuration is not supported (Strong consistency with multiple write regions), the classic trap of the course chapter 22.
