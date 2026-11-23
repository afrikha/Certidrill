# Task C-kcsa-5 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `47-privilege-escalation` — objectives: 4.7.1, 4.7.2, 4.7.3
- `51-supply-chain` — objectives: 5.1.1, 5.1.2, 5.1.3, 5.1.4
- `52-image-repository` — objectives: 5.2.1, 5.2.2, 5.2.3
- `53-observability` — objectives: 5.3.1, 5.3.2, 5.3.3
- `54-service-mesh` — objectives: 5.4.1, 5.4.2, 5.4.3
- `55-pki` — objectives: 5.5.1, 5.5.2, 5.5.3
- `56-connectivity` — objectives: 5.6.1, 5.6.2, 5.6.3
- `57-admission-control` — objectives: 5.7.1, 5.7.2, 5.7.3, 5.7.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 47-privilege-escalation 51-supply-chain 52-image-repository 53-observability 54-service-mesh 55-pki 56-connectivity 57-admission-control`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
