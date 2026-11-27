# E-ckad-extra-design-deployment — report

12 new exercises, one per objective. 5 `command` (4 invocation, 1 object) and 7 `manifest`. Difficulty: 1 × 1, 6 × 2, 5 × 3.

| Objective | Exercise | New task or trap |
| --- | --- | --- |
| 1.2.1 | `ckad-1b-replace-force-pod` | `kubectl replace --force -f` to re-create a Pod whose immutable fields were edited |
| 1.2.3 | `ckad-1b-job-backoff-per-index` | `backoffLimitPerIndex` + `maxFailedIndexes` (Indexed Job) vs global `backoffLimit` |
| 1.2.4 | `ckad-1b-suspend-cronjob-patch` | Suspend an existing CronJob with `kubectl patch` (not `jobTemplate.spec.suspend`, not delete) |
| 1.3.2 | `ckad-1c-tls-proxy-sidecar-port` | Native sidecar with a readiness probe; Service `targetPort` must be the sidecar's port, because the app binds to localhost only |
| 1.4.1 | `ckad-1d-downward-resource-limits` | downwardAPI `resourceFieldRef`: `containerName` required in volumes, `divisor` 1m / 1Mi |
| 1.4.2 | `ckad-1d-generic-ephemeral-scratch` | Generic ephemeral volume (`ephemeral.volumeClaimTemplate`) per Pod in a Deployment |
| 2.1.2 | `ckad-2a-canary-even-split-scale` | One `kubectl scale` on two Deployments to reach 50/50 with a fixed total |
| 2.2.1 | `ckad-2b-set-image-init-container` | `set image` with two pairs, one of them an init container, in one rollout |
| 2.2.2 | `ckad-2b-rolling-percent-rounding` | Percentages: maxSurge rounds up, maxUnavailable rounds down (8 replicas) |
| 2.2.4 | `ckad-2b-hpa-scaleup-policy-no-scaledown` | HPA `behavior`: Pods scale-up policy and `scaleDown.selectPolicy: Disabled` |
| 2.3.2 | `ckad-2c-install-set-string-schema` | `--set` types integers, so a values schema that requires a string fails; use `--set-string`, `--set-literal` or `--set-json` |
| 2.4.3 | `ckad-2d-patch-delete-sidecar` | Strategic merge `$patch: delete` to remove a container by name in an overlay |

Checks: `check-exercise.ts ckad` → 328 exercises, 0 problem(s). `content:validate --cert ckad` → 0 problem(s), plus 20 warnings that were already there (reference hosts), none from these files.

## Doubts and deviations

- **Objective fit, 1.4.2.** A generic ephemeral volume is a PVC spec embedded in the Pod, so I filed it under 1.4.2 (claim fields `storageClassName`, `accessModes`, `resources.requests.storage`). Objective 1.4.1's list of ephemeral volumes does not name it. Re-file it if 1.4.1 fits better.
- **Objective fit, 1.2.1.** `kubectl replace --force` is "creating Pods declaratively" only in a broad sense. The trap (immutable Pod fields) is in chapter 11, section 1.1.3.
- **`ckad-2b-set-image-init-container` output** was written by hand, like every object-mode output (no kubectl here). I assumed that `set image --local` on the typed Deployment prints `strategy: {}`, `resources: {}` on each container **and init container**, `status: {}`, with `containers` before `initContainers` (alphabetical). No check depends on these defaults. I checked in the kubectl source (`pkg/cmd/set/set_image.go`) that `set image` handles `initContainers` and that `*` matches them. The kubernetes.io reference page does not mention init containers.
- **HPA policies replace the defaults.** The HPA page only says that custom values are "merged with default values". I relied on the upstream defaulting (a `policies` list you provide replaces the default list) for "one Pods policy = at most 3 Pods per 60 s". I did not verify this in the source this session.
- **`backoffLimitPerIndex` with `restartPolicy: OnFailure`.** The Jobs page marks `restartPolicy: Never` as "required for the feature" in its example, but it does not say whether validation rejects OnFailure. The negative's `why` only says that the task and the feature require Never. The same applies to "per-index fields need `completionMode: Indexed`": I believe validation rejects them otherwise, and the `why` avoids stating the exact error.
- **Downward API CPU rounding.** The negative says that with divisor `1`, a 500m limit is written as `1` (rounded up). This matches the upstream conversion (ceiling), but the docs do not state it.
- **`$patch: delete` source.** kubernetes.io does not document the directive. The reference is the Kubernetes community document on strategic merge patch (github.com, an allowed host). I read it through raw.githubusercontent.com because the github.com page refused the fetch (robots).
- **Sidecar ports.** The Sidecar Containers page does not say whether a native sidecar may declare `ports`. Istio's native-sidecar mode does it, so one solution declares `containerPort: 8443`, and the explanation calls it optional. No check needs it.
- **Helm `--set-json` / `--set-literal`** are accepted as alternatives to `--set-string`, from the helm.sh install page (Helm 4.3.1). The parser's JSON of `flags` is matched by a regex. A comma-joined `--set-string a=b,image.tag=20261127` passes, but a repeated `--set-json` array whose earlier values contain quotes would not.
- **Parser note.** `kubectl scale deploy/a deploy/b` gives `names: ["a"]` only (later `type/name` arguments are dropped from `names`), so `ckad-2a-canary-even-split-scale` checks `args` with regexes instead of `names`.
