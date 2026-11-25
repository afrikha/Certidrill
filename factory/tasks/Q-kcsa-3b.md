# Task Q-kcsa-3b — role QUESTIONS, certification KCSA, domain `fundamentals`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **50 standalone questions** (no case study, no series) in `content/kcsa/questions/fundamentals/`, id prefix **`kcsa-3b-`**:

- `3.3.4`: 5 questions
- `3.4.1`: 5 questions
- `3.4.2`: 5 questions
- `3.4.3`: 5 questions
- `3.4.4`: 5 questions
- `3.5.1`: 5 questions
- `3.5.2`: 5 questions
- `3.5.3`: 5 questions
- `3.6.1`: 5 questions
- `3.6.2`: 5 questions

Type mix for the batch (approximate): single 50.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-3b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
