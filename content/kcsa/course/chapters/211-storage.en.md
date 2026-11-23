Storage is where workloads keep data that outlives a container, and where an attacker looks for credentials, for other tenants' data, or for a path to the node. This chapter covers the storage features that create risk (hostPath, shared and reclaimed volumes), how volume data is encrypted, and the controls that decide who can use a volume and with which permissions.

<!-- section: storage-risks | objectives: 2.11.1 -->
## Storage risks

**hostPath volumes** mount a file or directory of the node into the Pod. The Kubernetes documentation states that hostPath "presents many security risks" and should be avoided: access to the host filesystem can expose privileged system credentials (such as the kubelet's) or privileged APIs (such as the container runtime socket) that can be used for container escape or to attack the rest of the cluster.

| Risk | Example | Control |
| --- | --- | --- |
| Host filesystem access | A Pod mounts `/` or `/etc/kubernetes` and reads node credentials | Forbid hostPath: the **Baseline** Pod Security Standard rejects every hostPath volume |
| Runtime socket mounted | A Pod mounts the containerd socket and starts privileged containers on the node | Same; never mount runtime sockets into application Pods |
| Read-write host mount | An allowed directory mounted read-write can be subverted by the container | If a host path must be allowed, require `readOnly: true`; prefer a `local` PersistentVolume |
| Creating PersistentVolumes | A user allowed to create PVs creates a hostPath PV and claims it | Grant `create` on `persistentvolumes` only to administrators |

**PersistentVolumes shared between workloads.** A PersistentVolume (PV) is a cluster resource with a lifecycle independent of namespaces. A volume that supports several writers (`ReadWriteMany`, for example an NFS share) mounted by unrelated applications lets one compromised workload read or alter the other's data. Give each workload its own claim and volume.

**Data left on reclaimed volumes.** When a PersistentVolumeClaim (PVC) is deleted, the PV's **reclaim policy** decides what happens to the data:

| Reclaim policy | What happens | Risk |
| --- | --- | --- |
| `Retain` | PV becomes `Released`; the previous claimant's data remains on the volume until an administrator cleans it and deletes the storage asset | Data stays readable if the volume is reused without wiping it |
| `Delete` | The PV and the storage asset in the backend are deleted; default for dynamically provisioned volumes (inherited from the StorageClass) | Lowest reuse risk; data is lost |
| `Recycle` | Basic scrub (`rm -rf /thevolume/*`), then reuse | Deprecated; use dynamic provisioning |

The Kubernetes multi-tenancy guidance recommends a reclaim policy of `Delete` on a shared StorageClass, so that a PersistentVolume cannot be reused across namespaces.

> **Exam trap.** `Retain` is the safe choice for **availability** (the data survives the deletion of the claim), not for **confidentiality**: a retained volume keeps the previous tenant's data until someone wipes it.

<!-- section: storage-encryption | objectives: 2.11.2 -->
## Encryption of volumes and the role of CSI

Kubernetes does not encrypt the contents of volumes itself. Encryption is a property of the storage backend, which Kubernetes reaches through a **CSI driver** (Container Storage Interface): an out-of-tree plugin, developed by the storage vendor, that provisions, attaches and mounts volumes. A **StorageClass** names the CSI driver (`provisioner`) and passes it driver-specific `parameters`, which is where backends usually expose options such as encryption or the key to use.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-ssd
provisioner: csi.storage.example.com
parameters:
  encrypted: "true"
reclaimPolicy: Delete
allowVolumeExpansion: true
```

The parameter names above are illustrative: each driver documents its own.

| Concern | Where it is handled |
| --- | --- |
| Encryption at rest of volume data | Storage backend or cloud disk encryption, enabled through the CSI driver and StorageClass parameters (or node disk encryption for local volumes) |
| Encryption in transit between node and storage | The storage protocol and driver (for example a network file share mounted with TLS or Kerberos); plain NFS or iSCSI traffic is not encrypted |
| Secret and ConfigMap volumes | The kubelet keeps Secret data in `tmpfs` (memory) on the node, not on durable storage |
| API objects in etcd (Secrets, ConfigMaps) | `EncryptionConfiguration` on the API server: a different mechanism, covered in chapter 3.5 |

> **Exam trap.** An `EncryptionConfiguration` encrypts API resources stored in **etcd**, not the data written to PersistentVolumes. To encrypt volume data, choose a StorageClass whose CSI driver and backend encrypt at rest.

<!-- section: storage-access-control | objectives: 2.11.3 -->
## Access control for storage

**Namespace-scoped claims.** PersistentVolumeClaims are namespaced, and a Pod can only use a claim in its own namespace. Users of a namespace request storage through PVCs; PersistentVolumes and StorageClasses are cluster-scoped and should be managed only by administrators. RBAC on `persistentvolumeclaims` in a namespace is therefore the normal way to let a team consume storage without touching other teams' volumes.

**Access modes** describe how a volume can be mounted:

| Access mode | Meaning |
| --- | --- |
| `ReadWriteOnce` | Read-write by a single **node** (several Pods on that node can still use it) |
| `ReadOnlyMany` | Read-only by many nodes |
| `ReadWriteMany` | Read-write by many nodes |
| `ReadWriteOncePod` | Read-write by a single **Pod** in the whole cluster (stable since v1.29) |

Access modes are used to match claims to volumes; they do **not** enforce write protection once the storage is mounted. A `ReadOnlyMany` volume is no guarantee that a container cannot write to it.

**Read-only mounts** are enforced per container with `readOnly: true` on the `volumeMount`. Other containers in the same Pod may still mount the volume read-write. On Linux a read-only mount is not recursively read-only: a writable filesystem mounted below it stays writable unless you also set `recursiveReadOnly: Enabled` (stable since v1.33).

**File ownership with fsGroup.** The Pod `securityContext` controls the identities that touch volume files:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: reports
  namespace: shop
spec:
  securityContext:
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    fsGroupChangePolicy: OnRootMismatch
  containers:
  - name: app
    image: registry.example.com/shop/reports:1.4.2
    volumeMounts:
    - name: data
      mountPath: /data
    - name: templates
      mountPath: /templates
      readOnly: true
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: reports-data
  - name: templates
    persistentVolumeClaim:
      claimName: report-templates
```

- `fsGroup`: volumes that support ownership management are made owned and writable by this group ID; the container processes join that group, and new files get that group.
- `fsGroupChangePolicy`: `OnRootMismatch` changes ownership only if the volume root does not already match (faster on large volumes); `Always` changes it at every mount.
- `runAsUser` and `runAsGroup` set the UID and primary GID of the processes, so the application can run as non-root and still write to its volume.

> **Exam tip.** "The application must run as non-root but cannot write to its volume": the answer is `fsGroup` (or matching `runAsUser`/`runAsGroup`), not running the container as root or privileged.

<!-- section: key-points -->
## Key points

- hostPath exposes node credentials and the runtime socket; Baseline forbids it; if a host path is unavoidable, mount it read-only, or use a `local` PersistentVolume.
- Creating PersistentVolumes is an administrator privilege: a user who can create PVs can create hostPath PVs.
- `Retain` leaves the previous claimant's data on the volume; `Delete` is the default for dynamic provisioning; `Recycle` is deprecated.
- Volume encryption at rest and in transit comes from the backend through the CSI driver and StorageClass parameters; `EncryptionConfiguration` only covers etcd.
- PVCs are namespaced; access modes do not enforce write protection; use `readOnly: true` on mounts, `ReadWriteOncePod` for a single Pod, and `fsGroup` for file ownership.
