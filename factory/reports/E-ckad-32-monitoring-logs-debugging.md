# E-ckad-32-monitoring-logs-debugging — report

28 exercises in `content/ckad/questions/observability/` (no existing model exercise for these objectives): 4 per objective for 3.3.1, 3.3.2, 3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.5.3.
Mix: 13 `command` (all mode `invocation`: these objectives are about reading and operating, not creating objects) and 15 `manifest`. Difficulty: 6 × 1, 14 × 2, 8 × 3.
Checks: `check-exercise.ts ckad ckad-3c- ckad-3d- ckad-3e-` → 0 problem(s); `content:validate` for each prefix → 0 problem(s).

## Deviations and design choices

- **3.4.2 "save logs and command output to a file"**: the real exam does this with `kubectl logs … > /path/file`, but the engine refuses redirections. I covered it with `kubectl cp` (copying a log file out of a container), a Job that writes command output to a file on a PVC (`sh -c "env > /reports/env.txt"`), a native sidecar that turns a log file into stdout, and `terminationMessagePolicy: FallbackToLogsOnError`, which ties restarts to the end of the logs. The redirection skill itself cannot be practised with this engine. A `single`-type quiz question could cover it.
- **Events**: I did not write a `kubectl get events --field-selector …` exercise. `kubectl events --for …` / `--types=Warning` is an equally valid answer, and a check cannot accept both (verb `get` + resource `event` vs. verb `events`). Events appear in the 3.5.x stems as `describe` output instead.
- **3.3.2 manifest** (`ckad-3c-labels-match-selector`): this one is about selector semantics (`!canary`, `in`, AND by comma): the candidate writes Pod template labels that a given `kubectl get -l` lists.
- **Engine limitation found**: `oneOf`/`notEquals` fail on an absent field (they need `v !== MISSING`), so "field absent or false" cannot be one check. I dropped that check from `ckad-3e-fix-configmap-mount`.

## Facts not verified word for word on kubernetes.io

- The Deployment error text `` `selector` does not match template `labels` `` (in `ckad-3e-fix-deployment-selector`) comes from memory of the apps validation message. The Deployments page only says the API rejects a mismatched selector.
- The `FailedScheduling` text "0/3 nodes are available: 3 node(s) didn't match Pod's node affinity/selector." and the ImagePull events (`401 Unauthorized`, `Back-off pulling image`) are realistic reconstructions, not quotes. The "less than or equal to cpu limit" message is quoted from the Limit Ranges page.
- I assumed that `kubectl logs deployment/NAME` and `kubectl cp` without `-c` use the default-container annotation or the first container. The cp and exec reference pages state this; the logs page does not.
- In `ckad-3c-get-custom-columns-node`, the check also accepts `{.metadata.name}` with braces in custom-columns. I believe kubectl accepts it, but I did not verify it.
- `ckad-3c-top-pod-containers` has a negative that uses `kubectl top pod … -c envoy`. The flag table of `kubectl top pod` has no `-c`, so kubectl should reject it as an unknown shorthand.
- The two pages disagree on the `kubectl debug --profile` default (`legacy` on "Debug Running Pods", `general` in the generated reference). No exercise depends on it.

## Possible follow-ups

- Course chapter 32 was not consulted (still in progress). Check that its terms match: native sidecar, `--prefix`, `--tail` default of 10 with a selector, `FallbackToLogsOnError`, `--target`.
