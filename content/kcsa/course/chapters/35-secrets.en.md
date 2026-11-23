A Secret is the Kubernetes object for small pieces of confidential data: passwords, tokens, keys, certificates. Using a Secret keeps that data out of Pod specs and container images, but a Secret is not protected by default: it is stored unencrypted in etcd and readable by anyone with the right API access. The exam expects you to know the Secret types, why base64 is not encryption, how encryption at rest is configured, and the practices that limit exposure.

<!-- section: secret-basics | objectives: 3.5.1 -->
## Kubernetes Secrets and their types

A Secret is a namespaced object whose `data` field holds base64-encoded values; the `stringData` field accepts plain strings and is merged into `data` on write. Each Secret is limited to 1 MiB. The `type` field tells Kubernetes and tools what keys to expect:

| Type | Content |
| --- | --- |
| `Opaque` | Arbitrary user-defined data (the default when no type is given) |
| `kubernetes.io/service-account-token` | Legacy long-lived ServiceAccount token |
| `kubernetes.io/dockercfg` | Serialized `~/.dockercfg` file |
| `kubernetes.io/dockerconfigjson` | Serialized `~/.docker/config.json`, used by `imagePullSecrets` |
| `kubernetes.io/basic-auth` | Credentials for basic authentication (`username`, `password`) |
| `kubernetes.io/ssh-auth` | SSH private key (`ssh-privatekey`) |
| `kubernetes.io/tls` | Certificate and private key (`tls.crt`, `tls.key`), for example for an Ingress |
| `bootstrap.kubernetes.io/token` | Bootstrap token used to join nodes |

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: payments
type: kubernetes.io/basic-auth
data:
  username: YXBw
  password: czNjcjN0LXBhc3M=
```

**Base64 is an encoding, not encryption.** Anyone who can read the manifest or the object recovers the value in one command:

```bash
kubectl get secret db-credentials -n payments -o jsonpath='{.data.password}' | base64 -d
```

```text
s3cr3t-pass
```

The Kubernetes documentation is explicit: Secrets are, by default, stored **unencrypted** in etcd; anyone with API access to them, or with access to etcd, can retrieve them; and anyone allowed to create a Pod in a namespace can read any Secret of that namespace by mounting it.

> **Exam trap.** "The Secret is safe because its values are base64-encoded" is always wrong. Base64 only allows binary data in YAML; confidentiality comes from RBAC, encryption at rest and keeping manifests out of repositories.

<!-- section: encryption-at-rest | objectives: 3.5.2 -->
## Encryption at rest with an EncryptionConfiguration

The API server can encrypt chosen resources before writing them to etcd. You describe the resources and providers in an `EncryptionConfiguration` file and pass it with `--encryption-provider-config`:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  - configmaps
  providers:
  - kms:
      apiVersion: v2
      name: corp-kms
      endpoint: unix:///var/run/kmsplugin/socket.sock
      timeout: 3s
  - aescbc:
      keys:
      - name: key1
        secret: c2VjcmV0IGlzIHNlY3VyZQ==
  - identity: {}
```

How the provider list works:

- The **first** provider encrypts new writes. On read, providers are tried in order until one can decrypt the stored data.
- `identity` stores data as plain text. It is the default when no configuration exists; listing it **first** means no encryption. Keeping it last lets the API server still read data written before encryption was enabled.
- Existing Secrets stay as they were until rewritten. After enabling or rotating a key, rewrite them: `kubectl get secrets --all-namespaces -o json | kubectl replace -f -`.

| Provider | Encryption | Notes |
| --- | --- | --- |
| `identity` | None | Default; plain text |
| `aescbc` | AES-CBC with PKCS#7 padding | Weak: vulnerable to padding oracle attacks; not recommended |
| `aesgcm` | AES-GCM | Fastest, but the key must be rotated every 200,000 writes; only with automated rotation |
| `secretbox` | XSalsa20 and Poly1305 | Strong and fast |
| `kms` v2 | Envelope encryption with an external key management service | Strongest; stable since v1.29; the recommended choice |
| `kms` v1 | Envelope encryption, one data key per resource | Deprecated since v1.28 and disabled by default since v1.29 |

With `aescbc`, `aesgcm` and `secretbox`, the key is written in the configuration file on the control plane host: anyone who reads that file and a copy of etcd can decrypt everything. Restrict the file to the user running the API server. With **KMS v2**, data is encrypted with a data encryption key (DEK), and the DEK is encrypted by a key encryption key (KEK) that stays in the remote KMS; the API server talks to a KMS plugin over a local UNIX socket (gRPC).

> **Exam trap.** Encryption at rest protects etcd data and its backups from someone who obtains the **storage**. It does nothing against a user with RBAC `get` on Secrets: the API server decrypts for any authorized request. You need both encryption at rest and least-privilege RBAC.

<!-- section: secrets-good-practices | objectives: 3.5.3 -->
## Good practices for Secrets

| Practice | What it prevents |
| --- | --- |
| **Least-privilege RBAC**: no `list` or `watch` on Secrets for humans or ordinary workloads, `get` only on named Secrets (`resourceNames`) when needed | Bulk reading of every Secret (`list` returns the full contents) |
| **Control who can create Pods** and enforce Pod Security Standards | Reading Secrets indirectly by mounting them in a new Pod |
| **Encrypt at rest** (KMS v2) and restrict etcd access to administrators; TLS between etcd members | Theft from etcd disks or backups |
| **Mount Secrets as volumes** rather than environment variables | Environment variables are easily leaked (crash dumps, debug endpoints, logs, child processes) and are not refreshed when the Secret changes; volume data lives in `tmpfs` and is updated |
| **Expose a Secret only to the container that needs it** | Sidecars reading credentials they do not use |
| **Immutable Secrets** (`immutable: true`, stable since v1.21) | Accidental or malicious changes; reduces API server load. To change one, delete and recreate it |
| **Separate namespaces** for workloads with different secrets | One team's Pods mounting another team's credentials |
| **External secret managers** (for example HashiCorp Vault or a cloud secret manager) through the Secrets Store CSI Driver | Long-lived copies in etcd; central rotation and auditing |
| **Never commit Secret manifests** or share them | Base64 values in a repository are readable by everyone with access |
| **Disable unused ServiceAccount tokens** (`automountServiceAccountToken: false`) | Stolen API tokens |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: payments
spec:
  containers:
  - name: api
    image: registry.example.com/payments/api:2.3.0
    volumeMounts:
    - name: db
      mountPath: /etc/db
      readOnly: true
  volumes:
  - name: db
    secret:
      secretName: db-credentials
      defaultMode: 0400
```

The application must also protect values after reading them: never log them or send them to untrusted parties.

> **Exam tip.** For "reduce the risk that a Secret leaks through process listings or logs", choose a volume mount over environment variables. For "keep secrets out of etcd entirely", choose an external secret store with the Secrets Store CSI Driver. For "stop changes to a Secret", choose `immutable: true`.

<!-- section: key-points -->
## Key points

- Secrets hold small confidential data (1 MiB maximum); types include `Opaque`, `kubernetes.io/dockerconfigjson`, `kubernetes.io/tls`, `kubernetes.io/basic-auth`, `kubernetes.io/ssh-auth` and `kubernetes.io/service-account-token`.
- Base64 is encoding, not encryption; Secrets are unencrypted in etcd by default.
- `EncryptionConfiguration` (`--encryption-provider-config`): the first provider encrypts; `identity` is plain text; prefer `kms` v2; `aescbc` is weak, `aesgcm` needs frequent rotation; KMS v1 is deprecated and off by default.
- Rewrite existing Secrets after enabling encryption, and protect the configuration file that holds local keys.
- Limit `get`, `list` and `watch` on Secrets and the right to create Pods; prefer volumes to environment variables; use immutable Secrets and external secret managers.
