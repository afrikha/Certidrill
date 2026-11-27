# E-ckad-extra-networking: doubts and deviations (2026-11-27)

12 new exercises in `content/ckad/questions/networking/`, 2 per objective. 5 `command` (42 %: 3 object, 2 invocation) and 7 `manifest`. Difficulty: 8 × 2, 4 × 3.

| Id | Obj. | Type | Diff. | New task or trap |
| --- | --- | --- | --- | --- |
| ckad-5a-ingress-from-all-namespaces | 5.1.1 | manifest | 2 | `namespaceSelector: {}` (all Pods of all namespaces) vs no `from` / `podSelector: {}` / `0.0.0.0/0` |
| ckad-5a-label-exists-udp | 5.1.1 | manifest | 3 | `matchExpressions` `Exists` on a Pod label + `protocol: UDP` |
| ckad-5a-allow-all-ingress-web | 5.1.2 | manifest | 2 | allow-all `ingress: [{}]` next to a default deny |
| ckad-5a-test-as-labeled-client | 5.1.2 | command/invocation | 2 | temporary test Pod with `--labels` so that the policy admits it |
| ckad-5b-create-service-fixed-nodeport | 5.2.1 | command/object | 2 | `create service nodeport --node-port` (fixed node port) |
| ckad-5b-headless-service | 5.2.1 | manifest | 2 | headless Service `clusterIP: None` |
| ckad-5b-port-forward-service | 5.2.2 | command/invocation | 2 | `port-forward svc/NAME LOCAL:SERVICE_PORT` |
| ckad-5b-fix-service-no-selector | 5.2.2 | manifest | 3 | labels in `metadata` instead of `spec.selector`, named `targetPort` mismatch |
| ckad-5c-create-ingress-wildcard-default | 5.3.1 | command/object | 2 | wildcard host + `--default-backend` with a named port |
| ckad-5c-ingress-exact-and-prefix | 5.3.1 | manifest | 3 | same path `/docs` as `Exact` and `Prefix` (Exact wins) |
| ckad-5c-annotate-default-ingressclass | 5.3.2 | command/object | 2 | `ingressclass.kubernetes.io/is-default-class=true` annotation |
| ckad-5c-fix-rejected-ingress-tls | 5.3.2 | manifest | 3 | two default classes refuse an Ingress without class + missing `pathType` + `tls.hosts` mismatch |

## Outputs written without a local kubectl (CI must confirm)

- `create service nodeport`: written from `create_service.go` (fetched): labels and selector `app: NAME`, port name `80-8080`, `protocol: TCP`, `nodePort` only when `--node-port` is given, namespace from `-n`, `status.loadBalancer: {}`. Without `--node-port` I assume `nodePort: 0` is omitted from the YAML.
- `create ingress` with a wildcard host: the `--rule` regex in `create_ingress.go` accepts `*` in the host. I assumed the printed host is quoted (`'*.tenants.example.com'`), which does not change the parsed value. `--default-backend=notfound:http` → `defaultBackend.service.port.name: http` (same port parsing as rule backends).
- `annotate ingressclass nginx …` on the file: the output is the file object plus the annotation, as for the existing `label namespace` exercise.

## Facts I did not see on kubernetes.io

- "Present but empty `namespaceSelector` selects all namespaces" and "protocol defaults to TCP": I took these from the API type comments in `staging/src/k8s.io/api/networking/v1/types.go`, because the API reference page could not be fetched. The concept page does not say either one.
- `kubectl port-forward svc/web 9000:8080` failing because the Service has no port 8080: the reference only says the remote port of a Service is translated to the targetPort of that Service port. I did not see the error itself documented.
- I assumed the API server rejects `type: NodePort` with `clusterIP: None`. `create_service.go` refuses it on the client side ("ClusterIP=None can only be used with ClusterIP service type"), but I did not read the server validation.
- I assumed the default-class annotation counts only when its value is exactly `true` (the negative uses `yes`). The Ingress page says to set it "to `true`".
- I assumed `kubectl expose` has no `--node-port` flag (the chapter says so). I did not fetch the expose reference.

## Check limits (correct answers that would fail)

- `ingress-from-all-namespaces`: `namespaceSelector: {matchLabels: {}}` would fail, because only `{}` and `{namespaceSelector: {}, podSelector: {}}` are accepted.
- `ingress[0]` and `from[0]` indexes assume a single rule, the natural layout.
- `allow-all-ingress-web`: only `ingress: [{}]` is accepted.
- The "no Egress" and "no NodePort type" checks use a negative-lookahead regex on the JSON of `spec`.
