# QZ-dp-900-13-data-workloads — report

File: `content/dp-900/quizzes/13-data-workloads.yaml` (10 questions, objectives 1.3.1 ×4, 1.3.2 ×6). Check: `npx tsx factory/check-quiz.ts dp-900 13-data-workloads` → 0 problem(s), 0 warning(s).

Pages fetched (2026-11-24): Explore transactional data processing (`explore-core-data-concepts/5-transactional-data-processing`), Explore analytical data processing (`explore-core-data-concepts/6-analytical-processing`).

## Chapter vs current Learn
- No outdated or wrong fact found. ACID, OLTP/CRUD/LOB, the four analytical steps, ETL/ELT, lake/warehouse/lakehouse/semantic model and the "who uses which layer" table all match the current pages.
- Minor generalization: the chapter says "analytical schemas may denormalize"; Learn states it in the lakehouse paragraph ("the table schema may require some denormalization of data in an OLTP data source"). Q10 relies on the chapter's general wording (tables of an analytical store); it is standard and consistent with Learn, but not word for word.
- Learn now adds that ELT is "common in modern lakehouses" and that Power BI semantic models are a common example of a semantic model; the chapter does not say so (not needed for the quiz).

## Doubts
- The mock bank already has 24 questions on 1.3.1/1.3.2, covering almost every fact of the chapter. The quiz avoids their scenarios and decisions (e.g. durability after the commit instead of atomicity before it; ACID naming traps; nightly copy = analytical; structure step; ELT + lakehouse + semantic model in one scenario; denormalization), but some facts are necessarily reused.
- Q2 (consistency, "no money appeared or vanished"): a candidate could argue atomicity; the stem says "valid state" and the chapter maps this exact example to consistency, so the answer is defensible, but it is the classic grey zone of ACID.
