# Task QZ-dp-800-13-advanced-tsql — end-of-chapter quiz, DP-800, chapter `13-advanced-tsql`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-800.md` (exam level, formats, current product names and retirements), the chapter `content/dp-800/course/chapters/13-advanced-tsql.en.md` and `.fr.md`, and the objectives in `content/dp-800/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-800/quizzes/13-advanced-tsql.yaml`: 10 questions, ids `dp800-qz-13-01` to `dp800-qz-13-10`, English and French.

- Chapter objectives (each tested at least once): 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-800/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-800 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-800 13-advanced-tsql` → `0 problem(s)` and no warning.
