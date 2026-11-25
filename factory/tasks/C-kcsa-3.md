# Task C-kcsa-3 — role COURSE, certification KCSA (fundamentals)

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md` and `factory/BRIEF-EN-ONLY.md` (they override the Microsoft-specific and French rules) (rules + role COURSE), `factory/profiles/kcsa.md`, `content/kcsa/objectives.yaml` and `content/kcsa/course/course.yaml` (chapter titles).

Write these chapters, **in English only** (`content/kcsa/course/chapters/<id>.en.md`, no `.fr.md`):

- `210-client-security` — objectives: 2.10.1, 2.10.2, 2.10.3
- `211-storage` — objectives: 2.11.1, 2.11.2, 2.11.3
- `31-pod-security-standards` — objectives: 3.1.1, 3.1.2, 3.1.3, 3.1.4
- `32-pod-security-admission` — objectives: 3.2.1, 3.2.2, 3.2.3
- `33-authentication` — objectives: 3.3.1, 3.3.2, 3.3.3, 3.3.4
- `34-authorization` — objectives: 3.4.1, 3.4.2, 3.4.3, 3.4.4
- `35-secrets` — objectives: 3.5.1, 3.5.2, 3.5.3
- `36-isolation-segmentation` — objectives: 3.6.1, 3.6.2, 3.6.3, 3.6.4

Every listed objective must appear in the `objectives:` of at least one section marker of its chapter. Check with:
`npx tsx factory/check-cert.ts kcsa 210-client-security 211-storage 31-pod-security-standards 32-pod-security-admission 33-authentication 34-authorization 35-secrets 36-isolation-segmentation`

**English only**: localized fields `{ en: … }` only, no `fr` key, no `.fr.md` file (see `factory/BRIEF-EN-ONLY.md`).
