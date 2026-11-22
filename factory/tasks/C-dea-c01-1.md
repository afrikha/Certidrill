# Task C-dea-c01-1 — role COURSE, certification DEA-C01 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dea-c01.md`, `content/dea-c01/objectives.yaml` and `content/dea-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dea-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/saa-c03/course/chapters/00-getting-started.* (an AWS associate example), adapted to this exam using factory/profiles/dea-c01.md)
- `11-ingestion` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11, 1.1.12
- `12-transformation` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7, 1.2.8, 1.2.9, 1.2.10
- `13-orchestration` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dea-c01 00-getting-started 11-ingestion 12-transformation 13-orchestration`
