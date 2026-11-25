# Task C-dop-c02-5 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `44-log-analysis-auditing` — objectives: 4.2.3, 4.2.4, 4.2.5, 4.2.9, 4.2.10
- `45-event-automation-agents` — objectives: 4.3.1, 4.3.3, 4.3.6, 4.3.7, 4.3.8, 4.3.9, 4.3.10
- `46-auto-scaling-health-checks` — objectives: 4.3.2, 4.3.4, 4.3.5, 4.3.11
- `51-event-sources` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 44-log-analysis-auditing 45-event-automation-agents 46-auto-scaling-health-checks 51-event-sources`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
