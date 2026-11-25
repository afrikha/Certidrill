# Task QZ-dp-800-32-search-design — end-of-chapter quiz, DP-800, chapter `32-search-design`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-800.md` (exam level, formats, current product names and retirements), the chapter `content/dp-800/course/chapters/32-search-design.en.md` and `.fr.md`, and the objectives in `content/dp-800/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-800/quizzes/32-search-design.yaml`: 10 questions, ids `dp800-qz-32-01` to `dp800-qz-32-10`, English and French.

- Chapter objectives (each tested at least once): 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-800/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-800 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-800 32-search-design` → `0 problem(s)` and no warning.
