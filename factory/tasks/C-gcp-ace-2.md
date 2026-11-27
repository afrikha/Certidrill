# Task C-gcp-ace-2 — role COURSE, certification GCP-ACE (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-ace.md`, `content/gcp-ace/objectives.yaml` and `content/gcp-ace/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-ace/course/chapters/<id>.en.md`, no `.fr.md`):

- `21-compute-engine` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6, 2.1.7
- `22-gke-serverless` — objectives: 2.1.8, 2.1.9, 2.1.10, 2.1.11, 2.1.12
- `23-storage-data` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4
- `24-networking` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5, 2.3.6

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-ace 21-compute-engine 22-gke-serverless 23-storage-data 24-networking`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
