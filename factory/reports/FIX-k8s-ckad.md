# FIX-k8s-ckad: review pass on the CKAD course, exercises and quizzes (2026-11-27)

I read every report in `C-ckad-*`, `E-ckad-*` and `QZ-ckad-*`, checked each content finding against the official docs (fetched pages, or the upstream source when the docs say nothing), and fixed what was confirmed. Final checks: `check-exercise ckad` gives 304 exercises and 0 problems. `check-quiz ckad` gives 0 problems and 0 warnings. `check-cert ckad` gives 0 problems. `content:validate --cert ckad` gives 0 problems; its 20 warnings are reference hosts, see the last section.

## Confirmed findings

| Finding (report) | Docs | Change |
| --- | --- | --- |
| The chapter's `--set-string image.tag=1.10` example implies that `--set` would make `1.10` a number (QZ-22) | helm.sh helm_upgrade/install synopsis ("to force string values, use '--set-string'"). Helm `pkg/strvals/parser.go` `typedVal` converts only `true`/`false`/`null` and integers that do not start with `0` | Chapter 22, flag table: the row now says what `--set` converts and uses `--set-string image.tag=1234` |
| A bare `--dry-run` means `client` (C-3) | helm.sh helm_install: `--dry-run string[="unset"]`, values none/client/server. Helm `pkg/cmd/helpers.go`: the bare form maps to client and logs "--dry-run is deprecated and should be replaced with '--dry-run=client'" | Chapter 22: the example is now `--dry-run=client`, and the text says the bare form still works but is deprecated in Helm 4 (it prints a warning) |
| `helm upgrade -i` (tooling now parses it) | helm.sh helm_upgrade: `-i, --install` | `ckad-2c-upgrade-install-values`: added a `-i` solution variant |
| The chapter's `httpGet.host` row does not say to use a `Host` header for virtual hosts (QZ-31) | kubernetes.io Liveness, Readiness, and Startup Probes: "You probably want to set "Host" in `httpHeaders` instead" | Chapter 31, handler table: `host` row completed |
| `kubectl expose` works on a `matchExpressions` Deployment when you pass `--selector` (QZ-51) | kubectl expose reference: `--selector` ("If empty (the default) infer the selector…"). kubectl `expose.go` skips selector inference when `--selector` is given | Chapter 51 Exam tip: `--selector` added as an option |
| `kubectl set env --from` renames keys (QZ-42) | kubectl `pkg/cmd/set/set_env.go`: `strings.ToUpper(validEnvNameRegexp.ReplaceAllString(key, "_"))`, regexp `[^a-zA-Z0-9_]` | Chapter 42: one sentence on the renaming (`log.level` → `LOG_LEVEL`), applied before `--prefix` |
| `--share-processes` defaults to true with `--copy-to`, but the chapter does not say so (QZ-12) | kubectl debug reference: `--share-processes` Default: true, "When used with '--copy-to'…" | Chapter 12: added to the `--copy-to` sentence |
| The ServiceAccount's `imagePullSecrets` are copied for any ServiceAccount, not only `default` (E-11) | kubernetes.io Managing Service Accounts, ServiceAccount admission controller step 4: copied "If the spec of the incoming Pod doesn't already contain any `imagePullSecrets`" | `ckad-1a-serviceaccount-pull-secret`: the explanation now states the condition. The second reference is now "Managing Service Accounts" instead of "Images" |
| Docker/Podman checks matched `"(t\|tag)"` etc. on the JSON of `flags`, a workaround for the old parsing (E-11) | Tooling: `-t`/`-f`/`-o`/`-i` now normalize to `tag`/`file`/`output`/`input` | 6 `ckad-1a-*` exercises (build-two-tags-context, build-containerfile-path, build-target-stage, build-arg-release-stage, save-oci-archive, load-image-archive): the regexes now use only the normalized names. All solutions still pass and all negatives still fail |
| `kubectl autoscale --cpu-percent` is not documented for v1.37 (C-2, E-21, QZ-21) | kubectl autoscale reference: only `--cpu` (percentage or quantity) and `--memory`, with `--cpu=80%` in the examples | None. Chapter 21 and the exercises already use `--cpu`; no file uses `--cpu-percent` |
| Helm 4 `helm list` shows every status and has no `-a` (C-3, E-22) | helm.sh helm_list (4.3.1): "By default, it lists all releases in any status"; no `--all` | None (chapter and `ckad-2c-list-failed-all-namespaces` agree) |
| `--atomic` was renamed `--rollback-on-failure`, and `--force` was renamed `--force-replace` (C-3) | helm.sh helm_upgrade: only `--rollback-on-failure` and `--force-replace` are listed | None |
| Helm stores releases as Secrets (C-3) | helm.sh `helm` page lists the drivers but no default. Helm `pkg/action/action.go`: `case "secret", "secrets", "":` | None |
| Validation rejects `lifecycle` and the three probes on regular init containers (QZ-12) | The Init Containers page says they are "not supported" and that validation enforces the `readinessProbe` ban. `pkg/apis/core/validation/validation.go` forbids all four ("may not be set for init containers without restartPolicy=Always") | None |
| CronJob `timeZone` defaults to the controller's time zone (C-1) | CronJob page: "the kube-controller-manager interprets schedules relative to its local time zone". `CRON_TZ`/`TZ` fails validation | None |
| Endpoints is deprecated since v1.33 (C-2, E-51) | Service page: "Endpoints (deprecated)", "Deprecated since Kubernetes v1.33" | None |
| Recreate with a `rollingUpdate` block is rejected, and the selector-mismatch error text (C-2, E-32) | apps `validation.go`: "may not be specified when strategy `type` is 'Recreate'", "`selector` does not match template `labels`" | None |
| `kubectl annotate` needs `--overwrite` (C-2) | kubectl annotate reference: "will fail unless --overwrite is set" | None |
| Events expire after about one hour (C-4) | kube-apiserver reference: `--event-ttl` Default: 1h0m0s | None |
| Restart back-off is 10 s doubling to 300 s, reset after 10 min (C-4) | Pod Lifecycle. `ReduceDefaultCrashLoopBackOffDecay` is alpha (off). `KubeletCrashLoopBackOffMax` is beta and only sets a per-node cap | None |
| The `kubectl debug --profile` default disagrees between pages (C-4, E-32) | The kubectl debug reference (v1.37) says `general` | None (no content states the default) |
| Is StatefulSet `serviceName` required? (E-11) | StatefulSet v1 API reference: only `selector` and `template` are marked required. `serviceName` is optional | None: `ckad-1b-statefulset-headless-storage` asks for it in the stem, and its `why` text only talks about DNS names |
| `create ingress` merges rules that share a host, and a trailing `*` gives Prefix (QZ-51, E-51) | kubectl `create_ingress.go` `buildIngressRules` (`getIndexHost`) and `buildHTTPIngressPath` ("If * in the End") | None |
| `set resources` on a CronJob (QZ-43) | kubectl set resources reference: "any resource that defines a pod template" | None |
| `create service <type>` and `expose`/`run -l` (tooling) | Tooling now handles both | None: no exercise depended on the old parsing. QZ-51 q6 keeps `create service nodeport` as a negative, and it is still wrong for that task |

## Not confirmed (left as is)

- C-1: an exam UI "flag" feature, and the namespace given in each task statement (no LF page documents either). Whether Docker/BuildKit auto-detects `Containerfile`.
- C-2: the `Init:Error` / `Init:CrashLoopBackOff` status strings (kubectl printer, not on kubernetes.io).
- C-5, QZ-44: `CreateContainerConfigError` for a missing ConfigMap and for `runAsNonRoot` with a root image, exit code 137, and `FailedCreate` as the event reason under a quota.
- C-6, QZ-51: the TLS Secret must be in the Ingress namespace. The chapter infers this from `secretName` having no namespace field; no page states it.
- C-7, QZ-52: busybox `wget` error strings, and the exact rejection text for `matchLabels: {access: true}`.
- E-11: whether the Docker CLI accepts `NAME:TAG@DIGEST`, and whether `--from=cj/NAME` resolves the short name.
- E-12: whether the API server or only the kubelet rejects `medium: memory` (the negative is wrong for other reasons anyway).
- E-21: the three-way-merge reasoning in `ckad-2b-resume-paused-manifest`.
- E-22: the status Helm 4 gives the previous revision after a failed upgrade.
- E-41, QZ-41: the exact multi-violation text of PodSecurity and LimitRange, and PodSecurity rejecting before ResourceQuota.
- E-43: the per-container quota requirement, and `maxLimitRequestRatio` on a `type: Pod` item (implementation, not docs).
- E-44: `kubectl set sa … shop:reporter --local` (does kubectl validate the name?).
- QZ-11: whether the kubelet picks up a Secret created after the Pod without a recreate, and whether `timeZone: Japan` is accepted.
- QZ-22: Kustomize PatchTransformer behaviour with a non-matching target, and with an SMP that names the prefixed name.
- QZ-31: `hpa.v1.autoscaling` as a resource argument.
- QZ-32: the sort order of `kubectl events` (last occurrence), and the text "error: Metrics API not available".
- QZ-42: `cm/NAME` in `set env --from`.
- QZ-43: `count/pods` with `--scopes`.
- Every object-mode `output` was written by hand. CI with real kubectl v1.37 must confirm them (generator defaults, quantity canonicalization, `.dockerconfigjson` field order, `label`/`annotate`/`set` on files).

## For a human decision

- **Parser limits not in the handled list** (`factory/exercise.ts`):
  - A joined short flag whose value contains `=` loses the value. For example, `-ojsonpath='{…}'` gives `output: jsonpath`, and `-lapp=web,…` gives `selector: app`, so these correct spellings fail today.
  - `HELM_BOOL` lacks `versions`, `force-update` and `untar`, so `helm search repo --versions acme/webapp` swallows the chart name.
  - Helm `-l` (`--versions` for `search repo`) maps to `selector`.
  - `kubectl patch -p` is not normalized to `patch`.
  - There is no op for "absent or equals" (`oneOf`/`notEquals` fail on a missing field).
  - `equals` cannot tell `"16"` from `16`.
- **Reference hosts:** kubectl.docs.kubernetes.io (the Kustomize reference: `replicas`, `labels.includeTemplates`, generator `options`/`behavior`, secretGenerator `type`), docs.docker.com and docs.podman.io cause the 20 `content:validate` warnings. kubernetes.io does not document these facts. Add these hosts to `lib/vendors.ts`, or drop the exercises.
- **Scope:** `ckad-4a-crd-manifest` (writing a CRD) under 4.1.1 "list and inspect" is borderline (E-41). Objective 3.4.2 (saving output to a file with `>`) cannot be practised because the engine refuses redirections (E-32).
- **Possible chapter additions (not errors):**
  - Chapter 22: `--reuse-values` with a new chart version keeps the old computed values; `--reset-then-reuse-values` exists on helm_upgrade. The chapter is near its word limit.
  - Chapter 32: "kubectl events lists recent events in order" could say "sorted by last occurrence" (not documented).
- **Upstream doc inconsistencies, flagged but not fixed in our content:**
  - The Deployments page still shows `--cpu-percent=80%`.
  - Debug Running Pods says `--profile` defaults to `legacy`, while the reference says `general`.
  - Configure a Pod to Use a ConfigMap still says `envFrom` skips invalid keys, which contradicts the relaxed env var names.
- **QZ-31 q10:** the startup budget follows the docs' `failureThreshold × periodSeconds` convention. A candidate who counts the failures exactly writes 21 instead of 20 and fails the check.
