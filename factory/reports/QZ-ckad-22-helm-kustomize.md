# QZ-ckad-22-helm-kustomize — report

File: `content/ckad/quizzes/22-helm-kustomize.yaml` (10 questions, English only).

| Pos | Objective | Diff | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 2.3.1 | 1 | single | `--devel` needed for pre-releases, even with `--versions` |
| 2 | 2.4.2 | 1 | single | generator hash suffix and reference rewriting |
| 3 | 2.3.3 | 2 | single | rollback creates a new revision (`Rollback to 1`) |
| 4 | 2.3.2 | 2 | single | `--reuse-values` vs plain upgrade / `--reset-values` / `--install` |
| 5 | 2.4.1 | 2 | multi | `kubectl kustomize DIR` + `kubectl diff -k DIR` (no file path, no `-f`) |
| 6 | 2.3.3 | 3 | command (invocation) | `helm get manifest --revision 3 -n billing` |
| 7 | 2.3.2 | 3 | command (invocation) | `--set` list index `ingress.hosts[0].host` + `ingress.enabled` |
| 8 | 2.4.1 | 3 | manifest | Namespace in `resources`, `labels` + `includeSelectors`, `images` `digest` |
| 9 | 2.4.2 | 3 | manifest | per-entry `options.disableNameSuffixHash` vs global `generatorOptions`, `envs`, `key=path` |
| 10 | 2.4.3 | 3 | manifest (2 docs) | patches use the base name before `namePrefix`; SMP by container name; inline JSON 6902 `remove` |

None of the bank exercises (`ckad-2c-*`, `ckad-2d-*`) uses `--devel`, `get manifest`, list-index `--set`, `includeSelectors`, `digest`, a Namespace in resources, per-entry generator `options`, `remove` or `namePrefix` with patches.

## Verified (fetched)

- helm.sh: `helm search repo` (stable only by default, `--devel`), `helm rollback` (0/omitted = previous), `helm upgrade` (flags), `helm get manifest` (`--revision`), `helm install`, "Using Helm" (`--set servers[0].port`, revision incremented on every install/upgrade/rollback).
- Helm source (`pkg/action/upgrade.go`, `pkg/action/rollback.go`, `pkg/strvals/parser.go` on github.com/helm/helm main): new `--set`/`-f` without `--reuse-values` drops the previous values; rollback description `Rollback to N`, version = current + 1.
- kubernetes.io: kustomization task page (generators, hash suffix, references, `labels`/`includeSelectors`, `images`, `patches`/`target`, `diff -k`), `kubectl kustomize` (DIR must be a directory or repo URL), `kubectl diff` (`-k` = kustomization directory).
- kubectl.docs.kubernetes.io (used to verify only; not an accepted reference host): per-entry generator `options` with the same subfields as `generatorOptions`; global `disableNameSuffixHash: true` overrides any local setting; `labels` `includeSelectors`/`includeTemplates` default false and `includeSelectors` adds to Service selector, Deployment selector and Pod template; `images` `digest` output `name@sha256:...`.
- Kustomize source (`api/internal/target/kusttarget_configplugin.go`): `patches` (PatchTransformer) run before NamespaceTransformer and Prefix/Suffix transformers, so patches match base names.

## Doubts / unverified

- Q9's references point to the kubernetes.io task page, which documents only the global `generatorOptions`; the per-entry `options` field is documented on kubectl.docs.kubernetes.io (not in the allowed host list, so not cited).
- Q10 negatives: "SMP named staging-web fails the build" and "a target that matches nothing is silently ignored" come from my reading of Kustomize's PatchTransformer (GetById on the patch id vs Select on a target), not from a run. No kubectl/helm/kustomize binary in this environment; nothing was rendered.
- Q8: Kustomize's namespace transformer may also rename a Namespace object to the `namespace` value; irrelevant here (same name `analytics`), not verified.
- Q10 checks on the inline JSON 6902 patch are regexes on the patch string (`remove`, `/spec/template/spec/containers/0/livenessProbe`): an unusual but valid spelling (for example a JSON pointer with escaped characters) would fail.
- Q7: unquoted `ingress.hosts[0].host=...` is a shell glob in Bash; it works unless a matching file exists. Solutions include quoted variants.

## Chapter remarks

- `22-helm-kustomize.en.md`, flag table: the example `--set-string image.tag=1.10` suggests `--set` would turn `1.10` into a number. In Helm's strvals parser, `--set` converts only `true`/`false`/`null` and integers (not starting with 0); `1.10` already stays the string `"1.10"`. `--set-string` matters for integer-looking values (`--set-string image.tag=1234`) or booleans. Suggest changing the example.
- Chapter, `--reuse-values`: correct, but Helm's code also replaces the new chart's defaults with the old release's computed values when `--reuse-values` is used with a new chart version (hence `--reset-then-reuse-values`). Not tested in the quiz (Q4 keeps the chart version); could be worth a sentence.
