# Task C-gcp-ace-1 — role COURSE, certification GCP-ACE (associate)

Read `factory/BRIEF.md`, then `factory/BRIEF-GCP.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/gcp-ace.md`, `content/gcp-ace/objectives.yaml` and `content/gcp-ace/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/gcp-ace/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.*, adapted to this exam using factory/profiles/gcp-ace.md)
- `11-projects-hierarchy` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.8, 1.1.12
- `12-environment-setup` — objectives: 1.1.6, 1.1.7, 1.1.9, 1.1.10, 1.1.11
- `13-billing` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts gcp-ace 00-getting-started 11-projects-hierarchy 12-environment-setup 13-billing`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`). Associate level: see `factory/profiles/gcp-ace.md`. Report doubts in `factory/reports/<task id>.md`.
