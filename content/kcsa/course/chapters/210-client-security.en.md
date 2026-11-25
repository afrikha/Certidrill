Every person and tool that talks to the Kubernetes API is a client: `kubectl`, a CI/CD pipeline, a dashboard, a script using client-go. The cluster can be perfectly hardened and still fall to a stolen kubeconfig file. The KCSA exam expects you to know what a kubeconfig file holds, which client authentication methods carry which risks, and how to give human users only the access they need.

<!-- section: kubeconfig | objectives: 2.10.1 -->
## Kubeconfig files and their credentials

A **kubeconfig file** is the configuration that tells a client which API server to call and with which credentials. It does not have to be named `kubeconfig`: by default `kubectl` reads `$HOME/.kube/config`, and the `KUBECONFIG` environment variable can list several files, which are merged (the first file to set a value wins).

A kubeconfig file has three lists:

| Element | Contains | Security relevance |
| --- | --- | --- |
| `clusters` | API server URL (`server`) and the CA certificate used to verify it (`certificate-authority` or `certificate-authority-data`) | Without the CA, the client cannot detect a fake API server; never use `insecure-skip-tls-verify: true` |
| `users` | The credential: client certificate and key (`client-certificate-data`, `client-key-data`), a bearer `token`, or an `exec` credential plugin | The secret part of the file |
| `contexts` | A named triple: cluster, user and default namespace; `current-context` selects one | A wrong context sends commands to the wrong cluster |

```yaml
apiVersion: v1
kind: Config
clusters:
- name: prod
  cluster:
    server: https://api.prod.example.com:6443
    certificate-authority-data: LS0tLS1CRUdJTi...
users:
- name: alice
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1
      command: example-oidc-login
      args: ["get-token"]
      interactiveMode: IfAvailable
contexts:
- name: alice@prod
  context:
    cluster: prod
    user: alice
    namespace: shop
current-context: alice@prod
```

The values ending in `-data` are only **base64-encoded**: anyone who can read the file can use an embedded client key or token exactly as you would. Protect kubeconfig files like passwords:

- Restrict file permissions to the owner (for example `chmod 600 ~/.kube/config`) and keep them off shared drives, tickets, chat and container images.
- Never commit a kubeconfig file to a source repository; pipelines should receive short-lived credentials from their own identity provider instead.
- Prefer an `exec` plugin or OIDC login that fetches a short-lived token over a long-lived embedded key or token.
- Give each person and each automation its own file and identity, so that one leak can be revoked without breaking everyone.

> **Exam trap.** A kubeconfig file is also code. The Kubernetes documentation warns to use kubeconfig files only from trusted sources: a crafted file can lead to malicious code execution (an `exec` plugin runs any command you name) or file exposure (paths to local files). Inspect an untrusted kubeconfig file the way you would inspect a shell script.

<!-- section: client-authentication | objectives: 2.10.2 -->
## Client authentication methods

Clients authenticate to the API server with a certificate, a bearer token or through an authenticating proxy. The methods a client can use, and their risks:

| Method | How it works | Main risks |
| --- | --- | --- |
| **X.509 client certificate** | The client presents a certificate signed by the cluster CA; the `CN` is the username, each `O` is a group | Cannot be revoked individually: a stolen certificate works until it expires. Groups are frozen for the life of the certificate. The private key on disk cannot be password-protected |
| **OpenID Connect (OIDC)** | The user logs in to an identity provider; the client sends the `id_token` as a bearer token; the API server validates it without calling the provider | The `id_token` cannot be revoked, so it must be short-lived; refreshing is done by a client plugin |
| **client-go credential plugin** (`exec`) | `kubectl` runs an external command that returns an `ExecCredential` with a token or certificate, optionally with an `expirationTimestamp` | Only as safe as the plugin; it is the usual way to integrate cloud identities, LDAP, Kerberos or SAML |
| **Static token file** | Tokens listed in a file on control plane nodes (`--token-auth-file`) | Clear text on disk, tokens last indefinitely, no lockout, change requires an API server restart: not for production |
| **ServiceAccount token** | Token of a Kubernetes ServiceAccount | Meant for workloads, not people: legacy Secret-based tokens never expire |

The common thread is **long-lived credentials**. A certificate valid for a year, a static token or a legacy ServiceAccount token remains usable after the person leaves, after the laptop is stolen, and after the file is copied into a pipeline log. The Kubernetes hardening guidance recommends, for production clusters where many users access the API, an **external identity source such as OIDC**, with short token lifetimes, and enabling as few authentication mechanisms as possible.

> **Exam tip.** "A developer leaves the company; how do you cut off access immediately?" With OIDC you disable the account in the identity provider and tokens expire quickly. With a client certificate you cannot revoke it individually: you wait for expiry or re-key the CA. This is why short-lived credentials from an external identity provider are the expected answer.

<!-- section: least-privilege-users | objectives: 2.10.3 -->
## Least privilege for human users

Kubernetes has no User object: a human identity is whatever the authenticator returns (a username and groups). Least privilege for people therefore depends on two decisions.

**Personal identities, not shared ones.** Each administrator authenticates as themselves, so that RBAC can grant different rights and audit logs show who did what. A single shared `cluster-admin` kubeconfig file defeats both: you cannot tell who ran a command and you cannot revoke one person's access.

| Practice | Why |
| --- | --- |
| One identity per person, from the corporate identity provider | Accountability in audit logs; offboarding in one place |
| RBAC bound to groups from the identity provider | Access follows team membership |
| `RoleBinding` in the team's namespaces rather than `ClusterRoleBinding` | Limits the blast radius |
| No user in the `system:masters` group | That group bypasses RBAC entirely and cannot be revoked by deleting bindings |
| Daily work with a low-privileged account; elevated access only when needed | Avoids accidental changes with `cluster-admin` |

**Check what an identity can actually do.** `kubectl auth whoami` shows how the API server sees you; `kubectl auth can-i` asks the authorization layer whether an action is allowed, for yourself or, with impersonation, for someone else:

```bash
kubectl auth whoami
kubectl auth can-i delete deployments --namespace shop
kubectl auth can-i --list --namespace shop
kubectl auth can-i get secrets --namespace payments --as alice
kubectl auth can-i create pods --namespace shop --as system:serviceaccount:shop:builder
```

```text
ATTRIBUTE   VALUE
Username    alice@example.com
Groups      [developers system:authenticated]
```

`--as` (and `--as-group`) uses **impersonation**: it only works if your own identity holds the `impersonate` verb, which is itself a powerful permission. Chapter 3.4 covers RBAC and these checks in detail.

> **Exam trap.** `kubectl auth can-i` answers yes or no for one action; it does not change any permission. To reduce what a user can do you edit Roles and bindings, not the kubeconfig file: the kubeconfig file only proves who the user is.

<!-- section: key-points -->
## Key points

- A kubeconfig file holds clusters, users and contexts; embedded keys and tokens are base64, not encrypted. Protect it like a password, never commit it, and use kubeconfig files only from trusted sources.
- X.509 client certificates cannot be revoked individually and freeze group membership; static token files store clear-text tokens that last indefinitely.
- Prefer OIDC or an `exec` credential plugin that issues short-lived tokens from an external identity provider.
- Give every human a personal identity, bind rights to groups in namespaces, and keep users out of `system:masters`.
- Use `kubectl auth whoami` and `kubectl auth can-i` (with `--as` for impersonation) to check effective permissions.
