# Q-kcna-1d — KCNA questions 1.3.3–1.3.5, 1.4.1–1.4.2 (2026-11-23)

## Result
60 `single` questions in `content/kcna/questions/fundamentals/kcna-1d-*.yaml`, 12 per objective. Difficulty 24 easy / 27 medium / 9 hard. Correct option spread 15/15/15/15. `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1d-`: 0 problems. `npm run content:validate -- --cert kcna --prefix kcna-1d-`: 0 problems, 0 warnings.

## Sources fetched (WebFetch, 2026-11-23)
kubernetes.io: assign-pod-node, taint-and-toleration, pod-priority-preemption, topology-spread-constraints, containers/images, containers (overview), architecture/cgroups, concepts/overview, workloads/pods/user-namespaces, tasks/share-process-namespace, kubeadm create-cluster (control plane taint), windows/intro, security/linux-kernel-security-constraints (read only, not referenced). opencontainers.org/about/overview; github.com/opencontainers/image-spec spec.md. glossary.cncf.io container and virtual-machine (read only, not referenced: they don't mention kernels or namespaces).

## Facts worth flagging
- Taint `Gt`/`Lt` toleration operators exist as **alpha** since v1.35 (gate `TaintTolerationComparisonOperators`, off by default). Not tested; questions say tolerations use `Equal`/`Exists` only implicitly (no question claims they are the only operators).
- User namespaces (`hostUsers: false`) are **stable since v1.36** (page, v1.37 docs). Used in one question.
- cgroup v1 deprecated since v1.35; kubelet refuses to start on cgroup v1 by default (`failCgroupV1`). The page does not print the default value explicitly, only "will no longer start on a cgroup v1 node by default".
- The assign-pod-node page says `matchLabelKeys`/`mismatchLabelKeys` for Pod affinity are stable since v1.33 but also mentions a feature gate: inconsistent; not tested.
- Built-in PriorityClass values (2000000000 / 2000001000) and the user maximum (1 billion) are on the page; one question uses "1000000000" as a distractor value with that meaning.

## Doubts / choices
1. Names of Linux namespace types other than PID and user (net, mnt, ipc, uts) are not stated on any page fetched; they appear only as distractors/explanations ("network namespace", "mount namespace") consistent with the course chapter 14.
2. "A container that exceeds its memory limit is OOM-killed" (namespace-vs-cgroup question) relies on chapter 13 and the cgroups page; the cgroups page itself only says cgroups enforce requests and limits.
3. `kcna-1d-windows-on-linux`: the Windows page does not literally say "Windows containers need a Windows kernel"; it says clusters must include Windows nodes to run Windows containers and that the control plane is Linux-only. The explanation phrases the kernel point from the Overview page (containers share the host OS).
4. `kcna-1d-nodename-bypass` (spec.nodeName) is placed under 1.3.3 as a placement mechanism of the same page; it could also fit 1.3.1.
5. Reference title for the OCI image spec is the GitHub page title without "· GitHub" ("image-spec/spec.md at main · opencontainers/image-spec"); the OCI overview title is shortened from "About the Open Container Initiative - Open Container Initiative".
6. Other KCNA batches present at writing time (1e, 2d, 4a, …) were checked: no question on 1.3.x/1.4.1–1.4.2 decisions outside this batch. Batches 1a–1c had no files yet; kcna-1c (1.3.1, 1.3.2) may also use "taint not tolerated" as a cause of `Pending` — a different decision from the taint mechanics tested here.
