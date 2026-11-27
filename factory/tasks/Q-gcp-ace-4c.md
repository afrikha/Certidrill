# Task Q-gcp-ace-4c — role QUESTIONS, certification GCP-ACE, domain `security`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **33 standalone questions** (no case study, no series) in `content/gcp-ace/questions/security/`, id prefix **`gcpace-4c-`**:

- `4.2.6`: 11 questions
- `4.2.7`: 11 questions
- `4.2.8`: 11 questions

Type mix for the batch (approximate): single 26, multi 7.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-4c-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
