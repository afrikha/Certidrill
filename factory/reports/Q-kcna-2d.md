# Q-kcna-2d — KCNA questions, Storage (2.4.2–2.4.5) (2026-11-23)

## Result
32 `single` questions in `content/kcna/questions/orchestration/kcna-2d-*.yaml`, 8 per objective (2.4.2, 2.4.3, 2.4.4, 2.4.5). Difficulty 13 easy / 14 medium / 5 hard. Correct options: a 8, b 8, c 9, d 7. English only. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-2d-`: 0 problems; `content:validate`: 0 problems, 0 warnings.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io: Persistent Volumes, Storage Classes, Dynamic Volume Provisioning, Change the default StorageClass, Volumes (csi section, CSI migration stable v1.25, FlexVolume deprecated v1.23), Volume Types (removed in-tree types), Volume Snapshots (CSI only), StatefulSets (volumeClaimTemplates, retention policy stable v1.32, default Retain), StatefulSet Basics (PVC names `www-web-0`), blog "Container Storage Interface (CSI) for Kubernetes GA" (GA v1.13, sidecars). github.com/kubernetes-csi/docs `deploying.md` (controller plugin as Deployment/StatefulSet, node plugin as DaemonSet, kubelet calls the node plugin over a Unix socket).

## Doubts and notes
1. The PVC `Pending` phase: the Persistent Volumes page says claims "remain unbound indefinitely". `kcna-2d-pvc-no-matching-pv` uses "stays unbound" in the option and mentions `Pending` only in the explanation.
2. `kcna-2d-csi-external-provisioner` and `kcna-2d-csi-node-plugin-daemonset` go slightly deeper than typical KCNA items (CSI sidecars, plugin deployment). The facts come from the CSI GA blog post (2019, sidecar list still valid) and the kubernetes-csi docs on github.com (kubernetes-csi.github.io itself is not an accepted host).
3. `kcna-2d-sts-who-creates-pvc`: "the StatefulSet controller created the PersistentVolumeClaims" is from the StatefulSet Basics tutorial; the role of external-provisioner in that chain is from the CSI GA blog.
4. Two pairs test close ideas with different events: `kcna-2d-sts-scale-down-pvcs` (scale-down keeps claims) and `kcna-2d-sts-recreate-reuses` (deletion keeps claims, re-creation reuses them); `kcna-2d-pvc-without-class` (default class applied) and `kcna-2d-sts-default-class` (one volume per replica from the default class). Reviewers may drop one of each pair if they judge them duplicates.
5. No overlap found with the KCNA questions present when writing (prefixes 1e, 2c, 3a). 2.4.1 (kcna-2c) and 4.2.4 (kcna-4b) were not written yet; they may test "CSI vs CNI vs CRI", which `kcna-2d-csi-in-tree-drawback` avoids (it tests why CSI replaced in-tree plugins).
