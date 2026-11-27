# QZ-cka-11-storage — report

File: `content/cka/quizzes/11-storage.yaml` (10 questions, `cka-qz-11-01` to `-10`). Checks: `check-quiz` 0 problem(s), 0 warning(s); `check-exercise` 0 problem(s) (2 command/invocation, 3 manifest).

| # | Objective | Type | Tests |
| --- | --- | --- | --- |
| 1 | 1.1.1 | single | StorageClass defaults (Delete, Immediate) |
| 2 | 1.2.1 | single | RWO allows several Pods on one node |
| 3 | 1.3.1 | multi | Static binding criteria (size, modes, default class, selector, volumeMode) |
| 4 | 1.2.2 | single | Manual PV defaults to Retain; Released PV not rebound to a same-name claim |
| 5 | 1.2.3 | single | Class for local PVs (no-provisioner + WaitForFirstConsumer) |
| 6 | 1.1.1 | command | Immutable class field: `kubectl replace --force -f` (or `apply --force`) |
| 7 | 1.2.2 | command | Claim stuck Terminating (pvc-protection, Used By): delete the owning Deployment |
| 8 | 1.2.3 | manifest | DaemonSet with hostPath `Socket` and `DirectoryOrCreate` (FileOrCreate parent trap) |
| 9 | 1.1.2 | manifest | Claim provisioned by whatever default class (omit vs `""`), RWX, Deployment mount |
| 10 | 1.3.2 | manifest | Fix a StatefulSet: no class and no default; container mounts an emptyDir instead of the claim template |

None of the bank exercises for 1.1.1–1.3.2 is repeated (no PVC expansion, default-class patch, claimRef, selector labelling, RWOP or retention-policy task).

## Chapter errors

- `11-storage.en.md`, section "Reclaim policies", Exam trap: "Changing the StorageClass `reclaimPolicy` does not change PVs already provisioned." This implies the class's `reclaimPolicy` can be changed. It can't: `provisioner`, `parameters`, `reclaimPolicy` and `volumeBindingMode` are immutable (`+k8s:immutable` in `k8s.io/api/storage/v1/types.go`). You have to delete the class and create it again, or use `kubectl replace --force`. Suggested rewording: "The `reclaimPolicy` of a StorageClass can't be updated, and recreating the class doesn't change PVs already provisioned: patch each PV." The section "StorageClasses and the default class" also names only provisioner and parameters as needing delete and recreate. Reclaim policy and binding mode need it too. The bank (`cka-1b-storageclass-retain`, `cka-1b-patch-reclaim-retain`) is correct.

## Facts checked in code, not stated on kubernetes.io

- Q6: `kubectl apply --force` deletes and recreates the object when the patch fails with Conflict **or Invalid**: `pkg/cmd/apply/patcher.go` in kubernetes/kubectl (master). The kubernetes.io flag text only says "immediately remove resources from API and bypass graceful deletion". The answer accepts it as a solution. The stem shows no exact API error text, because the message of declarative immutability validation in v1.37 wasn't checked.
- Q7: kubectl describe pvc prints a `Used By:` line. This comes from kubectl describe; the kubernetes.io example output elides it. The new Pod a ReplicaSet creates isn't scheduled on a terminating claim, so the pvc-protection controller ignores it. This is from memory of the controller and is only used in a negative's `why`.
- Q10: the event text `no persistent volumes available for this claim and no storage class is set` (Normal, FailedBinding) is the PV controller's message, from memory of `pv_controller.go`. The page for update restrictions on `volumeClaimTemplates` wasn't fetched; the explanation says claim templates can't be edited on an existing StatefulSet, which is the GA behaviour.
- Q5 (option c): a claim with `storageClassName: ""` is never delay-bound. This is from memory of the PV controller helper.

## Doubts

- Q2: a single-choice question on RWO is the inverse of bank exercise `cka-1b-rwop-claim`, which asks for RWOP. The decision and the answer differ.
- Q9 accepts a claim that lists RWX plus other modes (`contains`); the default NFS class is stated to support RWX.
