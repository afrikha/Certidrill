# Task C-gcp-ace-3 — role COURSE, certification GCP-ACE (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-ace.md`, `content/gcp-ace/objectives.yaml` and `content/gcp-ace/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-ace/course/chapters/<id>.en.md`, no `.fr.md`):

- `25-tooling` — objectives: 2.4.1, 2.4.2
- `31-manage-vms` — objectives: 3.1.1, 3.1.2, 3.1.3
- `32-manage-gke` — objectives: 3.1.4, 3.1.5, 3.1.6, 3.1.7, 3.1.8, 3.1.9
- `33-manage-serverless-ai` — objectives: 3.1.10, 3.1.11, 3.1.12, 3.1.13, 3.1.14, 3.1.15, 3.1.16

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-ace 25-tooling 31-manage-vms 32-manage-gke 33-manage-serverless-ai`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
