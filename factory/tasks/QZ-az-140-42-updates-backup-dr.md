# Task QZ-az-140-42-updates-backup-dr — end-of-chapter quiz, AZ-140, chapter `42-updates-backup-dr`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-140.md` (exam level, formats, current product names and retirements), the chapter `content/az-140/course/chapters/42-updates-backup-dr.en.md` and `.fr.md`, and the objectives in `content/az-140/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-140/quizzes/42-updates-backup-dr.yaml`: 10 questions, ids `az140-qz-42-01` to `az140-qz-42-10`, English and French.

- Chapter objectives (each tested at least once): 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-140/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-140 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-140 42-updates-backup-dr` → `0 problem(s)` and no warning.
