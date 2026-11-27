# Task QZ-ckad-12-multicontainer-volumes — end-of-chapter quiz, CKAD, chapter `12-multicontainer-volumes`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, `factory/BRIEF-QUIZ.md` (quiz format and the "not in the mock exam" rules), `factory/BRIEF-PRACTICE.md` (the practical exercise types), `tools/questions/WRITING_GUIDE.md`, `lib/questions/schema.ts`, `factory/exercise.ts`, the profile `factory/profiles/ckad.md`, the chapter `content/ckad/course/chapters/12-multicontainer-volumes.en.md` and the objectives in `content/ckad/objectives.yaml`. Model of a quiz file: `content/az-104/quizzes/12-rbac.yaml` (format only; this quiz is English only, no `fr`).

Write `content/ckad/quizzes/12-multicontainer-volumes.yaml`: 10 questions, ids `ckad-qz-12-01` to `ckad-qz-12-10`.

- Chapter objectives (each tested at least once): 1.3.1, 1.3.2, 1.3.3, 1.4.1, 1.4.2, 1.4.3.
- Positions 1–5: difficulty 1 then 2 (never decreasing), consolidation: `single` (4 options) or `multi`, on what the chapter teaches (which command, flag or field does what, defaults, what happens if…), with `explanation.options` for every wrong option.
- Positions 6–10: difficulty 3, **as hard as the real CKAD tasks**: practical exercises of type `command` or `manifest` in the exact format of `factory/BRIEF-PRACTICE.md` (solutions, negatives, checks; at least one of each type).
- **Not in the practice bank**: read the exercises of these objectives in `content/ckad/questions/` (grep the objective codes) and do not repeat any of them: a different task, different fields, a different trap.
- References: kubernetes.io (or helm.sh, etcd.io, gateway-api.sigs.k8s.io) pages you fetched. Facts for Kubernetes v1.37.

Checks: `npx tsx factory/check-quiz.ts ckad 12-multicontainer-volumes` → `0 problem(s)` and no warning; `npx tsx factory/check-exercise.ts ckad ckad-qz-12-` → `0 problem(s)`. Then reread as a candidate (increasing difficulty, giveaways, a correct alternative that a check would reject) and re-run both checks.

Write only the quiz file and `factory/reports/QZ-ckad-12-multicontainer-volumes.md` (doubts, unverified facts, any place where the chapter or a bank exercise is wrong). Final report: 2 lines.
