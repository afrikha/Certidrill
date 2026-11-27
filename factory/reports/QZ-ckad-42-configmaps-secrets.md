# QZ-ckad-42-configmaps-secrets — report

File: `content/ckad/quizzes/42-configmaps-secrets.yaml` (10 questions, English only).

| Pos. | Objective | Type | Difficulty | What it tests |
| --- | --- | --- | --- | --- |
| 1 | 4.4.1 | single | 1 | `--from-file=<dir>`: one key per regular file, subdirectories ignored |
| 2 | 4.6.1 | single | 1 | Same key in `data` and `stringData`: `stringData` wins; `stringData` never read back |
| 3 | 4.4.2 | single | 2 | ConfigMap update: volume file refreshed, `envFrom` variable not |
| 4 | 4.6.2 | single | 2 | Decode `tls.crt` to a file: escape the dot in JSONPath, then `base64 -d` |
| 5 | 4.6.2 | multi (2 of 5) | 2 | Secret volume with `items` + `defaultMode`: only listed keys, mode applies, updates, not optional |
| 6 | 4.6.1 | command/object | 3 | `create secret generic --type=kubernetes.io/basic-auth` |
| 7 | 4.4.1 | command/object | 3 | One ConfigMap from a directory + a renamed file + a literal |
| 8 | 4.4.2 | command/invocation | 3 | `kubectl set env --from=configmap/… --keys … --prefix API_` on the live Deployment |
| 9 | 4.6.2 | manifest | 3 | Deployment: `imagePullSecrets` (Pod level), `secretKeyRef`, `envFrom` + `prefix` (sibling of `secretRef`), optional Secret volume |
| 10 | 4.4.2 | manifest | 3 | Fix a Deployment: drop `subPath` so updates arrive, `items` for one key, replace `envFrom` with two `configMapKeyRef` |

None of them repeats a bank exercise of 4.4.1/4.4.2/4.6.1/4.6.2 (16 read): no Opaque literals, TLS, docker-registry, env-file, from-file rename only, immutable, optional `configMapKeyRef`, `envFrom` override, `subPath`+args, items rename, `data`/`stringData` encoding, go-template decode, plain secret volume.

## Doubts and unverified facts

- **Q7 (directory in `body.files`)**: the files are named `conf/app.properties` and `conf/cache.properties` (the file-name regex allows `/`). I assume the application recreates the directory before running kubectl in CI; if it does not, `--from-file=conf/` fails there. Outputs (data keys sorted with `PROFILE` first, `|` blocks) are written from kubectl's usual dry-run format and were not run against a real kubectl.
- **Q6 output**: the `type: kubernetes.io/basic-auth` line placement follows the bank TLS exercise; not run against real kubectl.
- **Q8**: `--from` accepts `configmap/NAME`; I also accept `configmaps/` and `cm/` in a `oneOf` but did not verify that kubectl resolves the short name `cm/` there (no solution uses it). From memory (not on the page I fetched), kubectl `set env --from` turns each key into an upper-case name with non-alphanumeric characters replaced by `_` before adding the prefix; it does not change this exercise (the keys are already upper case), but the chapter does not say it. Worth checking for the chapter's `set env` lines.
- **basic-auth keys**: the Secrets page says the `data` field "must contain one of the following two keys" while its example marks both as required. The exercise gives both keys explicitly in the stem, so it does not depend on this.
- **Q10 / chapter**: the task page "Configure a Pod to Use a ConfigMap" still says keys that are invalid variable names are skipped by `envFrom` (`InvalidVariableNames` event), while the "Define Environment Variables" page says names may be any printable ASCII except `=` (RelaxedEnvironmentVariableValidation, GA). The chapter follows the relaxed rule (a key `log.level` becomes a variable `log.level`). Q10 does not depend on it: `envFrom` is wrong there under either rule (it cannot create `CACHE_TTL`, and under the relaxed rules it also exposes `app.yaml`, `legacy.yaml` and `cache.ttl`).
- **Q9 negatives**: unknown fields (`imagePullSecrets` under a container, `prefix` inside `secretRef`) are rejected by kubectl's default strict field validation or dropped under `--validate=false`; the `why` texts only say the field is unknown there and has no effect.

## Chapter / bank

- No error found in the chapter. Minor: the chapter's sentence on `items` ("only the listed keys become files") is confirmed by the ConfigMaps and Secrets pages; its claim that `--from-env-file` cannot be combined with `--from-file`/`--from-literal` is not on the pages I fetched (kubectl behaviour, not re-verified).
