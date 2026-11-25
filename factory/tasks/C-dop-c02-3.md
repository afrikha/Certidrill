# Task C-dop-c02-3 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `31-ha-requirements-spof` — objectives: 3.1.2, 3.1.4, 3.1.5, 3.1.6, 3.1.8
- `32-multi-az-multi-region` — objectives: 3.1.1, 3.1.3, 3.1.7, 3.1.9
- `33-scaling-metrics-caching` — objectives: 3.2.1, 3.2.2, 3.2.5, 3.2.6, 3.2.8
- `34-containers-serverless` — objectives: 3.2.3, 3.2.4, 3.2.7, 3.2.9

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 31-ha-requirements-spof 32-multi-az-multi-region 33-scaling-metrics-caching 34-containers-serverless`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
