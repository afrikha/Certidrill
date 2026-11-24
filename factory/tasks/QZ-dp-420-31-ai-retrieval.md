# Task QZ-dp-420-31-ai-retrieval — end-of-chapter quiz, DP-420, chapter `31-ai-retrieval`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/dp-420.md` (exam level, formats, current product names and retirements), the chapter `content/dp-420/course/chapters/31-ai-retrieval.en.md` and `.fr.md`, and the objectives in `content/dp-420/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml`.

Write `content/dp-420/quizzes/31-ai-retrieval.yaml`: 10 questions, ids `dp420-qz-31-01` to `dp420-qz-31-10`, English and French.

- Chapter objectives (each tested at least once): 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/dp-420/questions/` (all subfolders, case-study and series questions included).
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the hardest questions of the real DP-420 exam (at its own level: fundamentals stay fundamentals), at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts dp-420 31-ai-retrieval` → `0 problem(s)` and no warning.
