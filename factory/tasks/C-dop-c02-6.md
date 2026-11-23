# Task C-dop-c02-6 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `52-config-changes-events` — objectives: 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5
- `53-troubleshooting` — objectives: 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5
- `61-iam-at-scale` — objectives: 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5, 6.1.6, 6.1.7, 6.1.8
- `62-security-controls-data-protection` — objectives: 6.2.1, 6.2.2, 6.2.3, 6.2.4, 6.2.5, 6.2.6, 6.2.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 52-config-changes-events 53-troubleshooting 61-iam-at-scale 62-security-controls-data-protection`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
