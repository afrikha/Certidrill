# Task Q-gcp-pca-4a — role QUESTIONS, certification GCP-PCA, domain `processes`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **43 standalone questions** (no case study, no series) in `content/gcp-pca/questions/processes/`, id prefix **`gcppca-4a-`**:

- `4.1.1`: 7 questions
- `4.1.2`: 6 questions
- `4.1.3`: 6 questions
- `4.1.4`: 6 questions
- `4.1.5`: 6 questions
- `4.1.6`: 6 questions
- `4.2.1`: 6 questions

Type mix for the batch (approximate): single 34, multi 9.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-4a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
