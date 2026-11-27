# QZ-ckad-21-deployments-strategies — report

`content/ckad/quizzes/21-deployments-strategies.yaml`: 10 questions, ids `ckad-qz-21-01` to `-10`, English only.

| # | Objective | Type | Difficulty | What it tests |
| --- | --- | --- | --- | --- |
| 1 | 2.2.1 | single | 1 | Only a `spec.template` change creates a revision (`set env` vs scale, strategy, annotate) |
| 2 | 2.2.2 | single | 1 | `progressDeadlineSeconds` only sets `Progressing=False/ProgressDeadlineExceeded`, no rollback |
| 3 | 2.1.2 | single | 2 | Canary share counts Ready Pods only (4 stable + 1 Ready canary of 2 = 20 %) |
| 4 | 2.1.3 | single | 2 | Blue/green rollback after blue was scaled to 0: scale blue up, wait, then switch the selector |
| 5 | 2.1.1 | single | 2 | Editing the selector of `web-blue` is rejected (immutable in apps/v1) |
| 6 | 2.2.4 | manifest | 3 | HPA overrides `kubectl scale`: raise `minReplicas` to 6, keep max 10 and the CPU target |
| 7 | 2.1.3 | command/invocation | 3 | Abort every canary: `kubectl scale deployment -l track=canary --replicas=0 -n shop` |
| 8 | 2.2.3 | manifest | 3 | Declarative restart: `kubectl.kubernetes.io/restartedAt` in the Pod template metadata, not on the Deployment |
| 9 | 2.2.2 | manifest | 3 | Pod quota full: `maxSurge: 0`, `maxUnavailable: 2` (at least 4 of 6 available, fastest allowed) |
| 10 | 2.1.2 | manifest | 3 | Canary next to a Deployment whose immutable selector is `app: web`: new shared label `release: web` in the stable template and canary, Service selects it only |

Checks: `check-quiz` 0 problem(s), 0 warning(s); `check-exercise ckad ckad-qz-21-` 0 problem(s) (4 manifest, 1 command/invocation).

Bank exercises of 2.1.1–2.2.4 (28 files in `questions/deployment/`) were read. The quiz avoids their decisions. In particular, it avoids the relabel-a-Pod consequence (a negative of `ckad-2a-quarantine-pod-label`) and "Service with `track: stable` excludes the canary" (`ckad-2a-canary-abort`).

## Doubts and unverified points

- **Q7**: the v1.37 `kubectl scale` reference documents `-l, --selector` and `--all`, but none of its examples combines a selector with a resource type and no name. I assumed `kubectl scale deployment -l track=canary --replicas=0` works like the other verbs. `-ltrack=canary` (joined short flag) is still misparsed by `parseCommand` (known bug, see E-ckad-21 report), so it is not a solution. `-l 'track!=stable'` would also be rejected, but it is not equivalent: it would also match Deployments without a `track` label.
- **Q6**: one solution variant uses `autoscaling/v1` (`targetCPUUtilizationPercentage: 70`). I assumed it is still served in v1.37, as the checker's table says. I did not quote that the HPA raises a Deployment to `minReplicas` from the fetched part of the HPA page. I read the "remove spec.replicas" and "requests" sections, not the min/max clamp.
- **Q8**: the solutions quote the timestamp. An unquoted `2026-11-27T09:00:00Z` passes the local checks (YAML 1.2 keeps it a string). I did not verify how the Kubernetes YAML decoder treats it, but an annotation value must be a string.
- **Q9**: old Pods that are still terminating might count against the `pods` quota for their grace period and briefly delay the creation of the replacements. I did not verify this on the Resource Quotas page, and it does not change the answer.
- **Q10**: applying the three documents at once would switch the Service before the stable Pods carry `release: web`. The stem therefore says that the pipeline applies the Deployments, waits for their rollouts, and only then applies the Service.
- **Q4 option c**: "web-green has no earlier revision running blue" is my reasoning from the blue/green pattern (green created directly with the new image), not a quoted fact.

## Chapter vs kubernetes.io

- The chapter uses `kubectl autoscale … --cpu=70%`. The Deployments page (fetched 2026-11-27) still shows `kubectl autoscale deployment/nginx-deployment --min=10 --max=15 --cpu-percent=80%`. The kubectl reference only documents `--cpu` (E-ckad-21 report). kubernetes.io is inconsistent here. The quiz does not test the flag.
- The chapter says `rollout undo --to-revision=N` makes N "the newest revision number". The Deployments page only says "Each rollback updates the revision of the Deployment" and shows `deployment.kubernetes.io/revision=4` after an undo to revision 2. The two are consistent, and the quiz does not rely on the detail.
- No error found in the chapter or in the bank exercises read.
