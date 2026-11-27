# E-cka-32-self-healing-scheduling — report

20 exercises in `content/cka/questions/workloads/`, 4 per objective (3.4.1, 3.4.2, 3.5.1, 3.5.2, 3.5.3). The mix is 9 `command` (4 object, 5 invocation) and 11 `manifest`. Difficulty: 3 × 1, 10 × 2, 7 × 3. Both checks report `0 problem(s)`: `check-exercise.ts cka cka-3d- cka-3e-` and `content:validate` with `--prefix cka-3d-` and with `--prefix cka-3e-`. I did not read the chapter `32-self-healing-scheduling.en.md`, which did not exist yet. Facts come from kubernetes.io pages fetched on 2026-11-27.

## kubectl outputs to confirm in CI (object mode)

- `cka-3d-create-pdb-max-unavailable`: I wrote the `kubectl create pdb … --dry-run=client -o yaml` output with `maxUnavailable: 1` as an integer, because the flag value goes through `intstr.Parse`. I also included a `status` block with `currentHealthy`, `desiredHealthy`, `disruptionsAllowed` and `expectedPods` at 0, because these status fields are not `omitempty` in policy/v1. Both points come from my memory of the code, not from the docs. No check reads `status`.
- `cka-3e-create-priorityclass-nonpreempting`: I assumed that the output always carries `preemptionPolicy` (the flag's default is `PreemptLowerPriority`) and leaves out `globalDefault` when it is false (`omitempty`). Solution 2 uses the alias `kubectl create pc`, which I believe exists for `create priorityclass`. The reference page does not show the alias.
- `cka-3e-label-node-overwrite`: the solutions run `kubectl label` on a minimal Node given in `worker-2.yaml`. I wrote the output as the unstructured object with sorted keys and no `status`. Negative 1 (no `--overwrite`) makes kubectl exit with an error. Its `output` is the unchanged Node, which stands for "no change". If CI runs negatives through kubectl, this one needs special handling.
- `cka-3e-set-resources-limitrange-max`: same output conventions as the CKAD `set resources` exercises (`strategy: {}`, `status: {}`, quantities in canonical form: `1000m` → `"1"`, `1024Mi` → `1Gi`).

## Facts taken from memory rather than quoted from the docs

- Topology spread, second negative: I assumed that a constraint without `labelSelector` matches no Pods (a nil selector is `labels.Nothing()` in the scheduler). The concept page does not say so.
- LimitRange negatives: I did not verify on kubernetes.io the validation errors for `default`/`defaultRequest` on an item of `type: Pod`, or for a `defaultRequest` above `default`. Each negative also fails a check for its main mistake.
- The LimitRanger message in `cka-3e-set-resources-limitrange-max` (`maximum cpu usage per Container is 1, but limit is 2`) follows the admission plugin's format, which I recalled from memory.
- `cka-3e-kubelet-reserved-allocatable`: in the config file, `evictionHard` values are written without `<`, as in the page examples. The node-pressure eviction page names the setting `MergeDefaultEvictionSettings`. I wrote `mergeDefaultEvictionSettings` (camelCase) in one `why`; I did not verify that spelling against the KubeletConfiguration reference.

## Design choices

- I did not check toleration `operator` values where `Equal` with an empty value is equivalent to `Exists` (the built-in taints and the control-plane taint have no value). Accepted variants are listed with `oneOf`.
- No exercise tests `nodeName`; 3.5.1 covers nodeSelector, node affinity, Pod anti-affinity and placement checks instead.
