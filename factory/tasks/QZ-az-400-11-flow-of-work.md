# Task QZ-az-400-11-flow-of-work — end-of-chapter quiz, AZ-400, chapter `11-flow-of-work`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-400.md` (exam level, formats, current product names and retirements), the chapter `content/az-400/course/chapters/11-flow-of-work.en.md` and `.fr.md`, and the objectives in `content/az-400/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-400/quizzes/11-flow-of-work.yaml`: 10 questions, ids `az400-qz-11-01` to `az400-qz-11-10`, English and French.

- Chapter objectives (each tested at least once): 1.1.1, 1.1.2, 1.1.3, 1.1.4.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-400/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-400 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-400 11-flow-of-work` → `0 problem(s)` and no warning.
