# K-ai-200-sr2 — report

5 series (15 `series_yesno` questions), prefix `ai200-sr2`, all `status: draft`. Validator: `CERT=ai-200 npx tsx factory/validate.ts --prefix ai200-sr2` → 20 files, 0 problem(s).

| Series | Domain | Objective | Answers (1/2/3) | Difficulty |
| --- | --- | --- | --- | --- |
| ai200-sr2-revision-provisioning | containers | 1.2.4 | No / Yes / No | 1 / 2 / 1 |
| ai200-sr2-profile-read | data | 2.1.1 | Yes / No / No | 2 / 3 / 1 |
| ai200-sr2-pg-connections | data | 2.2.6 | No / No / Yes | 2 / 3 / 2 |
| ai200-sr2-invoice-blobs | integration | 3.2.1 | No / No / Yes | 2 / 3 / 2 |
| ai200-sr2-partner-secret | secure-monitor | 4.1.1 | No / Yes / No | 1 / 2 / 2 |

Mix: 4 easy / 8 medium / 3 hard. Objectives chosen among the least covered in the bank.

## Deviations and doubts

- Only 4 domains exist, so 5 series cannot all be in different domains: `data` has two (different objectives and groups: Cosmos DB 2.1.1, PostgreSQL 2.2.6).
- The parallel task K-ai-200-sr1 was not visible when I chose objectives; check for overlap with its series.
- Not re-fetched (from knowledge, considered stable): `az containerapp exec --revision` flag; PostgreSQL `max_connections` server parameter; Key Vault RBAC role assignment at the scope of an individual secret.
- The WebFetch budget ran out once (Key Vault Python quickstart); `get_secret` behavior was verified on the SecretClient API reference page instead.
- Flex Consumption blob trigger: Learn says the plan "supports only" the event-based trigger and that blob triggers "must use event subscriptions"; it does not state explicitly that the Storage extension never creates the subscription (question invoice-blobs-2 relies on the tutorial's manual creation step).
