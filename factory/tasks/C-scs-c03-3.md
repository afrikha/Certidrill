# Task C-scs-c03-3 — role COURSE, certification SCS-C03 (specialty)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules; ordering and dragdrop allowed for SCS-C03) (rules + role COURSE), `factory/profiles/scs-c03.md`, `content/scs-c03/objectives.yaml` and `content/scs-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/scs-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `33-network-controls` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5
- `41-authentication` — objectives: 4.1.1, 4.1.2, 4.1.3
- `42-authorization` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5
- `51-data-in-transit` — objectives: 5.1.1, 5.1.2, 5.1.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts scs-c03 33-network-controls 41-authentication 42-authorization 51-data-in-transit`
