# Task C-kcsa-4 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `37-audit-logging` — objectives: 3.7.1, 3.7.2, 3.7.3
- `38-network-policy` — objectives: 3.8.1, 3.8.2, 3.8.3
- `41-trust-boundaries` — objectives: 4.1.1, 4.1.2, 4.1.3
- `42-persistence` — objectives: 4.2.1, 4.2.2, 4.2.3
- `43-denial-of-service` — objectives: 4.3.1, 4.3.2, 4.3.3
- `44-malicious-code` — objectives: 4.4.1, 4.4.2, 4.4.3
- `45-network-attacker` — objectives: 4.5.1, 4.5.2, 4.5.3
- `46-sensitive-data` — objectives: 4.6.1, 4.6.2, 4.6.3

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 37-audit-logging 38-network-policy 41-trust-boundaries 42-persistence 43-denial-of-service 44-malicious-code 45-network-attacker 46-sensitive-data`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
