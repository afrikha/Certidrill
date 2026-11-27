# Q-gcp-pca-3b — report

42 standalone questions, prefix `gcppca-3b-`, `content/gcp-pca/questions/security/`, English only, status draft.
7 per objective (3.1.8, 3.1.9, 3.2.1, 3.2.2, 3.2.3, 3.2.4). Types: single 34, multi 8 (5 options, "Choose two.", no scoring NOTE because `blueprint.scoring.multi` is all_or_nothing). Difficulty: 9 easy, 21 medium, 12 hard. Single answers spread a 7 / b 9 / c 9 / d 9.
Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-3b-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-3b-` → 0 problem(s), 0 warning(s).

## Facts checked on docs.cloud.google.com / cloud.google.com (2026-11-27)

- Docs moved: `cloud.google.com/<product>/docs/...` redirects (302) to `docs.cloud.google.com/...`; references use the docs.cloud.google.com URLs. Compliance pages (`soc-2`, `compliance-reports-manager`, `services-in-scope`) stay on cloud.google.com.
- Vertex AI is presented as "Gemini Enterprise Agent Platform" / "Agent Platform" in page titles (VPC-SC, CMEK, PSC endpoints, Model Garden, Model Armor integration). Some URLs still contain `vertex-ai/`. The constraint is still `vertexai.allowedModels`.
- Binary Authorization continuous validation with check-based platform policies is **Preview**: it is only used as a distractor.
- Assured Workloads calls its control packages "data boundaries" (e.g. "Data Boundary for FedRAMP High", "EU Data Boundary with Access Justifications"); questions use that wording.
- Security Command Center Enterprise tier is deprecated (shutdown 21 May 2027); questions mention only Premium.
- Cloud Logging docs now call the Log Analytics upgrade "Observability Analytics"; Data Catalog search moves to "Knowledge Catalog" (policy tags not deprecated). Neither name is tested.

## Open doubts (not verified, so kept out of the correct answers or worded generically)

1. `binauthz-cloud-run-sod`: the page recommends requiring Binary Authorization on Cloud Run through an organization policy but does not name the constraint (`run.allowedBinaryAuthorizationPolicies` not confirmed); the option does not name it.
2. `eu-sovereign-keys`: the page confirms EU-only location controls, EU support personnel and that KAJ needs Assured Workloads; whether KAJ is enabled by default in that exact boundary was read on the KAJ overview ("enabled by default for new folders whose data boundary includes it"), not on the boundary page itself (truncated).
3. `fedramp-high-boundary`: service restriction comes from the "Create a new Assured Workloads folder" page (resource usage restricted to supported products), not from the FedRAMP High page.
4. `private-model-endpoint`: the same-region key rule is stated for Agent Platform training and generally for key ring locations (no global/dual/multi-region); applied here to endpoints.
5. `data-access-org-exempt`: exempted principals in Data Access audit config and org-level inheritance are standard behaviour but were not re-read on a fetched page (the reference is the Cloud Audit Logs overview).
6. `bq-masking-hash-rule`: "email mask keeps the domain" is from general knowledge of BigQuery masking rules; the fetched page lists the rule without describing its output.
7. `private-logs-viewer`: the basic Viewer role distractor is explained only as too broad (whether it reads Data Access logs was not checked).
8. `aggregated sinks` page summary claimed every destination needs Logs Writer; not used (explanations only say the writer identity needs write permission on the destination).
