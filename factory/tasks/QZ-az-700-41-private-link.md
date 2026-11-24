# Task QZ-az-700-41-private-link — end-of-chapter quiz, AZ-700, chapter `41-private-link`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-700.md` (exam level, formats, current product names and retirements), the chapter `content/az-700/course/chapters/41-private-link.en.md` and `.fr.md`, and the objectives in `content/az-700/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-700/quizzes/41-private-link.yaml`: 10 questions, ids `az700-qz-41-01` to `az700-qz-41-10`, English and French.

- Chapter objectives (each tested at least once): 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-700/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-700 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-700 41-private-link` → `0 problem(s)` and no warning.
