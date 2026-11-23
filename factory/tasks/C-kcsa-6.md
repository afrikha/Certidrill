# Task C-kcsa-6 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `61-compliance-frameworks` — objectives: 6.1.1, 6.1.2, 6.1.3
- `62-threat-modeling` — objectives: 6.2.1, 6.2.2, 6.2.3
- `63-supply-chain-compliance` — objectives: 6.3.1, 6.3.2, 6.3.3
- `64-automation-tooling` — objectives: 6.4.1, 6.4.2, 6.4.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 61-compliance-frameworks 62-threat-modeling 63-supply-chain-compliance 64-automation-tooling`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
