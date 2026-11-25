# Task C-dop-c02-1 — role COURSE, certification DOP-C02 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/dop-c02.md`, `content/dop-c02/objectives.yaml` and `content/dop-c02/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/dop-c02/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/sap-c03/course/chapters/00-getting-started.en.md, adapted to this exam using factory/profiles/dop-c02.md)
- `11-cicd-pipelines` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7
- `12-automated-testing` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7
- `13-artifacts` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dop-c02 00-getting-started 11-cicd-pipelines 12-automated-testing 13-artifacts`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
