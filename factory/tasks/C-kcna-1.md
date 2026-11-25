# Task C-kcna-1 — role COURSE, certification KCNA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcna.md`, `content/kcna/objectives.yaml` and `content/kcna/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcna/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.en.md (structure only; the Linux Foundation exam format is in factory/profiles/<cert>.md), adapted to this exam using factory/profiles/kcna.md)
- `11-core-concepts` — objectives: 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.1.5, 1.1.6, 1.1.7
- `12-administration` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5, 1.2.6
- `13-scheduling` — objectives: 1.3.1, 1.3.2, 1.3.3, 1.3.4, 1.3.5
- `14-containerization` — objectives: 1.4.1, 1.4.2, 1.4.3, 1.4.4, 1.4.5
- `21-networking` — objectives: 2.1.1, 2.1.2, 2.1.3, 2.1.4, 2.1.5, 2.1.6
- `22-security` — objectives: 2.2.1, 2.2.2, 2.2.3, 2.2.4, 2.2.5, 2.2.6
- `23-troubleshooting` — objectives: 2.3.1, 2.3.2, 2.3.3, 2.3.4, 2.3.5

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcna 00-getting-started 11-core-concepts 12-administration 13-scheduling 14-containerization 21-networking 22-security 23-troubleshooting`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
