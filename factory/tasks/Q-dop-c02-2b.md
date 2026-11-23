# Task Q-dop-c02-2b — role QUESTIONS, certification DOP-C02, domain `config`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/dop-c02.md`.

Write **51 standalone questions** (no case study, no series) in `content/dop-c02/questions/config/`, id prefix **`dopc02-2b-`**:

- `2.1.7`: 8 questions
- `2.2.1`: 8 questions
- `2.2.2`: 7 questions
- `2.2.3`: 7 questions
- `2.2.4`: 7 questions
- `2.2.5`: 7 questions
- `2.3.1`: 7 questions

Type mix for the batch (approximate): single 42, multi 9.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-2b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
