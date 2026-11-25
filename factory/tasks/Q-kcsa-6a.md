# Task Q-kcsa-6a — role QUESTIONS, certification KCSA, domain `compliance`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **33 standalone questions** (no case study, no series) in `content/kcsa/questions/compliance/`, id prefix **`kcsa-6a-`**:

- `6.1.1`: 6 questions
- `6.1.2`: 6 questions
- `6.1.3`: 6 questions
- `6.2.1`: 5 questions
- `6.2.2`: 5 questions
- `6.2.3`: 5 questions

Type mix for the batch (approximate): single 33.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-6a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
