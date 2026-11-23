# Task C-dop-c02-4 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `35-automated-recovery` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6
- `41-metrics-collection` — objectives: 4.1.1, 4.1.2, 4.1.5, 4.1.7, 4.1.8, 4.1.9
- `42-log-storage-processing` — objectives: 4.1.3, 4.1.4, 4.1.6, 4.1.10, 4.1.11, 4.1.12, 4.1.13
- `43-alarms-dashboards-tracing` — objectives: 4.2.1, 4.2.2, 4.2.6, 4.2.7, 4.2.8

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 35-automated-recovery 41-metrics-collection 42-log-storage-processing 43-alarms-dashboards-tracing`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
