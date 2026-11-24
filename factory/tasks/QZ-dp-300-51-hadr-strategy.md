# Task QZ-dp-300-51-hadr-strategy — end-of-chapter quiz, DP-300, chapter `51-hadr-strategy`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-300.md` (exam level, formats, current product names and retirements), the chapter `content/dp-300/course/chapters/51-hadr-strategy.en.md` and `.fr.md`, and the objectives in `content/dp-300/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-300/quizzes/51-hadr-strategy.yaml`: 10 questions, ids `dp300-qz-51-01` to `dp300-qz-51-10`, English and French.

- Chapter objectives (each tested at least once): 5.1.1, 5.1.2, 5.1.3, 5.1.4.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-300/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-300 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-300 51-hadr-strategy` → `0 problem(s)` and no warning.
