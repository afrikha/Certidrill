# Task Q-kcna-4b — role QUESTIONS, certification KCNA, domain `architecture`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcna.md`.

Write **35 standalone questions** (no case study, no series) in `content/kcna/questions/architecture/`, id prefix **`kcna-4b-`**:

- `4.2.4`: 5 questions
- `4.2.5`: 5 questions
- `4.3.1`: 5 questions
- `4.3.2`: 5 questions
- `4.3.3`: 5 questions
- `4.3.4`: 5 questions
- `4.3.5`: 5 questions

Type mix for the batch (approximate): single 35.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-4b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
