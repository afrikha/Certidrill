# E-cka-22-monitoring-logs-networking — report

There are 24 exercises in `content/cka/questions/troubleshooting/`, 4 for each objective (2.3.1, 2.3.2, 2.4.1, 2.4.2, 2.5.1, 2.5.2):

- **Types:** 11 `command` exercises, all in mode `invocation` (2 of them use `crictl`), and 13 `manifest` exercises.
- **Difficulty:** 4 at level 1, 12 at level 2, 8 at level 3.

## Check run

- **check-exercise:** `npx tsx factory/check-exercise.ts cka cka-2c- cka-2d- cka-2e-` crashes in the shared working copy. The cause is a YAML parse error in another agent's file, `content/cka/questions/troubleshooting/cka-2b-etcd-listen-client-urls.yaml`, line 342. It is an unquoted `why:` value that contains `: `. The checker parses every file before it applies the filter. I ran the same checker on an isolated copy that held only my 24 files: `24 exercise(s), 0 problem(s)`. That file was fixed later, and a final run on the shared copy also gives `24 exercise(s), 0 problem(s)`.
- **content:validate:** `npm run -s content:validate -- --cert cka --prefix cka-2c-` and `--prefix cka-2d-` and `--prefix cka-2e-` each report 0 problems and 0 warnings.

## Coverage gaps

- **2.4.1, "write them to a file":** not practised. The engine refuses `>` and pipes, so no single-command exercise can redirect logs to a file.
- **2.5.2, kube-proxy and CNI checks:** these appear only in explanations. I could not verify the content of the kubeadm `kube-proxy` ConfigMap (`config.conf`) on kubernetes.io. CNI configuration files are JSON with no `apiVersion`/`kind`, and the manifest checker rejects documents without them. The 2.5.2 set covers a DNS test from a temporary Pod, the CoreDNS Corefile, `ClusterFirstWithHostNet`, and DNS egress blocked by a NetworkPolicy.

## Parser limits (factory/exercise.ts)

- **Short flags of non-kubectl tools:** for these tools, a short flag that is not in `GENERIC_BOOL` takes the next word as its value. `crictl ps -a --name redis` therefore parses as `a: "--name"`. My exercises do not need `-a`, and the checks use long flags. Adding the crictl booleans (`-a`, `-q`, `-v`, `-l`) to the parser would let candidates type the usual short forms.
- **kubectl boolean flags missing from `KUBECTL_BOOL`:** `--sum`, `--prefix`, `--show-capacity`, `--attach` and `--all-pods` are not in the list. When one of them is followed by a positional word (`kubectl top pod --sum web`), it swallows that word. My solutions place these flags before another flag or at the end. A candidate might not, so it is worth adding them.

## Facts not taken from kubernetes.io

- **metrics-server:** the flags (`--kubelet-insecure-tls`, `--kubelet-preferred-address-types` and its default) come from the GitHub README. The default arguments and image `registry.k8s.io/metrics-server/metrics-server:v0.9.1` come from the latest `components.yaml` release, fetched on 2026-11-27. The log lines in `metrics-server.log` are realistic but made up.
- **`crictl ps --namespace` and `--name`:** both take regular expressions. This comes from the cri-tools source (`cmd/crictl/container.go`), as do `crictl logs --tail` and `--all`. The kubernetes.io crictl page shows only `ps -a`, `pods --name/--label`, `logs --tail` and `exec -i -t`. In `cka-2d-crictl-logs-exited`, the `crictl ps` output uses the header columns that kubernetes.io shows. Newer crictl versions also print `POD ID` and `POD` columns.
- **Default container:** with no `kubectl.kubernetes.io/default-container` annotation, kubectl uses the first container and prints `Defaulted container "x" out of: …`. This is kubectl behaviour, not quoted from the docs; the labels page only documents the annotation. Two exercises rely on it: `cka-2d-default-container-annotation` and the second negative of `cka-2d-logs-previous-container`.
- **TCP fallback for DNS:** the TCP negative of `cka-2e-netpol-allow-dns-egress` says that answers too large for UDP are retried over TCP. This is general DNS behaviour. The docs only mention it indirectly, in the Alpine/musl known issue.
- **Endpoints deprecation:** the EndpointSlices page attaches "Deprecated since v1.33" to Endpoints mirroring and says that the Endpoints API is deprecated. The exercises say only "deprecated", without a version. The chapter says "deprecated since v1.33" for the whole API.

## Choices to review

- **`cka-2c-describe-quota-usage`:** it accepts both `describe` and `get` on the quota, because `get -o yaml` also shows `status.used` and `status.hard`.
- **`cka-2d-crictl-ps-name-namespace`:** the stem tells the candidate to use the name and namespace filters. Without that, `--label io.kubernetes.pod.namespace=shop` would be a valid answer that the checks cannot accept.
- **`cka-2e-netpol-allow-dns-egress`:** the stem asks for both protocols to be written explicitly. `- port: 53` without a protocol, which defaults to TCP, cannot be told apart from a UDP-only rule by the `contains` checks.
- **`cka-2e-hostnetwork-dnspolicy`:** the stem forbids hard-coding the DNS server address. Without that, `dnsPolicy: None` plus `dnsConfig` would be a valid alternative.
- **`cka-2d-crictl-logs-exited`:** the solutions do not include `crictl logs -p <running-id>`, because I could not confirm how `-p` behaves with crictl.
