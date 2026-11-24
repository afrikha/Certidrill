# Task QZ-ai-901-23-vision-image-generation — end-of-chapter quiz, AI-901, chapter `23-vision-image-generation`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/ai-901.md` (exam level, formats, current product names and retirements), the chapter `content/ai-901/course/chapters/23-vision-image-generation.en.md` and `.fr.md`, and the objectives in `content/ai-901/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/ai-901/quizzes/23-vision-image-generation.yaml`: 10 questions, ids `ai901-qz-23-01` to `ai901-qz-23-10`, English and French.

- Chapter objectives (each tested at least once): 2.3.1, 2.3.2, 2.3.3.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/ai-901/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AI-901 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts ai-901 23-vision-image-generation` → `0 problem(s)` and no warning.
