# Task Q-gcp-pca-6a — role QUESTIONS, certification GCP-PCA, domain `operations`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **34 standalone questions** (no case study, no series) in `content/gcp-pca/questions/operations/`, id prefix **`gcppca-6a-`**:

- `6.1.1`: 9 questions
- `6.2.1`: 9 questions
- `6.2.2`: 8 questions
- `6.2.3`: 8 questions

Type mix for the batch (approximate): single 27, multi 7.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-6a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
