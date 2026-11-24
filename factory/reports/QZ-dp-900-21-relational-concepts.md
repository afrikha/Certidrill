# QZ-dp-900-21-relational-concepts — report

File: `content/dp-900/quizzes/21-relational-concepts.yaml` (10 questions, `dp900-qz-21-01`…`10`). Check: 0 problem(s), 0 warning(s).

Coverage: 2.1.1 (Q1, Q5), 2.1.2 (Q3, Q7, Q9), 2.1.3 (Q2, Q4, Q8), 2.1.4 (Q6, Q10). Positions 6–10: dropdown, dragdrop, single, yesno ×2.

Pages fetched (Nov. 24, 2026): DP-900 module "Explore fundamental relational data concepts", units 2 (relational data), 3 (normalization), 4 (SQL), 5 (database objects).

## Doubts / facts not stated word for word on the fetched pages
- Q5 (ALTER TABLE ... ADD nullable column → existing rows contain NULL): deduced from "each row has the same columns" + NULL; standard SQL Server behaviour, not stated on the Learn unit.
- Q8 (JOIN result): relies on the JOIN returning one row per matching order; every order has a matching customer, so inner/outer join semantics don't matter.
- Q10 s1 ("a query on the view can use the index on Total"): the Learn unit says the optimizer can use an index when a query filters on its column, and may ignore it on small tables; the table is stated large (40 million rows). Wording "can use" kept on purpose.
- Q6 (staging table: create no index): reasoning from the unit's index costs (maintained at every insert) and "useful when the query filters on the column".

## Mock bank
- The 2.1.x mock bank (≈75 questions) already covers nearly every recall decision; the quiz tests other decisions (insert refused by referential integrity, UPDATE without WHERE, NULL in an added column, attributes placed per entity, join row count, view + index side effects, no index on a staging table). No issue found in the chapter against current Learn.
