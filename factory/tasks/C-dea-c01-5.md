# Task C-dea-c01-5 — role COURSE, certification DEA-C01 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/dea-c01.md`, `content/dea-c01/objectives.yaml` and `content/dea-c01/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/dea-c01/course/chapters/<id>.en.md` and `.fr.md`):

- `44-audit-logs` — objectives: 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5
- `45-privacy-governance` — objectives: 4.5.1, 4.5.2, 4.5.3, 4.5.4, 4.5.5, 4.5.6, 4.5.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts dea-c01 44-audit-logs 45-privacy-governance`
