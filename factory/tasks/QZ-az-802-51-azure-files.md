# Task QZ-az-802-51-azure-files — end-of-chapter quiz, AZ-802, chapter `51-azure-files`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-802.md` (exam level, formats, current product names and retirements), the chapter `content/az-802/course/chapters/51-azure-files.en.md` and `.fr.md`, and the objectives in `content/az-802/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-802/quizzes/51-azure-files.yaml`: 10 questions, ids `az802-qz-51-01` to `az802-qz-51-10`, English and French.

- Chapter objectives (each tested at least once): 5.1.1, 5.1.2, 5.1.3, 5.1.4, 5.1.5, 5.1.6.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-802/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-802 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-802 51-azure-files` → `0 problem(s)` and no warning.
