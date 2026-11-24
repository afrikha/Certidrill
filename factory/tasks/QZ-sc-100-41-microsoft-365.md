# Task QZ-sc-100-41-microsoft-365 — end-of-chapter quiz, SC-100, chapter `41-microsoft-365`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/sc-100.md` (exam level, formats, current product names and retirements), the chapter `content/sc-100/course/chapters/41-microsoft-365.en.md` and `.fr.md`, and the objectives in `content/sc-100/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/sc-100/quizzes/41-microsoft-365.yaml`: 10 questions, ids `sc100-qz-41-01` to `sc100-qz-41-10`, English and French.

- Chapter objectives (each tested at least once): 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/sc-100/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real SC-100 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts sc-100 41-microsoft-365` → `0 problem(s)` and no warning.
