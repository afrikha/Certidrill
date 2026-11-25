# Task QZ-ai-901-11-responsible-ai — end-of-chapter quiz, AI-901, chapter `11-responsible-ai`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/ai-901.md` (exam level, formats, current product names and retirements), the chapter `content/ai-901/course/chapters/11-responsible-ai.en.md` and `.fr.md`, and the objectives in `content/ai-901/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/ai-901/quizzes/11-responsible-ai.yaml`: 10 questions, ids `ai901-qz-11-01` to `ai901-qz-11-10`, English and French.

- Chapter objectives (each tested at least once): 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/ai-901/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AI-901 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts ai-901 11-responsible-ai` → `0 problem(s)` and no warning.
