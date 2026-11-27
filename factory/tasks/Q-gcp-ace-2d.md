# Task Q-gcp-ace-2d — role QUESTIONS, certification GCP-ACE, domain `planning`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **45 standalone questions** (no case study, no series) in `content/gcp-ace/questions/planning/`, id prefix **`gcpace-2d-`**:

- `2.3.3`: 8 questions
- `2.3.4`: 8 questions
- `2.3.5`: 8 questions
- `2.3.6`: 7 questions
- `2.4.1`: 7 questions
- `2.4.2`: 7 questions

Type mix for the batch (approximate): single 36, multi 9.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-2d-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
