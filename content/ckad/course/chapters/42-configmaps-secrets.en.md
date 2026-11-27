ConfigMaps hold non-sensitive configuration as key-value pairs; Secrets hold small amounts of sensitive data such as passwords, tokens and keys. The exam tasks are always the same two moves: create the object with the right keys (from literals, files or env files, or as a TLS or registry Secret), then wire it into a Pod or Deployment as environment variables or as files. Most lost points come from a wrong key name, `name` instead of `secretName`, or a namespace mismatch.

<!-- section: create-configmaps | objectives: 4.4.1 -->
## Create ConfigMaps from literals, files and env files

`kubectl create configmap NAME` takes one or more data sources. The object name must be a valid DNS subdomain name; each key may contain only letters, digits, `-`, `_` and `.`.

| Task asks for | Command | Resulting keys |
| --- | --- | --- |
| Given key-value pairs | `--from-literal=LOG_LEVEL=debug --from-literal=MODE=prod` | `LOG_LEVEL`, `MODE` |
| A file, key = file name | `--from-file=/opt/app/nginx.conf` | `nginx.conf` (basename), value = whole file |
| A file under another key | `--from-file=default.conf=/opt/app/nginx.conf` | `default.conf` |
| Every file of a directory | `--from-file=/opt/app/conf/` | One key per regular file; subdirectories and symlinks ignored |
| One key per line of a `VAR=VAL` file | `--from-env-file=/opt/app/app.env` | One key per line |

```bash
kubectl create configmap app-config -n shop \
  --from-literal=LOG_LEVEL=debug --from-literal=MAX_CONN=50

kubectl create configmap nginx-conf -n shop \
  --from-file=default.conf=/opt/web/nginx.conf

kubectl create configmap app-env -n shop --from-env-file=/opt/app/app.env

# generate the manifest instead of creating the object
kubectl create configmap app-config -n shop --from-literal=LOG_LEVEL=debug \
  --dry-run=client -o yaml > cm.yaml
```

Env file rules: each line is `VAR=VAL`; lines starting with `#` and blank lines are ignored; quotation marks get **no special handling**, so `allowed="true"` stores the value `"true"` with the quotes. `--from-env-file` can be repeated (since v1.23).

> **Exam trap.** `--from-file=app.env` stores **one** key `app.env` whose value is the whole file. `--from-env-file=app.env` stores **one key per line**. Read the task: "a key `app.env`" or "the variables of `app.env` as keys".

> **Exam trap.** `--from-env-file` can't be combined with `--from-file` or `--from-literal` in the same command; kubectl refuses it. Create two ConfigMaps, or write the manifest.

The declarative form, for values that kubectl flags can't express (multi-line files typed inline, `immutable`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: shop
data:
  LOG_LEVEL: debug
  MAX_CONN: "50"
  app.properties: |
    color=blue
    retries=3
immutable: true
```

| Field | What to know |
| --- | --- |
| `data` | UTF-8 strings. Quote numbers and booleans (`"50"`, `"true"`): values must be strings |
| `binaryData` | Base64-encoded binary values; kubectl puts non-UTF-8 files there. Keys can't overlap with `data` |
| `immutable: true` | `data` and `binaryData` can no longer change, and the flag can't be reverted: delete and recreate the ConfigMap |
| Size | A ConfigMap can't exceed 1 MiB |

Inspect with `kubectl describe configmap app-config -n shop` (shows the values) or `kubectl get configmap app-config -n shop -o yaml`.

<!-- section: consume-configmaps | objectives: 4.4.2 -->
## Consume a ConfigMap as variables or files

Three ways to use a ConfigMap, chosen from the wording of the task:

| Task asks for | Field |
| --- | --- |
| A variable with a given name from one key | `env[].valueFrom.configMapKeyRef` (`name`, `key`) |
| All keys as variables | `envFrom[].configMapRef.name`, optional `prefix` |
| All keys as files in a directory | `volumes[].configMap.name` + `volumeMounts[].mountPath` |
| Only some keys as files, or another file name | `volumes[].configMap.items` (`key`, `path`) |
| One file into an existing directory without hiding it | `volumeMounts[].subPath` |

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  containers:
  - name: api
    image: registry.example.com/shop/api:1.4
    env:
    - name: APP_LOG_LEVEL            # variable name chosen freely
      valueFrom:
        configMapKeyRef:
          name: app-config           # ConfigMap
          key: LOG_LEVEL             # key inside it
    envFrom:
    - configMapRef:
        name: app-env
      prefix: CFG_                   # CFG_<key> for every key
    volumeMounts:
    - name: conf
      mountPath: /etc/app
      readOnly: true
  volumes:
  - name: conf
    configMap:
      name: app-config
      items:
      - key: app.properties
        path: app.properties         # file /etc/app/app.properties
```

With `items`, **only** the listed keys become files; without `items`, every key becomes a file named after the key. `path` is relative and may include subdirectories (`conf/app.properties`). `defaultMode` (on the volume) and `mode` (per item) set file permissions; the default is `0644`.

For a Deployment, the same fields go under `spec.template.spec`. kubectl can add the variables without an editor:

```bash
# one env entry with valueFrom per key of the ConfigMap
kubectl set env deployment/api -n shop --from=configmap/app-config
kubectl set env deployment/api -n shop --from=configmap/app-config --keys=LOG_LEVEL --prefix=APP_
kubectl set env deployment/api -n shop --list          # check the result
```

`kubectl set env --from` writes one `env` entry per key (with `configMapKeyRef`), not an `envFrom` block: both satisfy "expose the keys as variables", but not "use `envFrom`". It also renames each key: upper case, every character other than a letter, a digit or `_` replaced by `_` (`log.level` gives `LOG_LEVEL`), then `--prefix` in front.

Behaviour to predict:

| Situation | Result |
| --- | --- |
| ConfigMap or key missing, reference not `optional` | The container doesn't start (`CreateContainerConfigError` for variables) |
| Reference marked `optional: true` | Variable empty or file absent; the Pod starts |
| ConfigMap updated, consumed as a volume | Files updated after a delay (kubelet sync period plus cache delay) |
| ConfigMap updated, consumed as variables or with `subPath` | **No update**: restart the Pods (`kubectl rollout restart deployment/api`) |
| ConfigMap in another namespace | Not possible: Pod and ConfigMap must share the namespace |

> **Exam trap.** A ConfigMap volume mounted on `/etc/nginx` hides every file the image had in `/etc/nginx`. To add one file to a populated directory, mount with `mountPath: /etc/nginx/conf.d/default.conf` and `subPath: default.conf`, knowing that `subPath` mounts don't receive updates.

> **Exam trap.** `envFrom` keeps each key as the variable name. A key such as `log.level` becomes a variable `log.level`, which a shell can't read as `$log.level`. When the task names the variable, use `env` with `valueFrom` and choose the name.

<!-- section: create-secrets | objectives: 4.6.1 -->
## Create generic, TLS and docker-registry Secrets

`kubectl create secret` has three subcommands, each producing a built-in type:

| Task asks for | Command | `type` | Keys |
| --- | --- | --- | --- |
| Arbitrary credentials | `kubectl create secret generic` | `Opaque` (default) | Your keys (`--from-literal`, `--from-file`, `--from-env-file`) |
| A certificate and key for TLS (Ingress) | `kubectl create secret tls --cert --key` | `kubernetes.io/tls` | `tls.crt`, `tls.key` |
| Registry credentials for image pulls | `kubectl create secret docker-registry` | `kubernetes.io/dockerconfigjson` | `.dockerconfigjson` |

```bash
kubectl create secret generic db-cred -n shop \
  --from-literal=username=shop_app --from-literal=password='S3cr3t!$x'

kubectl create secret generic api-key -n shop --from-file=key=/opt/keys/api.key

kubectl create secret tls web-tls -n shop \
  --cert=/opt/certs/web.crt --key=/opt/certs/web.key

kubectl create secret docker-registry regcred -n shop \
  --docker-server=registry.example.com \
  --docker-username=ci-bot --docker-password='p@ss' --docker-email=ci@example.com

kubectl create secret generic db-cred -n shop --from-literal=password=x \
  --dry-run=client -o yaml > secret.yaml
```

Flag details: `--type` on `generic` sets another type (for example `kubernetes.io/basic-auth`); `tls` needs both `--cert` (PEM) and `--key`; `docker-registry` needs a username and password, `--docker-server` defaults to `https://index.docker.io/v1/` and `--docker-email` is optional. Put values with `$`, `!` or `*` in single quotes, or the shell changes them.

In a manifest, `data` values must be **base64-encoded**; `stringData` takes plain text and is encoded by the API server. If a key appears in both, `stringData` wins.

```bash
echo -n 'shop_app' | base64        # c2hvcF9hcHA=   (-n: no trailing newline)
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-cred
  namespace: shop
type: Opaque
data:
  username: c2hvcF9hcHA=
stringData:
  password: S3cr3t!x
```

| Built-in type | Use |
| --- | --- |
| `Opaque` | Arbitrary data; an empty `type` is treated as `Opaque` |
| `kubernetes.io/tls` | Certificate and key; the API server requires `tls.crt` and `tls.key` |
| `kubernetes.io/dockerconfigjson` | Serialized `~/.docker/config.json`, referenced by `imagePullSecrets` |
| `kubernetes.io/basic-auth`, `kubernetes.io/ssh-auth` | Username/password, SSH private key |
| `kubernetes.io/service-account-token` | Long-lived ServiceAccount token (legacy) |

Secrets are limited to 1 MiB each and accept `immutable: true` like ConfigMaps.

> **Exam trap.** Base64 is an encoding, not encryption. Secrets are stored unencrypted in etcd unless encryption at rest is configured; anyone allowed to read the Secret (or to create a Pod in its namespace) can read the value.

> **Exam trap.** `echo 'value' | base64` encodes a trailing newline, and the application receives `value` plus a newline. Use `echo -n`, or let kubectl or `stringData` do the encoding.

<!-- section: consume-secrets | objectives: 4.6.2 -->
## Consume and decode Secrets

The fields mirror ConfigMaps, with `secret` in the names:

| Task asks for | Field |
| --- | --- |
| One variable from one key | `env[].valueFrom.secretKeyRef` (`name`, `key`) |
| All keys as variables | `envFrom[].secretRef.name`, optional `prefix` |
| Keys as files | `volumes[].secret.secretName` + `volumeMounts[]` |
| Some keys, other paths, permissions | `volumes[].secret.items` (`key`, `path`, `mode`), `defaultMode` |
| Registry credentials | `spec.imagePullSecrets[].name` |

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders
  template:
    metadata:
      labels:
        app: orders
    spec:
      imagePullSecrets:
      - name: regcred
      containers:
      - name: orders
        image: registry.example.com/shop/orders:2.1
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-cred
              key: password
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls
        secret:
          secretName: web-tls        # not "name"
          defaultMode: 0400
```

This mounts `/etc/tls/tls.crt` and `/etc/tls/tls.key` with mode `0400`. Without `defaultMode`, files get `0644`. In YAML, write the mode in octal (`0400`); in JSON, use the decimal value (`256`).

```bash
kubectl set env deployment/orders -n shop --from=secret/db-cred     # one secretKeyRef per key
```

Decoding a value, as a task that asks "write the password to `/opt/out/pass.txt`" expects:

```bash
kubectl get secret db-cred -n shop -o jsonpath='{.data.password}' | base64 -d
kubectl get secret db-cred -n shop -o jsonpath='{.data.password}' | base64 -d > /opt/out/pass.txt
kubectl get secret web-tls -n shop -o jsonpath='{.data.tls\.crt}' | base64 -d   # escape the dot
kubectl describe secret db-cred -n shop     # shows key names and sizes in bytes, never values
```

| Situation | Result |
| --- | --- |
| Secret missing, reference not optional | No container starts until the Secret exists; the kubelet retries and reports an event |
| Key missing in an existing Secret | The Pod fails at startup |
| Secret updated, mounted as a volume | Files updated eventually |
| Secret updated, used in variables or `subPath` | No update until the container restarts |
| `imagePullSecrets` Secret in another namespace | Image pull fails (`ImagePullBackOff`): the Secret must be in the Pod's namespace |

> **Exam trap.** The ConfigMap volume source uses `configMap.name`, the Secret volume source uses `secret.secretName`. Writing `secret.name` fails validation; it is the most common typo in Secret tasks.

> **Exam tip.** In `-o jsonpath`, a key containing dots must be escaped (`{.data.tls\.crt}`), or kubectl reads it as a nested path and prints nothing.

<!-- section: key-points -->
## Key points

- `--from-literal` for pairs, `--from-file` for whole files (key = basename or `key=path`), `--from-env-file` for one key per line; env-file sources can't be mixed with the others.
- `env.valueFrom` picks one key and names the variable; `envFrom` imports all keys (optional `prefix`); a volume turns keys into files, `items` selects them.
- Variables and `subPath` mounts never see updates: restart the workload. Volume mounts update after a delay.
- `generic` = `Opaque`, `tls` = `tls.crt`/`tls.key`, `docker-registry` = `.dockerconfigjson` used by `imagePullSecrets`.
- `data` is base64 (`echo -n`), `stringData` is plain text and wins on conflict; decode with `jsonpath` piped to `base64 -d`.
- Secret volume: `secretName`, default mode `0644`; ConfigMaps and Secrets must be in the Pod's namespace.
