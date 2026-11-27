Observability tasks are short and precise: write the name of the Pod that uses the most CPU to a file, save the logs of the previous container instance, find why a Deployment has no ready Pods and fix it. The answers come from `kubectl top`, `kubectl get` with selectors and output formats, `describe` and events, `logs`, `exec` and `debug`. This chapter gives the exact flags, the order in which to read the clues, and the fixes for the usual breakages.

<!-- section: top | objectives: 3.3.1 -->
## Resource usage with kubectl top

`kubectl top` reads the **Metrics API** served by metrics-server (without it, the command fails). It shows current usage, not requests or limits.

```bash
kubectl top node                                  # CPU(cores), MEMORY(bytes) per node
kubectl top node --sort-by=memory
kubectl top pod -n shop                           # one line per Pod
kubectl top pod -n shop --containers              # one line per container
kubectl top pod -n shop --sort-by=cpu             # highest first
kubectl top pod -n shop -l app=web --sum          # adds a total line
```

| Task asks for | Command or flag |
| --- | --- |
| Usage of each container of a Pod | `kubectl top pod web-1 --containers` |
| The heaviest Pod by CPU or memory | `--sort-by=cpu` or `--sort-by=memory` (only these two values) |
| Pods of one app only | `-l app=web` (label selector) or `--field-selector` |
| A line to parse or save | `--no-headers` |
| Node usage against capacity | `kubectl top node --show-capacity` (default is allocatable) |

A typical task: "write the name of the Pod with the highest CPU usage in namespace `shop` to `/opt/answers/top-pod.txt`".

```bash
kubectl top pod -n shop --sort-by=cpu --no-headers | head -1 | awk '{print $1}' > /opt/answers/top-pod.txt
```

> **Exam trap.** `--sort-by` on `kubectl top` takes `cpu` or `memory`, not a JSONPath. On `kubectl get`, `--sort-by` takes a JSONPath such as `.status.containerStatuses[0].restartCount`. Do not mix the two syntaxes.

<!-- section: get-describe-events | objectives: 3.3.2 -->
## Inspecting objects with get, describe and events

**Columns and labels**

```bash
kubectl get pods -n shop -o wide                  # adds IP, NODE, NOMINATED NODE, READINESS GATES
kubectl get pods -n shop --show-labels            # all labels as the last column
kubectl get pods -n shop -L app,tier              # selected labels as columns
kubectl get pods -n shop -l 'app=web,tier!=cache' # label selector: =, ==, !=, in, notin
```

**Field selectors** support few fields and only `=`, `==`, `!=`. For Pods: `metadata.name`, `metadata.namespace`, `spec.nodeName`, `spec.restartPolicy`, `spec.serviceAccountName`, `status.phase`, `status.podIP` and a few more. An unsupported field returns `is not a known field selector`.

```bash
kubectl get pods -A --field-selector=status.phase=Pending
kubectl get pods -A --field-selector=spec.nodeName=node-2,status.phase!=Running
```

**Output formats** extract exactly what a task asks for:

```bash
kubectl get pod web-1 -n shop -o jsonpath='{.status.podIP}'
kubectl get pods -n shop -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.nodeName}{"\n"}{end}'
kubectl get pod web-1 -n shop -o jsonpath='{.spec.containers[?(@.name=="app")].image}'
kubectl get pods -n shop -o custom-columns=NAME:.metadata.name,IMAGE:.spec.containers[*].image,NODE:.spec.nodeName
kubectl get pods -n shop --sort-by='.status.containerStatuses[0].restartCount'
```

| Task asks for | Use |
| --- | --- |
| One value of one object | `-o jsonpath='{.path}'` |
| A table with chosen columns | `-o custom-columns=HEADER:.path,...` |
| One line per item | `jsonpath` with `{range .items[*]}...{"\n"}{end}` |
| An element of a list by name | JSONPath filter `[?(@.name=="app")]` |
| Names only, to loop over | `-o name` (prints `pod/web-1`) |

**describe and events.** `kubectl describe` shows conditions, container `State`, `Last State`, `Exit Code`, `Restart Count` and recent **Events**. Events expire (about one hour by default).

```bash
kubectl describe pod web-1 -n shop
kubectl events -n shop --for pod/web-1
kubectl events -n shop --types=Warning
kubectl get events -n shop --sort-by=.metadata.creationTimestamp
kubectl get events -n shop --field-selector involvedObject.name=web-1,type=Warning
```

> **Exam trap.** `kubectl get events` is not sorted by time by default; add `--sort-by=.metadata.creationTimestamp` or use `kubectl events`, which lists recent events in order. Events of a Deployment's Pods are often on the **ReplicaSet** (for example `FailedCreate`), not on the Deployment.

<!-- section: logs | objectives: 3.4.1 -->
## Reading container logs

```bash
kubectl logs web-1 -n shop                        # single-container Pod
kubectl logs web-1 -n shop -c sidecar             # one container of a multi-container Pod
kubectl logs web-1 -n shop --all-containers       # every container of the Pod
kubectl logs web-1 -n shop -f                     # stream (--follow)
kubectl logs web-1 -n shop -p                     # previous instance (--previous)
kubectl logs web-1 -n shop --since=15m            # relative duration: 5s, 2m, 3h
kubectl logs web-1 -n shop --tail=50              # last 50 lines
kubectl logs -n shop -l app=web --prefix          # every Pod matching the selector
kubectl logs -n shop deployment/web               # one Pod of the Deployment
kubectl logs -n shop deployment/web --all-pods    # every Pod of the Deployment, prefixed
```

| Flag | Default | Note |
| --- | --- | --- |
| `-c`, `--container` | default container | The container named by the `kubectl.kubernetes.io/default-container` annotation, otherwise the first one |
| `-p`, `--previous` | false | Logs of the terminated instance: the only way to see why a restarted container crashed |
| `--tail` | `-1` (all lines) | With `-l`, the default becomes **10** lines per Pod |
| `--prefix` | false | Adds `[pod/name/container]` to each line; `--all-pods` turns it on |

> **Exam trap.** On a multi-container Pod, `kubectl logs web-1` without `-c` prints `Defaulted container "app" out of: app, sidecar` and shows the default (usually the first) container, which may not be the one the task names. Always pass `-c`.

> **Exam trap.** With `-l app=web`, `kubectl logs` prints only the last 10 lines of each Pod. If the task wants the full logs, add `--tail=-1` or target the Pods one by one.

<!-- section: save-relate | objectives: 3.4.2 -->
## Saving output and relating logs to restarts

Many tasks are graded from a file you write: write exactly what is asked, at the given path, on the host the task names.

```bash
kubectl logs web-1 -n shop -c app > /opt/answers/web-app.log
kubectl logs web-1 -n shop -p > /opt/answers/web-previous.log
```

Use `>` to replace and `>>` to append, then check the file with `cat`.

**Relating logs to restarts.** The `RESTARTS` column counts container restarts. After a restart, `kubectl logs` shows the **new** instance, often a few clean startup lines; the crash is in `--previous`.

```bash
kubectl get pod web-1 -n shop                     # RESTARTS 4 (35s ago)
kubectl get pod web-1 -n shop -o jsonpath='{.status.containerStatuses[0].lastState.terminated}'
kubectl logs web-1 -n shop -p --tail=20
```

`lastState.terminated` holds `reason` (`Error`, `OOMKilled`, `Completed`), `exitCode`, `startedAt` and `finishedAt`. With `terminationMessagePolicy: FallbackToLogsOnError`, the last log lines become the termination message when `/dev/termination-log` is empty and the container failed.

> **Exam trap.** If the task says "the logs of the crashed container", plain `kubectl logs` is wrong once the container has restarted: use `-p`. `--previous` fails if the container never restarted.

<!-- section: diagnose | objectives: 3.5.1 -->
## Diagnosing Pod states

The `STATUS` column is a summary, not the Pod phase. Map it to a cause, then confirm with `describe`.

| STATUS or reason | Meaning | Where to look | Usual fix |
| --- | --- | --- | --- |
| `Pending` | Not scheduled | Events: `FailedScheduling`, e.g. `0/3 nodes are available: 3 Insufficient cpu` | Lower requests, fix `nodeSelector`, affinity, tolerations, or an unbound PVC |
| `ErrImagePull`, then `ImagePullBackOff` | The kubelet cannot pull the image | Events: `Failed to pull image`, `not found`, `unauthorized` | Correct image name or tag, add `imagePullSecrets` |
| `CreateContainerConfigError` | A referenced ConfigMap, Secret or key is missing | Events | Create the object or fix the reference |
| `CrashLoopBackOff` | The container starts, exits, and the kubelet waits before restarting it | `Last State: Terminated`, `Exit Code`, `logs -p` | Fix the command, configuration or dependency |
| `OOMKilled` (exit code 137) | Memory above the container's limit | `Last State: Terminated, Reason: OOMKilled` | Raise `resources.limits.memory` |
| `Running`, `READY 0/1` | The readiness probe fails | Events: `Readiness probe failed` | Fix probe path, port or timing, or the app |
| `Running`, many restarts | The liveness probe fails | Events: `Liveness probe failed`, then `failed liveness probe, will be restarted` | Fix the probe or add a startup probe |
| `Completed` in a Deployment | The main process exits with code 0 | `Last State` | Use a long-running command; a one-shot task belongs in a Job |

Restart delays grow 10 s, 20 s, 40 s… up to 300 s, and reset after 10 minutes of clean running.

```bash
kubectl get pods -n shop
kubectl events -n shop --for pod/web-1 --types=Warning
```

> **Exam trap.** `OOMKilled` is about the **limit**, not the node: the fix is a higher memory limit (or a less hungry app), not more replicas. A Pod that requests more than any node can offer stays `Pending` instead.

<!-- section: exec-debug | objectives: 3.5.2 -->
## exec, debug, port-forward and temporary Pods

```bash
kubectl exec web-1 -n shop -- env                         # one command
kubectl exec -it web-1 -n shop -c app -- sh               # interactive shell in container app
```

When the image has no shell (distroless) or the container keeps crashing, use `kubectl debug`:

```bash
# Ephemeral container that sees the processes of container app
kubectl debug -it web-1 -n shop --image=busybox:1.36 --target=app

# Copy of the Pod plus a debug container, processes shared
kubectl debug web-1 -n shop -it --image=busybox:1.36 --copy-to=web-1-debug --share-processes

# Copy of the Pod where container app runs sh instead of its command
kubectl debug web-1 -n shop -it --copy-to=web-1-debug --container=app -- sh
```

| Need | Tool |
| --- | --- |
| Run a command in a healthy container that has the tool | `kubectl exec` |
| Tools missing in the image, Pod must stay as it is | `kubectl debug --image=... --target=<container>` (ephemeral container) |
| Container crashes at start, inspect its filesystem or command | `kubectl debug --copy-to=... --container=<name> -- sh` |
| Reach a Pod or Service from your terminal | `kubectl port-forward` |
| Test a Service or DNS from inside the cluster | Temporary Pod with `kubectl run --rm -it` |

```bash
kubectl port-forward -n shop pod/web-1 8080:80            # local 8080 to Pod port 80
kubectl port-forward -n shop svc/web 8080:80              # through the Service port
kubectl run tmp -n shop --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- http://web.shop.svc.cluster.local:80
```

Ephemeral containers cannot be changed or removed once added. `--copy-to` creates a **new** Pod without the original labels (unless `--keep-labels`); delete it when done.

> **Exam trap.** With `--copy-to`, changing the command of an existing container requires `--container=<name>`; without it, `kubectl debug` adds a new container that runs the command. `--rm` on `kubectl run` works only when attached (`-i` or `--attach`).

<!-- section: fix-workloads | objectives: 3.5.3 -->
## Fixing a broken workload

Fix the **owner**, not the Pod: Pods of a Deployment are recreated from its template.

```bash
kubectl set image deployment/web -n shop app=registry.example.com/shop/web:1.4
kubectl edit deployment web -n shop                       # command, ports, probes, mounts
kubectl set resources deployment/web -n shop -c app --limits=memory=512Mi
```

A bare Pod accepts few in-place changes (container images, among others); otherwise export, edit and replace it:

```bash
kubectl get pod api -n shop -o yaml > /tmp/api.yaml
vi /tmp/api.yaml
kubectl replace --force -f /tmp/api.yaml                  # deletes and recreates the Pod
```

When `kubectl edit` refuses a Pod change, it saves your version under `/tmp` and prints the path: `kubectl replace --force -f` that file.

| Symptom | Field to fix |
| --- | --- |
| `ImagePullBackOff`, `not found` | `spec.containers[].image` (name or tag) |
| `CrashLoopBackOff`, `executable file not found` | `command` / `args` |
| Service has no endpoints | Service `spec.selector` vs Pod template labels |
| Connection refused through the Service | Service `targetPort` vs `containerPort` and the port the app listens on |
| `READY 0/1`, probe failures in events | `readinessProbe` path, port, `initialDelaySeconds` |
| `CreateContainerConfigError` | `env[].valueFrom` / `envFrom` / volume names of ConfigMaps and Secrets |
| `OOMKilled`, `Insufficient memory` | `resources.limits` / `resources.requests` |

```bash
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl apply --validate=strict -f web.yaml                  # unknown fields are errors, e.g. commnd
```

> **Exam trap.** A misspelled field such as `commnd` in a manifest is rejected by `kubectl apply` (field validation is `strict` by default), but a wrong **value** is accepted: a Service selector `app: wbe` creates a Service with no endpoints and no error. Always compare selector and labels.

<!-- section: key-points -->
## Key points

- `kubectl top` needs metrics-server: `--containers`, `--sort-by=cpu|memory`, `--no-headers`.
- `kubectl get`: `-o wide`, `--show-labels`, `-L`, `-l`, `--field-selector` (few fields, no `in`), `jsonpath`, `custom-columns`, `--sort-by` with a JSONPath.
- `kubectl logs`: `-c`, `--all-containers`, `-p` for the crashed instance, `--since`, `--tail` (10 per Pod with `-l`).
- `Pending` = scheduling, `ImagePullBackOff` = image, `CreateContainerConfigError` = missing ConfigMap or Secret, `CrashLoopBackOff` = repeated exits, `OOMKilled` (137) = memory limit.
- `exec` when the tools exist, `debug --target` or `--copy-to` when they don't, `run --rm -it` for in-cluster tests.
- Fix the Deployment, not its Pods; replace bare Pods with `kubectl replace --force -f`.
