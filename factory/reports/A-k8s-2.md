# A-k8s-2 — KCSA architect report (2026-11-23)

## Files written
- `content/kcsa/blueprint.yaml`, `content/kcsa/objectives.yaml`, `content/kcsa/course/course.yaml`
- `factory/plans/kcsa.json`, `factory/profiles/kcsa.md` (440 words)

## Sources and versions
- **Curriculum**: `KCSA Curriculum.pdf` (github.com/cncf/curriculum, raw file read). **No version number printed**, no Kubernetes version; PDF last modified 2024-06-24 (= last commit on the file).
- **Kubernetes version of the exam**: not published (LF page, CNCF page, handbook, FAQ). `blueprint.version: 'v1.37'` = latest minor release on kubernetes.io/releases and the version of the current CKA/CKAD/CKS curricula; same choice as KCNA.
- **Languages**: English only (handbook Language page). French not offered.
- **Exam facts**: 90 min, 60 multiple-choice questions, pass 75 %, score as a percentage, results within 24 h, one retake included, 12 months to take it, valid 2 years, CKS renews KCSA, 250 USD. No source mentions multiple-answer items -> `single` only.

## Counts
6 domains (14/22/22/16/16/10 %), 43 groups (one per curriculum competency), 138 objectives, 44 chapters (`00-getting-started` + 43). `check-cert`: `referential OK: kcsa vv1.37, 6 domains, 138 objectives`; the 182 course problems are the expected missing chapters (44) and uncovered objectives (138).

## Unusual points
1. **Objectives written by Certidrill**: the curriculum lists only competency names, no bullets. 3–4 objectives per competency, from kubernetes.io security docs, the CNCF Cloud Native Security Whitepaper and the in-scope CNCF projects (said in the objectives.yaml header).
2. **Authorization**: on the LF page under "Kubernetes Security Fundamentals" but missing from the PDF. Kept as group 3.4.
3. **"Threat Modeling Frameworks"** spelled as in the PDF; the LF page spells it "Modelling".
4. **Conflicting domain table**: `kcsa/README.md` in the curriculum repo (added 2025-11-28) lists other domains (Cloud Native Fundamentals 16 %, Kubernetes Security Fundamentals 20 %, Container Security Fundamentals 20 %, Secure Software Supply Chain 16 %, Monitoring, Logging and Runtime Security 12 %, General Security Knowledge 16 %). The LF page, the CNCF page and the PDF all agree on the six domains used here. Watch for a curriculum change.
5. **4Cs**: in the curriculum, but kubernetes.io's "Cloud Native Security and Kubernetes" page now uses lifecycle phases (Develop, Distribute, Deploy, Runtime) and no longer shows the 4Cs. Course writers have no current kubernetes.io page to cite for the 4Cs.
6. **Score thresholds**: the AZ-900 readiness and progression values are on a 1,000 scale. Keeping them with `maxScore: 100` would make readiness, XP and mastery unreachable. Every score threshold was divided by 10, as KCNA did (listed in the blueprint header). This departs from "keep readiness and progression values".
7. **Chapter ids**: domain 2 has 11 competencies, so the last two ids are `210-client-security` and `211-storage`.
8. **Vendor `CNCF` is unknown to `lib/vendors.ts`**: `vendorOf()` falls back to Microsoft. Course references on kubernetes.io would be flagged as "not on Microsoft Learn". The code needs a CNCF vendor before course writers add references.
