# E-cka-41-rbac-extensions — report

24 exercises in `content/cka/questions/cluster/` (4 per objective: 4.1.1, 4.1.2, 4.7.1, 4.7.2, 4.8.1, 4.8.2).
Mix: 11 `command` (9 invocation, 2 object) / 13 `manifest`; difficulty 4 × 1, 12 × 2, 8 × 3.

## Checks

- `npm run -s content:validate -- --cert cka --prefix cka-4a-` / `cka-4g-` / `cka-4h-`: 0 problem(s), 0 warning(s).
- `npx tsx factory/check-exercise.ts cka cka-4a- cka-4g- cka-4h-` **crashes in the repo** before filtering, on another agent's file
  `content/cka/questions/troubleshooting/cka-2b-etcd-listen-client-urls.yaml` line 342 (unquoted `why:` containing `": "`).
  Run on an isolated copy holding only my 24 files: `24 exercise(s), 0 problem(s)`.

## Engine usage to confirm in the application

- **Path `.`** (whole document) with `matches` is used in `cka-4g-kubelet-cri-endpoint-fix` (no `containerd.sock` left anywhere).
- **String vs number/boolean** cannot be told apart by `equals`. I used `matches` on the parent object (JSON-serialized):
  label values `"true"` (`cka-4a-aggregate-crd-view-edit`), `ttlSeconds: 60` vs `"60"` (`cka-4h-fix-cr-against-schema`),
  `hard.cpu: "20"` vs `20` (`cka-4h-cr-served-version-from-crd`). The application must serialize the same way (compact JSON).
- **Short flags of non-kubectl tools** consume the next word even when it is a flag (`crictl ps -a -r X` misparses). Solutions put
  `-a` last; the checks accept `-r`/`--runtime-endpoint` and `-a`/`--all` with a `matches` on `flags`.
- `cka-4a-role-resourcenames-user` checks "no rule without resourceNames" with a regex on the serialized `rules`.

## Doubts and unverified points

- **`kubectl create clusterrole` output** (`cka-4a-clusterrole-storage-viewer`): from memory of the generator (one rule per API
  group, groups sorted, short names `pv`/`sc` expanded). Needs discovery when CI runs it in client dry-run.
- **`kubectl get csidrivers` columns** in `cka-4g-storageclass-csi-provisioner` follow the kubernetes-csi docs example
  (NAME, ATTACHREQUIRED, PODINFOONMOUNT, MODES, AGE); kubectl v1.37 may print more columns.
- **Log and error texts are paraphrased**, not quoted: Flannel's lease error, the kubelet runtime connection error, the 262144-byte
  annotation limit error (its wording changed across releases).
- **Server-side apply** (`cka-4h-apply-server-side-crds`): the SSA page says kubectl keeps the last-applied annotation up to date;
  I state that kubectl SSA does not add it to new objects (consistent with kube-prometheus installing its CRDs with
  `--server-side`), but did not find that sentence verbatim.
- **Kubelet endpoint** (`cka-4g-kubelet-cri-endpoint-fix`): depending on the kubeadm version the endpoint may come from
  `kubeadm-flags.env` instead of `config.yaml`; the stem states that the flag is absent.
- **Versions taken on 2026-11-27**: cert-manager chart `v1.21.3` (cert-manager.io), csi-driver-nfs chart `4.13.4` (no `v` since
  4.11.0, charts README), Flannel manifest namespace `kube-flannel`, `cniVersion` 1.0.0.
- **Not used as negatives** because I could not verify that they really fail: `metadata.namespace` on a cluster-scoped custom object
  (probably ignored), a User/Group subject without `apiGroup` (defaulted in rbac/v1), an endpoint without the `unix://` scheme.
- **Not covered in 4.7.1**: the CNI config directory `/etc/cni/net.d` and binaries in `/opt/cni/bin`. No allowed tool reads files,
  and a CNI conflist is JSON without apiVersion/kind, which the manifest checker refuses.
- The chapter `41-rbac-extensions.en.md` does not exist yet; nothing was aligned with it.
