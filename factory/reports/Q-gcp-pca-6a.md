# Q-gcp-pca-6a — report

34 standalone questions written in `content/gcp-pca/questions/operations/` (prefix `gcppca-6a-`), English only, `status: draft`.

- Per objective: 6.1.1 = 9, 6.2.1 = 9, 6.2.2 = 8, 6.2.3 = 8.
- Types: single 27, multi 7 (all "Choose two.", 5 options, no scoring NOTE because `blueprint.scoring.multi` is `all_or_nothing`).
- Difficulty: easy 7, medium 17, hard 10.
- Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-6a-` → 34 files, 0 problem(s); `npm run content:validate -- --cert gcp-pca --prefix gcppca-6a-` → 0 problem(s), 0 warning(s).
- Every fact was checked on docs.cloud.google.com / cloud.google.com on 2026-11-27; references are pages fetched in this task.

## Naming changes observed (2026)

- **Log Analytics → Observability Analytics.** The page `logging/docs/log-analytics` now has the title "Analyze logs using Logs Explorer and Observability Analytics", and its body says "Observability Analytics" everywhere. Only the meta description and URL still say "Log Analytics". No explicit rename note exists. Question `gcppca-6a-observability-analytics` uses the new name and says "earlier called Log Analytics" in the explanation. The course and other batches should use the same name.
- **Dataproc → "Managed Service for Apache Spark".** The Cloud Profiler pages list "Managed Service for Apache Spark" where Dataproc used to appear. This batch does not use it, but other batches should check.
- Cloud Billing budgets: the budgets page now mentions **spend cap budgets** on a project for some services. So "budgets never cap spending" is no longer true without qualification. `gcppca-6a-chargeback-budgets` does not rely on that claim.

## Open doubts / deliberate choices

- The English page "Distributed load testing using GKE" (Locust) now redirects to an index page. It looks retired in English, so it was not used. Load testing in 6.1.1 is referenced to the WAF operational readiness page only.
- PerfKit Benchmarker is documented only on GitHub, which is not a Google Cloud docs page, so it was not used. The benchmarking questions use the Compute Engine fio and iPerf guides.
- Snooze recurrence is not documented on the snooze page (start time + duration only), so `gcppca-6a-snooze-maintenance` uses a single planned window.
- I could not find a sentence in the docs that says a user sink cannot target the `_Required` bucket, so that idea was dropped as a distractor.
- In `gcppca-6a-ops-agent`, the distractor only claims that guest file-system usage and application log files need an agent. It avoids memory, because some machine types report balloon-driver memory metrics without the agent.
- The Cloud Profiler pages do not list Cloud Run as a supported environment, so the profiling questions use GKE and Compute Engine.
- Google Chat notification channels are Preview, so they do not appear in any option.
