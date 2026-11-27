# E-cka-31-deployments-config-autoscaling — report

24 exercises in `content/cka/questions/workloads/` (4 per objective 3.1.1, 3.1.2, 3.2.1, 3.2.2, 3.3.1, 3.3.2).
Mix: 11 `command` (5 object, 6 invocation) / 13 `manifest`; difficulty 4 × 1, 12 × 2, 8 × 3.
Checks: `check-exercise.ts` 0 problem(s); `content:validate` 0 problem(s) for `cka-3a-`, `cka-3b-`, `cka-3c-`.

## Doubts and points for review

- **kubectl not available locally**: object-mode `output` blocks (annotate, create configmap/secret, set resources) were written by hand from the CKAD models' conventions (typed objects after `set resources` print `strategy: {}`, `status: {}`; `annotate` on a file keeps the unstructured, key-sorted object). CI should confirm them.
- **`kubectl autoscale --cpu-percent`**: deprecated in kubectl v1.34 (PR #129373, replaced by `--cpu`/`--memory`); the v1.37 reference page no longer lists it. It may still work as a hidden flag, so `cka-3c-autoscale-cpu-utilization` tells the candidate to use the current flag; the check is on `flags.cpu`.
- **`--cpu` bare numbers**: per the v1.37 reference, a value without unit is millicores (`500` = `500m`) and a memory value without unit is MiB; `cka-3c-autoscale-average-values` accepts `500`/`500m` and `200`/`200Mi`.
- **`defaultMode: 0400`** (`cka-3b-config-and-tls-volumes`): the checker's YAML parser is YAML 1.2 and reads `0400` as decimal 400, while Kubernetes (YAML 1.1) reads it as octal 256. The check accepts `oneOf [256, 400]`; the app should parse manifests with YAML 1.1 octal semantics, or keep this tolerance.
- **HPA `tolerance`**: kubernetes.io marks it stable in v1.37 (feature gate `HPAConfigurableTolerance` locked); used in `cka-3c-scaleup-policies-tolerance`, checked with `quantity` (`0.05` = `50m`).
- **Event and condition texts** quoted in stems were not found verbatim on kubernetes.io; they follow the controller/kubelet messages as I know them: `Progressing Unknown DeploymentPaused`, `couldn't find key db-host in ConfigMap payments/billing-config`, `failed to get cpu utilization: missing request for cpu in container log-agent of Pod …`, APIService `False (MissingEndpoints)`. Output columns of `kubectl get` are trimmed (no AGE).
- `cka-3b-envfrom-prefix-secretkeyref` uses `envFrom[].prefix` (core API field, not shown on the fetched task pages).
- Chapter `31-deployments-config-autoscaling.en.md` did not exist yet; nothing to align with.
