# Task C-kcsa-1 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `00-getting-started` — objectives: (none: exam format, how to read questions, confusing pairs, study plan — model: content/az-900/course/chapters/00-getting-started.en.md (structure only; the Linux Foundation exam format is in factory/profiles/<cert>.md), adapted to this exam using factory/profiles/kcsa.md)
- `11-4cs` — objectives: 1.1.1, 1.1.2, 1.1.3
- `12-infrastructure` — objectives: 1.2.1, 1.2.2, 1.2.3, 1.2.4
- `13-controls` — objectives: 1.3.1, 1.3.2, 1.3.3
- `14-isolation` — objectives: 1.4.1, 1.4.2, 1.4.3
- `15-image-security` — objectives: 1.5.1, 1.5.2, 1.5.3, 1.5.4
- `16-workload-security` — objectives: 1.6.1, 1.6.2, 1.6.3
- `21-api-server` — objectives: 2.1.1, 2.1.2, 2.1.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 00-getting-started 11-4cs 12-infrastructure 13-controls 14-isolation 15-image-security 16-workload-security 21-api-server`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
