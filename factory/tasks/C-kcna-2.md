# Task C-kcna-2 — role COURSE, certification KCNA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcna.md`, `content/kcna/objectives.yaml` and `content/kcna/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcna/course/chapters/<id>.en.md`, no `.fr.md`):

- `24-storage` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5
- `31-application-delivery` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5
- `32-debugging` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5
- `41-observability` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5
- `42-ecosystem-principles` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5
- `43-community-collaboration` — objectives: 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcna 24-storage 31-application-delivery 32-debugging 41-observability 42-ecosystem-principles 43-community-collaboration`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
