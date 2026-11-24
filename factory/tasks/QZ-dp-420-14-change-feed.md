# Task QZ-dp-420-14-change-feed — end-of-chapter quiz, DP-420, chapter `14-change-feed`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-420.md` (exam level, formats, current product names and retirements), the chapter `content/dp-420/course/chapters/14-change-feed.en.md` and `.fr.md`, and the objectives in `content/dp-420/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-420/quizzes/14-change-feed.yaml`: 10 questions, ids `dp420-qz-14-01` to `dp420-qz-14-10`, English and French.

- Chapter objectives (each tested at least once): 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-420/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-420 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-420 14-change-feed` → `0 problem(s)` and no warning.
