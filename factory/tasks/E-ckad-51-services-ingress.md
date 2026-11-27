# Task E-ckad-51-services-ingress — role EXERCISES, certification CKAD, chapter `51-services-ingress`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/51-services-ingress.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/networking/`: objectives 5.2.1, 5.2.2, 5.3.1, 5.3.2 (16 exercises). Ids start with the prefix of the objective's competency: `ckad-5b-` for 5.2.x, `ckad-5c-` for 5.3.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-5b- ckad-5c-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-5b-` and `--prefix ckad-5c-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-51-services-ingress.md`.
