# Task C-sap-c03-4 — role COURSE, certification SAP-C03 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/sap-c03.md`, `content/sap-c03/objectives.yaml` and `content/sap-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/sap-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `31-pricing-models` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4
- `32-data-transfer-costs` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5
- `33-cost-allocation` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5
- `34-storage-database-costs` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts sap-c03 31-pricing-models 32-data-transfer-costs 33-cost-allocation 34-storage-database-costs`
