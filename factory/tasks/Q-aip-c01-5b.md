# Task Q-aip-c01-5b — role QUESTIONS, certification AIP-C01, domain `testing`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **42 standalone questions** (no case study, no series) in `content/aip-c01/questions/testing/`, id prefix **`aipc01-5b-`**:

- `5.1.8`: 6 questions
- `5.1.9`: 6 questions
- `5.2.1`: 6 questions
- `5.2.2`: 6 questions
- `5.2.3`: 6 questions
- `5.2.4`: 6 questions
- `5.2.5`: 6 questions

Type mix for the batch (approximate): single 35, multi 7.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-5b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
