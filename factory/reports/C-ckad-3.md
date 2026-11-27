# C-ckad-3 — CKAD course, chapters 22-helm-kustomize and 31-probes-api-versions (2026-11-27)

## Result
2 English chapters: `content/ckad/course/chapters/22-helm-kustomize.en.md` (6 sections + key points, about 2,090 words excluding markup) and `31-probes-api-versions.en.md` (4 sections + key points, about 1,790 words). Objectives 2.3.1–2.3.3, 2.4.1–2.4.3, 3.1.1, 3.1.2, 3.2.1, 3.2.2 all in section markers. `check-cert.ts`: 0 problems; `content:validate --course --chapters`: 0 problems for both chapters.

## Sources fetched
helm.sh/docs (Helm 4.3.1): helm_install, helm_upgrade, helm_rollback, helm_uninstall, helm_list, helm_get_values, helm_history, helm_status, helm_search_repo, helm_show_values, helm_template, helm_repo_add, changelog (v3.19 to v4.3.1). kubernetes.io: tasks/manage-kubernetes-objects/kustomization, concepts/configuration/liveness-readiness-startup-probes, tasks/configure-pod-container/configure-liveness-readiness-startup-probes, reference/using-api/deprecation-guide, reference/using-api/deprecation-policy, kubectl reference api-resources and explain. kubectl.docs.kubernetes.io (Kustomize reference): replicas, images, labels, commonLabels, patches, patchesStrategicMerge, configMapGenerator, secretGenerator.

## Doubts and deviations
- **Helm version on the exam is not published.** helm.sh/docs now documents Helm 4. The chapter uses commands common to Helm 3 and 4 and flags the differences: `--atomic` became `--rollback-on-failure`, `--force` became `--force-replace`, and `helm list` shows every status by default in Helm 4 (Helm 3: deployed and failed only unless `-a`; the Helm 3 behaviour comes from memory, not re-fetched).
- **`helm upgrade` values without `--reuse-values`**: helm.sh does not state the default. The chapter says previous values are dropped once new `--set`/`-f` are passed, which is Helm 3's documented-in-code behaviour (it reuses old values only when no new value is given). Not verified for Helm 4.
- **`helm uninstall`**: the Helm 4 page lists no alias. The chapter does not mention `delete`/`un` aliases.
- **Helm release storage as Secrets**, rollback creating a new revision, and history descriptions (`Install complete`, `Upgrade complete`, `Rollback to 1`): from knowledge; the history page confirms the columns and a DESCRIPTION with install/upgrade/rollback messages.
- **Kustomize**: the kubernetes.io page does not document the `replicas` field, `secretGenerator.type` or the deprecation of `commonLabels`/`patchesStrategicMerge`; those come from the Kustomize reference (kubectl.docs.kubernetes.io), which is not in the exam's allowed documentation and is not on the validator's reference allow-list (exercise files citing it get warnings). The chapter has no links.
- Kustomize transformer order (patches applied to the base names before the overlay's prefix/suffix) is stated from knowledge; I removed a similar claim about `replicas` because I could not verify it.
- `--dry-run` in `helm install`: the page says the default is `none` with values `client`/`server`; "bare `--dry-run` means `client`" is inferred from Helm 3.13+ behaviour.
- The probe "Configure Probes" field list moved: it is now on the concepts page (`concepts/configuration/liveness-readiness-startup-probes`), not on the task page. Defaults and minimums are taken from there.
- Not included because alpha in v1.37: gRPC probe `mode: TLS` (`GRPCContainerProbeTLS`, alpha since v1.37) and HTTP/2 cleartext (h2c) probes (KEP-5999, alpha).
- CrashLoopBackOff back-off timings are deliberately not given (possible changes in recent releases not verified).
- The deprecation guide lists no removal after v1.32 (flowcontrol v1beta3); flowcontrol and CSIStorageCapacity rows were left out as out of CKAD scope.
- The `no matches for kind ... ensure CRDs are installed first` error text and the deprecation `Warning:` format are from knowledge (the policy page confirms a `Warning` header without giving the text).
- Chapters by other tasks appeared in the same folder while I worked; I did not read or edit them, so overlap with 21, 32 or 51 (Ingress v1 fields) was not checked.
