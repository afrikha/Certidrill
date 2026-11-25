# Task QZ-sc-200-15-detections — end-of-chapter quiz, SC-200, chapter `15-detections`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-200.md` (exam level, formats, current product names and retirements), the chapter `content/sc-200/course/chapters/15-detections.en.md` and `.fr.md`, and the objectives in `content/sc-200/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-200/quizzes/15-detections.yaml`: 10 questions, ids `sc200-qz-15-01` to `sc200-qz-15-10`, English and French.

- Chapter objectives (each tested at least once): 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-200/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-200 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-200 15-detections` → `0 problem(s)` and no warning.
