# Task Q-kcsa-1a — role QUESTIONS, certification KCSA, domain `overview`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **44 standalone questions** (no case study, no series) in `content/kcsa/questions/overview/`, id prefix **`kcsa-1a-`**:

- `1.1.1`: 5 questions
- `1.1.2`: 5 questions
- `1.1.3`: 5 questions
- `1.2.1`: 5 questions
- `1.2.2`: 5 questions
- `1.2.3`: 5 questions
- `1.2.4`: 5 questions
- `1.3.1`: 5 questions
- `1.3.2`: 4 questions

Type mix for the batch (approximate): single 44.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-1a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
