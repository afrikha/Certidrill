# QZ-dp-750-33-ingestion — report

File: `content/dp-750/quizzes/33-ingestion.yaml` (10 questions, `npx tsx factory/check-quiz.ts dp-750 33-ingestion` → 0 problem(s), 0 warning(s)).

Objectives: 3.2.1 (Q2, Q5), 3.2.2 (Q4), 3.2.3 (Q7), 3.2.4 (Q8), 3.2.5 (Q3, Q9), 3.2.6 (Q10), 3.2.7 (Q1, Q6). Formats 6–10: single, multi, dropdown, multi, dropdown.

Decisions chosen to avoid the mock bank (heavily covered for 3.2.x): `STREAM read_files` vs batch `read_files`; Lakeflow Connect output and compute; `query.recentProgress`; default save mode `errorifexists`; auto full refresh off by default / snapshot keeps data queryable / full refresh window; `.schema()` vs `schemaHints` with `addNewColumns`; schemaless placeholder table + `mergeSchema` in both COPY INTO option lists (and the CTAS-then-COPY INTO duplicate trap); `IGNORE NULL UPDATES` (and its `ON (columns)` form); reprocessing a Kafka stream with a new checkpoint; Event Hubs OAuth (`OAUTHBEARER`, namespace `/.default` scope, shaded callback handler).

## Chapter out of date or incomplete against current Learn (Nov 2026)

- **Event Hubs authentication** (section event-hubs): the Learn page "Authentication" (Kafka) recommends **Unity Catalog service credentials** (DBR 16.1+) for Event Hubs when Kafka streaming runs on standard (shared) access mode or serverless compute. The chapter doesn't mention service credentials at all, while the mock bank uses them (`dp750-3c-eh-service-credential-steps`, `dp750-cs4b-telemetry-stream`, `dp750-cs1b-eventhubs-read`). The same page says client ID/secret (OAuth) authentication doesn't work on Unity Catalog Lakeflow pipelines, so the chapter sentence "In a Lakeflow pipeline, the same options go in a `@dp.table` function" is misleading for Entra OAuth. Q10 therefore pins a dedicated-access-mode cluster on DBR 17.3 LTS.
- **Lakeflow Connect full refresh**: Learn ("Fully refresh target tables") now documents an **auto full refresh policy** (off by default; truncate, incompatible schema change, column rename, column added with default; `min_interval_hours` default 24) and the **full refresh window** YAML (`start_hour`, `days_of_week`, `time_zone_id`). The chapter mentions the window but not the auto policy. Learn says data stays queryable during the snapshot in its CDC (database connector) section; the chapter states it generally.
- **AUTO CDC SQL syntax**: the Learn reference "AUTO CDC INTO (pipelines)" now also has `AUTO CDC ONCE`, `SYSTEM SEQUENCE BY`, `STORED AS BITEMPORAL`, `COLUMNS TO UPDATE` and `IGNORE NULL UPDATES ON (columns)`. Not in the chapter; their release status wasn't checked and the quiz uses none of them as a correct answer (`IGNORE NULL UPDATES ON (account_id)` is only a distractor, whose behavior follows from the documented column-list form).
- **Bundles naming**: the chapter says "Databricks Asset Bundles"; the 3b question report says Learn now calls them Declarative Automation Bundles. Not re-fetched in this task.
- The chapter's claim "`STREAM read_files` is Auto Loader" is confirmed by the read_files page. That page says `inferColumnTypes` defaults to `true` for `read_files` (the opposite of Auto Loader), but its `schemaEvolutionMode` description says JSON columns are inferred as strings: Learn contradicts itself there. The chapter says nothing about `read_files` type inference (not used in the quiz).

## Not verified on a fetched page (kept, based on the chapter or general knowledge)

- Q7: that COPY INTO does not consider files loaded by a previous CTAS as already loaded. Learn says COPY INTO skips files "already loaded" and that a second COPY INTO run copies nothing; tracking is COPY INTO's own, so the CTAS distractor's explanation is a deduction.
- Q10: the ARM (`management.azure.com`) and Storage scopes being wrong for Event Hubs (general Entra knowledge); the Learn example uses the namespace host `/.default` and the token endpoint `login.microsoft.com`.
- Q1: `cloud_files_state` behavior (chapter only).
- Q3: `status` returning "the current status of the query as a dict" is on the StreamingQuery page; what the dict contains isn't.

## Doubts

- French: Kafka "topic" and "offsets" kept in English, as in the bank. « indicateurs de schéma » for schema hints and « gestionnaire de rappel » for callback handler were not checked against Learn fr-fr.
- The WebFetch hourly limit was hit once at the start of the task; all references are pages fetched after the reset.
