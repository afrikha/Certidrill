# Task C-saa-c03-5 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `42-storage-tiering-lifecycle` — objectives: 4.1.1, 4.1.5, 4.1.7, 4.1.9, 4.1.10, 4.1.16, 4.1.17, 4.1.19, 4.1.20
- `43-cost-compute-purchasing` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.12, 4.2.13
- `44-compute-rightsizing` — objectives: 4.2.7, 4.2.8, 4.2.9, 4.2.10, 4.2.11, 4.2.14, 4.2.15
- `45-cost-database-selection` — objectives: 4.3.1, 4.3.2, 4.3.5, 4.3.7, 4.3.9, 4.3.11, 4.3.12, 4.3.13

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 42-storage-tiering-lifecycle 43-cost-compute-purchasing 44-compute-rightsizing 45-cost-database-selection`
