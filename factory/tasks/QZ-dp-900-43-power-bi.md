# Task QZ-dp-900-43-power-bi — end-of-chapter quiz, DP-900, chapter `43-power-bi`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-900.md` (exam level, formats, current product names and retirements), the chapter `content/dp-900/course/chapters/43-power-bi.en.md` and `.fr.md`, and the objectives in `content/dp-900/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-900/quizzes/43-power-bi.yaml`: 10 questions, ids `dp900-qz-43-01` to `dp900-qz-43-10`, English and French.

- Chapter objectives (each tested at least once): 4.3.1, 4.3.2, 4.3.3.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-900/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-900 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-900 43-power-bi` → `0 problem(s)` and no warning.
