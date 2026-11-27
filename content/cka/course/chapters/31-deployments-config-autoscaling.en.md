Workloads & Scheduling is 15 % of the exam, and its tasks are quick if you work imperatively: create a Deployment, change its image, follow and roll back the rollout, tune its update strategy, feed it a ConfigMap or a Secret, and autoscale it. Most tasks take one `kubectl` command; the rest start from a `--dry-run=client -o yaml` file that you edit.

<!-- section: deployments-rollouts | objectives: 3.1.1 -->
## Deployments, rollouts and rollbacks

A Deployment (`apps/v1`) manages ReplicaSets, which manage Pods. Each change to the Pod template creates a new ReplicaSet, which is a new **revision**; the Deployment controller scales the new ReplicaSet up and the old ones down.

```bash
k create deployment web --image=nginx:1.27 --replicas=3 --port=80 -n shop
k create deployment web --image=nginx:1.27 --replicas=3 -n shop $do > web.yaml   # to add fields first
k get deploy,rs,pods -n shop -l app=web
```

`create deployment` labels the Pods `app: web`, uses that label as the selector and names the container after the image (`nginx`). The selector of an `apps/v1` Deployment cannot be changed: to change it, delete the Deployment and create it again.

| Task asks for | Command |
| --- | --- |
| Change the image | `k set image deployment/web nginx=nginx:1.28 -n shop` (container name, then image) |
| Change another template field | `k edit deployment web -n shop`, or `k set env`, `k set resources` |
| Wait for the rollout and see its result | `k rollout status deployment/web -n shop` |
| List the revisions | `k rollout history deployment/web -n shop` |
| See the template of one revision | `k rollout history deployment/web -n shop --revision=2` |
| Go back one revision | `k rollout undo deployment/web -n shop` |
| Go back to a given revision | `k rollout undo deployment/web -n shop --to-revision=2` |
| Change several fields without one rollout each | `k rollout pause`, make the changes, `k rollout resume` |
| Change the number of Pods | `k scale deployment web --replicas=5 -n shop` |

A rollout is triggered **only** when `.spec.template` changes. Scaling, or changing `strategy` or `revisionHistoryLimit`, creates no revision.

The `CHANGE-CAUSE` column of `rollout history` is copied from the Deployment annotation `kubernetes.io/change-cause` when a revision is created. Set it right after the change:

```bash
k set image deployment/web nginx=nginx:1.28 -n shop
k annotate deployment/web kubernetes.io/change-cause="image updated to 1.28" -n shop
k rollout history deployment/web -n shop
```

```text
REVISION  CHANGE-CAUSE
1         <none>
2         image updated to 1.28
```

> **Exam trap.** The `--record` flag that used to fill `CHANGE-CAUSE` is deprecated. When a task asks for a change cause, write the annotation yourself.

A rollback restores the template of the target revision under a **new** revision number, with a `DeploymentRollback` event. Read the revision with `--revision=N` before undoing to it.

A rollout that cannot finish (bad image, failing readiness probe, quota exceeded) is not stopped. After `progressDeadlineSeconds` (default 600) the Deployment gets `Progressing=False`, reason `ProgressDeadlineExceeded`, and `rollout status` exits with an error, while the old Pods keep serving.

```bash
k rollout status deployment/web -n shop --timeout=60s
k describe deployment web -n shop        # Conditions and Events
k get rs -n shop -l app=web              # new ReplicaSet stuck below its desired count
k get pods -n shop -l app=web            # ImagePullBackOff, CrashLoopBackOff, 0/1 READY
```

> **Exam trap.** `k rollout undo` without `--to-revision` goes back to the **previous** revision, not to revision 1. When the task names a revision, or the image of a revision, pass `--to-revision`.

<!-- section: update-strategy | objectives: 3.1.2 -->
## Rolling update strategy and revision history

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: shop
spec:
  replicas: 10
  revisionHistoryLimit: 5
  minReadySeconds: 10
  progressDeadlineSeconds: 300
  selector:
    matchLabels:
      app: api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: registry.example.com/shop/api:2.4
```

| Field | Meaning | Default |
| --- | --- | --- |
| `strategy.type` | `RollingUpdate` (replace Pods gradually) or `Recreate` (stop all, then start new) | `RollingUpdate` |
| `rollingUpdate.maxSurge` | Pods allowed **above** `replicas` during the update; number or percentage, rounded **up** | `25%` |
| `rollingUpdate.maxUnavailable` | Pods allowed **below** `replicas`; number or percentage, rounded **down** | `25%` |
| `minReadySeconds` | Seconds a new Pod must stay Ready to count as available | `0` |
| `progressDeadlineSeconds` | Seconds without progress before `ProgressDeadlineExceeded`; must exceed `minReadySeconds` | `600` |
| `revisionHistoryLimit` | Old ReplicaSets kept for rollback | `10` |
| `paused` | Template changes do not trigger rollouts | `false` |

`maxSurge` and `maxUnavailable` cannot both be 0. With 10 replicas and the defaults, surge is 3 (2.5 rounded up) and unavailable 2 (2.5 rounded down): 8 to 13 Pods during the update.

| Task asks for | Set |
| --- | --- |
| Never fewer Pods than `replicas` during the update | `maxUnavailable: 0` with `maxSurge` of at least 1 |
| No extra Pods (quota or capacity is full) | `maxSurge: 0` with `maxUnavailable` of at least 1 |
| Old and new versions must never run together | `type: Recreate` (downtime between the two) |
| Keep only the last 3 revisions for rollback | `revisionHistoryLimit: 3` |

Patching the strategy starts no rollout:

```bash
k patch deployment api -n shop -p '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":1,"maxUnavailable":0}}}}'
k patch deployment api -n shop -p '{"spec":{"strategy":{"type":"Recreate","rollingUpdate":null}}}'
```

> **Exam trap.** A Deployment with `type: Recreate` must not keep a `rollingUpdate` block: the API server rejects it. Remove the block (set it to `null` in the patch, or delete the lines in `k edit`) when you switch strategy.

> **Exam trap.** `revisionHistoryLimit: 0` deletes every old ReplicaSet once the rollout completes, so `rollout undo` has nothing to go back to.

<!-- section: create-configmaps-secrets | objectives: 3.2.1 -->
## Creating ConfigMaps and Secrets

| Source | Command | Keys created |
| --- | --- | --- |
| Literal values | `k create configmap app-cfg --from-literal=MODE=prod --from-literal=LEVEL=info` | `MODE`, `LEVEL` |
| One file | `k create configmap nginx-cfg --from-file=nginx.conf` | `nginx.conf` (file basename), value = file content |
| One file, chosen key | `k create configmap nginx-cfg --from-file=default.conf=./site.conf` | `default.conf` |
| A directory | `k create configmap web-files --from-file=./conf/` | One key per regular file; subdirectories ignored |
| An env file | `k create configmap app-env --from-env-file=app.env` | One key per `KEY=VALUE` line |

In an env file, lines starting with `#` and blank lines are ignored and quotes stay in the value; `--from-env-file` can be repeated. A ConfigMap or Secret is limited to 1 MiB.

Secrets use the same flags under `create secret generic`, plus two typed generators:

```bash
k create secret generic db-creds -n shop --from-literal=username=app --from-literal=password='S3cr$t!x'
k create secret generic api-key -n shop --from-file=token=./token.txt
k create secret tls web-tls -n shop --cert=tls.crt --key=tls.key
k create secret docker-registry regcred -n shop --docker-server=registry.example.com \
  --docker-username=ci --docker-password='p@ss' --docker-email=ci@example.com
```

| Generator | Secret `type` | Keys |
| --- | --- | --- |
| `generic` | `Opaque` (default; `--type` to change it) | Your keys |
| `tls` | `kubernetes.io/tls` | `tls.crt`, `tls.key` |
| `docker-registry` | `kubernetes.io/dockerconfigjson` | `.dockerconfigjson` |

kubectl base64-encodes the values into `data`. In a manifest, write base64 values in `data` or plain text in `stringData`; a key in both takes the `stringData` value.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-creds
  namespace: shop
type: Opaque
stringData:
  username: app
  password: S3cr$t!x
```

```bash
k get secret db-creds -n shop -o jsonpath='{.data.password}' | base64 -d
```

> **Exam trap.** Put literal values with `$`, `!` or `\` in **single quotes**, or the shell rewrites them before kubectl sees them. With `--from-file`, a file written by `echo` without `-n` ends with a newline, which becomes part of the value.

<!-- section: consume-config | objectives: 3.2.2 -->
## Consuming configuration and rolling out changes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  containers:
  - name: api
    image: registry.example.com/shop/api:2.4
    env:
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-creds
          key: password
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-cfg
          key: LEVEL
    envFrom:
    - configMapRef:
        name: app-env
    - secretRef:
        name: api-key
      prefix: API_
    volumeMounts:
    - name: nginx-conf
      mountPath: /etc/nginx/conf.d
      readOnly: true
    - name: tls
      mountPath: /etc/tls
      readOnly: true
  volumes:
  - name: nginx-conf
    configMap:
      name: nginx-cfg
      items:
      - key: default.conf
        path: default.conf
  - name: tls
    secret:
      secretName: web-tls
      defaultMode: 0400
```

| Task asks for | Field |
| --- | --- |
| One variable from one key | `env[].valueFrom.configMapKeyRef` or `secretKeyRef` (`name`, `key`) |
| Every key as a variable | `envFrom[].configMapRef` or `secretRef`, optional `prefix` |
| Every key as a file in a directory | Volume `configMap.name` or `secret.secretName`, plus a `volumeMount` |
| Only some keys, or another file name | `items` with `key` and `path` |
| One file into an existing directory | `volumeMounts[].subPath` (the file is then never updated) |
| Start even if the object is missing | `optional: true` on the reference |

The ConfigMap or Secret must be in the Pod's namespace. A missing, non-optional reference keeps the container from starting (`CreateContainerConfigError` for variables, `ContainerCreating` for volumes). With `envFrom`, keys that are not valid variable names are skipped, with an `InvalidEnvironmentVariableNames` event; since v1.34 a valid name is any printable ASCII string without `=`, so a key such as `1st-key` is kept.

Updating the object does not reach every consumer:

| Consumed as | After the ConfigMap or Secret changes |
| --- | --- |
| Environment variables | Never updated; the container must restart |
| Volume | Files updated eventually (kubelet sync period plus cache delay); the application must reread them |
| Volume with `subPath` | Never updated |
| `immutable: true` object | Cannot be changed; delete and recreate it |

To apply a change to a Deployment's Pods, edit the object, then restart the rollout:

```bash
k create configmap app-env -n shop --from-env-file=app.env $do | k apply -f -
k rollout restart deployment/api -n shop
k rollout status deployment/api -n shop
```

`rollout restart` changes an annotation in the Pod template, so it creates a new revision and follows the rolling update strategy.

> **Exam trap.** `k set env deployment/api --from=configmap/app-env -n shop` writes one `env` entry with a `configMapKeyRef` for each key that exists **now**. Keys added to the ConfigMap later are never picked up; when the task asks for all keys of the object, write `envFrom`.

<!-- section: hpa-create | objectives: 3.3.1 -->
## Creating a HorizontalPodAutoscaler

A HorizontalPodAutoscaler (`autoscaling/v2`) sets the `replicas` of a Deployment or StatefulSet from metrics. CPU and memory come from the `metrics.k8s.io` API, served by the metrics-server add-on: check it with `k top pods -n shop`.

```bash
k autoscale deployment web -n shop --min=2 --max=10 --cpu=70%
k autoscale deployment web -n shop --min=2 --max=8 --cpu=60% --memory=70%
k autoscale deployment web -n shop --max=6 --memory=200Mi    # average value, not utilization
k get hpa -n shop
```

| `--cpu` / `--memory` value | Target type in the HPA |
| --- | --- |
| A percentage, `70%` | `Utilization`, as a percentage of the containers' **requests** |
| A quantity, `500m` or `200Mi` | `AverageValue` per Pod |
| A bare number | Quantity: millicores for `--cpu`, mebibytes for `--memory` |

`--max` is required; the HPA takes the name of its target unless you pass `--name`.

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
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 300Mi
```

Every 15 seconds the controller computes `desiredReplicas = ceil(currentReplicas × currentValue / targetValue)` for each metric and keeps the largest result; a ratio within the tolerance (10 % by default) changes nothing.

> **Exam trap.** Utilization is relative to the **requests**. If a container of the Pod has no CPU request, CPU utilization is undefined and the HPA does not act on it. Set requests with `k set resources deployment web -n shop --requests=cpu=200m`.

> **Exam trap.** Once an HPA manages a Deployment, a later `k apply` of a manifest with `spec.replicas` resets the replica count each time. Remove `replicas` from the applied file.

<!-- section: hpa-behavior | objectives: 3.3.2 -->
## HPA behavior and troubleshooting

`spec.behavior` sets separate rules for `scaleUp` and `scaleDown`; fields you leave out keep their defaults:

```yaml
spec:
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
      - type: Percent
        value: 10
        periodSeconds: 60
      selectPolicy: Min
    scaleUp:
      stabilizationWindowSeconds: 0
      tolerance: 0.05
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
```

| Field | Meaning | Default |
| --- | --- | --- |
| `stabilizationWindowSeconds` | Past recommendations considered, to avoid flapping; when scaling down, the highest one of the window is used | `300` down, `0` up |
| `policies[].type` | `Pods` (a number of Pods) or `Percent` (of current replicas) | down: `Percent 100` every 15 s; up: `Percent 100` and `Pods 4` every 15 s |
| `policies[].periodSeconds` | Window in which the policy's change is allowed; maximum 1800 | none |
| `selectPolicy` | `Max` (policy allowing the biggest change), `Min`, or `Disabled` (no scaling in that direction) | `Max` |
| `tolerance` | Change of the metric ignored, as a fraction (`0.05` is 5 %); stable in v1.37 | cluster default 10 % |

| Task asks for | Set |
| --- | --- |
| Wait 10 minutes of low load before removing Pods | `scaleDown.stabilizationWindowSeconds: 600` |
| Remove at most 2 Pods per minute | `scaleDown.policies`: `type: Pods`, `value: 2`, `periodSeconds: 60` |
| With two policies, apply the slower one | `selectPolicy: Min` |
| Never scale down automatically | `scaleDown.selectPolicy: Disabled` |

When the HPA does not scale, read its targets, conditions and events:

```bash
k get hpa web -n shop                 # TARGETS shows the current and target values
k describe hpa web -n shop            # Conditions and Events
k top pods -n shop                    # are metrics available at all?
k get deploy web -n shop -o jsonpath='{.spec.template.spec.containers[*].resources}'
```

| Symptom | Cause | Fix |
| --- | --- | --- |
| `TARGETS` shows `<unknown>/70%`, `ScalingActive=False` | No metrics: metrics-server missing or unhealthy, Pods just started | Install or fix metrics-server; check `k top pods` |
| Event says a request is missing | A container has no request for the metric | Add requests to every container of the template |
| `ScalingLimited=True` | The desired count is outside `minReplicas`..`maxReplicas` | Raise `maxReplicas` if the task allows |
| Replicas stay high after the load drops | Scale-down stabilization window (300 s by default) | Wait, or shorten `stabilizationWindowSeconds` |
| HPA ignores the Deployment, `ScalingActive=False` | The Deployment was scaled to 0 while `minReplicas` is above 0 | Scale the Deployment back up |

> **Exam trap.** `minReplicas: 0` is accepted only with object or external metrics (the `HPAScaleToZero` feature, beta in v1.37). With CPU or memory targets, keep `minReplicas` at 1 or more.

<!-- section: key-points -->
## Key points

- Only a change of `.spec.template` creates a revision: `set image` and `rollout restart` do, `scale` does not.
- `rollout undo` goes back one revision; `--to-revision=N` to a given one; `rollout history --revision=N` shows its template.
- Record a change cause with the `kubernetes.io/change-cause` annotation; `--record` is deprecated.
- RollingUpdate defaults: `maxSurge` 25 % rounded up, `maxUnavailable` 25 % rounded down, never both 0; `Recreate` needs no `rollingUpdate` block.
- `revisionHistoryLimit` 10, `progressDeadlineSeconds` 600, `minReadySeconds` 0.
- `--from-file` keys are file basenames unless you give `key=path`; `--from-env-file` reads `KEY=VALUE` lines; quote literals in single quotes.
- Variables never follow ConfigMap or Secret changes, volumes do, `subPath` mounts do not; `rollout restart` applies the change.
- `k autoscale ... --min --max --cpu=70%` (utilization of requests) or `--cpu=500m` (average value); the HPA needs metrics-server and requests.
- Behavior defaults: scale-down window 300 s, scale-up window 0, `selectPolicy: Max`, tolerance 10 %.
