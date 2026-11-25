The kube-apiserver is the front door of the cluster: users, controllers, kubelets and workloads all read and change the cluster state through it, and it is the only component that talks to etcd. This chapter follows a request through its stages, then covers how access to the API server is secured and which of its settings matter for security.

<!-- section: request-stages | objectives: 2.1.1 -->
## The stages of an API request

Every request goes through the same chain, in this order:

| Stage | Question answered | On failure |
| --- | --- | --- |
| **Transport security** | Is the connection encrypted and is the server the right one? | TLS handshake fails |
| **Authentication** | Who is calling? Authenticators (client certificates, bearer tokens, ServiceAccount tokens, OIDC, webhook) are tried in turn until one succeeds | HTTP **401** Unauthorized |
| **Authorization** | May this identity perform this verb on this resource in this namespace? Authorizers (Node, RBAC, Webhook...) are consulted in order; the first that allows or denies decides, and if none has an opinion the request is denied | HTTP **403** Forbidden |
| **Mutating admission** | Should the object be changed? Plugins and webhooks can set defaults or inject fields | Request rejected |
| **Validation** | Is the object valid for its schema? | Request rejected |
| **Validating admission** | Is the final object allowed? Plugins, ValidatingAdmissionPolicies and webhooks accept or reject it | Request rejected |
| **Persistence** | The object is written to etcd | |

Authentication and authorization see who is calling and what they want to do, not the content of the object. **Admission control** is the first stage that sees the object itself, which is why rules such as "no privileged Pods" or "images only from our registry" are admission rules. If any admission controller rejects the request, it is rejected immediately, unlike authenticators and authorizers where another module can still succeed.

Admission control acts only on requests that **create, modify, delete or connect to** (proxy) an object; requests that only **read** objects (`get`, `list`, `watch`) skip it.

> **Exam trap.** The order is authentication, then authorization, then admission. A 401 means the caller wasn't identified; a 403 means the identity was recognized but not allowed. Admission can't protect read access: restricting who can `get` Secrets is an authorization (RBAC) question.

<!-- section: securing-access | objectives: 2.1.2 -->
## Securing access to the API server

**TLS on the secure port.** The API server serves HTTPS on port **6443** by default (`--secure-port`, which can't be turned off), on the address given by `--bind-address`; production clusters often expose it on 443 behind a load balancer. Its serving certificate is set with `--tls-cert-file` and `--tls-private-key-file`, and clients verify it with the cluster CA in their kubeconfig. Older releases also had an unauthenticated plain HTTP port; it has been removed. All API traffic, including from nodes and components, is expected to use TLS.

**Anonymous requests.** With `--anonymous-auth` (default `true`), a request that no authenticator rejects is treated as anonymous: username `system:anonymous`, group `system:unauthenticated`. RBAC denies it unless something is bound to that user or group. Two ways to reduce the risk:

- Disable it with `--anonymous-auth=false`.
- Or keep it only for health checks with the anonymous section of the `AuthenticationConfiguration` file (stable since v1.34); you then can't also set `--anonymous-auth`:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AuthenticationConfiguration
anonymous:
  enabled: true
  conditions:
  - path: /livez
  - path: /readyz
  - path: /healthz
```

Other endpoints are then unreachable anonymously, even if an RBAC binding would allow it. Review and remove bindings to `system:anonymous` and `system:unauthenticated`.

**Limited network exposure.** The API server should not be reachable from the whole internet. Use a private endpoint or network access lists limited to administration networks, and reach it through a VPN or a bastion host. Authentication still applies, but a hidden endpoint can't be brute-forced or hit by an unpatched vulnerability from anywhere.

> **Exam tip.** Anonymous access is on by default. A question showing `curl -k https://api.example.com:6443/api` returning a 403 for `system:anonymous` describes an authenticated-as-anonymous request denied by authorization, not a TLS problem.

<!-- section: security-settings | objectives: 2.1.3 -->
## Security-relevant API server settings

| Setting | Purpose | Secure value |
| --- | --- | --- |
| `--authorization-mode` | Ordered list of authorizers: `AlwaysAllow`, `AlwaysDeny`, `ABAC`, `RBAC`, `Node`, `Webhook`; defaults to `AlwaysAllow` when neither this flag nor `--authorization-config` is set | `Node,RBAC` |
| `--authorization-config` | Structured authorization configuration file (stable since v1.32), needed for several webhooks or webhook failure policies; mutually exclusive with `--authorization-mode` | Node and RBAC authorizers listed first as needed |
| `--enable-admission-plugins` | Plugins added to the default set, which already includes `PodSecurity`, `ServiceAccount`, `LimitRanger`, `ResourceQuota` and the webhook and admission policy plugins | Add `NodeRestriction`, which isn't enabled by default |
| `--anonymous-auth` or `AuthenticationConfiguration` | Anonymous requests | `false`, or limited to health endpoints |
| `--audit-policy-file` with `--audit-log-path` or `--audit-webhook-config-file` | Audit logging; without a policy file no events are logged | A policy that records at least Metadata for sensitive resources, logs shipped to protected storage |
| `--encryption-provider-config` | Encryption at rest of resources stored in etcd | An EncryptionConfiguration covering Secrets, with a KMS v2 (or `secretbox`) provider first |
| `--etcd-cafile`, `--etcd-certfile`, `--etcd-keyfile` | TLS and client certificate for the connection to etcd | Set, with etcd requiring client certificates |
| `--kubelet-certificate-authority`, `--kubelet-client-certificate` | Verify the kubelets' serving certificates and authenticate to them | Set |
| `--tls-min-version` | Minimum TLS version | `VersionTLS12` or higher |
| `--profiling` | Profiling endpoint at `/debug/pprof/` (default `true`) | `false` when not needed |

**Authorization modes.** `Node` authorizes kubelets for the objects related to their own Pods; `RBAC` covers everyone else. `AlwaysAllow` disables authorization: `AlwaysAllow,RBAC` behaves like `AlwaysAllow`, because RBAC has no deny rules. Use it only for testing, never on an API server reachable from the internet.

**Encryption at rest.** The first provider in the list encrypts new writes; all listed providers are tried to decrypt. `identity` means no encryption, so it must not come first:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - secretbox:
      keys:
      - name: key1
        secret: <BASE64-ENCODED-32-BYTE-KEY>
  - identity: {}
```

With a local provider such as `secretbox`, the key sits in a file on the control plane node; a KMS v2 provider keeps the key encryption key in an external key management service, which is preferred (the docs rate KMS strongest). The docs rate `aescbc` as weak and no longer recommend it (CBC is open to padding oracle attacks), and `aesgcm` only with automated key rotation. KMS v1 is deprecated.

> **Exam trap.** `PodSecurity` is enabled by default, `NodeRestriction` is not: it must be added with `--enable-admission-plugins`. And setting `--authorization-mode=RBAC` without `Node` leaves kubelets without the Node authorizer that restricts them to their own Pods.

<!-- section: key-points -->
## Key points

- Request order: TLS, authentication (401), authorization (403), mutating admission, validation, validating admission, persistence in etcd. Read requests skip admission.
- The API server serves TLS on port 6443 by default; there is no insecure port any more.
- Anonymous requests (`system:anonymous`, `system:unauthenticated`) are enabled by default: disable them or limit them to `/livez`, `/readyz` and `/healthz` with an AuthenticationConfiguration.
- Don't expose the API server publicly: private endpoint or allow-listed networks, VPN or bastion.
- Key settings: `--authorization-mode=Node,RBAC` (never `AlwaysAllow`), `NodeRestriction` added to the admission plugins, an audit policy and backend, an EncryptionConfiguration, TLS to etcd and kubelets, `--profiling=false`.
