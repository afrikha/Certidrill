# Task QZ-az-104-21-storage-access — end-of-chapter quiz, AZ-104, chapter `21-storage-access`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the chapter `content/az-104/course/chapters/21-storage-access.en.md` and `.fr.md`, and the objectives in `content/az-104/objectives.yaml`.

Write `content/az-104/quizzes/21-storage-access.yaml`: 10 questions, ids `az104-qz-21-01` to `az104-qz-21-10`, English and French (AZ-104 is offered in both).

- Chapter objectives (each tested at least once): 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5.
- Mock-exam questions of these objectives, to read first and NOT repeat: `content/az-104/questions/storage/` (grep the objective codes), plus case-study and series questions in the same folder.
- Positions 1–5: difficulty 1→2, consolidation. Positions 6–10: difficulty 3, as hard as the real AZ-104 exam, at least two formats other than `single`.

Check: `npx tsx factory/check-quiz.ts az-104 21-storage-access` → `0 problem(s)` and no warning.
