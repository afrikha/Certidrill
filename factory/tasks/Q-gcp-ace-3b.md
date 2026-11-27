# Task Q-gcp-ace-3b — role QUESTIONS, certification GCP-ACE, domain `operations`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **51 standalone questions** (no case study, no series) in `content/gcp-ace/questions/operations/`, id prefix **`gcpace-3b-`**:

- `3.1.11`: 5 questions
- `3.1.12`: 5 questions
- `3.1.13`: 5 questions
- `3.1.14`: 5 questions
- `3.1.15`: 5 questions
- `3.1.16`: 5 questions
- `3.2.1`: 5 questions
- `3.2.2`: 4 questions
- `3.2.3`: 4 questions
- `3.2.4`: 4 questions
- `3.2.5`: 4 questions

Type mix for the batch (approximate): single 41, multi 10.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
