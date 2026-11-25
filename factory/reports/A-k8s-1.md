# A-k8s-1 — KCNA architect report (2026-11-23)

## Sources read
- LF certification page (training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/): multiple choice, 90 min, two attempts ("One Retake"), 12 months to take it, valid 2 years, domains 44/28/16/12 %. No question count, pass mark or Kubernetes version on the page.
- Curriculum PDF (raw KCNA_Curriculum.pdf, 3 pages): **no version printed** (PDF metadata: created 2026-03-22). Domains and **competency names only** (13), no bullet points.
- KCNA program changes page: new domains effective no earlier than 2025-11-24; Observability moved under Cloud Native Architecture.
- docs.linuxfoundation.org: Important Instructions MC (60 questions, 90 min), FAQ MC (pass 75 %, automatic scoring, results within 24 h), handbook Language page, ExamUI MC, Exam Scoring, Repurchasing pages. None mentions multiple-answer items -> `single` only.
- Old curriculum (old-versions/KCNA_Curriculum.pdf) used to restate competencies.

## Key facts
- Curriculum version: not published. Kubernetes version of KCNA: not published. blueprint.version = `'v1.37'` (CKA page: "based on Kubernetes v1.37"; latest minor on kubernetes.io/releases).
- Languages offered: English, Japanese, Simplified Chinese. **French not offered** -> English only.
- 60 questions, 90 min, pass 75 %, maxScore 100.

## Counts
4 domains, 13 groups, 70 objectives, 14 chapters (00-getting-started + 13, one per competency; no merge, no split).

## Unusual / deviations
- **All 70 objectives are our wording**: the curriculum gives only competency names and the LFS250 page only chapter titles. Objectives restate the competencies from kubernetes.io v1.37 concepts, CNCF project sites and the old curriculum's competencies (stated in the objectives.yaml header).
- **Readiness/progression thresholds rescaled /10** (minScore 80, domainFloor 65, scale 60–85, xp.scoreFrom 40, perPoint 5, domainGain 5, mastery 65/70/85, hatTrick 80, comeback 15): scores are on the blueprint scale and maxScore is 100, so the AZ-900 values (800, 650…) would make "ready" impossible. Same rules, same XP.
- **Vendor `CNCF` has no entry in `lib/vendors.ts`**: `vendorOf` falls back to Microsoft, so references on kubernetes.io / project sites will be reported "not on Microsoft Learn" by the course and question validators, and `vendorWarnings` flags the vendor. Not fixed (outside this task's files): a `cncf` vendor entry (docsHosts kubernetes.io, glossary.cncf.io, cncf.io, project sites; scoring all_or_nothing) is needed before COURSE/QUESTIONS tasks.
- `scoring` set to all_or_nothing as the task asks; there are no multi/dragdrop items anyway.
- TAG names changed (CNCF TOC repo: TAG Developer Experience, Infrastructure, Operational Resilience, Security and Compliance, Workloads Foundation; old TAGs archived): question writers must not use the old TAG names as correct answers.

## Check
`npx tsx factory/check-cert.ts kcna`: `referential OK: kcna vv1.37, 4 domains, 70 objectives`; 84 course problems = 14 missing chapter files + 70 uncovered objectives (expected).
