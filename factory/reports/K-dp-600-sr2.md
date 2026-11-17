# K-dp-600-sr2 — report

Five Yes/No series (3 questions each, prefix `dp600-sr2`), 15 `series_yesno` questions, all `status: draft`.

| Series | Objective | Answers (1/2/3) |
| --- | --- | --- |
| dp600-sr2-sales-tables-access | 1.1.2 (maintain) | No / Yes / No |
| dp600-sr2-customer-order-count | 2.2.6 (prepare) | No / No / Yes |
| dp600-sr2-city-profit-view | 2.3.1 (prepare) | Yes / No / No |
| dp600-sr2-category-targets | 3.1.3 (semantic-models) | No / Yes / No |
| dp600-sr2-sales-amount | 3.1.4 (semantic-models) | No / No / Yes |

Difficulty: 5 easy, 8 medium, 2 hard.

Notes and deviations:

- Only three domains exist, so "different domain" was read as spread across the three domains (1 / 2 / 2).
- Objectives were chosen to avoid decisions already tested by the DP-600 case studies (workspace roles, calculation groups vs field parameters, .pbit/.pbids, KQL arg_max/bin, dedup were already covered). The sr1 batch was not on disk when this batch was written, so overlap with sr1 was not checked.
- Fabric warehouse schema-level GRANT (`GRANT SELECT ON SCHEMA::`) was not confirmed on Learn, so the series uses object-level GRANT only. Sharing a warehouse with Entra guest users was not verified, so the auditor is an internal user.
- The Learn page "Many-to-many relationships in Power BI Desktop" no longer covers cardinality or cross-filter settings; the series relies on "Many-to-many relationship guidance" (higher-grain facts: many-to-many on Category, single direction from dimension to fact).
- 2.2.6 explanations on the WHERE-vs-ON outer-join behaviour cite only the COUNT (Transact-SQL) page; no Learn join page was fetched (web-fetch budget ran out once during the task).
- French UI labels of the visual query editor follow the DP-600 course chapter 23 (Nouvelle requête visuelle, Enregistrer en tant que vue / table, Visualiser les résultats); Power Query labels Combiner > Fusionner des requêtes comme nouvelles, Transformer > Regrouper par, Interne, Somme were not checked against the French Fabric UI.
