# Task Q-kcna-2d — role QUESTIONS, certification KCNA, domain `orchestration`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role QUESTIONS) and `factory/profiles/kcna.md`.

Write **32 standalone questions** (no case study, no series) in `content/kcna/questions/orchestration/`, id prefix **`kcna-2d-`**:

- `2.4.2`: 8 questions
- `2.4.3`: 8 questions
- `2.4.4`: 8 questions
- `2.4.5`: 8 questions

Type mix for the batch (approximate): single 32.
Difficulty mix: easy 40 %, medium 45 %, hard 15 %.
Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-2d-` → `0 problem(s)`.

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
