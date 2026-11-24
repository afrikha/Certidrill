# Task QZ-dp-750-11-compute — end-of-chapter quiz, DP-750, chapter `11-compute`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-750.md` (exam level, formats, current product names and retirements), the chapter `content/dp-750/course/chapters/11-compute.en.md` and `.fr.md`, and the objectives in `content/dp-750/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-750/quizzes/11-compute.yaml`: 10 questions, ids `dp750-qz-11-01` to `dp750-qz-11-10`, English and French.

- Chapter objectives (each tested at least once): 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-750/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-750 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-750 11-compute` → `0 problem(s)` and no warning.
