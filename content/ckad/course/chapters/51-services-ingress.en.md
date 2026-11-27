Pods come and go with new IP addresses; a **Service** gives a set of Pods one stable virtual IP and DNS name, and an **Ingress** routes HTTP and HTTPS requests from outside the cluster to Services by host name and path. CKAD tasks ask you to expose a Deployment on a given port and type, to fix a Service that reaches no Pod, and to write an Ingress with hosts, paths, a class and TLS. Nearly every failure comes from a selector that matches nothing or from a port number taken from the wrong layer.

<!-- section: service-types | objectives: 5.2.1 -->
## Expose workloads with Services

A Service selects Pods by **labels** (`spec.selector`) and load-balances to their ready endpoints. The type decides where it can be reached from; each type builds on the previous one.

| Type | Reachable from | What is allocated |
| --- | --- | --- |
| `ClusterIP` (default) | Inside the cluster only | A cluster IP |
| `NodePort` | Any node IP on the node port, from outside | Cluster IP + a port from 30000-32767 on every node |
| `LoadBalancer` | An external load balancer of the provider | Cluster IP + node port + external address |
| `ClusterIP` with `clusterIP: None` (headless) | DNS returns the Pod IPs directly | No cluster IP, no load balancing |
| `ExternalName` | DNS CNAME to `spec.externalName` | Nothing, no proxying |

The fastest command is `kubectl expose`: it copies the selector from the Deployment's `matchLabels`, and the Service gets the name of the resource unless you pass `--name`.

```bash
kubectl expose deployment web -n shop --port=80 --target-port=8080
kubectl expose deployment web -n shop --port=80 --target-port=8080 --type=NodePort --name=web-np
kubectl expose pod api -n shop --port=9000 --name=api-svc
kubectl run cache --image=redis:7.4 -n shop --port=6379 --expose    # Pod + ClusterIP Service
```

`kubectl create service` exists too, but it sets the selector to `app: NAME`, the Service's own name, and names each port after its `--tcp` value (`80-8080`). It is the right tool only when the Pods carry that label, or when you need `--node-port`, which `expose` does not have.

```bash
kubectl create service nodeport web -n shop --tcp=80:8080 --node-port=30080 --dry-run=client -o yaml > web-svc.yaml
kubectl create service clusterip db -n shop --clusterip="None"
```

The manifest the tasks expect:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - name: http
    protocol: TCP           # default
    port: 80                # the Service's port
    targetPort: 8080        # the container's port; defaults to port
    nodePort: 30080         # optional; allocated from 30000-32767 if omitted
```

A Service is reachable at `web` from Pods of its namespace, `web.shop` from other namespaces, and `web.shop.svc.cluster.local` in full.

> **Exam trap.** `kubectl create service clusterip web` against a Deployment whose Pods are labelled `app.kubernetes.io/name: web` produces a Service with **no endpoints**. Use `kubectl expose deployment web`, or fix the selector before applying.

<!-- section: service-ports | objectives: 5.2.1 -->
## port, targetPort, nodePort and named ports

| Field | Belongs to | Who uses it |
| --- | --- | --- |
| `containerPort` | Container spec | Informational; also the source of a port **name** |
| `port` | Service | Clients connect to `CLUSTER-IP:port` and `NAME:port`; the Ingress backend refers to it |
| `targetPort` | Service | Port on the Pod where traffic is sent; a number or a container port name |
| `nodePort` | Service (NodePort, LoadBalancer) | Port opened on every node |

A named `targetPort` follows the container: if the next version listens on another port, only the Pod template changes.

```yaml
# Pod template
ports:
- name: http-api
  containerPort: 8080
---
# Service
ports:
- name: http
  port: 80
  targetPort: http-api
```

When a Service has more than one port, **every port must have a name** (lowercase alphanumerics and `-`, starting and ending with an alphanumeric). `protocol` defaults to `TCP`; a UDP port must say `protocol: UDP` (`kubectl expose ... --protocol=UDP`).

| Task says | Field or flag |
| --- | --- |
| "accessible on port 80" | `port: 80` / `--port=80` |
| "the application listens on 8080" | `targetPort: 8080` / `--target-port=8080` |
| "on port 30080 of every node" | `type: NodePort`, `nodePort: 30080` |
| "use the container port named metrics" | `targetPort: metrics` |
| "no cluster IP, DNS returns Pod IPs" | `clusterIP: None` |

> **Exam trap.** Swapping `port` and `targetPort` is the classic mistake: the Service then sends traffic to a port nothing listens on. Read the stem again: the port the **application** listens on is the `targetPort`.

<!-- section: service-troubleshooting | objectives: 5.2.2 -->
## Troubleshoot a Service

Work from the Service down to the Pods. The EndpointSlice controller writes the IPs of the Pods that match the selector into EndpointSlices labelled `kubernetes.io/service-name`; an empty list means the selector matches no Pod or no matching Pod is ready.

```bash
kubectl get svc web -n shop -o wide                          # type, ports, SELECTOR column
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl get pods -n shop --show-labels
kubectl get pods -n shop -l app=web -o wide                  # same selector as the Service
kubectl describe svc web -n shop                             # TargetPort and Endpoints lines
```

Then test from inside the cluster with a temporary Pod, which is deleted when the command ends:

```bash
kubectl run tmp -n shop --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- -T 2 http://web:80
kubectl run tmp -n shop --rm -it --restart=Never --image=busybox:1.36 -- nslookup web.shop.svc.cluster.local
kubectl port-forward svc/web -n shop 8080:80                 # from your terminal
```

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No endpoints, Pods are Running | Selector and Pod labels differ (key, value, typo) | `kubectl edit svc`, or `kubectl set selector svc web app=web` (replaces the whole selector) |
| No endpoints, Pods are 0/1 Ready | Readiness probe fails; not-ready Pods receive no traffic | Fix the probe or the application |
| Endpoints exist, connection refused or timeout | `targetPort` is not the port the container listens on | Correct `targetPort` |
| Works by Pod IP, not by name from another namespace | Short name used across namespaces | Use `web.shop` or the full name |
| NodePort unreachable | Wrong `nodePort`, or `type` still `ClusterIP` | Check `kubectl get svc` PORT(S) column, e.g. `80:30080/TCP` |

> **Exam trap.** The legacy Endpoints API is deprecated since Kubernetes v1.33; EndpointSlices are the current source. Do not add the selector labels to the Service's `metadata.labels`: Service labels play no part in matching Pods, only `spec.selector` does.

> **Exam tip.** `kubectl expose` fails when the Deployment's selector uses `matchExpressions`, because a Service selector supports only equality labels. Pass the equality labels yourself with `--selector` (for example `--selector=app=web,tier=front`), or write the Service manifest with the right labels.

<!-- section: ingress-rules | objectives: 5.3.1 -->
## Ingress rules, path types and classes

An Ingress has no effect without an **Ingress controller** running in the cluster. Each controller handles one **IngressClass**; the Ingress names it in `spec.ingressClassName`. Without that field, the class annotated `ingressclass.kubernetes.io/is-default-class: "true"` is used. The old `kubernetes.io/ingress.class` annotation predates the field and is deprecated. The Ingress API (`networking.k8s.io/v1`) is GA and frozen: Gateway API is its successor, but it is not part of the CKAD.

```bash
kubectl get ingressclass
kubectl create ingress shop -n shop --class=nginx \
  --rule="shop.example.com/*=web:80" \
  --rule="shop.example.com/api*=api:8080" \
  --default-backend=web:80 --dry-run=client -o yaml > shop-ing.yaml
```

`--rule` reads `host/path=service:port[,tls[=secret]]`. A path **without** a trailing `*` gets `pathType: Exact`; `path*` gets `pathType: Prefix` with the `*` removed; leave out the host for a catch-all rule; the port is a number or a Service port name.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
spec:
  ingressClassName: nginx
  defaultBackend:
    service:
      name: web
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
              number: 8080        # the Service port, or name: http
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

| `pathType` | Path | Request | Match |
| --- | --- | --- | --- |
| `Prefix` | `/api` | `/api`, `/api/`, `/api/v1` | Yes |
| `Prefix` | `/api` | `/apiv1` | No: element by element, split on `/` |
| `Exact` | `/api` | `/api/` | No |
| `Prefix` `/foo` and `Exact` `/foo` | both | `/foo` | `Exact` wins; otherwise the longest matching path wins |
| `ImplementationSpecific` | any | any | Up to the IngressClass |

`pathType` is required on every path. `host: "*.example.com"` matches `a.example.com` but not `example.com` nor `a.b.example.com`. A rule without `host` matches every host. Requests that match no rule go to `defaultBackend`; an Ingress without rules must have one.

> **Exam trap.** `kubectl create ingress --rule="shop.example.com/api=api:8080"` produces `pathType: Exact`, so `/api/orders` is not routed. Add the `*` when the task says "all paths under `/api`". And the backend `port` is the **Service** port, never the container's `targetPort`.

<!-- section: ingress-tls-troubleshooting | objectives: 5.3.2 -->
## TLS on an Ingress and Ingress troubleshooting

TLS terminates at the controller on port 443; traffic to the Service stays plain HTTP. The certificate lives in a Secret of type `kubernetes.io/tls` with the keys `tls.crt` and `tls.key`, in the namespace of the Ingress (`secretName` has no namespace field).

```bash
kubectl create secret tls shop-tls -n shop --cert=shop.crt --key=shop.key
kubectl create ingress shop -n shop --class=nginx \
  --rule="shop.example.com/*=web:80,tls=shop-tls"
```

```yaml
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - shop.example.com          # must match the rule's host and the certificate
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

The hosts under `tls` must match the `host` of the rules, and the certificate must cover them; TLS does not apply to a rule without host. Several hosts can share port 443 through SNI if the controller supports it.

Troubleshoot from the Ingress to the Service:

```bash
kubectl get ingress -n shop                       # CLASS, HOSTS, ADDRESS, PORTS (80, 443 with tls)
kubectl describe ingress shop -n shop             # rules, backends, events
kubectl get svc,endpointslices -n shop
curl -H "Host: shop.example.com" http://INGRESS_IP/
curl -k --resolve shop.example.com:443:INGRESS_IP https://shop.example.com/
```

| Symptom | Check |
| --- | --- |
| ADDRESS stays empty | No controller, or `ingressClassName` names a class that does not exist |
| 404 from the controller | Host header or path does not match a rule; `Exact` where `Prefix` was needed |
| 503 or bad gateway | Backend Service missing, in another namespace, wrong port, or no endpoints |
| Default or self-signed certificate served | Wrong `secretName`, Secret in another namespace, or `tls.hosts` not matching |
| Ingress rejected at creation | A path without `pathType`, or several IngressClasses marked default and no `ingressClassName` |

> **Exam trap.** The backend Service must be in the **same namespace** as the Ingress; there is no namespace field in the backend. To route to another namespace, the Ingress must be created in that namespace.

<!-- section: key-points -->
## Key points

- ClusterIP is the default; NodePort adds a port in 30000-32767 on every node; LoadBalancer adds an external address; `clusterIP: None` is headless.
- `kubectl expose` copies the workload's selector; `kubectl create service` always selects `app: NAME`.
- `port` is the Service's, `targetPort` the container's (number or name), `nodePort` the node's; multi-port Services need port names.
- No endpoints: compare `spec.selector` with `--show-labels`, check readiness, list `endpointslices -l kubernetes.io/service-name=NAME`, test with a temporary Pod.
- Ingress needs a controller and a class; `pathType` is required; `kubectl create ingress` paths are `Exact` unless they end with `*`.
- TLS: a `kubernetes.io/tls` Secret in the Ingress namespace, `tls.hosts` matching the rule hosts; backends always point to a Service port in the same namespace.
