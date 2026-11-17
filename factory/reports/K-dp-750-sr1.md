# K-dp-750-sr1 — report

6 Yes/No series (18 `series_yesno` questions), validator: `CERT=dp-750 npx tsx factory/validate.ts --prefix dp750-sr1` → 24 files, 0 problem(s).

| Series | Domain | Objective | Decision tested | Answers |
| --- | --- | --- | --- | --- |
| dp750-sr1-restart-compute | environment | 1.1.5 | Compute ACL: CAN ATTACH TO / CAN MANAGE / CAN RESTART | N N Y |
| dp750-sr1-emea-orders | governance | 2.2.3 | Row filter with `is_account_group_member` / column mask / dynamic view + REVOKE | Y N N |
| dp750-sr1-nightly-orders | data | 3.2.3 | INSERT INTO + batch `read_files` / COPY INTO / CREATE OR REPLACE TABLE AS | N Y N |
| dp750-sr1-device-layout | data | 3.1.9 | Partition + CLUSTER BY (incompatible) / partition by high-cardinality column / liquid clustering + ALTER CLUSTER BY | N N Y |
| dp750-sr1-failed-transform | pipelines | 4.4.2 | Run now / Repair run / interactive notebooks | N Y N |
| dp750-sr1-prod-bundle | pipelines | 4.3.5 | `bundle deploy -t prod` / `bundle deploy` (default dev) / `validate` + `run` | Y N N |

Difficulty: 5 easy, 9 medium, 4 hard. Each series has exactly one Yes; Yes positions 3, 1, 2, 3, 2, 1.

## Deviations and doubts

- Domains: 6 series over 4 domains, so data and pipelines have two series each (different objectives).
- **Rename:** Learn now calls the product "Declarative Automation Bundles" (formerly Databricks Asset Bundles; CLI still `databricks bundle`). The prod-bundle series uses the new name with the former one in parentheses. The objectives file and the course still say "Databricks Asset Bundles": the course writers should be told.
- prod-bundle-3: the bundle-commands page does not state for jobs that `bundle run` does not deploy first (it says so only for apps: "most recently deployed source code"). The explanation relies on this.
- nightly-orders-1: the read_files page says it uses Auto Loader only in streaming table queries and lists file-tracking options only for streaming; it does not say in so many words that a batch query rereads every file.
- failed-transform: the repair page does not explicitly say the original run's status becomes successful after a successful repair (it says the run duration extends to the latest repair). The No for interactive notebooks rests on the run staying failed.
- French: job = « travail », task = « tâche » (fr-fr repair page); "job compute" rendered « calcul de travaux (job compute) », "all-purpose compute" « calcul polyvalent (all-purpose) » (not checked on fr-fr). UI buttons kept in English (Run now, Repair run).
