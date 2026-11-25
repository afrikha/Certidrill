# Task Q-aip-c01-4b — role QUESTIONS, certification AIP-C01, domain `operations`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **47 standalone questions** (no case study, no series) in `content/aip-c01/questions/operations/`, id prefix **`aipc01-4b-`**:

- `4.2.5`: 6 questions
- `4.2.6`: 6 questions
- `4.3.1`: 6 questions
- `4.3.2`: 6 questions
- `4.3.3`: 6 questions
- `4.3.4`: 6 questions
- `4.3.5`: 6 questions
- `4.3.6`: 5 questions

Type mix for the batch (approximate): single 39, multi 8.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-4b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
