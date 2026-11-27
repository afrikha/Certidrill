# E-ckad-44-serviceaccounts-security — report

16 exercises in `content/ckad/questions/environment/` (4.7.1, 4.7.2, 4.8.1, 4.8.2: 4 each). 7 `command` (2 object, 5 invocation), 9 `manifest`. Difficulty: 3 × 1, 8 × 2, 5 × 3. No model exercise existed for these objectives.

Sources checked (2026-11-27): kubernetes.io task pages "Configure Service Accounts for Pods", "Configure a Security Context for a Pod or Container", tutorial "Restrict a Container's Syscalls with seccomp", "Projected Volumes", kubectl reference pages for `create serviceaccount`, `create token`, `set serviceaccount`; kubectl and kubernetes sources on GitHub for aliases (`create sa`, `set sa`), the `--bound-object-kind` case-sensitive map (Node, Pod, Secret), the kubelet runAsNonRoot error messages, and API validation (localhostProfile must be relative; expirationSeconds ≥ 600); Pod Security Standards page for NET_BIND_SERVICE in Restricted.

## Doubts to check in CI with real kubectl v1.37

- `ckad-4g-set-serviceaccount-deployment`: the outputs of `kubectl set sa … --local -o yaml` are written as the typed encoding (`strategy: {}`, `resources: {}`, `status: {}`, no `creationTimestamp`). The negative with `kubectl annotate` is written as the unstructured form (file content plus the annotation). Only `metadata.name`, `spec.template.spec.serviceAccountName`, `spec.serviceAccountName` (absent) and the image are checked, so a formatting difference does not change the result.
- Same exercise, negative `set sa deployment api shop:reporter`: assumed that `--local` does not validate the name and prints `serviceAccountName: shop:reporter`. If kubectl refuses it, replace the negative.
- `ckad-4g-get-pod-serviceaccount`: the parser maps `-ojsonpath=…` (no space) to `output: "jsonpath"`, so that spelling would fail the regex check even though it is correct for kubectl. Not used in solutions; engine limitation to fix in `parseCommand` (short flag followed by a value containing `=`).
- Checks cannot express "absent or false": in `ckad-4h-readonly-rootfs-deployment` the writability of the `/tmp` mount is therefore not checked (a `readOnly: true` on that mount alone is still caught by the read-only root filesystem check in the relevant negative). An `absentOr…` operator would help.
- `ckad-4g-pod-serviceaccountname`: the deprecated alias `spec.serviceAccount` alone would work on a real cluster but fails the `serviceAccountName` check; deliberate (deprecated field, explained in the explanation).
