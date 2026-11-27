Storage is 10 % of the exam, and its tasks are among the quickest points to earn if you know the fields by heart: create a StorageClass or change the default one, write a PersistentVolume and a claim that bind, mount the claim in a Pod or a StatefulSet, expand it, and explain why a claim stays `Pending` or a volume stays `Released`. There is no imperative `kubectl create` for these objects: you write YAML, so copy the examples from the kubernetes.io PersistentVolumes page and adapt them.

<!-- section: storage-classes | objectives: 1.1.1 -->
## StorageClasses and the default class

A StorageClass (`storage.k8s.io/v1`, cluster-scoped) tells the cluster how to provision a volume dynamically when a claim asks for that class.

| Field | Meaning | Default |
| --- | --- | --- |
| `provisioner` | Volume plugin or CSI driver that creates the volumes; required | none |
| `parameters` | Provisioner-specific settings (disk type, file system...) | none |
| `reclaimPolicy` | Policy given to the PVs it provisions: `Delete` or `Retain` | `Delete` |
| `volumeBindingMode` | `Immediate` or `WaitForFirstConsumer` | `Immediate` |
| `allowVolumeExpansion` | Claims of this class can be resized | `false` |
| `mountOptions` | Mount options of the provisioned PVs, not validated | none |

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-local
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.example.com
parameters:
  type: ssd
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

`Immediate` binds or provisions as soon as the claim exists, without knowing where the Pod will run; on topology-constrained storage the Pod can then be unschedulable. `WaitForFirstConsumer` waits until a Pod using the claim is scheduled, and provisions on that node's topology.

The default class carries the annotation `storageclass.kubernetes.io/is-default-class: "true"`; `kubectl get sc` shows it as `(default)`. To move the default, unset the old one, then set the new one:

```bash
k get sc
k patch storageclass standard -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"false"}}}'
k patch storageclass fast-local -p '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

If several classes are marked default, a claim without `storageClassName` gets the most recently created one: keep exactly one.

> **Exam trap.** Annotation values are strings: write `"true"` in quotes in YAML, since an unquoted `true` is a boolean and the object is rejected. Any value other than `"true"`, or no annotation, means not default.

> **Exam trap.** With `WaitForFirstConsumer`, do not place the Pod with `nodeName`: it bypasses the scheduler and the claim stays `Pending`. Use a `nodeSelector` on `kubernetes.io/hostname` instead.

The `provisioner`, `parameters`, `reclaimPolicy` and `volumeBindingMode` of a class cannot be updated; `allowVolumeExpansion`, `mountOptions` and the annotations can. To change an immutable field, save the class with `k get sc fast-local -o yaml`, delete it and apply the edited file (or run `k replace --force -f` on it); existing PVs keep the settings they were created with.

<!-- section: dynamic-provisioning | objectives: 1.1.2 -->
## Dynamic provisioning and expansion

A claim triggers dynamic provisioning when no existing PV matches it and its class has a provisioner:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
  namespace: shop
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-local
  resources:
    requests:
      storage: 5Gi
```

| `storageClassName` in the claim | Result |
| --- | --- |
| A class name | Binds to a PV of that class, or provisions one |
| Omitted | The default class is written into the claim; with no default, it stays unset until a default appears, then it is set |
| `""` | No class: binds only to PVs without a class, never provisions |

To expand a bound claim, its class must have `allowVolumeExpansion: true`; then raise the request in the **claim**:

```bash
k patch pvc data -n shop -p '{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'
k get pvc data -n shop -w          # CAPACITY changes when the resize is done
k describe pvc data -n shop        # conditions and events of the resize
```

The existing volume is resized; no new PV is created. A file system (XFS, ext3, ext4) grows when a Pod uses the claim, online if the driver supports it, without restarting the Pod.

> **Exam trap.** You can only grow a claim. Asking for less than its current capacity is rejected, and editing the PV's `capacity` instead of the claim can prevent the real resize.

<!-- section: access-volume-modes | objectives: 1.2.1 -->
## Access modes and volume modes

| Mode | Short | Means |
| --- | --- | --- |
| `ReadWriteOnce` | RWO | Read-write by a **single node**; several Pods on that node can use it |
| `ReadOnlyMany` | ROX | Read-only by many nodes |
| `ReadWriteMany` | RWX | Read-write by many nodes (NFS, some CSI drivers) |
| `ReadWriteOncePod` | RWOP | Read-write by a **single Pod** in the whole cluster; CSI volumes only, stable since v1.29 |

| Task asks for | Choose |
| --- | --- |
| One database Pod, and no second Pod may ever mount it | `ReadWriteOncePod` |
| Replicas on different nodes writing shared files | `ReadWriteMany` |
| Static content read by many Pods | `ReadOnlyMany` |
| One Pod, or Pods sharing one node | `ReadWriteOnce` |

A volume is mounted with one access mode at a time, even if it supports several. Access modes are used for **matching** claims to volumes; apart from RWOP they do not enforce write protection.

`volumeMode` is `Filesystem` by default: the volume is formatted if empty and mounted in a directory. `Block` gives the Pod a raw device, used with `volumeDevices` instead of `volumeMounts`:

```yaml
containers:
- name: db
  image: registry.example.com/db:2.1
  volumeDevices:
  - name: data
    devicePath: /dev/xvda
volumes:
- name: data
  persistentVolumeClaim:
    claimName: block-pvc
```

> **Exam trap.** The PV and the claim must have the same `volumeMode`. A `Block` claim never binds to a `Filesystem` PV, and an omitted mode counts as `Filesystem`.

<!-- section: reclaim-policies | objectives: 1.2.2 -->
## Reclaim policies

The reclaim policy (`spec.persistentVolumeReclaimPolicy` of the PV) says what happens to the PV when its claim is deleted.

| Policy | After the claim is deleted | Default for |
| --- | --- | --- |
| `Retain` | The PV stays, phase `Released`, data kept; not available to a new claim | PVs created manually |
| `Delete` | The PV and the storage asset in the backend are deleted | PVs provisioned dynamically (inherited from the class, whose default is `Delete`) |
| `Recycle` | Basic scrub, then `Available` again; deprecated, only `nfs` and `hostPath` | none |

PV phases: `Available` (free), `Bound`, `Released` (claim deleted, not reclaimed yet), `Failed` (automatic reclamation failed). Change the policy of an existing PV before deleting its claim:

```bash
k get pv
k patch pv pvc-3f2a9c1e -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'
```

A `Released` PV still holds the old claim in `spec.claimRef`. To bind it to a new claim, remove that reference (the PV becomes `Available`), then create the claim with `volumeName` set to the PV:

```bash
k patch pv pvc-3f2a9c1e --type json -p '[{"op":"remove","path":"/spec/claimRef"}]'
```

> **Exam trap.** The `reclaimPolicy` of a StorageClass cannot be updated, and recreating the class with another policy does not change the PVs it already provisioned. Patch each PV.

Deleting a claim that a Pod still uses, or a PV still bound, leaves it `Terminating`: the `kubernetes.io/pvc-protection` and `kubernetes.io/pv-protection` finalizers wait until it is no longer in use.

<!-- section: volume-sources | objectives: 1.2.3 -->
## hostPath, local and CSI volumes

| Source | Use | Key fields |
| --- | --- | --- |
| `hostPath` | A file or directory of the node, in a Pod or a test PV; single-node testing only, a security risk | `path`, `type` |
| `local` | A disk, partition or directory of one node, as a static PV only | `path`, required `nodeAffinity` |
| `csi` | Any storage behind a CSI driver | `driver`, `volumeHandle`, `fsType`, `volumeAttributes` |

`hostPath.type` values: `""` (default, no check), `DirectoryOrCreate` (created with mode 0755), `Directory`, `FileOrCreate` (0644; the parent directory is not created), `File`, `Socket`, `CharDevice`, `BlockDevice`.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: local-node1
spec:
  capacity:
    storage: 20Gi
  accessModes: ["ReadWriteOnce"]
  persistentVolumeReclaimPolicy: Retain
  storageClassName: local-storage
  local:
    path: /mnt/disks/ssd1
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values: ["node1"]
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
```

The scheduler reads the PV's `nodeAffinity` to put the Pod on the node that has the disk. Local volumes have no dynamic provisioning, hence `kubernetes.io/no-provisioner` with `WaitForFirstConsumer`, so the binding also respects the Pod's own constraints.

```bash
k get csidrivers                   # installed CSI drivers
k get sc -o wide                   # which provisioner each class uses
```

> **Exam trap.** A `local` PV without `nodeAffinity` is invalid. A `hostPath` PV has none, so a Pod can land on a node where the directory does not exist.

<!-- section: static-binding | objectives: 1.3.1 -->
## Static PersistentVolumes and claims

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-logs
  labels:
    tier: logs
spec:
  capacity:
    storage: 2Gi
  accessModes: ["ReadWriteMany"]
  storageClassName: manual
  hostPath:
    path: /srv/logs
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: logs
  namespace: shop
spec:
  accessModes: ["ReadWriteMany"]
  storageClassName: manual
  resources:
    requests:
      storage: 1Gi
  selector:
    matchLabels:
      tier: logs
```

A PV (cluster-scoped) binds to a claim (namespaced) when **all** of these hold; the binding is one-to-one and exclusive:

| Criterion | Rule |
| --- | --- |
| Capacity | PV capacity at least the request; the claim then shows the PV's full size |
| Access modes | The PV offers the modes the claim asks for |
| `storageClassName` | Identical; `""` on both sides for "no class" |
| `volumeMode` | Identical |
| `selector` | PV labels match `matchLabels` and `matchExpressions` (ANDed); a claim with a selector is never provisioned dynamically |
| `volumeName` | Pins the claim to that PV; class, modes and size are still checked |

To reserve a PV for one claim, set `claimRef` (claim `name` and `namespace`) on the PV, so that no other claim takes it.

> **Exam trap.** A claim that pins a PV with `volumeName` but leaves out `storageClassName` gets the default class written in, no longer matches a PV without a class, and stays `Pending`. Write `storageClassName: ""` explicitly.

<!-- section: claims-in-pods | objectives: 1.3.2 -->
## Claims in Pods and StatefulSets

A Pod mounts a claim of its **own namespace**:

```yaml
spec:
  containers:
  - name: web
    image: nginx:1.27
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  volumes:
  - name: logs
    persistentVolumeClaim:
      claimName: logs
```

A StatefulSet creates one claim per Pod from `volumeClaimTemplates`, named `<template>-<statefulset>-<ordinal>`: `www-web-0`, `www-web-1`. Without `storageClassName` the default class is used.

```yaml
spec:
  serviceName: web
  replicas: 3
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Retain
    whenScaled: Delete
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: ["ReadWriteOncePod"]
      storageClassName: fast-local
      resources:
        requests:
          storage: 1Gi
```

The containers mount the template by its name (`volumeMounts.name: www`). By default (`Retain` for both policies) deleting or scaling down the StatefulSet keeps the claims; `persistentVolumeClaimRetentionPolicy` (stable since v1.32) can delete them.

```bash
k get pvc -n shop
k describe pvc logs -n shop        # Events explain why it is Pending
k get pv                           # STATUS, CLAIM, STORAGECLASS, RECLAIM POLICY
```

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Claim `Pending`, event about waiting for the first consumer | `WaitForFirstConsumer`, no Pod uses it yet | Normal: create the Pod |
| Claim `Pending`, no PV matches | Size, access mode, class, volume mode or selector differ | Align the claim with the PV, or create a PV |
| Claim `Pending`, class does not exist | Typo in `storageClassName` | Recreate the claim with the right class |
| Pod `Pending`, claim not found | Claim in another namespace or misspelled `claimName` | Create the claim in the Pod's namespace |
| PV `Released` | Claim deleted, policy `Retain` | Clean up, remove `claimRef`, bind a new claim |

```text
Events:
  Type    Reason                Message
  ----    ------                -------
  Normal  WaitForFirstConsumer  waiting for first consumer to be created before binding
```

> **Exam trap.** Only the storage request of an existing claim can be raised; its class, access modes and selector cannot be edited. To fix them, save the claim with `-o yaml`, delete it and apply the corrected file.

<!-- section: key-points -->
## Key points

- StorageClass defaults: `reclaimPolicy: Delete`, `volumeBindingMode: Immediate`, `allowVolumeExpansion: false`.
- Default class: annotation `storageclass.kubernetes.io/is-default-class: "true"`; unset the old one, set the new one, keep one.
- Expand by raising the claim's request, only if the class allows it; never shrink, never edit the PV size.
- RWO is one node, RWOP one Pod; access modes and `volumeMode` must match between PV and claim.
- Manual PVs default to `Retain` (claim deleted, PV `Released`), dynamic ones to `Delete`; patch `persistentVolumeReclaimPolicy` on the PV.
- `local` PVs need `nodeAffinity` and a `kubernetes.io/no-provisioner` class with `WaitForFirstConsumer`.
- `storageClassName: ""` means no class; omitted means the default class.
- StatefulSet claims are named `<template>-<statefulset>-<ordinal>` and survive the StatefulSet by default.
