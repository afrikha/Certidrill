# QZ-ckad-41-extensions-access — report

File: `content/ckad/quizzes/41-extensions-access.yaml` (10 questions, English only).

| # | Objective | Diff. | Type | What it tests |
| --- | --- | --- | --- | --- |
| 1 | 4.1.1 | 1 | single | `get all` misses custom resources (category `all`) |
| 2 | 4.2.3 | 1 | single | PSA `warn` mode admits the Pod and warns |
| 3 | 4.2.1 | 2 | single | a context's namespace is per context entry (`set-context --current` then `use-context`) |
| 4 | 4.2.2 | 2 | single | `apiGroups: [""]` never matches `deployments` |
| 5 | 4.1.2 | 2 | multi | what the Operator's controller does / CRD deletion deletes objects |
| 6 | 4.1.1 | 3 | command (invocation) | `api-resources --api-group --namespaced=false -o name` |
| 7 | 4.2.1 | 3 | command (invocation) | one command with `--kubeconfig` + `--context` + `-n` |
| 8 | 4.2.2 | 3 | command (invocation) | `auth can-i get pods --subresource=log` (trap: `pods/log` = Pod named log) |
| 9 | 4.1.2 | 3 | manifest | edit a custom object's `spec` (not `status`, not the owned StatefulSet), cron field order |
| 10 | 4.2.3 | 3 | manifest | Deployment rejected by PSA `enforce: baseline` (hostNetwork, privileged), then by a quota on `limits.memory` |

Bank overlap checked against the 20 exercises of 4.1.x / 4.2.x in `content/ckad/questions/environment/`: no exercise repeats a bank task. Q6 shares the `--api-group` flag with `ckad-4a-api-resources-group` but tests the scope filter and `-o name`; Q8 uses `auth can-i --as` like `ckad-4b-auth-can-i-sa` but on a same-namespace ServiceAccount, testing the subresource instead of the cross-namespace identity.

## Unverified facts / doubts

- **Q10 FailedCreate message.** The wording `violates PodSecurity "baseline:latest": host namespaces (hostNetwork=true), privileged (container "api" must not set securityContext.privileged=true)` follows the format of the PSA messages shown on kubernetes.io (the restricted ones), but the exact baseline wording for host namespaces and privileged is not on a fetched page. The `pods "api-5f7d9c6b8-"` generateName prefix in the event is also from memory.
- **Q10 quota rejection order.** I assumed PodSecurity rejects before ResourceQuota (ResourceQuota is normally the last validating admission plugin), so the quota error appears only after the PSA fix; the stem does not show the quota error and asks the candidate to anticipate it. The resource-quotas page confirms that every new Pod must set a limit for a tracked `limits.memory`.
- **Q8 `--subresource` value.** The kubectl reference describes the flag as "SubResource such as pod/log or deployment/scale", but its own example is `kubectl auth can-i get pods --subresource=log`. I used `log` (the subresource name in SubjectAccessReview) and did not use `--subresource=pod/log` as a negative because the flag description is ambiguous. Worth confirming with real kubectl in CI.
- **Q8 negative `pods/log`.** Based on the documented synopsis `VERB [TYPE | TYPE/NAME | NONRESOURCEURL]`: `pods/log` is read as the Pod named `log`. Not run on a cluster.
- **Q7 negative `--cluster=prod-us`.** It is wrong because it does not select the context (and so the user); if the file happened to have a cluster entry named `prod-us`, the command might still reach that cluster with the prod-eu user. The stem does not name the cluster entries, so the negative stays wrong for the task as stated, but the `why` is a little simplified.
- **Q9 negative with `backup` at the top level.** kubectl's client-side validation rejects unknown fields (CRD page); with `--validate=false` the field would be pruned. Either way no backup is configured.
- **Q9 cron check** accepts `30 2 * * *` and `30 02 * * *` only; other valid spellings for the same time (for example `30 2 * * 0-6`) would be rejected. Rare enough to accept.
- **Q10 regex checks** (`^(?!.*"hostNetwork":true)`) rely on `matches` testing `JSON.stringify` of the object, so `hostNetwork: false` and a removed field both pass.

## Chapter / bank issues found

- None blocking. The chapter shows `api-resources --namespaced=false` and `auth can-i ... --subresource=log` in its code blocks, but not `api-resources -o name` (it shows `-o name` only for `config get-contexts`); Q6 relies on the kubectl reference for it.

## References fetched

kubernetes.io: Extend the Kubernetes API with CustomResourceDefinitions; Operator pattern; Pod Security Admission; Pod Security Standards; Resource Quotas; Organizing Cluster Access Using kubeconfig Files; kubectl config set-context; Using RBAC Authorization; kubectl auth can-i; kubectl api-resources; tutorial Apply Pod Security Standards at the Cluster Level (warning format).
