# Task QZ-sc-100-43-data — end-of-chapter quiz, SC-100, chapter `43-data`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-100.md` (exam level, formats, current product names and retirements), the chapter `content/sc-100/course/chapters/43-data.en.md` and `.fr.md`, and the objectives in `content/sc-100/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-100/quizzes/43-data.yaml`: 10 questions, ids `sc100-qz-43-01` to `sc100-qz-43-10`, English and French.

- Chapter objectives (each tested at least once): 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6, 4.3.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-100/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-100 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-100 43-data` → `0 problem(s)` and no warning.
