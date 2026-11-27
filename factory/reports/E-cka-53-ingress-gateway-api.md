# E-cka-53-ingress-gateway-api — report

16 exercises in `content/cka/questions/networking/`, 4 per objective:

- 5.4.1 (`cka-5d-`): gatewayclass-controller-name, gateway-http-https-listeners, gateway-allowed-routes-selector, gateway-cross-namespace-certificate.
- 5.4.2 (`cka-5d-`): httproute-weighted-canary, httproute-header-match-modifier, httproute-https-redirect, describe-httproute-status.
- 5.5.1 (`cka-5e-`): create-ingress-two-hosts-tls, create-ingress-exact-default-backend, ingress-wildcard-host-apex, ingress-two-tls-secrets.
- 5.5.2 (`cka-5e-`): list-ingressclasses, ingress-controller-logs, default-ingressclass-annotate, fix-ingress-not-routing.

Mix: 7 `command` (4 invocation, 3 object) = 44 %, 9 `manifest` = 56 %. Difficulty: 3 × 1, 8 × 2, 5 × 3 (19/50/31 %).

## Checks

- `npx tsx factory/check-exercise.ts cka cka-5d- cka-5e-`: 16 exercise(s), 0 problem(s).
- `npm run -s content:validate -- --cert cka --prefix cka-5d-` and `--prefix cka-5e-`: 0 problem(s) each.

## Pages fetched

kubernetes.io: Ingress, Ingress Controllers, Gateway API, kubectl create ingress, kubectl logs, blog "Gateway API v1.5: Moving features to Stable". gateway-api.sigs.k8s.io: GatewayClass, Gateway, HTTPRoute, ReferenceGrant, TLS Configuration, Cross-Namespace routing, HTTP traffic splitting, HTTP path redirects and rewrites, HTTP Header Modifiers, Troubleshooting and Status, API reference (spec). Also kubectl source `pkg/cmd/create/create_ingress.go` (rule/TLS grouping, pathType from `*`, port number vs name) and pkg.go.dev `sigs.k8s.io/gateway-api/apis/v1` (ReferenceGrantTo.name, listener reasons).

## Doubts / to verify in CI

- **ReferenceGrant apiVersion.** The v1.5 blog says ReferenceGrant moved to v1 and pkg.go.dev lists it in `apis/v1`, but the ReferenceGrant page still shows `v1beta1`. I used `gateway.networking.k8s.io/v1` (as the TLS guide and `check-exercise.ts` do) and the checks do not test the apiVersion, so a `v1beta1` answer also passes. The explanation says "v1 since Gateway API v1.5".
- **Object-mode outputs** (`create-ingress-two-hosts-tls`, `create-ingress-exact-default-backend`) are derived from the source of `create_ingress.go`: rules with the same host are merged in order, hosts sharing a Secret go into one `tls` entry, a numeric port gives `port.number` and a name `port.name`. Key order follows kubectl's alphabetical YAML. `status: loadBalancer: {}` copied from the CKAD exercises. `default-ingressclass-annotate`: output written as for an object read with `--local -o yaml` (no status).
- **Not verified on a fetched page, so kept out of the text or only implied**: the Route reason names (`NotAllowedByListeners`, `BackendNotFound`…) were removed from `describe-httproute-status`; the `kubectl get ingressclass` columns (NAME, CONTROLLER, PARAMETERS, AGE) used in `ingressclass.txt` of `fix-ingress-not-routing` and the CONTROLLER column mentioned in `list-ingressclasses` are from memory; `gc` as the short name of GatewayClass (used in one solution) is from memory (the parser maps it).
- **Engine limits.** There is no "absent or equals" op, so:
  - path type defaults (`PathPrefix` when `type` is omitted) are checked with a regex on the serialized path object (`httproute-weighted-canary`); in `httproute-header-match-modifier` the path type is not checked;
  - `gateway-http-https-listeners` does not check `allowedRoutes` (default `Same`) or `tls.mode` (default `Terminate`);
  - `gateway-allowed-routes-selector` accepts `matchLabels` or `matchExpressions` (`In`) through a regex on the serialized selector; a `matchExpressions` entry written with `operator` before `key` would fail. The "ops listener unchanged" check is a negative lookahead regex (no `from: All|Selector`).
  - `httproute-https-redirect` forbids `hostname`/`path` overrides in `requestRedirect` with a lookahead regex.
- `httproute-weighted-canary` asks for the weights 80 and 20 explicitly, because equivalent ratios (4/1) would also be correct.
- Neutral controller names (`example.com/edge-ingress`, Deployment `edge-ingress-controller`): the Ingress Controllers page no longer lists the community ingress-nginx project, so I named no product.
- The Ingress page does not state that the TLS Secret must be in the Ingress namespace; no exercise depends on it.
