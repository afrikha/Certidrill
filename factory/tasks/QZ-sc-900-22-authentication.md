# Task QZ-sc-900-22-authentication — end-of-chapter quiz, SC-900, chapter `22-authentication`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-900.md` (exam level, formats, current product names and retirements), the chapter `content/sc-900/course/chapters/22-authentication.en.md` and `.fr.md`, and the objectives in `content/sc-900/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-900/quizzes/22-authentication.yaml`: 10 questions, ids `sc900-qz-22-01` to `sc900-qz-22-10`, English and French.

- Chapter objectives (each tested at least once): 2.2.1, 2.2.2, 2.2.3.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-900/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-900 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-900 22-authentication` → `0 problem(s)` and no warning.
