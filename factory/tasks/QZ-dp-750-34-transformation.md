# Task QZ-dp-750-34-transformation — end-of-chapter quiz, DP-750, chapter `34-transformation`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-750.md` (exam level, formats, current product names and retirements), the chapter `content/dp-750/course/chapters/34-transformation.en.md` and `.fr.md`, and the objectives in `content/dp-750/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-750/quizzes/34-transformation.yaml`: 10 questions, ids `dp750-qz-34-01` to `dp750-qz-34-10`, English and French.

- Chapter objectives (each tested at least once): 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-750/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-750 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-750 34-transformation` → `0 problem(s)` and no warning.
