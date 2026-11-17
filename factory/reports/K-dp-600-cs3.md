# K-dp-600-cs3 — report

3 case studies, 17 questions, all `status: draft`. Validator: `CERT=dp-600 npx tsx factory/validate.ts --prefix dp600-cs3` gives 20 files, 0 problem(s).

| Case study | Industry / architecture | Questions (objective, type, difficulty) |
| --- | --- | --- |
| dp600-cs3a-consolidated-messenger | Parcel logistics: eventhouse plus Direct Lake lakehouse model | scans-onelake (2.1.5 single 2), kql-exceptions (2.3.3 dropdown 2), route-store (2.1.4 single 1), late-routes (3.2.2 single 3), workspace-roles (1.1.1 dragdrop 1) |
| dp600-cs3b-munsons | Food manufacturing: warehouse plus Import model, Git | plant-batches (2.2.1 single 2), batch-types (2.2.8 dropdown 3), ship-date (3.1.2 multi 2), reusable-assets (1.2.6 dragdrop 2), pbip-repo (1.2.2 yesno 1), label-inheritance (1.1.4 yesno 3) |
| dp600-cs3c-graphic-design-institute | University: medallion lakehouse, Direct Lake on SQL, S3 data | enrollment-view (3.2.3 single 2), program-share (3.1.4 dropdown 2), faculty-query (2.3.4 dropdown 2), student-ols (1.1.3 multi 2), students-badge (1.1.5 single 1), research-shortcut (2.1.3 single 2) |

Types: 7 single, 4 dropdown, 2 multi, 2 dragdrop, 2 yes/no, no ordering. Difficulty: 4 easy, 10 medium, 3 hard.

## Deviations

- My first draft covered decisions that the cs1, cs2 and cs4 case studies already test with the same answer: mirroring Azure SQL Database, ROW_NUMBER dedup, parameter rules, DirectLakeOnly or automatic updates, Direct Lake on OneLake with an Import table, XMLA Read Write, RLS with the Viewer role, incremental refresh steps, Dual dimensions, and Performance analyzer. I replaced those questions with objectives that no other case study covers yet: 2.1.4, 2.2.1, 2.2.8, 2.3.4, 3.1.2, 3.2.2, 1.2.2, 1.2.6, and OLS for 1.1.3.
- The WebFetch budget, which all agents share, ran out once during the task. Every reference was fetched later in the task.

## Facts to double-check before review

- dp600-cs3b-plant-batches: the T-SQL surface area page says only that Fabric Data Warehouse supports "functions". I did not find a Learn page that names inline table-valued functions for Warehouse. The mirroring page lists inline TVFs for the SQL analytics endpoint.
- dp600-cs3c-faculty-query: TREATAS as a filter argument of SUMMARIZECOLUMNS matches the examples on the SUMMARIZECOLUMNS page. I did not fetch the TREATAS page itself.
- dp600-cs3a-late-routes: the claim that SUMX with a context transition per row is slower than the original is general DAX guidance, not a statement from the fetched page.
- dp600-cs3c-student-ols: the OLS page does not mention Direct Lake. The Direct Lake overview says both flavors support semantic model OLS.
- dp600-cs3b-label-inheritance: on the downstream inheritance page, the default mode (user consent or fully automated) is ambiguous. The case sets user consent mode explicitly, and the answers are the same in both modes.
- French UI labels that I could not verify on fr-fr pages stay in English: "Keep your Direct Lake data up to date", Apply to existing tables, Direct Lake behavior, Discourage implicit measures, Start recording, Run in DAX query view, Security page, Master data badge.
