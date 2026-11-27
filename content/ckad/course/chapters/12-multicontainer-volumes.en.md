A Pod can run several containers that share its network namespace and its volumes. CKAD tasks ask you to add an init container that prepares something before the application starts, a sidecar that ships or transforms data, or a volume mounted at an exact path; then to read the logs or open a shell in one named container. This chapter gives the fields, the commands to generate a starting manifest, and the storage objects (PersistentVolume, PersistentVolumeClaim) that tasks combine with Pods.

<!-- section: init-containers | objectives: 1.3.1 -->
## Init containers

Init containers are listed in `spec.initContainers`. The kubelet runs them **one at a time, in the order of the list**; each must exit successfully before the next starts, and the containers of `spec.containers` start only when all of them have completed. Typical uses: wait for a Service, download or render a file into a shared `emptyDir`, run a schema migration.

There is no imperative flag for init containers: generate the Pod, then edit the file.

```bash
kubectl run web --image=nginx:1.27 -n shop --dry-run=client -o yaml > web.yaml
vi web.yaml          # add initContainers and the shared volume
kubectl apply -f web.yaml
```

```yaml
spec:
  initContainers:
  - name: fetch-config
    image: busybox:1.37
    command: ["sh", "-c", "wget -O /work/index.html http://config.shop.svc/index.html"]
    volumeMounts:
    - name: work
      mountPath: /work
  containers:
  - name: web
    image: nginx:1.27
    volumeMounts:
    - name: work
      mountPath: /usr/share/nginx/html
  volumes:
  - name: work
    emptyDir: {}
```

| Situation | What you see |
| --- | --- |
| 1 of 2 init containers finished | `STATUS` `Init:1/2`, phase `Pending`, condition `Initialized` false |
| An init container exits non-zero | `Init:Error`, then `Init:CrashLoopBackOff` while the kubelet retries |
| Init container fails and Pod `restartPolicy: Never` | The whole Pod is `Failed` |
| All init containers done | Application containers start |

If the Pod `restartPolicy` is `Always`, failed init containers are retried as with `OnFailure`. If the Pod restarts, every init container runs again, so their commands must be idempotent.

> **Exam trap.** Regular init containers do not accept `lifecycle`, `livenessProbe`, `readinessProbe` or `startupProbe`: validation rejects them. A probe on a container that must run for the whole Pod life means it is a sidecar (next section) or an application container.

Resource requests: init containers run one after the other, so the Pod reserves the **larger** of the biggest init container request and the sum of the application containers' requests.

<!-- section: sidecars | objectives: 1.3.2 -->
## Native sidecars and helper containers

A **native sidecar** is an entry of `initContainers` with `restartPolicy: Always`. The feature is stable since Kubernetes v1.33. The kubelet starts it in list order like any init container, but does not wait for it to exit: as soon as it is started (its process runs, or its `startupProbe` succeeded) the next init container starts, and the sidecar keeps running alongside the application.

```yaml
spec:
  initContainers:
  - name: log-shipper
    image: busybox:1.37
    restartPolicy: Always
    command: ["sh", "-c", "tail -F /var/log/app/app.log"]
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  containers:
  - name: app
    image: registry.example.com/shop/app:2.1
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
  volumes:
  - name: logs
    emptyDir: {}
```

| Property | Regular init container | Native sidecar | Second entry in `containers` |
| --- | --- | --- | --- |
| Where | `initContainers` | `initContainers` + `restartPolicy: Always` | `containers` |
| Runs | To completion, before the app | From before the app until the end | Alongside the app, no ordering |
| Probes and `lifecycle` | Not allowed | Allowed | Allowed |
| Restarted when it exits | Per Pod `restartPolicy` | Always | Per Pod `restartPolicy` |
| In a Job | Must finish first | Does not block Job completion | Keeps the Pod running: the Job never completes |
| On Pod termination | Already gone | Stopped after the app containers, in reverse order | Stopped with the others |

All containers of a Pod share the network namespace: a helper reaches the application on `localhost:<port>`, and two containers cannot listen on the same port. Files are shared only through a volume mounted in both containers (an `emptyDir` is the usual choice).

> **Exam trap.** `restartPolicy` exists at two levels. `spec.restartPolicy` (Pod) accepts `Always` (default), `OnFailure`, `Never`. A container-level `restartPolicy: Always` makes a sidecar **only inside `initContainers`**. On an entry of `containers` it merely overrides the Pod policy for that container (ContainerRestartRules, beta since v1.35): no start ordering, no sidecar behavior.

> **Exam tip.** A task that says "the sidecar must start before the application and keep running" or "the Job must complete although a log agent runs" asks for a native sidecar, not a second regular container.

<!-- section: patterns-targeting | objectives: 1.3.3 -->
## Sidecar, ambassador and adapter, and targeting one container

| Pattern | Role of the helper | Example |
| --- | --- | --- |
| **Sidecar** | Extends or supports the app, often through a shared volume | Ship logs, sync files from Git, refresh certificates |
| **Ambassador** | Proxy that represents a remote service on `localhost` | App connects to `localhost:6379`, the helper forwards to the right Redis shard |
| **Adapter** | Converts the app's output to a standard format | Turn a custom status page into Prometheus metrics |
| **Init** | One-off preparation before start | Wait for a database, copy a config file |

In a multi-container Pod, commands that act on a container need `-c`. Without it, kubectl uses the container named by the annotation `kubectl.kubernetes.io/default-container`, otherwise the first container, and prints a notice.

```bash
kubectl logs web -c log-shipper -n shop               # one container
kubectl logs web --all-containers --prefix -n shop    # every container, lines prefixed
kubectl logs web -c fetch-config -n shop              # an init container's output
kubectl logs web -c app --previous -n shop            # the instance before the last restart
kubectl exec -it web -c app -n shop -- sh
kubectl debug -it web --image=busybox:1.37 --target=app -n shop
kubectl debug web -it --image=busybox:1.37 --copy-to=web-debug --share-processes -n shop
```

`kubectl debug` with `--target` adds an **ephemeral container** that sees the processes of the target container. Ephemeral containers are never restarted, may not have `ports`, probes or `resources`, cannot be added with `kubectl edit`, and cannot be removed once added. `--copy-to` creates a new Pod instead, leaving the original untouched; process namespace sharing is on by default in the copy (`--share-processes` defaults to `true`).

> **Exam trap.** `kubectl exec web -- sh` in a Pod with a sidecar may open a shell in the wrong container. When the task names a container, always pass `-c`.

<!-- section: ephemeral-volumes | objectives: 1.4.1 -->
## Ephemeral volumes and mounts

A volume is declared once in `spec.volumes` and mounted per container in `volumeMounts`; the `name` links them.

| Task asks for | Volume source | Key fields |
| --- | --- | --- |
| Scratch space shared by containers, lost with the Pod | `emptyDir: {}` | `sizeLimit` |
| RAM-backed scratch (tmpfs) | `emptyDir` | `medium: Memory`, `sizeLimit` |
| Files from a ConfigMap | `configMap` | `name`, `items[].key`, `items[].path`, `defaultMode` |
| Files from a Secret | `secret` | `secretName`, `items`, `defaultMode` |
| Pod labels, annotations, resource limits as files | `downwardAPI` | `items[].path`, `fieldRef.fieldPath`, `resourceFieldRef` |
| Several sources in one directory | `projected` | `sources`: `secret`, `configMap`, `downwardAPI`, `serviceAccountToken` (and `clusterTrustBundle`, `podCertificate`) |
| A node directory or file | `hostPath` | `path`, `type` |

```yaml
spec:
  containers:
  - name: app
    image: registry.example.com/shop/app:2.1
    volumeMounts:
    - name: cache
      mountPath: /cache
    - name: config
      mountPath: /etc/app/app.properties
      subPath: app.properties
      readOnly: true
    - name: podinfo
      mountPath: /etc/podinfo
  volumes:
  - name: cache
    emptyDir:
      medium: Memory
      sizeLimit: 64Mi
  - name: config
    configMap:
      name: app-config
  - name: podinfo
    downwardAPI:
      items:
      - path: labels
        fieldRef:
          fieldPath: metadata.labels
```

- `emptyDir` data survives a **container** crash but is deleted when the Pod leaves the node. With `medium: Memory`, files written count against the memory limit of the container that wrote them; without `sizeLimit` the tmpfs is sized to the node's allocatable memory.
- `mountPath` replaces the content of that directory in the container. `subPath` mounts one file or subdirectory of the volume instead of its root, so the other files of the directory stay visible.
- `readOnly: true` on a mount protects that container only; another container may mount the same volume read-write. ConfigMap, Secret and downwardAPI volumes are always read-only.

> **Exam trap.** A ConfigMap, Secret, downwardAPI or projected source mounted with `subPath` **never receives updates**. If the task says the file must follow ConfigMap changes, mount the whole volume on a directory.

> **Exam trap.** `secret` uses `secretName`, `configMap` uses `name`, and a PVC uses `claimName`. Mixing them up is a validation error.

`hostPath` `type` defaults to `""` (no check). `DirectoryOrCreate` and `FileOrCreate` create the path if missing; `FileOrCreate` does not create the parent directory. `Directory`, `File` and `Socket` require the path to exist.

<!-- section: pvc | objectives: 1.4.2 -->
## PersistentVolumeClaims

A PersistentVolumeClaim (PVC) requests storage; the Pod references the claim, never the PersistentVolume. The claim must be in the **same namespace** as the Pod. `kubectl create` has no PVC generator: write the manifest (the PVC example on kubernetes.io is the fastest template).

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
  namespace: shop
spec:
  storageClassName: fast
  accessModes:
  - ReadWriteOnce
  volumeMode: Filesystem
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: db
  namespace: shop
spec:
  containers:
  - name: db
    image: postgres:17
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: data
```

| Access mode | Short | Meaning |
| --- | --- | --- |
| `ReadWriteOnce` | RWO | Read-write by a single **node** (several Pods on that node may use it) |
| `ReadOnlyMany` | ROX | Read-only by many nodes |
| `ReadWriteMany` | RWX | Read-write by many nodes |
| `ReadWriteOncePod` | RWOP | Read-write by a single **Pod** (CSI volumes only) |

| `storageClassName` in the PVC | Result |
| --- | --- |
| A class name | Binds to a PV of that class, or the class provisions one dynamically |
| Omitted | The default StorageClass (annotation `storageclass.kubernetes.io/is-default-class: "true"`) is written into the claim |
| `""` | Only PVs with no class; dynamic provisioning disabled for this claim |

`volumeMode` is `Filesystem` by default (mounted as a directory); `Block` presents a raw device and is used with `volumeDevices` instead of `volumeMounts`. A claim can grow by editing `resources.requests.storage` if the class has `allowVolumeExpansion: true`; it can never shrink.

> **Exam trap.** RWO limits the volume to one node, not one Pod. If the task says "only one Pod may write", the mode is `ReadWriteOncePod`.

<!-- section: pv-binding | objectives: 1.4.3 -->
## PersistentVolumes, binding and status

For practice tasks you create the PersistentVolume yourself with `hostPath` (single-node testing only), then a claim that matches it.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-logs
spec:
  storageClassName: manual
  capacity:
    storage: 5Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /mnt/data/logs
    type: DirectoryOrCreate
```

A PV is **cluster-scoped** (no namespace). A claim binds to a PV when the class, the access modes, the volume mode, the optional label `selector` and the size match: the PV must offer **at least** the requested storage, and the claim gets the whole PV (a 3Gi claim on this 5Gi PV shows capacity `5Gi`). Binding is one-to-one. To force a pair, set `volumeName: pv-logs` in the PVC, or `claimRef` (name and namespace) in the PV.

```bash
kubectl get pv
kubectl get pvc -n shop
kubectl describe pvc logs -n shop      # Events explain why it stays Pending
```

| Object | Status | Meaning |
| --- | --- | --- |
| PV | `Available` | Not bound to a claim |
| PV | `Bound` | Bound; `CLAIM` shows `namespace/name` |
| PV | `Released` | Its claim was deleted; with `Retain` it is not reused until an administrator cleans it |
| PV | `Failed` | Automatic reclamation failed |
| PVC | `Pending` | No matching PV yet, or the class uses `WaitForFirstConsumer` and no Pod uses the claim |
| PVC | `Bound` | Bound to a PV |
| PVC | `Lost` | Its bound PV no longer exists |

Reclaim policy: `Retain` is the default for manually created PVs, `Delete` for dynamically provisioned ones (inherited from the StorageClass, whose default is `Delete`); `Recycle` is deprecated. A PVC deleted while a Pod uses it stays `Terminating` until the Pod is gone (finalizer `kubernetes.io/pvc-protection`).

> **Exam trap.** A claim without `storageClassName` in a cluster that has a default StorageClass gets that class and will **not** bind to a PV that has `storageClassName: manual` or no class. Set the same class on both, or `""` on both.

> **Exam trap.** A Pod whose claim is `Pending` stays `Pending` itself. Check the claim before the Pod: size larger than any PV, access mode not offered, or class mismatch are the usual causes.

<!-- section: key-points -->
## Key points

- Init containers run in order, each to completion, before the app; no probes; `Init:N/M` and `Init:CrashLoopBackOff` in `kubectl get pods`.
- Native sidecar = `initContainers` entry with `restartPolicy: Always`: starts before the app, keeps running, supports probes, does not block Job completion.
- Containers share `localhost`; files are shared only through a volume mounted in each container.
- Name the container with `-c` for `logs` and `exec`, `--target` for `kubectl debug`; `--all-containers` reads them all.
- `emptyDir` lives with the Pod; `medium: Memory` counts against the memory limit; `subPath` mounts never receive ConfigMap or Secret updates.
- PVC: `storageClassName`, `accessModes`, `volumeMode`, `resources.requests.storage`; Pod volume uses `claimName`, same namespace.
- PV `Available` → `Bound` → `Released`; PVC `Pending` until a PV with enough size, matching class and access mode exists.
