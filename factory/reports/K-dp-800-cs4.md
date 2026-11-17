# K-dp-800-cs4 — report

2 case studies, 12 questions, all `status: draft`. Validator: `CERT=dp-800 npx tsx factory/validate.ts --prefix dp800-cs4` → 14 files, 0 problem(s).

| Case study | Questions | Domains |
| --- | --- | --- |
| dp800-cs4a-proseware (online learning; Azure SQL Database, App Service with managed identity, RAG tutor calling Azure OpenAI, Azure Repos + Azure Pipelines) | transcript-chunks (single, 3.1.5, d2), tutor-call (dropdown sql, 3.3.2, d3), learner-masking (multi, 2.1.2, d2), tutor-identity (single, 2.1.5, d1), release-controls (dragdrop, 2.3.9, d2), quiz-progress (dropdown sql, 1.3.2, d2) | 3 |
| dp800-cs4b-relecloud (regional rail operator; Azure SQL Managed Instance Always-up-to-date, graph network, partitioned trip history, Query Store, GitHub Actions + SqlPackage) | route-search (dropdown sql, 1.3.6, d3), ticket-numbers (single, 1.1.5, d1), tripleg-window (dropdown sql, 1.1.6, d2), report-regression (single, 2.2.3, d2), hotfix-drift (single, 2.3.7, d1), feedback-vectors (yes/no, 3.2.4, d2) | 3 |

Types: single 5, dropdown 4, multi 1, yes/no 1, dragdrop 1. Difficulty: 3 easy, 7 medium, 2 hard. Dropdown share (33 %) is above the exam profile (15–25 %) because four objectives are code-completion by nature.

Objectives chosen to avoid the cs1/cs2 batches: none of the 12 objectives is tested by an earlier case-study question except 3.3.x (cs1c tests 3.3.5 extraction; mine tests 3.3.2 permission, system role and return code). No overlap check was possible with cs3 (no cs3 file existed when I started).

## Facts not verified on a fetched Learn page / doubts

- **MERGE RANGE data movement** (tripleg-window, distractor `'2024-12-01'`): Learn says to avoid merging populated partitions (up to 4x log, locking); the claim that a RANGE RIGHT merge of an empty and a populated partition moves rows is phrased as "can move rows".
- **SWITCH requirements** (empty target, same filegroup, aligned indexes): the partition switching page could not be fetched; the case states all of them so the question does not depend on the details.
- **`sp_query_store_remove_plan`** (report-regression distractor) and the SSMS report name "Regressed Queries" / « Requêtes régressées »: standard knowledge, not fetched.
- **Active Directory Integrated** needs a domain-joined or federated Windows identity (tutor-identity distractor): from knowledge; the fetched SqlClient page only lists the value.
- **vector(768) rejects other dimension counts**: the vector data type page documents error 42204 for a conversion whose element count differs from the declared dimensions; direct insertion of a vector of another size is assumed to fail the same way.
- **Dot vs cosine ranking after norm2 normalization**: mathematical property; Learn documents dot as the negative dot product and the norms of VECTOR_NORMALIZE.
- **Chat roles** (system/assistant/user) and the `2024-10-21` api-version follow the DP-800 RAG chapter, not a fetched Azure OpenAI page.
- French ADO UI names kept in English (Automatically included reviewers, Build validation, Approvals, Branch control); « phase » used for stage.
- Several Learn pages (SQL Server DDM page, ownership chains tutorial, partition switching) returned client errors; the Azure SQL DDM overview and GRANT object permissions pages were used instead.
