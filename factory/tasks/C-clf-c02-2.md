# Task C-clf-c02-2 — role COURSE, certification CLF-C02 (fundamentals)

Read `factory/BRIEF.md`, then `factory/BRIEF-AWS.md` (it overrides the Microsoft-specific rules).md`, `content/clf-c02/objectives.yaml` and `content/clf-c02/course/course.yaml` (chapter titles).

Write these chapters, each in English and French (`content/clf-c02/course/chapters/<id>.en.md` and `.fr.md`):

- `24-security-resources` — objectives: 2.4.1, 2.4.2, 2.4.3, 2.4.4, 2.4.5, 2.4.6
- `31-deploying-operating` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4, 3.1.5, 3.1.6
- `32-global-infrastructure` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8
- `33-compute-services` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5, 3.3.6
- `34-database-services` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4, 3.4.5, 3.4.6, 3.4.7
- `35-network-services` — objectives: 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.5.5
- `36-storage-services` — objectives: 3.6.1, 3.6.2, 3.6.3, 3.6.4, 3.6.5, 3.6.6, 3.6.7, 3.6.8
- `37-ai-ml-analytics` — objectives: 3.7.1, 3.7.2, 3.7.3, 3.7.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts clf-c02 24-security-resources 31-deploying-operating 32-global-infrastructure 33-compute-services 34-database-services 35-network-services 36-storage-services 37-ai-ml-analytics`
