# Task QZ-az-120-21-compute — end-of-chapter quiz, AZ-120, chapter `21-compute`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-120.md` (exam level, formats, current product names and retirements), the chapter `content/az-120/course/chapters/21-compute.en.md` and `.fr.md`, and the objectives in `content/az-120/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-120/quizzes/21-compute.yaml`: 10 questions, ids `az120-qz-21-01` to `az120-qz-21-10`, English and French.

- Chapter objectives (each tested at least once): 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-120/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-120 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-120 21-compute` → `0 problem(s)` and no warning.
