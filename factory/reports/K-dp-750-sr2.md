# K-dp-750-sr2 — report

5 series, 15 `series_yesno` questions, validator: 0 problem(s). Difficulty 4 × 1, 8 × 2, 3 × 3.

| Series | Domain | Objective | Answers |
| --- | --- | --- | --- |
| dp750-sr2-sales-federation | environment | 1.2.6 | No, Yes, No |
| dp750-sr2-ledger-retention | governance | 2.2.4 | Yes, No, No |
| dp750-sr2-customer-cdc | data | 3.2.4 | No, No, Yes |
| dp750-sr2-bookings-drift | data | 3.4.3 | Yes, No, No |
| dp750-sr2-bundle-bind | pipelines | 4.3.5 | No, Yes, No |

Only 4 domains exist, so `data` (the largest) has two series.

## Deviations and doubts

- **Product rename.** Learn now names bundles "Declarative Automation Bundles (formerly known as Databricks Asset Bundles)". The fr-fr page is inconsistent ("ensembles d'automatisation déclarative" in the H1, "offres groupées Automation déclaratives" in the body). The series keeps the English name with "(anciennement Databricks Asset Bundles)" in French. The profile, objectives and course still say "Databricks Asset Bundles"; the architect may want to update them.
- **Overlap with sr1.** `dp750-sr1-prod-bundle` (written in parallel) also uses 4.3.5. It tests deployment targets, while mine tests `bundle deployment bind` for an existing job, so the decision differs. sr1's other objectives are 1.1.5, 2.2.3, 3.1.9, 3.2.3, 4.4.2, with no overlap.
- `databricks bundle generate job --bind` is listed on the "bundle command group" page but not on "Migrate existing resources to a bundle", so I didn't use it. The series uses `generate` + `deployment bind` + `deploy`, as the migrate page shows.
- `VACUUM ... RETAIN n HOURS` is no longer documented on the VACUUM SQL reference page, so I didn't use it.
- Change data feed now has an "automatic" mode (managed tables with row tracking, Databricks Runtime 19+). The CDC series uses the AUTO CDC API of Lakeflow pipelines instead, so it does not depend on this.
- Reference title "bundle command group": the page H1 is `` `bundle` command group `` (with code formatting).
- French: "compte de connexion SQL" for a SQL login avoids confusion with a Unity Catalog connection; "voyage dans le temps" for time travel, "application du schéma" / "évolution du schéma" were not checked against a fr-fr page.
