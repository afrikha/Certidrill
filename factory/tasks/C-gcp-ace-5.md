# Task C-gcp-ace-5 — role COURSE, certification GCP-ACE (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-ace.md`, `content/gcp-ace/objectives.yaml` and `content/gcp-ace/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-ace/course/chapters/<id>.en.md`, no `.fr.md`):

- `41-iam` — objectives: 4.1.1, 4.1.2, 4.1.3
- `42-service-accounts` — objectives: 4.2.1, 4.2.2, 4.2.3, 4.2.4, 4.2.5, 4.2.6, 4.2.7, 4.2.8

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-ace 41-iam 42-service-accounts`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
