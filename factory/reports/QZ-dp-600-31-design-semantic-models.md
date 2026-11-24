# QZ-dp-600-31-design-semantic-models — notes

`content/dp-600/quizzes/31-design-semantic-models.yaml`: 10 questions, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 3.1.1 (q1), 3.1.2 (q2), 3.1.3 (q3, q10), 3.1.4 (q6, q7), 3.1.5 (q4, q9), 3.1.6 (q5), 3.1.7 (q8). Positions 6–10: single, dropdown, multi, dropdown, single.

## Chapter vs current Learn (fix in the chapter, not done here)

- **Large semantic model format, Pro workspaces**: Learn now says the format can be enabled for F, P and A SKUs, PPU, "and Pro workspaces assigned to *Reserved Capacity for Pro Workspaces*", with a 1 GB limit for those. The chapter says "Pro workspaces stay at 1 GB" without the new reserved-capacity option. Learn also adds that Pro workspaces don't support XMLA write operations.
- **Large format, workspace default**: Learn says the workspace setting applies to new semantic models and that existing models need the per-model setting ("For existing semantic models, only step 3 is necessary"). Consistent with the chapter's "for new models".
- **Hybrid tables**: the incremental refresh page no longer uses the term "hybrid table"; it describes the option "Get the latest data in real time with DirectQuery (Premium only)" (Premium, PPU, Embedded; single source; folding required, no non-folding steps). The chapter's "Hybrid table" row is fine, but Learn's option name could be added.
- **Calculation item order**: the Power BI calculation groups page describes reordering items by moving them up or down in the Calculation items section of the Properties pane; Ordinal appears only in the TMDL sample (`sortByColumn: Ordinal`). The chapter's "the Ordinal column orders the items" is correct but doesn't say how to change it in Desktop.
- **Composite models**: Learn lists more unsupported sources than the chapter (SSAS Tabular before 2022, real-time and sample semantic models, Excel Online Refresh, usage metrics) and notes that Build permission may be required for viewers when reports are in a Pro workspace. Learn's page is inconsistent on calculation groups: the limitations list says calculation groups on remote sources aren't supported "with undefined query results", while another section describes remote calculation groups affecting remote measures. The quiz avoids this point.
- Confirmed as written: date table validations (unique, no nulls, contiguous, same time for Date/Time), many-to-many guidance (one bidirectional relationship on the bridge, star schema instead of fact-to-fact, ISFILTERED for higher-grain targets), RLS single-direction default and "Apply security filter in both directions", SELECTEDMEASURE only in calculation items and format strings, `Orders YOY%` via CALCULATE on the calculation group column, dynamic format string `#,##0.00%`, variant data type, 10 GB Desktop upload limit, RLS can't be defined on remote tables, data types of remote columns can't be changed, My workspace models unsupported as sources, chain of three.

## Not verified on a fetched page

- q6: that ISINSCOPE on the parent column (Category) is also TRUE on child (Product) rows. The ISINSCOPE page's example tests the lower level first, which implies it, but doesn't state it.
- q7: that ISINSCOPE is FALSE for a column filtered only by a slicer (the ISINSCOPE page doesn't address it); ISFILTERED/ISCROSSFILTERED behaviour is from their pages.
- q9: that ISSELECTEDMEASURE can't serve as a CALCULATE filter (its page wasn't fetched; the explanation says only that it is meant for calculation item expressions).
- q10: the explanation of why the RLS filter stops at the bridge is reasoning from "RLS filtering uses single-directional filters" on the RLS page.

## Design notes

- The bank covers these objectives densely (about 100 questions). New decisions used: hybrid table (real-time DirectQuery partition), date table validation failure, fact-to-fact many-to-many replaced by shared dimensions, ordering calculation items, license modes and Desktop upload limit of the large format, SWITCH/ISINSCOPE test order, ISFILTERED vs ISINSCOPE/ISCROSSFILTERED/HASONEVALUE for higher-grain targets, what can be added to a DirectQuery-to-semantic-model composite, calculation item format string + measure that applies an item, RLS through a bridge.
- No preview feature is a correct answer.
