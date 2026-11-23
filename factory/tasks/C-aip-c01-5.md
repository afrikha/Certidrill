# Task C-aip-c01-5 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `41-cost-optimization` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4
- `42-performance` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6
- `43-monitoring` — objectives: 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5, 4.3.6
- `51-evaluation-quality-gates` — objectives: 5.1.1, 5.1.2, 5.1.4, 5.1.8, 5.1.9

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 41-cost-optimization 42-performance 43-monitoring 51-evaluation-quality-gates`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
