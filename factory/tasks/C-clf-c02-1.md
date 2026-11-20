# Task C-clf-c02-1 — role COURSE, certification CLF-C02 (fundamentals)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules).md`, `content/clf-c02/objectives.yaml` and `content/clf-c02/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/clf-c02/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/saa-c03/course/chapters/00-getting-started.* (an AWS example; CLF-C02 is a fundamentals exam, so keep it simpler), adapted to this exam using factory/profiles/clf-c02.md)
- `11-cloud-benefits` — objectives: 1.1.1, 1.1.2, 1.1.3
- `12-design-principles` — objectives: 1.2.1, 1.2.2, 1.2.3
- `13-cloud-migration` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4
- `14-cloud-economics` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5, 1.4.6, 1.4.7, 1.4.8
- `21-shared-responsibility` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6
- `22-security-governance-compliance` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6, 2.2.7, 2.2.8, 2.2.9
- `23-access-management` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6, 2.3.7, 2.3.8, 2.3.9, 2.3.10

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts clf-c02 00-getting-started 11-cloud-benefits 12-design-principles 13-cloud-migration 14-cloud-economics 21-shared-responsibility 22-security-governance-compliance 23-access-management`
