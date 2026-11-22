# Task C-scs-c03-1 — role COURSE, certification SCS-C03 (specialty)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules; ordering and dragdrop allowed for SCS-C03) (rules + role COURSE), `factory/profiles/scs-c03.md`, `content/scs-c03/objectives.yaml` and `content/scs-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/scs-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/saa-c03/course/chapters/00-getting-started.* (an AWS example; adapt to specialty level), adapted to this exam using factory/profiles/scs-c03.md)
- `11-monitoring-alerting` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5
- `12-logging` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6
- `13-troubleshooting-detection` — objectives: 1.3.1, 1.3.2

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts scs-c03 00-getting-started 11-monitoring-alerting 12-logging 13-troubleshooting-detection`
