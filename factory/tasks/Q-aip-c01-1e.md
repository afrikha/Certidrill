# Task Q-aip-c01-1e — role QUESTIONS, certification AIP-C01, domain `foundation`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **32 standalone questions** (no case study, no series) in `content/aip-c01/questions/foundation/`, id prefix **`aipc01-1e-`**:

- `1.6.3`: 8 questions
- `1.6.4`: 8 questions
- `1.6.5`: 8 questions
- `1.6.6`: 8 questions

Type mix for the batch (approximate): single 27, multi 5.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-1e-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
