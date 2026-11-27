# Task QZ-gcp-pca-14-network-storage-compute-design — end-of-chapter quiz, Google Cloud Professional Cloud Architect, chapter `14-network-storage-compute-design`

Read `factory/BRIEF.md` (rules for everyone + role QUESTIONS), then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules), `factory/BRIEF-QUIZ.md`, `tools/questions/WRITING_GUIDE.md` fully, `lib/questions/schema.ts`, the exam profile `factory/profiles/gcp-pca.md` (exam level, formats, current product names, Preview and deprecated products), the chapter `content/gcp-pca/course/chapters/14-network-storage-compute-design.en.md` (Designing network, storage, compute and AI resources), and the objectives in `content/gcp-pca/objectives.yaml`. Model of a finished quiz: `content/az-104/quizzes/12-rbac.yaml` (structure only: this quiz is **English only**, localized fields `{ en: … }` with no `fr` key).

Write `content/gcp-pca/quizzes/14-network-storage-compute-design.yaml`: 10 questions, ids `gcppca-qz-14-01` to `gcppca-qz-14-10`, English only.

- Chapter objectives (each tested at least once): 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7.
- Mock-exam questions of these objectives, to read first and NOT repeat: grep the objective codes in `content/gcp-pca/questions/` (all subfolders, case-study questions included).
- Types: `single` and `multi` only (the real exam's formats; multi stems end with "Choose two." or "Choose three.", 5 options for two answers, 6 for three).
- Positions 1–5: difficulty 1→2, consolidation of the chapter. Positions 6–10: difficulty 3, as hard as the hardest Professional Cloud Architect scenario questions (a stated requirement decides between valid designs), with **at least two `multi`**.
- Facts current on 2026-11-27: verify on docs.cloud.google.com with WebFetch; references only to pages you fetched. Never make a Preview or deprecated product the correct answer.

Check: `npx tsx factory/check-quiz.ts gcp-pca 14-network-storage-compute-design` → `0 problem(s)` and no warning.
