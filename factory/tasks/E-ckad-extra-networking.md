# Task E-ckad-extra-networking — role EXERCISES, CKAD, more Services & Networking exercises

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` fully, `factory/exercise.ts`, `factory/profiles/ckad.md`, the chapters `content/ckad/course/chapters/51-services-ingress.en.md` and `52-network-policies.en.md`, and **every existing exercise** in `content/ckad/questions/networking/` and the quizzes `content/ckad/quizzes/51-*.yaml`, `52-*.yaml`.

The practice sets need more networking tasks. Write **2 new exercises per objective** 5.1.1, 5.1.2, 5.2.1, 5.2.2, 5.3.1, 5.3.2 (12) in `content/ckad/questions/networking/`, ids `ckad-5a-…`, `ckad-5b-…`, `ckad-5c-…` with new slugs. Each must test a task or a trap that no existing exercise or quiz question tests. Mix ~45 % command / 55 % manifest; difficulty mostly 2 and 3.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-5a- ckad-5b- ckad-5c-` → 0 problem(s); `npm run -s content:validate -- --cert ckad` → 0 problem(s). Doubts in `factory/reports/E-ckad-extra-networking.md`. Final report: 2 lines.
