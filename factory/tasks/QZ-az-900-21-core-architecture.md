# Task QZ-az-900-21-core-architecture — end-of-chapter quiz, AZ-900, chapter `21-core-architecture`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-900.md` (exam level, formats, current product names and retirements), the chapter `content/az-900/course/chapters/21-core-architecture.en.md` and `.fr.md`, and the objectives in `content/az-900/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-900/quizzes/21-core-architecture.yaml`: 10 questions, ids `az900-qz-21-01` to `az900-qz-21-10`, English and French.

- Chapter objectives (each tested at least once): 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-900/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-900 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-900 21-core-architecture` → `0 problem(s)` and no warning.
