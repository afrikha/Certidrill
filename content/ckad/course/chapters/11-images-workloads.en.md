An application reaches Kubernetes as a container image, and runs inside a workload resource that keeps it alive, runs it once or runs it on a schedule. The exam asks you to fix a Dockerfile, build and save an image, override the command a container runs, pull from a private registry, and create Pods, Deployments, Jobs and CronJobs with the right fields at the right level. Every task here is solved faster with a generator: `kubectl run` or `kubectl create` with `--dry-run=client -o yaml`, then a few edits.

<!-- section: dockerfile | objectives: 1.1.1 -->
## Writing a Dockerfile or Containerfile

A Dockerfile and a Containerfile have the same syntax. `podman build .` finds a file named `Containerfile` or `Dockerfile` in the context; `docker build .` looks for `Dockerfile`; any other name needs `-f`.

| Instruction | Does | Remember |
| --- | --- | --- |
| `FROM image:tag AS name` | Starts a build stage from a base image | `AS name` names the stage for multi-stage builds |
| `WORKDIR /app` | Sets the working directory | Created if missing |
| `COPY src dest` | Copies files from the build context | `--from=stage` copies from an earlier stage; `--chown=user:group` sets the owner (UID and GID 0 otherwise) |
| `RUN cmd` | Runs a command at build time, adds a layer | Chain package installs and clean-up in one `RUN` |
| `ENV KEY=value` | Sets a variable kept in the image and in running containers | `ARG` is for build-time values only, not kept in the image |
| `EXPOSE 8080` | Documents the listening port | Does not publish anything |
| `USER 1001` | Runs the next instructions and the container as this user | Use a UID, so that `runAsNonRoot` can verify it |
| `ENTRYPOINT ["app"]` | The executable | Exec form (JSON array) runs without a shell |
| `CMD ["--port", "8080"]` | Default arguments, or the default command when there is no `ENTRYPOINT` | Only the last `CMD` counts |

A multi-stage build compiles in a large image and ships only the result in a small one:

```text
FROM golang:1.25 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api .

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /api
USER 65532
EXPOSE 8080
ENTRYPOINT ["/api"]
```

> **Exam trap.** With the shell form (`ENTRYPOINT app --port 8080`), the command runs under `/bin/sh -c`, `CMD` is ignored and the process does not receive signals as PID 1. When a task asks for arguments that can be overridden, use the exec form of both `ENTRYPOINT` and `CMD`.

<!-- section: build-push | objectives: 1.1.2 -->
## Building, tagging, saving and pushing images

Docker and Podman share the same verbs; replace `docker` with `podman` when the host has only Podman.

```bash
docker build -t registry.example.com/shop/api:1.4 .
podman build -t registry.example.com/shop/api:1.4 -f Containerfile .
docker tag registry.example.com/shop/api:1.4 registry.example.com/shop/api:stable
docker push registry.example.com/shop/api:1.4
docker save -o /opt/exam/api-1.4.tar registry.example.com/shop/api:1.4
docker load -i /opt/exam/api-1.4.tar
podman save --format oci-archive -o /opt/exam/api-oci.tar registry.example.com/shop/api:1.4
docker images --digests registry.example.com/shop/api
```

| Task asks for | Command |
| --- | --- |
| Build from the current directory with a name and tag | `build -t name:tag .` |
| Build from a file with another name or place | `build -f path/Containerfile -t name:tag .` (the last argument is the context) |
| A second name for the same image | `tag source target` |
| Upload to a registry | `push name:tag` (the name starts with the registry host) |
| Export to a tar file | `save -o file.tar name:tag`; Podman's default format is `docker-archive`, `--format oci-archive` for OCI |
| Import a tar file | `load -i file.tar` |

A tag is a movable pointer; a digest (`sha256:...`) identifies the exact content. To pin an image, reference it by digest:

```yaml
image: registry.example.com/shop/api@sha256:1ff6c18fbef2045af6b9c16bf034cc421a29027b800e4f9b68ae9b1cb3e9ae07
```

> **Exam trap.** An image built with Docker or Podman on a host stays in that tool's local storage. The kubelet pulls through the container runtime (containerd, CRI-O), which does not see it. A Pod can use the image only after it is pushed to a registry the nodes can reach.

<!-- section: command-args | objectives: 1.1.3 -->
## Running an image with command, args and imagePullPolicy

| Pod sets | Container runs |
| --- | --- |
| Neither | The image's `ENTRYPOINT` with its `CMD` |
| `args` only | The image's `ENTRYPOINT` with your `args` |
| `command` only | Your `command`; the image's `CMD` is ignored |
| `command` and `args` | Your `command` with your `args` |

`command` replaces `ENTRYPOINT`, `args` replaces `CMD`. Variables are expanded only in the `$(VAR)` form; for pipes, loops or `&&`, run a shell:

```yaml
containers:
- name: worker
  image: busybox:1.37
  env:
  - name: TARGET
    value: payments
  command: ["/bin/sh", "-c"]
  args: ["while true; do echo checking $(TARGET); sleep 10; done"]
```

The generators place what follows `--` differently:

```bash
k run tool --image=busybox:1.37 -n shop -- sleep 3600              # args: [sleep, "3600"]
k run tool --image=busybox:1.37 -n shop --command -- sleep 3600    # command: [sleep, "3600"]
k create deployment tool --image=busybox:1.37 -n shop -- sleep 3600   # command
k create job once --image=busybox:1.37 -n shop -- date                # command
```

When `imagePullPolicy` is omitted, the API server sets it when the object is created:

| Image reference | Default policy |
| --- | --- |
| Tag `:latest`, or no tag | `Always` |
| Another tag (`nginx:1.27`) | `IfNotPresent` |
| A digest (`@sha256:...`) | `IfNotPresent` |

`Never` uses only an image already on the node and fails otherwise. The default is not recomputed when the tag changes later.

> **Exam trap.** `command` and `args` cannot be changed on a running Pod. Export it with `k get pod tool -o yaml > tool.yaml`, edit, then `k replace --force -f tool.yaml`. On a Deployment, edit the template: a new rollout replaces the Pods.

<!-- section: private-registry | objectives: 1.1.4 -->
## Pulling from a private registry

Create a Secret of type `kubernetes.io/dockerconfigjson` in the namespace of the Pod, then reference it:

```bash
k create secret docker-registry regcred -n shop \
  --docker-server=registry.example.com \
  --docker-username=ci-bot --docker-password='S3cr3t!'
k create secret generic regcred -n shop \
  --from-file=.dockerconfigjson=/root/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: api
  namespace: shop
spec:
  imagePullSecrets:
  - name: regcred
  containers:
  - name: api
    image: registry.example.com/shop/api:1.4
```

To give every new Pod of a ServiceAccount the secret, patch the ServiceAccount:

```bash
k patch serviceaccount default -n shop -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

Without valid credentials the Pod shows `ErrImagePull`, then `ImagePullBackOff`: the kubelet retries with a growing delay, up to 300 seconds. `k describe pod api -n shop` shows the registry error in the events.

> **Exam trap.** `imagePullSecrets` belongs to the Pod spec (`spec.imagePullSecrets`, a list of `name` entries), not to the container. The Secret must exist in the Pod's namespace; `--docker-server` defaults to Docker Hub (`https://index.docker.io/v1/`) when you forget it.

<!-- section: pods-deployments | objectives: 1.2.1 -->
## Creating Pods and Deployments

| Task asks for | Command |
| --- | --- |
| A Pod | `k run web --image=nginx:1.27 -n shop` (label `run: web`) |
| A Pod with a port, labels and a variable | `k run web --image=nginx:1.27 --port=80 --labels=app=web,tier=front --env=MODE=prod` |
| A Pod that runs once | `k run once --image=busybox:1.37 --restart=Never -- date` |
| A throwaway shell | `k run tmp --image=busybox:1.37 --rm -it --restart=Never -- sh` |
| A Deployment | `k create deployment web --image=nginx:1.27 --replicas=3 --port=80 -n shop` |
| A manifest to edit | Any of the above with `--dry-run=client -o yaml > file.yaml` |

`kubectl run` only creates Pods; its `--restart` default is `Always`. `kubectl create deployment` labels the Deployment, the selector and the template `app: <name>`, names the container after the image (`nginx:1.27` gives `nginx`), and defaults to 1 replica. Trimmed output of the generator:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: web
  name: web
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - image: nginx:1.27
        name: nginx
        ports:
        - containerPort: 80
```

`k apply -f file.yaml` creates or updates; `k create -f` fails if the object exists.

> **Exam trap.** The selector of a Deployment must match the template labels and cannot be changed after creation. When you rename labels in a generated file, change all three places, or keep `app: <name>` and add your labels next to it.

<!-- section: choose-workload | objectives: 1.2.2 -->
## Choosing the workload resource

| Need | Resource | Key fields |
| --- | --- | --- |
| Stateless replicas, rolling updates | Deployment | `replicas`, `strategy`, `selector` |
| Stable names (`db-0`, `db-1`), ordered start, one volume per Pod | StatefulSet | `serviceName` (headless Service), `volumeClaimTemplates` |
| One Pod on every node (log or monitoring agent) | DaemonSet | No `replicas`; `updateStrategy` |
| Run to completion, with retries | Job | `completions`, `parallelism`, `backoffLimit` |
| Run a Job on a schedule | CronJob | `schedule`, `jobTemplate` |
| A single Pod for a test | Pod | Nothing restarts it if its node fails |

There is no `kubectl create daemonset`. Generate a Deployment and convert it:

```bash
k create deployment log-agent --image=registry.example.com/ops/agent:2.1 -n ops --dry-run=client -o yaml > ds.yaml
# edit ds.yaml: kind: DaemonSet, delete replicas, strategy and status
k apply -f ds.yaml
```

> **Exam trap.** A DaemonSet uses `updateStrategy`, a Deployment `strategy`. Leaving `replicas` or `strategy` in the converted file makes `kubectl apply` fail with an unknown field error.

<!-- section: jobs | objectives: 1.2.3 -->
## Creating and tuning Jobs

```bash
k create job report --image=busybox:1.37 -n batch --dry-run=client -o yaml -- sh -c 'echo done' > job.yaml
```

The generator sets `restartPolicy: Never`. Then add the tuning fields under `spec`:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: report
  namespace: batch
spec:
  completions: 6
  parallelism: 2
  backoffLimit: 3
  activeDeadlineSeconds: 300
  ttlSecondsAfterFinished: 120
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: report
        image: busybox:1.37
        command: ["sh", "-c", "echo done"]
```

| Field | Default | Effect |
| --- | --- | --- |
| `completions` | 1 | Successful Pods needed |
| `parallelism` | 1 | Pods running at the same time |
| `backoffLimit` | 6 | Retries before the Job fails with reason `BackoffLimitExceeded`; failed Pods are recreated after 10 s, 20 s, 40 s... |
| `activeDeadlineSeconds` | none | Wall-clock limit for the whole Job; wins over `backoffLimit`, running Pods are stopped, reason `DeadlineExceeded` |
| `ttlSecondsAfterFinished` | none (kept) | Deletes the finished Job and its Pods after this delay; `0` deletes at once |
| `completionMode` | `NonIndexed` | `Indexed` gives each Pod an index from 0 to `completions - 1` |
| `template.spec.restartPolicy` | none | `Never` (a new Pod per failure) or `OnFailure` (the container restarts in the same Pod); `Always` is refused |

Follow it with `k get job report -n batch`, `k get pods -n batch -l job-name=report` and `k logs job/report -n batch`.

> **Exam trap.** With `OnFailure`, the Pod is terminated once the backoff limit is reached, which makes its logs hard to read. With `Never`, each failed Pod stays for inspection. A Job's Pod template cannot be edited after creation (apart from a few scheduling fields of a suspended Job): delete the Job and create it again.

<!-- section: cronjobs | objectives: 1.2.4 -->
## Creating and tuning CronJobs

```bash
k create cronjob cleanup --image=busybox:1.37 --schedule="*/15 * * * *" -n batch --dry-run=client -o yaml -- sh -c 'echo cleanup' > cj.yaml
k create job cleanup-manual --from=cronjob/cleanup -n batch
```

`kubectl create cronjob` sets `restartPolicy: OnFailure` unless you pass `--restart=Never`. A Job created with `--from=cronjob/...` copies the job template and gets the annotation `cronjob.kubernetes.io/instantiate: manual`.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup
  namespace: batch
spec:
  schedule: "*/15 * * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 120
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 5
  suspend: false
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 600
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: busybox:1.37
            command: ["sh", "-c", "echo cleanup"]
```

| Field (under `spec`) | Default | Meaning |
| --- | --- | --- |
| `schedule` | required | Minute, hour, day of month, month, day of week; macros `@hourly`, `@daily`, `@weekly`, `@monthly`, `@yearly` |
| `timeZone` | controller's time zone | IANA name; `TZ=` or `CRON_TZ=` inside `schedule` is rejected |
| `concurrencyPolicy` | `Allow` | `Forbid` skips a run while the previous one runs; `Replace` stops it and starts the new one |
| `suspend` | `false` | `true` stops new runs; Jobs already started continue |
| `successfulJobsHistoryLimit` | 3 | Finished Jobs kept |
| `failedJobsHistoryLimit` | 1 | Failed Jobs kept |
| `startingDeadlineSeconds` | none | A run missed by more than this many seconds is skipped; under 10 the run may never start |

> **Exam trap.** Each field has one level: `schedule`, `concurrencyPolicy` and the history limits under `spec`; `backoffLimit` and `activeDeadlineSeconds` under `spec.jobTemplate.spec`; `restartPolicy` and `containers` under `spec.jobTemplate.spec.template.spec`. A field at the wrong level is rejected as unknown. Editing a CronJob changes only future Jobs.

<!-- section: key-points -->
## Key points

- `command` replaces `ENTRYPOINT`, `args` replaces `CMD`; `kubectl run -- x` sets args, `--command -- x` and `create deployment|job -- x` set command.
- `:latest` or no tag defaults to `imagePullPolicy: Always`, any other tag or a digest to `IfNotPresent`.
- A locally built image must be pushed before a Pod can use it; `save -o` and `load -i` move it as a tar file.
- Private images: a `docker-registry` Secret in the Pod's namespace, listed in `spec.imagePullSecrets`.
- Deployment for replicas, StatefulSet for identity, DaemonSet per node, Job to completion, CronJob on a schedule.
- Job: `restartPolicy` `Never` or `OnFailure`, `backoffLimit` 6, `activeDeadlineSeconds` wins; CronJob: `concurrencyPolicy` `Allow`, history 3 and 1, `timeZone` field.
