# E-ckad-11-images-workloads — report

32 exercises in `content/ckad/questions/design/` (31 new, plus the existing model `ckad-1b-create-deployment-replicas`), 4 per objective (1.1.1–1.1.4, 1.2.1–1.2.4).
Mix: 15 `command` (9 invocation, 6 object) / 17 `manifest`, about 47 / 53 %. Difficulty: 7 × 1, 16 × 2, 9 × 3.
Checks: `check-exercise.ts ckad ckad-1a- ckad-1b-` → 0 problem(s); `content:validate --prefix ckad-1a-` → 0 problem(s), 12 warnings; `--prefix ckad-1b-` → 0 problem(s), 0 warnings.

## Doubts and deviations

- **No kubectl in this environment.** I wrote the object-mode `output` blocks from what I know of kubectl v1.37 client dry-run output, so CI should confirm them. These are the points I am least sure of:
  - `kubectl create job` / `create cronjob` print `template.metadata: {}` (once `creationTimestamp` is dropped), and `create cronjob` prints `jobTemplate.metadata.name: <name>`. No check reads these fields.
  - `kubectl create secret docker-registry`: the base64 of `.dockerconfigjson` was computed for the JSON `{"auths":{"<server>":{"username","password","auth"}}}`, with `email` omitted when it is empty. The check only matches the fixed base64 prefix of `{"auths":{"registry.example.com":`.
  - `kubectl create secret generic` (a negative) prints no `type` field.
  - The `kubectl run` output includes `dnsPolicy: ClusterFirst`.
- **Docker/Podman parsing.** `parseCommand` has no short-flag table for generic tools. So `-t`/`--tag`, `-f`/`--file`, `-o`/`--output` and `-i`/`--input` are checked with `matches` on the JSON of `flags`, and repeated flags (arrays) are accepted. I avoided `docker run` because generic boolean flags (`--rm`, `-d`) would swallow the next word. `docker buildx build` and `docker image build` are not accepted as solutions. `podman image save` and `docker image load` are accepted.
- **Podman with several `-t` flags** is not documented on the podman-build page, so `ckad-1a-build-two-tags-context` is Docker only.
- **Pull by digest:** only `NAME@sha256:…` is accepted. `NAME:TAG@DIGEST` is not, because I could not verify that the Docker/Podman CLI accepts it. kubernetes.io accepts it in a Pod `image` field.
- **`--from=cj/report`:** I believe `create job --from` resolves short names, but I did not verify it. The check accepts `cronjob|cronjobs|cj` with an optional `.batch`.
- **ServiceAccount imagePullSecrets:** the task page shows this only for the `default` ServiceAccount. The exercise relies on the ServiceAccount admission controller doing the same for any ServiceAccount named in `serviceAccountName`.
- **`podFailurePolicy` requires `restartPolicy: Never`:** the Jobs concept page states this. The pod-failure-policy task page only shows it in its examples.
- **StatefulSet `serviceName`:** the page does not say whether it is required in v1.37. The exercise checks it because the per-Pod DNS names depend on it.
- **References outside the allowed hosts:** docs.docker.com and docs.podman.io cause the 12 validator warnings on `ckad-1a-` (image build/save/load/push/pull exercises). kubernetes.io does not document these CLIs.
- The chapter `11-images-workloads.en.md` was not used; facts come from kubernetes.io, docs.docker.com and docs.podman.io.
- Practical note: other agents' files under `content/ckad/questions/` sometimes failed YAML parsing mid-edit, which crashes `check-exercise.ts` for everyone. I validated my files in a private copy until the shared tree parsed again.
