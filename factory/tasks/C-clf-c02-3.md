# Task C-clf-c02-3 — role COURSE, certification CLF-C02 (fundamentals)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules).md`, `content/clf-c02/objectives.yaml` and `content/clf-c02/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/clf-c02/course/chapters/<id>.en.md` and `.fr.md`):

- `38-integration-business-support` — objectives: 3.8.1, 3.8.2, 3.8.3, 3.8.8, 3.8.9, 3.8.10
- `39-developer-enduser-frontend-iot` — objectives: 3.8.4, 3.8.5, 3.8.6, 3.8.7, 3.8.11, 3.8.12, 3.8.13, 3.8.14
- `41-pricing-models` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5, 4.1.6, 4.1.7
- `42-billing-cost-management` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.7, 4.2.8
- `43-support-technical-resources` — objectives: 4.3.1, 4.3.2, 4.3.4, 4.3.5, 4.3.6, 4.3.7, 4.3.8, 4.3.9
- `44-partners-marketplace` — objectives: 4.3.3, 4.3.10, 4.3.11, 4.3.12, 4.3.13

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts clf-c02 38-integration-business-support 39-developer-enduser-frontend-iot 41-pricing-models 42-billing-cost-management 43-support-technical-resources 44-partners-marketplace`
