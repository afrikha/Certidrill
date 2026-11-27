# Task E-ckad-41-extensions-access — role EXERCISES, certification CKAD, chapter `41-extensions-access`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/41-extensions-access.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/environment/`: objectives 4.1.1, 4.1.2, 4.2.1, 4.2.2, 4.2.3 (20 exercises). Ids start with the prefix of the objective's competency: `ckad-4a-` for 4.1.x, `ckad-4b-` for 4.2.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-4a- ckad-4b-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-4a-` and `--prefix ckad-4b-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-41-extensions-access.md`.
