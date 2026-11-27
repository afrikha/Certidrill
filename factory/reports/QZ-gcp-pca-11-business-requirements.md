# QZ-gcp-pca-11-business-requirements — notes

`content/gcp-pca/quizzes/11-business-requirements.yaml`: 10 questions, English only, `draft`. Checker: `0 problem(s), 0 warning(s)`.
Objectives: 1.1.1 (q6), 1.1.2 (q3, q10), 1.1.3 (q1, q8), 1.1.4 (q2, q7), 1.1.5 (q4, q9), 1.1.6 (q5). Positions 6–10: single ×2, multi ×3 (q7, q8, q9).

## Chapter vs current docs (fix in the chapter, not done here)

- **Budgets**: the budgets page (docs.cloud.google.com/billing/docs/how-to/budgets) now describes **spend cap budgets**, a budget type that pauses the specified services when usage exceeds the target amount, until the cap is lifted. The chapter's trap ("An alerts-only budget does not cap spending") is still true, but the chapter doesn't mention that a spend cap budget type exists. I couldn't fetch the spend caps page (client error), so I couldn't verify its launch stage or which services it covers. q2 avoids it: it asks how to disable billing automatically and doesn't offer spend caps as an option.
- **Committed use discounts**: the CUD overview now opens with a note that some spend-based CUDs move automatically to a new consumption model, with the date shown in the Billing Overview page. The chapter doesn't mention this. The figures in the chapter match the page: resource-based up to 55 % (70 % memory-optimized), can't be cancelled, billed monthly for the whole term; flexible CUDs at billing account level, not for Spot VMs.
- **DR planning guide**: the guide describes cold, warm and hot with a flat-tire analogy and use-case examples (cold for historical compliance data, warm for a non-critical notification system, hot for a user-facing service). The chapter's product examples per pattern (Cloud SQL replica, Asynchronous Replication, Spanner multi-region) are its own mapping, not the guide's. The guide doesn't mention break-glass accounts, although the chapter's failure-domain table does. q8 uses the guide's own wording: an alternative access path, and sign-in tested during DR tests.
- Confirmed as written: Spot VMs up to 91 %, no SLA; sustained use discounts after more than 25 % of the month, up to 30 %, and not on CUD-covered usage; Pub/Sub, Eventarc, PSC facts.

## Facts used that are not in the chapter (stated in the stem or explanation)

- q9: the Cloud Run 32 MiB request limit for HTTP/1 (no limit with HTTP/2) comes from Cloud Run Quotas and Limits. It is stated in the stem, not left for the candidate to know. HTTP/2 isn't offered as an option because it would also lift the limit.
- q10: Spanner `dual-region-germany1` (Berlin leader, Frankfurt), 99.999 %, RPO 0, Google-managed automatic failover (up to 45 minutes after detection), Enterprise Plus only. Also: read-only replicas don't change the 99.99 % SLA of regional instances, and `eur6` = Netherlands + Frankfurt with a Zurich witness. All from the Spanner instance configurations page. The chapter doesn't cover dual-region configurations. Consider adding a line to the chapter (or to the database chapter) because residency plus 99.999 % is a classic requirement pair.

## Not verified on a fetched page

- q9: I didn't check the Eventarc acknowledgment deadline for Cloud Run destinations. The stem keeps transcoding at 3 minutes, below the default 5-minute Cloud Run request timeout, so the design doesn't depend on that deadline.
- q4: the Memorystore for Redis page shows no launch stage. It is long GA, and the page states a 99.9 % SLA for Standard Tier.
- q6: the GKE cost allocation page shows no launch stage. It is used only as a distractor.

## Design notes

- I avoided the mock-exam decisions (RTO/RPO mapping, Cloud SQL HA and cross-region replica, Asynchronous Replication, BigQuery managed DR, instance schedules, Requester Pays, BigQuery bytes, long-term storage, Pub/Sub ordering and exactly-once, Cloud Tasks, Apigee vs API Gateway, Application Integration, Pub/Sub push auth, Marketplace, data sharing, Distributed Cloud, the RPO-zero Spanner multi-region choice). The new decisions are: DR pattern recognition, automatic action on budgets, measurable NFRs, stateless session state, PSC with overlapping ranges, project-per-tenant for an enterprise tier, CUD baseline plus Spot, DR test failures (IAM parity, access path), signed URLs plus Eventarc for large uploads, and Spanner dual-region for in-country 99.999 %.
- No Preview or deprecated product is an answer. No scoring NOTE: `blueprint.scoring.multi` is `all_or_nothing`.
