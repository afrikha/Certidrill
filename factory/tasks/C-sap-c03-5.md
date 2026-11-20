# Task C-sap-c03-5 — role COURSE, certification SAP-C03 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/sap-c03.md`, `content/sap-c03/objectives.yaml` and `content/sap-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/sap-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `41-migration-strategies` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6
- `42-disaster-recovery` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6
- `43-business-continuity` — objectives: 4.3.1, 4.3.2, 4.3.3, 4.3.4, 4.3.5
- `51-infrastructure-as-code` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts sap-c03 41-migration-strategies 42-disaster-recovery 43-business-continuity 51-infrastructure-as-code`
