# Task QZ-dp-600-11-security-governance — end-of-chapter quiz, DP-600, chapter `11-security-governance`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-600.md` (exam level, formats, current product names and retirements), the chapter `content/dp-600/course/chapters/11-security-governance.en.md` and `.fr.md`, and the objectives in `content/dp-600/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-600/quizzes/11-security-governance.yaml`: 10 questions, ids `dp600-qz-11-01` to `dp600-qz-11-10`, English and French.

- Chapter objectives (each tested at least once): 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-600/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-600 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-600 11-security-governance` → `0 problem(s)` and no warning.
