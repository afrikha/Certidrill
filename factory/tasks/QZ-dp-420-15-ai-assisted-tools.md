# Task QZ-dp-420-15-ai-assisted-tools — end-of-chapter quiz, DP-420, chapter `15-ai-assisted-tools`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-420.md` (exam level, formats, current product names and retirements), the chapter `content/dp-420/course/chapters/15-ai-assisted-tools.en.md` and `.fr.md`, and the objectives in `content/dp-420/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-420/quizzes/15-ai-assisted-tools.yaml`: 10 questions, ids `dp420-qz-15-01` to `dp420-qz-15-10`, English and French.

- Chapter objectives (each tested at least once): 1.5.1, 1.5.2.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-420/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-420 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-420 15-ai-assisted-tools` → `0 problem(s)` and no warning.
