# Q-kcna-2a — KCNA questions, domain orchestration, Networking (2.1.1–2.1.6) (2026-11-23)

## Result
48 `single` questions in `content/kcna/questions/orchestration/kcna-2a-*.yaml`, 8 per objective (2.1.1–2.1.6). Difficulty 20 easy / 21 medium / 7 hard. Correct options are spread evenly: 12 each on a, b, c and d. English only.
Check: `CERT=kcna npx tsx factory/validate.ts --prefix kcna-2a-` gives 0 problems. `npm run content:validate -- --cert kcna --prefix kcna-2a-` gives 0 problems and 0 warnings.

## Sources fetched (2026-11-23), the only ones used as references
kubernetes.io: services-networking overview, Network Plugins, Service, Virtual IPs and Service Proxies, EndpointSlices, DNS for Services and Pods, Using CoreDNS for Service Discovery, Debugging DNS Resolution (used to check facts, not cited), Ingress, Ingress Controllers, Gateway API, Network Policies. Also: gateway-api.sigs.k8s.io/docs, cncf.io/projects (Istio, CoreDNS), glossary.cncf.io/service-mesh, istio.io (Sidecar or ambient?, Security, Traffic Management), linkerd.io (What is a service mesh?, Overview), docs.cilium.io intro, and github.com/containernetworking/cni.

## v1.37 facts used
- kube-proxy uses `iptables` by default in 1.37 (`nftables` is planned as the future default). `ipvs` is deprecated: disabled by default from v1.40 and removed in v1.43.
- The Endpoints API has been deprecated since v1.33. EndpointSlices hold 100 endpoints by default.
- `externalIPs` has been deprecated since v1.36. It is not used in any question.
- The kubelet CNI flags were removed in 1.24, and the container runtime loads the CNI plugins.
- The Ingress API is frozen, and the Gateway API is its successor. A Gateway accepts Routes only from its own namespace unless `allowedRoutes` is set.
- A default-deny egress policy also blocks DNS. The `kubernetes.io/metadata.name` namespace label is used to select a namespace by name.
- In Istio, sidecar mode needs Pod restarts and uses more resources. Ambient mode is enabled with a namespace label and adds waypoints for Layer 7 features. Both modes use mTLS.
- Linkerd uses Rust micro-proxies and graduated from the CNCF in 2021. Istio graduated in 2023 and CoreDNS in 2019.

## Doubts / not fully verified
1. The fetched pages did not list `kubernetes.io/hostname` (node label), `app.kubernetes.io/name` (recommended label) or `/etc/services`. They appear only as wrong options in kcna-2a-np-namespace-name-label and kcna-2a-dns-resolv-conf, and those facts are standard.
2. The fetched Istio pages do not show that `AuthorizationPolicy` can match HTTP methods and paths (kcna-2a-np-layer7-limit). They only say it evaluates the request context with rules. Matching by method and path is long-standing Istio behaviour.
3. The Gateway API pages do not map each resource to a persona explicitly; the mapping appears only in a diagram. The questions therefore describe GatewayClass, Gateway and HTTPRoute by their function, not by role.
4. In kcna-2a-mesh-weighted-routing, "a plain Service spreads connections across all ready Pods" is a simplification: kube-proxy in iptables mode picks a backend at random.
5. Overlap with other batches: kcna-3a-httproute-weights (3.1.1) tests HTTPRoute weights for a canary. kcna-2a-mesh-weighted-routing tests a different decision (mesh weighting compared with Service, NetworkPolicy and headless Service) and has no HTTPRoute option. The troubleshooting batch (2.3.4) may also cover DNS and egress. kcna-2a-np-egress-dns is written as a default-deny design question.
