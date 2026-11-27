# C-cka-6 — CKA course, chapters 52-network-policies and 53-ingress-gateway-api

Files: `content/cka/course/chapters/52-network-policies.en.md` (1,905 words incl. code), `content/cka/course/chapters/53-ingress-gateway-api.en.md` (2,016 words incl. code). English only, no `.fr.md`.
Checks: `check-cert.ts cka 52-network-policies 53-ingress-gateway-api` → 0 problems in these chapters; `content:validate --cert cka --course --chapters ...` → 0 problem(s) (13 in other chapters, which are not written yet).

## Sources
- kubernetes.io (page sources from kubernetes/website `main` via raw.githubusercontent.com, plus WebFetch with `offset` for API references): Network Policies concept, Declare Network Policy task, NetworkPolicy v1 API reference (port, endPort, protocol default TCP, from/to/ports empty semantics, policyTypes default), Ingress concept, Ingress Controllers, Ingress v1 API reference (IngressTLS, ingressClassName), Gateway API concept page, kubectl create ingress reference, DNS debugging (CoreDNS label `k8s-app=kube-dns`, Service `kube-dns`), well-known labels (`kubernetes.io/metadata.name`), example manifests (allow-all ingress, TLS Ingress, default IngressClass).
- kubectl source `staging/src/k8s.io/kubectl/pkg/cmd/create/create_ingress.go`: a `--rule` path without trailing `*` gets `pathType: Exact`.
- gateway-api.sigs.k8s.io: guides index (install command with v1.7.0), HTTP routing, redirects and rewrites, header modifier, traffic splitting, TLS, cross-namespace routing, HTTPRoute and ReferenceGrant API pages, API spec. Go types in kubernetes-sigs/gateway-api `apis/v1` (shared_types.go, gateway_types.go, httproute_types.go, referencegrant_types.go, gatewayclass_types.go) for enums, defaults, condition reasons, short names and print columns. Release notes (v1.5.0: ReferenceGrant moves to v1; ListenerSet and TLSRoute v1 in Standard).

## Doubts / deviations
- **Gateway API version**: the guides page shows `v1.7.0` in the install command; I did not find the v1.7.0 release notes themselves (the releases page fetched covered v1.5.x and v1.6.x). The chapter uses `v1.7.0` in the install URL. Change it if the exam environment ships another bundle.
- **ReferenceGrant apiVersion**: the ReferenceGrant API page still says `v1beta1` (Standard since v0.6.0), while the v1.5.0 release notes and the `apis/v1` Go types have it in `v1`, and the TLS guide uses `v1`. The chapter uses `gateway.networking.k8s.io/v1`, as the profile asks; older bundles accept only `v1beta1`.
- **Redirect status codes**: the Go type allows 301, 302, 303, 307, 308 (default 302); 303/307/308 are Extended conformance (v1.6.2 notes), the spec page enum shows 301/302 for Core. The chapter only states the default 302 and uses 301.
- **Ingress TLS Secret in the Ingress namespace**: standard behavior (the Secret is referenced by name only), but no kubernetes.io sentence states it explicitly.
- **Ingress symptoms (404 / 503 / default certificate)**: typical controller behavior, controller-specific; written as "check" hints, not guaranteed codes.
- **Policy ports are Pod ports (targetPort)**: follows from the API text ("a numerical or named port on a pod"); the claim that Service DNAT happens before policy evaluation is how common plugins behave, not a kubernetes.io statement (the docs say NAT ordering is undefined for ipBlock).
- **Timeout versus connection refused** when testing policies: plugin-dependent; written with "usually".
- **Existing Ingresses not updated by a new default IngressClass**: the docs say the default is applied to *new* Ingresses; that existing ones stay unchanged is the inference.
- `kubectl get pods -A | grep -i ingress` to find the controller: generic; controller names and namespaces depend on the installation (ingress-nginx is no longer listed on the Ingress Controllers page, so no controller is named).
