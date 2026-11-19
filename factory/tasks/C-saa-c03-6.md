# Task C-saa-c03-6 — role COURSE, certification SAA-C03 (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/saa-c03.md`, `content/saa-c03/objectives.yaml` and `content/saa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/saa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `46-database-retention-migration` — objectives: 4.3.3, 4.3.4, 4.3.6, 4.3.8, 4.3.10, 4.3.14
- `47-network-transfer-costs` — objectives: 4.4.3, 4.4.4, 4.4.7, 4.4.8, 4.4.10, 4.4.11, 4.4.13
- `48-connectivity-costs` — objectives: 4.4.1, 4.4.2, 4.4.5, 4.4.6, 4.4.9, 4.4.12, 4.4.14

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts saa-c03 46-database-retention-migration 47-network-transfer-costs 48-connectivity-costs`
