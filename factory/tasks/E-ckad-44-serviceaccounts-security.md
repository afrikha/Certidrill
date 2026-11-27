# Task E-ckad-44-serviceaccounts-security — role EXERCISES, certification CKAD, chapter `44-serviceaccounts-security`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/44-serviceaccounts-security.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/environment/`: objectives 4.7.1, 4.7.2, 4.8.1, 4.8.2 (16 exercises). Ids start with the prefix of the objective's competency: `ckad-4g-` for 4.7.x, `ckad-4h-` for 4.8.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-4g- ckad-4h-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-4g-` and `--prefix ckad-4h-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-44-serviceaccounts-security.md`.
