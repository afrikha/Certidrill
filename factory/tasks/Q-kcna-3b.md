# Task Q-kcna-3b — role QUESTIONS, certification KCNA, domain `delivery`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcna.md`.

Write **50 standalone questions** (no case study, no series) in `content/kcna/questions/delivery/`, id prefix **`kcna-3b-`**:

- `3.2.1`: 10 questions
- `3.2.2`: 10 questions
- `3.2.3`: 10 questions
- `3.2.4`: 10 questions
- `3.2.5`: 10 questions

Type mix for the batch (approximate): single 50.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-3b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
