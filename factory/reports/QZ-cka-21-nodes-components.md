# QZ-cka-21-nodes-components — report

File: `content/cka/quizzes/21-nodes-components.yaml` (10 questions, `cka-qz-21-01` to `-10`).
Checks: `check-quiz.ts cka 21-nodes-components` → 0 problem(s), 0 warning(s); `check-exercise.ts cka cka-qz-21-` → 0 problem(s) (2 command/invocation, 3 manifest).

| # | Obj. | Diff. | Type | Tests |
| --- | --- | --- | --- | --- |
| 1 | 2.1.1 | 1 | single | `Ready=Unknown` = no heartbeat for `node-monitor-grace-period` (50 s) |
| 2 | 2.2.1 | 1 | single | deleting a mirror Pod does not stop the static Pod |
| 3 | 2.1.2 | 2 | single | `KUBELET_EXTRA_ARGS=--max-pods` overrides `maxPods` in config.yaml |
| 4 | 2.1.3 | 2 | single | DiskPressure → `disk-pressure:NoSchedule` taint; scheduler reads taints |
| 5 | 2.2.3 | 2 | single | load balancer health check → `/readyz` |
| 6 | 2.1.3 | 3 | command | remove only `dedicated=batch:NoExecute` (`key:effect-` vs `key-`) |
| 7 | 2.1.2 | 3 | command | drain blocked by a PDB → `--disable-eviction` + daemonsets + emptyDir + `--timeout` |
| 8 | 2.2.1 | 3 | manifest | kube-apiserver: `--client-ca-file` / `--requestheader-client-ca-file` swapped |
| 9 | 2.1.1 | 3 | manifest | kubelet: wrong `clientCAFile` path + anonymous/AlwaysAllow relaxation |
| 10 | 2.2.2 | 3 | manifest | API server down → etcd exits → `etcd-certs` hostPath wrong (two-hop log reading) |

Bank overlap checked against every `content/cka/questions/` exercise of 2.1.x/2.2.x and the related ones elsewhere (`cka-2d-crictl-logs-exited`, `cka-4d-certs-renew-apiserver`, `cka-4d-etcd-manifest-hostpath`, `cka-3e-taint-node-noschedule`, `cka-4b-kubelet-tolerate-swap`): crictl logs and kubeadm certs renew ideas were dropped because the bank already has them.

## Verified (kubernetes.io pages fetched 2026-11-27)

- Node Status: `Unknown` / `node-monitor-grace-period` default 50 s; capacity vs allocatable.
- Create static Pods: deleting the mirror Pod leaves the static Pod running; all non-dot files are read.
- Set Kubelet Parameters Via A Configuration File: command-line flags (except feature gates) have the highest precedence; kubelet-integration page: `KUBELET_EXTRA_ARGS` last, highest priority; kubelet reference: `--max-pods` still exists (deprecated).
- Taints and Tolerations: condition taints are `NoSchedule`, scheduler checks taints not conditions; NoExecute/NoSchedule semantics. kubectl taint reference: `dedicated:NoSchedule-` and `dedicated-` examples.
- API health endpoints: `/readyz` = route traffic away, `/livez` = restart, `/healthz` deprecated since v1.16. (The page says individual `/livez/<check>` endpoints are "Alpha since v1.37": not used.)
- kubectl drain reference: `--disable-eviction` bypasses PDB checks; `--force` only for Pods without a controller; `--grace-period` vs `--timeout`.
- PKI certificates page: `--client-ca-file` = `ca.crt`, `--requestheader-client-ca-file` = `front-proxy-ca.crt`, etcd `--cert-file` = `etcd/server.crt`; kubeadm implementation details confirm the API server flags.
- Kubelet config v1beta1: file defaults `anonymous.enabled: false`, `webhook.enabled: true`, `authorization.mode: Webhook` (the kubelet-authn-authz page gives the flag default `AlwaysAllow`). Q9 checks therefore accept the fields being removed.
- kube-controller-manager reference (v1.37): controller names are now `bootstrap-signer-controller`, `token-cleaner-controller`… (not used in the quiz).

## Unverified / illustrative

- Log lines in `body.files` are illustrative, not copied from a v1.37 cluster: the kube-apiserver `Unable to authenticate the request` line (Q8), the grpc/`Error creating leases` lines (Q10, file:line references invented), the etcd JSON lines (Q10: which certificate etcd opens first, peer.crt, and the `msg` texts are not verified). The kubelet line `failed to construct kubelet dependencies: unable to load client CA file …` (Q9) matches a published troubleshooting lab, not kubernetes.io.
- Q8: the 401 (`Unauthorized`) rather than 403 for a client certificate signed by an unknown CA relies on the API server's fail-on-error anonymous fallback; consistent with experience but not stated on a fetched page.
- Q5: "`/readyz` fails first during a graceful shutdown" relies on the page's `--shutdown-delay-duration` + `/readyz` sentence.

## Doubts and design notes

- Q8 and Q9 test kubelet authentication/authorization fields and `--requestheader-client-ca-file`, which chapter 21 does not cover (it only shows `authentication.x509.clientCAFile` and lists `--client-ca-file`). Suggest adding one line to the chapter (kubelet-configuration section: kubeadm writes anonymous false / webhook true / `authorization.mode: Webhook`; static-pod table: `--requestheader-client-ca-file=front-proxy-ca.crt`).
- Q8 accepts a repeated flag when the correct value is the last one (pflag keeps the last value) and rejects it when the wrong value is last.
- Q7: the parser does not record flag position; `--timeout` accepts `5m`, `300s`, `5m0s` only (`0h5m` would be rejected).
- Engine limitation (for the whole bank): for tools other than kubectl/helm, an unknown short flag takes the next word as its value, so `crictl ps -a --name kube-apiserver` parses `-a` = `--name`. Exercises with `crictl ps -a <more flags>` would wrongly reject correct answers; `crictl` should get a short-flag table (`a` → `all`, boolean).
- No error found in the chapter or in the bank exercises read.
