# Task QZ-ai-103-21-generative-apps — end-of-chapter quiz, AI-103, chapter `21-generative-apps`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/ai-103.md` (exam level, formats, current product names and retirements), the chapter `content/ai-103/course/chapters/21-generative-apps.en.md` and `.fr.md`, and the objectives in `content/ai-103/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/ai-103/quizzes/21-generative-apps.yaml`: 10 questions, ids `ai103-qz-21-01` to `ai103-qz-21-10`, English and French.

- Chapter objectives (each tested at least once): 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/ai-103/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AI-103 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts ai-103 21-generative-apps` → `0 problem(s)` and no warning.
