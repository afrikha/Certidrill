# Task Q-kcsa-5a — role QUESTIONS, certification KCSA, domain `platform`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcsa.md`.

Write **53 standalone questions** (no case study, no series) in `content/kcsa/questions/platform/`, id prefix **`kcsa-5a-`**:

- `5.1.1`: 5 questions
- `5.1.2`: 5 questions
- `5.1.3`: 5 questions
- `5.1.4`: 5 questions
- `5.2.1`: 5 questions
- `5.2.2`: 5 questions
- `5.2.3`: 5 questions
- `5.3.1`: 5 questions
- `5.3.2`: 5 questions
- `5.3.3`: 4 questions
- `5.4.1`: 4 questions

Type mix for the batch (approximate): single 53.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcsa npx tsx factory/validate.ts --prefix kcsa-5a-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
