# Task QZ-dp-750-22-governance — end-of-chapter quiz, DP-750, chapter `22-governance`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-750.md` (exam level, formats, current product names and retirements), the chapter `content/dp-750/course/chapters/22-governance.en.md` and `.fr.md`, and the objectives in `content/dp-750/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-750/quizzes/22-governance.yaml`: 10 questions, ids `dp750-qz-22-01` to `dp750-qz-22-10`, English and French.

- Chapter objectives (each tested at least once): 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-750/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-750 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-750 22-governance` → `0 problem(s)` and no warning.
