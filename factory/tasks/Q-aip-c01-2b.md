# Task Q-aip-c01-2b — role QUESTIONS, certification AIP-C01, domain `implementation`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **56 standalone questions** (no case study, no series) in `content/aip-c01/questions/implementation/`, id prefix **`aipc01-2b-`**:

- `2.1.7`: 8 questions
- `2.2.1`: 8 questions
- `2.2.2`: 8 questions
- `2.2.3`: 8 questions
- `2.3.1`: 8 questions
- `2.3.2`: 8 questions
- `2.3.3`: 8 questions

Type mix for the batch (approximate): single 46, multi 10.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-2b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
