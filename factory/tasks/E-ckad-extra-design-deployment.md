# Task E-ckad-extra-design-deployment — role EXERCISES, CKAD, more design and deployment exercises

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` fully, `factory/exercise.ts`, `factory/profiles/ckad.md`, the chapters 11, 12, 21 and 22 in `content/ckad/course/chapters/`, and **every existing exercise** in `content/ckad/questions/design/` and `content/ckad/questions/deployment/` and the quizzes 11, 12, 21, 22 in `content/ckad/quizzes/`.

The practice sets need more tasks in these domains. Write **12 new exercises**: 1 each for 1.2.1, 1.2.3, 1.2.4, 1.3.2, 1.4.1, 1.4.2 (ids `ckad-1b-…`, `ckad-1c-…`, `ckad-1d-…`) and 1 each for 2.1.2, 2.2.1, 2.2.2, 2.2.4, 2.3.2, 2.4.3 (ids `ckad-2a-…`, `ckad-2b-…`, `ckad-2c-…`, `ckad-2d-…`), with new slugs, in the matching domain folder. Each must test a task or a trap that no existing exercise or quiz question tests. Mix ~45 % command / 55 % manifest; difficulty mostly 2 and 3.

Checks: `npx tsx factory/check-exercise.ts ckad` → 0 problem(s); `npm run -s content:validate -- --cert ckad` → 0 problem(s). Doubts in `factory/reports/E-ckad-extra-design-deployment.md`. Final report: 2 lines.
