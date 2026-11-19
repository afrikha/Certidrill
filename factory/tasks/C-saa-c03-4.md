# Task C-saa-c03-4 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `35-network-performance` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5, 3.4.6, 3.4.7, 3.4.8
- `36-data-ingestion` — objectives: 3.5.2, 3.5.3, 3.5.5, 3.5.6, 3.5.7, 3.5.9, 3.5.10, 3.5.13
- `37-data-lakes-analytics` — objectives: 3.5.1, 3.5.4, 3.5.8, 3.5.11, 3.5.12, 3.5.14
- `41-cost-storage-services` — objectives: 4.1.2, 4.1.3, 4.1.4, 4.1.6, 4.1.8, 4.1.11, 4.1.12, 4.1.13, 4.1.14, 4.1.15, 4.1.18, 4.1.21

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 35-network-performance 36-data-ingestion 37-data-lakes-analytics 41-cost-storage-services`
