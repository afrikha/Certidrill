Containers run on Google Cloud either in a Kubernetes cluster you configure (GKE) or on a serverless platform that hides all infrastructure (Cloud Run, Cloud Run functions). Associate Cloud Engineer questions test the commands that set up `kubectl`, the cluster options chosen at creation (Autopilot or Standard, zonal or regional, private nodes), the steps to deploy an image, the wiring of events (Pub/Sub, Cloud Storage, Eventarc) to serverless code, and the choice between GPUs and TPUs.

<!-- section: kubectl-setup | objectives: 2.1.8 -->
## Installing and configuring kubectl

`kubectl` talks to the cluster's control plane; it needs two pieces of software and a kubeconfig entry.

1. Install `kubectl`: `gcloud components install kubectl`, or the `kubectl` package from the Google Cloud CLI apt or yum repository. Cloud Shell has it preinstalled.
2. Install the **`gke-gcloud-auth-plugin`**: without it, `kubectl` cannot authenticate to GKE clusters. `gcloud components install gke-gcloud-auth-plugin`, or the package `google-cloud-cli-gke-gcloud-auth-plugin`.
3. Fetch credentials: `gcloud container clusters get-credentials` writes an entry to `$HOME/.kube/config` and makes the cluster the **current context**.

```bash
gcloud components install kubectl gke-gcloud-auth-plugin
kubectl version --client
gcloud container clusters get-credentials shop-prod --location=europe-west1
kubectl config current-context
kubectl config get-contexts
kubectl config use-context gke_example-prod_europe-west1_shop-prod
kubectl get nodes
```

| Need | Command or flag |
| --- | --- |
| Regional cluster | `--location=REGION` (or `--region`) |
| Zonal cluster | `--location=ZONE` (or `--zone`) |
| Control plane reachable only on its internal IP | `get-credentials ... --internal-ip` |
| Use the DNS-based control plane endpoint | `get-credentials ... --dns-endpoint` |
| Switch between clusters | `kubectl config use-context CONTEXT` |

The user needs the `container.clusters.get` permission to fetch credentials; Kubernetes Engine Cluster Viewer (`roles/container.clusterViewer`) is the least-privileged predefined role that has it. What the user can then do inside the cluster depends on IAM roles such as Kubernetes Engine Developer and on Kubernetes RBAC.

> **Exam trap.** `kubectl` commands that fail with "connection refused" or hit the wrong cluster usually mean the kubeconfig has no entry or points to another context: run `get-credentials` for the right cluster and location. `gcloud config set project` does not change the `kubectl` context.

<!-- section: gke-cluster-configs | objectives: 2.1.9 -->
## Deploying GKE clusters with different configurations

| | Autopilot | Standard |
| --- | --- | --- |
| Nodes | Managed by Google from the Pods' requests | You create and size node pools |
| Billing | Mostly by the CPU, memory and storage that Pods request | Per node VM, used or not |
| Location | Always regional | Zonal or regional |
| Release channel | Always enrolled in a release channel | Recommended; Regular is the default for new clusters |
| Choose when | Default choice, least operational effort | Node-level control: specific machine types, custom node configuration, privileged workloads |

**Zonal or regional.** A zonal cluster has one control plane in one zone: if that zone fails, workloads keep running on nodes elsewhere but you cannot change the cluster until the control plane returns. A **regional** cluster replicates the control plane across zones of the region and, by default, spreads each node pool across three zones. The location type cannot be changed after creation.

```bash
# Autopilot (regional by design)
gcloud container clusters create-auto shop-prod --location=europe-west1

# Standard, regional: --num-nodes is per zone, so 3 zones x 2 = 6 nodes
gcloud container clusters create analytics --location=europe-west1 \
  --num-nodes=2 --machine-type=e2-standard-4 \
  --enable-autoscaling --min-nodes=1 --max-nodes=5 --release-channel=regular

# Standard, zonal, nodes in two zones (multi-zonal)
gcloud container clusters create dev-01 --zone=europe-west1-b \
  --node-locations=europe-west1-b,europe-west1-c --num-nodes=1
```

**Private clusters (network isolation).** Two independent settings:

| Setting | Flag | Effect |
| --- | --- | --- |
| Private nodes | `--enable-private-nodes` (requires VPC-native, `--enable-ip-alias`) | Nodes get internal IPs only. Outbound internet access (for example, image pulls from outside Google) needs **Cloud NAT** |
| DNS-based control plane endpoint | `--enable-dns-access` | Recommended: reachable from anywhere that reaches Google APIs, access controlled by IAM, no bastion host |
| IP-based endpoint, internal only | `--enable-private-endpoint` | Disables the external endpoint; clients need a route into the VPC |
| Authorized networks | `--enable-master-authorized-networks --master-authorized-networks=CIDR,...` | IP allowlist for the IP-based endpoint (up to 100 ranges) |
| Control plane range | `--master-ipv4-cidr` (a `/28`) | Optional on current versions |

```bash
gcloud container clusters create-auto payments --location=europe-west1 \
  --enable-private-nodes --enable-ip-alias --enable-dns-access
gcloud compute routers create nat-router --network=default --region=europe-west1
gcloud compute routers nats create nat-eu --router=nat-router --region=europe-west1 \
  --auto-allocate-nat-external-ips --nat-all-subnet-ip-ranges
```

Private nodes can be turned on later with `gcloud container clusters update ... --enable-private-nodes`. On Standard, that cluster update applies only to **new** node pools: GKE doesn't change existing ones, so update each existing pool with `gcloud container node-pools update POOL --cluster=CLUSTER --enable-private-nodes`.

> **Exam trap.** "Nodes must not have public IP addresses" is private nodes, not a private endpoint. Nodes without external IPs then cannot reach the internet: add Cloud NAT. Private Google Access lets them reach Google APIs and Artifact Registry.

<!-- section: deploy-gke-app | objectives: 2.1.10 -->
## Deploying a containerized application to GKE

Order of operations:

1. Create an **Artifact Registry** Docker repository (Container Registry is shut down) and push the image, for example with Cloud Build.
2. Make sure the nodes can pull: the node service account needs Artifact Registry Reader (`roles/artifactregistry.reader`) on the repository. Grant it explicitly when the repository is in another project or the nodes run as a custom least-privilege service account.
3. Get credentials, then create a **Deployment** (desired replicas of a Pod template) and a **Service** to expose it.

```bash
gcloud artifacts repositories create apps --repository-format=docker \
  --location=europe-west1
gcloud builds submit --tag=europe-west1-docker.pkg.dev/example-prod/apps/shop:1.0
kubectl create deployment shop \
  --image=europe-west1-docker.pkg.dev/example-prod/apps/shop:1.0 --replicas=3
kubectl expose deployment shop --type=LoadBalancer --port=80 --target-port=8080
kubectl get service shop
```

The same, declaratively (the method to keep in source control):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop
  template:
    metadata:
      labels:
        app: shop
    spec:
      containers:
      - name: shop
        image: europe-west1-docker.pkg.dev/example-prod/apps/shop:1.0
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: shop
spec:
  type: LoadBalancer
  selector:
    app: shop
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl apply -f shop.yaml
kubectl set image deployment/shop shop=europe-west1-docker.pkg.dev/example-prod/apps/shop:1.1
kubectl rollout status deployment/shop
kubectl rollout undo deployment/shop
```

| Exposure need | Kubernetes object | What GKE creates |
| --- | --- | --- |
| Reachable only inside the cluster | Service `ClusterIP` (default) | Internal cluster IP |
| Port on every node | Service `NodePort` | No load balancer |
| External TCP/UDP endpoint | Service `LoadBalancer` | External passthrough Network Load Balancer |
| Internal endpoint for other VPC clients | Service `LoadBalancer` with the annotation `networking.gke.io/load-balancer-type: "Internal"` | Internal passthrough Network Load Balancer |
| HTTP(S) routing by host or path, TLS, Cloud Armor | Ingress or Gateway | Application Load Balancer |

On Autopilot, set resource **requests** in every container: they drive both scheduling and billing.

> **Exam trap.** Pods stuck in `ImagePullBackOff` after a deployment point to the image path or to pull permissions: check the `REGION-docker.pkg.dev/PROJECT/REPOSITORY/IMAGE:TAG` path and the Artifact Registry Reader role of the node service account.

<!-- section: serverless-deploy | objectives: 2.1.11 -->
## Deploying serverless applications and event processing

**Cloud Run services** run a container that listens on the port given by `$PORT` (8080 by default). Deploy from an image or straight from source (Cloud Build builds it):

```bash
gcloud run deploy orders-api \
  --image=europe-west1-docker.pkg.dev/example-prod/apps/orders:2.0 \
  --region=europe-west1 --no-allow-unauthenticated \
  --service-account=orders-api@example-prod.iam.gserviceaccount.com
gcloud run deploy web-front --source=. --region=europe-west1 --allow-unauthenticated
gcloud run jobs create nightly-export \
  --image=europe-west1-docker.pkg.dev/example-prod/apps/export:1.0 \
  --region=europe-west1 --tasks=10 --max-retries=3
gcloud run jobs execute nightly-export --region=europe-west1
```

`--allow-unauthenticated` grants Cloud Run Invoker (`roles/run.invoker`) to `allUsers`: use it only for public sites and webhooks. Every deployment creates a new immutable **revision**.

**Cloud Run functions** are deployed with `gcloud run deploy` and the `--function` flag (entry point) and a `--base-image` (language runtime). `gcloud functions deploy` remains for existing functions, for backward compatibility.

```bash
gcloud run deploy resize-image --source=. --function=resizeImage \
  --base-image=nodejs24 --region=europe-west1 --no-allow-unauthenticated
```

**Events.** Two ways to deliver Google Cloud events to Cloud Run or Cloud Run functions:

| Mechanism | Use | Setup |
| --- | --- | --- |
| **Eventarc** trigger | Cloud Storage object events, Pub/Sub messages, 90+ services through Cloud Audit Logs, all in CloudEvents format | `gcloud eventarc triggers create` with `--event-filters`, a destination and a trigger service account |
| Pub/Sub **push subscription** | Messages of one topic pushed to an HTTPS endpoint | Subscription with `--push-endpoint` and `--push-auth-service-account` |

Cloud Storage event types: `google.cloud.storage.object.v1.finalized` (object created or overwritten), `.deleted`, `.archived`, `.metadataUpdated`. Pub/Sub: `google.cloud.pubsub.topic.v1.messagePublished`.

Permissions to set for a Cloud Storage trigger:

1. Cloud Storage service agent: Pub/Sub Publisher (`roles/pubsub.publisher`) on the project.
2. Trigger service account: Eventarc Event Receiver (`roles/eventarc.eventReceiver`) and permission to invoke the destination (`roles/run.invoker`).
3. Trigger location = bucket location (same region or multi-region).

```bash
SA="$(gcloud storage service-agent --project=example-prod)"
gcloud projects add-iam-policy-binding example-prod \
  --member="serviceAccount:${SA}" --role=roles/pubsub.publisher
gcloud eventarc triggers create invoices-uploaded --location=europe-west1 \
  --destination-run-service=resize-image --destination-run-region=europe-west1 \
  --event-filters="type=google.cloud.storage.object.v1.finalized" \
  --event-filters="bucket=example-invoices" \
  --service-account=trigger-sa@example-prod.iam.gserviceaccount.com

gcloud pubsub subscriptions create orders-push --topic=orders \
  --push-endpoint=https://orders-api-abc123-ew.a.run.app/ \
  --push-auth-service-account=pubsub-invoker@example-prod.iam.gserviceaccount.com
```

The event type of an Eventarc trigger cannot be changed: create a new trigger and delete the old one.

> **Exam trap.** A Cloud Storage trigger that never fires, or fails at creation, is often a location mismatch (trigger in `us-central1`, bucket in `EU`) or the missing Pub/Sub Publisher role on the Cloud Storage service agent.

<!-- section: gpus-tpus | objectives: 2.1.12 -->
## Choosing between GPUs and TPUs

| Workload | Accelerator |
| --- | --- |
| Models dominated by matrix computations, large models with large batch sizes, training for weeks or months, ultra-large embeddings (ranking, recommendation) | **TPU** (Cloud TPU) |
| Models with custom PyTorch or JAX operations that must run partly on CPU, TensorFlow operations not available on TPU, medium-to-large models | **GPU** |
| Graphics, video transcoding, virtual workstations, CUDA-based software | **GPU** |
| Quick prototypes, small models, I/O-bound or very custom operations | CPU |

TPUs are Google-designed accelerators for machine learning (current generations include TPU v5e, v5p, v6e and TPU7x Ironwood); frameworks reach them through the XLA compiler (JAX, PyTorch, TensorFlow). They are a poor fit for programs with frequent branching, high-precision arithmetic or custom operations inside the training loop.

Where each runs:

| Platform | GPUs | TPUs |
| --- | --- | --- |
| Compute Engine | Accelerator-optimized series with GPUs attached automatically (A2, A3, A4, G2 with NVIDIA L4, G4); NVIDIA T4, P4 or V100 attached to N1 VMs | TPU VMs (`gcloud compute tpus tpu-vm create`) |
| GKE | GPU node pools (Standard) or Pods requesting GPUs (Autopilot) | TPU slice node pools (Standard) or Pods requesting TPUs (Autopilot) |
| Cloud Run | One GPU per instance (NVIDIA L4, for example), scales to zero | No |
| Gemini Enterprise Agent Platform | Training and serving | Training and serving |

```bash
gcloud container node-pools create gpu-pool --cluster=analytics \
  --location=europe-west1 --machine-type=g2-standard-8 \
  --accelerator=type=nvidia-l4,count=1,gpu-driver-version=latest \
  --num-nodes=1
```

GPU VMs cannot live migrate: they use the `TERMINATE` host maintenance policy. GPUs and TPUs are also available as Spot capacity for fault-tolerant jobs.

> **Exam tip.** "Lowest-effort serverless inference for a model that needs a GPU and should scale to zero" is Cloud Run with a GPU. "Train a large TensorFlow or JAX model built from standard matrix operations at the lowest cost per step" points to TPUs.

<!-- section: key-points -->
## Key points

- `kubectl` needs the `gke-gcloud-auth-plugin`; `gcloud container clusters get-credentials NAME --location=...` writes the kubeconfig and sets the current context.
- Autopilot: always regional, nodes managed by Google, billed by Pod requests; Standard: node pools you manage, zonal or regional; location type is fixed at creation.
- Regional Standard cluster: `--num-nodes` counts per zone; nodes in three zones by default.
- Private nodes (`--enable-private-nodes`) need Cloud NAT for internet egress; the DNS-based endpoint is the recommended control plane access.
- Images live in Artifact Registry; Deployment for replicas, Service `LoadBalancer` for a passthrough Network Load Balancer, Ingress or Gateway for an Application Load Balancer.
- Cloud Run: `gcloud run deploy` from an image or `--source`; functions with `--function` and `--base-image`; jobs for run-to-completion tasks.
- Eventarc for Cloud Storage, Pub/Sub and audit log events (Pub/Sub Publisher on the Cloud Storage service agent, trigger in the bucket's location); Pub/Sub push subscriptions with an invoker service account.
- TPUs for large matrix-heavy ML; GPUs for custom operations, graphics and CUDA; Cloud Run offers serverless GPUs.
