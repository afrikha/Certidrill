# QZ-ckad-12-multicontainer-volumes — report

File: `content/ckad/quizzes/12-multicontainer-volumes.yaml` (10 questions, English only).
Checks: `check-quiz.ts ckad 12-multicontainer-volumes` → 0 problem(s), 0 warning(s); `check-exercise.ts ckad ckad-qz-12-` → 5 exercises, 0 problem(s).

| # | Objective | Diff. | Type | Tested |
| --- | --- | --- | --- | --- |
| 1 | 1.3.3 | 1 | single | adapter pattern |
| 2 | 1.4.2 | 1 | single | ReadWriteOncePod vs ReadWriteOnce |
| 3 | 1.3.1 | 2 | single | Pod request with init containers (max of largest init vs sum of app containers) |
| 4 | 1.4.3 | 2 | single | `Released` PV with `Retain` not offered to a new claim |
| 5 | 1.3.2 | 2 | multi (choose two) | native sidecar: start ordering, probes, termination order, sidecar only in `initContainers` |
| 6 | 1.3.3 | 3 | command / invocation | `kubectl debug --copy-to` with `--image` (not `--set-image`, `--replace`, `--target` alone) |
| 7 | 1.4.1 | 3 | manifest | `secret` volume: `secretName`, `items` key → path renaming, only 2 keys, no `subPath` (rotation) |
| 8 | 1.4.3 | 3 | manifest | labelled PV + PVC `selector` + explicit class with a default StorageClass present |
| 9 | 1.3.2 | 3 | manifest | native sidecar before a regular init container, gated by a `startupProbe` |
| 10 | 1.4.2 | 3 | manifest | fix a PVC + Pod with five errors (namespace, class, access modes, volumeMode, `claimName`) |

## Facts verified (kubernetes.io, fetched 2026-11-27, docs version v1.37)

- Init Containers: Pod request = larger of largest init request and sum of app containers; `restartPolicy: Never` + failed init → Pod failed; regular init containers do not support `lifecycle` or probes.
- Sidecar Containers (stable since v1.33): next init container starts when the sidecar has `started` = true (process running with no startup probe, or `startupProbe` succeeded); readiness only feeds Pod `ready`; sidecars stopped after the app containers, in reverse order; do not block Job completion.
- Persistent Volumes: RWOP CSI only; HostPath supports RWO only; `Released` + `Retain` "not yet available for another claim"; selector `matchLabels`/`matchExpressions`, a PVC with a non-empty selector cannot be dynamically provisioned; omitted class → default class; `""` → only PVs with no class; claim and Pod in the same namespace; `volumeName` on a PV bound elsewhere stays pending.
- Volume Types / Distribute Credentials Securely Using Secrets: Secret always read-only, `subPath` mounts receive no updates, only keys listed in `items` are projected, a listed key that does not exist prevents volume creation.
- kubectl debug reference: `--share-processes` defaults to **true** with `--copy-to`; `--set-image` changes images of the copy; `--replace` deletes the original; `--target` applies to ephemeral containers.
- Ephemeral Containers: cannot be changed or removed once added.
- Blog "Kubernetes Multicontainer Pods: An Overview" (2025-04-22): adapter translates data formats/protocols; ambassador proxies network access.

## Doubts and choices

- Q6: because `--share-processes` defaults to true with `--copy-to`, the checks accept the flag absent or true and reject only an explicit `false` (regex on the parsed flags). The chapter's example passes `--share-processes` explicitly, which is harmless but redundant; the chapter does not say it is the default.
- Q9: the startup-probe check is a regex `3306` on the `startupProbe` object, so `tcpSocket.port: 3306` and an `exec` probe on 3306 both pass; a **named** port (`port: mysql` with a `containerPort` named `mysql`) would be rejected although valid. The stem says the tunnel listens on port 3306 (not only 127.0.0.1) because a `tcpSocket` probe targets the Pod IP, not localhost.
- Q8: the selector check accepts `matchLabels` with `team: finance` or a `matchExpressions` entry `key: team, operator: In, values: ["finance"]` (keys in any order); `values: [finance, other]` or `operator: Exists` would be rejected. The stem asks for "any volume" labelled for the team to exclude `volumeName` as an answer.
- Q7: solution 2 writes `defaultMode: 0400` (not checked). The checker's YAML 1.2 parser reads it as decimal 400, Kubernetes (YAML 1.1) as octal 0400; no check depends on it.
- Q10 assumes the DefaultStorageClass admission plugin is enabled (stated as "the cluster has a default StorageClass"). Size check is exact (`8Gi`) because the stem says to keep the requested size.
- Q5 uses "(Choose two.)" and no scoring NOTE: the CKAD blueprint scores `multi` all or nothing.

## Not in the practice bank

Bank exercises of 1.3.x/1.4.x (24 files in `content/ckad/questions/design/`) were read. Closest ones and the difference:
- `ckad-1c-debug-target-ephemeral` (ephemeral container with `--target`, copy forbidden) vs Q6 (copy required, `--image` vs `--set-image`, `--replace`).
- `ckad-1c-job-native-sidecar` (proxy sidecar in a Job) and `ckad-1c-init-order-deployment` (two regular init containers in order) vs Q9 (sidecar placed before a regular init container and gated by a startup probe; readiness probe as the trap).
- `ckad-1d-static-pv-prebind` (`""` class, `claimRef` + `volumeName`) and `ckad-1d-hostpath-pv` vs Q8 (label selector, class `manual` named on both sides, no pre-binding).
- `ckad-1d-configmap-subPath` (ConfigMap with `subPath` to keep other files) vs Q7 (Secret with `items` renaming and no `subPath` so rotation works).
- `ckad-1d-pvc-pod-mount` / `ckad-1d-pvc-block-device` vs Q10 (debug-and-fix of five errors on a given PV).

## Chapter / bank remarks

- Chapter §Init containers says validation rejects `lifecycle`, `livenessProbe`, `readinessProbe` and `startupProbe` on regular init containers. The Init Containers page says they "do not support" these fields and that validation enforces the `readinessProbe` prohibition; it does not state explicitly that the other three are rejected at validation (I believe the API server does reject them, but did not verify it on kubernetes.io).
- Chapter §PV binding: "with `Retain` it is not reused until an administrator cleans it" is correct; the documented procedure is to delete the PV object, clean the storage and create a new PV for the same storage asset. Not wrong, just less precise.
- No error found in the bank exercises read for these objectives (not exhaustively re-verified).
