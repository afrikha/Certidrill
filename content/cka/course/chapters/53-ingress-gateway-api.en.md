HTTP traffic enters a cluster through one of two APIs. **Ingress** (`networking.k8s.io/v1`) is built in, generally available and frozen: it stays, but gets no new features. The **Gateway API** (`gateway.networking.k8s.io/v1`) is its successor, installed as CRDs and implemented by a controller. Both need a controller already running in the cluster; the exam gives you one and asks you to write the objects: an Ingress with host and path rules and TLS, a Gateway with the right listeners, an HTTPRoute with matches, weights and redirects, and to explain why a route does not work.

<!-- section: ingress-rules | objectives: 5.5.1 -->
## Ingress rules, path types and default backend

An Ingress maps a host and a path to a Service name and port. `pathType` is required on every path.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
spec:
  ingressClassName: web
  defaultBackend:
    service:
      name: not-found
      port:
        number: 80
  rules:
  - host: shop.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              name: http
```

`kubectl create ingress` writes the same object; a trailing `*` in the path means `Prefix`, without it the path is `Exact`:

```bash
kubectl create ingress shop -n shop --class=web \
  --rule="shop.example.com/api*=api:8080" \
  --rule="shop.example.com/*=web:http" \
  --default-backend=not-found:80
kubectl create ingress shop -n shop --class=web --rule="shop.example.com/api*=api:8080" --dry-run=client -o yaml > ing.yaml
```

| `pathType` | Matches |
| --- | --- |
| `Exact` | The URL path exactly, case-sensitive: `/foo` does not match `/foo/` |
| `Prefix` | Element by element on `/`: `/foo` matches `/foo`, `/foo/`, `/foo/bar`, not `/foobar` |
| `ImplementationSpecific` | Whatever the IngressClass decides |

When several paths match, the **longest** wins, then `Exact` over `Prefix`. A rule without `host` applies to every host. `*.example.com` matches `shop.example.com` but neither `example.com` nor `a.b.example.com` (one DNS label). Requests that match no rule go to `spec.defaultBackend`, or to the controller's own default when it is not set. An Ingress without `rules` must have a `defaultBackend`.

| Task asks for | Field or flag |
| --- | --- |
| Use a given controller | `spec.ingressClassName` (`--class`) |
| Port by number or by Service port name | `backend.service.port.number` or `.name` |
| Everything under `/app` | `path: /app`, `pathType: Prefix` (`/app*`) |
| Only `/healthz` | `pathType: Exact` (`/healthz` without `*`) |
| Unmatched requests | `spec.defaultBackend` (`--default-backend=svc:port`) |
| Controller-specific behavior (rewrite...) | `metadata.annotations` (`--annotation`), names defined by the controller |

> **Exam trap.** `kubectl create ingress --rule="shop.example.com/api=api:8080"` creates an **Exact** path: `/api/orders` will not match. Add the `*` or set `pathType: Prefix` when the task says "all paths under".

<!-- section: ingress-tls | objectives: 5.5.1 -->
## TLS on an Ingress

TLS terminates at the controller on port 443; traffic to the Pods is plain HTTP. The certificate lives in a Secret of type `kubernetes.io/tls` with keys `tls.crt` and `tls.key`, in the namespace of the Ingress.

```bash
kubectl create secret tls shop-tls -n shop --cert=shop.crt --key=shop.key
kubectl create ingress shop -n shop --class=web --rule="shop.example.com/*=web:80,tls=shop-tls"
```

```yaml
spec:
  ingressClassName: web
  tls:
  - hosts:
    - shop.example.com
    secretName: shop-tls
  rules:
  - host: shop.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

> **Exam trap.** The `hosts` of `tls` must match the `host` of the rules: TLS does not work on a rule without a host. If the controller serves its own default certificate, check the host spelling, the Secret name and its namespace.

<!-- section: ingress-class-troubleshooting | objectives: 5.5.2 -->
## IngressClass, controllers and troubleshooting

An IngressClass (cluster-scoped) names the controller that implements it in `spec.controller`. Ingresses reference the class by its **metadata name**.

```bash
kubectl get ingressclass                                   # NAME, CONTROLLER
kubectl get ingressclass web -o yaml                      # spec.controller, annotations
kubectl get pods -A | grep -i ingress                     # the controller's Pods
kubectl get svc -A | grep -i ingress                      # its NodePort or LoadBalancer
kubectl annotate ingressclass web ingressclass.kubernetes.io/is-default-class="true"
kubectl get ingress -A                                     # CLASS, HOSTS, ADDRESS
kubectl describe ingress shop -n shop                      # rules, backends with Pod IPs, events
curl -H "Host: shop.example.com" http://192.0.2.10:30080/api
```

The annotation `ingressclass.kubernetes.io/is-default-class: "true"` gives its class to **new** Ingresses created without `ingressClassName`. With two default classes, such Ingresses are refused at admission.

| Symptom | Check |
| --- | --- |
| `ADDRESS` stays empty | No controller for this class: wrong `ingressClassName`, no class and no default, controller Pods down |
| 404 from the controller | Host header or path does not match: `Exact` versus `Prefix`, missing host, request sent without the `Host` header |
| 503 or a backend error | `describe ingress` shows a backend without endpoints: Service selector, Service port name or number, Pods not Ready |
| Default certificate served | `tls.hosts` and `rules.host` differ, Secret missing or in another namespace |
| Ingress ignored after you set a default class | Existing Ingresses are not changed: set `ingressClassName` on them |

The old annotation `kubernetes.io/ingress.class` is deprecated; use the field.

> **Exam trap.** `ingressClassName` takes the name of the **IngressClass object** (`web`), not the controller string of `spec.controller` (`example.com/ingress-controller`).

<!-- section: gateway-resources | objectives: 5.4.1 -->
## Gateway API resources and the GatewayClass

| Kind | Scope | Who writes it | Role |
| --- | --- | --- | --- |
| GatewayClass | Cluster | Infrastructure provider | `controllerName` of the implementation |
| Gateway | Namespace | Cluster operator | Listeners: port, protocol, hostname, TLS, which routes may attach |
| HTTPRoute, GRPCRoute | Namespace | Application team | Matches, filters and backends, attached with `parentRefs` |
| ReferenceGrant | Namespace (the target's) | Owner of the target | Allows references from another namespace |

The CRDs come from the Gateway API release bundle; implementations install a GatewayClass.

```bash
kubectl get crd | grep gateway.networking.k8s.io
kubectl api-resources --api-group=gateway.networking.k8s.io
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.7.0/standard-install.yaml
kubectl get gatewayclass                 # short name gc; ACCEPTED must be True
kubectl get gateway -A                   # short name gtw; ADDRESS, PROGRAMMED
kubectl get httproute -A
kubectl explain gateway.spec.listeners
```

A Gateway references exactly one class with `gatewayClassName`. Its `status.conditions` show `Accepted` (the controller took it) and `Programmed` (the data plane is configured, address assigned).

<!-- section: gateway-listeners | objectives: 5.4.1 -->
## Gateways: listeners, TLS and allowedRoutes

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gw
  namespace: infra
spec:
  gatewayClassName: example
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    hostname: "*.example.com"
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    hostname: shop.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        group: ""
        name: shop-tls
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
```

| Listener field | Rule, default |
| --- | --- |
| `name` | Required, unique in the Gateway; routes target it with `sectionName` |
| `port`, `protocol` | Required; protocols `HTTP`, `HTTPS`, `TLS`, `TCP`, `UDP` |
| `hostname` | Optional; unset matches all hosts; a wildcard `*.example.com` is allowed |
| `tls` | Required for `HTTPS` and `TLS`; `mode` defaults to `Terminate`; `Passthrough` only with protocol `TLS` |
| `tls.certificateRefs` | Secrets (`tls.crt`, `tls.key`); one in another namespace needs a ReferenceGrant there |
| `allowedRoutes.namespaces.from` | `Same` (default), `All`, `Selector` with `selector` |

> **Exam trap.** By default a listener accepts routes **only from the Gateway's namespace**. A Gateway in `infra` and an HTTPRoute in `shop` do not attach until the listener says `from: All` or `from: Selector` with a label that namespace carries. A ReferenceGrant does not fix this.

<!-- section: httproute-matching | objectives: 5.4.2 -->
## HTTPRoutes: parentRefs, hostnames, matches and weights

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: shop
spec:
  parentRefs:
  - name: web-gw
    namespace: infra
    sectionName: http
  hostnames:
  - shop.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
      headers:
      - name: env
        value: canary
    backendRefs:
    - name: api-v2
      port: 8080
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-v1
      port: 8080
      weight: 90
    - name: api-v2
      port: 8080
      weight: 10
```

| Field | Rule, default |
| --- | --- |
| `parentRefs[].name` | The Gateway; `namespace` defaults to the route's namespace |
| `parentRefs[].sectionName` | One listener by name; unset attaches to every listener that allows the route |
| `hostnames` | Must intersect the listener `hostname`, or the route is not accepted for that listener |
| `matches` | Several entries are OR; path, `headers`, `queryParams` and `method` inside one entry are AND |
| `path.type` | `PathPrefix` (default, value `/`), `Exact`, `RegularExpression` |
| `headers[].type` | `Exact` (default) or `RegularExpression` |
| `backendRefs[].port` | Required for a Service |
| `backendRefs[].weight` | Proportional, default `1`; `0` sends no traffic |

In the route above, requests to `/api` with header `env: canary` go to `api-v2`; the others are split 90/10. When several rules match, the most specific wins: an `Exact` path, then the longest prefix, then a method match, the most header matches, the most query parameter matches. A rule without `matches` matches every request.

> **Exam trap.** Weights are ratios, not percentages: `3` and `1` give 75/25. A backend without `weight` counts as `1`, so adding a weight to only one backend changes the split in a way the task did not ask for.

<!-- section: httproute-filters | objectives: 5.4.2 -->
## Filters, cross-namespace backends and route status

Filters change the request or answer it. A redirect answers the client itself, so its rule has no `backendRefs`.

```yaml
rules:
- filters:
  - type: RequestRedirect
    requestRedirect:
      scheme: https
      statusCode: 301
- matches:
  - path:
      type: PathPrefix
      value: /old
  filters:
  - type: URLRewrite
    urlRewrite:
      path:
        type: ReplacePrefixMatch
        replacePrefixMatch: /new
  - type: RequestHeaderModifier
    requestHeaderModifier:
      set:
      - name: X-Env
        value: prod
      add:
      - name: X-Trace
        value: "on"
      remove: ["X-Debug"]
  backendRefs:
  - name: web
    port: 80
```

| Task asks for | Filter |
| --- | --- |
| HTTP to HTTPS, or a new host or path for the client | `RequestRedirect` (`scheme`, `hostname`, `port`, `path`, `statusCode` default `302`) |
| Rewrite the path or host sent to the backend | `URLRewrite` with `ReplaceFullPath` or `ReplacePrefixMatch` |
| Overwrite, append or remove request headers | `RequestHeaderModifier` `set`, `add`, `remove` |
| Same on the response | `ResponseHeaderModifier` |
| Copy traffic to another Service | `RequestMirror` |

`RequestRedirect` and `URLRewrite` cannot be in the same rule. For an HTTP-to-HTTPS redirect, attach the redirect route to the `http` listener only (`sectionName: http`), otherwise HTTPS requests are redirected too.

A `backendRefs` entry with a `namespace` needs a ReferenceGrant in the **Service's** namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: ReferenceGrant
metadata:
  name: allow-shop-routes
  namespace: billing
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: shop
  to:
  - group: ""
    kind: Service
```

```bash
kubectl describe httproute shop -n shop          # status.parents[].conditions
kubectl get httproute shop -n shop -o jsonpath='{.status.parents[*].conditions[*].reason}'
kubectl describe gateway web-gw -n infra         # listeners: attachedRoutes, conditions
```

| Route condition, reason | Fix |
| --- | --- |
| `Accepted` False, `NotAllowedByListeners` | Listener `allowedRoutes` (namespace or kind) |
| `Accepted` False, `NoMatchingListenerHostname` | Route `hostnames` versus listener `hostname` |
| `Accepted` False, `NoMatchingParent` | Wrong `sectionName` or `port` in `parentRefs` |
| `ResolvedRefs` False, `BackendNotFound` | Service name or namespace in `backendRefs` |
| `ResolvedRefs` False, `RefNotPermitted` | Missing ReferenceGrant in the target namespace |

<!-- section: key-points -->
## Key points

- Ingress: `ingressClassName` names an IngressClass object; `pathType` is required; `Prefix` matches whole path elements, `Exact` the full path; `kubectl create ingress` uses `Exact` unless the path ends with `*`.
- Ingress TLS: Secret `kubernetes.io/tls` in the Ingress namespace, `tls.hosts` equal to the rule hosts.
- Default IngressClass: annotation `ingressclass.kubernetes.io/is-default-class: "true"`, applied to new Ingresses only.
- Gateway API: GatewayClass (cluster), Gateway (listeners), HTTPRoute (`parentRefs`), all `gateway.networking.k8s.io/v1`.
- Listeners accept routes from the same namespace by default; open them with `allowedRoutes.namespaces.from: All` or `Selector`.
- HTTPS listener: `tls.mode` defaults to `Terminate`, `certificateRefs` to a TLS Secret.
- HTTPRoute: matches in one entry are AND, entries are OR; `PathPrefix /` is the default; weights are proportional, default 1.
- Filters: `RequestRedirect` (default 302), `URLRewrite`, `RequestHeaderModifier` `set`/`add`/`remove`.
- Cross-namespace backends and certificates need a ReferenceGrant in the target namespace; read `status.parents[].conditions` to troubleshoot.
