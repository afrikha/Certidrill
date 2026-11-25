A container's own filesystem is lost when the container restarts. Kubernetes solves this with **volumes**, mounted into containers from the Pod specification, and with **persistent storage** that outlives Pods: PersistentVolumes, PersistentVolumeClaims and StorageClasses, backed by storage systems through CSI drivers. The exam asks you to match a need (scratch space, configuration files, durable data, one disk per replica) to the right object, and to know access modes, reclaim policies and the default StorageClass.

<!-- section: volumes | objectives: 2.4.1 -->
## Volumes and their lifetime

A volume is declared in `spec.volumes` of the Pod and mounted by each container that needs it with `volumeMounts`. Data in any volume survives a **container** restart; what differs is whether it survives the **Pod**.

| Volume type | Content | Lifetime |
| --- | --- | --- |
| `emptyDir` | Empty directory, shared by the containers of the Pod | Created when the Pod is assigned to a node; deleted permanently when the Pod is removed from that node. Safe across container crashes |
| `configMap`, `secret` | Keys of a ConfigMap or Secret as files, mounted read-only | Ephemeral: tied to the Pod |
| `downwardAPI` | Pod metadata (labels, annotations, resource values) as files | Ephemeral |
| `projected` | Several sources (Secret, ConfigMap, downward API, service account token) in one directory | Ephemeral |
| Generic ephemeral volume (`ephemeral.volumeClaimTemplate`) | A PVC created for the Pod, from any dynamic provisioner | The PVC is owned by the Pod and deleted with it |
| `hostPath` | A file or directory of the **node's** filesystem | Stays on the node after the Pod is gone |

`emptyDir` uses the node's disk by default. With `medium: Memory` it is a tmpfs (RAM): very fast, but the files count against the memory limit of the container that wrote them. `sizeLimit` caps its size.

```yaml
volumes:
- name: cache
  emptyDir:
    medium: Memory
    sizeLimit: 500Mi
```

`hostPath` presents many security risks (it can expose node credentials or the container runtime socket) and makes identical Pods behave differently on different nodes. Prefer a `local` PersistentVolume when you need a node's disk.

> **Exam trap.** `emptyDir` is not persistent storage: a container restart keeps the data, but deleting or rescheduling the Pod erases it. For data that must outlive the Pod, use a PersistentVolumeClaim.

<!-- section: pv-pvc | objectives: 2.4.2 -->
## PersistentVolumes and PersistentVolumeClaims

Persistent storage separates **who provides** storage from **who consumes** it:

| Object | Scope | Role |
| --- | --- | --- |
| **PersistentVolume (PV)** | Cluster-scoped | A piece of storage in the cluster (a cloud disk, an NFS share...), created by an administrator or dynamically. Its lifecycle is independent of any Pod |
| **PersistentVolumeClaim (PVC)** | Namespaced | A user's request for storage: size, access mode, StorageClass. A Pod references the claim, never the PV directly |

The control plane **binds** each claim to a matching PV. Binding is **one-to-one** and exclusive. A claim with no matching volume stays `Pending` indefinitely; the user always gets at least the requested size, possibly more. A PV goes through the phases `Available`, `Bound`, `Released` (claim deleted, storage not yet reclaimed) and `Failed`.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
  namespace: shop
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 10Gi
```

**Access modes:**

| Mode | Short | Meaning |
| --- | --- | --- |
| `ReadWriteOnce` | RWO | Read-write by a **single node** (several Pods on that node can use it) |
| `ReadOnlyMany` | ROX | Read-only by many nodes |
| `ReadWriteMany` | RWX | Read-write by many nodes (for example NFS) |
| `ReadWriteOncePod` | RWOP | Read-write by a **single Pod** in the whole cluster; CSI volumes only, stable since v1.29 |

**Reclaim policies** (what happens to the PV when its claim is deleted):

| Policy | Effect |
| --- | --- |
| `Retain` | The PV becomes `Released`; the data and the storage asset remain until an administrator cleans them up manually |
| `Delete` | The PV object **and** the storage asset in the backend are deleted. Default for dynamically provisioned volumes |
| `Recycle` | Deprecated (basic `rm -rf` scrub); use dynamic provisioning instead |

A PVC still used by a Pod is not deleted at once: it stays `Terminating` until no Pod uses it.

> **Exam trap.** RWO means one **node**, not one Pod. The mode that guarantees a single Pod is `ReadWriteOncePod`.

<!-- section: storage-classes | objectives: 2.4.3 -->
## Dynamic provisioning and StorageClasses

With **static provisioning**, an administrator creates PVs in advance. With **dynamic provisioning**, a PVC that names a **StorageClass** makes the class's provisioner create a new volume and its PV on demand. A StorageClass is cluster-scoped.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: csi.storage.example.com
parameters:
  type: ssd
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

| Field | Default | Purpose |
| --- | --- | --- |
| `provisioner` | Required | The CSI driver (or internal provisioner) that creates volumes |
| `parameters` | None | Driver-specific options (disk type, performance...) |
| `reclaimPolicy` | `Delete` | Inherited by the PVs the class creates; `Retain` is the alternative |
| `allowVolumeExpansion` | Not allowed | Lets users grow a volume by editing the PVC size; shrinking is never supported |
| `volumeBindingMode` | `Immediate` | `WaitForFirstConsumer` delays provisioning until a Pod uses the claim, so the volume is created in the Pod's zone |

**Default StorageClass.** The annotation `storageclass.kubernetes.io/is-default-class: "true"` marks it. A PVC that omits `storageClassName` gets the default class; if no default exists yet, the field stays unset and is filled in when a default appears. A PVC with `storageClassName: ""` explicitly asks for **no** class and only binds to pre-created PVs without a class. If several classes are marked default, Kubernetes uses the most recently created one.

> **Exam tip.** "Users need storage on demand without asking an administrator" → a StorageClass with a provisioner (dynamic provisioning). "Which object do I create in my namespace to get storage?" → a PersistentVolumeClaim.

<!-- section: csi | objectives: 2.4.4 -->
## The Container Storage Interface

The **Container Storage Interface (CSI)** is a standard interface that lets container orchestrators such as Kubernetes expose arbitrary storage systems to their workloads. It is GA since Kubernetes v1.13. Storage vendors ship **CSI drivers** out of tree, on their own release cycle, without changing Kubernetes code. `csi` is the recommended volume type: it supports provisioning, snapshots and cloning.

A CSI driver usually runs as two parts:

| Component | Runs as | Does |
| --- | --- | --- |
| Controller plugin | Deployment or StatefulSet, with sidecars such as external-provisioner, external-attacher, external-resizer, external-snapshotter | Creates, deletes, attaches, resizes and snapshots volumes through the storage system's API |
| Node plugin | **DaemonSet** on every node, with the node-driver-registrar sidecar | Mounts volumes on the node so the kubelet can give them to containers |

The old **in-tree** volume plugins compiled into Kubernetes (for example awsElasticBlockStore, azureDisk, gcePersistentDisk, cinder, vsphereVolume) have been **removed**; CSI migration (stable since v1.25) redirects existing in-tree volumes to the matching CSI driver, which must be installed. `flexVolume` is deprecated.

> **Exam trap.** CSI is for storage, CNI for networking, CRI for container runtimes. A question about "a plugin standard so storage vendors can integrate with Kubernetes" is CSI.

<!-- section: stateful-storage | objectives: 2.4.5 -->
## Storage for stateful applications

A PVC named in a Deployment's Pod template is shared by every replica. A **StatefulSet** gives each replica its **own** storage with `volumeClaimTemplates`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: registry.example.com/db:1.0
        volumeMounts:
        - name: data
          mountPath: /var/lib/db
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

- Each Pod gets one PVC per template, named `<template>-<statefulset>-<ordinal>`: `data-db-0`, `data-db-1`, `data-db-2`.
- When a Pod is rescheduled, it remounts **its** claim: Pod `db-1` always gets `data-db-1`, together with its stable name and its DNS name through the required headless Service.
- Deleting or scaling down a StatefulSet does **not** delete its PVCs, to protect the data. The `persistentVolumeClaimRetentionPolicy` field (stable since v1.32) changes this with `whenDeleted` and `whenScaled`, each `Retain` (default) or `Delete`.

> **Exam trap.** `volumeClaimTemplates` belongs to StatefulSets. A Deployment has no per-replica claims, and a DaemonSet is for one Pod per node, not for stable storage.

<!-- section: key-points -->
## Key points

- `emptyDir`: scratch space for the life of the Pod; `medium: Memory` for tmpfs. `configMap`, `secret`, `downwardAPI`, `projected`: ephemeral, read-only data. `hostPath`: node filesystem, risky.
- PV: cluster-scoped storage. PVC: namespaced request. Binding is one-to-one; an unmatched claim stays `Pending`.
- RWO = one node, ROX = read-only many nodes, RWX = read-write many nodes, RWOP = one Pod.
- `Retain` keeps data for manual cleanup; `Delete` (dynamic default) removes the PV and the backend storage; `Recycle` is deprecated.
- StorageClass = provisioner + parameters + reclaim policy; default marked by `storageclass.kubernetes.io/is-default-class`; `WaitForFirstConsumer` provisions where the Pod runs.
- CSI: out-of-tree storage drivers; in-tree cloud volume plugins are removed.
- StatefulSet `volumeClaimTemplates`: one PVC per replica, kept after scale-down or deletion unless the retention policy says `Delete`.
