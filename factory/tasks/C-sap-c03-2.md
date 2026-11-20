# Task C-sap-c03-2 — role COURSE, certification SAP-C03 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/sap-c03.md`, `content/sap-c03/objectives.yaml` and `content/sap-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/sap-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `14-hybrid-integration` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5
- `15-network-architectures` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5
- `16-data-storage-databases` — objectives: 1.5.1, 1.5.2, 1.5.3, 1.5.4, 1.5.5, 1.5.6, 1.5.7
- `21-identity-security` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts sap-c03 14-hybrid-integration 15-network-architectures 16-data-storage-databases 21-identity-security`
