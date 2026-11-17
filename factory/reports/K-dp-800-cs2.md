# K-dp-800-cs2 — report

3 case studies, 18 questions, all `status: draft`. Validator: `CERT=dp-800 npx tsx factory/validate.ts --prefix dp800-cs2` → 21 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type) |
| --- | --- | --- |
| dp800-cs2a-lamna-healthcare | Healthcare, Azure SQL Database + Azure OpenAI + DAB 2.0 patient portal | national-id (2.1.1 single), openai-identity (2.1.7 multi), device-readings (1.1.3 dropdown), embedding-refresh (3.1.3 single), embedding-text (3.1.4 single), portal-dab (2.4.2 dropdown) |
| dp800-cs2b-munsons-pickles | Food manufacturing, on-premises SQL Server 2025, SDK-style SQL project on GitHub | supplier-duplicates (1.3.5 single), lot-regex (1.3.4 yes/no), spec-fulltext (3.2.2 ordering), report-blocking (2.2.2 single), price-changes (2.4.7 single), merge-controls (2.3.9 dropdown) |
| dp800-cs2c-fabrikam-residences | Real-estate rentals, Azure SQL Database vector/hybrid search, Foundry agent through DAB SQL MCP Server | search-approach (3.2.1 dragdrop), vector-index (3.2.3 dropdown), ann-enn (3.2.5 yes/no), rrf-query (3.2.9 single), copilot-conventions (1.4.4 single), mcp-endpoint (2.1.8 multi) |

Mix: single 8, dropdown 4, multi 2, yes/no 2, dragdrop 1, ordering 1. Difficulty: 5 easy / 10 medium / 3 hard.

## Overlap with K-dp-800-cs1 (written in parallel)

cs1 already covered several decisions with the same answer, so I changed mine to test other decisions:
- Embedding maintenance: cs1a answers "change tracking + Functions SQL trigger"; cs2a answers "AFTER trigger" (requirement: same-transaction consistency, no extra component).
- Always Encrypted: cs1c maps NationalID → deterministic; cs2a needs LIKE on a prefix → secure enclaves + randomized.
- Managed identity for the model endpoint: cs1c is SQL Server (sp_configure, credentials); cs2a is about the Azure RBAC role of the server identity + GRANT EXECUTE ON EXTERNAL MODEL.
- RRF: cs1a is a dropdown on the query (COALESCE, FULL OUTER JOIN); cs2c is a weighted-score computation.
- DAB entity: cs1a tests runtime cache/fields/static policy; cs2a tests view source type, primary-key field and a claims policy.
- Pipeline: cs1b orders build/DeployReport/approval/Publish; cs2b tests PR status checks and CODEOWNERS with branch protection.
- Chunking OVERLAP was dropped from cs2a (cs1b tests it).

## Facts that were not fully verified on Learn

- `Require review from Code Owners` (GitHub branch protection) comes from GitHub knowledge; the Learn units only show CODEOWNERS syntax and say that GitHub uses branch protection rules or rulesets.
- The role `Cognitive Services OpenAI User` for the Azure SQL server identity comes from the sp_invoke_external_rest_endpoint page; the CREATE EXTERNAL MODEL page names `Cognitive Services OpenAI Contributor` for SQL Server enabled by Arc. To avoid ambiguity, Contributor is not used as a distractor.
- `GRANT EXECUTE ON EXTERNAL MODEL` is enough for AI_GENERATE_EMBEDDINGS according to CREATE EXTERNAL MODEL. Whether REFERENCES on the credential is also needed is not documented, so it is not offered as an option.
- Learn shows REGEXP_SPLIT_TO_TABLE only on a literal; the CROSS APPLY on a column (cs2b s3) is standard TVF usage.
- JARO_WINKLER_DISTANCE: range not documented; the explanation only uses the Learn example value (0.033).
- On SQL Server 2025, fuzzy matching needs PREVIEW_FEATURES (fuzzy overview page). No compatibility-level requirement is documented, so the case sets compatibility level 170.
- The AE enclaves reference title is assumed to be "Always Encrypted with secure enclaves" (the H1 was not returned).
- The study guide's fr-fr page says "ANN and KNN" and drops CES from 3.1.3; the wording here follows objectives.yaml (ENN, "exact nearest neighbors").
