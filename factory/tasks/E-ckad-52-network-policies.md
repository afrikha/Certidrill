# Task E-ckad-52-network-policies — role EXERCISES, certification CKAD, chapter `52-network-policies`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/52-network-policies.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/networking/`: objectives 5.1.1, 5.1.2 (8 exercises). Ids start with the prefix of the objective's competency: `ckad-5a-` for 5.1.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-5a-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-5a-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-52-network-policies.md`.
