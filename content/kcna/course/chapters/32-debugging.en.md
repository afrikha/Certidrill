Debugging an application on Kubernetes follows a short path: look at the state and the events, read the logs, get inside the container (or next to it), reach the application from your workstation, and roll back when a release is broken. The exam asks which `kubectl` command fits a situation, and which error points to which mistake.

<!-- section: logs | objectives: 3.2.1 -->
## Reading logs with kubectl logs

Containers should write their logs to **stdout and stderr**; the container runtime stores them on the node and `kubectl logs` reads them through the kubelet.

```bash
kubectl logs web-7d9f8c6b5-x2lqp
kubectl logs web-7d9f8c6b5-x2lqp -c sidecar
kubectl logs web-7d9f8c6b5-x2lqp --previous
kubectl logs -f web-7d9f8c6b5-x2lqp
kubectl logs web-7d9f8c6b5-x2lqp --tail=50 --since=1h
kubectl logs -l app=web --all-containers=true
kubectl logs deployment/web
```

| Flag | Effect |
| --- | --- |
| `-c, --container` | Logs of one container; required when the Pod has several containers |
| `-p, --previous` | Logs of the **previous** instance of the container, the one that crashed |
| `-f, --follow` | Stream new lines |
| `--tail`, `--since` | Only the last N lines, or the lines newer than a duration |
| `-l, --selector` | Logs of every Pod matching a label selector |
| `--all-containers` | Logs of all containers of the Pod(s) |

The kubelet rotates container log files (10 MiB per file and 5 files by default), and `kubectl logs` only returns the latest file. Logs disappear with the Pod, which is why clusters ship logs to a central back end (see the Observability chapter).

> **Exam trap.** A Pod in `CrashLoopBackOff` has already been restarted: plain `kubectl logs` shows the new, often empty, instance. The error that made it crash is in `kubectl logs --previous`.

<!-- section: exec-debug | objectives: 3.2.2 -->
## Running commands with kubectl exec and kubectl debug

`kubectl exec` runs a command in a **running** container. Everything after `--` is the command.

```bash
kubectl exec web-7d9f8c6b5-x2lqp -- env
kubectl exec -it web-7d9f8c6b5-x2lqp -c web -- sh
```

`exec` fails when the container has crashed, or when the image has no shell or tools (distroless and minimal images). Then use **ephemeral containers**, stable since v1.25, added with `kubectl debug`:

```bash
kubectl debug -it web-7d9f8c6b5-x2lqp --image=busybox:1.36 --target=web
kubectl debug web-7d9f8c6b5-x2lqp -it --image=ubuntu --share-processes --copy-to=web-debug
kubectl debug node/worker-1 -it --image=ubuntu
```

| Form | What it does |
| --- | --- |
| `kubectl debug -it POD --image=... --target=CONTAINER` | Adds an ephemeral container with your tools **to the running Pod**; `--target` shares the process namespace of that container |
| `kubectl debug POD --copy-to=NEW ...` | Creates a **copy** of the Pod, where you can add a container, change the image (`--set-image`) or the command; the original Pod is untouched |
| `kubectl debug node/NAME -it --image=...` | Starts a Pod on that node with the node's root filesystem mounted at `/host` |

Ephemeral containers have no ports and no probes, are never restarted, cannot set resources, and cannot be removed once added. They are for troubleshooting, not for running applications, and cannot be added with `kubectl edit`.

> **Exam tip.** "The image has no shell" or "the container keeps crashing, I need tools next to it" → `kubectl debug` with an ephemeral container. "Run a command in a healthy container" → `kubectl exec`.

<!-- section: port-forward | objectives: 3.2.3 -->
## Reaching an application with kubectl port-forward

`kubectl port-forward` opens a tunnel from a port on **your workstation** to a port of a Pod, through the API server. Nothing is exposed outside the cluster, so it is the tool for testing and debugging, not for publishing an application.

```bash
kubectl port-forward pod/web-7d9f8c6b5-x2lqp 8080:80
kubectl port-forward deployment/web 8080:80
kubectl port-forward service/web 8443:https
kubectl port-forward pod/db-0 :5432
```

- The syntax is `LOCAL:REMOTE`; `:REMOTE` lets kubectl pick a free local port.
- It listens on `localhost` by default (`--address` changes this).
- With a Deployment or a Service, kubectl **selects one Pod** and forwards to it: there is no load balancing, and the session ends when that Pod terminates.
- Only TCP is supported. The command keeps running until you stop it.

> **Exam trap.** To make an application reachable by users, use a Service (NodePort, LoadBalancer), an Ingress or a Gateway. `port-forward` and `kubectl proxy` are developer tools.

<!-- section: config-errors | objectives: 3.2.4 -->
## Debugging configuration errors

Start with `kubectl get pods` (the STATUS column), then `kubectl describe pod` (container states and the **Events** at the bottom), then the logs.

| Symptom | Likely cause | Where you see it |
| --- | --- | --- |
| `ErrImagePull`, then `ImagePullBackOff` | Wrong image name or tag, image not pushed, private registry without `imagePullSecrets` | Events: `Failed to pull image` |
| `CreateContainerConfigError` | The ConfigMap, Secret or key referenced in `env`/`envFrom` does not exist | Events: `configmap "..." not found` |
| Stuck in `ContainerCreating` | A volume cannot be mounted, for example a missing ConfigMap or Secret used as a volume, or an unbound PVC | Events: `FailedMount` |
| `CrashLoopBackOff` | The process exits: wrong `command` or `args`, missing configuration, application error, failing liveness probe | `kubectl logs --previous`, exit code in `describe` |
| `OOMKilled` (exit code 137) | The container exceeded its **memory limit** | Last state in `describe` |
| `Pending` with `FailedScheduling` | No node has enough **requested** CPU or memory, or no node matches the selectors and tolerations | Events: `Insufficient cpu`, `didn't match` |
| Pod runs but ignores a setting | A misspelled field; check with `kubectl apply --validate` and compare with `kubectl get pod -o yaml` | Validation error `unknown field` |

> **Exam trap.** A typo in the image tag gives `ImagePullBackOff`, not `CrashLoopBackOff`: the container never starts. `CrashLoopBackOff` means the image was pulled and the process started, then exited.

<!-- section: failed-rollouts | objectives: 3.2.5 -->
## Debugging a failed rollout

When a new version is broken, the rolling update stops creating new Pods: the old ReplicaSet keeps serving (depending on `maxUnavailable`) while the new Pods fail.

```bash
kubectl rollout status deployment/web
kubectl get replicasets -l app=web
kubectl describe deployment web
kubectl events --for deployment/web
kubectl rollout history deployment/web
kubectl rollout undo deployment/web
```

1. `kubectl rollout status` waits; after `progressDeadlineSeconds` (600 s by default) the Deployment's `Progressing` condition becomes `False` with reason **`ProgressDeadlineExceeded`**, and the command exits with a non-zero code.
2. `kubectl get replicasets` shows two ReplicaSets: the old one with ready Pods, the new one with Pods not ready.
3. `kubectl describe` on the new Pods shows the cause (image pull error, crash, failing readiness probe).
4. `kubectl rollout history` lists the revisions, and `kubectl rollout undo` (or `--to-revision=N`) returns to a working one. Fix the manifest afterwards, or the next apply repeats the error.

Kubernetes takes no automatic action on a stalled Deployment besides reporting the condition: rolling back is up to you or your delivery tool.

> **Exam tip.** A failing **readiness** probe also blocks a rollout: the new Pods run but never become ready, so old Pods are not removed.

<!-- section: key-points -->
## Key points

- `kubectl logs`: `-c` container, `--previous` crashed instance, `-f` stream, `-l` selector.
- `kubectl exec -it POD -- sh` for a running container; `kubectl debug` adds an ephemeral container, copies a Pod or debugs a node.
- `kubectl port-forward TYPE/NAME LOCAL:REMOTE`: local testing, one Pod, TCP only, localhost by default.
- `ImagePullBackOff`: image or registry. `CreateContainerConfigError`: missing ConfigMap or Secret. `CrashLoopBackOff`: process exits. `OOMKilled`: memory limit. `Pending`: scheduling.
- Failed rollout: `rollout status`, `ProgressDeadlineExceeded`, two ReplicaSets, `rollout undo`.
