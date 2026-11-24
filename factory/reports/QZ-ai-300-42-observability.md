# QZ-ai-300-42-observability — report

Quiz: `content/ai-300/quizzes/42-observability.yaml`, 10 questions (`ai300-qz-42-01` to `-10`). `npx tsx factory/check-quiz.ts ai-300 42-observability`: 0 problem(s), 0 warning(s).

| # | Objective | Diff. | Type | Decision tested |
| --- | --- | --- | --- | --- |
| 1 | 4.2.4 | 1 | single | Audit log category for administrative operations |
| 2 | 4.2.2 | 1 | single | Model Availability Rate counts only HTTP 500+ as errors (429 doesn't lower it) |
| 3 | 4.2.1 | 2 | single | Continuous evaluation runs skipped at peak: raise `max_hourly_runs` |
| 4 | 4.2.3 | 2 | single | Cost Management Reader on the resource group (no Foundry role shows cost) |
| 5 | 4.2.4 | 2 | single | Server-side tracing of a prompt agent: connect Application Insights, no code |
| 6 | 4.2.2 | 3 | single | Time to Response up with prompt tokens, TBT and utilization normal: shorten the prompt, not PTUs or spillover |
| 7 | 4.2.3 | 3 | single | Per-application and per-user token chargeback on a shared deployment: API Management `llm-emit-token-metric` |
| 8 | 4.2.1 | 3 | yesno | Reading a continuous evaluation rule: agent filter, hourly cap, no backfill |
| 9 | 4.2.4 | 3 | dropdown | 93-day metric retention: AllMetrics to Log Analytics, AzureMetrics table, Total column |
| 10 | 4.2.3 | 3 | multi | Cost reduction: delete an idle fine-tuned deployment, collect only the needed log category |

Mock-exam questions of 4.2.1–4.2.4 (39 files, `ai300-4b-*` and case-study questions) were read first; no scenario or decision with the same answer is reused.

## Pages fetched (November 2026)

observability (concepts), how-to-monitor-agents-dashboard, monitor-openai-reference, latency, monitor-models, trace-agent-setup, trace-agent-client-side, manage-costs, analyze-costs-cost-management, optimize-costs, API Management `llm-emit-token-metric` policy, Azure Monitor data-platform-metrics, Foundry classic "Monitor Azure OpenAI" (KQL columns of AzureMetrics).

## Preview features kept out of the correct answers

Client-side tracing (whole article is preview), the dashboard's "View agent metrics (preview)", recurring evaluations, red team scans and alerts of the Monitor settings, the `project` cost tag, Foundry cost controls. They appear only in distractors, and their explanations say so where it matters (Q5 a, Q7 b).

## Chapter vs current Learn (chapter not edited)

1. **Cost latency.** The chapter says costs appear "about five hours after usage". "Analyze Microsoft Foundry costs in Azure Cost Management" and "Cost and FinOps in Microsoft Foundry" now say **8 to 24 hours** (usage within minutes); only "Monitor model deployments…" still says about five hours. Learn is inconsistent; the newer cost pages should win.
2. **"No hard spending limit."** Still true for Cost Management budgets ("budgets send alerts, but don't block requests"), but Foundry now has **cost controls (preview)** that can alert or **block requests** when spending or tokens reach a budget, and **AI gateway token limits** (Manage > Gateways, GA) that cap the tokens a project can use on a deployment. The chapter should mention both. The mock question `ai300-4b-budget-no-hard-cap` remains correct for GA features but deserves a review.
3. **Cost page renamed.** "Plan and manage costs for Microsoft Foundry" is now titled "Cost and FinOps in Microsoft Foundry" (same URL `concepts/manage-costs`); mock references still use the old title. New portal views: Manage > Cost, Monitor > Cost, Fleet, Operations (preview); the agent **Insights** tab (GA) finds recurring cost and token issues in traces.
4. **Cost roles and filters.** Learn: Cost Management Reader **or Reader** on the resource group or subscription; "no Foundry role shows cost"; budgets and exports need Cost Management Contributor or Contributor. To isolate Azure OpenAI, filter **Service tier = Azure OpenAI** (the service name is Cognitive Services). New automatic tag `agent.name` when an agent calls a model (from November 2026). The `project` tag doesn't support Marketplace models or Claude models yet.
5. **Standard deployments.** The monitoring data reference says Tokens Per Second, **Time to Response** and Time Between Tokens aren't currently available for Standard deployments. The chapter mentions only Time Between Tokens and Tokens Per Second. The quiz uses Time to Response only on provisioned deployments (Q6); case-study question `ai300-cs1b-latency-metrics` should be checked against the deployment type of chat-qa.
6. **Tracing status.** "Set up tracing…": tracing is GA for prompt, hosted and **external** agents; **workflow agents are in preview**. The chapter lists workflows among the automatic server-side cases without the preview mention.
7. **Monitor tab metrics** are under a "View agent metrics (preview)" heading on the dashboard article; the chapter presents the Monitor tab without a preview mention.
8. **Cost optimization page:** cache writes can incur charges on GPT-5.6 and later models; batch doesn't support fine-tuned models; spillover adds standard token charges; flex processing and Agent Optimizer are preview; output caps are called `max_output_tokens`. The chapter's "50 % less than Global Standard" for batch isn't on that page (it points to the pricing page): not re-verified.
9. **API Management dimensions.** The default `User ID` dimension of `llm-emit-token-metric` is the API Management user; an end-user ID from Entra ID needs a custom dimension (up to five). The chapter's "custom dimensions (subscription, user ID, API)" is loose; Q7's explanation uses a custom dimension for the user.
10. Resource log categories on the reference page also include `ManagedNetworkEvent` (export billed); not in the chapter.
11. Not found on the pages fetched: "evaluations in the agents playground are on by default and billed" (chapter's Exam tip). Unverified; not used.

## Doubts

- Q8 s3: Learn describes the rule as firing on `RESPONSE_COMPLETED` events and doesn't state explicitly that earlier responses are never evaluated; the answer (No) is inferred from the event-driven trigger.
- Q9: the meaning of the AzureMetrics `Total` column (sum over the time grain) is standard Azure Monitor behaviour; the fetched pages show the column but don't define it.
- Q10: that deleting a fine-tuned deployment keeps the fine-tuned model for a later deployment is standard behaviour but wasn't stated on a fetched page; the cost page only says an unneeded fine-tuned deployment keeps accruing hosting charges.
