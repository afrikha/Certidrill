# C-ckad-6 — report

Chapters written (English only): `44-serviceaccounts-security` (objectives 4.7.1, 4.7.2, 4.8.1, 4.8.2), `51-services-ingress` (5.2.1, 5.2.2, 5.3.1, 5.3.2). Validators: 0 problem(s) for both chapters (the 2 problems shown by check-cert are in `questions/design/ckad-1c-*`, not mine).

## Sources checked (2026-11-27)

kubernetes.io pages (v1.37 docs): Configure Service Accounts for Pods, Service Accounts, Managing Service Accounts (kube-api-access volume), Projected Volumes, kubectl create token, kubectl set serviceaccount, kubectl create ingress, Configure a Security Context, Pod Security Standards, Service, Ingress, Debug Services. kubectl and API source (kubernetes/kubernetes master) for generator behavior: `create ingress` (Exact by default, `*` → Prefix), `create service` (selector `app: NAME`, port name `80-8080`), `expose` flags (no `--node-port`), `run` (no `--serviceaccount`, `--expose`), `set selector` (Services only), core/v1 and networking/v1 type comments (field levels, defaults, backend Service in same namespace).

## Doubts / not verified on a cluster

- No kubectl binary in the sandbox: generator behaviors come from the kubectl master source, not from a v1.37 binary run.
- `kubectl exec ... -- id` comment kept vague ("groups include 2000") because `supplementalGroupsPolicy: Merge` may add groups from the image's `/etc/group`.
- "Unknown securityContext fields at Pod level are refused by `kubectl apply` (strict field validation by default)": based on kubectl's default `--validate=strict`; not tested.
- TLS Secret "in the namespace of the Ingress": the Ingress page does not say it explicitly; deduced from `secretName` having no namespace field (controllers behave so).
- `kubectl set serviceaccount` supported types copied from the reference page (CronJob and Pod not listed).
- Ingress-nginx retirement news not mentioned (not on the Ingress concept page; out of CKAD scope).
