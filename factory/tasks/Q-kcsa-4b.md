# Task Q-kcsa-4b — role QUESTIONS, certification KCSA, domain `threats`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **46 standalone questions** (no case study, no series) in `content/kcsa/questions/threats/`, id prefix **`kcsa-4b-`**:

- `4.4.3`: 5 questions
- `4.5.1`: 5 questions
- `4.5.2`: 5 questions
- `4.5.3`: 5 questions
- `4.6.1`: 5 questions
- `4.6.2`: 5 questions
- `4.6.3`: 4 questions
- `4.7.1`: 4 questions
- `4.7.2`: 4 questions
- `4.7.3`: 4 questions

Type mix for the batch (approximate): single 46.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-4b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
