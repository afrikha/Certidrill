# Q-gcp-pca-4a — report

43 questions written in `content/gcp-pca/questions/processes/` (prefix `gcppca-4a-`): 4.1.1 ×7, 4.1.2–4.1.6 ×6 each, 4.2.1 ×6.
Types: single 34, multi 9 (8 "Choose two.", 1 "Choose three."; no scoring NOTE, since multi is scored all or nothing).
Difficulty: 9 easy / 21 medium / 13 hard. Correct-option positions for singles: a 10, b 8, c 8, d 8.
Validation: `CERT=gcp-pca npx tsx factory/validate.ts --prefix gcppca-4a-` → 43 files, 0 problem(s).

## Overlap avoided with the existing bank

Many topics I first planned were already in the bank under other objectives (4b, 5b, 6a, 6b, 1c, cs1b), so I replaced them with different decisions:
- Cloud Deploy prod approval, deploy-policy freeze, Cloud Run canary, `targets rollback`, verify in staging (4b-chg-*, 6b-deploy-*)
- WIF for GitHub (1c-cicd-keyless-auth), Profiler for CPU (6a-profiler-cpu), Trace for downstream latency (6a-trace-downstream)
- Observability Analytics (6a), Data Access audit logs (6a), blameless PIR (6a-pir-blameless)
- Pub/Sub emulator (5b), Deployment Manager to Infrastructure Manager (5b), Terraform GitOps (5b, 4b-chg-iac-review)
- Tagged Cloud Run revision test (6b), chaos and region failover drills (6b), Cloud SQL advanced DR (cs1b), turbo replication and backup vault (4b-bc-*)
- ADR storage/when (4b-dec-adr-*), first workload (4b-skl-first-workload), TCO business case (4b-cost-tco-capex), sponsorship and champions (4b-chg-people-adoption)

## Doubts and points to review

1. **Log Analytics renamed.** The page at `/logging/docs/log-analytics` is now titled "Analyze logs using Logs Explorer and Observability Analytics". I did not use the feature in this batch, but the rename may matter elsewhere.
2. **Stakeholder management (4.2.1).** Google Cloud documentation has little specific guidance on influencing and facilitation. The six questions rely on general good practice, backed by the closest pages I fetched (Adoption Framework, the Well-Architected operational readiness and cost-awareness pages, ADRs, the migration guides). Those references support the context, not every claim. Worth a human review for realism.
3. **cicd-pr-checks.** The Cloud Build triggers page I fetched does not describe reporting check status to GitHub, or GitHub branch protection. The question relies on the Cloud Build GitHub App posting the build as a check that branch protection can require. I am confident this is correct, but I did not verify it on a page.
4. **cicd-multi-target.** The multi-target page (`/deploy/docs/multi-target`) failed to load. I used "Deploy an app to multiple targets at the same time" (controller rollout, child targets, deployParameters matched to child labels). I did not verify the launch stage on a page; the canary page says canary works with multi-targets.
5. **cat-golden-images.** The trusted image page says the constraint does not restrict custom images in a user's local project or image files in buckets. The question uses this to explain why distractor d is wrong. The page excerpt did not say how the constraint affects existing VMs.
6. **test-web-security-scanner.** The scanner supports only public IPv4 targets that are not behind a firewall, so the stem says that staging is reachable from the internet. The tier details (custom scans in Standard-legacy, Premium, or Enterprise, which is deprecated) are left out.
7. **dr-spanner-dual-region.** The stem does not name a country or regions on purpose: the list of dual-region configurations was not checked.
8. **Error Reporting.** The overview page did not load. The reference is the documentation landing page ("Error Reporting documentation"), and the claims stay at that page's level: it aggregates and displays errors, and shows top and new errors.
9. **Reference URLs** are on `docs.cloud.google.com`, where `cloud.google.com/.../docs` now redirects. The exception is the Adoption Framework page on `cloud.google.com`. Titles are the pages' H1 headings.
