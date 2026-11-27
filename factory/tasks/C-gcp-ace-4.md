# Task C-gcp-ace-4 — role COURSE, certification GCP-ACE (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-ace.md`, `content/gcp-ace/objectives.yaml` and `content/gcp-ace/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-ace/course/chapters/<id>.en.md`, no `.fr.md`):

- `34-manage-storage-data` — objectives: 3.2.1, 3.2.2, 3.2.3, 3.2.4, 3.2.5, 3.2.6, 3.2.7, 3.2.8
- `35-manage-networking` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4, 3.3.5
- `36-logging` — objectives: 3.4.3, 3.4.4, 3.4.5, 3.4.6, 3.4.7
- `37-monitoring` — objectives: 3.4.1, 3.4.2, 3.4.8, 3.4.9, 3.4.10, 3.4.11, 3.4.12, 3.4.13, 3.4.14

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-ace 34-manage-storage-data 35-manage-networking 36-logging 37-monitoring`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
