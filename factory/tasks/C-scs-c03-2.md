# Task C-scs-c03-2 — role COURSE, certification SCS-C03 (specialty)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules; ordering and dragdrop allowed for SCS-C03) (rules + role COURSE), `factory/profiles/scs-c03.md`, `content/scs-c03/objectives.yaml` and `content/scs-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/scs-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `21-response-plan` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4
- `22-security-events` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5
- `31-edge-security` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4
- `32-compute-security` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts scs-c03 21-response-plan 22-security-events 31-edge-security 32-compute-security`
