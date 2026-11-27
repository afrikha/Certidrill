# Task E-ckad-31-probes-api-versions — role EXERCISES, certification CKAD, chapter `31-probes-api-versions`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/31-probes-api-versions.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/observability/`: objectives 3.1.1, 3.1.2, 3.2.1, 3.2.2 (16 exercises). Ids start with the prefix of the objective's competency: `ckad-3a-` for 3.1.x, `ckad-3b-` for 3.2.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-3a- ckad-3b-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-3a-` and `--prefix ckad-3b-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-31-probes-api-versions.md`.
