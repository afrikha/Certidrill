A Pod gets two kinds of identity and protection: a **ServiceAccount**, which is what its processes are when they call the Kubernetes API, and a **securityContext**, which decides the Linux user, groups, filesystem access, capabilities and seccomp profile of its containers. CKAD tasks in this area are short and precise: create a ServiceAccount and run a Deployment with it, stop the token from being mounted, print a short-lived token, or make a Pod run as user 1000 with a read-only root filesystem and no capabilities. Most points are lost by putting a field at the wrong level of the manifest.

<!-- section: serviceaccounts | objectives: 4.7.1 -->
## Create a ServiceAccount and run workloads with it

Every namespace has a ServiceAccount named `default`. A Pod that does not name one gets `default` of its own namespace, and the API server writes it into `spec.serviceAccountName`. A ServiceAccount is namespaced: a Pod can only use one from its own namespace.

```bash
kubectl create serviceaccount api-sa -n shop       # short form: kubectl create sa api-sa -n shop
kubectl get sa -n shop
```

The field is `spec.serviceAccountName` in a Pod, and `spec.template.spec.serviceAccountName` in a Deployment, StatefulSet, DaemonSet or Job (`spec.jobTemplate.spec.template.spec` in a CronJob). `kubectl run` has no flag for it: generate the manifest and add the line.

```bash
kubectl run api --image=nginx:1.27 -n shop --dry-run=client -o yaml > api.yaml
# add serviceAccountName under spec:, then
kubectl apply -f api.yaml
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  serviceAccountName: api-sa
  containers:
  - name: api
    image: nginx:1.27
```

For an existing controller, `kubectl set serviceaccount` (alias `set sa`) changes the Pod template, which triggers a rollout of a Deployment. The reference lists deployment, daemonset, statefulset, replicaset, replicationcontroller and job as supported types.

```bash
kubectl set serviceaccount deployment web api-sa -n shop
kubectl set sa -f web.yaml api-sa --local -o yaml          # edit a file without the cluster
kubectl get deploy web -n shop -o jsonpath='{.spec.template.spec.serviceAccountName}'
```

| Task asks for | Command or field |
| --- | --- |
| A new ServiceAccount | `kubectl create sa NAME -n NS` |
| A Pod running as it | `spec.serviceAccountName` in the manifest |
| A Deployment switched to it | `kubectl set sa deployment/NAME SA -n NS` |
| Permissions for it | `kubectl create rolebinding NAME --role=ROLE --serviceaccount=NS:SA -n NS` |
| Proof that it has them | `kubectl auth can-i list pods --as=system:serviceaccount:NS:SA -n NS` |

> **Exam trap.** `spec.serviceAccountName` of a running Pod cannot be changed: you can only set it when the Pod is created or in a template. For a bare Pod, delete it and create it again (`kubectl replace --force -f api.yaml`). The older `serviceAccount` field is a deprecated alias; write `serviceAccountName`.

> **Exam trap.** The ServiceAccount must exist in the Pod's namespace before the Pod is created: the ServiceAccount admission controller rejects a Pod that names a missing one. A Deployment that names a missing ServiceAccount creates no Pods; `kubectl describe rs` shows the `FailedCreate` event.

<!-- section: token-mounting | objectives: 4.7.2 -->
## Control token mounting and request tokens

By default the control plane adds a projected volume named `kube-api-access-` plus a random suffix to every Pod, mounted in each container at `/var/run/secrets/kubernetes.io/serviceaccount`. It holds three files: `token` (a short-lived token obtained by the kubelet through the TokenRequest API, bound to the Pod, audience the API server, lifetime 1 hour by default, refreshed before it expires), `ca.crt` (from the ConfigMap `kube-root-ca.crt`) and `namespace`.

An application that never calls the API should not get that token. Set `automountServiceAccountToken: false` on the ServiceAccount (all its Pods) or on the Pod spec (this Pod only). When both set a value, **the Pod spec wins**.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: batch-sa
  namespace: shop
automountServiceAccountToken: false
---
apiVersion: v1
kind: Pod
metadata:
  name: report
  namespace: shop
spec:
  serviceAccountName: batch-sa
  automountServiceAccountToken: true     # overrides the ServiceAccount for this Pod
  containers:
  - name: report
    image: busybox:1.36
    command: ["sleep", "3600"]
```

To hand a token to a person or a script, `kubectl create token` asks the TokenRequest API for a short-lived token and prints it. Nothing is stored in the cluster.

```bash
kubectl create token api-sa -n shop
kubectl create token api-sa -n shop --duration=10m
kubectl create token api-sa -n shop --audience=https://vault.example.com
kubectl create token api-sa -n shop --bound-object-kind=Pod --bound-object-name=api
```

Without `--duration`, the server chooses the lifetime, and it may return a longer or shorter one than requested. `--bound-object-kind` accepts `Pod`, `Secret` or `Node` and needs `--bound-object-name`; the token then stops working when that object is deleted.

An application that needs a token for another audience mounts its own projected token:

```yaml
spec:
  serviceAccountName: api-sa
  containers:
  - name: api
    image: registry.example.com/shop/api:2.1
    volumeMounts:
    - name: vault-token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: vault-token
    projected:
      sources:
      - serviceAccountToken:
          path: vault-token            # file /var/run/secrets/tokens/vault-token
          audience: vault
          expirationSeconds: 7200
```

`expirationSeconds` defaults to 1 hour and must be at least 600 (10 minutes); `audience` defaults to the API server. The kubelet rotates the token when it is older than 80 % of its lifetime or older than 24 hours.

| Task asks for | Answer |
| --- | --- |
| No token in any Pod of a ServiceAccount | `automountServiceAccountToken: false` on the ServiceAccount |
| No token in one Pod only | `automountServiceAccountToken: false` in `spec` of the Pod (template) |
| Print a token valid for 30 minutes | `kubectl create token SA --duration=30m -n NS` |
| A token file for audience `vault` | Projected volume with a `serviceAccountToken` source |
| A token that never expires | Secret of type `kubernetes.io/service-account-token` with the annotation `kubernetes.io/service-account.name` (not recommended) |

> **Exam trap.** Since Kubernetes v1.24, creating a ServiceAccount no longer creates a token Secret, so `kubectl get secrets` shows nothing to decode. Use `kubectl create token`, or create the `kubernetes.io/service-account-token` Secret yourself only if the task explicitly asks for a long-lived token.

<!-- section: security-context | objectives: 4.8.1 -->
## Pod and container securityContext

A securityContext exists at two levels. `spec.securityContext` (PodSecurityContext) applies to every container and to the Pod's volumes. `spec.containers[].securityContext` (SecurityContext) applies to one container and **overrides** the Pod value for the fields that exist at both levels. Some fields exist at only one level:

| Field | Pod | Container | Effect and default |
| --- | --- | --- | --- |
| `runAsUser` | Yes | Yes | UID of the entrypoint; default is the image's user |
| `runAsGroup` | Yes | Yes | Primary GID; if omitted, the runtime default (root, 0) |
| `runAsNonRoot` | Yes | Yes | `true`: the kubelet refuses to start a container that would run as UID 0 |
| `fsGroup` | Yes | No | Supplementary group of every container; supported volumes are owned by this GID |
| `supplementalGroups` | Yes | No | Extra GIDs for the first process of each container |
| `readOnlyRootFilesystem` | No | Yes | Read-only root filesystem; default `false` |
| `allowPrivilegeEscalation` | No | Yes | `false` sets `no_new_privs`; default `true` |
| `privileged` | No | Yes | Nearly root on the host; default `false` |
| `capabilities` | No | Yes | Linux capabilities to `add` and `drop` |
| `seccompProfile` | Yes | Yes | Seccomp profile (next section) |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-web
  namespace: shop
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
  volumes:
  - name: cache
    emptyDir: {}
  containers:
  - name: web
    image: registry.example.com/shop/web:1.4
    securityContext:
      runAsUser: 2000                    # overrides 1000 for this container
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: cache
      mountPath: /tmp
```

Check the result from inside the container:

```bash
kubectl exec secure-web -n shop -- id                 # uid=2000 gid=3000, groups include 2000
kubectl exec secure-web -n shop -- touch /test        # Read-only file system
kubectl exec secure-web -n shop -- touch /tmp/ok      # works: emptyDir is writable
```

`runAsNonRoot: true` does not choose a user, it only checks. If the image runs as root and no `runAsUser` is set, the container is not started: the Pod shows `CreateContainerConfigError` and the event says `container has runAsNonRoot and image will run as root`. If the image declares a non-numeric user (`USER nginx`), the kubelet cannot verify it and refuses too. Add a numeric non-zero `runAsUser`.

> **Exam trap.** `readOnlyRootFilesystem`, `allowPrivilegeEscalation`, `privileged` and `capabilities` are **container** fields. Placed under `spec.securityContext` they are unknown fields: `kubectl apply` refuses the manifest (field validation is strict by default), and with validation turned off they are dropped silently. `fsGroup` is the opposite: Pod level only.

> **Exam trap.** A read-only root filesystem breaks applications that write to `/tmp`, a cache or a PID file. The expected fix is an `emptyDir` mounted on that path, not `readOnlyRootFilesystem: false`.

<!-- section: capabilities-seccomp | objectives: 4.8.2 -->
## Linux capabilities and seccomp profiles

Capabilities split root's powers into units. They are set per container under `securityContext.capabilities`, with names **without** the `CAP_` prefix: `NET_ADMIN`, not `CAP_NET_ADMIN`.

```yaml
containers:
- name: proxy
  image: registry.example.com/shop/proxy:3.0
  securityContext:
    capabilities:
      drop: ["ALL"]
      add: ["NET_BIND_SERVICE"]          # bind ports below 1024 without root
```

`drop: ["ALL"]` removes every capability, including those the runtime grants by default; `add` then gives back only what is listed. `privileged: true` gives all capabilities and access to host devices: never the answer when a task asks for one capability.

**Seccomp** filters the system calls a container can make. `seccompProfile` sits at Pod level (all containers) or container level (overrides the Pod):

| `type` | Meaning |
| --- | --- |
| `RuntimeDefault` | The container runtime's default profile |
| `Localhost` | A profile file on the node; `localhostProfile` is required, a path relative to the kubelet's seccomp directory (`seccomp/` under its root directory) |
| `Unconfined` | No seccomp filtering |

```yaml
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/audit.json
```

The Pod Security Standard **restricted** profile combines everything in this chapter. A namespace labelled `pod-security.kubernetes.io/enforce: restricted` rejects a Pod unless each container has `allowPrivilegeEscalation: false`, `runAsNonRoot: true` (Pod or container), `capabilities.drop` containing `ALL` (only `NET_BIND_SERVICE` may be added back), a seccomp type `RuntimeDefault` or `Localhost`, and no `runAsUser: 0`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened
  namespace: payments
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: registry.example.com/payments/app:5.2
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop: ["ALL"]
```

| Task asks for | Field |
| --- | --- |
| Run as user 1000 | `runAsUser: 1000` (Pod or container) |
| Files on volumes owned by group 2000 | `fsGroup: 2000` (Pod) |
| Refuse to run as root | `runAsNonRoot: true` |
| Container cannot write its image filesystem | `readOnlyRootFilesystem: true` (container) |
| No setuid escalation | `allowPrivilegeEscalation: false` (container) |
| Allow changing the system clock only | `capabilities.add: ["SYS_TIME"]` (container) |
| Runtime's default syscall filter | `seccompProfile.type: RuntimeDefault` |

> **Exam trap.** `allowPrivilegeEscalation` is always true for a container that is privileged or has `SYS_ADMIN`; `allowPrivilegeEscalation: false` cannot be combined with either. And `seccompProfile.type` is case-sensitive: `RuntimeDefault`, not `runtime/default` (the old annotation value).

<!-- section: key-points -->
## Key points

- Every namespace has a `default` ServiceAccount; set `serviceAccountName` in the Pod spec or template, or use `kubectl set sa` on a Deployment; a running Pod's ServiceAccount cannot change.
- `automountServiceAccountToken: false` on the ServiceAccount or the Pod; the Pod value wins.
- `kubectl create token SA --duration=... --audience=...` prints a short-lived token; projected `serviceAccountToken` volumes default to 1 hour, minimum 600 seconds.
- Container fields override Pod fields; `fsGroup` is Pod-only, `readOnlyRootFilesystem`, `allowPrivilegeEscalation`, `privileged` and `capabilities` are container-only.
- `runAsNonRoot` checks, `runAsUser` chooses; a root image with `runAsNonRoot: true` ends in `CreateContainerConfigError`.
- Capabilities without `CAP_`, `drop: ["ALL"]` then `add`; seccomp types `RuntimeDefault`, `Localhost` (with `localhostProfile`), `Unconfined`.
