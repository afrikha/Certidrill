# E-ckad-12-multicontainer-volumes — report

24 exercises in `content/ckad/questions/design/`, 4 per objective (1.3.1, 1.3.2, 1.3.3, 1.4.1, 1.4.2, 1.4.3). No model exercise existed for these objectives.
Mix: 10 `command` (9 invocation, 1 object) = 42 %, 14 `manifest` = 58 %. Difficulty: 5 × 1, 12 × 2, 7 × 3.

## Checks

- `npm run -s content:validate -- --cert ckad --prefix ckad-1c-` / `ckad-1d-`: 0 problem(s).
- `npx tsx factory/check-exercise.ts ckad ckad-1c- ckad-1d-` currently **crashes before filtering** because another agent's file, `content/ckad/questions/deployment/ckad-2d-configmap-generator.yaml`, has a YAML error (line 98, an unquoted `why:` containing `": "`). The checker parses every file before it applies the filter. Run on a copy that holds only my 24 files (same script, cwd with only `content/ckad/questions/design/ckad-1[cd]-*`), it reports `24 exercise(s), 0 problem(s)`. I did not touch that file.

## Doubts / to verify in CI

- `ckad-1d-create-configmap-file` (object mode): I wrote the `output` from memory of kubectl's YAML printer. I expect a multi-line value with a final newline to print as a literal block (`nginx.conf: |`) and keep the 4-space indentation inside the block. The checks only test the key, a substring and the key count, so a different quoting style would not change the result.
- `kubectl patch` is not in the brief's list of invocation verbs. I used invocation mode for `ckad-1d-expand-pvc` and `ckad-1d-pv-reclaim-retain`. The short `-p` of `patch` is not normalized by the parser (it stays `flags.p`, while `--patch` gives `flags.patch`). For that reason the patch-content check uses `path: flags` with a `matches` regex on the serialized flags object, which accepts `-p`, `--patch`, merge and JSON patches.
- `ckad-1d-static-pv-prebind` uses a negative-lookahead regex on the serialized PV `spec` to accept both an omitted and an empty `storageClassName` ("no class").
- `ckad-1d-emptydir-memory` negative: I did not verify whether the API server rejects `medium: memory` (lower case) or only the kubelet fails on it. The `why` says only that the value is case-sensitive, and the same negative also uses `256M`.
- `ckad-1c-ambassador-localhost` cites the 2015 kubernetes.io blog post "The Distributed System ToolKit: Patterns for Composite Containers". It is the only kubernetes.io page I found that names the ambassador and adapter patterns.
- `busybox:1.36` is used as a debug/init image (tag assumed to exist on Docker Hub; not checked).
- Pages fetched: Sidecar Containers, Init Containers, Volumes, Volume Types (`/docs/reference/storage/volume-types/`, where the per-type details now live), Persistent Volumes, Projected Volumes, Configure a Pod to Use a PersistentVolume for Storage, Change the Reclaim Policy of a PersistentVolume, Debug Running Pods, Get a Shell to a Running Container, Pods, kubectl logs, kubectl create configmap, JSONPath Support, Communicate Between Containers in the Same Pod Using a Shared Volume (title only; the body was cut off).
