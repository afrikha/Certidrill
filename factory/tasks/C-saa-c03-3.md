# Task C-saa-c03-3 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `31-storage-performance` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5
- `32-elastic-compute` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8, 3.2.9, 3.2.10
- `33-database-selection` — objectives: 3.3.3, 3.3.4, 3.3.6, 3.3.8, 3.3.10, 3.3.11, 3.3.12
- `34-database-scaling` — objectives: 3.3.1, 3.3.2, 3.3.5, 3.3.7, 3.3.9, 3.3.13

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 31-storage-performance 32-elastic-compute 33-database-selection 34-database-scaling`
