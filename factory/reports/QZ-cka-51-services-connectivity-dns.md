# QZ-cka-51-services-connectivity-dns — report

File: `content/cka/quizzes/51-services-connectivity-dns.yaml` (10 questions, English only). Checks: `check-quiz cka 51-services-connectivity-dns` 0 problem(s), 0 warning(s); `check-exercise cka cka-qz-51-` 0 problem(s) (5 exercises: 1 command/invocation, 4 manifest).

| # | Objective | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 5.1.1 | 1 | single | Pod-to-Pod without NAT: the server sees the client Pod IP |
| 2 | 5.6.1 | 1 | single | default `dnsPolicy` is `ClusterFirst` (`Default` is not the default) |
| 3 | 5.3.1 | 2 | single | fixed node port: `create service nodeport --tcp=80:8080 --node-port` (expose has no `--node-port`) |
| 4 | 5.3.2 | 2 | single | reading EndpointSlice conditions (`ready`/`serving` false, `terminating` false → Pods not Ready) |
| 5 | 5.6.2 | 2 | multi | `reload` behaviour: automatic reload, invalid Corefile keeps running config, restarted Pod fails |
| 6 | 5.1.2 | 3 | command (invocation) | `kubectl exec deploy/x -c <container with wget>` to a cross-namespace Service on its Service port |
| 7 | 5.6.1 | 3 | manifest | ExternalName alias to a StatefulSet Pod FQDN (`ledger-0.ledger-hl.finance.svc.cluster.local`) |
| 8 | 5.3.1 | 3 | manifest | two-port NodePort Service over two Deployments with different port numbers (named `targetPort`, shared selector, defaulted `targetPort` trap) |
| 9 | 5.3.2 | 3 | manifest (2 docs) | moving a selector Service to an external VM: remove selector, slice port = backend port 9443, port name match |
| 10 | 5.6.2 | 3 | manifest | Corefile restored from the docs on a cluster with `clusterDomain: k8s.internal`: fix the `kubernetes` zone, add `log` |

Bank overlap avoided (`cka-5a-*`, `cka-5c-*`, `cka-5f-*`): no `kubectl run` test Pod, no `debug`, no node-pinned Pods, no jsonpath on nodes, no headless expose, no LoadBalancer expose, no externalTrafficPolicy, no new selectorless Service from scratch, no label fix, no named-port fix of an existing Service, no stub domain, no upstream/cache change, no loop/resolvConf, no dnsConfig, no hostname/subdomain, no rollout restart task. No ExternalName existed anywhere in the CKA bank or quizzes. Q9 shares fields with `cka-5c-selectorless-endpointslice` (Service + EndpointSlice), but the task (migrating an existing selector Service while its Pods keep running) and the traps (selector removal, slice port ≠ Service port, `targetPort` not used) differ.

Sources fetched: Services, Load Balancing, and Networking; Service; DNS for Services and Pods; EndpointSlices; StatefulSets; Customizing DNS Service; kubectl create service nodeport; kubectl expose; kubectl exec; coredns.io `reload` and `forward` plugin pages (verification only, not cited).

## Chapter errors

- Section `coredns-corefile`: "`forward` accepts IP addresses only, not host names" is **outdated**. The current coredns.io `forward` page says TO "can also be a hostname" (resolved at startup, `resolver` option). The page does not say from which CoreDNS release, and I could not confirm the CoreDNS version kubeadm installs with v1.37. The Customizing DNS Service page still says that CoreDNS does not support FQDNs for stub domains and nameservers, but that sentence is about translating the old kube-dns ConfigMap. I kept this point out of the quiz. Suggested fix: "Use IP addresses in `forward`. Recent CoreDNS releases also accept a host name, which is resolved once at start-up."
- Same section, minor: `reload` checks every 30 s with ±15 s jitter (coredns.io), and the Kubernetes page advises allowing two minutes. The chapter's "30 seconds plus jitter" is fine.

## Doubts / unverified

- Q5 (b): "an invalid Corefile keeps the running configuration and logs an error" comes from the coredns.io `reload` page. The cited kubernetes.io page only says that changes take about two minutes. Statement (d), a restarted Pod fails with an invalid Corefile, is the chapter's claim; I reasoned it out but found no page that states it.
- Q7: the check also accepts a trailing dot (`…cluster.local.`). From memory, API validation trims a trailing dot from `externalName`; I did not verify this. Negative 2 relies on DNS behaviour: a CNAME target is absolute and the client's search list does not apply to it. Kubernetes docs do not state this. CoreDNS answering a CNAME to an in-zone headless Pod record is also not shown in the docs, but the client resolver follows the CNAME in any case.
- Q9: the docs do not say in so many words that `targetPort` is not used for a Service without a selector. The example on the Service page (port 80, targetPort 9376, slice port 9376) and the sentence "on port 9376" fit it, and so does kube-proxy taking the port from the EndpointSlice. One valid but unusual alternative fails the checks: keeping a selector that matches no Pod (for example `app: none`) next to the hand-written slice would also send traffic to the VM. The checks require that the selector is removed, which is the documented pattern.
- Q10: negative 2 (`kubernetes svc.k8s.internal`) is explained from how the plugin parses names below its zone, not from a quoted page. The regex checks accept extra zones on the `kubernetes` line (for example `cluster.local k8s.internal`), a trailing dot, and `log` anywhere in the block, with or without arguments.
- Q6: the regex checks accept `-O-`, `-qO-`, `-O -`, `-O /dev/stdout`, `-T 3`, `-T3`, `--timeout=3`, a URL with or without `http://`, `inventory.stock[.svc[.cluster.local]]`, and `sh -c`, `/bin/sh -c` or `busybox` wrappers. I did not verify that BusyBox `wget` accepts the long option `--timeout`. `wget` without `-O-` is rejected, because it saves the body to a file named `healthz` instead of printing it.
- Q8: negative 4 assumes the API rejects `nodePort: 80` (outside 30000-32767, which the Service page states).
