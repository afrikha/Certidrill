# Task E-ckad-11-images-workloads — role EXERCISES, certification CKAD, chapter `11-images-workloads`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, then `factory/BRIEF-PRACTICE.md` **fully** (it defines the exercise types), `factory/exercise.ts`, the three model exercises it names, `factory/profiles/ckad.md` and `content/ckad/objectives.yaml`. The chapter `content/ckad/course/chapters/11-images-workloads.en.md` may still be in progress: rely on kubernetes.io, not on it.

Write **4 exercises per objective** in `content/ckad/questions/design/`: objectives 1.1.1, 1.1.2, 1.1.3, 1.1.4, 1.2.1, 1.2.2, 1.2.3, 1.2.4 (32 exercises). Ids start with the prefix of the objective's competency: `ckad-1a-` for 1.1.x, `ckad-1b-` for 1.2.x, then a short slug (`ckad-1b-cronjob-concurrency`). A model exercise that already exists for one of your objectives counts as one of its 4; do not edit it.

Mix: about 45 % `command` (both modes) and 55 % `manifest`; difficulty about 20 % 1, 50 % 2, 30 % 3. Cover different tasks inside each objective.

Checks: `npx tsx factory/check-exercise.ts ckad ckad-1a- ckad-1b-` → `0 problem(s)`; `npm run -s content:validate -- --cert ckad --prefix ckad-1a-` and `--prefix ckad-1b-` → `0 problem(s)`. Report doubts in `factory/reports/E-ckad-11-images-workloads.md`.

Note for 1.1.1 and 1.1.2: a Dockerfile is not YAML, so it can't be a `manifest` exercise. Practise image work with `command` exercises in mode `invocation` and `body.tools: [docker, podman]` (or `[podman, docker]`): `build -t … -f …`, `tag`, `push`, `save -o`, `load -i`… State in the stem which tool is installed, and accept both tools when the task allows either. For 1.1.1 you may also give a Dockerfile in `body.files` and ask for the build or run command that uses it correctly (target stage, build argument, tag).
