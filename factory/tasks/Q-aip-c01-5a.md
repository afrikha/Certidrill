# Task Q-aip-c01-5a — role QUESTIONS, certification AIP-C01, domain `testing`

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/aip-c01.md`.

Write **45 standalone questions** (no case study, no series) in `content/aip-c01/questions/testing/`, id prefix **`aipc01-5a-`**:

- `5.1.1`: 7 questions
- `5.1.2`: 7 questions
- `5.1.3`: 7 questions
- `5.1.4`: 6 questions
- `5.1.5`: 6 questions
- `5.1.6`: 6 questions
- `5.1.7`: 6 questions

Type mix for the batch (approximate): single 37, multi 8.
Difficulty mix: easy 15 %, medium 50 %, hard 35 %.
Check: `CERT=aip-c01 npx tsx factory/validate.ts --prefix aipc01-5a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
