# Task Q-kcsa-1b — role QUESTIONS, certification KCSA, domain `overview`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **44 standalone questions** (no case study, no series) in `content/kcsa/questions/overview/`, id prefix **`kcsa-1b-`**:

- `1.3.3`: 4 questions
- `1.4.1`: 4 questions
- `1.4.2`: 4 questions
- `1.4.3`: 4 questions
- `1.5.1`: 4 questions
- `1.5.2`: 4 questions
- `1.5.3`: 4 questions
- `1.5.4`: 4 questions
- `1.6.1`: 4 questions
- `1.6.2`: 4 questions
- `1.6.3`: 4 questions

Type mix for the batch (approximate): single 44.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-1b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
