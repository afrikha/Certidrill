# QZ-ckad-32-monitoring-logs-debugging — report

File: `content/ckad/quizzes/32-monitoring-logs-debugging.yaml` (10 questions, English only).
Checks: `check-quiz.ts ckad 32-monitoring-logs-debugging` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-32-` → 5 exercises, 0 problem(s).

## Layout

| # | Obj. | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 3.3.1 | 1 | single | `kubectl top` needs metrics-server (Metrics API) |
| 2 | 3.4.1 | 1 | single | `--tail` defaults to 10 per Pod with `-l` |
| 3 | 3.5.1 | 2 | single | `Completed` / exit 0 in a Deployment → CrashLoopBackOff, use a Job |
| 4 | 3.3.2 | 2 | multi (2 of 5) | Warning events of a namespace in time order: `kubectl events --types` vs `get events --field-selector type=... --sort-by` |
| 5 | 3.5.2 | 2 | single | `port-forward svc/web LOCAL:REMOTE` vs reversed ports, `kubectl proxy`, `expose` |
| 6 | 3.4.2 | 3 | command/invocation | relate restarts to the right container from `describe`, then `logs -c cache-warmer -p --tail=30` |
| 7 | 3.3.2 | 3 | command/invocation | `custom-columns` NAME/RESTARTS + `--sort-by` JSONPath on restartCount + label selector |
| 8 | 3.5.2 | 3 | command/invocation | `kubectl debug --copy-to --container=<existing> -- sh` (no `--image`, no `--replace`) |
| 9 | 3.5.1 | 3 | manifest | Pending Pod → unbound PVC → missing StorageClass + unsupported RWX; `""` vs omitted class |
| 10 | 3.5.3 | 3 | manifest | CreateContainerConfigError with three hidden bad references (ConfigMap key, Secret name, Secret key), no `optional: true` |

Not in the bank: checked every exercise of 3.3.x–3.5.x in `content/ckad/questions/` plus startup/liveness timing, Service selector/targetPort, temp-Pod and secretKeyRef exercises of other domains. First drafts that overlapped (startupProbe budget, probe `timeoutSeconds`, Service selector + targetPort fix, `kubectl run --rm -it`) were replaced.

## Verified (kubernetes.io pages fetched, plus kubectl/kubernetes source on GitHub)

- metrics-server implements the Metrics API and must be deployed (Resource metrics pipeline).
- `kubectl logs --tail`: -1 without selector, 10 with a selector; `-p`, `-c`, `--all-containers` (kubectl logs reference).
- `kubectl events --for`, `--types`; kubectl source sorts by `series.lastObservedTime` / `lastTimestamp` / `eventTime` (events.go `SortableEvents`).
- Event field selector supports `type` (kubernetes `pkg/registry/core/event/strategy.go`).
- `--sort-by` and custom-columns accept `a.b`, `.a.b`, `{.a.b}` (`RelaxedJSONPathExpression` in kubectl source); sort-by takes a JSONPath (kubectl overview page).
- `kubectl debug --copy-to --container=<existing> -- sh` changes the command (Debug Running Pods); with `--image`, the existing container's image is replaced (kubectl `debug.go`, `generatePodCopyWithDebugContainer`); `--replace` deletes the original (kubectl debug reference).
- port-forward `LOCAL:REMOTE`, a Pod selected by the Service (kubectl port-forward reference).
- Deployment allows only `restartPolicy: Always`; Always restarts after exit 0; back-off (Deployments, Pod Lifecycle).
- PVC `storageClassName: ""` disables dynamic provisioning; omitted → default class (Persistent Volumes).
- Kubelet env error texts `couldn't find key %v in ConfigMap %v/%v` and the first-error-stops behaviour (`kubelet_pods.go`); scheduler reason `pod has unbound immediate PersistentVolumeClaims`; PV controller `ProvisioningFailed` with the lister's NotFound error (`storageclass.storage.k8s.io "fast-ssd" not found`).

## Doubts / not verified

- Q1: the exact error text `error: Metrics API not available` is from memory (kubectl top source not fetched).
- Q4: `kubectl events` orders by last occurrence, `--sort-by=.metadata.creationTimestamp` by first occurrence; for deduplicated events the two orders can differ. The stem only asks "sorted by time, oldest first", so both count as correct.
- Q4 option b: said to be "in the order the API lists them, not by time". Event names end with a hex timestamp, so the events of *one* object come out roughly in creation order by name; that is why the question covers the whole namespace (several objects), where name order is not time order. The chapter's sentence "`kubectl get events` is not sorted by time by default" is right in general but this nuance is not in it.
- Q9: the scheduler message is shown truncated (the real one continues with `preemption: ...`). The provisioner names (`*.csi.example.com`) are invented; the claim that both support only ReadWriteOnce is stated in the stem.
- Q10: Secret data values in the stem are fake base64 strings.

## Chapter remarks

- No error found in the chapter for the points used. Minor: the `kubectl events` claim "lists recent events in order" could say "sorted by last occurrence time".
