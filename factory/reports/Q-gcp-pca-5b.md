# Q-gcp-pca-5b — report

30 questions written in `content/gcp-pca/questions/implementation/` (prefix `gcppca-5b-`), English only, status draft.
5.2.2 ×6, 5.2.3 ×6, 5.2.4 ×6, 5.2.5 ×6, 5.2.6 ×6. Types: single 24, multi 6 (stems end with "Choose two.", no scoring NOTE because `blueprint.scoring.multi` is all_or_nothing). Difficulty: 6 easy / 15 medium / 9 hard.
Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-5b-` → 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-5b-` → 0 problem(s), 0 warning(s).

## Sources
All facts checked by WebFetch on 2026-11-27. Every cloud.google.com URL now redirects (302) to `docs.cloud.google.com`, so references use that host (allowed in `lib/vendors.ts`). Reference titles are the page H1 (text before the first "|" of the `<title>`).

## Doubts and decisions
- **Pub/Sub and Bigtable emulators are started with `gcloud beta emulators …`** (that is the documented command); Spanner and Firestore emulators use the GA `gcloud emulators …` track. The question `gcppca-5b-pubsub-emulator-env` quotes the beta command in the stem only (as context), it is not a "Preview feature as answer". A reviewer may want to confirm this is acceptable under the "Preview is never correct" rule.
- **Deployment Manager**: the deprecation page gives both "end of support on March 31, 2026" (banner) and "discontinued on April 1, 2026" (body). The question says only "has reached end of support", no date.
- **Preview tools avoided as answers**: `gcloud beta terraform vet` (policy validation) and `gcloud beta resource-config bulk-export` (export to Terraform) are Preview, so they are not used.
- **gsutil**: docs say gsutil leaves the Google Cloud CLI package after March 2027 and the gsutil→gcloud shim is no longer recommended; the stem does not cite the date.
- **bq `--maximum_bytes_billed` in `.bigqueryrc`**: the bq reference excerpt shows `.bigqueryrc` with maximum_bytes_billed and the cost page confirms that the query fails without charge (on-demand). The exact flag-definition section of the bq reference was not reachable in the fetched excerpts (page truncated); the existence of a default `dry_run` in `.bigqueryrc` (distractor) is inferred from the general rule that `.bigqueryrc` holds default command flags.
- **Spanner emulator gcloud config** (`gcppca-5b-spanner-emulator-gcloud-config`): distractor d relies on gcloud using the REST port 9020 (documented) rather than gRPC 9010 (client libraries).
- **Infrastructure Manager**: the engineers' own permission to manage deployments is stated in the stem ("can already manage Infrastructure Manager deployments") because the Infra Manager admin role name was not on the fetched page.
- **Compute Network Admin** is assumed sufficient for VPC, subnets and Cloud NAT (Cloud Router) in `gcppca-5b-infra-manager-service-account`; not re-fetched.
- No course chapter exists yet for gcp-pca (`content/gcp-pca/course/chapters/` is empty), so no course/question alignment check was possible.
