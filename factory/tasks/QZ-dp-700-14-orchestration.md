# Task QZ-dp-700-14-orchestration — end-of-chapter quiz, DP-700, chapter `14-orchestration`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-700.md` (exam level, formats, current product names and retirements), the chapter `content/dp-700/course/chapters/14-orchestration.en.md` and `.fr.md`, and the objectives in `content/dp-700/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-700/quizzes/14-orchestration.yaml`: 10 questions, ids `dp700-qz-14-01` to `dp700-qz-14-10`, English and French.

- Chapter objectives (each tested at least once): 1.4.1, 1.4.2, 1.4.3.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-700/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-700 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-700 14-orchestration` → `0 problem(s)` and no warning.
