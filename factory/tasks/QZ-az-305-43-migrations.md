# Task QZ-az-305-43-migrations — end-of-chapter quiz, AZ-305, chapter `43-migrations`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-305.md` (exam level, formats, current product names and retirements), the chapter `content/az-305/course/chapters/43-migrations.en.md` and `.fr.md`, and the objectives in `content/az-305/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-305/quizzes/43-migrations.yaml`: 10 questions, ids `az305-qz-43-01` to `az305-qz-43-10`, English and French.

- Chapter objectives (each tested at least once): 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-305/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-305 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-305 43-migrations` → `0 problem(s)` and no warning.
