# Task FIX-k8s-ckad — review pass, CKAD course, exercises and quizzes

Read `factory/BRIEF.md`, `factory/BRIEF-K8S.md`, `factory/BRIEF-EN-ONLY.md`, `factory/BRIEF-PRACTICE.md`, `factory/exercise.ts` and `factory/profiles/ckad.md`.

The writers of the CKAD chapters, exercises and quizzes listed doubts and suspected errors in `factory/reports/C-ckad-*.md`, `factory/reports/E-ckad-*.md` and `factory/reports/QZ-ckad-*.md`. Read them all. For each finding that concerns content (not tooling):

1. Verify it on the official docs (kubernetes.io for v1.37, helm.sh, etcd.io, gateway-api.sigs.k8s.io); fetch the pages.
2. If confirmed, fix the chapter (`content/ckad/course/chapters/*.en.md`), the exercise (`content/ckad/questions/**`) or the quiz (`content/ckad/quizzes/*`) concerned, keeping ids, objectives, types and difficulty. If a chapter and an exercise disagree, make them agree with the docs.
3. If it can't be confirmed either way, leave it and list it.

Tooling findings are already handled (parser: `create service <type>`, `helm -i`, crictl/journalctl/systemctl/etcdctl short flags, `expose`/`run -l` = `--labels`): re-run the checks, and fix any exercise whose checks or negatives were written around the old parsing.

Checks at the end, all at 0 problem(s): `npx tsx factory/check-exercise.ts ckad`, `npx tsx factory/check-quiz.ts ckad` (0 warning), `npx tsx factory/check-cert.ts ckad`, `npm run -s content:validate -- --cert ckad`.

Write `factory/reports/FIX-k8s-ckad.md`: table Finding | Docs | Change, then "Not confirmed" and "For a human decision". Final report: 3 lines.
