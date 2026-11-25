# Task QZ-ai-200-32-functions — end-of-chapter quiz, AI-200, chapter `32-functions`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/ai-200.md` (exam level, formats, current product names and retirements), the chapter `content/ai-200/course/chapters/32-functions.en.md` and `.fr.md`, and the objectives in `content/ai-200/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/ai-200/quizzes/32-functions.yaml`: 10 questions, ids `ai200-qz-32-01` to `ai200-qz-32-10`, English and French.

- Chapter objectives (each tested at least once): 3.2.1, 3.2.2.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/ai-200/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AI-200 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts ai-200 32-functions` → `0 problem(s)` and no warning.
