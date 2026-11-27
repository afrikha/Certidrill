# Task Q-gcp-pca-3b — role QUESTIONS, certification GCP-PCA, domain `security`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **42 standalone questions** (no case study, no series) in `content/gcp-pca/questions/security/`, id prefix **`gcppca-3b-`**:

- `3.1.8`: 7 questions
- `3.1.9`: 7 questions
- `3.2.1`: 7 questions
- `3.2.2`: 7 questions
- `3.2.3`: 7 questions
- `3.2.4`: 7 questions

Type mix for the batch (approximate): single 34, multi 8.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-3b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
