# Task QZ-gcp-ace-11-projects-hierarchy — end-of-chapter quiz, Google Cloud Associate Cloud Engineer, chapter `11-projects-hierarchy`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules), `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/gcp-ace.md` (associate level, formats, current product names, Preview and deprecated products), the chapter `content/gcp-ace/course/chapters/11-projects-hierarchy.en.md` (Resource hierarchy, organization policies, identities and APIs), and the objectives in `content/gcp-ace/objectives.yaml`. Model of a finished quiz: `content/gcp-pca/quizzes/22-storage-systems.yaml` (English only, localized fields `{ en: … }`).

Write `content/gcp-ace/quizzes/11-projects-hierarchy.yaml`: 10 questions, ids `gcpace-qz-11-01` to `gcpace-qz-11-10`, English only.

- Chapter objectives (each tested at least once): 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.8, 1.1.12.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/gcp-ace/questions/` (all subfolders).
- Types: `single` and `multi` only (multi stems end with "Choose two." or "Choose three.", 5 options for two answers, 6 for three).
- Positions 1–5: difficulty 1→2, consolidation of the chapter. Positions 6–10: difficulty 3, as hard as the hardest Associate Cloud Engineer questions (several plausible commands or settings, one detail decides), with **at least two `multi`**. Every command and flag must be real (check the gcloud reference or the local `gcloud ... --help`).
- Facts current on 2026-11-27: verify on docs.cloud.google.com with WebFetch; references only to pages you fetched. Never make a Preview or deprecated product the correct answer unless the objective names it (then state the stage).

Check: `npx tsx factory/check-quiz.ts gcp-ace 11-projects-hierarchy` → `0 problem(s)` and no warning.
