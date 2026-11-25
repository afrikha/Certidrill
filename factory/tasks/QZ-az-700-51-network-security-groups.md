# Task QZ-az-700-51-network-security-groups — end-of-chapter quiz, AZ-700, chapter `51-network-security-groups`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-700.md` (exam level, formats, current product names and retirements), the chapter `content/az-700/course/chapters/51-network-security-groups.en.md` and `.fr.md`, and the objectives in `content/az-700/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-700/quizzes/51-network-security-groups.yaml`: 10 questions, ids `az700-qz-51-01` to `az700-qz-51-10`, English and French.

- Chapter objectives (each tested at least once): 5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.1.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-700/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-700 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-700 51-network-security-groups` → `0 problem(s)` and no warning.
