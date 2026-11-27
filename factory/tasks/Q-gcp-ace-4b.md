# Task Q-gcp-ace-4b — role QUESTIONS, certification GCP-ACE, domain `security`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **45 standalone questions** (no case study, no series) in `content/gcp-ace/questions/security/`, id prefix **`gcpace-4b-`**:

- `4.2.2`: 12 questions
- `4.2.3`: 11 questions
- `4.2.4`: 11 questions
- `4.2.5`: 11 questions

Type mix for the batch (approximate): single 36, multi 9.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-4b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
