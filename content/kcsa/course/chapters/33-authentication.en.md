Authentication is the first step of every API request: the API server works out **who** is calling before authorization decides **what** that caller may do and admission control checks **how** the object looks. A failed authentication returns HTTP 401; a request authenticated but not authorized returns 403. This chapter covers how Kubernetes represents identities, the authentication strategies of the API server, ServiceAccount tokens and anonymous requests.

<!-- section: identities | objectives: 3.3.1 -->
## How Kubernetes identifies callers

Kubernetes distinguishes two kinds of users:

| Kind | Is it an API object? | Managed by | Typical use |
| --- | --- | --- | --- |
| **Normal user** | **No**: there is no User object, and you cannot add a user with an API call | An external system: certificates signed by the cluster CA, an OIDC identity provider, a webhook | People and external tools |
| **ServiceAccount** | **Yes**: a namespaced `ServiceAccount` object | The Kubernetes API (`kubectl create serviceaccount`) | Workloads running in Pods, in-cluster controllers |

After authentication, the request carries a **username**, a UID, **groups** and optional extra fields. Authorization (RBAC) uses only these strings, so a `RoleBinding` to `User: alice` simply matches whatever authenticator returns the username `alice`.

Special names to recognise:

| Name | Meaning |
| --- | --- |
| `system:serviceaccount:NAMESPACE:NAME` | Username of a ServiceAccount, for example `system:serviceaccount:shop:builder` |
| `system:serviceaccounts`, `system:serviceaccounts:NAMESPACE` | Groups of all ServiceAccounts, and of those in one namespace |
| `system:authenticated` | Added to every successfully authenticated request |
| `system:anonymous` and `system:unauthenticated` | Username and group of anonymous requests |
| `system:masters` | Group bound to `cluster-admin` by default; bypasses RBAC checks |
| `system:node:NODENAME` in group `system:nodes` | Kubelet identities, used by the Node authorizer |

> **Exam trap.** "Create a user with `kubectl create user`" is not possible: no such object exists. Users come from outside the cluster (a certificate, an OIDC token); only ServiceAccounts are created through the API.

<!-- section: authentication-strategies | objectives: 3.3.2 -->
## Authentication strategies

The API server can enable several authenticators at once. The first one that successfully authenticates a request ends the evaluation; the order is not guaranteed.

| Strategy | Credential | Notes |
| --- | --- | --- |
| **X.509 client certificates** | Certificate signed by a CA given to the API server (`--client-ca-file`) | Username from the `CN`, groups from each `O`. Cannot be revoked individually; groups are fixed for the certificate's lifetime |
| **Static token file** | Bearer tokens listed in a file (`--token-auth-file`) | Tokens last indefinitely; the file is only read at start-up. Not for production |
| **Bootstrap tokens** | Short tokens used by `kubeadm join` | For joining nodes, not for users |
| **ServiceAccount tokens** | Signed JSON Web Tokens (JWT) | For workloads; see the next section |
| **OpenID Connect (OIDC)** | The `id_token` (not the `access_token`) from an identity provider, sent as a bearer token | The API server validates the token signature and claims without calling the provider for each request; tokens cannot be revoked, so keep them short-lived |
| **Webhook token authentication** | Bearer token checked by a remote service | The API server POSTs a `TokenReview` to the webhook, which returns the user and groups |
| **Authenticating proxy** | Headers such as `X-Remote-User` and `X-Remote-Group` set by a front proxy | The proxy must present a client certificate trusted by the API server, otherwise anyone could forge the headers |

JWT and OIDC authenticators can also be defined in a structured `AuthenticationConfiguration` file passed with `--authentication-config` (stable since v1.34), which allows several JWT issuers; it cannot be combined with the older `--oidc-*` flags.

The Kubernetes hardening guidance recommends, for production clusters with many human users, an **external identity source such as OIDC** and as few authentication mechanisms as possible. Client certificates and ServiceAccount tokens are internal mechanisms that are not suited to managing people.

> **Exam tip.** Learn the mapping "credential → identity": certificate `CN` = username and `O` = group; OIDC `id_token` claims = username and groups (configurable claims); authenticating proxy = `X-Remote-User` header; webhook = `TokenReview` response.

<!-- section: serviceaccount-tokens | objectives: 3.3.3 -->
## ServiceAccount tokens

Every namespace has a `default` ServiceAccount, used by Pods that do not name one. It has no permissions beyond API discovery unless you grant some.

**Bound tokens (current behaviour).** The kubelet requests a token through the **TokenRequest API** and mounts it in a **projected volume** at `/var/run/secrets/kubernetes.io/serviceaccount/token`. These tokens are:

- **time-limited**: by default a token served for a TokenRequest lives one hour, and the kubelet refreshes it before it expires;
- **bound** to an object: a token bound to a Pod becomes invalid when the Pod is deleted (tokens can also be bound to a Secret or a Node);
- **audience-scoped**: the default audience is the API server; a projected token can request another audience for a third-party service.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: reporter
  namespace: shop
spec:
  serviceAccountName: reporter
  automountServiceAccountToken: false
  containers:
  - name: app
    image: registry.example.com/shop/reporter:1.0.0
    volumeMounts:
    - name: vault-token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: vault-token
    projected:
      sources:
      - serviceAccountToken:
          path: vault-token
          audience: vault
          expirationSeconds: 3600
```

Here the default API token is not mounted (`automountServiceAccountToken: false`, which can also be set on the ServiceAccount), and the Pod receives only a token for the audience `vault`. Set `automountServiceAccountToken: false` for every Pod that does not call the Kubernetes API: a token that is not there cannot be stolen.

A token for a person or a script can be requested on demand with `kubectl create token reporter --namespace shop`, which also uses the TokenRequest API and returns a short-lived token.

**Legacy Secret-based tokens.** Before v1.22, Pods received a long-lived token stored in a Secret of type `kubernetes.io/service-account-token`. These tokens never expire and are readable by anyone who can read Secrets in the namespace.

| | Bound token (TokenRequest) | Legacy Secret-based token |
| --- | --- | --- |
| Lifetime | Short (1 hour by default), rotated by the kubelet | No expiry |
| Storage | Projected volume, not an API object | Secret in etcd |
| Revocation | Expires, or invalid when the bound Pod is deleted | Only by deleting the Secret or the ServiceAccount |
| Created automatically | Yes, for each Pod that mounts a token | No longer since v1.24; can still be created manually |

Since v1.30 (stable), the control plane marks auto-generated legacy tokens that stay unused for a year as invalid (label `kubernetes.io/legacy-token-invalid-since`), then deletes them after another unused period.

> **Exam trap.** "A ServiceAccount token was copied from a running Pod; how long can the attacker use it?" With bound tokens: until it expires (about an hour) or the Pod is deleted. A legacy Secret-based token works until the Secret is deleted, which is why creating new ones is discouraged.

<!-- section: anonymous-requests | objectives: 3.3.4 -->
## Anonymous requests

When anonymous access is enabled, a request that no configured authenticator rejects (typically a request without any credential) becomes an **anonymous request**, with the username `system:anonymous` and the group `system:unauthenticated`. The API server enables anonymous access by default (when an authorization mode other than `AlwaysAllow` is used), and RBAC then decides what it may do. Default roles allow unauthenticated callers to read only basic health and version information.

Risks and controls:

- Any RoleBinding or ClusterRoleBinding to `system:anonymous`, `system:unauthenticated` or, almost as bad, `system:authenticated` hands that access to the whole network (or to every identity). Audit bindings for these subjects.
- Disable anonymous access with `--anonymous-auth=false`, or restrict it to health endpoints with the `anonymous` section of the `AuthenticationConfiguration` (stable since v1.34):

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

With this configuration, only those three paths accept anonymous requests, whatever the authorization rules say.

- The kubelet has its own anonymous setting: disable it on every node (chapter 2.4).

> **Exam trap.** Anonymous requests still go through authorization: the danger is not that anonymous access is enabled, but that something grants permissions to `system:anonymous` or `system:unauthenticated`. Combined with the `AlwaysAllow` authorization mode, anonymous access means anyone can do anything.

<!-- section: key-points -->
## Key points

- Normal users are not API objects; ServiceAccounts are. Usernames and groups from authentication feed RBAC.
- Strategies: X.509 client certificates (CN, O), static token file (avoid), bootstrap tokens (node join), ServiceAccount tokens, OIDC `id_token`, webhook `TokenReview`, authenticating proxy headers.
- Bound ServiceAccount tokens come from the TokenRequest API in a projected volume, expire (1 hour by default), rotate, and die with their Pod; legacy Secret-based tokens never expire and are no longer auto-created.
- Set `automountServiceAccountToken: false` when a Pod does not need the API.
- Anonymous requests are `system:anonymous` in `system:unauthenticated`; disable them (`--anonymous-auth=false`) or limit them to health endpoints, and never bind roles to them.
