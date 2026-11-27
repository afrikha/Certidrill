A Deployment manages ReplicaSets, and through them Pods: every change to its Pod template creates a new ReplicaSet, which is a new **revision**. CKAD tasks ask you to update an image and follow the rollout, tune how fast old Pods are replaced, pause or roll back, scale by hand or with an autoscaler, and build blue/green or canary releases from plain Deployments, labels and a Service. This chapter gives the commands, the fields and their defaults.

<!-- section: rolling-updates | objectives: 2.2.1 -->
## Updating a Deployment and following the rollout

```bash
kubectl create deployment web --image=nginx:1.27 --replicas=4 -n shop
kubectl create deployment web --image=nginx:1.27 --replicas=4 -n shop --dry-run=client -o yaml > web.yaml

kubectl set image deployment/web nginx=nginx:1.28 -n shop
kubectl annotate deployment/web kubernetes.io/change-cause="nginx 1.28" -n shop
kubectl rollout status deployment/web -n shop
kubectl rollout history deployment/web -n shop
kubectl rollout history deployment/web --revision=2 -n shop
```

- A rollout starts **if and only if** `spec.template` changes: image, env, resources, labels of the template. Scaling or changing `spec.strategy` does not create a revision.
- `kubectl set image deployment/web nginx=nginx:1.28` uses `container=image`. `kubectl create deployment` names the container after the image (`nginx:1.27` → `nginx`, `registry.example.com/shop/api:1.0` → `api`): check the name with `kubectl get deploy web -o jsonpath='{.spec.template.spec.containers[*].name}'`.
- `CHANGE-CAUSE` in `rollout history` is copied from the Deployment annotation `kubernetes.io/change-cause`. The `--record` flag that used to fill it is deprecated: annotate instead.
- `kubectl rollout status` waits until the rollout finishes and exits 0, or exits non-zero when the progress deadline is exceeded.
- Other ways to change the template: `kubectl set env`, `kubectl set resources`, `kubectl edit`, `kubectl apply -f` on an edited file.

> **Exam trap.** `kubectl set image deployment/web web=nginx:1.28` fails when the container is called `nginx`: no container named `web` exists. The left side of `=` is the **container** name, not the Deployment name.

> **Exam trap.** `kubectl annotate` refuses to change an existing annotation: on the second update of `change-cause`, add `--overwrite`.

<!-- section: update-strategy | objectives: 2.2.2 -->
## Update strategy and rollout timing

`kubectl create deployment` has no flag for these fields: generate the YAML, then edit `spec`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
spec:
  replicas: 10
  minReadySeconds: 10
  progressDeadlineSeconds: 300
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.28
```

| Field | Default | Meaning |
| --- | --- | --- |
| `strategy.type` | `RollingUpdate` | `Recreate` kills all old Pods before creating new ones (downtime, never two versions at once) |
| `rollingUpdate.maxSurge` | `25%` | Pods allowed **above** `replicas` during the update; percentage rounded **up** |
| `rollingUpdate.maxUnavailable` | `25%` | Pods allowed **below** `replicas`; percentage rounded **down** |
| `minReadySeconds` | `0` | A new Pod must stay Ready this long before it counts as available |
| `progressDeadlineSeconds` | `600` | After this, condition `Progressing` = `False`, reason `ProgressDeadlineExceeded`; must exceed `minReadySeconds` |
| `revisionHistoryLimit` | `10` | Old ReplicaSets kept for rollback; `0` makes undo impossible |

Worked example with the defaults and `replicas: 10`: `maxSurge` 25 % = 2.5 → **3**, `maxUnavailable` 25 % = 2.5 → **2**. The rollout keeps between 8 and 13 Pods.

| Task asks for | Setting |
| --- | --- |
| Never fewer Pods than `replicas` | `maxUnavailable: 0` with `maxSurge` ≥ 1 |
| No extra Pods (quota is full) | `maxSurge: 0` with `maxUnavailable` ≥ 1 |
| Old and new versions must never run together | `type: Recreate` |
| A Pod must be Ready 30 s before the next step | `minReadySeconds: 30` |
| Fail the rollout after 2 minutes without progress | `progressDeadlineSeconds: 120` |
| Keep only 3 old revisions | `revisionHistoryLimit: 3` |

> **Exam trap.** `maxSurge` and `maxUnavailable` cannot both be `0`. With `type: Recreate`, a `rollingUpdate` block is rejected: delete it when you switch the type.

> **Exam trap.** The progress deadline does not roll back by itself. It only sets the condition and makes `rollout status` fail; you still run `rollout undo`.

<!-- section: rollout-control | objectives: 2.2.3 -->
## Pause, resume, restart and roll back

```bash
kubectl rollout pause deployment/web -n shop
kubectl set image deployment/web nginx=nginx:1.29 -n shop
kubectl set resources deployment/web -c nginx --limits=memory=256Mi -n shop
kubectl rollout resume deployment/web -n shop       # one rollout for both changes

kubectl rollout restart deployment/web -n shop      # new Pods, same spec
kubectl rollout undo deployment/web -n shop         # back to the previous revision
kubectl rollout undo deployment/web --to-revision=2 -n shop
```

| Command | Effect |
| --- | --- |
| `rollout pause` | Template changes are recorded but start no rollout until `resume` |
| `rollout resume` | Starts one rollout with all the changes made while paused |
| `rollout restart` | Adds a restart timestamp annotation to the template: a new revision that replaces every Pod with the strategy, image unchanged |
| `rollout undo` | Restores the template of the previous revision |
| `rollout undo --to-revision=N` | Restores revision N, which becomes the newest revision number |

> **Exam trap.** A paused Deployment cannot be rolled back: `resume` first, then `undo`.

> **Exam tip.** Before `--to-revision`, read `kubectl rollout history deployment/web --revision=N` to find which revision holds the wanted image; revision numbers are not image versions.

<!-- section: scaling | objectives: 2.2.4 -->
## Manual scaling and HorizontalPodAutoscaler

```bash
kubectl scale deployment/web --replicas=6 -n shop
kubectl scale deployment/web --current-replicas=6 --replicas=8 -n shop   # only if it has 6 now
kubectl autoscale deployment web --min=2 --max=10 --cpu=70% -n shop
kubectl get hpa -n shop
```

`kubectl autoscale` creates a HorizontalPodAutoscaler (`autoscaling/v2`) named after the Deployment unless `--name` is given. `--max` is required; without `--min` the server default (1) applies. `--cpu` and `--memory` take a percentage (average utilization of the requests) or a quantity (`500m`, `200Mi`: average value).

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
  namespace: shop
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

| Requirement | Why |
| --- | --- |
| Metrics Server installed | The HPA reads CPU and memory from the resource metrics API |
| `resources.requests.cpu` on the containers | `Utilization` is a percentage of the **request**; without it the target cannot be computed |
| No `replicas` left in an applied manifest | Re-applying it would fight the autoscaler |

> **Exam trap.** Once an HPA targets the Deployment, `kubectl scale` is overridden at the next evaluation. To fix the count, change `minReplicas`/`maxReplicas` or delete the HPA.

> **Exam trap.** The HPA field is `averageUtilization: 70` (a number) under `target.type: Utilization`; `averageValue: 500m` goes with `type: AverageValue`.

<!-- section: blue-green | objectives: 2.1.1 -->
## Blue/green with two Deployments and a Service

Kubernetes has no blue/green object: you run two complete Deployments and switch the Service selector at once. Both share `app: web` and differ by a `version` label; the Service selects one version.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-green
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
      version: green
  template:
    metadata:
      labels:
        app: web
        version: green
    spec:
      containers:
      - name: web
        image: registry.example.com/shop/web:2.0
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  selector:
    app: web
    version: blue
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl rollout status deployment/web-green -n shop
kubectl set selector service web 'app=web,version=green' -n shop
kubectl patch service web -n shop -p '{"spec":{"selector":{"version":"green"}}}'   # same switch
kubectl set selector service web 'app=web,version=blue' -n shop                    # roll back
kubectl scale deployment/web-blue --replicas=0 -n shop                             # after validation
```

1. Deploy green next to blue; wait until it is fully available.
2. Switch the Service selector: all new connections go to green.
3. Keep blue running until green is validated; rolling back is one selector change.

> **Exam trap.** `kubectl set selector` **replaces** the whole selector. `kubectl set selector service web version=green` drops `app=web` and may select unrelated Pods. A strategic merge `patch` changes only the keys you give.

> **Exam trap.** A Deployment's `spec.selector` is immutable in `apps/v1`. You cannot turn `web-blue` into green by editing its selector: create a second Deployment.

<!-- section: canary | objectives: 2.1.2 -->
## Canary with replica counts

A canary runs the new version with **a few replicas behind the same Service** as the stable version. The Service selects only the shared label, so traffic splits roughly in proportion to Ready Pods.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-canary
  namespace: shop
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
      track: canary
  template:
    metadata:
      labels:
        app: web
        track: canary
    spec:
      containers:
      - name: web
        image: registry.example.com/shop/web:2.0
```

The stable Deployment is identical with `track: stable`, 4 replicas and image `web:1.9`; the Service selector is `app: web` only.

| Stable replicas | Canary replicas | Approximate share to canary |
| --- | --- | --- |
| 9 | 1 | 10 % |
| 4 | 1 | 20 % |
| 3 | 1 | 25 % |
| 1 | 1 | 50 % |

```bash
kubectl scale deployment/web-canary --replicas=2 -n shop            # more traffic to canary
kubectl set image deployment/web-stable web=registry.example.com/shop/web:2.0 -n shop   # promote
kubectl scale deployment/web-canary --replicas=0 -n shop            # abort or clean up
```

> **Exam trap.** The split is per Pod, not a percentage you configure: a task asking for "about 20 % of the traffic with 5 Pods in total" means 4 stable + 1 canary. Exact weights need an Ingress controller or service mesh feature, outside plain Deployments.

> **Exam trap.** Each Deployment's selector must include its `track` label. Two Deployments whose selectors both match the other's Pods are overlapping controllers and fight each other.

<!-- section: labels-routing | objectives: 2.1.3 -->
## Labels, selectors and rolling back a release strategy

A Service sends traffic to every Ready Pod whose labels contain **all** its selector pairs. The Deployment selector, its template labels and the Service selector are three separate fields that must agree.

```bash
kubectl get pods -n shop -l app=web -L version,track
kubectl get pods -n shop -l 'app=web,track in (canary)'
kubectl describe service web -n shop                                    # Selector and Endpoints
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl label pod web-canary-6d9f7-x2k4p track=debug --overwrite -n shop  # pulls one Pod out of a track selector
```

| Goal | Action |
| --- | --- |
| Blue/green: switch to new | Service selector `version: green` |
| Blue/green: roll back | Service selector back to `version: blue` (blue must still run) |
| Canary: add traffic | Scale the canary Deployment up, stable down |
| Canary: roll back | Scale the canary to 0 or delete it; stable is untouched |
| Canary: promote | Update the stable image, then remove the canary |
| Check what a Service targets | `describe service` Endpoints, EndpointSlices, `get pods -l` with its selector |

`kubectl expose deployment web-blue --name=web --port=80 --target-port=8080` copies the Deployment's selector into the new Service (here `app=web` and `version=blue`), which is a quick start for blue/green.

> **Exam trap.** `kubectl create deployment web-blue` labels Pods `app: web-blue`, not `app: web`. A Service with selector `app: web` gets no endpoints: generate the YAML and set the labels the task gives in both `selector.matchLabels` and `template.metadata.labels`.

> **Exam trap.** Relabeling a Pod so that it leaves its Deployment's selector makes the ReplicaSet create a replacement; the relabeled Pod keeps running, orphaned.

<!-- section: key-points -->
## Key points

- Only `spec.template` changes create a revision; `set image` takes `container=image`; `change-cause` comes from the `kubernetes.io/change-cause` annotation.
- RollingUpdate defaults: `maxSurge` 25 % (round up), `maxUnavailable` 25 % (round down), never both 0; `Recreate` for no overlap.
- Defaults: `minReadySeconds` 0, `progressDeadlineSeconds` 600, `revisionHistoryLimit` 10.
- `pause` batches changes, `restart` replaces Pods, `undo --to-revision=N` restores N as a new revision; no undo while paused.
- `kubectl autoscale deployment web --min --max --cpu=70%` creates an `autoscaling/v2` HPA; Utilization needs CPU requests and Metrics Server.
- Blue/green = two Deployments + one Service selector switch; canary = two Deployments under one shared label, split by replica counts.
- `kubectl set selector` replaces the whole selector; Deployment selectors are immutable and must not overlap.
