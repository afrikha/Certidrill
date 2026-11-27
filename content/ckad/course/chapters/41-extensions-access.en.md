Every request to the API server goes through **authentication** (who are you), **authorization** (may you do this, usually RBAC) and **admission control** (does the object meet the cluster's rules), and it targets resources that may be built in or added by a CustomResourceDefinition. CKAD tasks in this area are practical: find a custom resource and create an instance of it, switch context or namespace, grant a ServiceAccount the right to read Pods and prove it with `kubectl auth can-i`, and explain why a Pod was rejected by Pod Security Admission, a ResourceQuota or a LimitRange.

<!-- section: crds | objectives: 4.1.1 -->
## Discovering CRDs and custom resources

A **CustomResourceDefinition** (CRD) adds a new resource type to the API. Its name is always `<plural>.<group>`, and it declares the group, the versions (one `storage: true`, each `served` or not), the scope (`Namespaced` or `Cluster`), the names and the OpenAPI v3 schema.

```bash
kubectl get crd                                           # NAME = <plural>.<group>
kubectl get crd crontabs.stable.example.com -o yaml       # group, versions, scope, names, schema
kubectl api-resources --api-group=stable.example.com      # NAME, SHORTNAMES, APIVERSION, NAMESPACED, KIND
kubectl api-resources --namespaced=false                  # cluster-scoped types only
kubectl explain crontab                                   # GROUP, KIND, VERSION, then fields
kubectl explain crontab.spec --recursive
kubectl get crontabs -n batch-jobs                        # plural, singular or short name
kubectl get ct -A
kubectl get crontabs.stable.example.com my-cron -n batch-jobs -o yaml
```

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: crontabs.stable.example.com
spec:
  group: stable.example.com
  scope: Namespaced
  names:
    plural: crontabs
    singular: crontab
    kind: CronTab
    shortNames: ["ct"]
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              cronSpec: {type: string}
              image: {type: string}
              replicas: {type: integer}
```

| Task asks for | Command or field |
| --- | --- |
| Which CRDs are installed | `kubectl get crd` |
| The kind, short name and apiVersion of a custom type | `kubectl api-resources --api-group=<group>` |
| The fields a custom resource accepts | `kubectl explain <kind>.spec`, or the CRD's `openAPIV3Schema` |
| Whether the type is namespaced | `NAMESPACED` column, or CRD `spec.scope` |
| The objects of that type | `kubectl get <plural>` with `-n` or `-A` |
| Two types with the same short name | The full name `<plural>.<group>` |

> **Exam trap.** `kubectl get all` lists only types in the `all` category: custom resources are absent unless their CRD adds `categories: ["all"]`. Query the type by name. And deleting a CRD deletes **every** custom object of that type.

<!-- section: custom-resources | objectives: 4.1.2 -->
## Creating custom resources and what an Operator does

There is no `kubectl create` generator for a custom type: write a manifest. `apiVersion` is `<group>/<version>` of a served version, `kind` is `names.kind`, and the fields follow the schema.

```yaml
apiVersion: stable.example.com/v1
kind: CronTab
metadata:
  name: nightly-report
  namespace: batch-jobs
spec:
  cronSpec: "0 2 * * *"
  image: registry.example.com/reports/nightly:2.1
  replicas: 1
```

```bash
kubectl apply -f nightly-report.yaml
kubectl get ct nightly-report -n batch-jobs -o yaml
kubectl edit crontab nightly-report -n batch-jobs
kubectl delete crontab nightly-report -n batch-jobs
```

kubectl validates fields strictly by default (`--validate=strict`): an unknown field or a wrong type in `spec` is an error, not silently ignored.

A CRD alone only **stores** objects. An **Operator** adds a controller, usually running as a Deployment, that watches those objects and reconciles the cluster towards them: for a database custom resource it may create a StatefulSet, PersistentVolumeClaims, Services and backup Jobs, upgrade the version, and clean up when the resource is deleted. You use an Operator by creating, editing and deleting its custom resources, then watching the objects it creates.

```bash
kubectl get deploy -n db-operator                         # the controller
kubectl get postgresclusters -n payments                  # the custom resources it manages
kubectl get statefulsets,svc,pvc -n payments              # what it created
kubectl logs -n db-operator deploy/db-operator            # why it did or did not act
```

| Term | Role |
| --- | --- |
| CustomResourceDefinition | Defines a new API type (schema, names, scope) |
| Custom resource | One object of that type: the desired state |
| Controller | Loop that compares desired and actual state and acts |
| Operator | CRDs plus a controller that encodes how to run one application |

> **Exam trap.** `apiVersion: apiextensions.k8s.io/v1` is for the **CRD** itself. A custom resource uses the CRD's own group and version, such as `stable.example.com/v1`; copying the CRD's apiVersion is a classic error.

<!-- section: contexts | objectives: 4.2.1 -->
## kubeconfig contexts and namespaces

A **context** groups a cluster, a user and an optional namespace. kubectl reads `$HOME/.kube/config`, or the files listed in `KUBECONFIG` (merged, colon-separated on Linux), or only the file given with `--kubeconfig`.

```bash
kubectl config get-contexts                               # current one marked with *
kubectl config current-context
kubectl config use-context dev-cluster
kubectl config set-context --current --namespace=shop     # default namespace of the current context
kubectl config view --minify                              # only the current context
kubectl config view --minify -o jsonpath='{..namespace}'
kubectl get pods --context=prod-cluster -n payments       # one command, other context
```

| Task asks for | Command |
| --- | --- |
| Switch cluster or user | `kubectl config use-context <name>` |
| Work in a namespace for the next commands | `kubectl config set-context --current --namespace=<ns>` |
| One command in another namespace | `-n <ns>` |
| Write the list of context names to a file | `kubectl config get-contexts -o name > /opt/answers/contexts.txt` |
| See which namespace is the default | `kubectl config view --minify` |

> **Exam trap.** `kubectl config set-context --current --namespace=shop` changes the kubeconfig; `use-context` switches contexts and does **not** take a namespace. Without either, commands run in the context's namespace, usually `default`, and the grader looks in the namespace the task names.

<!-- section: rbac | objectives: 4.2.2 -->
## Granting access with Role and RoleBinding

A **Role** lists allowed verbs on resources in one namespace; a **ClusterRole** does the same cluster-wide. A **RoleBinding** grants a Role, or a ClusterRole limited to the binding's namespace, to subjects: users, groups or ServiceAccounts.

```bash
kubectl create role pod-reader -n shop --verb=get,list,watch --resource=pods
kubectl create role deployer -n shop --verb=get,list,create,update,patch --resource=deployments,replicasets
kubectl create role log-reader -n shop --verb=get --resource=pods,pods/log
kubectl create rolebinding pod-reader-binding -n shop --role=pod-reader --serviceaccount=shop:monitor
kubectl create rolebinding dev-view -n shop --clusterrole=view --user=jane --group=developers
kubectl create role pod-reader -n shop --verb=get,list --resource=pods --dry-run=client -o yaml > role.yaml
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: shop
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: shop
subjects:
- kind: ServiceAccount
  name: monitor
  namespace: shop
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

Test with impersonation; the answer is `yes` or `no`:

```bash
kubectl auth can-i list pods -n shop --as=system:serviceaccount:shop:monitor
kubectl auth can-i delete pods -n shop --as=system:serviceaccount:shop:monitor
kubectl auth can-i get pods --subresource=log -n shop --as=jane
kubectl auth can-i --list -n shop --as=system:serviceaccount:shop:monitor
```

| Requirement | Answer |
| --- | --- |
| Rights in one namespace | Role + RoleBinding |
| Same rights reused in many namespaces | One ClusterRole + a RoleBinding in each namespace |
| Rights on cluster-scoped resources or all namespaces | ClusterRole + ClusterRoleBinding |
| Read logs | `pods/log` subresource with `get` |
| Deployments, Jobs, other groups | `apiGroups: ["apps"]`, `["batch"]`; `kubectl create role` fills the group from `--resource` |
| Change the role of a binding | Delete and recreate it: `roleRef` is immutable |

> **Exam trap.** A ServiceAccount is `--serviceaccount=<namespace>:<name>` in `create rolebinding`, but `system:serviceaccount:<namespace>:<name>` in `--as`. A ServiceAccount subject in YAML needs its `namespace` and no `apiGroup`. Rules in `apiGroups: [""]` (core) never match `deployments`.

<!-- section: admission | objectives: 4.2.3 -->
## Recognizing admission control effects

Admission controllers run after authorization. Mutating ones change the object (LimitRanger adds default resources), validating ones accept or reject it (PodSecurity, ResourceQuota). A rejection is `403 Forbidden` with a message naming the rule.

**Pod Security Admission** is driven by namespace labels `pod-security.kubernetes.io/<mode>: <level>`; mode `enforce` rejects, `audit` records in the audit log, `warn` returns a warning; levels are `privileged`, `baseline`, `restricted`.

```bash
kubectl get ns shop --show-labels
kubectl label --overwrite ns shop pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/enforce-version=v1.37
kubectl label --dry-run=server --overwrite ns shop pod-security.kubernetes.io/enforce=restricted   # warns about existing Pods
```

A Pod that passes `restricted` sets these fields on each container (`runAsNonRoot` and `seccompProfile` may sit at Pod level instead):

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

**ResourceQuota** caps totals in a namespace; **LimitRange** sets defaults and min/max per container. Both act only on new or updated objects.

```bash
kubectl describe quota -n shop                            # Used / Hard per resource
kubectl describe limitrange -n shop                       # Default Request, Default Limit, Min, Max
kubectl describe rs -n shop -l app=web                    # FailedCreate events with the reason
kubectl events -n shop --types=Warning
```

| Message or symptom | Cause | Fix |
| --- | --- | --- |
| `violates PodSecurity "restricted:latest": allowPrivilegeEscalation != false ...` | Namespace enforces `restricted` | Add the securityContext fields listed |
| `Warning: would violate PodSecurity ...`, object created | `warn` mode only | Nothing blocks; fix to be safe |
| `exceeded quota: compute, requested: requests.cpu=..., used: ..., limited: ...` | ResourceQuota full | Lower requests, or raise the quota if the task allows |
| `failed quota: ... must specify limits.memory` (or requests) | Compute quota and no value on the container | Set requests and limits, or add a LimitRange with defaults |
| `maximum memory usage per Container is ..., but limit is ...` | LimitRange `max` exceeded | Lower the limit to the range |
| Deployment `READY 0/3`, no Pods | Pods rejected at admission | Read the ReplicaSet events |

> **Exam trap.** `enforce` applies to **Pods**, not to Deployments: the Deployment is created, warnings may appear, and the rejection shows only as `FailedCreate` on the ReplicaSet. Likewise a full quota does not stop a Deployment from being created; its Pods are refused.

<!-- section: key-points -->
## Key points

- CRD name `<plural>.<group>`; discover with `get crd`, `api-resources --api-group`, `explain`; custom objects need their own `apiVersion` and `kind`.
- An Operator is CRDs plus a controller that reconciles them; you drive it by editing custom resources.
- `use-context` switches; `set-context --current --namespace` sets the default namespace.
- `create role --verb --resource`, `create rolebinding --role|--clusterrole --user|--group|--serviceaccount=ns:name`; test with `auth can-i --as=system:serviceaccount:ns:name`.
- Pod Security labels: `enforce` rejects Pods, `warn` and `audit` do not; `restricted` needs non-root, no privilege escalation, `drop: ["ALL"]`, `RuntimeDefault` seccomp.
- Quota and LimitRange rejections are `403 Forbidden`; for workloads, read ReplicaSet events.
