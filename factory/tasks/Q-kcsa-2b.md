# Task Q-kcsa-2b — role QUESTIONS, certification KCSA, domain `components`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **48 standalone questions** (no case study, no series) in `content/kcsa/questions/components/`, id prefix **`kcsa-2b-`**:

- `2.4.3`: 4 questions
- `2.4.4`: 4 questions
- `2.5.1`: 4 questions
- `2.5.2`: 4 questions
- `2.5.3`: 4 questions
- `2.6.1`: 4 questions
- `2.6.2`: 4 questions
- `2.6.3`: 4 questions
- `2.7.1`: 4 questions
- `2.7.2`: 4 questions
- `2.7.3`: 4 questions
- `2.8.1`: 4 questions

Type mix for the batch (approximate): single 48.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-2b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
