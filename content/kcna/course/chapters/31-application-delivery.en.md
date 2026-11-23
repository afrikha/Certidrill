Application delivery is the path from a code change to a new version running in the cluster. This chapter covers the deployment strategies, how a Deployment rolls out and rolls back, how applications are packaged with Helm or customized with Kustomize, CI/CD pipelines, and GitOps with Argo CD and Flux. Expect questions that name a strategy, a `kubectl rollout` subcommand, a tool or a GitOps principle.

<!-- section: deployment-strategies | objectives: 3.1.1 -->
## Delivery fundamentals and deployment strategies

Cloud native delivery relies on **immutable artifacts** (a container image built once, identified by a tag or digest, promoted unchanged from test to production) and on **declarative configuration** (manifests stored in version control). Releasing is then a change of the desired state, and rolling back is a return to a previous state.

| Strategy | How it works | Downtime | Cost and risk |
| --- | --- | --- | --- |
| **Rolling update** | Replace old Pods with new ones progressively | None if readiness probes are correct | Both versions serve traffic during the rollout. **Default** strategy of a Deployment |
| **Recreate** | Stop all old Pods, then start the new ones | Yes, between the two | Use when two versions must never run together (for example an incompatible schema) |
| **Blue-green** | Run the new version (green) next to the old one (blue), then switch all traffic at once | None | Double capacity during the switch; instant rollback by switching back |
| **Canary** | Send a small share of traffic or users to the new version, watch metrics, then increase | None | Limits the impact of a bad release; needs traffic splitting and monitoring |

A Deployment natively offers only `RollingUpdate` and `Recreate` (`spec.strategy.type`). Blue-green and canary are built on top: two Deployments with different labels and a Service selector that you switch, weighted routes of the Gateway API or a service mesh, or a progressive delivery controller such as Argo Rollouts (part of the Argo project).

> **Exam trap.** "Recreate" is the only built-in strategy with downtime. "All users switch to the new version at once, with an instant way back" is blue-green; "a small percentage of users first" is canary.

<!-- section: rollouts | objectives: 3.1.2 -->
## Managing Deployment rollouts

A rollout starts **only when the Pod template** (`spec.template`) changes, for example a new image. Scaling does not trigger a rollout and does not create a revision. Each rollout creates a new **ReplicaSet**; the old ReplicaSets are kept (scaled to zero) as the revision history, `revisionHistoryLimit` 10 by default.

```yaml
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

| Setting | Meaning | Default |
| --- | --- | --- |
| `maxSurge` | How many Pods **above** the desired count may exist during the update (number or percentage, rounded up) | 25 % |
| `maxUnavailable` | How many Pods **below** the desired count may be unavailable (rounded down) | 25 % |

The two cannot both be 0. `maxUnavailable: 0` keeps full capacity (new Pods must be ready before old ones go); a larger `maxSurge` speeds the rollout up at the cost of extra resources.

```bash
kubectl set image deployment/web web=registry.example.com/web:2.1
kubectl rollout status deployment/web
kubectl rollout history deployment/web
kubectl rollout undo deployment/web
kubectl rollout undo deployment/web --to-revision=2
kubectl rollout pause deployment/web
kubectl rollout resume deployment/web
kubectl rollout restart deployment/web
```

| Command | Use |
| --- | --- |
| `rollout status` | Wait for and report the progress of the current rollout |
| `rollout history` | List revisions; the `CHANGE-CAUSE` column comes from the `kubernetes.io/change-cause` annotation |
| `rollout undo` | Return to the previous revision, or to `--to-revision=N` |
| `rollout pause` / `resume` | Batch several changes to the template into one rollout |
| `rollout restart` | Recreate the Pods with the same template (for example to reload configuration) |

> **Exam tip.** A rollback only restores the **Pod template**; it does not change the replica count. A paused Deployment cannot be rolled back until it is resumed.

<!-- section: helm-kustomize | objectives: 3.1.3 -->
## Packaging and customizing: Helm and Kustomize

**Helm** is the package manager for Kubernetes and a CNCF graduated project (current major version: Helm 4).

| Concept | Meaning |
| --- | --- |
| **Chart** | A package: templated manifests, a `Chart.yaml` and default values in `values.yaml` |
| **Repository** | Where charts are stored and shared (HTTP repositories or OCI registries) |
| **Release** | One installation of a chart in a cluster, with a name; each install, upgrade or rollback creates a new **revision** |
| **Values** | Configuration that fills the templates, overridden with `-f my-values.yaml` or `--set key=value` (`--set` wins) |

```bash
helm repo add example https://charts.example.com
helm install shop example/webshop -f prod-values.yaml
helm upgrade shop example/webshop --set replicaCount=3
helm history shop
helm rollback shop 1
helm uninstall shop
```

**Kustomize** customizes plain YAML **without templates**. A `kustomization.yaml` lists resources and transformations: a **base** holds the common manifests, and each **overlay** (dev, prod) refers to the base and adds patches, a namespace, name prefixes, labels, image tags, or generated ConfigMaps and Secrets (with a content-hash suffix so a change triggers a rollout). Kustomize is built into kubectl since v1.14.

```bash
kubectl kustomize overlays/prod
kubectl apply -k overlays/prod
```

| Need | Tool |
| --- | --- |
| Install a third-party application with its dependencies and configurable values; versioned releases with rollback | Helm |
| Same manifests for several environments with small differences, no templating language | Kustomize |

> **Exam trap.** Helm uses templates and keeps release history; Kustomize patches plain YAML and is invoked with `kubectl apply -k`, not `-f`. Helm 3 and later have no Tiller server component.

<!-- section: ci-cd | objectives: 3.1.4 -->
## CI/CD pipelines for containerized applications

| Stage | Purpose | Typical steps |
| --- | --- | --- |
| **Continuous integration (CI)** | Merge changes often and verify them automatically | Build, unit tests, static analysis, build the container image, scan it for vulnerabilities, push it to a registry with an immutable tag or digest |
| **Continuous delivery (CD)** | Keep every change releasable: deploy automatically to test or acceptance environments | Deploy the image, run integration tests; production release is a decision |
| **Continuous deployment** | Every change that passes the pipeline goes to production automatically | Same as delivery, without the last manual gate |

In a classic **push** pipeline, the CI/CD system holds cluster credentials and runs `kubectl apply` or `helm upgrade` against the cluster. This is simple but exposes powerful credentials outside the cluster, and nothing corrects changes made later by hand (drift). GitOps addresses both.

> **Exam tip.** Continuous delivery stops at "ready to release" (often with an approval); continuous deployment releases to production automatically.

<!-- section: gitops | objectives: 3.1.5 -->
## GitOps with Argo CD and Flux

GitOps uses a Git repository as the **single source of truth** for the desired state of the system. The OpenGitOps principles (from the GitOps Working Group of the CNCF):

| Principle | Meaning |
| --- | --- |
| **Declarative** | The desired state is expressed declaratively |
| **Versioned and immutable** | It is stored in a way that keeps a complete version history (Git) |
| **Pulled automatically** | Software agents pull the desired state from the source |
| **Continuously reconciled** | Agents keep comparing the actual state with the desired state and apply the desired state |

An agent **inside** the cluster pulls changes, so no cluster credentials leave the cluster, every change is a reviewed commit, rollback is a `git revert`, and manual drift is detected and corrected. The CI pipeline still builds and pushes the image; it then updates the manifests in Git instead of touching the cluster.

| Tool | Key facts |
| --- | --- |
| **Argo CD** | Declarative GitOps continuous delivery tool for Kubernetes; a controller compares live state with the target state in Git, marks differences `OutOfSync`, and syncs automatically or on demand; web UI, multi-cluster; supports plain YAML, Helm, Kustomize, Jsonnet. Part of the Argo project (graduated) |
| **Flux** | Set of controllers (GitOps Toolkit): source controllers (GitRepository, OCIRepository, HelmRepository...), Kustomize controller, Helm controller (HelmRelease), notification and image automation controllers. Graduated |

> **Exam trap.** GitOps is **pull**-based: the agent in the cluster fetches the state. A pipeline that runs `kubectl apply` from outside is push-based CD, even if the manifests are in Git.

<!-- section: key-points -->
## Key points

- Built-in Deployment strategies: `RollingUpdate` (default) and `Recreate` (downtime). Blue-green and canary need extra objects or tools.
- A rollout is triggered only by a Pod template change and creates a new ReplicaSet; `maxSurge` and `maxUnavailable` default to 25 %.
- `kubectl rollout status | history | undo [--to-revision] | pause | resume | restart`.
- Helm: chart, repository, release, values, revisions, `helm rollback`. Kustomize: base and overlays, no templates, `kubectl apply -k`.
- CI builds, tests, scans and pushes images; continuous delivery keeps releases ready, continuous deployment ships automatically.
- GitOps: declarative, versioned and immutable, pulled automatically, continuously reconciled. Argo CD and Flux are graduated CNCF projects.
