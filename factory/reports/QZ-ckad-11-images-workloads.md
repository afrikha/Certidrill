# QZ-ckad-11-images-workloads — report

File: `content/ckad/quizzes/11-images-workloads.yaml`, 10 questions `ckad-qz-11-01` to `-10`.

| # | Objective | Diff. | Type | Tested |
| --- | --- | --- | --- | --- |
| 1 | 1.1.3 | 1 | single | `command` only: the image's ENTRYPOINT and CMD are both dropped |
| 2 | 1.2.2 | 1 | single | one copy that must survive a node failure: Deployment `replicas: 1`, not a bare Pod or a pinned DaemonSet |
| 3 | 1.1.1 | 2 | single | shell-form ENTRYPOINT ignores CMD/args; exec form of `sh -c` is still a shell; CMD-only image loses the binary when `args` are set |
| 4 | 1.1.4 | 2 | single | pull secret in another namespace (`FailedToRetrieveImagePullSecret`) |
| 5 | 1.2.4 | 2 | single | `concurrencyPolicy: Replace` (the bank tests `Forbid`) |
| 6 | 1.1.3 | 3 | command/object | `kubectl run` args (no `--command`), `--image-pull-policy=Always`, `--restart=Never` |
| 7 | 1.2.1 | 3 | command/object | `kubectl create deployment ... --port -- /relay ...` (after `--` = command) |
| 8 | 1.1.2 | 3 | manifest | Deployment pinned by digest (DIGEST column, not IMAGE ID) + Pod-level `imagePullSecrets` |
| 9 | 1.2.3 | 3 | manifest | Indexed Job (`completionMode`, completions/parallelism, `OnFailure`, `backoffLimit`) |
| 10 | 1.2.4 | 3 | manifest | fix an old CronJob: `batch/v1`, `CRON_TZ` → `timeZone`, fields at the right level, Job-level vs Pod-level `activeDeadlineSeconds` |

Checks: `check-quiz.ts ckad 11-images-workloads` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-11-` → 5 exercises, 0 problem(s). Run again after the candidate reread (one option reordered, one label and one `why` reworded).

## Doubts and unverified facts

- **No kubectl here.** The object-mode outputs of q6 and q7 are written from the generator code as I know it (`dnsPolicy: ClusterFirst` and `restartPolicy` printed by `run`, `strategy: {}` by `create deployment`, container named after the image). The checks only read `kind`, `metadata`, `replicas`, `image`, `command`, `args`, `imagePullPolicy`, `ports`, `restartPolicy`. CI should confirm the outputs.
- **q7:** I believe `kubectl create deployment` refuses a command together with several `--image` flags, so the task uses one image. Not checked.
- **q3:** Docker behaviour (shell-form ENTRYPOINT ignores CMD and run arguments, runs under `/bin/sh -c`, not PID 1) checked on docs.docker.com, Dockerfile reference. The question cites only the kubernetes.io command/args page, because the task allows only kubernetes.io references. Some shells exec a single `sh -c` command and so replace themselves. The explanations therefore rest on "args have no effect", which holds whatever the shell does, and on the PID 1 rule as Docker documents it.
- **q4:** All options end with "then recreate the Pod". I did not check whether the kubelet picks up a Secret created later at its next pull retry without a recreate.
- **q8:** `NAME:TAG@sha256:...` is accepted (the Images page: only the digest is used to pull). The IMAGE ID and digest values are invented and the right length.
- **q10:** `timeZone` accepts `Asia/Tokyo` and also `Japan`, an IANA backward-compatible link that I believe Go's tz database resolves. I did not test `Japan`. The schedule check accepts `30 23 * * *` and `30 23 * * 0-6`. The CronJob page confirms that `CRON_TZ`/`TZ` in `schedule` is a validation error.
- **Chapter and bank:** I found no error in the chapter on the points used here. No bank exercise repeats one of these tasks: the bank tests `run --command`, `Forbid` + `startingDeadlineSeconds`, `docker pull` by digest, non-indexed `completions`/`parallelism`, and a Pod-level pull secret in the same namespace.
