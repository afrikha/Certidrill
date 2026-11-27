# Task E-ckad-32-monitoring-logs-debugging — role EXERCISES, certification CKAD, chapter `32-monitoring-logs-debugging`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/32-monitoring-logs-debugging.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/observability/`: objectives 3.3.1, 3.3.2, 3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.5.3 (28 exercises). Ids start with the prefix of the objective's competency: `ckad-3c-` for 3.3.x, `ckad-3d-` for 3.4.x, `ckad-3e-` for 3.5.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-3c- ckad-3d- ckad-3e-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-3c-` and `--prefix ckad-3d-` and `--prefix ckad-3e-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-32-monitoring-logs-debugging.md`.
