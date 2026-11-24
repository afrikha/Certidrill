# Task QZ-ai-300-33-prompt-management — end-of-chapter quiz, AI-300, chapter `33-prompt-management`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/ai-300.md` (exam level, formats, current product names and retirements), the chapter `content/ai-300/course/chapters/33-prompt-management.en.md` and `.fr.md`, and the objectives in `content/ai-300/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/ai-300/quizzes/33-prompt-management.yaml`: 10 questions, ids `ai300-qz-33-01` to `ai300-qz-33-10`, English and French.

- Chapter objectives (each tested at least once): 3.3.1, 3.3.2, 3.3.3.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/ai-300/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real AI-300 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts ai-300 33-prompt-management` → `0 problem(s)` and no warning.
