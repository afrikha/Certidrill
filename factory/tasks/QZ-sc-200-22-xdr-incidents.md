# Task QZ-sc-200-22-xdr-incidents — end-of-chapter quiz, SC-200, chapter `22-xdr-incidents`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-200.md` (exam level, formats, current product names and retirements), the chapter `content/sc-200/course/chapters/22-xdr-incidents.en.md` and `.fr.md`, and the objectives in `content/sc-200/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-200/quizzes/22-xdr-incidents.yaml`: 10 questions, ids `sc200-qz-22-01` to `sc200-qz-22-10`, English and French.

- Chapter objectives (each tested at least once): 2.1.7, 2.1.8, 2.1.9, 2.1.10.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-200/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-200 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-200 22-xdr-incidents` → `0 problem(s)` and no warning.
