# Task Q-kcna-1b — role QUESTIONS, certification KCNA, domain `fundamentals`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcna.md`.

Write **60 standalone questions** (no case study, no series) in `content/kcna/questions/fundamentals/`, id prefix **`kcna-1b-`**:

- `1.1.6`: 12 questions
- `1.1.7`: 12 questions
- `1.2.1`: 12 questions
- `1.2.2`: 12 questions
- `1.2.3`: 12 questions

Type mix for the batch (approximate): single 60.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1b-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
