# E-ckad-51-services-ingress: doubts and deviations

16 exercises in `content/ckad/questions/networking/` (5.2.1, 5.2.2, 5.3.1, 5.3.2: 4 each). 7 `command` (4 object, 3 invocation), 9 `manifest`. Difficulty: 3 × 1, 8 × 2, 5 × 3. There was no model exercise for these objectives.

## Tooling

- **`kubectl create service <type>` cannot pass `factory/check-exercise.ts`.** `describeKubectl` takes `service` as the sub-verb and then reads the service type (`nodeport`, `clusterip`…) as the object name, so the consistency check reports "output has no object named nodeport". It only handles `secret <type>` that way. Because of this I used `kubectl expose` for the object-mode Service exercises and wrote no `create service` exercise. Suggested fix: handle `service <type>` like `secret <type>` in `factory/exercise.ts`. That file is not mine to edit.
- **`kubectl expose` on a file.** The two expose exercises give the exposed object in `body.files`, and the candidate types `kubectl expose deployment|pod NAME …`. `expose` has no `--local` flag, so the application must resolve the object from the file. Please check how CI runs these.

## Outputs written without a local kubectl (CI must confirm)

kubectl was not available here, so I wrote the dry-run outputs from my knowledge of kubectl v1.37:
- **`expose`:**
  - labels are copied from the exposed object;
  - the selector comes from the Deployment `matchLabels` or the Pod labels;
  - each port has `protocol: TCP`, with no port name when there is a single port;
  - there is no `spec.type` unless `--type` is given;
  - `status.loadBalancer: {}` is printed;
  - `metadata.namespace` comes from `-n`.
- **`create ingress`:**
  - a path ending in `*` gives `pathType: Prefix` with the `*` removed, and a path without `*` gives `Exact`;
  - a numeric port gives `port.number`;
  - `,tls=secret` gives `tls: [{hosts: [host], secretName}]`, and `,tls` alone has no `secretName`;
  - a rule without a host gives a rule with no `host` field.
- The reference page of `kubectl create ingress` describes the `*` as the "leading character", but all its examples put it at the end. I followed the examples.

## Facts not stated on the pages I fetched

- The `why` lines say the API server rejects a Service with two ports `53/TCP` and a multi-port Service with unnamed ports. The Service page only says multi-port Services "must" name every port. Rejection is what API validation does, but I did not see it written on kubernetes.io.
- The Ingress page does not say that the TLS Secret must be in the Ingress namespace, so no exercise depends on it. The stems put the Secret in the Ingress namespace.

## Scope

- No `kubectl create secret tls` exercise for 5.3.2: an object-mode output needs a real certificate and key pair, which kubectl validates. Secret creation stays under 4.6.1.
- Endpoints is described as deprecated since v1.33 (checked on the Service page); the EndpointSlice exercise treats `kubectl get endpoints` as a wrong answer.
