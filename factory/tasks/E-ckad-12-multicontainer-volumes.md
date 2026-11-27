# Task E-ckad-12-multicontainer-volumes — role EXERCISES, certification CKAD, chapter `12-multicontainer-volumes`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/12-multicontainer-volumes.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/design/`: objectives 1.3.1, 1.3.2, 1.3.3, 1.4.1, 1.4.2, 1.4.3 (24 exercises). Ids start with the prefix of the objective's competency: `ckad-1c-` for 1.3.x, `ckad-1d-` for 1.4.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-1c- ckad-1d-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-1c-` and `--prefix ckad-1d-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-12-multicontainer-volumes.md`.
