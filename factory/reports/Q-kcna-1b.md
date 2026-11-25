# Q-kcna-1b — KCNA questions, domain fundamentals (2026-11-23)

## Result
60 `single` questions in `content/kcna/questions/fundamentals/kcna-1b-*.yaml`, English only, 12 each for 1.1.6, 1.1.7, 1.2.1, 1.2.2, 1.2.3. Difficulty 24 easy / 27 medium / 9 hard. Correct answers: 15 each for a, b, c and d. Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-1b-` returns 0 problems, and so does `npm run content:validate -- --cert kcna --prefix kcna-1b-`.

## Sources fetched (kubernetes.io)
ConfigMaps; Secrets; Configure a Pod to Use a ConfigMap; Volume Types (configMap section); Custom Resources; Extend the Kubernetes API with CustomResourceDefinitions; Operator pattern; Extending Kubernetes; Kubernetes Object Management; Objects In Kubernetes; Object Names and IDs; Command line tool (kubectl); kubectl explain; kubectl api-resources; kubectl api-versions; kubectl Quick Reference; Declarative Management of Kubernetes Objects Using Configuration Files; Managing Workloads; Organizing Cluster Access Using kubeconfig Files; Configure Access to Multiple Clusters; Authenticating.

## Duplicates avoided
- I removed two of my drafts because other batches already test the same decision with the same answer: an optional `configMapKeyRef` with a missing ConfigMap (`kcna-3b-cfg-optional-configmap`) and `imagePullSecrets` for a private registry (`kcna-1d-image-pull-secrets`, `kcna-3b-cfg-*`). I replaced them with the Secret type `kubernetes.io/tls` and the path of a ConfigMap `items` entry.
- I reworded `kcna-1b-configmap-purpose` (ConfigMap vs Secret/PVC/ServiceAccount) so that it does not repeat the "config outside the image" decision of `kcna-4a-config-in-env` and `kcna-3a-config-per-environment`.
- `kcna-1b-apply-recursive` uses `-k` only as a distractor ("no kustomization file"), which complements `kcna-3a-apply-k`.
- No `kcna-1a-*` files existed when I checked (objectives 1.1.1–1.1.5). Once they exist, someone should check them against `kcna-1b-manifest-kind` and `kcna-1b-deployment-apiversion-fix` (manifest fields and the `apps/v1` group), which are close to 1.1.3.

## Doubts and facts not verified on a fetched page (taken from standard behavior)
- `kubectl create` fails when the object exists (AlreadyExists), and `kubectl replace` fails when it does not. Explanations in `kcna-1b-apply-idempotent`, `kcna-1b-apply-recursive` and `kcna-1b-same-name-apply` use the first fact. `kcna-1b-apply-idempotent` words `replace` without stating the second.
- A Deployment's default `replicas` is 1 (`kcna-1b-apply-keeps-scale`, option a). The declarative-config page shows that apply keeps a value set by `kubectl scale`, but I did not fetch the default.
- `imagePullPolicy` values, `fieldRef`/`resourceFieldRef` (`kcna-1b-configmapkeyref` distractors), the `kubernetes.io/change-cause`, `deployment.kubernetes.io/revision` and `kubectl.kubernetes.io/restartedAt` annotations (`kcna-1b-last-applied-annotation` distractors), and APIService as the aggregation registration object come from general Kubernetes knowledge. They are not quoted from the pages I fetched.
- The Volume Types page does not say explicitly that `items` projects only the listed keys, so `kcna-1b-configmap-items-path` tests only the resulting path, which the page does state.
- `kcna-1b-unknown-field-strict` relies on "since v1.25, default `--validate=true` = Strict" from Objects In Kubernetes. The exact error text is not quoted.
