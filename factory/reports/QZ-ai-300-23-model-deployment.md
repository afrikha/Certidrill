# QZ-ai-300-23-model-deployment: notes

Check: `npx tsx factory/check-quiz.ts ai-300 23-model-deployment` gives 0 problems and 0 warnings. 10 questions: 2.3.1 (q1, q2, q5, q6, q9), 2.3.2 (q3, q7, q8), 2.3.3 (q4, q10). Positions 6–10 use single, single, multi, dropdown and hotarea.

## Chapter vs current Learn (fix these in the chapter; I did not edit it)

- **`egress_public_network_access` is legacy.** The page "CLI (v2) managed online deployment YAML schema" says the key applies only to the legacy network isolation method, and it "strongly recommends" a workspace managed virtual network instead. The chapter (online-deployment section) presents `egress_public_network_access: disabled` with no legacy caveat. The mock question `ai300-2c-online-deployment-yaml` uses it as a correct slot value. Not retired, but it should be flagged as legacy.
- **Concurrency needs `WORKER_COUNT`.** The YAML schema and troubleshooting pages say that a model served by the inference server must handle concurrency, with `WORKER_COUNT` passed as an environment variable, when `max_concurrent_requests_per_instance` goes above 1. The chapter doesn't mention this. q8 states it in the option.
- **`max_queue_wait_ms` is deprecated** (default 500; Learn says to raise `request_timeout_ms` instead). The chapter doesn't mention it; q8 uses it only as a distractor.
- **Rollback by scaling blue down.** "Perform safe rollout of new deployments for real-time inference" has no rollback section and never scales blue down; it removes blue by deleting it. The chapter's advice (keep blue at `instance_count=1` and roll back by traffic) is consistent with the documented commands, but Learn doesn't present it. The quiz doesn't use the scale-down step.
- **429 wording.** Learn says the deployment allows at most `2 × max_concurrent_requests_per_instance × instance_count` requests to process in parallel and rejects the excess. The chapter speaks of "pending requests"; same rule, slightly different words. Learn also lists a second 429 cause (requests per second over the endpoint limits), which the chapter covers briefly.
- **AzureML Data Scientist and `score/action`.** "Authentication and authorization for online endpoints" names only Owner and Contributor explicitly. AzureML Data Scientist gets the action through `onlineEndpoints/*/actions`, so the chapter is right, but that is an inference from the role definition.
- Verified and correct in the chapter: auth modes per endpoint type, non-expiring keys, short-lived `aml_token` with `refreshAfterTimeUtc`, Entra-only batch endpoints, probe defaults (10 / 10 / 2 / 30), timeout default 5,000 and maximum 180,000, the 20 % quota reserve, the mirroring rules (one deployment, maximum 50 %, live or mirrored, named-deployment calls not mirrored, managed endpoints only), outputs only to blob datastores, unique output file, and `error_threshold` -1 / 0 semantics.

## Facts that rest on inference

- q6: the client renews an `aml_token` through `get-credentials` or REST, with an identity that has `onlineEndpoints/token/action` (concept auth page). The quiz wording says "an identity that is allowed to get tokens".
- q7: the "about five minutes" figure is my arithmetic on the default probe settings (10 s + 30 × 10 s). Learn only says to adjust the probe settings or use a larger SKU when initialization exceeds the failure threshold. The stem rules out the SKU change, and no option offers `failure_threshold`, which would also work.
- q8: I set the worker count equal to the new concurrency (3). Learn says to pass `WORKER_COUNT` but gives no rule for choosing its value.
- q4: the distractor `--set-default` on `invoke` relies on the Learn batch page, which shows the parameter only on `az ml batch-deployment create`. I didn't fetch the `az ml batch-endpoint` CLI reference.
- q10: that the endpoint rejects C2 (live and mirrored traffic on green) comes from Learn's rule "only live traffic or mirrored traffic, not both". The mock question `ai300-2c-mirror-live-conflict` makes the same assumption.

## Overlap with the mock exam

- q10 combines rules that the mock bank tests one at a time (`ai300-2c-mirror-facts`, `ai300-2c-mirror-live-conflict`, `ai300-2c-rollout-statements` s1). The hotarea requires applying all four rules together.
- q9 uses the same YAML shape as `ai300-2c-batch-deployment-settings`, but with different decisions: `summary_only`, `retry_settings.timeout` and `error_threshold: 0`, against `append_row` and `-1` there.
- q5 first hit the similarity limit (0.37) against `ai300-2c-endpoint-monitoring-statements` because of the shared Yes/No boilerplate. I rewrote the scenario sentence; the content didn't overlap.
