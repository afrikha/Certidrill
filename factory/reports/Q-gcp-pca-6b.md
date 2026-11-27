# Q-gcp-pca-6b — report

32 standalone questions in `content/gcp-pca/questions/operations/`, prefix `gcppca-6b-`:
6.3.1 ×8, 6.4.1 ×8, 6.5.1 ×8, 6.6.1 ×8. Types: single 26, multi 6 (choose two, stem ends with "Choose two.", no scoring NOTE because `blueprint.scoring.multi` is all_or_nothing). Difficulty: 7 easy / 16 medium / 9 hard.
Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-6b-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-6b-` → 0 problem(s), 0 warning(s).

## Facts checked on docs.cloud.google.com / cloud.google.com (2026-11-27)

- The documentation moved to `docs.cloud.google.com` (cloud.google.com/…/docs returns a 302), so references use that host.
- Cloud Deploy: canary, verification, repair-rollout automation and deploy policies are GA (release notes: deploy policies and repair rollout GA on 2025-03-31). Cloud Run targets do not accept 100 in a canary phase.
- Support offerings (cloud.google.com/support): Basic, Standard (P2 4 h, 8/5, no P1 listed), Enhanced (P1 1 h, 24/7), Premium (P1 15 min, TAM).
- Cloud Run default maximum instances = 100 (Cloud Run load-testing best practices page).
- VM Manager Patch excludes MIG VMs by default.

## Things deliberately left out (Preview, deprecated or retired)

- **Gemini Cloud Assist investigations** are in **Preview** and, since 2026-04-10, limited to Premium Support customers or customers given access by their account team. They are not used as a correct answer. Other agents writing 6.4 or 5.1.5 (Gemini Cloud Assist) questions should check this.
- **`gcloud beta terraform vet`** (Terraform policy validation) is in **Preview**. It only appears as a distractor, and the explanation says it is Preview.
- **Policy Controller** has been **deprecated since 2026-11-12**, with end of support on 2027-12-31 (Google recommends ValidatingAdmissionPolicy, Pod Security Admission or self-managed OPA Gatekeeper). It is not used. The exam profile and any course chapter that names Policy Controller should be reviewed.
- The Architecture Center guide "Distributed load testing using GKE" (Locust) has been removed: its URL now redirects to an index page. It is not used.
- GKE autoscaled blue-green node upgrades are in Preview. They are not used.

## Open doubts

- `gcppca-6b-deploy-targets-rollback`: the correct option passes `--release=rel-117` explicitly, because the page summary did not make clear which release the rollback picks by default when the current release's rollout itself succeeded.
- `gcppca-6b-deploy-targets-rollback`, option d: "abandoning a release does not redeploy" comes from general Cloud Deploy knowledge. No page was fetched to confirm it.
- `gcppca-6b-cloudsql-failover-drill`: "a restart keeps the instance in its zone and does not fail over" comes from general knowledge. The HA pages that were fetched confirm the failover command and that failover takes about 60 s, not how a restart behaves.
- Reference titles are given as fetched. Two pages came back without the " | … | Google Cloud Documentation" suffix ("Perform testing for recovery from failures", "Annotate notifications with user-defined documentation"), and their full titles may include it. The title of the On-Demand Scanning Cloud Build page was rebuilt into the usual pipe format.
