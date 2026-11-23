Sensitive data in a cluster includes passwords, API keys, TLS private keys, ServiceAccount tokens, and the business data the applications process. It ends up in more places than the Secret objects meant to hold it: environment variables, log lines, image layers, backups. The exam asks you to find where sensitive data lives, how an attacker reaches it, and which protection answers each path.

<!-- section: where-sensitive-data-lives | objectives: 4.6.1 -->
## Where sensitive data lives

| Location | What is there | Exposure |
| --- | --- | --- |
| **Secrets in etcd** | Every Secret object: credentials, keys, tokens | Values are **base64-encoded, not encrypted**, and are stored **unencrypted in etcd by default**. Anyone with access to etcd or its backups reads them |
| **Secrets on nodes** | Secrets mounted as volumes | The kubelet stores a copy in a `tmpfs` (memory) so it is not written to durable storage, and deletes it when the Pod is deleted. A Secret is only sent to a node if a Pod there needs it |
| **Environment variables** | Values from `secretKeyRef`, or literal values in the Pod spec | Visible to every process in the container, inherited by child processes, often printed in crash dumps and debug output; literal values are readable by anyone who can `get` the Pod |
| **Volumes** | Persistent volumes, `hostPath` data, files written by applications | Readable by any Pod that mounts them, and by anyone with node access |
| **Logs** | Application logs, audit logs at `Request` or `RequestResponse` level | Credentials printed by mistake end up in log stores with wide read access |
| **Container images** | Files and environment variables baked into layers | A secret deleted in a later layer is still in the earlier one; anyone who can pull the image reads it |
| **Manifests and repositories** | Secret YAML committed to Git, Helm values files | Available to everyone who can read the repository; base64 provides no confidentiality |
| **ConfigMaps** | Configuration that someone used for a password | ConfigMaps are meant for non-confidential data and are usually readable more widely than Secrets |

> **Exam trap.** **Base64 is an encoding, not encryption.** `kubectl get secret db -o yaml` followed by `base64 -d` reveals the value. A Secret is confidential only through access control and, at rest, through encryption configured on the API server.

<!-- section: attacker-paths-to-data | objectives: 4.6.2 -->
## How attackers reach sensitive data

| Path | Detail |
| --- | --- |
| **Permissive RBAC on Secrets** | `get` reads a Secret. `list` and `watch` reveal the **contents of all** Secrets in scope, not only their names: `kubectl get secrets -A -o yaml` returns every value |
| **Pod creation** | Anyone allowed to create a Pod, or a Deployment or Job, in a namespace can mount any Secret of that namespace and run as any of its ServiceAccounts |
| **Mounted ServiceAccount tokens** | After compromising a container, the attacker reads the token at `/var/run/secrets/kubernetes.io/serviceaccount/token` and uses the ServiceAccount's RBAC rights |
| **Node access** | A privileged container or a node compromise reaches the Secrets of every Pod on that node, the kubelet's credentials, and container environment variables through `/proc` |
| **Direct etcd access** | Reads every object, bypassing RBAC and audit |
| **Unencrypted backups** | An etcd snapshot or a backup tool's archive copied to storage with weak access control contains every Secret in clear text if encryption at rest was not enabled |
| **Images, logs and repositories** | Pulling a public or poorly protected image, reading a log index, cloning a repository |
| **Cloud metadata endpoint** | Credentials of the node's cloud identity, reachable from Pods unless blocked |

```bash
# What can this ServiceAccount do with Secrets?
kubectl auth can-i list secrets -n payments \
  --as=system:serviceaccount:payments:api
```

> **Exam trap.** "The user can only `list` Secrets, not `get` them" is **not** safe: a list response contains the data of every Secret. The same applies to `watch`.

> **Exam tip.** Granting `create pods` in a namespace is effectively granting read access to that namespace's Secrets. Combine Pod creation rights with Pod Security Admission and separate namespaces for workloads of different sensitivity.

<!-- section: protecting-sensitive-data | objectives: 4.6.3 -->
## Protecting sensitive data

**Encryption at rest.** Configure the API server with an `EncryptionConfiguration` (`--encryption-provider-config`) so Secrets are encrypted before they are written to etcd:

| Provider | Notes |
| --- | --- |
| `identity` | No encryption: the default behaviour |
| `aescbc` | Not recommended (padding oracle weakness); key stored on the control plane host |
| `aesgcm` | Fast, but the key must be rotated frequently (automated rotation only); key on the host |
| `secretbox` | Strong (XSalsa20 and Poly1305); key on the host |
| `kms` v2 | Envelope encryption with the key encryption key held in an external KMS; stable since v1.29, the strongest option. KMS v1 is deprecated |

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - kms:
          apiVersion: v2
          name: example-kms
          endpoint: unix:///var/run/kms-plugin/socket.sock
      - identity: {}
```

The **first** provider in the list encrypts new writes; the others are tried in order to read. Existing Secrets stay unencrypted until they are rewritten (`kubectl get secrets -A -o json | kubectl replace -f -`). With a local key, encryption protects against an etcd or backup compromise but not against a control plane host compromise, where the key sits; KMS means an attacker must compromise both etcd and the KMS. Encryption at rest does not change what API clients can read: the API server decrypts for anyone RBAC allows.

**Encryption in transit.** TLS for the API server, mutual TLS between the API server and etcd and between etcd members, and mTLS or CNI encryption for application traffic.

**Least privilege.**

- Grant `get` on specific Secrets with `resourceNames`; reserve `list` and `watch` on Secrets for the most privileged system components; only cluster administrators may access etcd.
- Separate namespaces for workloads with different sensitivity; restrict Pod creation, and enforce Pod Security Standards so nobody mounts `hostPath` or runs privileged.
- `automountServiceAccountToken: false` for Pods that do not call the API; in multi-container Pods, mount a Secret only in the container that needs it.

**External secret stores.** Keep secrets in a dedicated store outside the cluster. The **Secrets Store CSI Driver** is a DaemonSet that lets the kubelet retrieve secrets from an external store and mount them as a volume into the Pods you authorize; other tools synchronise external secrets into Kubernetes Secrets.

**Keep secrets out of images, repositories and logs.**

- Inject secrets at runtime; never `COPY` them into an image or set them with `ENV` in a Dockerfile. Scan images and repositories for leaked credentials.
- Do not commit Secret manifests in plain text; encrypt them or store references to an external store.
- Applications must not log secret values; audit policies log Secrets at `Metadata` level only.
- Prefer volumes to environment variables, encrypt and access-control etcd backups, and wipe etcd storage that is no longer used.

| Requirement | Control |
| --- | --- |
| A stolen etcd backup must not reveal Secrets | Encryption at rest (KMS v2 preferred) and encrypted backups |
| Developers must not read production credentials | RBAC without `get`, `list`, `watch` on Secrets; no Pod creation rights in production namespaces |
| Secrets must be rotated centrally and never stored in etcd | External secret store with the Secrets Store CSI Driver |
| A Secret must not change after creation | `immutable: true` |

<!-- section: key-points -->
## Key points

- Sensitive data lives in Secrets in etcd, Secret volumes on nodes (`tmpfs`), environment variables, volumes, logs, images, repositories and backups.
- Secrets are base64-encoded and unencrypted in etcd by default.
- Attack paths: `get`, `list` or `watch` on Secrets, Pod creation, mounted ServiceAccount tokens, node access, etcd access, unencrypted backups, leaked images and logs.
- Encrypt at rest with an `EncryptionConfiguration` (first provider encrypts; KMS v2 strongest; rewrite existing Secrets), and in transit with TLS and mTLS.
- Apply least privilege, use external secret stores, and keep secrets out of images, Git and logs.
