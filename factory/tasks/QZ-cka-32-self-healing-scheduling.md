# Task QZ-cka-32-self-healing-scheduling — end-of-chapter quiz, CKA, chapter `32-self-healing-scheduling`

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, `factory/BRIEF-QUIZ.md` (quiz format and the "not in the mock exam" rules), `factory/BRIEF-PRACTICE.md` (the practical exercise types), `tools/questions/WRITING_GUIDE.md`, `lib/questions/schema.ts`, `factory/exercise.ts`, the profile `factory/profiles/cka.md`, the chapter `content/cka/course/chapters/32-self-healing-scheduling.en.md` and the objectives in `content/cka/objectives.yaml`. Model of a quiz file: `content/az-104/quizzes/12-rbac.yaml` (format only; this quiz is English only, no `fr`).

Write `content/cka/quizzes/32-self-healing-scheduling.yaml`: 10 questions, ids `cka-qz-32-01` to `cka-qz-32-10`.

- Chapter objectives (each tested at least once): 3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.5.3.
- Positions 1–5: difficulty 1 then 2 (never decreasing), consolidation: `single` (4 options) or `multi`, on what the chapter teaches (which command, flag or field does what, defaults, what happens if…), with `explanation.options` for every wrong option.
- Positions 6–10: difficulty 3, **as hard as the real CKA tasks**: practical exercises of type `command` or `manifest` in the exact format of `factory/BRIEF-PRACTICE.md` (solutions, negatives, checks; at least one of each type).
- **Not in the practice bank**: read the exercises of these objectives in `content/cka/questions/` (grep the objective codes) and do not repeat any of them: a different task, different fields, a different trap.
- References: kubernetes.io (or helm.sh, etcd.io, gateway-api.sigs.k8s.io) pages you fetched. Facts for Kubernetes v1.37.

Checks: `npx tsx factory/check-quiz.ts cka 32-self-healing-scheduling` → `0 problem(s)` and no warning; `npx tsx factory/check-exercise.ts cka cka-qz-32-` → `0 problem(s)`. Then reread as a candidate (increasing difficulty, giveaways, a correct alternative that a check would reject) and re-run both checks.

Write only the quiz file and `factory/reports/QZ-cka-32-self-healing-scheduling.md` (doubts, unverified facts, any place where the chapter or a bank exercise is wrong). Final report: 2 lines.
