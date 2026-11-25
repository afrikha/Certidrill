# Task QZ-az-400-35-infrastructure-as-code — end-of-chapter quiz, AZ-400, chapter `35-infrastructure-as-code`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-400.md` (exam level, formats, current product names and retirements), the chapter `content/az-400/course/chapters/35-infrastructure-as-code.en.md` and `.fr.md`, and the objectives in `content/az-400/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-400/quizzes/35-infrastructure-as-code.yaml`: 10 questions, ids `az400-qz-35-01` to `az400-qz-35-10`, English and French.

- Chapter objectives (each tested at least once): 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.5.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-400/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-400 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-400 35-infrastructure-as-code` → `0 problem(s)` and no warning.
