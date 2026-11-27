# QZ-gcp-ace-22-gke-serverless — notes

`content/gcp-ace/quizzes/22-gke-serverless.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 2.1.8 (q1), 2.1.9 (q2, q7, q10), 2.1.10 (q3, q8), 2.1.11 (q4, q6, q9), 2.1.12 (q5). Positions 6–10: single ×3, multi ×2 (q9 choose two, q10 choose three).

## Chapter vs current docs

- No outdated or wrong statement found in the parts of the chapter that I checked against docs.cloud.google.com.
- Confirmed as written: get-credentials writes `$HOME/.kube/config` and sets the current context, and needs `container.clusters.get` (Cluster Viewer is the least-privileged role). A zonal control plane is a single replica, and workloads keep running during its zone outage, but the cluster can't be configured. Availability type can't be changed. `gcloud run deploy --source --function --base-image` is the current way to deploy functions; the docs keep `gcloud functions deploy` for existing functions. A Cloud Storage trigger must be in the bucket's project and region or multi-region, and the destination service may be elsewhere. A trigger's event type can't be changed. Cloud Run GPUs went GA on 2025-04-07 and can scale to zero. Ingress exposes only HTTP ports 80/443.
- Possible addition to the chapter: on Standard, `clusters update --enable-private-nodes` sets the default for **new** node pools only ("GKE doesn't update this configuration on existing node pools"). The chapter implies it but doesn't say it outright. q10 tests it.
- Possible addition: the route-trigger page says that a trigger needs `roles/run.invoker` for authenticated invocations. The chapter lists it. The Eventarc quickstart grants only Eventarc Event Receiver to the default compute service account.

## Doubts / not verified on a fetched page

- The Eventarc locations page says "Direct Eventarc events are not available in dual-region and multi-region locations". The same page lists Cloud Storage triggers in multi-region locations, and the route-trigger page explicitly covers multi-region Cloud Storage triggers. q9 (trigger in `eu` for an EU bucket) relies on the latter. The page doesn't explicitly map the bucket's EU multi-region to the `eu` trigger location. The mapping comes from the location list (`eu`: Cloud Storage multi-region).
- q3: UDP on a LoadBalancer Service is not stated in one sentence. It is implied by "About LoadBalancer Services" (passthrough load balancer that matches the Service's protocol and ports) and by the mixed-protocol page (TCP and UDP Services).
- q4 option c: the claim that a source deploy without `--function` runs as a regular service needing a web server on `$PORT` is reasoning from the deploy-functions page and the Cloud Run container contract. No page states it word for word.
- q10 option c: the claim that GKE-managed node VMs get external IPs back when they are recreated or repaired is general GKE behavior. No fetched page states it.
- q7: `--num-nodes` per zone and the default of three random zones for regional clusters are from the local `gcloud container clusters create --help` (SDK 570.0.0). The fetched reference page was truncated before those flag descriptions.

## Design notes

- I avoided the decisions of the mock bank. Bank 2.1.x and the related 3.x questions already test: get-credentials, internal-IP and DNS endpoints, contexts, auth plugin install, Autopilot traits and creation, regional `--num-nodes`, zonal→regional, private nodes + Cloud NAT at creation, authorized networks, release channel, ClusterIP/Ingress/internal LB, ImagePullBackOff 403, rollout undo, expose ports, GPU node pools, G2/L4, the storage service agent, the finalized event, Pub/Sub push, the Pub/Sub trigger, run jobs, deploy from source, and TPU/GPU fit. The new decisions are: what get-credentials does, zonal control plane outage behavior, UDP via a LoadBalancer Service, `--function` vs `--command`, Cloud Run GPU vs always-on GPU and TPU hosts, trigger event type immutability, a regional cluster with `--node-locations`, an image path 404 (missing repository segment), an EU multi-region trigger location + invoker, and enabling private nodes on an existing cluster and its existing pools.
