# Task Q-kcsa-6b — role QUESTIONS, certification KCSA, domain `compliance`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **30 standalone questions** (no case study, no series) in `content/kcsa/questions/compliance/`, id prefix **`kcsa-6b-`**:

- `6.3.1`: 5 questions
- `6.3.2`: 5 questions
- `6.3.3`: 5 questions
- `6.4.1`: 5 questions
- `6.4.2`: 5 questions
- `6.4.3`: 5 questions

Type mix for the batch (approximate): single 30.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-6b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
