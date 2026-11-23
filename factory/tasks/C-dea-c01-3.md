# Task C-dea-c01-3 — role COURSE, certification DEA-C01 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dea-c01.md`, `content/dea-c01/objectives.yaml` and `content/dea-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dea-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `24-data-modeling` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6
- `31-automation` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.8, 3.1.9
- `32-analysis` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6
- `33-monitoring` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6, 3.3.7, 3.3.8

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dea-c01 24-data-modeling 31-automation 32-analysis 33-monitoring`
