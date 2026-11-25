# Task QZ-az-305-44-networking — end-of-chapter quiz, AZ-305, chapter `44-networking`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/az-305.md` (exam level, formats, current product names and retirements), the chapter `content/az-305/course/chapters/44-networking.en.md` and `.fr.md`, and the objectives in `content/az-305/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/az-305/quizzes/44-networking.yaml`: 10 questions, ids `az305-qz-44-01` to `az305-qz-44-10`, English and French.

- Chapter objectives (each tested at least once): 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/az-305/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AZ-305 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-305 44-networking` → `0 problem(s)` and no warning.
