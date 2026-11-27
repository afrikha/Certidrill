# Task Q-gcp-ace-1c — role QUESTIONS, certification GCP-ACE, domain `setup`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **30 standalone questions** (no case study, no series) in `content/gcp-ace/questions/setup/`, id prefix **`gcpace-1c-`**:

- `1.2.1`: 8 questions
- `1.2.2`: 8 questions
- `1.2.3`: 7 questions
- `1.2.4`: 7 questions

Type mix for the batch (approximate): single 24, multi 6.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-1c-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
