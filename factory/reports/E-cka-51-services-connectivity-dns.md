# E-cka-51-services-connectivity-dns — report

24 exercises in `content/cka/questions/networking/` (4 per objective: 5.1.1, 5.1.2, 5.3.1, 5.3.2, 5.6.1, 5.6.2).
Mix: 11 command (8 invocation, 3 object) / 13 manifest; difficulty 4 × 1, 12 × 2, 8 × 3.
Checks: `check-exercise.ts cka cka-5a- cka-5c- cka-5f-` → 0 problem(s); `content:validate --prefix` cka-5a-, cka-5c-, cka-5f- → 0 problem(s) each.
The chapter `51-services-connectivity-dns.en.md` did not exist yet. The exercises rely on the kubernetes.io and coredns.io pages only.

## Doubts and deviations

1. **`kubectl create service <type> NAME` and the checker.** `parseCommand` treats `service` as the sub-verb and the Service type (`nodeport`, `clusterip`…) as the object name. The object-mode consistency check then reports "output has no object named nodeport". Because of this, `create service` is never used as a solution, only once as a negative (`cka-5c-expose-headless-cluster-ip-none`, where the Pod labels are chosen so that its default selector `app: <name>` is really wrong). Fixing the parser (name = the argument after the type) would make `create service nodeport --node-port` usable.
2. **Object-mode outputs were not run through kubectl** (no kubectl binary here). They were written from the kubectl reference and the CKAD models:
   - `expose`: labels copied from the Deployment, `targetPort` defaults to `--port`, `clusterIP: None` with `--cluster-ip=None`;
   - `create service clusterip --clusterip=None` (negative): port name `6379-6379`, `type: ClusterIP`;
   - `label` and `annotate` on a Pod file: I assumed the `--local -o yaml` output is the file with sorted keys plus the new label or annotation.
   CI should confirm them.
3. **`cka-5a-cross-node-test-pods`** also accepts a `kubernetes.io/hostname` nodeSelector or node affinity. "Assigning Pods to Nodes" warns that this label can differ from the node name in some environments (it is equal on kubeadm clusters).
4. **Corefile starters** (`cka-5f-corefile-*`) use the default Corefile shown on "Customizing DNS Service". The ConfigMap that kubeadm v1.37 actually deploys may differ slightly (`max_concurrent`, cache options). The checks do not depend on those lines.
5. **`cka-5c-fix-named-target-port`**: I did not verify on a page exactly what the EndpointSlice shows when the named `targetPort` matches no container port. I believe the controller skips the port, and the stem only says "no usable port".
6. **`cka-5f-kubelet-resolvconf-loop`**: the `[FATAL] plugin/loop` log line follows the format on coredns.io/plugins/loop, but the port numbers and the trailing text are illustrative.
7. **`cka-5a-controller-manager-cluster-cidr`**: the statement that kubeadm adds `--allocate-node-cidrs=true` and `--cluster-cidr` when `podSubnet` is set comes from memory. The flag semantics themselves are verified on the kube-controller-manager reference.
8. **`cka-5f-dnsconfig-ndots-search`**: the `contains` check compares scalars loosely, so `value: 2` (a number) passes even though the API wants a string. The explanation says the value is a string.
9. **CoreDNS `proxy` plugin** (a negative in `cka-5f-corefile-upstream-cache`): it was removed from CoreDNS years ago (plugin/proxy removal PR #2683). This is stated without a version number.
