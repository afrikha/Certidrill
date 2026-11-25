# Task Q-kcsa-3c — role QUESTIONS, certification KCSA, domain `fundamentals`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **39 standalone questions** (no case study, no series) in `content/kcsa/questions/fundamentals/`, id prefix **`kcsa-3c-`**:

- `3.6.3`: 5 questions
- `3.6.4`: 5 questions
- `3.7.1`: 5 questions
- `3.7.2`: 5 questions
- `3.7.3`: 5 questions
- `3.8.1`: 5 questions
- `3.8.2`: 5 questions
- `3.8.3`: 4 questions

Type mix for the batch (approximate): single 39.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-3c-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
