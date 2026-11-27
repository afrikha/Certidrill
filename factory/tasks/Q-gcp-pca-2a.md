# Task Q-gcp-pca-2a — role QUESTIONS, certification GCP-PCA, domain `provisioning`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-pca.md`.

Write **48 standalone questions** (no case study, no series) in `content/gcp-pca/questions/provisioning/`, id prefix **`gcppca-2a-`**:

- `2.1.1`: 4 questions
- `2.1.2`: 4 questions
- `2.1.3`: 4 questions
- `2.1.4`: 4 questions
- `2.2.1`: 4 questions
- `2.2.2`: 4 questions
- `2.2.3`: 4 questions
- `2.2.4`: 4 questions
- `2.2.5`: 4 questions
- `2.2.6`: 4 questions
- `2.2.7`: 4 questions
- `2.3.1`: 4 questions

Type mix for the batch (approximate): single 38, multi 10.
Difficulty mix: easy 20 %, medium 50 %, hard 30 %.
Check: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-2a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Report doubts in `factory/reports/<task id>.md`.
