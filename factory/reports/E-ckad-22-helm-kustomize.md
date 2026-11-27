# E-ckad-22-helm-kustomize — report

24 exercises in `content/ckad/questions/deployment/` (`ckad-2c-*` ×12 for 2.3.1–2.3.3, `ckad-2d-*` ×12 for 2.4.1–2.4.3), 4 per objective. No model exercise existed for these objectives.

## Mix

- Types: 12 `command` (all mode `invocation`), 12 `manifest`, so 50/50 instead of the 45/55 target. Helm tasks are one command each by nature. A Helm values file cannot be a `manifest` exercise, because `check-exercise.ts` requires `apiVersion`/`kind` on every document. The only Helm manifest is `ckad-2c-template-values-precedence` (write the Deployment that `helm template` renders).
- No `object` mode: no Helm or Kustomize command fits the kubectl client dry-run generators. I did not want to guess the `apply -k --dry-run=client -o yaml` output (name hashes, List wrapper).
- Difficulty: 5 at level 1, 12 at level 2, 7 at level 3.

## Facts checked (2026-11-27)

- helm.sh documents **Helm 4.3.1**. `--atomic` is now `--rollback-on-failure`, and `--force` is now `--force-replace`. `--dry-run` takes `none|client|server`, and `--wait` takes a strategy. `helm list` has no `--all` flag. `helm template` has no `--validate` flag. None of these flags is used in a solution.
- The aliases `helm ls` and `helm uninstall` = `del`/`delete`/`un` were checked in the helm source on GitHub (`pkg/cmd/list.go`, `uninstall.go`), because the generated docs do not list aliases.
- `kubectl kustomize -o PATH` exists (kubernetes.io reference). It is not used, because of how the engine parses `-o`.

## Engine limitations (factory/exercise.ts)

- `HELM_SHORT` maps `-l` to `selector` for every helm verb. So `helm search repo X -l` (the documented short form of `--versions`) fails. Only `--versions` is given as a solution. The explanation still mentions `-l`.
- Helm boolean flags missing from `HELM_BOOL` (`--versions`, `--force-update`, `--untar`…) take the next word as their value. Solutions put them last. A candidate who writes `helm search repo --versions acme/webapp` would fail.
- `helm upgrade -i` (short form of `--install`) is not mapped: `-i` takes the next word as its value. Only `--install` is accepted.

## Doubts / warnings

- 8 validator warnings: references to `kubectl.docs.kubernetes.io` (SIG CLI Kustomize reference: images, replicas, labels, configMapGenerator, secretGenerator, patches) are not on the CNCF host list. kubernetes.io does not document `replicas`, `labels.includeTemplates`, generator `behavior`, or secretGenerator `type`. Consider adding the host to `lib/vendors.ts`.
- `ckad-2c-rollback-revision`: the history table leaves out the STATUS column. I could not verify what status Helm 4 gives the previous revision after a failed upgrade.
- `ckad-2c-template-values-precedence`: the template is shown in the stem, not in `body.files`, because a file named `*.yaml` that contains `{{ }}` would not parse as YAML.
