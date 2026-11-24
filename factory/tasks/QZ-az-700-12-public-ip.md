# Task QZ-az-700-12-public-ip — end-of-chapter quiz, AZ-700, chapter `12-public-ip`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-700.md` (exam level, formats, current product names and retirements), the chapter `content/az-700/course/chapters/12-public-ip.en.md` and `.fr.md`, and the objectives in `content/az-700/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-700/quizzes/12-public-ip.yaml`: 10 questions, ids `az700-qz-12-01` to `az700-qz-12-10`, English and French.

- Chapter objectives (each tested at least once): 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-700/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-700 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-700 12-public-ip` → `0 problem(s)` and no warning.
