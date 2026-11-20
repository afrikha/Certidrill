# Task C-dva-c03-1 — role COURSE, certification DVA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dva-c03.md`, `content/dva-c03/objectives.yaml` and `content/dva-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dva-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/saa-c03/course/chapters/00-getting-started.* (an AWS associate example), adapted to this exam using factory/profiles/dva-c03.md)
- `11-application-code` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10
- `12-lambda` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4
- `13-data-stores` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dva-c03 00-getting-started 11-application-code 12-lambda 13-data-stores`
