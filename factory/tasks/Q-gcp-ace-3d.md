# Task Q-gcp-ace-3d — role QUESTIONS, certification GCP-ACE, domain `operations`

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/gcp-ace.md`.

Write **40 standalone questions** (no case study, no series) in `content/gcp-ace/questions/operations/`, id prefix **`gcpace-3d-`**:

- `3.4.5`: 4 questions
- `3.4.6`: 4 questions
- `3.4.7`: 4 questions
- `3.4.8`: 4 questions
- `3.4.9`: 4 questions
- `3.4.10`: 4 questions
- `3.4.11`: 4 questions
- `3.4.12`: 4 questions
- `3.4.13`: 4 questions
- `3.4.14`: 4 questions

Type mix for the batch (approximate): single 32, multi 8.
Difficulty mix: easy 30 %, medium 50 %, hard 20 %.
Check: `CERT=gcp-ace npx tsx factory/validate.ts --prefix gcpace-3d-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
