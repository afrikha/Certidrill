Kubernetes auditing gives a chronological, security-relevant record of what happened in the cluster: who did what, to which object, when, and with what result. Every record is produced by the API server, filtered by an audit policy and written to a backend. The exam asks you to recognise the stages of an event, choose the right level for a resource, and know where audit records go and how to protect them.

<!-- section: audit-events | objectives: 3.7.1 -->
## Audit events and stages

Auditing happens **inside kube-apiserver**. Every request that reaches the API (from `kubectl`, controllers, kubelets, Pods using a ServiceAccount, or the API server itself) generates an audit event at each **stage** of its execution:

| Stage | When the event is generated |
| --- | --- |
| `RequestReceived` | As soon as the audit handler receives the request, before it is passed down the handler chain |
| `ResponseStarted` | Once the response headers are sent, before the body. Only for **long-running** requests such as `watch` |
| `ResponseComplete` | The response body is complete and no more bytes will be sent |
| `Panic` | A panic occurred while handling the request |

An event records the requesting user and groups, the verb, the resource and namespace, the source IP addresses, the timestamps, the response status and, depending on the level, the request and response bodies. Each request carries an audit ID, so the events of its different stages can be correlated.

What auditing answers in an investigation:

- **Who** made the call (user, ServiceAccount, node, impersonated identity).
- **What** was done (verb and resource, such as `create clusterrolebindings` or `get secrets`).
- **When**, from **where** (source IP), and whether it **succeeded**.

> **Exam trap.** Audit logs record calls to the **Kubernetes API**. They do not record what a process does inside a container (a shell spawned, a file read): that is runtime detection, the job of a tool such as Falco. Requests sent directly to a kubelet's API are not API server calls either, which is why the RBAC good practices warn that access to the `nodes/proxy` subresource bypasses audit logging and admission control.

<!-- section: audit-policy | objectives: 3.7.2 -->
## Audit policy and levels

The **audit policy** decides which events are recorded and how much of each. It is a file of kind `Policy` (`audit.k8s.io/v1`) passed to the API server with `--audit-policy-file`. If the flag is omitted, **no events are logged**: auditing is not on by default in a self-managed cluster. A policy with no rules is illegal.

Each rule sets a **level**:

| Level | What is recorded |
| --- | --- |
| `None` | Nothing: events matching the rule are not logged |
| `Metadata` | Request metadata only: user, timestamp, resource, verb, and so on. No request or response body |
| `Request` | Metadata and the **request body**, not the response body |
| `RequestResponse` | Metadata, request body and **response body** |

`Request` and `RequestResponse` do not apply to non-resource requests (such as `/healthz`). Rules are evaluated **in order** and the **first matching rule** sets the level of the event. A rule can match on users, groups, verbs, resources (with API group and optional `resourceNames`), namespaces and non-resource URLs. `omitStages` skips stages, at the top of the policy or per rule; skipping `RequestReceived` is common because `ResponseComplete` carries the same request plus its outcome.

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
omitStages:
  - "RequestReceived"
rules:
  # Never record Secret or ConfigMap contents
  - level: Metadata
    resources:
    - group: ""
      resources: ["secrets", "configmaps"]
  # Full detail on RBAC changes
  - level: RequestResponse
    resources:
    - group: "rbac.authorization.k8s.io"
  # Ignore noisy read-only health checks
  - level: None
    nonResourceURLs: ["/healthz*", "/readyz*", "/livez*"]
  # Everything else: metadata
  - level: Metadata
```

Choosing a level per resource:

| Requirement | Level |
| --- | --- |
| Know who read or changed a Secret, without copying its value into the log | `Metadata` |
| See exactly what was changed in a Role or a Deployment | `Request` or `RequestResponse` |
| Drop high-volume, low-value events | `None` |
| Catch-all for everything not matched earlier | `Metadata` (last rule) |

> **Exam trap.** Logging Secrets at `Request` or `RequestResponse` writes the Secret values into the audit log, which turns the log into a store of sensitive data. Secrets and token requests belong at `Metadata`. Also remember the order: a broad rule placed first wins over a specific rule placed after it.

> **Exam tip.** "Record who accessed Secrets but not their content" is `Metadata`. "Record nothing for this resource" is `None`. "No audit events at all" in a self-managed cluster usually means `--audit-policy-file` was never set.

<!-- section: audit-backends | objectives: 3.7.3 -->
## Audit backends, protection and analysis

The API server writes events to one or both **backends**:

| Backend | How it works | Main flags |
| --- | --- | --- |
| **Log** | Writes events as JSON lines to a file on the control plane host (`-` means standard output) | `--audit-log-path`, `--audit-log-maxage` (days to keep old files), `--audit-log-maxbackup` (number of files to keep), `--audit-log-maxsize` (megabytes before rotation) |
| **Webhook** | Sends events to an external HTTP API; the configuration file is a kubeconfig-like file with the endpoint and credentials | `--audit-webhook-config-file`, `--audit-webhook-initial-backoff`, `--audit-webhook-mode` |

Without `--audit-log-path` the log backend is disabled. Each backend has a mode: `blocking` is the default for the log backend, `batch` the default for the webhook (events are buffered and sent in batches), and `blocking-strict` fails the API request itself if the event cannot be recorded at the `RequestReceived` stage. When the API server runs as a static Pod, the policy file and the log directory are mounted with `hostPath` volumes so the records survive restarts.

```bash
kube-apiserver \
  --audit-policy-file=/etc/kubernetes/audit/policy.yaml \
  --audit-log-path=/var/log/kubernetes/audit/audit.log \
  --audit-log-maxage=30 \
  --audit-log-maxbackup=10 \
  --audit-log-maxsize=100
```

**Protecting audit logs.** An attacker who gains control of a control plane node will try to delete or alter the records that show what they did (repudiation). Good practices:

- Ship events **off the host** quickly, with the webhook backend or a log collector such as Fluent Bit or Fluentd, to a central store the cluster's administrators cannot rewrite.
- Restrict file permissions on the log directory and access to control plane hosts.
- Keep logs as long as your incident response and compliance requirements say; the rotation flags control only the local copy.
- On a managed Kubernetes service, the provider runs the API server: audit logs are enabled and exported through the provider's logging service.

**Analysing audit logs.** Feed events to a SIEM or a detection tool (Falco can consume Kubernetes audit events) and alert on security-relevant patterns:

- Creation of ClusterRoleBindings or RoleBindings to powerful roles, especially `cluster-admin`.
- Creation or change of `mutatingwebhookconfigurations` and `validatingwebhookconfigurations`.
- `pods/exec`, `pods/attach` and `pods/portforward` in production namespaces.
- Reads of many Secrets by one identity in a short time, `create` on `serviceaccounts/token`, approved CertificateSigningRequests.
- Requests from `system:anonymous` and repeated `403` responses (an attacker exploring permissions).

> **Exam trap.** Log rotation flags (`maxage`, `maxbackup`, `maxsize`) manage disk space on the control plane host; they are not a retention or tamper-protection strategy. The control that answers "an attacker on the control plane node deleted the audit trail" is forwarding events to external storage.

<!-- section: key-points -->
## Key points

- Audit events come from **kube-apiserver**, at the stages `RequestReceived`, `ResponseStarted` (long-running requests only), `ResponseComplete` and `Panic`.
- No `--audit-policy-file`, no audit events. Rules are evaluated in order; the **first match** wins.
- Levels: `None`, `Metadata`, `Request`, `RequestResponse`. Use `Metadata` for Secrets so values never reach the log.
- Backends: **log** (file, rotation flags) and **webhook** (external API, batch mode by default).
- Protect the trail by shipping it off the control plane, and alert on RBAC changes, webhook configurations, `exec` and bulk Secret reads.
- Audit covers API calls only: container behaviour needs runtime detection, and direct kubelet access bypasses the audit log.
