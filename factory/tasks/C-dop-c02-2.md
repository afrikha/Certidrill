# Task C-dop-c02-2 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `14-deployment-strategies` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6, 1.4.7, 1.4.8
- `21-iac-reusable-components` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7
- `22-multi-account-automation` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5
- `23-automation-at-scale` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 14-deployment-strategies 21-iac-reusable-components 22-multi-account-automation 23-automation-at-scale`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
