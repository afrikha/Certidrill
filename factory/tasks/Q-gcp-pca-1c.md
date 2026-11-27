# Task Q-gcp-pca-1c — role QUESTIONS, certification GCP-PCA, domain `design`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **43 standalone questions** (no case study, no series) in `content/gcp-pca/questions/design/`, id prefix **`gcppca-1c-`**:

- `1.3.4`: 4 questions
- `1.3.5`: 4 questions
- `1.3.6`: 4 questions
- `1.3.7`: 4 questions
- `1.4.1`: 4 questions
- `1.4.2`: 4 questions
- `1.4.3`: 4 questions
- `1.4.4`: 4 questions
- `1.5.1`: 4 questions
- `1.5.2`: 4 questions
- `1.5.3`: 3 questions

Type mix for the batch (approximate): single 34, multi 9.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-1c-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
