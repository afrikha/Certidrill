# Task C-aip-c01-1 — role COURSE, certification AIP-C01 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/aip-c01.md`, `content/aip-c01/objectives.yaml` and `content/aip-c01/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/aip-c01/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/sap-c03/course/chapters/00-getting-started.en.md, adapted to this exam using factory/profiles/aip-c01.md)
- `11-solution-design` — objectives: 1.1.1, 1.1.2, 1.1.3
- `12-fm-selection` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4
- `13-data-pipelines` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts aip-c01 00-getting-started 11-solution-design 12-fm-selection 13-data-pipelines`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
