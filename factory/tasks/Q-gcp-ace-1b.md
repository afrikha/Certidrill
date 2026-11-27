# Task Q-gcp-ace-1b — role QUESTIONS, certification GCP-ACE, domain `setup`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **48 standalone questions** (no case study, no series) in `content/gcp-ace/questions/setup/`, id prefix **`gcpace-1b-`**:

- `1.1.7`: 8 questions
- `1.1.8`: 8 questions
- `1.1.9`: 8 questions
- `1.1.10`: 8 questions
- `1.1.11`: 8 questions
- `1.1.12`: 8 questions

Type mix for the batch (approximate): single 38, multi 10.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-1b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
