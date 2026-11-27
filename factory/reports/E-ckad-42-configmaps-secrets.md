# E-ckad-42-configmaps-secrets — report

16 exercises in `content/ckad/questions/environment/` (no model exercise existed for 4.4.x / 4.6.x).

| Objective | Exercises | Type | Difficulty |
|---|---|---|---|
| 4.4.1 | ckad-4d-configmap-from-literals, -from-file-key, -from-env-file, -immutable-manifest | 3 command/object, 1 manifest | 1, 2, 2, 2 |
| 4.4.2 | ckad-4d-configmap-envfrom-override, -volume-items, -env-optional-key, -subpath-args | 4 manifest | 2, 3, 2, 3 |
| 4.6.1 | ckad-4f-secret-generic-literals, -tls-from-files, -docker-registry, -data-stringdata | 3 command/object, 1 manifest | 1, 2, 2, 3 |
| 4.6.2 | ckad-4f-secret-env-keyref, -volume-items-envfrom, -decode-value, -volume-mount | 3 manifest, 1 command/invocation | 2, 3, 3, 1 |

Mix: 7 command (44 %) / 9 manifest; difficulty 3 × 1, 8 × 2, 5 × 3.

## Doubts to verify in CI (no kubectl in this environment)

- **Object-mode outputs were written by hand** (no kubectl binary here). Points to confirm with real kubectl v1.37:
  - `create secret generic` / `create configmap` print no `type` line and no `creationTimestamp` (left out per brief); keys sorted alphabetically.
  - `create secret docker-registry`: the `.dockerconfigjson` value assumes compact JSON with field order `username, password, email, auth` (`{"auths":{"registry.example.com":{...}}}`), base64 of that string. The `config` check compares the full base64 value, so a different field order in kubectl would break the solutions (and the check).
  - `create secret tls`: the certificate/key pair in `body.files` is a throwaway self-signed EC P-256 pair (CN shop.example.com, generated with openssl); kubectl validates that the pair matches, so it should pass. Values are base64 of the raw file bytes, trailing newline included.
  - `create configmap --from-file` with a trailing newline in the file is printed as a `|` block.
- `ckad-4f-secret-decode-value`: `base64decode` in kubectl Go templates and `--template` alone implying go-template are taken from the kubectl Quick Reference examples; the "Managing Secrets using kubectl" page itself only shows `jsonpath | base64 --decode`.
- `ckad-4d-configmap-envfrom-override`: env-over-envFrom precedence is from the Pod API reference (`envFrom`: "Values defined by an Env with a duplicate key will take precedence").
- Engine limitation: in `ckad-4d-configmap-immutable-manifest`, an unquoted `PAGE_SIZE: 50` passes the `equals "50"` check (numbers and numeric strings compare equal) although the API server rejects a non-string ConfigMap value. Not testable with the current ops.
- `ckad-4f-secret-env-keyref`: the extra key is `root_password` (not `admin-password`) to avoid depending on the relaxed environment-variable-name validation status.
