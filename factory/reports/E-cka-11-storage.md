# E-cka-11-storage — report

28 exercises in `content/cka/questions/storage/`, 4 per objective (1.1.1, 1.1.2, 1.2.1, 1.2.2, 1.2.3, 1.3.1, 1.3.2).
Mix: 12 `command` (10 invocation, 2 object) = 43 %, 16 `manifest` = 57 %. Difficulty: 4 × 1, 14 × 2, 10 × 3.

## Checks

- `npx tsx factory/check-exercise.ts cka cka-1a- cka-1b- cka-1c-`: 28 exercise(s), 0 problem(s).
- `npm run -s content:validate -- --cert cka --prefix cka-1a-` / `cka-1b-` / `cka-1c-`: 0 problem(s) each.

## Pages fetched

Storage Classes, Persistent Volumes, Volumes, Volume Types (`/docs/reference/storage/volume-types/`), StatefulSets, Change the default StorageClass, Change the Reclaim Policy of a PersistentVolume, kubectl annotate, kubectl patch, kubectl events. The long pages needed WebFetch with `offset=100000` to reach the body.

## Doubts / to verify in CI

- **Object-mode outputs** (`cka-1a-annotate-unset-default`, `cka-1c-label-pv-selector`): I wrote them as kubectl prints an unstructured object read from a file (`--local -o yaml`), with map keys sorted alphabetically and no `status`. The checks only test the annotation or labels, the kind, the name and (annotate) the provisioner, so a different key order does not change the result.
- `cka-1a-annotate-unset-default`: the stem asks for the value `false`, so removing the annotation (`…is-default-class-`), which also works on a real cluster, fails the check. I did this on purpose, because I am not sure whether kubectl prints `annotations: {}` or drops the map once the last key is removed.
- **Facts from memory that I could not find on the fetched pages:**
  - StorageClass `reclaimPolicy`, `provisioner`, `parameters` and `volumeBindingMode` cannot be updated, while `allowVolumeExpansion` can be patched in place. This is used in `cka-1a-enable-volume-expansion`, `cka-1b-storageclass-retain` and a negative of `cka-1b-patch-reclaim-retain`.
  - A StorageClass accepts only `Delete`/`Retain` (the Storage Classes page says "can be either"). I did not check whether the API rejects `Recycle` on a class, used in `cka-1a-fix-storageclass-manifest`.
  - The exact event and error texts:
    - the admission error `only dynamically provisioned pvc can be resized and the storageclass that provisions the pvc must support resize` (`cka-1a-enable-volume-expansion`);
    - `ProvisioningFailed … storageclass.storage.k8s.io "nfs-client" not found` (`cka-1c-fix-pending-claim`);
    - `WaitForFirstConsumer … waiting for first consumer to be created before binding` (`cka-1c-fix-nodename-wffc`; the same text is in the CKA chapter).
  - RWOP cannot be combined with other access modes (the check in `cka-1b-rwop-claim` requires `[ReadWriteOncePod]` exactly).
  - The StatefulSet claim name pattern `<template>-<statefulset>-<ordinal>` is not stated in the fetched part of the StatefulSets page (only "one PVC per Pod per template"). It is the well-known behaviour, and the CKA chapter uses it too. Used in `cka-1c-events-statefulset-claim` and `cka-1c-statefulset-claim-templates`.
- The StatefulSets page says that `persistentVolumeClaimRetentionPolicy` is "stable since v1.32", but still mentions enabling the `StatefulSetAutoDeletePVC` gate. I treated it as GA and on by default.
- **Regex checks on `flags`.** `kubectl patch -p` is not normalized by the parser (`flags.p` vs `flags.patch`), so the patch checks use `matches` on the serialized flags object. `cka-1b-released-pv-available` uses lookaheads: it requires `--type json` for a JSON-patch `remove`, or accepts `claimRef: null` in a merge or strategic patch. `cka-1a-enable-volume-expansion` requires `allowVolumeExpansion` at the top level of the patch (it rejects `{"spec":{…}}`).
- **`path: spec` with `matches`.** A few manifest checks run a regex on the serialized `spec` to accept equivalent layouts:
  - `cka-1c-pod-mount-claim`: `readOnly` on the mount or on the claim source;
  - `cka-1c-fix-nodename-wffc`: a nodeSelector or a node affinity on `kubernetes.io/hostname`;
  - `cka-1c-fix-pending-claim`: the selector is fixed or removed;
  - `cka-1c-statefulset-claim-templates`: `whenDeleted` is `Retain` or omitted.
- `cka-1b-list-csidrivers`: some CSI drivers do not create a CSIDriver object. The stem asks for "the API objects that describe the installed CSI drivers" to stay exact.
- `cka-1c-events-statefulset-claim` accepts `kubectl get events --field-selector involvedObject.name=…` and `kubectl events --for pvc/…`. The stem rules out `kubectl describe pvc` ("an event list, not a description").
- `busybox:1.36` and the `registry.example.com/...` images are assumed to exist or are fictitious, as in the CKAD batch.
