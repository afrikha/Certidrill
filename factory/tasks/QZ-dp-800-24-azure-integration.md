# Task QZ-dp-800-24-azure-integration — end-of-chapter quiz, DP-800, chapter `24-azure-integration`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-800.md` (exam level, formats, current product names and retirements), the chapter `content/dp-800/course/chapters/24-azure-integration.en.md` and `.fr.md`, and the objectives in `content/dp-800/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-800/quizzes/24-azure-integration.yaml`: 10 questions, ids `dp800-qz-24-01` to `dp800-qz-24-10`, English and French.

- Chapter objectives (each tested at least once): 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6, 2.4.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-800/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-800 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-800 24-azure-integration` → `0 problem(s)` and no warning.
