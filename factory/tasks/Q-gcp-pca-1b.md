# Task Q-gcp-pca-1b — role QUESTIONS, certification GCP-PCA, domain `design`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **44 standalone questions** (no case study, no series) in `content/gcp-pca/questions/design/`, id prefix **`gcppca-1b-`**:

- `1.1.12`: 4 questions
- `1.2.1`: 4 questions
- `1.2.2`: 4 questions
- `1.2.3`: 4 questions
- `1.2.4`: 4 questions
- `1.2.5`: 4 questions
- `1.2.6`: 4 questions
- `1.2.7`: 4 questions
- `1.3.1`: 4 questions
- `1.3.2`: 4 questions
- `1.3.3`: 4 questions

Type mix for the batch (approximate): single 35, multi 9.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-1b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
