# Task Q-dop-c02-3c — role QUESTIONS, certification DOP-C02, domain `resilience`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/dop-c02.md`.

Write **38 standalone questions** (no case study, no series) in `content/dop-c02/questions/resilience/`, id prefix **`dopc02-3c-`**:

- `3.2.8`: 5 questions
- `3.2.9`: 5 questions
- `3.3.1`: 5 questions
- `3.3.2`: 5 questions
- `3.3.3`: 5 questions
- `3.3.4`: 5 questions
- `3.3.5`: 4 questions
- `3.3.6`: 4 questions

Type mix for the batch (approximate): single 32, multi 6.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=dop-c02 npx tsx factory/validate.ts --prefix dopc02-3c-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
