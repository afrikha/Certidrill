# QZ-cka-41-rbac-extensions — report

File: `content/cka/quizzes/41-rbac-extensions.yaml` (10 questions, `cka-qz-41-01` to `-10`).

| # | Objective | Diff. | Type | Subject |
| --- | --- | --- | --- | --- |
| 1 | 4.1.1 | 1 | single | `roleRef` is immutable |
| 2 | 4.7.1 | 1 | single | CNI configuration directory |
| 3 | 4.8.2 | 2 | single | `kubectl api-resources --api-group` |
| 4 | 4.1.2 | 2 | multi | ClusterRole `view` bound by a RoleBinding: what `can-i` answers |
| 5 | 4.7.2 | 2 | single | NetworkPolicy not enforced by the `bridge` plugin |
| 6 | 4.7.1 | 3 | command/invocation | CSINode `spec.drivers[*].name` JSONPath |
| 7 | 4.1.2 | 3 | command/invocation | `can-i get pods --subresource=log` as a ServiceAccount (trap: `pods/log` = Pod named `log`) |
| 8 | 4.1.1 | 3 | command/object | Role on `deployments/scale` with `--resource-name` |
| 9 | 4.8.2 | 3 | manifest | Fix a CRD: name `PLURAL.GROUP`, `scope` case, one storage version |
| 10 | 4.8.1 | 3 | manifest | Operator RBAC from forbidden log lines (custom group, `backups/status`, `batch` Jobs, ClusterRoleBinding) |

Checks: `check-quiz` 0 problem(s), 0 warning(s); `check-exercise` 0 problem(s) (5 exercises).

## Unverified or partly verified facts

- **Q8 `output`**: the printed YAML of `kubectl create role ... --resource=deployments.apps/scale --resource-name=checkout` is written from memory of kubectl's code. It assumes rule keys are sorted (`resourceNames` before `resources`), verbs keep the order you typed them in, and there is one rule per API group. CI with the real kubectl should confirm it.
- **Q10 forbidden lines**: the format (`<res>.<group> "name" is forbidden: User "..." cannot <verb> resource "<res>/<sub>" in API group "..." at the cluster scope | in the namespace "..."`) follows the API server's usual message. kubernetes.io does not show it verbatim.
- **Q4**: the RBAC page says `view` is read-only on most namespaced objects and excludes Secrets. It does not list the verbs. That `view` includes `watch` on `deployments.apps` and `list` on ConfigMaps comes from the bootstrap policy as I remember it.
- **Q3 option b**: `GET /apis/<group>` returning only the APIGroup object (versions, preferred version) is from memory of the API discovery layout. I did not find it on a fetched page.
- **Q9**: the stem says "three validation errors" (name, scope enum, two storage versions). The exact API server error texts are not quoted, on purpose.

## Not in the bank

The bank exercises of 4.1.1, 4.1.2, 4.7.1, 4.7.2, 4.8.1 and 4.8.2 (24 files, `cka-4a-*`, `cka-4g-*`, `cka-4h-*`) were read. Closest one: Q10 has the same shape as `cka-4a-nodes-cluster-scope-fix` (a ServiceAccount is forbidden, so you write a ClusterRole and a ClusterRoleBinding). The fields and the trap are different: a custom API group, the status subresource, Jobs in `batch`, and three log lines to read.

## Chapter remarks

- Chapter: "a plain bridge or Flannel alone does not enforce policies". Recent Flannel releases may offer optional NetworkPolicy support (not verified). That is why Q5 uses the reference `bridge` plugin and not Flannel.
- The chapter's claim that containerd 2.x uses the section `plugins.'io.containerd.cri.v1.runtime'` was not verified (no quiz question depends on it).
- No error found in the bank exercises read.
