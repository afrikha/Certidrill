# Task QZ-sc-500-34-app-platform — end-of-chapter quiz, SC-500, chapter `34-app-platform`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-500.md` (exam level, formats, current product names and retirements), the chapter `content/sc-500/course/chapters/34-app-platform.en.md` and `.fr.md`, and the objectives in `content/sc-500/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-500/quizzes/34-app-platform.yaml`: 10 questions, ids `sc500-qz-34-01` to `sc500-qz-34-10`, English and French.

- Chapter objectives (each tested at least once): 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8, 3.3.9.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-500/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-500 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-500 34-app-platform` → `0 problem(s)` and no warning.
