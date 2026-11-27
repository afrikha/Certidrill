# Task Q-gcp-pca-5b — role QUESTIONS, certification GCP-PCA, domain `implementation`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **30 standalone questions** (no case study, no series) in `content/gcp-pca/questions/implementation/`, id prefix **`gcppca-5b-`**:

- `5.2.2`: 6 questions
- `5.2.3`: 6 questions
- `5.2.4`: 6 questions
- `5.2.5`: 6 questions
- `5.2.6`: 6 questions

Type mix for the batch (approximate): single 24, multi 6.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-5b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
