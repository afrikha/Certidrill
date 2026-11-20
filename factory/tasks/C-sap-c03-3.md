# Task C-sap-c03-3 — role COURSE, certification SAP-C03 (professional)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/sap-c03.md`, `content/sap-c03/objectives.yaml` and `content/sap-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/sap-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `22-encryption-keys` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4
- `23-multi-account-governance` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6
- `24-compliance-architectures` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6
- `25-responsible-ai` — objectives: 2.5.1, 2.5.2, 2.5.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts sap-c03 22-encryption-keys 23-multi-account-governance 24-compliance-architectures 25-responsible-ai`
