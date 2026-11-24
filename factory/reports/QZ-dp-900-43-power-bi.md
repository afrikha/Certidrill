# QZ-dp-900-43-power-bi — report

File: `content/dp-900/quizzes/43-power-bi.yaml` (10 questions, objectives 4.3.1 ×4, 4.3.2 ×3, 4.3.3 ×3). Check: `npx tsx factory/check-quiz.ts dp-900 43-power-bi` → 0 problem(s), 0 warning(s).

## Chapter out of date / incomplete against current Learn (Nov. 2026)

- **Report alerts.** The chapter's table says reports have no data alerts ("Data alerts: No"). The Learn dashboard page still says so, but "Set data alerts in the Power BI service" now notes that alerts on **reports** are created with **Fabric Activator** ("Create Fabric Activator alerts in Power BI reports"). Suggest a nuance in the chapter: classic data alerts are on dashboard tiles (card, KPI, gauge only, numeric data); report visuals use Activator. Q9 avoids depending on this (its distractors are subscription, scheduled refresh, slicer).
- **Data alert tile types.** Learn: alerts only on gauge, KPI and card tiles. The chapter says "Yes, on tiles" without this limit; worth adding.
- **DirectQuery "no scheduled refresh".** Correct for model data, but Learn notes that DirectQuery dashboard tiles have a cache refreshed on a schedule (hourly by default). Minor.
- **Direct Lake sources.** Learn now lists Direct Lake on OneLake and Direct Lake on SQL, over Fabric items whose storage resolves to Delta tables (lakehouse, warehouse, SQL database in Fabric, mirrored databases...). The chapter's "Delta tables in OneLake" stays correct at DP-900 level.
- **Snowflake guidance.** Learn's star-schema guidance says a hierarchy cannot span several tables of a snowflake dimension, and recommends denormalizing into one table. Not in the chapter; not tested.

## Doubts / choices

- Q6 has three options (Import, DirectQuery, Direct Lake) instead of four: Dual mode was not in the chapter and could not be verified (WebFetch hourly limit reached).
- Q7 deliberately has no KPI item, because the chapter puts KPI and gauge in the same row ("progress toward a target"): with both, target t2 would be ambiguous.
- Q10 relies on filter propagation through a chain of relationships (Category–Subcategory–Product–Sales), implied by the chapter's snowflake definition and stated in the star-schema guidance page.
- The mock-exam bank already covers nearly every fact of this chapter (51 questions); the quiz avoids their decisions by combining facts (dashboard over two semantic models + alert, DirectQuery vs Direct Lake for a non-Fabric source, gauge/card/column/scatter traps, publish-and-refresh workflow).
