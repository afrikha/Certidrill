# QZ-cka-53-ingress-gateway-api — report

Quiz `content/cka/quizzes/53-ingress-gateway-api.yaml`, 10 questions (`cka-qz-53-01` to `-10`).

| # | Objective | Diff. | Type | Tested |
| --- | --- | --- | --- | --- |
| 1 | 5.5.1 | 1 | multi | Ingress `Prefix` matching: element by element, case-sensitive (`/app/`, `/app/v1/users` vs `/application`, `/App`, `/apps`) |
| 2 | 5.4.1 | 1 | single | HTTPS listener without `tls.mode` → `Terminate` |
| 3 | 5.4.2 | 2 | single | weights 3/1/unset → 60/20/20 (default weight 1) |
| 4 | 5.5.2 | 2 | single | default IngressClass is applied only to new Ingresses → set `ingressClassName` on the existing one |
| 5 | 5.4.2 | 2 | single | match precedence: longer prefix beats header match |
| 6 | 5.5.2 | 3 | command/object | two default IngressClasses: remove the marker from `legacy` (`key-` or `=false --overwrite`) |
| 7 | 5.5.1 | 3 | command/object | `kubectl create ingress` with host-less rules (any host), `*` → Prefix, port name, `--annotation` |
| 8 | 5.4.1 | 3 | manifest | Gateway: two HTTPS listeners on 443 (SNI, own certs), `from: All` / `Selector` on `kubernetes.io/metadata.name` / default `Same` |
| 9 | 5.4.2 | 3 | manifest | HTTPRoute `URLRewrite` `ReplacePrefixMatch` + cross-namespace backend + ReferenceGrant (HTTPRoute→Service) |
| 10 | 5.4.2 | 3 | manifest | fix an HTTPRoute from its status: `NoMatchingParent` (sectionName), hostname intersection, `BackendNotFound`, Service port |

Bank exercises read (cka-5d-*, cka-5e-*, 16 files): none repeated. Not reused: describe httproute, GatewayClass controllerName jsonpath, http+https listeners single host, allowedRoutes custom label + kinds, cross-namespace certificate grant (Gateway→Secret), 301 redirect, 80/20 canary, header match + set header, create ingress two hosts TLS, Exact + default backend, wildcard host, two TLS Secrets, fix ingressClassName = controller string, controller logs, annotate default class, list IngressClasses.

## Doubts and unverified facts

- **Q6 outputs**: not run through real kubectl. Removing the only annotation of `edge` (negative 1) is written without `annotations:`; kubectl may print `annotations: {}` (no check depends on it). For negative 2 (`kubectl label … key-` on a label that does not exist), I assume kubectl prints a "not found" notice and the unchanged object; not verified.
- **Q6 solution 2**: `is-default-class=false` is accepted because the DefaultIngressClass admission plugin compares the value with `"true"`; kubernetes.io only documents setting `true`, so "false = not default" is from the plugin's behaviour, not a doc sentence.
- **Q7**: the output assumes that kubectl merges the two host-less `--rule` entries into one rule with two paths (it does so for the same host, per the "multipath" example). The checks are written as regexes on the JSON of `spec.rules` and pass whether or not the rules are merged, but they rely on kubectl's alphabetical key order (`backend`, `path`, `pathType`), which the application gets from real kubectl.
- **Q4**: "the default class is assigned only at creation" comes from kubernetes.io ("new Ingresses … will be assigned") and the chapter; I did not read the admission plugin source to confirm it ignores updates.
- **Q9/Q10**: `parentRefs.port: 443` instead of `sectionName` is accepted by the checks (it targets both 443 listeners; `admin` refuses the route by `allowedRoutes`). ParentRef `port` is an Extended feature; I could not reach its support level on the fetched part of the API reference.
- **Q9**: trailing-slash variants (`/legacy/catalog/`, `/v1/`) are accepted, based on the API reference sentence that a trailing `/` is ignored for `ReplacePrefixMatch`; the full example table was not in the fetched part.
- **Q10**: the status messages in `route-status.txt` are invented (they are implementation-specific); the reasons `NoMatchingParent` and `BackendNotFound` are checked against the Gateway API `shared_types.go` (raw.githubusercontent.com, used for verification only, not as a reference).
- API Reference page title: only the H1 "API Reference" could be read, not the HTML `<title>`.

## Chapter / bank remarks

- No error found in the chapter or in the bank exercises read.
