Services & Networking is 20 % of the CKA. The tasks in this chapter expose a Deployment with the right Service type and ports, find why a Service has no backends, wire a Service to an external address, prove that Pods can reach each other, and change cluster DNS. Checks run from inside the cluster, in a temporary Pod: Pod and Service IPs are usually not routable from your terminal.

<!-- section: network-model | objectives: 5.1.1 -->
## The Kubernetes network model and its address ranges

| Rule of the model | Consequence |
| --- | --- |
| Every Pod gets its own cluster-wide IP | Containers of one Pod share it and talk over `localhost` |
| Pods reach every other Pod, on any node, **without NAT** | A Pod sees the real source IP of the other Pod |
| Services get a stable virtual IP from a separate range | kube-proxy (or the CNI) translates it to Pod IPs |

The **CNI plugin** implements the Pod network; the container runtime sets up each Pod's network namespace. Three ranges must not overlap: node addresses, the **Pod CIDR** and the **Service CIDR**.

| Range | kubeadm setting | Control plane flag | Default |
| --- | --- | --- | --- |
| Pod CIDR | `kubeadm init --pod-network-cidr`, `networking.podSubnet` | kube-controller-manager `--cluster-cidr` (with `--allocate-node-cidrs=true`) | None; each node gets a `/24` slice in `spec.podCIDR` |
| Service CIDR | `kubeadm init --service-cidr`, `networking.serviceSubnet` | kube-apiserver `--service-cluster-ip-range` | `10.96.0.0/12` |
| DNS domain | `--service-dns-domain`, `networking.dnsDomain` | kubelet `clusterDomain` | `cluster.local` |

```bash
kubectl get pods -n shop -o wide                              # IP and NODE columns
kubectl get pod web-0 -n shop -o jsonpath='{.status.podIP}'
kubectl get nodes -o wide                                     # INTERNAL-IP column
kubectl get node node-1 -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}'
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODCIDR:.spec.podCIDR
kubectl get servicecidr                                       # the Service range (stable since v1.33)
grep -E 'service-cluster-ip-range|cluster-cidr' /etc/kubernetes/manifests/kube-*.yaml
kubectl -n kube-system get cm kubeadm-config -o yaml | grep -E 'podSubnet|serviceSubnet|dnsDomain'
```

> **Exam trap.** The Service CIDR is set on the **API server** (`--service-cluster-ip-range`), the Pod CIDR on the **controller manager** (`--cluster-cidr`). Some CNI plugins use their own IP address management, so Pod IPs may not come from `spec.podCIDR`: when asked for a Pod's IP, read `status.podIP`, not the node range.

<!-- section: connectivity-tests | objectives: 5.1.2 -->
## Testing Pod-to-Pod and Pod-to-Service connectivity

The test always runs from a Pod: `kubectl run` with `--rm -it --restart=Never` starts a throw-away client, prints the result and deletes the Pod.

```bash
kubectl get pods -n shop -o wide                              # target Pod IP and port
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop -- wget -qO- -T 2 http://10.244.2.15:8080
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop -- wget -qO- -T 2 http://web:80
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- -T 2 http://web.shop.svc.cluster.local
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop --labels=role=frontend -- wget -qO- -T 2 http://api:8080
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 \
  --overrides='{"spec":{"nodeName":"node-2"}}' -- wget -qO- -T 2 http://10.244.1.7:8080
kubectl exec -n shop deploy/frontend -- wget -qO- -T 2 http://api:8080   # from an existing Pod
```

| Task asks for | How |
| --- | --- |
| Pod to Pod | `wget` the Pod IP and the **container** port |
| Pod to Service | `wget` the Service name or ClusterIP and the **Service** port |
| Across nodes | Pin the client with `--overrides` and `nodeName`, compare with a client on the target's node |
| Through a NetworkPolicy | Give the client the labels and namespace the policy selects (`--labels`, `-n`) |
| Save the result | Keep a client (`kubectl run tmp --image=busybox:1.36 --restart=Never -- sleep 3600`), then `kubectl exec tmp -- wget ... > /root/result.txt` |

`-T 2` sets a two-second timeout: a timeout points to a NetworkPolicy or the CNI, `connection refused` to a wrong port or a stopped process, `bad address` to DNS.

> **Exam trap.** Without `--restart=Never` the Pod gets `restartPolicy: Always` and runs the command again after it exits. Don't test a Service with `ping`: in the default iptables mode a ClusterIP is a virtual IP handled by rules on its TCP or UDP ports and does not answer ICMP, so test the port with `wget`.

<!-- section: service-types | objectives: 5.3.1 -->
## Exposing workloads with Services

| Type | Reachable at | Typical task |
| --- | --- | --- |
| `ClusterIP` (default) | Virtual IP and DNS name inside the cluster | Internal backend |
| `NodePort` | ClusterIP, plus `<node-ip>:<nodePort>` on every node | Reach the app from outside on a fixed port |
| `LoadBalancer` | NodePort and ClusterIP, plus an external address from a load balancer controller | Public entry on a cloud or MetalLB-style cluster |
| Headless (`clusterIP: None`) | No virtual IP: DNS returns the Pod IPs | StatefulSets, client-side load balancing |
| `ExternalName` | DNS CNAME to `spec.externalName`, no proxying | Alias for an external host name |

```bash
kubectl expose deployment web -n shop --port=80 --target-port=8080 --name=web
kubectl expose deployment web -n shop --port=80 --target-port=http --type=NodePort --name=web-np
kubectl create service clusterip api -n shop --tcp=8080:8080       # selector app=api
kubectl create service nodeport web-ext -n shop --tcp=80:8080 --node-port=30080
kubectl create service clusterip db -n shop --clusterip="None" --tcp=5432:5432
kubectl create service externalname billing -n shop --external-name=billing.example.com
kubectl patch svc web-np -n shop --type=json -p='[{"op":"replace","path":"/spec/ports/0/nodePort","value":30080}]'
```

`kubectl expose` copies the Deployment's selector (only `matchLabels` is supported) and, without `--port`, its container ports. It has no `--node-port` flag: use `kubectl create service nodeport --node-port`, a patch or a manifest. `kubectl create service` sets the selector `app=<service-name>`, which matches nothing if the Pods use other labels.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-np
  namespace: shop
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - name: http                 # names are required when there are several ports
    protocol: TCP
    port: 80                   # Service port
    targetPort: http           # container port name or number
    nodePort: 30080            # 30000-32767 by default
  - name: metrics
    port: 9090
    targetPort: 9090
```

A named `targetPort` refers to `ports[].name` in the Pod template, so the container port number can change without touching the Service. Without `targetPort`, it defaults to `port`. A fixed `nodePort` must be inside `--service-node-port-range` (default `30000-32767`) and unused, or the API refuses the Service. A `LoadBalancer` Service shows `EXTERNAL-IP <pending>` until a load balancer implementation exists, but its nodePort already works.

> **Exam trap.** `port` is what clients call, `targetPort` is where the container listens, `nodePort` is on the nodes. `spec.clusterIP` cannot be changed on an existing Service: to make a Service headless, delete and recreate it with `clusterIP: None` (`kubectl replace --force -f`).

<!-- section: endpointslices | objectives: 5.3.2 -->
## EndpointSlices and Services without a selector

For a Service with a selector, the EndpointSlice controller lists the matching Pods in EndpointSlices labelled `kubernetes.io/service-name=<service>`, at most 100 endpoints per slice by default. Each endpoint has conditions: `ready` (serving and not terminating; normally only ready endpoints get traffic), `serving` and `terminating`. The `v1` Endpoints API is deprecated since v1.33: read EndpointSlices.

```bash
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
kubectl get endpointslices -n shop -l kubernetes.io/service-name=web \
  -o jsonpath='{range .items[*].endpoints[*]}{.addresses[0]}{" "}{.conditions.ready}{"\n"}{end}'
kubectl describe svc web -n shop                  # Selector, TargetPort, Endpoints
kubectl get pods -n shop -l app=web -o wide       # same IPs?
```

| What you see | Meaning |
| --- | --- |
| No EndpointSlice, Service has a selector | No Pod has those labels in this namespace |
| Endpoints with `ready: false` | Pods matched but not Ready (readiness probe) |
| Endpoints present, connection refused | `targetPort` does not match a listening container port |
| No EndpointSlice, Service has no selector | Expected: create it yourself |

A Service **without a selector** points at backends you list manually, such as a database outside the cluster. Create the Service and an EndpointSlice with the label `kubernetes.io/service-name` and a port **name** equal to the Service port name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
  namespace: shop
spec:
  ports:
  - name: pg
    protocol: TCP
    port: 5432
    targetPort: 5432
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-db-1
  namespace: shop
  labels:
    kubernetes.io/service-name: legacy-db
    endpointslice.kubernetes.io/managed-by: cluster-admins
addressType: IPv4
ports:
- name: pg
  protocol: TCP
  port: 5432
endpoints:
- addresses:
  - "192.0.2.10"
```

Endpoint addresses cannot be loopback, link-local or the ClusterIP of another Service. If the backend is a host name rather than an IP, use an `ExternalName` Service instead.

> **Exam trap.** The EndpointSlice is linked to its Service by the `kubernetes.io/service-name` **label**, not by its name, and it must be in the same namespace. On a slice you write by hand, set `endpointslice.kubernetes.io/managed-by` to a name of your own: the value `endpointslice-controller.k8s.io` is reserved for the control plane's controller.

<!-- section: dns-names | objectives: 5.6.1 -->
## Resolving Services and Pods by DNS name

| Object | DNS name | Resolves to |
| --- | --- | --- |
| Service | `web.shop.svc.cluster.local` | The ClusterIP |
| Headless Service | `db.shop.svc.cluster.local` | The IPs of all ready Pods |
| StatefulSet Pod (with `serviceName: db`, headless) | `db-0.db.shop.svc.cluster.local` | That Pod's IP |
| Pod with `hostname` and `subdomain` matching a headless Service | `<hostname>.<subdomain>.shop.svc.cluster.local` | That Pod's IP |
| Any Pod (`pods insecure` in CoreDNS) | `10-244-1-7.shop.pod.cluster.local` | `10.244.1.7` |
| `ExternalName` Service | `billing.shop.svc.cluster.local` | CNAME to `billing.example.com` |

```bash
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -n shop -- nslookup web
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- nslookup db-0.db.shop.svc.cluster.local
kubectl exec -n shop web-0 -- cat /etc/resolv.conf
```

The kubelet writes each Pod's `/etc/resolv.conf` from `clusterDNS` and `clusterDomain` in `/var/lib/kubelet/config.yaml`:

```text
nameserver 10.96.0.10
search shop.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

`nameserver` is the ClusterIP of the `kube-dns` Service in `kube-system` (CoreDNS keeps that name). The search list explains short names: `web` works only from the `shop` namespace, `web.shop` from anywhere. `dnsPolicy: ClusterFirst` is the default; `Default` (**not** the default) copies the node's resolver, `ClusterFirstWithHostNet` is for `hostNetwork: true` Pods, `None` requires `dnsConfig` (up to 3 `nameservers`, `searches`, `options`).

> **Exam trap.** A StatefulSet Pod name resolves only through the headless Service named in `spec.serviceName`, in the same namespace. When the task says "write the FQDN", include `.svc.cluster.local` (or the cluster's own domain from `clusterDomain`).

<!-- section: coredns-corefile | objectives: 5.6.2 -->
## Editing the CoreDNS Corefile

CoreDNS runs as the `coredns` Deployment in `kube-system` (Pods labelled `k8s-app=kube-dns`), behind the `kube-dns` Service, and reads its configuration from the `Corefile` key of the `coredns` ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health {
            lameduck 5s
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . 192.0.2.53
        cache 60
        loop
        reload
        loadbalance
    }
    corp.example.com:53 {
        errors
        cache 30
        forward . 10.150.0.1
    }
```

| Task asks for | Change in the Corefile |
| --- | --- |
| Send non-cluster names to a given resolver | `forward . 192.0.2.53` instead of `forward . /etc/resolv.conf` |
| Stub domain: `corp.example.com` answered by `10.150.0.1` | A new server block `corp.example.com:53 { ... forward . 10.150.0.1 }` |
| Cache answers longer | `cache 60` (seconds) |
| Log every query | Add `log` to the `.:53` block |

```bash
kubectl -n kube-system get cm coredns -o yaml > /root/coredns-backup.yaml
kubectl -n kube-system edit cm coredns
kubectl -n kube-system rollout restart deployment coredns
kubectl -n kube-system rollout status deployment coredns
kubectl -n kube-system logs -l k8s-app=kube-dns
kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- nslookup host1.corp.example.com
```

The `reload` plugin rereads a changed Corefile on its own (every 30 seconds plus jitter, after a ConfigMap propagation of a minute or two). With an error in the new Corefile, running Pods keep the old configuration and log the error, but restarted Pods fail to start: check the logs. Give `forward` IP addresses (or `/etc/resolv.conf`); the CoreDNS release that kubeadm v1.37 installs also accepts a host name, resolved once at start-up. The `loop` plugin stops CoreDNS when it forwards to itself, typically when the node's `/etc/resolv.conf` points to a local resolver such as systemd-resolved; the kubelet must then pass `/run/systemd/resolve/resolv.conf` (kubelet `resolvConf`, which kubeadm sets when it detects systemd-resolved).

> **Exam trap.** Edit the **ConfigMap**, not a file on a node, and keep the cluster domain in the `kubernetes` line identical to `clusterDomain`. `rollout restart` applies the change at once instead of waiting for `reload`; deleting the Pods one by one works too, but editing the Deployment does not change the Corefile.

<!-- section: key-points -->
## Key points

- One IP per Pod, no NAT between Pods; Pod CIDR on the controller manager (`--cluster-cidr`), Service CIDR on the API server (`--service-cluster-ip-range`, default `10.96.0.0/12`); Pod IPs in `status.podIP`.
- Test from `kubectl run tmp --rm -it --restart=Never --image=busybox:1.36 -- wget -qO- -T 2 ...`: Pod IP with the container port, Service with the Service port.
- `kubectl expose --port --target-port --type`; fixed nodePort with `create service nodeport --node-port` or a manifest (30000-32767); headless is `clusterIP: None`, set at creation.
- EndpointSlices are found by the label `kubernetes.io/service-name`; selectorless Services need a hand-written EndpointSlice with matching port name.
- DNS: `svc.ns.svc.cluster.local`, `pod-0.headless.ns.svc.cluster.local`; `resolv.conf` from kubelet `clusterDNS`, `ndots:5`.
- CoreDNS: `coredns` ConfigMap (`forward`, stub-domain blocks, `cache`); back up, edit, `rollout restart deployment coredns`, check logs.
