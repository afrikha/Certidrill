# Task C-soa-c03-4 — role COURSE, certification SOA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/soa-c03.md`, `content/soa-c03/objectives.yaml` and `content/soa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/soa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `52-dns-content-delivery` — objectives: 5.2.1, 5.2.2, 5.2.3
- `53-network-troubleshooting` — objectives: 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts soa-c03 52-dns-content-delivery 53-network-troubleshooting`
