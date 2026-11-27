# QZ-gcp-ace-32-manage-gke — report

File: `content/gcp-ace/quizzes/32-manage-gke.yaml` (10 questions, English only). `npx tsx factory/check-quiz.ts gcp-ace 32-manage-gke` → 0 problem(s), 0 warning(s).

Objectives: 3.1.4 (q1, q3, q7), 3.1.5 (q9), 3.1.6 (q5), 3.1.7 (q2, q6), 3.1.8 (q4, q8), 3.1.9 (q10). Positions 6–10: three `single` + two `multi` (q8 choose two, q9 choose three). No NOTE sentence (all-or-nothing `multi`).

The 28 mock-exam questions of 3.1.4–3.1.9 cover many of the chapter's decisions: get-credentials, Pods `-A -o wide`, EXTERNAL-IP, node pool inventory, HPA creation, missing requests, HPA/VPA conflict, VPA Off, total autoscaling flags, regional resize, migrate/drain, StatefulSet scale-down, internal LB, Autopilot defaults/limits-only/Balanced/Scale-Out ratio/billing, and node SA identity. The quiz tests other decisions: describe for ImagePullBackOff, DaemonSet, `clusters list` across locations, VPA `Initial`, per-zone min/max multiplication (numbers differ from the doc example), Ingress path routing, `--dns-endpoint`, HPA together with the cluster autoscaler, custom node SA with a cross-project repository, and Autopilot ratio + 0.25 vCPU rounding + limits without bursting.

## Verified on docs.cloud.google.com (2026-11-27)

- Troubleshoot image pulls (Events of `kubectl describe pod`); Automatically bootstrap GKE nodes with DaemonSets (DaemonSet definition); gcloud container clusters list (queries all locations); Install kubectl and configure cluster access (`--dns-endpoint`, `--internal-ip`, console-created clusters don't update kubeconfig).
- Vertical Pod autoscaling (modes; `InPlaceOrRecreate` is Preview; enabled by default on Autopilot; no bare Pods); Horizontal Pod autoscaling (requests needed, no node changes, 15 s, 300 s scale-down window, no HPA + standard VPA on CPU/memory); About GKE cluster autoscaling (per-zone `--min/--max-nodes`, `--total-*`, scale-up on unschedulable Pods based on requests).
- GKE Ingress for Application Load Balancers (one forwarding rule/IP, URL map path rules, container-native load balancing); About network isolation in GKE (DNS-based endpoint reachable from any network that reaches Google Cloud APIs, IAM-controlled).
- About service accounts in GKE (`roles/container.defaultNodeServiceAccount` minimum for custom node SAs); Deploying to Google Kubernetes Engine (Artifact Registry) (nodes pull as the node SA, grant Artifact Registry Reader, cross-project grant to the node SA).
- Resource requests in Autopilot (general-purpose 1:1–1:6.5, smaller resource increased, CPU rounded up to 0.25 vCPU without bursting, limits = requests without bursting, requests > limits → requests = limits, over-max rejected).
- Flags checked with the local gcloud 570.0.0 `--help`: `get-credentials --dns-endpoint/--internal-ip`, `clusters update --node-pool --enable-autoscaling --min-nodes --max-nodes`, `node-pools create --service-account`, `clusters update --enable-dns-access`.

## Doubts and unverified facts

- q10: the docs give the two rules (increase the smaller resource for the ratio, round CPU up to 0.25 vCPU) but no example combining them. 750m is the smallest 0.25 multiple that satisfies 1:6.5 for 4 GiB (0.615 vCPU), so the answer holds whichever rule runs first.
- q6: the docs describe the Ingress load balancer as the classic Application Load Balancer. The explanation says "external Application Load Balancer", like the chapter.
- q7: I did not verify which permission the DNS-based endpoint requires (`container.clusters.connect`). The stem avoids the question by saying that the SRE already holds the required roles.

## Chapter (`32-manage-gke.en.md`) against current docs

- Exam trap in "Viewing the cluster inventory": "Creating a cluster from the CLI configures credentials automatically". The page fetched only states this for `gcloud container clusters create-auto`. It is very likely true for `create` too, but worth checking or rewording.
- HPA/VPA rules: the VPA page now also offers "HPA rightsizing with VPA (Preview)" alongside multidimensional Pod autoscaling. The chapter mentions only multidimensional Pod autoscaling (Beta). The conclusion is the same (not a production answer).
- Autopilot table: the "1 GiB ephemeral storage" default was not confirmed on the part of the page I read (the second half gives no single default value). Please re-check.
- VPA table "Recreate (default, also called Auto)": the docs say `Auto` is the default value that enforces `Recreate`. That is consistent.
