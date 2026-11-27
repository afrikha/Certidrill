# C-cka-3 — doubts and deviations

Chapters: `31-deployments-config-autoscaling.en.md`, `32-self-healing-scheduling.en.md` (English only). Both validators: 0 problem(s).

Sources: kubernetes.io pages read from their source files in `github.com/kubernetes/website` (main branch = v1.37 docs; kubernetes.io itself was blocked by the proxy for curl and WebFetch returned only navigation): Deployment, ReplicaSet, StatefulSet, DaemonSet, update-daemon-set, pod-lifecycle, probes, configure probes, ConfigMap, Secret, configure-pod-configmap, managing secrets (kubectl, config file), HPA concept and walkthrough, disruptions, configure-pdb, topology spread, assign-pod-node, taints and tolerations, pod priority and preemption, manage resources, pod QoS, LimitRange, ResourceQuota, memory-default-namespace, cpu-constraint-namespace, quota-memory-cpu-namespace, feature gates HPAConfigurableTolerance (stable 1.37) and HPAScaleToZero (beta 1.37); kubectl references autoscale, create deployment/configmap/secret generic/tls/docker-registry/pdb/priorityclass/quota, rollout undo/history/restart/status, set image/env/resources, scale, taint. `kubectl set env --from` behaviour checked in the kubectl source (`pkg/cmd/set/set_env.go`): one `configMapKeyRef`/`secretKeyRef` entry per existing key.

Notes and doubts:

- `kubectl autoscale` v1.37 reference documents `--cpu` and `--memory` (percentage = utilization, quantity = average value). `--cpu-percent` is no longer listed; the chapter does not mention it. Exercises or older material using `--cpu-percent` should be checked.
- Rollback renumbering (the restored template gets a new revision number) is stated from "Each rollback updates the revision of the Deployment" plus general knowledge.
- API rejection of a `rollingUpdate` block with `type: Recreate`, and the patch with `"rollingUpdate":null`: general knowledge (apps validation), not quoted on a fetched page.
- `rollout restart` works by changing a Pod template annotation: general knowledge (annotation name not given).
- Missing ConfigMap/Secret symptoms (`CreateContainerConfigError` for env, `ContainerCreating` for volumes), the HPA `<unknown>` TARGETS display and the "missing request" event, OOMKilled exit code 137, the ReplicaSet `FailedCreate` event on quota rejection, and the drain message "Cannot evict pod as it would violate the pod's disruption budget": general knowledge.
- StatefulSet `rollingUpdate.partition` default 0: general knowledge (API reference not fetched).
- Scale-up stabilization: only the scale-down rule ("highest recommendation of the window") is stated, as on the page.
