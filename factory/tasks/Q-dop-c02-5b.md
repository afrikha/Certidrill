# Task Q-dop-c02-5b — role QUESTIONS, certification DOP-C02, domain `incident`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/dop-c02.md`.

Write **54 standalone questions** (no case study, no series) in `content/dop-c02/questions/incident/`, id prefix **`dopc02-5b-`**:

- `5.2.4`: 8 questions
- `5.2.5`: 8 questions
- `5.3.1`: 8 questions
- `5.3.2`: 8 questions
- `5.3.3`: 8 questions
- `5.3.4`: 7 questions
- `5.3.5`: 7 questions

Type mix for the batch (approximate): single 45, multi 9.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-5b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
