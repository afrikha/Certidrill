# C-ckad-7 — 52-network-policies (EN only)

Verified on kubernetes.io (v1.37 pages fetched 2026-11-27): Network Policies concept page, NetworkPolicy v1 API reference (podSelector optional, defaults to `{}`; policyTypes defaulting; protocol default TCP; endPort rules; ipBlock except inside cidr), Declare Network Policy task, kubectl create subcommands (no `networkpolicy` generator), kubectl resource types (`netpol`), DNS debugging page (`k8s-app=kube-dns`, 53/UDP + 53/TCP).

Doubts / not verified verbatim:
- "Use the Service's targetPort": derived from the API text "numerical or named port on a pod"; not stated in those words on kubernetes.io.
- Error strings of busybox wget (`download timed out` shown in the docs task; `bad address` and `connection refused` from busybox behavior, not kubernetes.io). "connection refused" is hedged with "usually": some plugins may reject rather than drop.
- `matchLabels: {access: true}` rejected: follows from `map[string]string`, not a doc sentence.
- `busybox:1.36` tag chosen as a known existing tag.
- Word count 2,178 by `wc -w` including code blocks (prose alone is within 1,300–2,200).
