# E-ckad-41-extensions-access — report

20 exercises in `content/ckad/questions/environment/` (4 per objective: 4.1.1, 4.1.2, 4.2.1, 4.2.2, 4.2.3).
Mix: 9 `command` (8 invocation, 1 object) / 11 `manifest`; difficulty 4 × 1, 10 × 2, 6 × 3.

## Checks

- `npm run -s content:validate -- --cert ckad --prefix ckad-4a-` and `--prefix ckad-4b-`: 0 problem(s).
- `npx tsx factory/check-exercise.ts ckad ckad-4a- ckad-4b-` **crashes in the repo** before filtering, on another agent's file:
  `content/ckad/questions/deployment/ckad-2d-configmap-generator.yaml` line 98 (unquoted `why:` containing `": "`). The checker parses every file
  before applying the filter. Run on an isolated copy of `environment/` (same script, same tsconfig): `20 exercise(s), 0 problem(s)`.

## Doubts and deviations

- **CRD manifest under 4.1.1** (`ckad-4a-crd-manifest`): the objective says "list and inspect" CRDs; writing a CRD is borderline for CKAD.
  I kept it as the 4.1.1 manifest exercise because reading the CRD structure (group, names, scope, served/storage versions) is what
  `api-resources` and `explain` expose. Move it or drop it if the scope is read strictly.
- **`kubectl create role` object output** (`ckad-4b-create-role-scale`): from memory of the generator (one rule per API group,
  resources in the order given, `creationTimestamp` omitted). `create role` resolves resources through discovery, so CI needs a
  reachable API server (or a fake discovery) to run it in client dry-run.
- **Error messages quoted in stems**: the PSA message (`ckad-4b-pod-restricted-fix`) follows the format of Pod Security Admission
  (`violates PodSecurity "restricted:latest": ...`) but its exact wording for two containers was not verified on a live v1.37 cluster.
  The LimitRange message with two violations (`ckad-4b-limitrange-max-fix`) combines the single-violation text shown on kubernetes.io
  ("maximum memory usage per Container is 1Gi, but limit is 1536Mi") inside `[...]`; the aggregated format is an assumption.
- **Engine limitation**: `equals` treats `16` and `"16"` (or `7.2` and `"7.2"`) as equal, so a schema type string vs number cannot be
  checked. I avoided numeric-looking string fields in custom resources. In `ckad-4a-cr-schema-enum` the solution quotes `"01:30"`
  but an unquoted value cannot be detected either.
- `kubectl config use` as an alias of `use-context`, and `-n` as a short flag of `config set-context`, were not verified; no solution uses them.
- The chapter `41-extensions-access.en.md` does not exist yet; nothing was aligned with it.
