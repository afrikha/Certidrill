# Task QZ-az-802-52-file-shares — end-of-chapter quiz, AZ-802, chapter `52-file-shares`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-802.md` (exam level, formats, current product names and retirements), the chapter `content/az-802/course/chapters/52-file-shares.en.md` and `.fr.md`, and the objectives in `content/az-802/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-802/quizzes/52-file-shares.yaml`: 10 questions, ids `az802-qz-52-01` to `az802-qz-52-10`, English and French.

- Chapter objectives (each tested at least once): 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-802/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-802 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-802 52-file-shares` → `0 problem(s)` and no warning.
