# Task C-saa-c03-1 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.*, adapted to this exam using factory/profiles/saa-c03.md)
- `11-secure-access` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7, 1.1.8, 1.1.9, 1.1.10, 1.1.11
- `12-secure-workloads` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6, 1.2.7, 1.2.8, 1.2.9, 1.2.10
- `13-data-security` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6, 1.3.7, 1.3.8, 1.3.9, 1.3.10, 1.3.11

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 00-getting-started 11-secure-access 12-secure-workloads 13-data-security`
