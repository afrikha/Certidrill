# Task Q-aip-c01-2a — role QUESTIONS, certification AIP-C01, domain `implementation`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **53 standalone questions** (no case study, no series) in `content/aip-c01/questions/implementation/`, id prefix **`aipc01-2a-`**:

- `2.1.1`: 9 questions
- `2.1.2`: 9 questions
- `2.1.3`: 9 questions
- `2.1.4`: 9 questions
- `2.1.5`: 9 questions
- `2.1.6`: 8 questions

Type mix for the batch (approximate): single 44, multi 9.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-2a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
