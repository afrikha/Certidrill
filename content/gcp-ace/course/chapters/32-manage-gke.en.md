Day-to-day GKE administration mixes two command-line tools: `gcloud container` manages the cluster and its node pools (Google Cloud resources), and `kubectl` manages what runs inside (Kubernetes objects). Exam questions test which tool and which flag, how nodes pull images from Artifact Registry, how node pools scale, how HPA and VPA differ, and how Autopilot treats Pod resource requests.

<!-- section: cluster-inventory | objectives: 3.1.4 -->
## Viewing the cluster inventory

First get credentials: `get-credentials` writes a `kubeconfig` entry and makes the cluster the current `kubectl` context.

```bash
gcloud container clusters list
gcloud container clusters get-credentials prod-cluster --location=europe-west1 --project=example-prod
kubectl get nodes -o wide                 # nodes, versions, internal and external IPs
kubectl get pods -A                       # Pods in all namespaces
kubectl get pods -n shop -o wide          # node and Pod IP of each Pod
kubectl get services -n shop              # ClusterIP, NodePort, LoadBalancer and EXTERNAL-IP
kubectl get deployments,statefulsets,daemonsets -n shop
kubectl describe pod cart-7d9f8c-x2k4q -n shop   # events: scheduling, image pull, probes
kubectl top nodes                         # current CPU and memory use
gcloud container node-pools list --cluster=prod-cluster --location=europe-west1
```

| Question | Tool |
| --- | --- |
| Which clusters exist in the project, their version and location | `gcloud container clusters list` or the console Kubernetes clusters page |
| Which node pools, machine types and autoscaling limits | `gcloud container node-pools list` / `describe` |
| Which nodes, Pods and Services exist now | `kubectl get` (or the console Workloads and Services pages) |
| Why a Pod is `Pending` or in `ImagePullBackOff` | `kubectl describe pod` (Events section) |
| Private cluster reachable only through its DNS endpoint | `get-credentials --dns-endpoint` |
| Private endpoint from inside the VPC | `get-credentials --internal-ip` |

> **Exam trap.** `kubectl` fails with "connection refused" or uses the wrong cluster until you run `gcloud container clusters get-credentials` for the right cluster, location and project. Creating an Autopilot cluster with `gcloud container clusters create-auto` adds a kubeconfig entry in the environment where you ran it; a cluster created in the console, or by a teammate from another machine, doesn't update your kubeconfig.

<!-- section: artifact-registry | objectives: 3.1.5 -->
## Pulling images from Artifact Registry

GKE nodes pull images with the **node service account**: the Compute Engine default service account unless you chose another one when creating the cluster or node pool. Image path: `LOCATION-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG`.

| Situation | What to configure |
| --- | --- |
| Repository in the same project, default node service account still holding its automatic Editor grant | Nothing |
| Organization enforces `iam.automaticIamGrantsForDefaultServiceAccounts` (default for organizations created since 2024-05-03) | Grant Artifact Registry Reader to the node service account |
| Custom, minimally privileged node service account (recommended) | `roles/container.defaultNodeServiceAccount` on the project plus `roles/artifactregistry.reader` on the repository |
| Repository in another project | `roles/artifactregistry.reader` on that repository (or project) for the node service account of the cluster |
| Registry outside Google Cloud with credentials | Kubernetes `imagePullSecrets` |

```bash
gcloud iam service-accounts create gke-nodes --project=example-prod
gcloud projects add-iam-policy-binding example-prod \
  --member=serviceAccount:gke-nodes@example-prod.iam.gserviceaccount.com \
  --role=roles/container.defaultNodeServiceAccount
gcloud artifacts repositories add-iam-policy-binding shop-images \
  --location=europe-west1 --project=example-shared \
  --member=serviceAccount:gke-nodes@example-prod.iam.gserviceaccount.com \
  --role=roles/artifactregistry.reader
gcloud container node-pools create apps --cluster=prod-cluster --location=europe-west1 \
  --service-account=gke-nodes@example-prod.iam.gserviceaccount.com
```

The person who attaches the service account to the node pool needs Service Account User (`roles/iam.serviceAccountUser`) on it. The service account of an existing node pool cannot be changed with `node-pools update`: create a new node pool with the right account and migrate the workloads.

> **Exam trap.** The node service account pulls images; the application's own calls to Google Cloud APIs (read a bucket, publish to Pub/Sub) should use **Workload Identity Federation for GKE** with a Kubernetes service account, not extra roles on the node service account. Container Registry (`gcr.io`) is shut down: migrate images to Artifact Registry.

<!-- section: node-pools | objectives: 3.1.6 -->
## Working with node pools

A node pool is a group of nodes with the same configuration (machine type, disk, image, service account, labels, taints). Node pools exist in **Standard** clusters; Autopilot manages nodes for you.

```bash
# Add a pool with autoscaling (limits per zone)
gcloud container node-pools create highmem --cluster=prod-cluster --location=europe-west1 \
  --machine-type=n2-highmem-4 --num-nodes=1 \
  --enable-autoscaling --min-nodes=1 --max-nodes=5 \
  --node-labels=workload=analytics --node-taints=dedicated=analytics:NoSchedule

# Manual resize (per zone in a regional cluster)
gcloud container clusters resize prod-cluster --location=europe-west1 \
  --node-pool=highmem --num-nodes=2

# Enable, change or disable autoscaling on an existing pool
gcloud container clusters update prod-cluster --location=europe-west1 \
  --node-pool=highmem --enable-autoscaling --total-min-nodes=2 --total-max-nodes=12
gcloud container clusters update prod-cluster --location=europe-west1 \
  --node-pool=highmem --no-enable-autoscaling

# Change the machine type: the nodes are recreated
gcloud container node-pools update highmem --cluster=prod-cluster --location=europe-west1 \
  --machine-type=n2-highmem-8

# Remove a pool (its nodes and Pods are deleted)
gcloud container node-pools delete highmem --cluster=prod-cluster --location=europe-west1
```

| Fact | Detail |
| --- | --- |
| `--num-nodes` in a regional or multi-zonal cluster | Number of nodes **per zone**: 3 zones × `--num-nodes=2` = 6 nodes |
| `--min-nodes` / `--max-nodes` | Autoscaler limits per zone |
| `--total-min-nodes` / `--total-max-nodes` | Limits for the whole pool; mutually exclusive with the per-zone pair |
| In-place updates | Labels, taints, network tags, node locations, autoscaling, upgrade strategy, and (by recreating nodes) machine type, boot disk type and size |
| Not updatable | Service account and access scopes of existing nodes: create a new pool |
| Deleting a pool | Deletes nodes and running workloads; PodDisruptionBudgets are ignored unless `--respect-pdb-during-node-pool-deletion` |
| Cluster autoscaler profile | `--autoscaling-profile=balanced` (default) or `optimize-utilization` (scale down faster, lower cost) on `clusters update` |
| Target a pool from a Pod | `nodeSelector` on `cloud.google.com/gke-nodepool: POOL_NAME`, or labels and taints |

Migrating workloads to a new pool: create the new pool, `kubectl cordon` the old nodes, `kubectl drain NODE --ignore-daemonsets --delete-emptydir-data` so Pods move, then delete the old pool.

> **Exam tip.** The cluster autoscaler adds nodes when Pods are **Pending** because no node has room for their requests, and removes underused nodes whose Pods fit elsewhere. It does not react to CPU usage directly: that is the job of the Horizontal Pod Autoscaler.

<!-- section: kubernetes-resources | objectives: 3.1.7 -->
## Working with Pods, Deployments, Services and StatefulSets

| Object | Use |
| --- | --- |
| Pod | One or more containers scheduled together; not recreated if deleted alone |
| Deployment | Stateless replicas, rolling updates and rollbacks (through ReplicaSets) |
| StatefulSet | Stable Pod names (`db-0`, `db-1`), ordered start and stop, **one PersistentVolumeClaim per Pod** from `volumeClaimTemplates`, used with a headless Service |
| DaemonSet | One Pod per node (log or monitoring agents) |
| Job / CronJob | Run to completion, once or on a schedule |
| Service | Stable virtual IP and DNS name in front of Pods selected by labels |

```bash
kubectl create deployment cart --image=europe-west1-docker.pkg.dev/example-prod/shop/cart:1.4 -n shop
kubectl scale deployment cart --replicas=5 -n shop
kubectl set image deployment/cart cart=europe-west1-docker.pkg.dev/example-prod/shop/cart:1.5 -n shop
kubectl rollout status deployment/cart -n shop
kubectl rollout undo deployment/cart -n shop
kubectl expose deployment cart --type=LoadBalancer --port=80 --target-port=8080 -n shop
kubectl apply -f statefulset.yaml
kubectl delete pod cart-7d9f8c-x2k4q -n shop     # the Deployment creates a replacement
```

Service types:

| Type | Reachable from | On GKE |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster | Virtual IP only |
| `NodePort` | Node IPs on a port in 30000–32767 | Rarely the best answer |
| `LoadBalancer` | Outside the cluster | External passthrough Network Load Balancer; add annotation `networking.gke.io/load-balancer-type: "Internal"` for an internal one |
| Headless (`clusterIP: None`) | DNS records per Pod | Required by StatefulSets for stable network identities |

For HTTP(S) routing by host or path, use a **Gateway** (Gateway API) or an **Ingress**, which create Application Load Balancers.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
  namespace: shop
spec:
  serviceName: db
  replicas: 3
  selector:
    matchLabels: { app: db }
  template:
    metadata:
      labels: { app: db }
    spec:
      containers:
      - name: postgres
        image: europe-west1-docker.pkg.dev/example-prod/shop/postgres:16
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

> **Exam trap.** Scaling a StatefulSet down does not delete its PersistentVolumeClaims: the data stays (and is billed) so that `db-2` gets the same disk back when you scale up again.

<!-- section: pod-autoscaling | objectives: 3.1.8 -->
## Horizontal and vertical Pod autoscaling

| | Horizontal Pod Autoscaler (HPA) | Vertical Pod Autoscaler (VPA) |
| --- | --- | --- |
| Changes | Number of replicas | CPU and memory **requests** (and limits proportionally) of containers |
| Signals | CPU or memory utilization (percentage of requests), custom metrics, external metrics (for example a Pub/Sub backlog) | Observed usage history |
| Enable | Built in; create an HPA object | Built in on Autopilot; on Standard `gcloud container clusters update CLUSTER --enable-vertical-pod-autoscaling` |

```bash
kubectl autoscale deployment cart --cpu-percent=60 --min=3 --max=20 -n shop
kubectl get hpa -n shop
kubectl describe hpa cart -n shop
```

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: reports-vpa
  namespace: shop
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: reports
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: "*"
      minAllowed: { cpu: 250m, memory: 256Mi }
      maxAllowed: { cpu: "2", memory: 4Gi }
```

| VPA `updateMode` | Effect |
| --- | --- |
| `Off` | Recommendations only, in the VPA `status` (`kubectl get vpa reports-vpa -o yaml`) |
| `Initial` | Requests set only when Pods are created |
| `Recreate` (default, also called `Auto`) | VPA evicts Pods and recreates them with new requests |
| `InPlaceOrRecreate` | Preview: resize without recreation when possible |

Rules the exam checks:

- An HPA on CPU percentage does nothing unless the containers have CPU **requests**.
- Do not combine HPA and VPA on the same CPU or memory metric; to scale horizontally on CPU and vertically on memory, GKE offers multidimensional Pod autoscaling (Beta) and HPA rightsizing with VPA (Preview), so neither is a production answer.
- HPA targets the Deployment, not its ReplicaSet; it cannot scale DaemonSets.
- HPA re-evaluates about every 15 seconds; scale-down uses a 5-minute stabilization window.
- VPA works only for controller-managed workloads (Deployments, StatefulSets...), not bare Pods.

> **Exam tip.** Three autoscalers, three layers: HPA adds Pods, VPA resizes Pods, the cluster autoscaler (or Autopilot) adds nodes for Pods that do not fit. A stem with "Pods Pending, nodes full" wants node autoscaling; "CPU high on all replicas" wants HPA; "requests far above real usage" wants VPA.

<!-- section: autopilot-requests | objectives: 3.1.9 -->
## Autopilot Pod resource requests

In Autopilot you pay for the **resources your Pods request** (CPU, memory, ephemeral storage), not for nodes, so requests matter.

| Situation | What Autopilot does |
| --- | --- |
| No requests set (general-purpose, Balanced or Scale-Out class) | Applies defaults: 0.5 vCPU, 2 GiB memory; 1 GiB ephemeral storage |
| Only CPU or only memory set | Derives the other from the allowed CPU:memory ratio |
| Request below the class minimum | Raises it to the minimum |
| Request above the class maximum | **Rejects** the workload with an error |
| CPU:memory ratio outside the allowed range | Increases the smaller resource |
| Limits not set, cluster supports bursting | Pods can burst into unused capacity |
| Limits not set, no bursting | Limits set equal to requests |
| Requests greater than limits | Requests lowered to the limits |

| Compute class | CPU:memory ratio | CPU range |
| --- | --- | --- |
| General-purpose (default) | 1:1 to 1:6.5 | 50m (with bursting) or 250m to 30 vCPU |
| Balanced | 1:1 to 1:8 | 0.25 to 222 vCPU |
| Scale-Out | Fixed 1:4 | 0.25 to 54 vCPU (amd64) |
| Performance, accelerators | No minimums; maximums depend on the machine series | |

Without bursting, CPU requests are rounded up to a multiple of 0.25 vCPU. Bursting needs GKE 1.30.2-gke.1394000 or later with cgroupv2 (after a control plane restart). Select a class with a node selector:

```yaml
spec:
  nodeSelector:
    cloud.google.com/compute-class: Scale-Out
  containers:
  - name: worker
    image: europe-west1-docker.pkg.dev/example-prod/shop/worker:2.0
    resources:
      requests:
        cpu: "1"
        memory: 4Gi
```

To lower an Autopilot bill, right-size requests (VPA is on by default in Autopilot); there is no node pool to shrink.

> **Exam trap.** Asking for 40 vCPU in a general-purpose Autopilot Pod does not get capped at 30: the Pod is rejected. Choose a class or machine series whose maximum fits (for example Balanced or Performance).

<!-- section: key-points -->
## Key points

- `gcloud container` manages clusters and node pools; `kubectl` manages objects; run `get-credentials` first.
- Nodes pull from Artifact Registry with the node service account: `roles/artifactregistry.reader` on the repository (also across projects); apps use Workload Identity Federation for GKE.
- Node counts and per-zone autoscaling limits multiply by the number of zones; `--total-*-nodes` set pool-wide limits; the service account of a pool cannot be changed.
- StatefulSets give stable names and one PVC per Pod; `LoadBalancer` Services create passthrough Network Load Balancers.
- HPA changes replicas and needs requests; VPA changes requests (`Off`, `Initial`, `Recreate`); do not mix them on the same metric.
- Autopilot bills Pod requests, applies defaults (0.5 vCPU, 2 GiB), raises low requests and rejects requests above the class maximum.
