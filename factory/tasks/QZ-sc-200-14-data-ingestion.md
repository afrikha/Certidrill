# Task QZ-sc-200-14-data-ingestion — end-of-chapter quiz, SC-200, chapter `14-data-ingestion`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-200.md` (exam level, formats, current product names and retirements), the chapter `content/sc-200/course/chapters/14-data-ingestion.en.md` and `.fr.md`, and the objectives in `content/sc-200/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-200/quizzes/14-data-ingestion.yaml`: 10 questions, ids `sc200-qz-14-01` to `sc200-qz-14-10`, English and French.

- Chapter objectives (each tested at least once): 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-200/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-200 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-200 14-data-ingestion` → `0 problem(s)` and no warning.
