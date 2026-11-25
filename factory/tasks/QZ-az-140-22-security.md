# Task QZ-az-140-22-security — end-of-chapter quiz, AZ-140, chapter `22-security`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-140.md` (exam level, formats, current product names and retirements), the chapter `content/az-140/course/chapters/22-security.en.md` and `.fr.md`, and the objectives in `content/az-140/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-140/quizzes/22-security.yaml`: 10 questions, ids `az140-qz-22-01` to `az140-qz-22-10`, English and French.

- Chapter objectives (each tested at least once): 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-140/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-140 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-140 22-security` → `0 problem(s)` and no warning.
