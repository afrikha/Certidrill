# Task C-scs-c03-4 — role COURSE, certification SCS-C03 (specialty)

Read `factory/BRIEF.md`, `factory/BRIEF-AWS.md` (overrides the Microsoft-specific rules; ordering and dragdrop allowed for SCS-C03) (rules + role COURSE), `factory/profiles/scs-c03.md`, `content/scs-c03/objectives.yaml` and `content/scs-c03/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/scs-c03/course/chapters/<id>.en.md` and `.fr.md`):

- `52-data-at-rest` — objectives: 5.2.1, 5.2.2, 5.2.3, 5.2.4
- `53-secrets-keys` — objectives: 5.3.1, 5.3.2, 5.3.3, 5.3.4, 5.3.5
- `61-multi-account` — objectives: 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5
- `62-secure-deployment` — objectives: 6.2.1, 6.2.2, 6.2.3, 6.2.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts scs-c03 52-data-at-rest 53-secrets-keys 61-multi-account 62-secure-deployment`
