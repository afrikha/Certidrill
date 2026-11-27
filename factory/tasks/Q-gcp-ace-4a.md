# Task Q-gcp-ace-4a — role QUESTIONS, certification GCP-ACE, domain `security`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **48 standalone questions** (no case study, no series) in `content/gcp-ace/questions/security/`, id prefix **`gcpace-4a-`**:

- `4.1.1`: 12 questions
- `4.1.2`: 12 questions
- `4.1.3`: 12 questions
- `4.2.1`: 12 questions

Type mix for the batch (approximate): single 38, multi 10.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-4a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
