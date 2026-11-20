# Task C-soa-c03-1 — role COURSE, certification SOA-C03 (associate)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules) (rules + role COURSE), `factory/profiles/soa-c03.md`, `content/soa-c03/objectives.yaml` and `content/soa-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/soa-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/saa-c03/course/chapters/00-getting-started.* (an AWS associate example), adapted to this exam using factory/profiles/soa-c03.md)
- `11-monitoring-logging` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5
- `12-remediation` — objectives: 1.2.1, 1.2.2, 1.2.3
- `13-performance` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5, 1.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts soa-c03 00-getting-started 11-monitoring-logging 12-remediation 13-performance`
