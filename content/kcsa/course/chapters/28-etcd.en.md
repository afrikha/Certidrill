etcd is the key-value store that holds the entire state of a Kubernetes cluster. Every object you create through the API server, including every Secret, ends up there. The Kubernetes documentation puts it plainly: access to etcd is equivalent to root permission in the cluster. The exam asks you why etcd is the most sensitive data store, how it is hardened, and how its data is protected at rest and in backups.

<!-- section: etcd-sensitivity | objectives: 2.8.1 -->
## Why etcd is the most sensitive data store

The kube-apiserver is the **only** component that should talk to etcd. Every request reaching etcd through the API server has already been authenticated, authorized, checked by admission control and recorded in the audit log. Direct access to etcd skips all of that.

What etcd contains (under keys such as `/registry/secrets/<namespace>/<name>`):

- **Secrets**: passwords, API keys, TLS private keys, registry credentials, ServiceAccount token Secrets. By default they are only base64-encoded, so they are stored in plaintext.
- **RBAC objects**: Roles, ClusterRoles and their bindings.
- **Workload definitions**: Pods, Deployments, DaemonSets, admission webhook configurations.
- Every other object: ConfigMaps, Nodes, Services, custom resources.

What an attacker gains with direct read or write access:

| Access | Impact |
| --- | --- |
| Read | Every Secret of every namespace, including credentials for systems outside the cluster |
| Write | Create a ClusterRoleBinding to `cluster-admin` for any identity, inject a privileged Pod or DaemonSet, delete admission webhook configurations, all **without** passing authentication, RBAC, admission or audit |
| Delete or corrupt | Destroy the cluster state: a denial of service of the whole cluster |

etcd has its own optional user authentication, but Kubernetes does not use it: the protection is **mutual TLS plus network isolation**, so that only the API server holds a valid client certificate and can reach the port.

> **Exam trap.** RBAC does not protect data in etcd. RBAC is enforced by the API server; a client that connects to etcd directly is never checked by it. "Which component should be the only client of etcd?" The kube-apiserver.

<!-- section: etcd-hardening | objectives: 2.8.2 -->
## Hardening etcd: TLS, client certificates and network isolation

etcd listens on two ports:

| Port | Traffic | Protect with |
| --- | --- | --- |
| **2379** | Client traffic (the API server, `etcdctl`) | Server TLS plus client certificate authentication |
| **2380** | Peer traffic between etcd members (replication) | Peer TLS plus peer certificate authentication |

etcd server flags:

| Flag | Purpose |
| --- | --- |
| `--cert-file`, `--key-file` | Server certificate and key: client connections use HTTPS |
| `--client-cert-auth=true` | Clients must present a certificate signed by the trusted CA |
| `--trusted-ca-file` | CA used to verify client certificates |
| `--peer-cert-file`, `--peer-key-file` | Certificate and key for member-to-member TLS |
| `--peer-client-cert-auth=true` | Peers must present a valid certificate |
| `--peer-trusted-ca-file` | CA used to verify peer certificates |

The API server connects as a client with its own certificate:

```text
kube-apiserver \
  --etcd-servers=https://10.0.1.10:2379 \
  --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt \
  --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt \
  --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key
```

Good practices:

- **A dedicated CA for etcd.** The Kubernetes security checklist recommends mTLS with a certificate authority unique to etcd. If etcd trusted the main cluster CA, any certificate issued by that CA (for a user or a kubelet) could be presented to etcd.
- **No self-signed shortcuts.** `--auto-tls` and `--peer-auto-tls` generate self-signed certificates: traffic is encrypted, but identities are **not** authenticated.
- **Network isolation.** Port 2379 reachable only from the API servers (and backup tooling), port 2380 only between etcd members; never from Pods, worker nodes or the internet. Use firewalls or security groups; run etcd on control plane or dedicated hosts.
- **Protected files.** The etcd data directory and the private keys on the host are readable only by the etcd user or root.

> **Exam tip.** "Only clients with valid certificates can access etcd" is achieved with `--client-cert-auth=true` and `--trusted-ca-file`. TLS alone (`--cert-file`) encrypts traffic but lets any client connect.

<!-- section: etcd-encryption-backups | objectives: 2.8.3 -->
## Encryption at rest and protection of backups

**Encryption at rest is done by the API server**, not by etcd. The kube-apiserver encrypts selected resources before writing them, using an **EncryptionConfiguration** file passed with `--encryption-provider-config`:

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
          endpoint: unix:///var/run/kms-provider.sock
      - identity: {}
```

| Provider | Encryption | Notes |
| --- | --- | --- |
| `identity` | None | The default: data stored as written |
| `aescbc` | AES-CBC with a local key | Weak: vulnerable to padding oracle attacks |
| `aesgcm` | AES-GCM with a local key | Fast, but the key must be rotated every 200,000 writes |
| `secretbox` | XSalsa20 and Poly1305 with a local key | Strong |
| `kms` v2 | Envelope encryption: data keys encrypted by a key in an external KMS | **Strongest**; stable since v1.29. KMS v1 is deprecated |

Rules to remember:

- The **first** provider in the list encrypts new writes; for reads, providers are tried in order. With `identity` first, nothing new is encrypted.
- With `aescbc`, `aesgcm` or `secretbox`, the key sits in the configuration file on the control plane host: someone who steals that file and etcd data can decrypt everything. With KMS, the attacker also needs the external KMS.
- Existing objects are not re-encrypted automatically: rewrite them, for example with `kubectl get secrets --all-namespaces -o json | kubectl replace -f -`.
- Verify by reading a Secret directly with `etcdctl`: an encrypted value starts with a prefix such as `k8s:enc:kms:v2:` or `k8s:enc:aescbc:v1:`.
- Restrict the configuration file so only the user running kube-apiserver can read it.

**Backups.** An etcd snapshot (`etcdctl snapshot save`) contains the **complete** cluster state, Secrets included:

```bash
ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /backup/etcd-snapshot.db
```

- **Encrypt the snapshot files** and store them off the cluster with tightly restricted access: a stolen snapshot is a stolen cluster.
- Encryption at rest protects only the resources it covers inside the snapshot, and only if the encryption key or KMS is not stored next to it. Back up the key material separately and protect it, or the restore cannot decrypt the data.
- Restore with the API servers stopped, and test restores regularly.

> **Exam trap.** Base64 is an encoding, not encryption. Without an EncryptionConfiguration, Secrets are readable by anyone who can read etcd or a snapshot. And disk encryption of the etcd volume does not help against someone who reads etcd through its API or copies a snapshot.

<!-- section: key-points -->
## Key points

- etcd holds all cluster state; direct access equals cluster root and bypasses authentication, RBAC, admission and audit.
- Only the kube-apiserver should reach etcd: client port 2379, peer port 2380, never exposed to Pods or the internet.
- mTLS: `--client-cert-auth` and `--trusted-ca-file` for clients, `--peer-client-cert-auth` for members, a CA dedicated to etcd, no auto-TLS.
- The API server connects with `--etcd-cafile`, `--etcd-certfile`, `--etcd-keyfile`.
- Encryption at rest: EncryptionConfiguration on the API server; first provider writes; `identity` = none; KMS v2 strongest.
- Rewrite existing Secrets after enabling encryption; verify the `k8s:enc:` prefix in etcd.
- Snapshots contain everything: encrypt them, restrict access, store them and the keys separately.
