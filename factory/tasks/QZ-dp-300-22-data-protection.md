# Task QZ-dp-300-22-data-protection — end-of-chapter quiz, DP-300, chapter `22-data-protection`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-300.md` (exam level, formats, current product names and retirements), the chapter `content/dp-300/course/chapters/22-data-protection.en.md` and `.fr.md`, and the objectives in `content/dp-300/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-300/quizzes/22-data-protection.yaml`: 10 questions, ids `dp300-qz-22-01` to `dp300-qz-22-10`, English and French.

- Chapter objectives (each tested at least once): 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-300/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-300 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-300 22-data-protection` → `0 problem(s)` and no warning.
