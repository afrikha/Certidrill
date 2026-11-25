# Task Q-aip-c01-3b — role QUESTIONS, certification AIP-C01, domain `safety`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **53 standalone questions** (no case study, no series) in `content/aip-c01/questions/safety/`, id prefix **`aipc01-3b-`**:

- `3.2.1`: 11 questions
- `3.2.2`: 11 questions
- `3.2.3`: 11 questions
- `3.3.1`: 10 questions
- `3.3.2`: 10 questions

Type mix for the batch (approximate): single 44, multi 9.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-3b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
