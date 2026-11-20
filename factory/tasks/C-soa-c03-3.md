# Task C-soa-c03-3 — role COURSE, certification SOA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/soa-c03.md`, `content/soa-c03/objectives.yaml` and `content/soa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/soa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `32-automation` — objectives: 3.2.1, 3.2.2
- `41-security-compliance` — objectives: 4.1.1, 4.1.2, 4.1.3, 4.1.4, 4.1.5
- `42-data-protection` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5
- `51-vpc-connectivity` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts soa-c03 32-automation 41-security-compliance 42-data-protection 51-vpc-connectivity`
