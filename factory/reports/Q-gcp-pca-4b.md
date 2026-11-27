# Q-gcp-pca-4b — report

36 questions written in `content/gcp-pca/questions/processes/` (prefix `gcppca-4b-`): 6 per objective 4.2.2 to 4.2.7, single 29 / multi 7 (one "Choose three."), difficulty 7 easy / 18 medium / 11 hard. Both validators report 0 problems and 0 warnings (`factory/validate.ts` and `content:validate`). Multi stems have no per-selection NOTE, because `blueprint.scoring` scores multi all or nothing.

## Open doubts

1. **Launch stages not shown.** The Cloud Deploy pages for deploy policies, analysis jobs, automation rules (advance rollout) and pipeline suspension show no Preview banner and no launch stage. I treated them as GA. They are the correct answers of `chg-deploy-freeze` and `chg-canary-analysis`. The same applies to Organization Policy dry run (`chg-orgpolicy-dryrun`).
2. **Compute flexible CUDs for M-series.** The CUD page gives 63% for a 3-year flexible commitment on M1–M4, and no discount for 1 year. The VM pricing page adds that M-series coverage is "available only after opting in to the new model". These figures appear only in the explanations of wrong options in `cost-resource-cud`. Its correct answer uses the 3-year resource-based discount of up to 70% for memory-optimized machines, which the docs state.
3. **Customer Care.** The support page's feature table is ambiguous about which plans include Event Management Service, so I did not use it. The figures I did use: Premium has a 15-minute P1 response and a TAM; Enhanced has a 1-hour P1 response and 24/7 service; Standard has no P1 target and 8/5 service; Basic has no technical cases.
4. **Budgets.** The budgets page now mentions "spend cap budgets" that pause services, but gives no eligible services and no launch stage. I avoided any "budgets never cap spending" claim.
5. **Reference titles.** For the whitepapers on services.google.com I used the title printed on page 1: "The Google Cloud Adoption Framework", "Managing Change in the Cloud", and "Designing Cloud Teams" (the file name is `cloud_center_of_excellence.pdf`). For the blog post I used the article heading "Consequences of SLO violations—CRE life lessons". Its HTML title is "What are the consequences of SLO violations | Google Cloud Blog".
6. **Infrastructure Manager previews per pull request** (`chg-iac-review`). The docs document previews; running one for each PR needs a CI trigger, which the option does not spell out.
7. **Possible overlap with 4a (4.1.6 Disaster recovery).** `bc-pattern-tiers`, `bc-standby-capacity` and `bc-plan-testing` sit on the boundary between business continuity and DR. A reviewer should check them against the `gcppca-4a-` DR questions for duplicate decisions.
8. **No gcp-pca course chapters existed yet**, so I could not check that the questions agree with the course.
9. Google documentation now lives at `docs.cloud.google.com` (cloud.google.com redirects there). All doc references use that host.
