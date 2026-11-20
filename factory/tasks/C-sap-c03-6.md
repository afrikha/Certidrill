# Task C-sap-c03-6 — role COURSE, certification SAP-C03 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/sap-c03.md`, `content/sap-c03/objectives.yaml` and `content/sap-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/sap-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `52-cicd-devsecops` — objectives: 5.2.1, 5.2.2, 5.2.3, 5.2.4, 5.2.5
- `53-observability` — objectives: 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5, 5.3.6, 5.3.7
- `54-operational-automation` — objectives: 5.4.1, 5.4.2, 5.4.3, 5.4.4, 5.4.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts sap-c03 52-cicd-devsecops 53-observability 54-operational-automation`
