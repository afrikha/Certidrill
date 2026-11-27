# C-cka-1 — CKA course, chapters 00-getting-started and 11-storage

Files: `content/cka/course/chapters/00-getting-started.en.md` (1,116 words incl. code), `content/cka/course/chapters/11-storage.en.md` (2,128 words incl. code, about 1,780 prose). English only, no `.fr.md`.
Checks: `check-cert.ts cka 00-getting-started 11-storage` → 0 problems in these chapters; `content:validate --cert cka --course --chapters ...` → 0 problem(s) (62 in other chapters, which are not written yet).

## Sources
- Linux Foundation: CKA certification page, "Important tips CKA & CKAD", "Resources allowed" (fetched 2026-11-27).
- kubernetes.io: `curl` to kubernetes.io is blocked by the proxy (403), and WebFetch cuts off long pages. So I read the page sources of the kubernetes/website repository (`main` branch = v1.37 docs; `data/releases/schedule.yaml` shows 1.37.x as current) through raw.githubusercontent.com: storage-classes, persistent-volumes, volumes, reference/storage/volume-types, dynamic-provisioning, change-default-storage-class, change-pv-reclaim-policy, the PV tutorial, the statefulset concept page, the StatefulSetAutoDeletePVC feature gate page, kubectl quick reference, kubectl explain/patch/get references and crictl. I read the PV and StorageClass API reference fields on kubernetes.io with WebFetch and `offset`.

## Doubts / deviations
- **Contexts**: the LF tips page now describes one `ssh` host per task and does not mention `kubectl config use-context`. The chapter says to run a context command only "when the task gives one".
- **Skip and flag**: the LF pages do not describe a flag feature in the exam UI. The chapter says to skip a task, note its number and come back, without promising a flag button. Task weights and partial credit are not published, so the chapter does not claim them.
- **WaitForFirstConsumer event text** ("waiting for first consumer to be created before binding", reason `WaitForFirstConsumer`): this is the controller message as quoted in kubernetes/kubernetes issues. It is not on a kubernetes.io page.
- **Immutability**: kubernetes.io does not state field by field which StorageClass fields are immutable. The chapter only says that a class's name and settings are set at creation, so you recreate a class to change its provisioner or parameters. For claims, it says only the storage request can be raised and that the class, access modes and selector cannot be edited. This matches API validation, but no kubernetes.io page says it explicitly.
- **Unquoted `true` in the default-class annotation**: the trap says the object is rejected because annotation values must be strings. This follows from the API type (map of strings). It is not a sentence on the StorageClass page.
- The statefulset concept page still says "You must enable the StatefulSetAutoDeletePVC feature gate", but the feature-gate page shows it stable since v1.32. The chapter follows the feature-gate page.
- `kubectl get csidrivers` and `k get sc -o wide` are standard. I did not check them against a v1.37 binary.
