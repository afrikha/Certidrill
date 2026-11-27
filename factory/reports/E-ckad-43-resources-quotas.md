# E-ckad-43-resources-quotas — report

16 exercises in `content/ckad/questions/environment/` (4 per objective 4.3.1, 4.3.2, 4.5.1, 4.5.2): 7 `command` (4 object, 3 invocation), 9 `manifest`; difficulty 3 × 1, 8 × 2, 5 × 3. Both checks report `0 problem(s)` for these 16 files.

## Check run

- `npx tsx factory/check-exercise.ts ckad ckad-4c- ckad-4e-` crashed in the shared working copy. The cause is a YAML parse error in another agent's file, `content/ckad/questions/deployment/ckad-2d-configmap-generator.yaml`, line 98 (an unquoted `why:` holding `"LOG_LEVEL: info"`). The checker parses every file before it applies the filter. I ran the same checker on an isolated copy that held only my 16 files: `16 exercise(s), 0 problem(s)`. `content:validate` with `--prefix ckad-4c-` and `--prefix ckad-4e-`: 0 problem(s).

## Doubts (kubectl output, to confirm in CI)

- `kubectl set resources … --local -o yaml` (ckad-4e-set-resources-container, ckad-4e-set-resources-limits): I wrote the output as the typed Deployment that kubectl prints, with `strategy: {}`, `status: {}` and `resources: {}` on the unchanged container, and without `creationTimestamp`. I assumed that quantities come out in canonical form: `0.5` → `500m`, `0.2` → `200m`, `1000m` → `"1"`, `2048Mi` → `2Gi`.
- Several solutions use the `TYPE NAME` form (`kubectl set resources deployment web …`) and rely on the application running them on the file given in `body.files`, as BRIEF-PRACTICE describes.
- `kubectl create quota` output: values are printed as quoted strings (`"4"`). Namespace is printed only with `-n`.

## Doubts (facts not quoted word for word on kubernetes.io)

- ckad-4c-quota-fit-deployment: the docs say that Pods must specify requests or limits for the resources a quota tracks. They do not say that this applies to each container. The per-container rule (a Pod is rejected because one container, `log-agent`, sets nothing) comes from the quota evaluator's behavior.
- ckad-4c-limitrange-min-max-ratio, second negative: `maxLimitRequestRatio` on a `type: Pod` item is checked against the Pod totals. This is the LimitRanger implementation; the concept page does not spell it out.
- ckad-4c-limitrange-min-max-ratio, first negative: it also sets `default` above `max`, which LimitRange validation is expected to reject. Not verified; the negative fails on a check anyway, because there is no Pod item.
- Pod-level resources (`spec.resources`, beta since v1.34 according to the QoS page) are deliberately not used.
