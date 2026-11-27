Helm and Kustomize are the two packaging tools the CKAD tests. Helm installs **charts** (templated packages) as named **releases** that it tracks revision by revision; Kustomize renders plain YAML from a **base** plus **overlays**, without templates, and is built into kubectl. Exam tasks are short and operational: add a repository, install a chart version into a namespace with a value changed, upgrade or roll back a release, write a `kustomization.yaml` that sets a namespace, an image tag or a generated ConfigMap, and apply it with `-k`. The commands below follow the helm.sh documentation (Helm 4, which keeps the Helm 3 command set) and kubectl v1.37.

<!-- section: helm-repositories | objectives: 2.3.1 -->
## Helm repositories, search and chart values

A chart repository is an HTTP server with an `index.yaml`. Helm keeps the list of repositories you added locally and caches their indexes; `search repo` reads that local cache, so update it before searching.

```bash
helm repo add example https://charts.example.com     # name + URL
helm repo update                                     # refresh every cached index
helm repo list
helm search repo example/web                         # latest stable version per chart
helm search repo example/web --versions              # every version (-l)
helm search repo web --version '^2.0.0'              # semver constraint
helm repo remove example
```

| Task asks for | Command |
| --- | --- |
| Make charts from a URL available as `example` | `helm repo add example https://charts.example.com` |
| See a chart version published after you added the repo | `helm repo update`, then `helm search repo` |
| Which chart versions exist | `helm search repo example/web --versions` |
| Include pre-releases (alpha, beta, rc) | `--devel` |
| The default values of a chart | `helm show values example/web --version 1.4.2` |
| Chart metadata (`Chart.yaml`, appVersion) | `helm show chart example/web` |
| Download the chart to edit or inspect it | `helm pull example/web --version 1.4.2 --untar` |

> **Exam trap.** `helm search repo` shows only the **latest stable** version of each chart. If the task names an older version, list them with `--versions`; if a version is missing although the repository has it, run `helm repo update` first.

> **Exam tip.** Besides `<repo>/<chart>` (`example/web`), a chart can be a local directory (`./web`), a `.tgz` file or an `oci://` reference, with no repository to add.

<!-- section: helm-install-upgrade | objectives: 2.3.2 -->
## Installing, upgrading and previewing a release

`helm install [NAME] [CHART]` creates release `NAME` in the namespace of `-n` (or the current context's namespace). A release name is unique within its namespace.

```bash
helm install web example/web -n shop --create-namespace \
  --version 1.4.2 -f values-prod.yaml --set replicaCount=3 --set image.tag=1.27
helm upgrade web example/web -n shop --version 1.5.0 --reuse-values
helm upgrade --install web example/web -n shop -f values-prod.yaml   # install or upgrade
```

| Flag | Effect |
| --- | --- |
| `-n, --namespace` | Namespace of the release and, normally, of its objects |
| `--create-namespace` | Create that namespace if it does not exist |
| `--version` | Chart version (exact or a range such as `^2.0.0`); latest stable if omitted |
| `-f, --values` | A values file or URL; repeatable, the **rightmost** file wins |
| `--set key=value` | One value; repeatable or comma-separated; last one wins for a key |
| `--set-string` | Force the value to a string: `--set` turns `true`, `false`, `null` and integers into typed values, so use `--set-string image.tag=1234` |
| `--wait`, `--timeout` | Wait until the resources are ready (timeout default `5m0s`) |
| `-i, --install` (upgrade) | Install the release if it does not exist yet |
| `--reuse-values` (upgrade) | Keep the previous release's values and merge the new `--set`/`-f` |
| `--reset-values` (upgrade) | Go back to the chart's built-in values |

`--set` paths follow the structure of `values.yaml`: `image.tag=1.27` sets `image: {tag: "1.27"}`, `ingress.hosts[0].host=web.example.com` sets an element of a list. Precedence, lowest to highest: the chart's `values.yaml`, `-f` files in order, then `--set` flags.

```yaml
# values-prod.yaml, passed with -f
replicaCount: 3
image:
  tag: "1.27"
service:
  type: NodePort
```

Preview before you install, or render YAML to a file when a task asks for the manifests:

```bash
helm install web example/web -n shop --dry-run=client   # rendered manifests, nothing installed
helm template web example/web -n shop -f values-prod.yaml > /tmp/web.yaml
helm template web example/web --show-only templates/service.yaml
```

`helm template` renders locally, without the cluster, and creates no release: objects applied from its output are not tracked by Helm. `helm install --dry-run` also creates no release: a bare `--dry-run` still means `client` but is deprecated in Helm 4 (it prints a warning), and `--dry-run=server` lets the API server validate the objects.

> **Exam trap.** On `helm upgrade`, values you passed to the previous revision are **not** carried over once you pass new `--set` or `-f` flags: add `--reuse-values` or repeat every value. Upgrading with only `--set image.tag=1.28` can silently drop the `replicaCount=3` set at install time.

> **Exam trap.** `-n shop` without `--create-namespace` fails if `shop` does not exist. Flags go anywhere on the line, but the order of the two arguments is fixed: **release name first, chart second** (`helm install web example/web`).

Helm 4 renamed `--atomic` to `--rollback-on-failure` and `--force` to `--force-replace`: check `helm version` on the exam host.

<!-- section: helm-releases | objectives: 2.3.3 -->
## Inspecting, rolling back and uninstalling releases

Helm stores every revision of a release as a Secret in the release namespace. Each install, upgrade and rollback creates a new revision.

```bash
helm list -n shop                 # releases in one namespace
helm list -A                      # all namespaces
helm status web -n shop           # status, revision, notes, last deployed
helm get values web -n shop       # values supplied by the user
helm get values web -n shop --all             # computed values (chart defaults included)
helm get manifest web -n shop     # the YAML Helm applied
helm history web -n shop          # REVISION, STATUS, CHART, APP VERSION, DESCRIPTION
helm rollback web 2 -n shop       # back to revision 2 (creates a new revision)
helm rollback web -n shop         # no revision: back to the previous one
helm uninstall web -n shop
helm uninstall web -n shop --keep-history
```

Sample `helm history` output, without the UPDATED column:

```text
REVISION  STATUS      CHART      APP VERSION  DESCRIPTION
1         superseded  web-1.4.2  1.27.0       Install complete
2         superseded  web-1.5.0  1.28.0       Upgrade complete
3         deployed    web-1.4.2  1.27.0       Rollback to 1
```

| Task asks for | Command |
| --- | --- |
| Find the release that runs in namespace `shop` | `helm list -n shop` |
| Save the values a release was installed with | `helm get values web -n shop -o yaml > /tmp/values.yaml` |
| Chart version and status of each revision | `helm history web -n shop` |
| Return to the version before the last upgrade | `helm rollback web -n shop` |
| Remove the release and its objects | `helm uninstall web -n shop` |
| Remove the objects but keep history for audit | `helm uninstall web -n shop --keep-history` |
| List releases in a given state | `--deployed`, `--failed`, `--pending`, `--superseded`, `--uninstalled` |

> **Exam trap.** A rollback does not rewind the revision counter: rolling back from revision 3 to revision 1 creates **revision 4** with the content of revision 1. Its description reads `Rollback to 1`.

> **Exam trap.** Releases are namespaced. `helm list`, `helm status` and `helm uninstall` without `-n` look only in the current namespace and report nothing, or `release: not found`, for a release in `shop`.

Helm 3 lists only deployed and failed releases unless you add `-a`; Helm 4 lists every status by default.

<!-- section: kustomization | objectives: 2.4.1 -->
## Writing and applying a kustomization

Kustomize reads a directory that contains `kustomization.yaml`, loads the listed resources, applies transformations and prints the result. kubectl embeds it: no extra binary is needed.

```bash
kubectl kustomize ./app            # render to stdout, no cluster change
kubectl apply -k ./app             # render and apply (--kustomize)
kubectl diff -k ./app
kubectl delete -k ./app
kubectl kustomize ./app > /tmp/app.yaml   # when the task asks for the rendered file
```

Generate the resource files imperatively, then write the kustomization:

```bash
kubectl create deployment web --image=nginx:1.27 --dry-run=client -o yaml > app/deployment.yaml
kubectl create service clusterip web --tcp=80:80 --dry-run=client -o yaml > app/service.yaml
```

```yaml
# app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
- service.yaml
namespace: shop
namePrefix: prod-
labels:
- pairs:
    team: payments
  includeSelectors: false
images:
- name: nginx
  newName: registry.example.com/nginx
  newTag: "1.27.3"
replicas:
- name: web
  count: 4
```

| Field | Effect |
| --- | --- |
| `resources` | Files, directories with their own kustomization (bases), or remote URLs |
| `namespace` | Sets `metadata.namespace` on every namespaced resource |
| `namePrefix`, `nameSuffix` | Added to every resource name; references inside the build (a ConfigMap in a volume, a Service in an Ingress backend) are updated |
| `labels` | `pairs` added to `metadata.labels`; `includeSelectors: true` also adds them to selectors and Pod templates, `includeTemplates: true` to Pod templates only; both default to `false` |
| `commonLabels` | Deprecated since Kustomize v5.0.0: adds labels **and** selectors everywhere |
| `images` | `name` matches the image name without tag; `newName`, `newTag` or `digest` replace parts of it |
| `replicas` | `name` and `count` for a Deployment, ReplicaSet, ReplicationController or StatefulSet |

> **Exam trap.** The `namespace` field does not create the namespace. Create it first (`kubectl create namespace shop`) or list a Namespace manifest under `resources`.

> **Exam trap.** `-k` takes a **directory**, not the `kustomization.yaml` file, and cannot be combined with `-f`. `kubectl apply -f app/` applies the raw files and ignores the kustomization.

> **Exam trap.** Adding labels to the selectors of a Deployment that already exists fails, because `spec.selector` is immutable. Prefer `labels` with `includeSelectors: false` for labels added after the first deployment.

<!-- section: kustomize-generators | objectives: 2.4.2 -->
## ConfigMap and Secret generators

Generators build ConfigMaps and Secrets from literals and files, and append a hash of the content to the name (`app-config-8mbdf7882g`). Kustomize rewrites every reference to the generated name in the same build (volumes, `envFrom`, `valueFrom`), so a content change produces a new name and triggers a rollout of the Pods that use it.

```yaml
configMapGenerator:
- name: app-config
  literals:
  - LOG_LEVEL=info
  - FEATURE_X=true
  files:
  - application.properties          # key = file name
  - nginx.conf=conf/site.conf       # custom key = path
- name: app-env
  envs:
  - app.env                         # each KEY=VALUE line becomes a key
secretGenerator:
- name: db-credentials
  literals:
  - username=app
  - password=s3cr3t
- name: web-tls
  type: kubernetes.io/tls
  files:
  - tls.crt=certs/web.crt
  - tls.key=certs/web.key
generatorOptions:
  disableNameSuffixHash: true       # optional: exact names, for every generator here
  labels:
    generated: "true"
```

| Source | Result |
| --- | --- |
| `literals: [K=V]` | One key per literal |
| `files: [name]` | One key named after the file, the whole file as value |
| `files: [key=path]` | One key with a custom name |
| `envs: [file]` | One key per `KEY=VALUE` line of the env file |
| `type` (secretGenerator) | Secret type, `Opaque` by default; `kubernetes.io/tls` needs keys `tls.crt` and `tls.key` |
| `behavior` | `create` (default), `merge` or `replace` an entry of the same name from a base |

Secret values are base64-encoded in the output: the files and literals hold plain text.

> **Exam trap.** The Deployment refers to `app-config`, the cluster contains `app-config-8mbdf7882g`. That is expected. If a task requires the exact name `app-config`, set `disableNameSuffixHash: true` (in `generatorOptions`, or in the entry's `options`).

> **Exam trap.** `files` and `envs` are different: `files: [app.env]` creates **one** key `app.env` containing the whole file, `envs: [app.env]` creates one key per line. The same difference exists between `kubectl create configmap --from-file` and `--from-env-file`.

<!-- section: kustomize-overlays | objectives: 2.4.3 -->
## Overlays and patches

A **base** is a kustomization that knows nothing about its overlays. An **overlay** is a kustomization that lists the base under `resources` and adds its own changes.

```text
app/
  base/
    kustomization.yaml     # resources: deployment.yaml, service.yaml
    deployment.yaml
    service.yaml
  overlays/
    prod/
      kustomization.yaml
      replicas-resources.yaml
```

```yaml
# app/overlays/prod/kustomization.yaml
resources:
- ../../base
namespace: shop-prod
nameSuffix: "-prod"
patches:
- path: replicas-resources.yaml          # strategic merge, target from the file
- target:
    kind: Deployment
    name: web
  patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/image
      value: nginx:1.28
    - op: add
      path: /spec/template/metadata/annotations
      value:
        release: prod
```

```yaml
# app/overlays/prod/replicas-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: nginx
        resources:
          limits:
            memory: 512Mi
```

```bash
kubectl kustomize app/overlays/prod
kubectl apply -k app/overlays/prod
```

| Patch type | Looks like | Target | Use it for |
| --- | --- | --- | --- |
| Strategic merge | A partial manifest with `apiVersion`, `kind`, `metadata.name` | From the patch itself (or `target`) | Changing fields; lists such as `containers` merge by `name` |
| JSON 6902 | A list of `op`, `path`, `value` (`add`, `remove`, `replace`, `move`, `copy`, `test`) | `target` is mandatory | A precise path, a list index, removing a field |

`target` selects by `group`, `version`, `kind`, `name`, `namespace`, `labelSelector` or `annotationSelector`; `name` is a regular expression anchored at both ends. JSON 6902 paths use `/` separators and list indexes (`/spec/template/spec/containers/0/image`); `/-` appends to a list.

> **Exam trap.** In a strategic merge patch, a container is matched by `name`. A patch that names a container `web` when the base container is `nginx` adds a **second** container instead of changing the first.

> **Exam trap.** `patchesStrategicMerge` and `patchesJson6902` are deprecated since Kustomize v5.0.0; `bases:` is older still. Write a single `patches:` list and put base directories under `resources`. Patches refer to the base names, before the overlay's prefix or suffix.

<!-- section: key-points -->
## Key points

- `helm repo add`, `helm repo update`, `helm search repo --versions`, `helm show values`: find the chart, the version and the key to change.
- `helm install NAME CHART -n ns --create-namespace --version v -f file --set k=v`; `--set` beats `-f`, the last `-f` beats earlier ones.
- `helm upgrade --install` installs or upgrades; add `--reuse-values` or repeat every value; `helm template` and `--dry-run` preview without a release.
- `helm list -A`, `status`, `get values [--all]`, `get manifest`, `history`, `rollback NAME [REV]` (a new revision), `uninstall [--keep-history]`, always with `-n`.
- `kubectl kustomize DIR` renders, `kubectl apply -k DIR` applies; `namespace`, `namePrefix`, `labels`, `images`, `replicas` cover most edits.
- Generators append a content hash and update references; `disableNameSuffixHash: true` keeps the exact name; `files` gives one key per file, `envs` one key per line.
- Overlays list the base under `resources` and use `patches`: strategic merge matches list items by `name`, JSON 6902 needs a `target`.
