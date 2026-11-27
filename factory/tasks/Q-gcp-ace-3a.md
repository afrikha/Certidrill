# Task Q-gcp-ace-3a — role QUESTIONS, certification GCP-ACE, domain `operations`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **50 standalone questions** (no case study, no series) in `content/gcp-ace/questions/operations/`, id prefix **`gcpace-3a-`**:

- `3.1.1`: 5 questions
- `3.1.2`: 5 questions
- `3.1.3`: 5 questions
- `3.1.4`: 5 questions
- `3.1.5`: 5 questions
- `3.1.6`: 5 questions
- `3.1.7`: 5 questions
- `3.1.8`: 5 questions
- `3.1.9`: 5 questions
- `3.1.10`: 5 questions

Type mix for the batch (approximate): single 40, multi 10.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
